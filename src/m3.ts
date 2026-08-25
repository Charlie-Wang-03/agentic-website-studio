import fs from 'node:fs/promises';
import path from 'node:path';
import { hashFile, hashText } from './artifacts.js';
import { prepareAnalysis } from './analysis.js';
import { validateAnalysis } from './analysis-validation.js';
import { createValidator } from './schema.js';
import { REPOSITORY_ROOT } from './run-validation.js';
import type { AnalysisTupleDescriptor, CreativeConceptsDocument, CreativePacket, DesignPrinciplesDocument, ProjectBrief, ReferenceProfile, ReferenceSet, SynthesisMap, SynthesisPacket } from './types.js';

interface ConceptReview { schemaVersion: '1.0.0'; reviewId: string; reviewType: 'concept_diversity_grounding' | 'originality'; projectId: string; synthesisId: string; conceptsSha256: string; verdict: 'pass' | 'pass_with_warnings' | 'fail'; findings: string[]; warnings: string[]; isLegalReview: false }

const MAX_JSON_BYTES = 2_000_000;
const SCHEMA_BASE = 'https://agentic-website-studio.local/schemas/';
function stableJson(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }
function sameJson(left: unknown, right: unknown): boolean { return stableJson(left) === stableJson(right); }
function briefSummary(brief: ProjectBrief): Omit<ProjectBrief, 'schemaVersion'> { const summary = structuredClone(brief) as Partial<ProjectBrief>; delete summary.schemaVersion; return summary as Omit<ProjectBrief, 'schemaVersion'>; }
function duplicate(values: string[]): string | undefined { const seen = new Set<string>(); return values.find((item) => seen.has(item) || !seen.add(item)); }
function relativeInside(root: string, target: string): string {
  const relative = path.relative(root, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Artifact path must be inside the repository');
  return relative.split(path.sep).join('/');
}
async function existingInside(rawPath: string): Promise<string> {
  const [root, target] = await Promise.all([fs.realpath(REPOSITORY_ROOT), fs.realpath(path.resolve(rawPath))]);
  relativeInside(root, target); return target;
}
async function outputInside(rawPath: string): Promise<string> {
  const root = await fs.realpath(REPOSITORY_ROOT); const target = path.resolve(rawPath); const parent = await fs.realpath(path.dirname(target));
  relativeInside(root, parent); return target;
}
async function readJson<T>(rawPath: string): Promise<{ path: string; value: T }> {
  const file = await existingInside(rawPath); const text = await fs.readFile(file, 'utf8');
  if (Buffer.byteLength(text, 'utf8') > MAX_JSON_BYTES) throw new Error(`JSON input exceeds 2 MB: ${file}`);
  return { path: file, value: JSON.parse(text) as T };
}
async function validateSchema(name: string, value: unknown): Promise<void> {
  const ajv = await createValidator(REPOSITORY_ROOT); const validate = ajv.getSchema(`${SCHEMA_BASE}${name}.schema.json`);
  if (!validate?.(value)) throw new Error(`${name} schema validation failed: ${JSON.stringify(validate?.errors ?? [])}`);
}
async function writeDeterministic(rawPath: string, value: unknown): Promise<string> {
  const file = await outputInside(rawPath); const output = stableJson(value);
  try { if (await fs.readFile(file, 'utf8') !== output) throw new Error(`Existing artifact differs from deterministic output: ${file}`); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; await fs.writeFile(file, output, { encoding: 'utf8', flag: 'wx' }); }
  return file;
}
function antiCopyStrings(packet: SynthesisPacket): string[] {
  const fixed = ['Use abstractions only.', 'Create independent visual expression.', 'Do not reuse source assets or prose.', 'Do not replicate exact source layouts or motion sequences.', 'Do not reconstruct source code.'];
  if (packet.agentFacing.references.length < 3) throw new Error('Creative Packet requires at least three contributing references');
  return [...fixed, 'Keep all source-specific expression from every contributing reference reference-only.'];
}
function buildCreativePacket(brief: ProjectBrief, synthesisPacket: SynthesisPacket, map: SynthesisMap): CreativePacket {
  const genericUnitAntiCopy = ['Use abstractions only.', 'Create independent expression.', 'Exclude source assets, prose, code, exact layouts, and exact motion sequences.'];
  const synthesisUnits = map.units.map((unit) => {
    const copy = structuredClone(unit) as Partial<typeof unit>; const opaqueReferenceIds = unit.contributions.map(({ referenceId }) => referenceId);
    delete copy.contributions; delete copy.contradictoryPrincipleIds; delete copy.contradictoryProfileClaimIds;
    copy.sourceSpecificExpressionExcluded = ['All source-specific expression from contributing opaque references remains excluded.']; copy.inheritedAntiCopyConstraints = genericUnitAntiCopy;
    return { ...copy, opaqueReferenceIds } as CreativePacket['synthesisUnits'][number];
  });
  const seed = { brief, synthesisPacketId: synthesisPacket.packetId, map };
  return { schemaVersion: '1.0.0', creativePacketId: `cp_${hashText(stableJson(seed)).slice(0, 20)}`, projectBrief: brief, synthesisId: map.synthesisId, synthesisUnits, rightsMode: brief.creativeRightsMode, protectedExpressionProhibitions: brief.prohibitedExpressions, antiCopyRequirements: antiCopyStrings(synthesisPacket), designTensions: [...new Set(map.units.flatMap(({ tensionsCreated }) => tensionsCreated))], technicalConstraints: brief.engineeringConstraints, influenceLedger: map.units.map((unit) => ({ synthesisUnitId: unit.id, opaqueReferenceIds: unit.contributions.map(({ referenceId }) => referenceId) })), policy: { originalityFirewall: true, sourceNamesExcluded: true, sourceUrlsExcluded: true, screenshotsExcluded: true, rawEvidenceExcluded: true, sourceProseExcluded: true, exactSourceMotionExcluded: true, enforcement: 'protocol' } };
}
function containsForbiddenLeak(value: unknown): string | undefined {
  const text = JSON.stringify(value);
  const patterns: Array<[RegExp, string]> = [[/https?:\/\//i, 'source URL'], [/(?:^|[\\/])runs[\\/]/i, 'run artifact path'], [/\.(?:png|jpe?g|webp|gif)(?:"|\?|$)/i, 'screenshot or image path'], [/\bev_[a-z0-9_-]+\b/i, 'raw evidence ID'], [/\brpc_[a-z0-9_-]+\b/i, 'Reference Profile claim ID'], [/\bdp_[a-z0-9_-]+\b/i, 'Design Principle ID']];
  return patterns.find(([pattern]) => pattern.test(text))?.[1];
}

export async function prepareSynthesis(options: { briefPath: string; tuplePaths: string[]; outputDir: string }): Promise<{ referenceSetPath: string; packetPath: string; packet: SynthesisPacket }> {
  if (options.tuplePaths.length < 3) throw new Error('At least three reference tuples are required');
  const { value: brief } = await readJson<ProjectBrief>(options.briefPath); await validateSchema('project-brief', brief);
  const loaded = [];
  for (const tuplePath of options.tuplePaths) {
    const { value: tuple } = await readJson<AnalysisTupleDescriptor>(tuplePath);
    const runDir = await existingInside(tuple.runDir); const packetFile = await existingInside(tuple.analysisPacketPath); const profileFile = await existingInside(tuple.profilePath); const principlesFile = await existingInside(tuple.principlesPath);
    relativeInside(runDir, packetFile); relativeInside(runDir, profileFile); relativeInside(runDir, principlesFile);
    const prepared = await prepareAnalysis(runDir); if (prepared.packetPath !== packetFile) throw new Error('Analysis Packet path does not match the validated run');
    await validateAnalysis({ runDir, profilePath: profileFile, principlesPath: principlesFile });
    const [{ value: profile }, { value: principles }] = await Promise.all([readJson<ReferenceProfile>(profileFile), readJson<DesignPrinciplesDocument>(principlesFile)]);
    loaded.push({ tuple: { runDir: relativeInside(REPOSITORY_ROOT, runDir), analysisPacketPath: relativeInside(REPOSITORY_ROOT, packetFile), profilePath: relativeInside(REPOSITORY_ROOT, profileFile), principlesPath: relativeInside(REPOSITORY_ROOT, principlesFile), analysisPacketSha256: await hashFile(packetFile), profileSha256: await hashFile(profileFile), principlesSha256: await hashFile(principlesFile) }, profile, principles, warnings: prepared.packet.warnings });
  }
  loaded.sort((left, right) => left.profile.referenceId.localeCompare(right.profile.referenceId));
  const duplicateReference = duplicate(loaded.map(({ profile }) => profile.referenceId)); if (duplicateReference) throw new Error(`Duplicate reference ID: ${duplicateReference}`);
  const duplicateRun = duplicate(loaded.map(({ profile }) => profile.runId)); if (duplicateRun) throw new Error(`Duplicate run ID: ${duplicateRun}`);
  const referenceSet: ReferenceSet = { schemaVersion: '1.0.0', projectId: brief.projectId, minimumReferenceCount: 3, references: loaded.map(({ tuple, profile, warnings }) => ({ referenceId: profile.referenceId, runId: profile.runId, analysisTuple: tuple, validation: 'pass', rightsStatus: profile.rightsStatus, rightsBasis: profile.rightsBasis, rightsNotes: profile.sourceRightsNotes, materialWarnings: warnings, limitations: [...new Set([...profile.insufficientEvidence, ...profile.claims.flatMap((claim) => claim.limitations)])] })) };
  await validateSchema('reference-set', referenceSet);
  const agentReferences = loaded.map(({ profile, principles }) => ({ opaqueReferenceId: profile.referenceId, claims: profile.claims, principles: principles.principles, confidenceLimitations: [...new Set([...profile.insufficientEvidence, ...profile.claims.flatMap((claim) => claim.limitations)])], rights: { status: profile.rightsStatus, basis: profile.rightsBasis, notes: profile.sourceRightsNotes }, contributionBoundary: 'Abstract mechanisms only; source-specific expression remains excluded.', antiCopyConstraints: principles.principles.map(({ antiCopy }) => antiCopy) }));
  const packetSeed = stableJson({ projectId: brief.projectId, projectBriefSummary: briefSummary(brief), references: agentReferences });
  const packet: SynthesisPacket = { schemaVersion: '1.0.0', packetId: `sp_${hashText(packetSeed).slice(0, 20)}`, projectId: brief.projectId, referenceSet, agentFacing: { projectBriefSummary: briefSummary(brief), references: agentReferences, policy: { referenceEvidenceFirewall: true, sourceNeutralReasoning: true, antiFrankenstein: true, rightsAreNotReusePermission: true, enforcement: 'protocol' } } };
  await validateSchema('synthesis-packet', packet);
  if (/https?:\/\//i.test(JSON.stringify(packet.agentFacing))) throw new Error('Synthesis agent-facing projection leaks a source URL');
  const outputDir = await existingInside(options.outputDir);
  return { referenceSetPath: await writeDeterministic(path.join(outputDir, 'reference-set.json'), referenceSet), packetPath: await writeDeterministic(path.join(outputDir, 'synthesis-packet.json'), packet), packet };
}

export async function validateSynthesis(options: { packetPath: string; mapPath: string }): Promise<{ units: number; byType: Record<string, number> }> {
  const [{ value: packet }, { value: map }] = await Promise.all([readJson<SynthesisPacket>(options.packetPath), readJson<SynthesisMap>(options.mapPath)]);
  await validateSchema('synthesis-packet', packet); await validateSchema('synthesis-map', map);
  if (packet.referenceSet.projectId !== packet.projectId || packet.agentFacing.projectBriefSummary.projectId !== packet.projectId) throw new Error('Synthesis Packet project identities are inconsistent');
  const expectedPacketId = `sp_${hashText(stableJson({ projectId: packet.projectId, projectBriefSummary: packet.agentFacing.projectBriefSummary, references: packet.agentFacing.references })).slice(0, 20)}`;
  if (packet.packetId !== expectedPacketId) throw new Error('Synthesis Packet identity does not match its agent-facing content');
  const agentReferences = new Map(packet.agentFacing.references.map((item) => [item.opaqueReferenceId, item]));
  if (agentReferences.size !== packet.agentFacing.references.length || agentReferences.size !== packet.referenceSet.references.length) throw new Error('Synthesis Packet reference identities are duplicated or incomplete');
  for (const entry of packet.referenceSet.references) {
    const tuple = entry.analysisTuple; const runDir = await existingInside(path.resolve(REPOSITORY_ROOT, tuple.runDir)); const packetFile = await existingInside(path.resolve(REPOSITORY_ROOT, tuple.analysisPacketPath)); const profileFile = await existingInside(path.resolve(REPOSITORY_ROOT, tuple.profilePath)); const principlesFile = await existingInside(path.resolve(REPOSITORY_ROOT, tuple.principlesPath));
    relativeInside(runDir, packetFile); relativeInside(runDir, profileFile); relativeInside(runDir, principlesFile);
    if (await hashFile(packetFile) !== tuple.analysisPacketSha256 || await hashFile(profileFile) !== tuple.profileSha256 || await hashFile(principlesFile) !== tuple.principlesSha256) throw new Error(`Reference Set artifact hash mismatch: ${entry.referenceId}`);
    const prepared = await prepareAnalysis(runDir); if (prepared.packetPath !== packetFile) throw new Error(`Reference Set Analysis Packet mismatch: ${entry.referenceId}`);
    await validateAnalysis({ runDir, profilePath: profileFile, principlesPath: principlesFile });
    const [{ value: profile }, { value: principles }] = await Promise.all([readJson<ReferenceProfile>(profileFile), readJson<DesignPrinciplesDocument>(principlesFile)]);
    const expectedLimitations = [...new Set([...profile.insufficientEvidence, ...profile.claims.flatMap((claim) => claim.limitations)])];
    if (profile.referenceId !== entry.referenceId || profile.runId !== entry.runId || profile.rightsStatus !== entry.rightsStatus || profile.rightsBasis !== entry.rightsBasis || !sameJson(profile.sourceRightsNotes, entry.rightsNotes) || !sameJson(prepared.packet.warnings, entry.materialWarnings) || !sameJson(expectedLimitations, entry.limitations)) throw new Error(`Reference Set metadata mismatch: ${entry.referenceId}`);
    const agent = agentReferences.get(entry.referenceId); if (!agent || !sameJson(agent.claims, profile.claims) || !sameJson(agent.principles, principles.principles) || !sameJson(agent.rights, { status: profile.rightsStatus, basis: profile.rightsBasis, notes: profile.sourceRightsNotes }) || !sameJson(agent.antiCopyConstraints, principles.principles.map(({ antiCopy }) => antiCopy)) || !sameJson(agent.confidenceLimitations, expectedLimitations) || agent.contributionBoundary !== 'Abstract mechanisms only; source-specific expression remains excluded.') throw new Error(`Synthesis Packet abstraction mismatch: ${entry.referenceId}`);
  }
  if (map.projectId !== packet.projectId || map.sourcePacketId !== packet.packetId) throw new Error('Synthesis Map identity does not match its packet');
  const duplicated = duplicate(map.units.map(({ id }) => id)); if (duplicated) throw new Error(`Duplicate synthesis unit ID: ${duplicated}`);
  const references = agentReferences; const allPrinciples = new Set(packet.agentFacing.references.flatMap(({ principles }) => principles.map(({ id }) => id))); const allClaims = new Set(packet.agentFacing.references.flatMap(({ claims }) => claims.map(({ id }) => id)));
  for (const unit of map.units) {
    const ids = unit.contributions.map(({ referenceId }) => referenceId); if (duplicate(ids)) throw new Error(`Synthesis unit ${unit.id} repeats a reference contribution`);
    if (['convergent_pattern', 'complementary_pattern'].includes(unit.type) && new Set(ids).size < 2) throw new Error(`${unit.type} ${unit.id} requires at least two distinct references`);
    if (unit.type === 'unique_candidate' && (new Set(ids).size !== 1 || unit.consensusClaimed)) throw new Error(`unique_candidate ${unit.id} cannot claim consensus and must cite one reference`);
    if (unit.type !== 'convergent_pattern' && unit.consensusClaimed) throw new Error(`Only convergent patterns may claim consensus: ${unit.id}`);
    for (const contribution of unit.contributions) {
      const reference = references.get(contribution.referenceId); if (!reference) throw new Error(`Unknown reference contribution: ${contribution.referenceId}`);
      const principleIds = new Set(reference.principles.map(({ id }) => id)); const claimIds = new Set(reference.claims.map(({ id }) => id));
      for (const id of contribution.principleIds) if (!principleIds.has(id)) throw new Error(`Orphan principle ID: ${id}`);
      for (const id of contribution.profileClaimIds) if (!claimIds.has(id)) throw new Error(`Orphan profile claim ID: ${id}`);
    }
    for (const id of unit.contradictoryPrincipleIds) if (!allPrinciples.has(id)) throw new Error(`Orphan contradictory principle ID: ${id}`);
    for (const id of unit.contradictoryProfileClaimIds) if (!allClaims.has(id)) throw new Error(`Orphan contradictory profile claim ID: ${id}`);
  }
  const byType: Record<string, number> = {}; for (const unit of map.units) byType[unit.type] = (byType[unit.type] ?? 0) + 1;
  return { units: map.units.length, byType };
}

export async function prepareCreative(options: { briefPath: string; packetPath: string; mapPath: string; outputPath: string }): Promise<{ outputPath: string; packet: CreativePacket }> {
  const [{ value: brief }, { value: synthesisPacket }, { value: map }] = await Promise.all([readJson<ProjectBrief>(options.briefPath), readJson<SynthesisPacket>(options.packetPath), readJson<SynthesisMap>(options.mapPath)]);
  await validateSchema('project-brief', brief); await validateSynthesis({ packetPath: options.packetPath, mapPath: options.mapPath });
  if (brief.projectId !== map.projectId) throw new Error('Project Brief identity does not match Synthesis Map');
  if (!sameJson(briefSummary(brief), synthesisPacket.agentFacing.projectBriefSummary)) throw new Error('Project Brief differs from the brief bound into the Synthesis Packet');
  const packet = buildCreativePacket(brief, synthesisPacket, map);
  await validateSchema('creative-packet', packet); const leak = containsForbiddenLeak(packet); if (leak) throw new Error(`Creative Packet leaks forbidden ${leak}`);
  return { outputPath: await writeDeterministic(options.outputPath, packet), packet };
}

export async function validateConcepts(options: { briefPath: string; packetPath: string; mapPath: string; creativePacketPath: string; conceptsPath: string; conceptReviewPath: string; originalityReviewPath: string; gatePath?: string }): Promise<{ concepts: number; gatePath?: string }> {
  const [briefInput, synthesisInput, mapInput, creativeInput, conceptsInput, conceptReviewInput, originalityReviewInput] = await Promise.all([readJson<ProjectBrief>(options.briefPath), readJson<SynthesisPacket>(options.packetPath), readJson<SynthesisMap>(options.mapPath), readJson<CreativePacket>(options.creativePacketPath), readJson<CreativeConceptsDocument>(options.conceptsPath), readJson<ConceptReview>(options.conceptReviewPath), readJson<ConceptReview>(options.originalityReviewPath)]);
  const brief = briefInput.value; const synthesisPacket = synthesisInput.value; const map = mapInput.value; const creative = creativeInput.value; const concepts = conceptsInput.value; const conceptReview = conceptReviewInput.value; const originalityReview = originalityReviewInput.value;
  await validateSchema('project-brief', brief); await validateSchema('synthesis-map', map); await validateSynthesis({ packetPath: options.packetPath, mapPath: options.mapPath }); await validateSchema('creative-packet', creative); await validateSchema('creative-concepts', concepts); await validateSchema('concept-review', conceptReview); await validateSchema('concept-review', originalityReview);
  if (concepts.projectId !== brief.projectId || concepts.synthesisId !== map.synthesisId || concepts.rightsMode !== brief.creativeRightsMode) throw new Error('Concept identities or rights mode do not match their inputs');
  if (!sameJson(creative, buildCreativePacket(brief, synthesisPacket, map))) throw new Error('Creative Packet is not bound to the supplied Brief, Synthesis Packet, and Synthesis Map');
  const conceptsSha256 = await hashFile(conceptsInput.path);
  if (concepts.concepts.length !== 3) throw new Error('M3 requires exactly three Creative Concepts');
  const ids = concepts.concepts.map(({ id }) => id); if (duplicate(ids)) throw new Error('Creative Concept IDs must be unique');
  const knownUnits = new Set(map.units.map(({ id }) => id));
  for (const concept of concepts.concepts) {
    const selected = new Set(concept.selectedSynthesisUnitIds); const rejected = new Set(concept.rejectedSynthesisUnitIds);
    for (const id of [...selected, ...rejected]) if (!knownUnits.has(id)) throw new Error(`Concept ${concept.id} references unknown Synthesis Unit: ${id}`);
    for (const id of selected) if (rejected.has(id)) throw new Error(`Concept ${concept.id} both selects and rejects ${id}`);
    for (const prohibition of brief.prohibitedExpressions) if (!concept.protectedExpressionProhibitions.includes(prohibition)) throw new Error(`Concept ${concept.id} omits required protected-expression prohibition`);
    for (const requirement of creative.antiCopyRequirements) if (!concept.protectedExpressionProhibitions.includes(requirement)) throw new Error(`Concept ${concept.id} omits inherited anti-copy requirement`);
    const summarized = concept.sourceInfluenceSummary.map(({ synthesisUnitId }) => synthesisUnitId); if (duplicate(summarized) || !sameJson([...summarized].sort(), [...selected].sort())) throw new Error(`Concept ${concept.id} influence summary must exactly cover selected Synthesis Units`);
  }
  const leak = containsForbiddenLeak(concepts); if (leak) throw new Error(`Concept artifact leaks forbidden ${leak}`);
  for (const review of [conceptReview, originalityReview]) if (review.projectId !== brief.projectId || review.synthesisId !== map.synthesisId || review.conceptsSha256 !== conceptsSha256) throw new Error('Independent review identity does not match the exact concept package');
  if (conceptReview.reviewType !== 'concept_diversity_grounding' || originalityReview.reviewType !== 'originality') throw new Error('Both required independent review types must be supplied');
  if (conceptReview.verdict === 'fail' || originalityReview.verdict === 'fail') throw new Error('A failed independent review blocks the Human Creative Gate');
  let gatePath: string | undefined;
  if (options.gatePath) {
    const gate = { schemaVersion: '1.0.0', projectId: brief.projectId, synthesisId: map.synthesisId, status: 'pending_human_selection', concepts: concepts.concepts.map((concept) => ({ conceptId: concept.id, name: concept.name, summary: concept.thesis, keyTradeoffs: concept.unresolvedTensions, riskComplexityNotes: concept.complexityRisk })), reviewerWarnings: conceptReview.warnings, originalityWarnings: originalityReview.warnings, unresolvedQuestions: [...new Set(concepts.concepts.flatMap(({ majorUnknowns }) => majorUnknowns))], availableActions: ['select_concept', 'request_concept_revision', 'reject_all_and_resynthesize'] };
    await validateSchema('human-creative-gate', gate); gatePath = await writeDeterministic(options.gatePath, gate);
  }
  return { concepts: concepts.concepts.length, ...(gatePath ? { gatePath } : {}) };
}
