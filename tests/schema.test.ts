import { describe, expect, it } from 'vitest';
import { createValidator } from '../src/schema.js';

describe('schemas', () => {
  it('accepts a valid rights record and rejects its legal-opinion marker', async () => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/rights.schema.json');
    const valid = { sourceReference: 'https://example.com/', status: 'inspect_only', basis: 'No reuse permission established.', isLegalOpinion: false };
    expect(validate?.(valid)).toBe(true);
    expect(validate?.({ ...valid, status: 'free_to_copy' })).toBe(false);
    expect(validate?.({ ...valid, isLegalOpinion: true })).toBe(false);
  });
  it('enforces epistemic types', async () => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/evidence.schema.json');
    const valid = { id: 'ev_title', runId: 'run_1', sourceReference: 'https://example.com/', capturedAt: '2026-01-01T00:00:00Z', kind: 'page_metadata', epistemicType: 'observed_fact', claim: 'Title observed', provenance: { method: 'DOM' }, rightsStatus: 'inspect_only' };
    expect(validate?.(valid)).toBe(true);
    expect(validate?.({ ...valid, epistemicType: 'guess' })).toBe(false);
    expect(validate?.({ claim: 'missing fields' })).toBe(false);
  });
  it('accepts a future principle with evidence support', async () => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/design-principle.schema.json');
    expect(validate?.({ id: 'dp_hierarchy', principle: 'Use hierarchy', mechanism: 'Scale', problemAddressed: 'Scanning', transferability: 'high', constraints: [], antiCopyNotes: 'Recreate independently', supportingEvidenceIds: ['ev_title'], confidence: 0.8 })).toBe(true);
  });
  it.each(['\\\\server\\share\\x', '\\rooted\\x', '../x', 'a/../x'])('rejects non-portable artifact path %s', async (artifactPath) => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-run.schema.json');
    const run = { schemaVersion: '1.0.0', runId: 'run_1', project: 'fixture', requestedUrl: 'https://example.com/', finalUrl: 'https://example.com/', capturedAt: '2026-01-01T00:00:00Z', viewport: { width: 1280, height: 720 }, tools: {}, artifacts: Array.from({ length: 4 }, () => ({ path: artifactPath, sha256: 'a'.repeat(64) })), evidenceIds: [], warnings: [], errors: [], policyDecisions: ['public'] };
    expect(validate?.(run)).toBe(false);
  });
});
