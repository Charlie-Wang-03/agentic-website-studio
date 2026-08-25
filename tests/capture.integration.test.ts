import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prepareAnalysis } from '../src/analysis.js';
import { validateAnalysis } from '../src/analysis-validation.js';
import { captureReference } from '../src/capture.js';
import { validateRunDirectory } from '../src/run-validation.js';
import { createValidator } from '../src/schema.js';
import type { DesignPrinciplesDocument, ReferenceProfile } from '../src/types.js';

let server: http.Server; let probeServer: http.Server; let baseUrl = ''; let probeOrigin = ''; let probeHits = 0;
const generatedRunDirs: string[] = [];
const testOutputRoot = path.join(process.cwd(), '.tmp', 'test-runs');
beforeAll(async () => {
  probeServer = http.createServer((_request, response) => { probeHits += 1; response.end('probe'); });
  probeServer.on('upgrade', (_request, socket) => { probeHits += 1; socket.destroy(); });
  await new Promise<void>((resolve) => probeServer.listen(0, '127.0.0.1', resolve));
  const probeAddress = probeServer.address(); if (!probeAddress || typeof probeAddress === 'string') throw new Error('probe did not bind');
  probeOrigin = `http://127.0.0.1:${String(probeAddress.port)}`;
  server = http.createServer(async (request, response) => {
    if (request.url === '/sw.js') { response.setHeader('content-type', 'text/javascript'); response.end(`self.addEventListener('install', () => fetch('${probeOrigin}/service-worker'));`); return; }
    const name = request.url === '/' ? 'index.html' : path.basename(request.url ?? '');
    try { let body = await fs.readFile(path.join(process.cwd(), 'tests', 'fixtures', name), 'utf8'); body = body.replaceAll('__PROBE_ORIGIN__', probeOrigin).replaceAll('__PROBE_WS__', probeOrigin.replace('http://', 'ws://')); response.setHeader('content-type', name.endsWith('.css') ? 'text/css' : name.endsWith('.js') ? 'text/javascript' : name.endsWith('.json') ? 'application/json' : 'text/html'); response.end(body); } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture did not bind');
  baseUrl = `http://127.0.0.1:${String(address.port)}`;
});
afterAll(async () => {
  await Promise.all([server, probeServer].map((item) => new Promise<void>((resolve, reject) => item.close((error) => error ? reject(error) : resolve()))));
  for (const runDir of generatedRunDirs) await fs.rm(runDir, { recursive: true, force: true });
});

function analysisArtifacts(referenceId: string, runId: string, finalUrl: string): { profile: ReferenceProfile; principles: DesignPrinciplesDocument } {
  const ref = (evidenceId: string) => ({ runId, evidenceId });
  const confidence = { level: 'high' as const, rationale: 'The project-owned fixture exposes the same bounded mechanism through deterministic desktop and mobile observations.' };
  const profile: ReferenceProfile = {
    schemaVersion: '1.0.0', referenceId, runId, source: { sanitizedUrl: finalUrl }, rightsStatus: 'inspect_only', rightsBasis: 'Public accessibility permits inspection only; reuse was not established.', sourceRightsNotes: ['Automated metadata is an engineering aid, not legal advice.'], rightsCaveats: ['Project fixture validation does not change the source run rights status.'],
    claims: [
      { id: 'rpc_responsive_reflow', category: 'responsive_behavior', statement: 'The measured section organization reflows between the named desktop and mobile viewports.', epistemicType: 'inference', supportingEvidence: [ref('ev_structure_desktop'), ref('ev_structure_mobile'), ref('ev_responsive_comparison')], contradictoryEvidence: [], confidence, limitations: ['Only two deterministic viewports were observed.'] },
      { id: 'rpc_motion_emphasis', category: 'motion_pattern', statement: 'Bounded animation and transition signals appear to add emphasis without changing content order.', epistemicType: 'inference', supportingEvidence: [ref('ev_motion_interaction_desktop'), ref('ev_motion_interaction_mobile')], contradictoryEvidence: [], confidence, limitations: ['Hover was not actively exercised.'] },
    ], insufficientEvidence: ['No authenticated or destructive interaction was inspected.'],
  };
  const antiCopy = { abstractionOnly: true as const, independentVisualExpressionRequired: true as const, noSourceAssetReuse: true as const, noSourceProseReuse: true as const, noExactLayoutReplication: true as const, noExactMotionSequenceReplication: true as const, noSourceCodeReconstruction: true as const, referenceOnlyElements: ['fixture-specific words, geometry, palette, and animation sequence'] };
  const principles: DesignPrinciplesDocument = { schemaVersion: '1.0.0', referenceId, runId, principles: [{
    id: 'dp_adaptive_priority', principle: 'Preserve content priority while allowing spatial composition to simplify at narrower viewports.', problemAddressed: 'A wide composition can lose clarity when space contracts.', mechanism: 'Define an original hierarchy that can reflow from multiple columns to a linear reading order.', expectedExperientialEffect: 'Continuity of emphasis across device widths.', applicableContexts: ['Original editorial and product introductions'], transferability: 'high', constraints: ['Choose independent breakpoints, proportions, content, and expression.'], supportingProfileClaimIds: ['rpc_responsive_reflow'], supportingEvidence: [ref('ev_structure_desktop'), ref('ev_structure_mobile'), ref('ev_responsive_comparison')], contradictoryEvidence: [], confidence, antiCopy, rights: { sourceStatus: 'inspect_only', sourceBasis: 'Public accessibility permits inspection only; reuse was not established.', sourceNotes: ['Automated metadata is an engineering aid, not legal advice.'], caveats: ['The abstract mechanism does not grant permission to copy source expression.'], isLegalOpinion: false }, sourceReferenceIds: [referenceId],
  }] };
  return { profile, principles };
}

describe('M2 deep capture and analysis vertical slice', () => {
  it('captures two bounded viewports, prepares a deterministic packet, and validates grounded abstractions', async () => {
    const { runDir, manifest } = await captureReference({ url: baseUrl, project: 'fixture', allowLocalFixture: true, outputRoot: testOutputRoot, settleMs: 50 });
    generatedRunDirs.push(runDir);
    const names = await fs.readdir(runDir);
    expect(names).toEqual(expect.arrayContaining(['manifest.json', 'evidence.json', 'rights.json', 'network.json', 'console.json', 'desktop.png', 'mobile.png']));
    expect((await fs.stat(path.join(runDir, 'desktop.png'))).size).toBeGreaterThan(1000);
    expect((await fs.stat(path.join(runDir, 'mobile.png'))).size).toBeGreaterThan(1000);
    const ajv = await createValidator(); const validateRun = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-run.schema.json');
    expect(validateRun?.(manifest), JSON.stringify(validateRun?.errors)).toBe(true);
    expect(manifest.viewports.map(({ name }) => name)).toEqual(['desktop', 'mobile']);
    expect(manifest.warnings.some((warning) => warning.includes(`${probeOrigin}/private.png`))).toBe(true);
    expect(manifest.warnings.some((warning) => warning.includes('Blocked WebSocket'))).toBe(true); expect(probeHits).toBe(0);
    const validated = await validateRunDirectory(runDir);
    expect(validated.evidence.every(({ epistemicType }) => epistemicType === 'observed_fact')).toBe(true);
    for (const viewport of ['desktop', 'mobile']) for (const kind of ['structure', 'visual_system', 'motion_interaction', 'technical_signal', 'screenshot']) expect(validated.evidence.some((item) => item.viewport === viewport && item.kind === kind)).toBe(true);
    const structureDesktop = validated.evidence.find(({ id }) => id === 'ev_structure_desktop');
    const structureMobile = validated.evidence.find(({ id }) => id === 'ev_structure_mobile');
    expect(structureDesktop?.value).not.toEqual(structureMobile?.value);
    for (const artifact of manifest.artifacts) {
      const artifactFile = path.join(process.cwd(), ...artifact.path.split('/'));
      expect(createHash('sha256').update(await fs.readFile(artifactFile)).digest('hex')).toBe(artifact.sha256);
    }
    const allText = (await Promise.all(names.filter((name) => name.endsWith('.json')).map((name) => fs.readFile(path.join(runDir, name), 'utf8')))).join('\n');
    expect(allText).not.toMatch(/FIXTURE_SECRET|Authorization|Cookie|Set-Cookie|<html|responseBody|localStorage/);
    expect(allText).toContain('[content omitted; sha256=');

    const firstPacket = await prepareAnalysis(runDir); const secondPacket = await prepareAnalysis(runDir);
    expect(secondPacket.packet).toEqual(firstPacket.packet); expect(firstPacket.packet.missingEvidence).toEqual([]);
    expect(firstPacket.packet.analysisPolicy).toMatchObject({ evidenceOnly: true, doNotBrowseSource: true, enforcement: 'protocol' });
    expect(firstPacket.packet.screenshotArtifacts).toHaveLength(2);
    const { profile, principles } = analysisArtifacts(manifest.referenceId, manifest.runId, manifest.finalUrl);
    const profilePath = path.join(runDir, 'reference-profile.json'); const principlesPath = path.join(runDir, 'design-principles.json');
    await fs.writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`); await fs.writeFile(principlesPath, `${JSON.stringify(principles, null, 2)}\n`);
    await expect(validateAnalysis({ runDir, profilePath, principlesPath })).resolves.toEqual({ claims: 2, principles: 1 });

    const wrongRun = structuredClone(profile); wrongRun.claims[0]!.supportingEvidence[0]!.runId = 'another_run';
    const wrongRunPath = path.join(runDir, 'invalid-wrong-run.json'); await fs.writeFile(wrongRunPath, `${JSON.stringify(wrongRun)}\n`);
    await expect(validateAnalysis({ runDir, profilePath: wrongRunPath, principlesPath })).rejects.toThrow(/different or nonexistent run/);
    const unknownEvidence = structuredClone(principles); unknownEvidence.principles[0]!.supportingEvidence[0]!.evidenceId = 'ev_missing';
    const unknownPath = path.join(runDir, 'invalid-unknown-evidence.json'); await fs.writeFile(unknownPath, `${JSON.stringify(unknownEvidence)}\n`);
    await expect(validateAnalysis({ runDir, profilePath, principlesPath: unknownPath })).rejects.toThrow(/nonexistent evidence/);
    const escalated = structuredClone(principles); escalated.principles[0]!.rights.sourceStatus = 'reuse_allowed';
    const escalatedPath = path.join(runDir, 'invalid-rights.json'); await fs.writeFile(escalatedPath, `${JSON.stringify(escalated)}\n`);
    await expect(validateAnalysis({ runDir, profilePath, principlesPath: escalatedPath })).rejects.toThrow(/escalates or changes source rights/);
    const duplicateClaims = structuredClone(profile); duplicateClaims.claims.push(structuredClone(duplicateClaims.claims[0]!));
    const duplicateClaimsPath = path.join(runDir, 'invalid-duplicate-claims.json'); await fs.writeFile(duplicateClaimsPath, `${JSON.stringify(duplicateClaims)}\n`);
    await expect(validateAnalysis({ runDir, profilePath: duplicateClaimsPath, principlesPath })).rejects.toThrow(/Duplicate Reference Profile claim ID/);
    const duplicatePrinciples = structuredClone(principles); duplicatePrinciples.principles.push(structuredClone(duplicatePrinciples.principles[0]!));
    const duplicatePrinciplesPath = path.join(runDir, 'invalid-duplicate-principles.json'); await fs.writeFile(duplicatePrinciplesPath, `${JSON.stringify(duplicatePrinciples)}\n`);
    await expect(validateAnalysis({ runDir, profilePath, principlesPath: duplicatePrinciplesPath })).rejects.toThrow(/Duplicate Design Principle ID/);
    const changedBasis = structuredClone(principles); changedBasis.principles[0]!.rights.sourceBasis = 'An invented replacement basis.';
    const changedBasisPath = path.join(runDir, 'invalid-rights-basis.json'); await fs.writeFile(changedBasisPath, `${JSON.stringify(changedBasis)}\n`);
    await expect(validateAnalysis({ runDir, profilePath, principlesPath: changedBasisPath })).rejects.toThrow(/does not preserve the source rights basis/);
    const changedNotes = structuredClone(profile); changedNotes.sourceRightsNotes = [];
    const changedNotesPath = path.join(runDir, 'invalid-rights-notes.json'); await fs.writeFile(changedNotesPath, `${JSON.stringify(changedNotes)}\n`);
    await expect(validateAnalysis({ runDir, profilePath: changedNotesPath, principlesPath })).rejects.toThrow(/does not preserve the source rights notes/);

    const rightsPath = path.join(runDir, 'rights.json'); const originalRights = await fs.readFile(rightsPath, 'utf8');
    try { const duplicatedRights = JSON.parse(originalRights) as unknown[]; duplicatedRights.push(structuredClone(duplicatedRights[0])); await fs.writeFile(rightsPath, `${JSON.stringify(duplicatedRights)}\n`); await expect(validateRunDirectory(runDir)).rejects.toThrow(/Exactly one canonical rights record/); } finally { await fs.writeFile(rightsPath, originalRights); }
    const evidencePath = path.join(runDir, 'evidence.json'); const originalEvidence = await fs.readFile(evidencePath, 'utf8');
    try { const unsafeEvidence = JSON.parse(originalEvidence) as Array<Record<string, unknown>>; unsafeEvidence[0]!.value = { payload: 'opaque response content' }; await fs.writeFile(evidencePath, `${JSON.stringify(unsafeEvidence)}\n`); await expect(validateRunDirectory(runDir)).rejects.toThrow(/uncontracted field navigation.payload/); } finally { await fs.writeFile(evidencePath, originalEvidence); }
    try { const primitiveEvidence = JSON.parse(originalEvidence) as Array<Record<string, unknown>>; primitiveEvidence[0]!.value = '{"secret":"response body"}'; await fs.writeFile(evidencePath, `${JSON.stringify(primitiveEvidence)}\n`); await expect(validateRunDirectory(runDir)).rejects.toThrow(/non-object or disallowed root value/); } finally { await fs.writeFile(evidencePath, originalEvidence); }
    try { const secretClaim = JSON.parse(originalEvidence) as Array<Record<string, unknown>>; secretClaim[0]!.claim = 'Authorization: Bearer private'; await fs.writeFile(evidencePath, `${JSON.stringify(secretClaim)}\n`); await expect(validateRunDirectory(runDir)).rejects.toThrow(/claim contains forbidden raw content/); } finally { await fs.writeFile(evidencePath, originalEvidence); }
    try { const unlistedArtifact = JSON.parse(originalEvidence) as Array<Record<string, unknown>>; const screenshot = unlistedArtifact.find((item) => item.kind === 'screenshot')!; screenshot.artifact = { path: `${path.relative(process.cwd(), runDir).replaceAll('\\', '/')}/rogue.png`, sha256: 'a'.repeat(64) }; await fs.writeFile(evidencePath, `${JSON.stringify(unlistedArtifact)}\n`); await expect(validateRunDirectory(runDir)).rejects.toThrow(/unlisted or mismatched artifact/); } finally { await fs.writeFile(evidencePath, originalEvidence); }
  }, 30_000);
});
