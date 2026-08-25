import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { hashFile, hashText } from '../src/artifacts.js';
import { prepareCreative, prepareSynthesis, validateConcepts, validateSynthesis } from '../src/m3.js';
import { prepareAnalysis } from '../src/analysis.js';
import { createReferenceId } from '../src/reference.js';
import type { CreativeConceptsDocument, ProjectBrief, SynthesisMap } from '../src/types.js';

const root = process.cwd();
const testRoot = path.join(root, '.tmp', 'm3-tests');
const brief: ProjectBrief = {
  schemaVersion: '1.0.0', projectId: 'project_fixture', workingTitle: 'Original Fixture', purpose: 'Test bounded synthesis.', targetAudience: ['testers'], desiredExperience: ['curiosity'], expectedSessionLength: '5 minutes', narrativeGoal: 'An original journey.', interactionGoal: 'Make meaningful choices.', visualAspirations: ['original abstract shapes'], platformConstraints: ['browser'], accessibilityExpectations: ['keyboard'], mobileExpectations: ['touch'], engineeringConstraints: ['lightweight'], creativeRightsMode: 'original', prohibitedExpressions: ['source characters', 'source prose', 'source assets'], mustHaveQualities: ['originality'], unwantedQualities: ['cloning'], openQuestions: ['pacing'],
};
const rightsBasis = 'Public accessibility permits inspection only; reuse was not established.';
const antiCopy = { abstractionOnly: true as const, independentVisualExpressionRequired: true as const, noSourceAssetReuse: true as const, noSourceProseReuse: true as const, noExactLayoutReplication: true as const, noExactMotionSequenceReplication: true as const, noSourceCodeReconstruction: true as const, referenceOnlyElements: ['fixture-source-marker'] };

async function writeJson(file: string, value: unknown): Promise<void> { await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }
async function makeTuple(label: string, principle: string): Promise<string> {
  const runDir = path.join(testRoot, label); await fs.mkdir(runDir, { recursive: true });
  const url = `https://${label}.example.invalid/`; const referenceId = createReferenceId(url); const runId = `run_${label}`; const evidenceId = `ev_${label}`;
  const evidence = [{ id: evidenceId, runId, referenceId, sourceReference: url, capturedAt: '2026-01-01T00:00:00Z', viewport: 'desktop', kind: 'structure', epistemicType: 'observed_fact', claim: 'A project-owned fixture structure was observed.', value: { title: label, sections: [], headings: [], budgets: { visibleElementSample: 1, sections: 1, headings: 1, affordances: 1 }, landmarkOrder: [], counts: { links: 0, buttons: 0, forms: 0, images: 0, textBlocks: 1 }, scroll: { width: 800, height: 1000, horizontalOverflow: false }, layoutModes: [], affordances: [] }, provenance: { method: 'fixture' }, rightsStatus: 'inspect_only' }];
  const rights = [{ referenceId, runId, sourceReference: url, status: 'inspect_only', basis: rightsBasis, isLegalOpinion: false }];
  await writeJson(path.join(runDir, 'evidence.json'), evidence); await writeJson(path.join(runDir, 'rights.json'), rights);
  for (const name of ['network.json', 'console.json', 'desktop.png', 'mobile.png']) await fs.writeFile(path.join(runDir, name), `fixture-${label}-${name}`);
  const artifactNames = ['evidence.json', 'rights.json', 'network.json', 'console.json', 'desktop.png', 'mobile.png'];
  const artifacts = await Promise.all(artifactNames.map(async (name) => ({ path: path.relative(root, path.join(runDir, name)).split(path.sep).join('/'), sha256: await hashFile(path.join(runDir, name)) })));
  await writeJson(path.join(runDir, 'manifest.json'), { schemaVersion: '2.0.0', referenceId, runId, project: 'fixture', requestedUrl: url, finalUrl: url, capturedAt: '2026-01-01T00:00:00Z', viewports: [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }], tools: { fixture: '1' }, artifacts, evidenceIds: [evidenceId], warnings: [], errors: [], policyDecisions: ['project-owned deterministic fixture'] });
  const { packetPath: analysisPacketPath } = await prepareAnalysis(runDir);
  const evidenceRef = { runId, evidenceId }; const confidence = { level: 'high', rationale: 'The bounded fixture directly supports this test claim.' } as const;
  const profile = { schemaVersion: '1.0.0', referenceId, runId, source: { sanitizedUrl: url }, rightsStatus: 'inspect_only', rightsBasis, sourceRightsNotes: [], rightsCaveats: ['Inspection is not reuse permission.'], claims: [{ id: `rpc_${label}`, category: 'interaction_pattern', statement: `${principle} is represented as an abstract fixture mechanism.`, epistemicType: 'inference', supportingEvidence: [evidenceRef], contradictoryEvidence: [], confidence, limitations: [] }], insufficientEvidence: [] };
  const principles = { schemaVersion: '1.0.0', referenceId, runId, principles: [{ id: `dp_${label}`, principle, problemAddressed: 'Maintain purposeful attention.', mechanism: principle, expectedExperientialEffect: 'Sustained curiosity.', applicableContexts: ['original interactive stories'], transferability: 'high', constraints: ['Use independent expression.'], supportingProfileClaimIds: [`rpc_${label}`], supportingEvidence: [evidenceRef], contradictoryEvidence: [], confidence, antiCopy, rights: { sourceStatus: 'inspect_only', sourceBasis: rightsBasis, sourceNotes: [], caveats: ['No source expression may be copied.'], isLegalOpinion: false }, sourceReferenceIds: [referenceId] }] };
  await writeJson(path.join(runDir, 'profile.json'), profile); await writeJson(path.join(runDir, 'principles.json'), principles);
  const tuplePath = path.join(testRoot, `${label}.tuple.json`); await writeJson(tuplePath, { runDir, analysisPacketPath, profilePath: path.join(runDir, 'profile.json'), principlesPath: path.join(runDir, 'principles.json') }); return tuplePath;
}

async function setup(): Promise<{ tuplePaths: string[]; packetPath: string; mapPath: string; creativePath: string; conceptsPath: string; conceptReviewPath: string; originalityReviewPath: string }> {
  const briefPath = path.join(testRoot, 'brief.json'); await writeJson(briefPath, brief);
  const tuplePaths = await Promise.all([makeTuple('alpha', 'Reveal environments progressively.'), makeTuple('beta', 'Keep orientation persistent.'), makeTuple('gamma', 'Let choices branch the route.')]);
  const prepared = await prepareSynthesis({ briefPath, tuplePaths, outputDir: testRoot });
  const refs = prepared.packet.agentFacing.references;
  const contribution = (index: number) => ({ referenceId: refs[index]!.opaqueReferenceId, principleIds: [refs[index]!.principles[0]!.id], profileClaimIds: [refs[index]!.claims[0]!.id] });
  const base = { problemAddressed: 'Keep attention purposeful.', projectValue: 'Supports the original fixture brief.', avoidWhen: ['When clarity would suffer.'], tensionsCreated: ['agency versus authorial pacing'], sourceSpecificExpressionExcluded: ['all source-specific expression'], contradictoryPrincipleIds: [], contradictoryProfileClaimIds: [], confidence: { level: 'medium', rationale: 'The fixture provides bounded abstract support.' } as const, limitations: ['Semantic similarity requires human review.'], rightsCaveats: ['Inspection is not reuse permission.'], inheritedAntiCopyConstraints: ['Independent expression is required.'] };
  const map: SynthesisMap = { schemaVersion: '1.0.0', synthesisId: 'syn_fixture', projectId: brief.projectId, sourcePacketId: prepared.packet.packetId, units: [
    { ...base, id: 'su_convergent', type: 'convergent_pattern', title: 'Progressive orientation', abstractMechanism: 'Reveal change while retaining orientation.', contributions: [contribution(0), contribution(1)], consensusClaimed: true },
    { ...base, id: 'su_complementary', type: 'complementary_pattern', title: 'Alternative agency mechanisms', abstractMechanism: 'Preserve distinct linear and branching solutions.', contributions: [contribution(1), contribution(2)], consensusClaimed: false },
    { ...base, id: 'su_tension', type: 'tension_tradeoff', title: 'Pacing versus agency', abstractMechanism: 'Keep the tradeoff unresolved for creative exploration.', contributions: [contribution(0), contribution(2)], consensusClaimed: false },
    { ...base, id: 'su_unique', type: 'unique_candidate', title: 'Branching route', abstractMechanism: 'Use a single-reference option without calling it consensus.', contributions: [contribution(2)], consensusClaimed: false },
  ] };
  const mapPath = path.join(testRoot, 'synthesis-map.json'); await writeJson(mapPath, map); await validateSynthesis({ packetPath: prepared.packetPath, mapPath });
  const creativePath = path.join(testRoot, 'creative-packet.json'); const { packet: creativePacket } = await prepareCreative({ briefPath, packetPath: prepared.packetPath, mapPath, outputPath: creativePath });
  const concepts: CreativeConceptsDocument = { schemaVersion: '1.0.0', projectId: brief.projectId, synthesisId: map.synthesisId, rightsMode: 'original', concepts: ['trail', 'constellation', 'echo'].map((name, index) => ({ id: `concept_${name}`, name, thesis: `Distinct original direction ${String(index + 1)}.`, experiencePromise: 'A bounded contemplative experience.', targetEmotionalArc: ['curiosity', 'reflection'], narrativeModel: index === 0 ? 'branching' : index === 1 ? 'fragment assembly' : 'cyclical', interactionModel: index === 0 ? 'route choice' : index === 1 ? 'observation linking' : 'rhythmic navigation', spatialProgressionModel: index === 0 ? 'forking path' : index === 1 ? 'open field' : 'returning loop', visualLanguageDirection: 'Independent abstract geometry.', audioMotionRole: 'Optional and reduced-motion aware.', expectedSessionFlow: ['arrive', 'choose', 'reflect'], selectedSynthesisUnitIds: index === 0 ? ['su_convergent', 'su_unique'] : index === 1 ? ['su_complementary'] : ['su_tension'], rejectedSynthesisUnitIds: index === 0 ? ['su_tension'] : [], resolvedTensions: [], unresolvedTensions: ['agency versus authorial pacing'], originalityRationale: 'The expression begins from the project purpose and abstract mechanisms.', sourceInfluenceSummary: (index === 0 ? ['su_convergent', 'su_unique'] : index === 1 ? ['su_complementary'] : ['su_tension']).map((synthesisUnitId) => ({ synthesisUnitId })), protectedExpressionProhibitions: [...brief.prohibitedExpressions, ...creativePacket.antiCopyRequirements], implementationPosture: index === 0 ? 'DOM and lightweight Canvas' : index === 1 ? '2D Canvas' : 'DOM/CSS', mobilePosture: 'Touch-first alternative with no hover dependency.', accessibilityConsiderations: ['keyboard', 'reduced motion'], complexityRisk: ['Pacing needs playtesting.'], smallestConvincingPlayableSlice: 'One choice and one visibly changed consequence.', majorUnknowns: ['Exact pacing'] })) };
  const conceptsPath = path.join(testRoot, 'concepts.json'); await writeJson(conceptsPath, concepts);
  const conceptsSha256 = hashText(`${JSON.stringify(concepts, null, 2)}\n`);
  const conceptReviewPath = path.join(testRoot, 'concept-review.json'); const originalityReviewPath = path.join(testRoot, 'originality-review.json');
  await writeJson(conceptReviewPath, { schemaVersion: '1.0.0', reviewId: 'review_diversity', reviewType: 'concept_diversity_grounding', projectId: brief.projectId, synthesisId: map.synthesisId, conceptsSha256, verdict: 'pass_with_warnings', findings: ['Concepts are materially distinct.'], warnings: ['Fixture warning.'], isLegalReview: false });
  await writeJson(originalityReviewPath, { schemaVersion: '1.0.0', reviewId: 'review_originality', reviewType: 'originality', projectId: brief.projectId, synthesisId: map.synthesisId, conceptsSha256, verdict: 'pass', findings: ['No source leakage observed.'], warnings: [], isLegalReview: false });
  return { tuplePaths, packetPath: prepared.packetPath, mapPath, creativePath, conceptsPath, conceptReviewPath, originalityReviewPath };
}

describe('M3 deterministic synthesis and originality firewalls', () => {
  beforeEach(async () => { await fs.rm(testRoot, { recursive: true, force: true }); await fs.mkdir(testRoot, { recursive: true }); });
  it('validates three M2 tuples, rejects duplicates, and constructs deterministic source-neutral packets', async () => {
    const { tuplePaths, packetPath } = await setup(); const first = await fs.readFile(packetPath, 'utf8');
    await expect(prepareSynthesis({ briefPath: path.join(testRoot, 'brief.json'), tuplePaths: [tuplePaths[0]!, tuplePaths[0]!, tuplePaths[2]!], outputDir: testRoot })).rejects.toThrow(/Duplicate reference ID/);
    await fs.rm(path.join(testRoot, 'reference-set.json')); await fs.rm(packetPath);
    await prepareSynthesis({ briefPath: path.join(testRoot, 'brief.json'), tuplePaths: [...tuplePaths].reverse(), outputDir: testRoot });
    expect(await fs.readFile(packetPath, 'utf8')).toBe(first); expect(JSON.parse(first).agentFacing).not.toHaveProperty('source'); expect(JSON.stringify(JSON.parse(first).agentFacing)).not.toMatch(/https?:\/\//);
  });
  it('enforces synthesis provenance and false-consensus invariants', async () => {
    const { packetPath, mapPath } = await setup(); const valid = await validateSynthesis({ packetPath, mapPath }); expect(valid.byType).toEqual({ convergent_pattern: 1, complementary_pattern: 1, tension_tradeoff: 1, unique_candidate: 1 });
    const map = JSON.parse(await fs.readFile(mapPath, 'utf8')) as SynthesisMap; map.units[0]!.contributions = [map.units[0]!.contributions[0]!]; await writeJson(path.join(testRoot, 'bad-map.json'), map);
    await expect(validateSynthesis({ packetPath, mapPath: path.join(testRoot, 'bad-map.json') })).rejects.toThrow(/at least two distinct references/);
    map.units[0]!.contributions[0]!.principleIds = ['dp_orphan']; await writeJson(path.join(testRoot, 'orphan-map.json'), map);
    await expect(validateSynthesis({ packetPath, mapPath: path.join(testRoot, 'orphan-map.json') })).rejects.toThrow();
    const packet = JSON.parse(await fs.readFile(packetPath, 'utf8')); packet.agentFacing.references[0].claims[0].statement = 'Tampered abstraction'; const tamperedPacketPath = path.join(testRoot, 'tampered-packet.json'); await writeJson(tamperedPacketPath, packet);
    await expect(validateSynthesis({ packetPath: tamperedPacketPath, mapPath })).rejects.toThrow(/identity does not match/);
    const warningTamper = JSON.parse(await fs.readFile(packetPath, 'utf8')); warningTamper.referenceSet.references[0].materialWarnings = ['Suppressed source warning replacement']; const warningTamperPath = path.join(testRoot, 'warning-tamper.json'); await writeJson(warningTamperPath, warningTamper);
    await expect(validateSynthesis({ packetPath: warningTamperPath, mapPath })).rejects.toThrow(/metadata mismatch/);
  });
  it('removes M2/source material from the Creative Packet and emits only a pending human gate', async () => {
    const { packetPath, mapPath, creativePath, conceptsPath, conceptReviewPath, originalityReviewPath } = await setup(); const creativeText = await fs.readFile(creativePath, 'utf8');
    expect(creativeText).not.toMatch(/https?:\/\/|\.png|(?:^|[\\/])runs[\\/]|\bev_|\brpc_|\bdp_/i);
    expect(creativeText).not.toContain('fixture-source-marker');
    const gatePath = path.join(testRoot, 'human-gate.json'); const result = await validateConcepts({ briefPath: path.join(testRoot, 'brief.json'), packetPath, mapPath, creativePacketPath: creativePath, conceptsPath, conceptReviewPath, originalityReviewPath, gatePath }); expect(result.concepts).toBe(3);
    const gate = JSON.parse(await fs.readFile(gatePath, 'utf8')); expect(gate.status).toBe('pending_human_selection'); expect(gate.reviewerWarnings).toEqual(['Fixture warning.']); expect(gate).not.toHaveProperty('selectedConceptId');
  });
  it('rejects direct provenance bypasses, missing restrictions, and source paths in concepts', async () => {
    const { packetPath, mapPath, creativePath, conceptsPath, conceptReviewPath, originalityReviewPath } = await setup(); const concepts = JSON.parse(await fs.readFile(conceptsPath, 'utf8')); const common = { briefPath: path.join(testRoot, 'brief.json'), packetPath, mapPath, creativePacketPath: creativePath, conceptReviewPath, originalityReviewPath };
    concepts.concepts[0].originalityRationale = 'Use dp_alpha from runs/source/desktop.png'; await writeJson(path.join(testRoot, 'leaky.json'), concepts);
    await expect(validateConcepts({ ...common, conceptsPath: path.join(testRoot, 'leaky.json') })).rejects.toThrow(/leaks forbidden/);
    concepts.concepts[0].originalityRationale = 'Independent expression.'; concepts.concepts[0].protectedExpressionProhibitions = []; await writeJson(path.join(testRoot, 'missing.json'), concepts);
    await expect(validateConcepts({ ...common, conceptsPath: path.join(testRoot, 'missing.json') })).rejects.toThrow();
    const creative = JSON.parse(await fs.readFile(creativePath, 'utf8')); creative.projectBrief.purpose = 'Substituted purpose'; await writeJson(path.join(testRoot, 'substituted-creative.json'), creative);
    await expect(validateConcepts({ ...common, creativePacketPath: path.join(testRoot, 'substituted-creative.json'), conceptsPath })).rejects.toThrow(/not bound/);
    creative.projectBrief.purpose = brief.purpose; creative.antiCopyRequirements = creative.antiCopyRequirements.slice(1); await writeJson(path.join(testRoot, 'weakened-creative.json'), creative);
    await expect(validateConcepts({ ...common, creativePacketPath: path.join(testRoot, 'weakened-creative.json'), conceptsPath })).rejects.toThrow(/not bound/);
    const benignChange = JSON.parse(await fs.readFile(conceptsPath, 'utf8')); benignChange.concepts[0].thesis = 'A different but otherwise valid reviewed thesis.'; await writeJson(path.join(testRoot, 'stale-review-concepts.json'), benignChange);
    await expect(validateConcepts({ ...common, conceptsPath: path.join(testRoot, 'stale-review-concepts.json') })).rejects.toThrow(/exact concept package/);
    const review = JSON.parse(await fs.readFile(conceptReviewPath, 'utf8')); review.verdict = 'fail'; await writeJson(path.join(testRoot, 'failed-review.json'), review);
    await expect(validateConcepts({ ...common, conceptReviewPath: path.join(testRoot, 'failed-review.json'), conceptsPath })).rejects.toThrow(/failed independent review/);
  });
});
