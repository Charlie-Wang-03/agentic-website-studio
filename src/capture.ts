import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { chromium } from 'playwright';
import { assertProjectSlug, containedPath, portable } from './paths.js';
import { sanitizeUrl, validateUrl } from './policy.js';
import type { ArtifactRef, ConsoleRecord, EvidenceRecord, NetworkRecord } from './types.js';

export interface CaptureOptions { url: string; project: string; allowLocalFixture?: boolean }
const REPOSITORY_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
async function hashFile(file: string): Promise<string> { return createHash('sha256').update(await fs.readFile(file)).digest('hex'); }
function privateMessageMetadata(message: string): string { return `[content omitted; sha256=${createHash('sha256').update(message).digest('hex')}]`; }
async function writeJson(file: string, value: unknown): Promise<void> { await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' }); }
async function prepareRunDirectory(root: string, project: string, runDir: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  if ((await fs.lstat(root)).isSymbolicLink()) throw new Error('Output root must not be a symbolic link or junction');
  const projectDir = containedPath(root, project);
  try { await fs.mkdir(projectDir); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  if ((await fs.lstat(projectDir)).isSymbolicLink()) throw new Error('Project output directory must not be a symbolic link or junction');
  const realRoot = await fs.realpath(root); const realProject = await fs.realpath(projectDir);
  const relative = path.relative(realRoot, realProject);
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) throw new Error('Resolved project path escapes the output root');
  await fs.mkdir(runDir);
}

export async function captureReference(options: CaptureOptions): Promise<{ runDir: string; manifest: Record<string, unknown> }> {
  assertProjectSlug(options.project);
  const allowLocalFixture = options.allowLocalFixture === true;
  const requested = await validateUrl(options.url, { allowLocalFixture, resolveDns: true });
  const fixtureOrigin = allowLocalFixture ? requested.origin : undefined;
  const root = path.join(REPOSITORY_ROOT, 'runs');
  const runId = `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}_${randomUUID().slice(0, 8)}`.toLowerCase();
  const runDir = containedPath(root, options.project, runId);
  await prepareRunDirectory(root, options.project, runDir);

  const network: NetworkRecord[] = [];
  const consoleRecords: ConsoleRecord[] = [];
  const pendingResponses: Array<Promise<void>> = [];
  let responseCount = 0;
  const warnings: string[] = [];
  const addWarning = (warning: string): void => {
    if (warnings.length < 499) warnings.push(warning);
    else if (warnings.length === 499) warnings.push('Additional warnings omitted after policy limit');
  };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
  try {
    await context.route('**/*', async (route) => {
      const request = route.request();
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
      await webSocket.close({ code: 1008, reason: 'WebSockets are outside M1 capture policy' });
    });
    const page = await context.newPage();
    page.on('response', (response) => {
      if (responseCount++ >= 500) return;
      const request = response.request();
      pendingResponses.push((async () => {
        const contentType = (await response.headerValue('content-type'))?.slice(0, 200);
        network.push({ method: request.method(), url: sanitizeUrl(request.url()), resourceType: request.resourceType(), status: response.status(), ...(contentType ? { contentType } : {}) });
      })());
    });
    page.on('console', (message) => {
      if (consoleRecords.length < 200) consoleRecords.push({ type: message.type(), text: privateMessageMetadata(message.text()), location: sanitizeUrl(message.location().url) });
    });
    page.on('pageerror', (error) => { if (consoleRecords.length < 200) consoleRecords.push({ type: 'pageerror', text: privateMessageMetadata(error.message) }); });
    const response = await page.goto(requested.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
    const final = await validateUrl(page.url(), { allowLocalFixture, resolveDns: true });
    const capturedAt = new Date().toISOString();
    const structure = await page.evaluate(() => ({
      title: document.title.slice(0, 500),
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].slice(0, 100).map((el) => ({ level: Number(el.tagName.slice(1)), text: (el.textContent ?? '').trim().slice(0, 500) })),
      landmarks: [...document.querySelectorAll('main,nav,header,footer,aside,[role]')].slice(0, 100).map((el) => el.getAttribute('role') ?? el.tagName.toLowerCase()),
      counts: { links: document.links.length, buttons: document.querySelectorAll('button,[role="button"]').length, forms: document.forms.length, images: document.images.length },
      visual: { backgroundColor: getComputedStyle(document.body).backgroundColor, color: getComputedStyle(document.body).color, fontFamily: getComputedStyle(document.body).fontFamily.slice(0, 300) },
    }));
    await Promise.all(pendingResponses);
    const screenshotFile = path.join(runDir, 'page.png');
    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const fullPage = pageHeight <= 20_000;
    if (!fullPage) addWarning(`Full-page screenshot limited because page height ${String(pageHeight)}px exceeds 20000px`);
    await page.screenshot({ path: screenshotFile, fullPage });
    const networkFile = path.join(runDir, 'network.json');
    const consoleFile = path.join(runDir, 'console.json');
    await writeJson(networkFile, network);
    await writeJson(consoleFile, consoleRecords);
    const base = portable(path.relative(REPOSITORY_ROOT, runDir));
    const screenshot: ArtifactRef = { path: `${base}/page.png`, sha256: await hashFile(screenshotFile) };
    const evidence: EvidenceRecord[] = [
      { id: 'ev_navigation', runId, sourceReference: sanitizeUrl(final.toString()), capturedAt, kind: 'navigation', epistemicType: 'observed_fact', claim: `Navigation completed with status ${response?.status() ?? 'unknown'}`, value: { requestedUrl: sanitizeUrl(requested.toString()), finalUrl: sanitizeUrl(final.toString()), status: response?.status() }, provenance: { method: 'Playwright navigation' }, rightsStatus: 'inspect_only' },
      { id: 'ev_page_metadata', runId, sourceReference: sanitizeUrl(final.toString()), capturedAt, kind: 'page_metadata', epistemicType: 'observed_fact', claim: `Observed page title: ${structure.title || '(empty)'}`, value: { title: structure.title }, provenance: { method: 'DOM inspection', locator: 'document.title' }, rightsStatus: 'inspect_only' },
      { id: 'ev_structure', runId, sourceReference: sanitizeUrl(final.toString()), capturedAt, kind: 'structure', epistemicType: 'observed_fact', claim: 'Observed document structure and basic computed styles', value: structure, provenance: { method: 'DOM and computed-style inspection' }, rightsStatus: 'inspect_only' },
      { id: 'ev_screenshot', runId, sourceReference: sanitizeUrl(final.toString()), capturedAt, kind: 'visual', epistemicType: 'observed_fact', claim: 'Captured a full-page screenshot at 1280×720 viewport', provenance: { method: 'Playwright screenshot' }, artifact: screenshot, rightsStatus: 'inspect_only', notes: 'Capture is research evidence, not a reusable asset.' },
    ];
    const evidenceFile = path.join(runDir, 'evidence.json');
    const rightsFile = path.join(runDir, 'rights.json');
    await writeJson(evidenceFile, evidence);
    await writeJson(rightsFile, [{ sourceReference: sanitizeUrl(final.toString()), status: 'inspect_only', basis: 'Public accessibility permits inspection only; reuse was not established.', isLegalOpinion: false, notes: 'Automated metadata is not legal advice.' }]);
    const artifacts: ArtifactRef[] = [];
    for (const file of ['page.png', 'network.json', 'console.json', 'evidence.json', 'rights.json']) artifacts.push({ path: `${base}/${file}`, sha256: await hashFile(path.join(runDir, file)) });
    const manifest = { schemaVersion: '1.0.0', runId, project: options.project, requestedUrl: sanitizeUrl(requested.toString()), finalUrl: sanitizeUrl(final.toString()), capturedAt, viewport: { width: 1280, height: 720 }, tools: { node: process.version, playwright: 'project dependency', chromium: browser.version() }, artifacts, evidenceIds: evidence.map(({ id }) => id), warnings, errors: [], policyDecisions: [allowLocalFixture ? 'Explicit loopback fixture override enabled' : 'Public-reference URL and per-request network policy enforced', 'No cookies, credentials, request bodies, response bodies, storage, profiles, or headers persisted'] };
    await writeJson(path.join(runDir, 'manifest.json'), manifest);
    return { runDir, manifest };
  } finally { await context.close(); await browser.close(); }
}
