import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createValidator } from '../src/schema.js';

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const read = async <T>(file: string): Promise<T> => JSON.parse(await fs.readFile(path.resolve(file), 'utf8')) as T;

describe('historical M4.2 provenance and gate artifacts', () => {
  it('preserves the failed implementation snapshot and exact historical bindings', async () => {
    const manifestPath = 'docs/wayfinder.m4-source-manifest.json';
    const qaPath = 'docs/wayfinder.m4-qa-report.json';
    const gatePath = 'docs/wayfinder.m4-human-playtest-gate.json';
    const manifest = await read<{ manifestId: string; creativeAssets: Array<{ provenanceClass: string; rightsStatus: string }> }>(manifestPath);
    const qa = await read<{ sourceManifestSha256: string; overallResult: string }>(qaPath);
    const gate = await read<{ status: string; bindings: { sourceManifestSha256: string; qaReportSha256: string } }>(gatePath);
    const validator = await createValidator();
    for (const [name, value] of [['m42-source-manifest', manifest], ['m42-qa-report', qa], ['human-playtest-gate', gate]] as const) {
      const validate = validator.getSchema(`https://agentic-website-studio.local/schemas/${name}.schema.json`);
      expect(validate, `schema ${name}`).toBeDefined();
      expect(validate?.(value), JSON.stringify(validate?.errors)).toBe(true);
    }
    const manifestHash = sha256(await fs.readFile(manifestPath));
    expect(qa.sourceManifestSha256).toBe(manifestHash);
    expect(gate.bindings.sourceManifestSha256).toBe(manifestHash);
    expect(gate.bindings.qaReportSha256).toBe(sha256(await fs.readFile(qaPath)));
    expect(manifest.manifestId).toBe('manifest_wayfinder_m42_slice_01');
    expect(manifest.creativeAssets.every((item) => item.provenanceClass === 'project_native' && item.rightsStatus === 'project_owned_original')).toBe(true);
    expect(qa.overallResult).not.toBe('fail');
    expect(gate.status).toBe('pending_human_playtest');
  });
});
