import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { hashFile, hashText, writeJson } from './artifacts.js';
import { collectViewportIntelligence, VIEWPORTS } from './intelligence.js';
import { assertProjectSlug, containedPath, portable } from './paths.js';
import { sanitizeUrl, validateUrl } from './policy.js';
import { createReferenceId } from './reference.js';
import { REPOSITORY_ROOT } from './run-validation.js';
import type { ArtifactRef, ConsoleRecord, EvidenceRecord, NetworkRecord, ReferenceRunManifest, ViewportName, ViewportProfile } from './types.js';

export interface CaptureOptions { url: string; project: string; allowLocalFixture?: boolean; outputRoot?: string; settleMs?: number; disableJavaScript?: boolean }
const MAX_RESPONSES = 500;
const MAX_WARNINGS = 500;
const MAX_REQUESTS_PER_VIEWPORT = 750;
const MAX_POPUPS_PER_VIEWPORT = 5;

function privateMessageMetadata(message: string): string { return `[content omitted; sha256=${hashText(message)}]`; }
async function prepareRunDirectory(root: string, project: string, runDir: string): Promise<void> {
  let existingAncestor = root;
  while (true) {
    try { await fs.realpath(existingAncestor); break; } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(existingAncestor); if (parent === existingAncestor) throw new Error('No existing output-root ancestor', { cause: error });
      existingAncestor = parent;
    }
  }
  const realRepository = await fs.realpath(REPOSITORY_ROOT); const realAncestor = await fs.realpath(existingAncestor);
  const ancestorRelative = path.relative(realRepository, realAncestor);
  if (ancestorRelative === '..' || ancestorRelative.startsWith(`..${path.sep}`) || path.isAbsolute(ancestorRelative)) throw new Error('Resolved output-root ancestor escapes the repository');
  await fs.mkdir(root, { recursive: true });
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Output root must not be a symbolic link or junction');
  const realOutputRoot = await fs.realpath(root); const rootRelative = path.relative(realRepository, realOutputRoot);
  if (rootRelative === '..' || rootRelative.startsWith(`..${path.sep}`) || path.isAbsolute(rootRelative)) throw new Error('Resolved output root escapes the repository');
  const projectDir = containedPath(root, project);
  try { await fs.mkdir(projectDir); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  if ((await fs.lstat(projectDir)).isSymbolicLink()) throw new Error('Project output directory must not be a symbolic link or junction');
  const realRoot = await fs.realpath(root); const realProject = await fs.realpath(projectDir);
  const relative = path.relative(realRoot, realProject);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw new Error('Resolved project path escapes the output root');
  await fs.mkdir(runDir);
}

async function installNetworkPolicy(context: BrowserContext, fixtureOrigin: string | undefined, addWarning: (warning: string) => void): Promise<void> {
  let requestCount = 0;
  await context.route('**/*', async (route) => {
    const request = route.request();
    requestCount += 1;
    if (requestCount > MAX_REQUESTS_PER_VIEWPORT) {
      if (requestCount === MAX_REQUESTS_PER_VIEWPORT + 1) addWarning(`Blocked additional requests after viewport budget of ${String(MAX_REQUESTS_PER_VIEWPORT)}`);
      await route.abort('blockedbyclient'); return;
    }
    try {
      const requestUrl = new URL(request.url());
      await validateUrl(request.url(), { allowLocalFixture: fixtureOrigin === requestUrl.origin, resolveDns: true });
      await route.continue();
    } catch (error) {
      addWarning(`Blocked request: ${sanitizeUrl(request.url())} (${error instanceof Error ? error.message : 'policy'})`);
      await route.abort('blockedbyclient');
    }
  });
  await context.routeWebSocket('**/*', async (webSocket) => {
    addWarning(`Blocked WebSocket: ${sanitizeUrl(webSocket.url())}`);
    await webSocket.close({ code: 1008, reason: 'WebSockets are outside passive reference policy' });
  });
}

function observePage(page: Page, viewport: ViewportName, network: NetworkRecord[], consoleRecords: ConsoleRecord[], pendingResponses: Array<Promise<void>>): void {
  let responseCount = 0;
  page.on('response', (response) => {
    if (responseCount++ >= MAX_RESPONSES) return;
    const request = response.request();
    pendingResponses.push((async () => {
      const contentType = (await response.headerValue('content-type'))?.slice(0, 200);
      network.push({ viewport, method: request.method(), url: sanitizeUrl(request.url()), resourceType: request.resourceType(), status: response.status(), ...(contentType ? { contentType } : {}) });
    })());
  });
  page.on('console', (message) => {
    if (consoleRecords.length < 200) consoleRecords.push({ viewport, type: message.type(), text: privateMessageMetadata(message.text()), location: sanitizeUrl(message.location().url) });
  });
  page.on('pageerror', (error) => { if (consoleRecords.length < 200) consoleRecords.push({ viewport, type: 'pageerror', text: privateMessageMetadata(error.message) }); });
}

function fact(base: Omit<EvidenceRecord, 'id' | 'kind' | 'claim' | 'provenance'>, id: string, kind: EvidenceRecord['kind'], claim: string, value: unknown, method: string): EvidenceRecord {
  return { ...base, id, kind, claim, value, provenance: { method } };
}

async function collectAfterBoundedNavigation(page: Page, viewport: ViewportName): Promise<Awaited<ReturnType<typeof collectViewportIntelligence>>> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await collectViewportIntelligence(page, viewport); }
    catch (error) {
      if (!(error instanceof Error) || !/Execution context was destroyed|navigation/i.test(error.message) || attempt === 2) throw error;
      await page.waitForLoadState('domcontentloaded', { timeout: 10_000 }); await page.waitForTimeout(500);
    }
  }
  throw new Error('Viewport intelligence collection exhausted its bounded navigation retries');
}

export async function captureReference(options: CaptureOptions): Promise<{ runDir: string; manifest: ReferenceRunManifest }> {
  assertProjectSlug(options.project);
  const allowLocalFixture = options.allowLocalFixture === true;
  const requested = await validateUrl(options.url, { allowLocalFixture, resolveDns: true });
  const fixtureOrigin = allowLocalFixture ? requested.origin : undefined;
  const root = options.outputRoot ? path.resolve(options.outputRoot) : path.join(REPOSITORY_ROOT, 'runs');
  const rootRelative = path.relative(REPOSITORY_ROOT, root);
  if (rootRelative === '..' || rootRelative.startsWith(`..${path.sep}`) || path.isAbsolute(rootRelative)) throw new Error('Output root must remain inside the repository');
  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`.toLowerCase();
  const runDir = containedPath(root, options.project, runId);
  await prepareRunDirectory(root, options.project, runDir);

  const network: NetworkRecord[] = [];
  const consoleRecords: ConsoleRecord[] = [];
  const warnings: string[] = [];
  const addWarning = (warning: string): void => {
    if (warnings.length < MAX_WARNINGS - 1) warnings.push(warning);
    else if (warnings.length === MAX_WARNINGS - 1) warnings.push('Additional warnings omitted after policy limit');
  };
  const browser = await chromium.launch({ headless: true });
  const chromiumVersion = browser.version();
  const capturedAt = new Date().toISOString();
  let finalUrl = sanitizeUrl(requested.toString());
  let referenceId = createReferenceId(finalUrl);
  let establishedFinalUrl: string | undefined;
  const evidence: EvidenceRecord[] = [];
  const screenshotFiles: Array<{ file: string; viewport: ViewportProfile }> = [];
  const summaries: Array<{ viewport: ViewportName; scrollHeight: number; horizontalOverflow: boolean; sectionCount: number; headingCount: number; fixedOrStickyCount: number }> = [];
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, serviceWorkers: 'block', reducedMotion: 'no-preference', javaScriptEnabled: options.disableJavaScript !== true });
      try {
        // tsx preserves nested function names with this helper; define the inert helper in the page realm so CLI and Vitest execute the same collector.
        await context.addInitScript({ content: 'globalThis.__name ??= (target) => target; Object.defineProperty(globalThis, "open", { value: () => null, writable: false, configurable: false });' });
        await installNetworkPolicy(context, fixtureOrigin, addWarning);
        const page = await context.newPage();
        let popupCount = 0;
        context.on('page', (candidate) => {
          if (candidate !== page) {
            popupCount += 1; addWarning(`Blocked popup page: ${sanitizeUrl(candidate.url())}`);
            if (popupCount > MAX_POPUPS_PER_VIEWPORT) void context.close(); else void candidate.close();
          }
        });
        const pendingResponses: Array<Promise<void>> = [];
        observePage(page, viewport.name, network, consoleRecords, pendingResponses);
        const response = await page.goto(requested.toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
        if (options.disableJavaScript === true) addWarning(`${viewport.name} capture used JavaScript-disabled fallback after the normal passive collector could not obtain a stable execution context`);
        if (options.settleMs !== 0) await page.waitForTimeout(Math.min(Math.max(options.settleMs ?? 500, 0), 5_000));
        const final = await validateUrl(page.url(), { allowLocalFixture, resolveDns: true });
        finalUrl = sanitizeUrl(final.toString()); referenceId = createReferenceId(finalUrl);
        if (establishedFinalUrl !== undefined && establishedFinalUrl !== finalUrl) throw new Error('Desktop and mobile captures resolved to different final URLs');
        establishedFinalUrl = finalUrl;
        const baseFact = { runId, referenceId, sourceReference: finalUrl, capturedAt, viewport: viewport.name, epistemicType: 'observed_fact' as const, rightsStatus: 'inspect_only' as const };
        evidence.push(fact(baseFact, `ev_navigation_${viewport.name}`, 'navigation', `Navigation observed for ${viewport.name} viewport`, { requestedUrl: sanitizeUrl(requested.toString()), finalUrl, status: response?.status() }, 'Playwright DOMContentLoaded navigation plus bounded settle'));
        const intelligence = await collectAfterBoundedNavigation(page, viewport.name);
        summaries.push({ viewport: viewport.name, ...intelligence.summary });
        evidence.push(fact(baseFact, `ev_structure_${viewport.name}`, 'structure', `Bounded structural observations at ${viewport.name} viewport`, intelligence.structure, 'Bounded DOM geometry and semantic inspection'));
        evidence.push(fact(baseFact, `ev_visual_system_${viewport.name}`, 'visual_system', `Bounded computed-style distributions at ${viewport.name} viewport`, intelligence.visualSystem, 'Bounded computed-style sampling; no stylesheets copied'));
        evidence.push(fact(baseFact, `ev_motion_interaction_${viewport.name}`, 'motion_interaction', `Passive motion and interaction signals at ${viewport.name} viewport`, { signals: intelligence.motionInteraction, scrollSweep: intelligence.scrollSweep }, 'Computed-style, animation API, media, affordance, and bounded scroll observations'));
        await Promise.all(pendingResponses);
        const viewportNetwork = network.filter((record) => record.viewport === viewport.name);
        const hostCounts = new Map<string, number>(); const resourceCounts = new Map<string, number>();
        for (const record of viewportNetwork) {
          try { const host = new URL(record.url).hostname; hostCounts.set(host, (hostCounts.get(host) ?? 0) + 1); } catch { /* sanitized non-URL omitted */ }
          resourceCounts.set(record.resourceType, (resourceCounts.get(record.resourceType) ?? 0) + 1);
        }
        const byCount = (map: Map<string, number>): Array<{ value: string; count: number }> => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([value, count]) => ({ value, count }));
        evidence.push(fact(baseFact, `ev_technical_${viewport.name}`, 'technical_signal', `Bounded public implementation signals at ${viewport.name} viewport`, { ...intelligence.technicalSignals, network: { observedResponses: viewportNetwork.length, resourceTypes: byCount(resourceCounts), resourceHosts: byCount(hostCounts) } }, 'DOM metadata and bounded sanitized Playwright response summaries; no response bodies or source code'));
        const screenshotFile = path.join(runDir, `${viewport.name}.png`);
        const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const fullPage = pageHeight <= 20_000;
        if (!fullPage) addWarning(`${viewport.name} full-page screenshot limited because page height ${String(pageHeight)}px exceeds 20000px`);
        await page.screenshot({ path: screenshotFile, fullPage, animations: 'disabled' });
        screenshotFiles.push({ file: screenshotFile, viewport });
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }

  const base = portable(path.relative(REPOSITORY_ROOT, runDir));
  for (const { file, viewport } of screenshotFiles) {
    const artifact: ArtifactRef = { path: `${base}/${viewport.name}.png`, sha256: await hashFile(file) };
    evidence.push({ id: `ev_screenshot_${viewport.name}`, runId, referenceId, sourceReference: finalUrl, capturedAt, viewport: viewport.name, kind: 'screenshot', epistemicType: 'observed_fact', claim: `Captured bounded research screenshot at ${viewport.width}×${viewport.height}`, provenance: { method: 'Playwright screenshot with animations disabled' }, artifact, rightsStatus: 'inspect_only', notes: 'Research evidence only; not a reusable source asset.' });
  }
  evidence.push({ id: 'ev_responsive_comparison', runId, referenceId, sourceReference: finalUrl, capturedAt, viewport: 'cross_viewport', kind: 'responsive', epistemicType: 'observed_fact', claim: 'Recorded desktop and mobile structural measurement summaries', value: { viewports: summaries }, provenance: { method: 'Deterministic comparison of viewport observations' }, rightsStatus: 'inspect_only' });

  network.sort((a, b) => a.viewport.localeCompare(b.viewport) || a.url.localeCompare(b.url) || a.resourceType.localeCompare(b.resourceType));
  consoleRecords.sort((a, b) => a.viewport.localeCompare(b.viewport) || a.type.localeCompare(b.type) || a.text.localeCompare(b.text));
  await writeJson(path.join(runDir, 'network.json'), network);
  await writeJson(path.join(runDir, 'console.json'), consoleRecords);
  await writeJson(path.join(runDir, 'evidence.json'), evidence);
  await writeJson(path.join(runDir, 'rights.json'), [{ referenceId, runId, sourceReference: finalUrl, status: 'inspect_only', basis: 'Public accessibility permits inspection only; reuse was not established.', isLegalOpinion: false, notes: 'Automated metadata is an engineering aid, not legal advice.' }]);
  const artifactNames = [...VIEWPORTS.map(({ name }) => `${name}.png`), 'network.json', 'console.json', 'evidence.json', 'rights.json'];
  const artifacts: ArtifactRef[] = [];
  for (const name of artifactNames) artifacts.push({ path: `${base}/${name}`, sha256: await hashFile(path.join(runDir, name)) });
  const manifest: ReferenceRunManifest = {
    schemaVersion: '2.0.0', referenceId, runId, project: options.project,
    requestedUrl: sanitizeUrl(requested.toString()), finalUrl, capturedAt, viewports: [...VIEWPORTS],
    tools: { node: process.version, playwright: 'project dependency', chromium: chromiumVersion }, artifacts,
    evidenceIds: evidence.map(({ id }) => id), warnings, errors: [],
    policyDecisions: [allowLocalFixture ? 'Explicit loopback fixture override enabled for the requested origin only' : 'Public-reference URL and per-request network policy enforced', 'Passive inspection only: no clicks, form submissions, response bodies, storage, credentials, source-code retrieval, or asset downloading for reuse', 'Screenshots and observed media remain inspect_only research evidence'],
  };
  await writeJson(path.join(runDir, 'manifest.json'), manifest);
  return { runDir, manifest };
}
