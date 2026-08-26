import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createValidator } from './schema.js';

interface Binding { id: string; path: string; sha256: string }
interface Feedback {
  feedbackId: string; projectId: string; selectedConceptId: string; action: string; automationDidNotApprove: boolean;
  previousBindings: { implementationCommit: string; humanPlaytestGate: Binding; sourceManifest: Binding; qaReport: Binding };
  dimensions: Record<string, { result: string }>;
}
interface RevisionContract {
  revisionContractId: string; projectId: string; selectedConceptId: string; revisionOf: Binding; humanFeedback: Binding;
  previousImplementation: { commit: string; sourceManifest: Binding }; objectives: Array<{ id: string }>;
  deterministicStateMachine: { initialState: string; states: string[]; transitions: Array<{ from: string; event: string; to: string }>; terminalStates: string[] };
  qaRequirements: Record<string, boolean>;
}

const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
async function readJson<T>(file: string): Promise<T> { return JSON.parse(await fs.readFile(file, 'utf8')) as T; }
async function assertBinding(binding: Binding, expectedId?: string): Promise<void> {
  if (path.isAbsolute(binding.path) || binding.path.includes('..')) throw new Error(`Unsafe binding path: ${binding.path}`);
  const data = await fs.readFile(path.resolve(binding.path));
  if (sha256(data) !== binding.sha256) throw new Error(`Stale binding hash: ${binding.path}`);
  const value = JSON.parse(data.toString('utf8')) as Record<string, unknown>;
  if (expectedId && !Object.values(value).includes(expectedId)) throw new Error(`Binding ID ${expectedId} is absent from ${binding.path}`);
}

async function validateSchema(name: string, value: unknown): Promise<void> {
  const validator = await createValidator();
  const validate = validator.getSchema(`https://agentic-website-studio.local/schemas/${name}.schema.json`);
  if (!validate || !validate(value)) throw new Error(`${name} schema validation failed: ${validator.errorsText(validate?.errors)}`);
}

export async function validateHumanPlaytestFeedback(feedbackPath: string): Promise<{ feedbackId: string; action: string; evaluated: number; notEvaluated: number }> {
  const feedback = await readJson<Feedback>(feedbackPath);
  await validateSchema('m42-human-playtest-feedback', feedback);
  await assertBinding(feedback.previousBindings.humanPlaytestGate, feedback.previousBindings.humanPlaytestGate.id);
  await assertBinding(feedback.previousBindings.sourceManifest, feedback.previousBindings.sourceManifest.id);
  await assertBinding(feedback.previousBindings.qaReport, feedback.previousBindings.qaReport.id);
  const gate = await readJson<{ selectedConceptId: string; bindings: { sourceManifestSha256: string; qaReportSha256: string } }>(path.resolve(feedback.previousBindings.humanPlaytestGate.path));
  if (gate.selectedConceptId !== feedback.selectedConceptId || gate.bindings.sourceManifestSha256 !== feedback.previousBindings.sourceManifest.sha256 || gate.bindings.qaReportSha256 !== feedback.previousBindings.qaReport.sha256) throw new Error('Feedback does not preserve the original gate bindings.');
  if (feedback.action !== 'request_revision' || !feedback.automationDidNotApprove) throw new Error('Revision is not authorized by explicit human feedback.');
  for (const name of ['narrativeTone', 'narrowScreenMobileUsability']) if (feedback.dimensions[name]?.result !== 'not_evaluated') throw new Error(`${name} must remain not_evaluated.`);
  const results = Object.values(feedback.dimensions).map((item) => item.result);
  return { feedbackId: feedback.feedbackId, action: feedback.action, evaluated: results.filter((item) => item !== 'not_evaluated').length, notEvaluated: results.filter((item) => item === 'not_evaluated').length };
}

export async function validateRevisionContract(contractPath: string, feedbackPath: string): Promise<{ revisionContractId: string; states: number; transitions: number }> {
  const contract = await readJson<RevisionContract>(contractPath);
  await validateSchema('m42r-revision-contract', contract);
  const feedback = await validateHumanPlaytestFeedback(feedbackPath);
  await assertBinding(contract.revisionOf, contract.revisionOf.id);
  await assertBinding(contract.humanFeedback, feedback.feedbackId);
  await assertBinding(contract.previousImplementation.sourceManifest, contract.previousImplementation.sourceManifest.id);
  if (contract.selectedConceptId !== 'concept_three_bearings' || contract.previousImplementation.commit !== 'f24463762500eb8031718ae8b378d44ecefe59b6') throw new Error('Revision contract changed the selected concept or failed implementation baseline.');
  if (new Set(contract.objectives.map((item) => item.id)).size !== 5 || !['O1', 'O2', 'O3', 'O4', 'O5'].every((id) => contract.objectives.some((item) => item.id === id))) throw new Error('Revision contract must preserve objectives O1–O5 exactly.');
  const machine = contract.deterministicStateMachine;
  const stateSet = new Set(machine.states);
  const transitionKeys = new Set<string>();
  for (const item of machine.transitions) {
    if (!stateSet.has(item.from) || !stateSet.has(item.to)) throw new Error('Revision transition references an unknown state.');
    const key = `${item.from}|${item.event}`;
    if (transitionKeys.has(key)) throw new Error(`Nondeterministic revision transition: ${key}`);
    transitionKeys.add(key);
  }
  const reachable = new Set([machine.initialState]);
  for (let pass = 0; pass < machine.states.length; pass += 1) for (const item of machine.transitions) if (reachable.has(item.from)) reachable.add(item.to);
  if (reachable.size !== stateSet.size) throw new Error('Revision contract contains unreachable states.');
  if (!Object.values(contract.qaRequirements).every(Boolean)) throw new Error('A required M4.2R QA dimension is disabled.');
  return { revisionContractId: contract.revisionContractId, states: machine.states.length, transitions: machine.transitions.length };
}
