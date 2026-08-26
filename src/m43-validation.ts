import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export function sha256(value: Uint8Array | string): string { return createHash('sha256').update(value).digest('hex'); }
export async function fileHash(file: string): Promise<string> { return sha256(await fs.readFile(file)); }
export async function readJson<T = Record<string, unknown>>(file: string): Promise<T> { return JSON.parse(await fs.readFile(file, 'utf8')) as T; }
export async function assertBinding(binding: { path: string; sha256: string }): Promise<void> { const actual = await fileHash(path.resolve(binding.path)); if (actual !== binding.sha256) throw new Error(`Hash mismatch for ${binding.path}: ${actual}`); }

export interface M43Decision { decisionId: string; evaluations: { decisionMotivation: { result: string }; narrativeTone: { result: string } }; overallAction: string; automationApprovedExpansion: boolean; productRequirements: { mobileSupport: string; desktopSupport: string; supportedLocales: string[] }; replaytestGate: { path: string; sha256: string } }
export interface M43Approval { approvalId: string; humanDecision: { path: string; sha256: string }; approvedImplementation: { commit: string; replaytestGate: { path: string; sha256: string }; sourceManifest: { path: string; sha256: string } } }
export interface M43Contract { contractId: string; bindings: { humanExpansionApproval: { path: string; sha256: string }; m42rSourceManifest: { path: string; sha256: string }; m42rReplaytestGate: { path: string; sha256: string } }; majorBearings: unknown[]; humanGate: { requiredStatus: string } }

export async function validateM43Provenance(): Promise<void> {
  const decision = await readJson<M43Decision>('docs/wayfinder.m42r-human-replaytest-decision.json');
  const approval = await readJson<M43Approval>('docs/wayfinder.m43-human-expansion-approval.json');
  const contract = await readJson<M43Contract>('docs/wayfinder.m43-expansion-contract.json');
  if (decision.evaluations.decisionMotivation.result !== 'partially_supported') throw new Error('Decision motivation must remain partially_supported.');
  if (decision.evaluations.narrativeTone.result !== 'not_evaluated') throw new Error('Narrative tone must remain not_evaluated.');
  if (decision.overallAction !== 'approve_for_expansion' || decision.automationApprovedExpansion !== false) throw new Error('Expansion authorization provenance is invalid.');
  if (decision.productRequirements.mobileSupport !== 'deferred' || decision.productRequirements.desktopSupport !== 'in_scope') throw new Error('Human support boundary was not preserved.');
  if (JSON.stringify(decision.productRequirements.supportedLocales) !== JSON.stringify(['zh-CN', 'en'])) throw new Error('Locale requirement was not preserved.');
  await assertBinding(decision.replaytestGate); await assertBinding(approval.humanDecision); await assertBinding(approval.approvedImplementation.replaytestGate); await assertBinding(approval.approvedImplementation.sourceManifest);
  await assertBinding(contract.bindings.humanExpansionApproval); await assertBinding(contract.bindings.m42rSourceManifest); await assertBinding(contract.bindings.m42rReplaytestGate);
  if (approval.approvedImplementation.commit !== '139d3aa335080a856cc9977bb0017913b3fa6375') throw new Error('Approval is not bound to the reviewed baseline.');
  if (contract.majorBearings.length !== 3 || contract.humanGate.requiredStatus !== 'pending_human_expansion_playtest') throw new Error('Expansion contract boundary is invalid.');
}
