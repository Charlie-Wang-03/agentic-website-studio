import { describe, expect, it } from 'vitest';
import { createValidator } from '../src/schema.js';
import { evidenceRefKey } from '../src/provenance.js';
import { validateBoundedEvidenceValue } from '../src/run-validation.js';

const referenceId = `ref_${'a'.repeat(20)}`;
const runId = 'run_1';
const evidenceRef = { runId, evidenceId: 'ev_structure_desktop' };
const confidence = { level: 'high', rationale: 'Both deterministic viewports support the bounded claim.' };
const rightsBasis = 'Public accessibility permits inspection only; reuse was not established.';
const antiCopy = { abstractionOnly: true, independentVisualExpressionRequired: true, noSourceAssetReuse: true, noSourceProseReuse: true, noExactLayoutReplication: true, noExactMotionSequenceReplication: true, noSourceCodeReconstruction: true, referenceOnlyElements: ['source-specific artwork and prose'] };
const rawEvidence = { id: 'ev_structure_desktop', runId, referenceId, sourceReference: 'https://example.com/', capturedAt: '2026-01-01T00:00:00Z', viewport: 'desktop', kind: 'structure', epistemicType: 'observed_fact', claim: 'Structure observed', provenance: { method: 'DOM geometry' }, rightsStatus: 'inspect_only' };
const profile = { schemaVersion: '1.0.0', referenceId, runId, source: { sanitizedUrl: 'https://example.com/' }, rightsStatus: 'inspect_only', rightsBasis, sourceRightsNotes: [], rightsCaveats: ['Inspection does not grant reuse permission.'], claims: [{ id: 'rpc_hierarchy', category: 'layout_structure', statement: 'Repeated scale changes appear to organize scanning.', epistemicType: 'inference', supportingEvidence: [evidenceRef], contradictoryEvidence: [], confidence, limitations: [] }], insufficientEvidence: [] };
const principles = { schemaVersion: '1.0.0', referenceId, runId, principles: [{ id: 'dp_hierarchy', principle: 'Vary scale to clarify scanning order.', problemAddressed: 'Dense information can lack a clear entry point.', mechanism: 'Use independently designed scale tiers.', expectedExperientialEffect: 'Faster orientation.', applicableContexts: ['editorial landing pages'], transferability: 'high', constraints: ['Choose original dimensions and composition.'], supportingProfileClaimIds: ['rpc_hierarchy'], supportingEvidence: [evidenceRef], contradictoryEvidence: [], confidence, antiCopy, rights: { sourceStatus: 'inspect_only', sourceBasis: rightsBasis, sourceNotes: [], caveats: ['No source expression may be copied.'], isLegalOpinion: false }, sourceReferenceIds: [referenceId] }] };

describe('M2 schemas', () => {
  it('makes repeated local evidence IDs globally unambiguous through their run identity', () => {
    expect(evidenceRefKey({ runId: 'run_a', evidenceId: 'ev_structure' })).not.toBe(evidenceRefKey({ runId: 'run_b', evidenceId: 'ev_structure' }));
  });
  it('rejects raw bodies, markup, prototype keys, and oversized values before packet preparation', () => {
    expect(() => validateBoundedEvidenceValue({ responseBody: 'private' })).toThrow(/forbidden field/);
    expect(() => validateBoundedEvidenceValue({ text: '<!doctype html><html>' })).toThrow(/forbidden raw content/);
    expect(() => validateBoundedEvidenceValue(JSON.parse('{"__proto__":"x"}'))).toThrow(/forbidden field/);
    expect(() => validateBoundedEvidenceValue({ text: 'x'.repeat(2001) })).toThrow(/oversized string/);
  });
  it('accepts rights metadata and rejects legal-opinion or rights invention markers', async () => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/rights.schema.json');
    const valid = { referenceId, runId, sourceReference: 'https://example.com/', status: 'inspect_only', basis: 'No reuse permission established.', isLegalOpinion: false };
    expect(validate?.(valid)).toBe(true); expect(validate?.({ ...valid, status: 'free_to_copy' })).toBe(false); expect(validate?.({ ...valid, isLegalOpinion: true })).toBe(false);
  });
  it('makes raw evidence observed-fact-only', async () => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/evidence.schema.json');
    expect(validate?.(rawEvidence)).toBe(true);
    expect(validate?.({ ...rawEvidence, epistemicType: 'inference' })).toBe(false);
    expect(validate?.({ ...rawEvidence, epistemicType: 'transferable_principle' })).toBe(false);
    expect(validate?.({ ...rawEvidence, confidence: 0.9 })).toBe(false);
  });
  it('accepts inference in a Reference Profile but not as a Design Principle', async () => {
    const ajv = await createValidator();
    const validateProfile = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-profile.schema.json');
    const validatePrinciple = ajv.getSchema('https://agentic-website-studio.local/schemas/design-principle.schema.json');
    expect(validateProfile?.(profile), JSON.stringify(validateProfile?.errors)).toBe(true);
    expect(validatePrinciple?.(profile)).toBe(false);
  });
  it('accepts principles only with structured provenance, confidence, rights, and anti-copy constraints', async () => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/design-principle.schema.json');
    expect(validate?.(principles), JSON.stringify(validate?.errors)).toBe(true);
    const malformed = structuredClone(principles); malformed.principles[0]!.antiCopy.noSourceAssetReuse = false as true;
    expect(validate?.(malformed)).toBe(false);
    const noRationale = structuredClone(principles) as Record<string, unknown>; const item = (noRationale.principles as Array<Record<string, unknown>>)[0]!; item.confidence = { level: 'high' };
    expect(validate?.(noRationale)).toBe(false);
  });
  it.each(['\\\\server\\share\\x', '\\rooted\\x', '../x', 'a/../x'])('rejects non-portable artifact path %s', async (artifactPath) => {
    const ajv = await createValidator(); const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-run.schema.json');
    const run = { schemaVersion: '2.0.0', referenceId, runId, project: 'fixture', requestedUrl: 'https://example.com/', finalUrl: 'https://example.com/', capturedAt: '2026-01-01T00:00:00Z', viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }], tools: {}, artifacts: Array.from({ length: 6 }, (_, index) => ({ path: `${artifactPath}${index}`, sha256: 'a'.repeat(64) })), evidenceIds: ['ev_x'], warnings: [], errors: [], policyDecisions: ['public'] };
    expect(validate?.(run)).toBe(false);
  });
});
