import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { validateHumanDecision, validateImplementationContract } from '../src/m4.js';
import type { CreativeConcept, CreativeConceptsDocument, HumanConceptDecision, ImplementationContract } from '../src/types.js';

const testRoot = path.resolve('.tmp/m4-tests');
async function writeJson(file: string, value: unknown): Promise<void> { await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
function sha256(text: string): string { return createHash('sha256').update(text).digest('hex'); }
async function readJson<T>(file: string): Promise<T> { return JSON.parse(await fs.readFile(file, 'utf8')) as T; }
function concept(id: string, prohibitions: string[]): CreativeConcept {
  return {
    id, name: id, thesis: 'An independently authored direction.', experiencePromise: 'A bounded original experience.', targetEmotionalArc: ['orient', 'reflect'],
    narrativeModel: 'Short environmental progression.', interactionModel: 'One deliberate choice.', spatialProgressionModel: 'Single forward axis.',
    visualLanguageDirection: 'Project-native abstract shapes.', audioMotionRole: 'Optional and never required for meaning.', expectedSessionFlow: ['arrive', 'choose', 'reflect'],
    selectedSynthesisUnitIds: ['su_fixture'], rejectedSynthesisUnitIds: [], resolvedTensions: [], unresolvedTensions: ['Consequence must remain legible.'],
    originalityRationale: 'All expression is independently authored.', sourceInfluenceSummary: [{ synthesisUnitId: 'su_fixture' }], protectedExpressionProhibitions: prohibitions,
    implementationPosture: 'Semantic document and project-native styles.', mobilePosture: 'One column with touch controls.', accessibilityConsiderations: ['keyboard', 'reduced motion'],
    complexityRisk: ['Outcome variation needs testing.'], smallestConvincingPlayableSlice: 'One choice, consequence, and ending.', majorUnknowns: ['Will consequence be perceptible?']
  };
}

async function setup(): Promise<{ common: { decisionPath: string; conceptsPath: string; gatePath: string; conceptReviewPath: string; originalityReviewPath: string }; contractPath: string }> {
  const contract = await readJson<ImplementationContract>(path.resolve('docs/wayfinder.m4-implementation-contract.json'));
  const decision = await readJson<HumanConceptDecision>(path.resolve('docs/wayfinder.m4-human-decision.json'));
  const prohibitions = contract.originalityConstraints.inheritedProtectedExpressionProhibitions;
  const concepts: CreativeConceptsDocument = { schemaVersion: '1.0.0', projectId: decision.projectId, synthesisId: decision.synthesisId, rightsMode: 'original', concepts: [concept(decision.selectedConceptId, prohibitions), concept('concept_fixture_second', ['No copied expression.']), concept('concept_fixture_third', ['No copied expression.'])] };
  const conceptsPath = path.join(testRoot, 'concepts.json'); await writeJson(conceptsPath, concepts); const conceptsSha256 = sha256(await fs.readFile(conceptsPath, 'utf8'));
  const reviewerWarnings = ['Selected concept warning.']; const originalityWarnings = ['Independent authorship requires verification.']; const unresolvedQuestions = ['Will consequence be perceptible?'];
  const gatePath = path.join(testRoot, 'gate.json'); await writeJson(gatePath, { schemaVersion: '1.0.0', projectId: decision.projectId, synthesisId: decision.synthesisId, status: 'pending_human_selection', concepts: concepts.concepts.map((item) => ({ conceptId: item.id, name: item.name, summary: item.thesis, keyTradeoffs: item.unresolvedTensions, riskComplexityNotes: item.complexityRisk })), reviewerWarnings, originalityWarnings, unresolvedQuestions, availableActions: ['select_concept', 'request_concept_revision', 'reject_all_and_resynthesize'] });
  decision.conceptsSha256 = conceptsSha256; decision.reviewerWarnings = reviewerWarnings; decision.originalityWarnings = originalityWarnings; decision.unresolvedQuestions = unresolvedQuestions;
  const decisionPath = path.join(testRoot, 'decision.json'); await writeJson(decisionPath, decision); const decisionSha256 = sha256(await fs.readFile(decisionPath, 'utf8'));
  const review = (reviewType: 'concept_diversity_grounding' | 'originality') => ({ schemaVersion: '1.0.0', reviewId: `review_fixture_${reviewType}`, reviewType, projectId: decision.projectId, synthesisId: decision.synthesisId, conceptsSha256, verdict: 'pass_with_warnings', findings: ['Fixture review passed.'], warnings: reviewType === 'originality' ? originalityWarnings : reviewerWarnings, isLegalReview: false });
  const conceptReviewPath = path.join(testRoot, 'concept-review.json'); const originalityReviewPath = path.join(testRoot, 'originality-review.json'); await writeJson(conceptReviewPath, review('concept_diversity_grounding')); await writeJson(originalityReviewPath, review('originality'));
  contract.sourceSynthesis.conceptsSha256 = conceptsSha256; contract.humanDecision.decisionSha256 = decisionSha256; contract.inheritedReviewerWarnings = [...reviewerWarnings, ...originalityWarnings]; contract.inheritedUnresolvedQuestions = unresolvedQuestions;
  const contractPath = path.join(testRoot, 'contract.json'); await writeJson(contractPath, contract);
  return { common: { decisionPath, conceptsPath, gatePath, conceptReviewPath, originalityReviewPath }, contractPath };
}

describe('M4 human decision and implementation contract', () => {
  beforeEach(async () => { await fs.rm(testRoot, { recursive: true, force: true }); await fs.mkdir(testRoot, { recursive: true }); });
  it('validates schema, exact human provenance bindings, originality inheritance, and a deterministic playable slice', async () => {
    const { common, contractPath } = await setup();
    await expect(validateHumanDecision(common)).resolves.toMatchObject({ selectedConceptId: 'concept_three_bearings' });
    await expect(validateImplementationContract({ ...common, contractPath })).resolves.toMatchObject({ selectedConceptId: 'concept_three_bearings', states: 9 });
  });
  it('rejects a human decision whose selected concept does not exist', async () => {
    const { common } = await setup(); const decision = await readJson<HumanConceptDecision>(common.decisionPath); decision.selectedConceptId = 'concept_missing'; await writeJson(common.decisionPath, decision);
    await expect(validateHumanDecision(common)).rejects.toThrow(/does not exist/);
  });
  it('rejects weakened or substituted originality constraints', async () => {
    const { common, contractPath } = await setup(); const contract = await readJson<ImplementationContract>(contractPath); contract.originalityConstraints.inheritedProtectedExpressionProhibitions = ['Substituted restriction.']; await writeJson(contractPath, contract);
    await expect(validateImplementationContract({ ...common, contractPath })).rejects.toThrow(/does not inherit/);
  });
  it('rejects forbidden source leakage and source-specific identifiers', async () => {
    const { common, contractPath } = await setup(); const contract = await readJson<ImplementationContract>(contractPath); contract.experienceDefinition.playerExperience = 'Revisit https://example.invalid for ref_borrowed details.'; await writeJson(contractPath, contract);
    await expect(validateImplementationContract({ ...common, contractPath })).rejects.toThrow(/leaks forbidden/);
  });
  it('rejects nondeterministic state transitions', async () => {
    const { common, contractPath } = await setup(); const contract = await readJson<ImplementationContract>(contractPath); contract.engineeringScope.deterministicStateMachine.transitions.push({ from: 'choice_prompt', event: 'choose_edge', to: 'consequence_wait' }); await writeJson(contractPath, contract);
    await expect(validateImplementationContract({ ...common, contractPath })).rejects.toThrow(/nondeterministic/);
  });
});
