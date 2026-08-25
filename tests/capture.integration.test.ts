import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureReference } from '../src/capture.js';
import { createValidator } from '../src/schema.js';

let server: http.Server; let probeServer: http.Server; let baseUrl = ''; let probeOrigin = ''; let probeHits = 0;
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
afterAll(async () => { await Promise.all([server, probeServer].map((item) => new Promise<void>((resolve, reject) => item.close((error) => error ? reject(error) : resolve())))); });

describe('capture integration', () => {
  it('produces valid, private-by-default evidence artifacts', async () => {
    const { runDir, manifest } = await captureReference({ url: baseUrl, project: 'fixture', allowLocalFixture: true });
    const names = await fs.readdir(runDir);
    expect(names).toEqual(expect.arrayContaining(['manifest.json', 'evidence.json', 'rights.json', 'network.json', 'console.json', 'page.png']));
    expect((await fs.stat(path.join(runDir, 'page.png'))).size).toBeGreaterThan(1000);
    const ajv = await createValidator();
    const validateRun = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-run.schema.json');
    expect(validateRun?.(manifest), JSON.stringify(validateRun?.errors)).toBe(true);
    expect((manifest as { warnings: string[] }).warnings.some((warning) => warning.includes(`${probeOrigin}/private.png`))).toBe(true);
    expect((manifest as { warnings: string[] }).warnings.some((warning) => warning.includes('Blocked WebSocket'))).toBe(true);
    expect(probeHits).toBe(0);
    const evidence = JSON.parse(await fs.readFile(path.join(runDir, 'evidence.json'), 'utf8')) as unknown[];
    const validateEvidence = ajv.getSchema('https://agentic-website-studio.local/schemas/evidence.schema.json');
    expect(evidence.every((item) => validateEvidence?.(item))).toBe(true);
    const rights = JSON.parse(await fs.readFile(path.join(runDir, 'rights.json'), 'utf8')) as unknown[];
    const validateRights = ajv.getSchema('https://agentic-website-studio.local/schemas/rights.schema.json');
    expect(rights.every((item) => validateRights?.(item))).toBe(true);
    const typedManifest = manifest as { evidenceIds: string[]; artifacts: Array<{ path: string; sha256: string }> };
    expect(typedManifest.evidenceIds).toEqual(evidence.map((item) => (item as { id: string }).id));
    for (const artifact of typedManifest.artifacts) {
      const artifactFile = path.join(process.cwd(), ...artifact.path.split('/'));
      expect(createHash('sha256').update(await fs.readFile(artifactFile)).digest('hex')).toBe(artifact.sha256);
    }
    const allText = (await Promise.all(names.filter((name) => name.endsWith('.json')).map((name) => fs.readFile(path.join(runDir, name), 'utf8')))).join('\n');
    expect(allText).not.toMatch(/FIXTURE_SECRET|Authorization|Cookie|Set-Cookie/);
    expect(allText).toContain('[content omitted; sha256=');
  }, 30_000);
});
