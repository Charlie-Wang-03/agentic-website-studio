import fs from 'node:fs/promises';
import path from 'node:path';
import { hashFile } from './artifacts.js';
import { createValidator } from './schema.js';
import { REPOSITORY_ROOT } from './run-validation.js';
import type { CreativeConceptsDocument, HumanConceptDecision, ImplementationContract } from './types.js';

interface HumanGate {
  schemaVersion: '1.0.0'; projectId: string; synthesisId: string; status: 'pending_human_selection';
  concepts: Array<{ conceptId: string }>;
  reviewerWarnings: string[]; originalityWarnings: string[]; unresolvedQuestions: string[];
}
interface ConceptReview {
  schemaVersion: '1.0.0'; reviewType: 'concept_diversity_grounding' | 'originality'; projectId: string;
  synthesisId: string; conceptsSha256: string; verdict: 'pass' | 'pass_with_warnings' | 'fail'; warnings: string[];
}

const MAX_JSON_BYTES = 2_000_000;
const SCHEMA_BASE = 'https://agentic-website-studio.local/schemas/';

function sameJson(left: unknown, right: unknown): boolean { return JSON.stringify(left) === JSON.stringify(right); }
function duplicate(values: string[]): string | undefined { const seen = new Set<string>(); return values.find((value) => seen.has(value) || !seen.add(value)); }
function relativeInside(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Artifact path must be inside the repository');
}
async function readJson<T>(rawPath: string): Promise<{ path: string; value: T }> {
  const [root, file] = await Promise.all([fs.realpath(REPOSITORY_ROOT), fs.realpath(path.resolve(rawPath))]); relativeInside(root, file);
  const text = await fs.readFile(file, 'utf8'); if (Buffer.byteLength(text, 'utf8') > MAX_JSON_BYTES) throw new Error(`JSON input exceeds 2 MB: ${file}`);
  return { path: file, value: JSON.parse(text) as T };
}
async function validateSchema(name: string, value: unknown): Promise<void> {
  const ajv = await createValidator(REPOSITORY_ROOT); const validate = ajv.getSchema(`${SCHEMA_BASE}${name}.schema.json`);
  if (!validate?.(value)) throw new Error(`${name} schema validation failed: ${JSON.stringify(validate?.errors ?? [])}`);
}
function ensureSourceNeutral(value: unknown): void {
  const text = JSON.stringify(value);
  const patterns: Array<[RegExp, string]> = [
    [/https?:\/\//i, 'URL'], [/(?:^|[\\/])runs[\\/]/i, 'run path'], [/\.(?:png|jpe?g|webp|gif|svg)(?:"|\?|$)/i, 'source image or asset path'],
    [/\b(?:ref|rpc|dp|ev)_[a-z0-9_-]+\b/i, 'source-specific identifier'], [/\b(?:requestedUrl|finalUrl|sanitizedUrl|sourceReference)\b/i, 'source metadata field']
  ];
  const leak = patterns.find(([pattern]) => pattern.test(text)); if (leak) throw new Error(`M4 artifact leaks forbidden ${leak[1]}`);
}
function validateStateMachine(contract: ImplementationContract): void {
  const machine = contract.engineeringScope.deterministicStateMachine; const states = new Set(machine.states);
  if (duplicate(machine.states)) throw new Error('State machine states must be unique');
  if (!states.has(machine.initialState)) throw new Error('State machine initial state is not declared');
  for (const terminal of machine.terminalStates) if (!states.has(terminal)) throw new Error(`Unknown terminal state: ${terminal}`);
  const transitionKeys = new Set<string>(); const adjacency = new Map<string, string[]>();
  for (const transition of machine.transitions) {
    if (!states.has(transition.from) || !states.has(transition.to)) throw new Error('State machine transition references an unknown state');
    const key = `${transition.from}\0${transition.event}`; if (transitionKeys.has(key)) throw new Error(`State machine is nondeterministic for ${transition.from} + ${transition.event}`); transitionKeys.add(key);
    adjacency.set(transition.from, [...(adjacency.get(transition.from) ?? []), transition.to]);
  }
  for (const terminal of machine.terminalStates) if (adjacency.has(terminal)) throw new Error(`Terminal state has outgoing transitions: ${terminal}`);
  const reachable = new Set([machine.initialState]); const pending = [machine.initialState];
  while (pending.length) for (const target of adjacency.get(pending.shift()!) ?? []) if (!reachable.has(target)) { reachable.add(target); pending.push(target); }
  for (const state of states) if (!reachable.has(state)) throw new Error(`State machine contains unreachable state: ${state}`);
  if (!machine.terminalStates.some((state) => reachable.has(state))) throw new Error('State machine has no reachable ending');
}

export async function validateHumanDecision(options: { decisionPath: string; conceptsPath: string; gatePath: string; conceptReviewPath: string; originalityReviewPath: string }): Promise<{ selectedConceptId: string; conceptsSha256: string }> {
  const [decisionInput, conceptsInput, gateInput, conceptReviewInput, originalityReviewInput] = await Promise.all([
    readJson<HumanConceptDecision>(options.decisionPath), readJson<CreativeConceptsDocument>(options.conceptsPath), readJson<HumanGate>(options.gatePath),
    readJson<ConceptReview>(options.conceptReviewPath), readJson<ConceptReview>(options.originalityReviewPath)
  ]);
  const decision = decisionInput.value; const concepts = conceptsInput.value; const gate = gateInput.value; const conceptReview = conceptReviewInput.value; const originalityReview = originalityReviewInput.value;
  await validateSchema('human-concept-decision', decision); ensureSourceNeutral(decision); await validateSchema('creative-concepts', concepts); await validateSchema('human-creative-gate', gate);
  await validateSchema('concept-review', conceptReview); await validateSchema('concept-review', originalityReview);
  const conceptsSha256 = await hashFile(conceptsInput.path);
  if (gate.status !== 'pending_human_selection') throw new Error('Human decision must follow a pending M3 gate');
  if (decision.projectId !== concepts.projectId || decision.projectId !== gate.projectId || decision.synthesisId !== concepts.synthesisId || decision.synthesisId !== gate.synthesisId) throw new Error('Human decision identity does not match M3');
  if (decision.conceptsSha256 !== conceptsSha256 || conceptReview.conceptsSha256 !== conceptsSha256 || originalityReview.conceptsSha256 !== conceptsSha256) throw new Error('Human decision or review does not bind the exact concepts artifact');
  if (conceptReview.projectId !== decision.projectId || originalityReview.projectId !== decision.projectId || conceptReview.synthesisId !== decision.synthesisId || originalityReview.synthesisId !== decision.synthesisId) throw new Error('Human decision review identity does not match M3');
  if (conceptReview.reviewType !== 'concept_diversity_grounding' || originalityReview.reviewType !== 'originality' || conceptReview.verdict === 'fail' || originalityReview.verdict === 'fail') throw new Error('Human decision requires both non-failing M3 reviews');
  if (!concepts.concepts.some(({ id }) => id === decision.selectedConceptId)) throw new Error('Selected concept does not exist in the bound concepts artifact');
  if (!gate.concepts.some(({ conceptId }) => conceptId === decision.selectedConceptId)) throw new Error('Selected concept does not exist in the Human Creative Gate');
  if (!sameJson(gate.reviewerWarnings, conceptReview.warnings) || !sameJson(gate.originalityWarnings, originalityReview.warnings)) throw new Error('Human Creative Gate warnings do not match the bound M3 reviews');
  if (!sameJson(decision.reviewerWarnings, gate.reviewerWarnings) || !sameJson(decision.originalityWarnings, gate.originalityWarnings) || !sameJson(decision.unresolvedQuestions, gate.unresolvedQuestions)) throw new Error('Human decision does not inherit the exact M3 warnings and unresolved questions');
  return { selectedConceptId: decision.selectedConceptId, conceptsSha256 };
}

export async function validateImplementationContract(options: { contractPath: string; decisionPath: string; conceptsPath: string; gatePath: string; conceptReviewPath: string; originalityReviewPath: string }): Promise<{ contractId: string; selectedConceptId: string; states: number }> {
  const binding = await validateHumanDecision(options);
  const [contractInput, decisionInput, conceptsInput] = await Promise.all([readJson<ImplementationContract>(options.contractPath), readJson<HumanConceptDecision>(options.decisionPath), readJson<CreativeConceptsDocument>(options.conceptsPath)]);
  const contract = contractInput.value; const decision = decisionInput.value; const concepts = conceptsInput.value;
  await validateSchema('implementation-contract', contract); ensureSourceNeutral(contract);
  const selected = concepts.concepts.find(({ id }) => id === decision.selectedConceptId); if (!selected) throw new Error('Selected concept is unavailable');
  if (contract.projectId !== decision.projectId || contract.selectedConceptId !== binding.selectedConceptId || contract.sourceSynthesis.synthesisId !== decision.synthesisId || contract.sourceSynthesis.conceptsSha256 !== binding.conceptsSha256) throw new Error('Implementation Contract identity does not match the human decision');
  if (contract.humanDecision.decisionId !== decision.decisionId || contract.humanDecision.decisionSha256 !== await hashFile(decisionInput.path)) throw new Error('Implementation Contract does not bind the exact Human Decision artifact');
  if (!sameJson(contract.originalityConstraints.inheritedProtectedExpressionProhibitions, selected.protectedExpressionProhibitions)) throw new Error('Implementation Contract does not inherit the selected concept originality constraints exactly');
  const knownWarnings = new Set([...decision.reviewerWarnings, ...decision.originalityWarnings]);
  for (const warning of contract.inheritedReviewerWarnings) if (!knownWarnings.has(warning)) throw new Error('Implementation Contract introduces an unbound reviewer warning');
  for (const question of contract.inheritedUnresolvedQuestions) if (!decision.unresolvedQuestions.includes(question)) throw new Error('Implementation Contract introduces an unbound unresolved question');
  validateStateMachine(contract);
  return { contractId: contract.contractId, selectedConceptId: contract.selectedConceptId, states: contract.engineeringScope.deterministicStateMachine.states.length };
}
