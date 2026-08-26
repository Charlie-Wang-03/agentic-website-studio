import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createValidator } from '../src/schema.js';

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const read = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(path.resolve(file), 'utf8')) as T;

describe('M4.2R provenance, QA, and replaytest gate', () => {
  it('validates schemas, exact current source hashes, and non-approval gate bindings', async () => {
    const manifestPath = 'docs/wayfinder.m42r-source-manifest.json'; const qaPath = 'docs/wayfinder.m42r-qa-report.json'; const gatePath = 'docs/wayfinder.m42r-human-replaytest-gate.json'; const auditPath = 'docs/wayfinder.m42r-independent-revision-audit.json';
    const manifest = await read<{ sourceFiles: Array<{ path: string; sha256: string }>; creativeAssets: Array<{ path: string; sha256: string; provenanceClass: string; rightsStatus: string }>; buildArtifacts: Array<{ path: string; sha256: string }> }>(manifestPath);
    const qa = await read<{ sourceManifestSha256: string; independentAuditSha256: string; overallResult: string }>(qaPath);
    const gate = await read<{ status: string; bindings: { sourceManifestSha256: string; qaReportSha256: string; independentAuditSha256: string } }>(gatePath);
    const validator = await createValidator();
    for (const [name, value] of [['m42r-source-manifest', manifest], ['m42r-qa-report', qa], ['human-replaytest-gate', gate]] as const) {
      const validate = validator.getSchema(`https://agentic-website-studio.local/schemas/${name}.schema.json`); expect(validate, `schema ${name}`).toBeDefined(); expect(validate?.(value), JSON.stringify(validate?.errors)).toBe(true);
    }
    const manifestHash = sha256(await fs.readFile(manifestPath));
    expect(qa.sourceManifestSha256).toBe(manifestHash); expect(gate.bindings.sourceManifestSha256).toBe(manifestHash); expect(gate.bindings.qaReportSha256).toBe(sha256(await fs.readFile(qaPath)));
    expect(qa.independentAuditSha256).toBe(sha256(await fs.readFile(auditPath))); expect(gate.bindings.independentAuditSha256).toBe(qa.independentAuditSha256);
    for (const item of [...manifest.sourceFiles, ...manifest.creativeAssets, ...manifest.buildArtifacts]) expect(sha256(await fs.readFile(path.resolve(item.path)))).toBe(item.sha256);
    expect(manifest.creativeAssets.every((item) => item.provenanceClass === 'project_native' && item.rightsStatus === 'project_owned_original')).toBe(true);
    expect(qa.overallResult).not.toBe('fail'); expect(gate.status).toBe('pending_human_replaytest');
  });
});
