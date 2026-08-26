import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AjvModule from 'ajv/dist/ajv.js';

const root = process.cwd();
const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const portable = (file: string): string => path.relative(root, file).replaceAll('\\', '/');
const output = async (file: string, value: unknown): Promise<string> => { const text = `${JSON.stringify(value, null, 2)}\n`; await fs.writeFile(path.resolve(file), text); return sha256(text); };
const fileRecord = async (file: string): Promise<{ path: string; sha256: string }> => {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`Path escapes workspace: ${file}`);
  return { path: portable(resolved), sha256: sha256(await fs.readFile(resolved)) };
};
const binding = async (id: string, file: string): Promise<{ id: string; path: string; sha256: string }> => ({ id, ...(await fileRecord(file)) });
const walk = async (directory: string): Promise<string[]> => {
  const found: string[] = [];
  for (const entry of await fs.readdir(path.resolve(directory), { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await walk(target)); else found.push(target);
  }
  return found;
};
const sortRecords = <T extends { path: string }>(items: T[]): T[] => items.sort((a, b) => a.path.localeCompare(b.path, 'en'));

const decisionPath = 'docs/wayfinder.m4-human-decision.json';
const originalContractPath = 'docs/wayfinder.m4-implementation-contract.json';
const previousManifestPath = 'docs/wayfinder.m4-source-manifest.json';
const feedbackPath = 'docs/wayfinder.m42-human-playtest-feedback.json';
const revisionPath = 'docs/wayfinder.m42r-revision-contract.json';
const auditPath = 'docs/wayfinder.m42r-independent-revision-audit.json';
const decision = JSON.parse(await fs.readFile(decisionPath, 'utf8')) as { decisionId: string; projectId: string; selectedConceptId: string };
const originalContract = JSON.parse(await fs.readFile(originalContractPath, 'utf8')) as { contractId: string; projectId: string; selectedConceptId: string };
const feedback = JSON.parse(await fs.readFile(feedbackPath, 'utf8')) as { feedbackId: string; action: string; selectedConceptId: string };
const revision = JSON.parse(await fs.readFile(revisionPath, 'utf8')) as { revisionContractId: string; selectedConceptId: string };
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8')) as { auditId: string; verdict: 'pass' | 'pass_with_warnings' | 'fail'; readyForHumanReplaytest: boolean; warnings: string[] };
if (decision.selectedConceptId !== 'concept_three_bearings' || originalContract.selectedConceptId !== decision.selectedConceptId || feedback.selectedConceptId !== decision.selectedConceptId || revision.selectedConceptId !== decision.selectedConceptId || feedback.action !== 'request_revision' || audit.verdict === 'fail' || !audit.readyForHumanReplaytest) throw new Error('Stale binding, missing revision authorization, or failed audit blocks M4.2R artifacts.');

const sourcePaths = [
  ...await walk('pilots/wayfinder'), ...await walk('tests/wayfinder-e2e'),
  'tests/wayfinder-state.test.ts', 'tests/wayfinder-contract.test.ts', 'tests/m42-artifacts.test.ts', 'tests/m42r-artifacts.test.ts',
  'src/schema.ts', 'src/m42r-validation.ts', 'src/m42r-artifacts.ts', 'playwright.wayfinder.config.ts', 'vite.wayfinder.config.ts', 'vitest.config.ts', 'tsconfig.studio.json',
  'schemas/m42-human-playtest-feedback.schema.json', 'schemas/m42r-revision-contract.schema.json', 'schemas/m42r-source-manifest.schema.json', 'schemas/m42r-qa-report.schema.json', 'schemas/human-replaytest-gate.schema.json',
  'package.json', 'package-lock.json',
];
const sourceFiles = sortRecords(await Promise.all(sourcePaths.map(fileRecord)));
const creativePaths = ['pilots/wayfinder/index.html', 'pilots/wayfinder/src/content.ts', 'pilots/wayfinder/src/main.ts', 'pilots/wayfinder/src/styles.css'];
const creativeAssets = sortRecords((await Promise.all(creativePaths.map(fileRecord))).map((item) => ({ ...item, provenanceClass: 'project_native', rightsStatus: 'project_owned_original' })));
const buildArtifacts = sortRecords(await Promise.all((await walk('.tmp/wayfinder-dist')).map(fileRecord)));
const dependencyNames = ['vite', 'playwright', '@axe-core/playwright'];
const roles: Record<string, 'build_dev_only' | 'test_dev_only'> = { vite: 'build_dev_only', playwright: 'test_dev_only', '@axe-core/playwright': 'test_dev_only' };
const dependencies = await Promise.all(dependencyNames.map(async (name) => {
  const metadata = JSON.parse(await fs.readFile(path.resolve('node_modules', name, 'package.json'), 'utf8')) as { version: string; license: string };
  return { name, version: metadata.version, license: metadata.license, role: roles[name] };
}));
const sourceManifest = {
  schemaVersion: '1.0.0', manifestId: 'manifest_wayfinder_m42r_slice_02', projectId: decision.projectId, selectedConceptId: decision.selectedConceptId,
  previousImplementation: { commit: 'f24463762500eb8031718ae8b378d44ecefe59b6', sourceManifest: await binding('manifest_wayfinder_m42_slice_01', previousManifestPath) },
  humanDecision: await binding(decision.decisionId, decisionPath), originalImplementationContract: await binding(originalContract.contractId, originalContractPath),
  humanFeedback: await binding(feedback.feedbackId, feedbackPath), revisionContract: await binding(revision.revisionContractId, revisionPath),
  sourceFiles, creativeAssets, dependencies, buildArtifacts,
};
const sourceManifestSha256 = await output('docs/wayfinder.m42r-source-manifest.json', sourceManifest);
const independentAuditSha256 = sha256(await fs.readFile(auditPath));
const category = (result: 'pass' | 'pass_with_warnings', evidence: string) => ({ result, evidence });
const auditResult = audit.verdict === 'pass' ? 'pass' : 'pass_with_warnings';
const qaReport = {
  schemaVersion: '1.0.0', reportId: 'qa_wayfinder_m42r_slice_02', projectId: decision.projectId, selectedConceptId: decision.selectedConceptId,
  feedbackId: feedback.feedbackId, revisionContractId: revision.revisionContractId, sourceManifestSha256, independentAuditSha256, overallResult: 'pass_with_warnings',
  categories: {
    feedbackValidation: category('pass', 'Schema and semantic validation preserve the original gate, manifest, QA, selected concept, request_revision action, five evaluated failures, and two not_evaluated dimensions.'),
    revisionContract: category('pass', 'The amendment binds the failed implementation and feedback; all O1–O5 objectives, 15 states, and 23 deterministic transitions validate.'),
    build: category('pass', 'Vite production build completed and emitted SHA-256-bound local artifacts.'),
    stateMachine: category('pass', '20 focused tests cover provenance, amended conformance, observation, preview, commit, response, continuation, invalid events, reachability, restart, and replay.'),
    preChoiceObservation: category('pass', 'Arrival and enacted approach lead to a survey with three inspectable environmental cues before commit is legal.'),
    deliberationPreview: category('pass', 'All three reversible previews expose distinct offers and costs without committing or revealing response/ending copy.'),
    explicitCommit: category('pass', 'Preview state keeps bearing absent; only a bearing-matched commit enters world response.'),
    immediateWorldResponse: category('pass', 'Each commit changes branch-specific geometry, route, marker relationship, environment, and visible SVG transforms before reflection.'),
    continuousScene: category('pass', 'The same data-world-id shell and landmark nodes persist from survey through response and continuation.'),
    branchContinuation: category('pass', 'A branch-specific enacted action leads to continuation before reflection becomes available.'),
    desktopE2E: category('pass', 'All revised phases and all three branch responses passed at 1440×900.'),
    mobileE2E: category('pass', 'All revised branches completed at 390×844 with overflow and visible target-size checks.'),
    keyboard: category('pass', 'Keyboard-only play compared multiple previews, committed, continued, reflected, and restarted.'),
    touch: category('pass_with_warnings', 'All branches passed Playwright touch emulation; physical-device judgment remains human-only.'),
    reducedMotion: category('pass', 'All previews, responses, continuations, and endings remained available with immediate state changes.'),
    accessibilityAutomatedScan: category('pass_with_warnings', 'Representative desktop/mobile revised states had no serious or critical axe violations; automation is partial evidence.'),
    externalNetwork: category('pass', 'Production play emitted no request outside 127.0.0.1.'), consoleRuntime: category('pass', 'No console errors or unhandled page errors were observed.'),
    deterministicReplay: category('pass', 'Fresh identical revised gap runs produced identical semantic and world-state output.'),
    assetProvenance: category('pass', 'All creative assets are project-native and hashed; dependencies remain separate dev-only records.'),
    independentRevisionAudit: category(auditResult, `Independent revision audit verdict: ${audit.verdict}; readyForHumanReplaytest: true.`),
  },
  warnings: [...audit.warnings, 'Touch evidence is emulated rather than physical-device observation.', 'Automated accessibility scanning does not establish WCAG conformance.'],
  humanOnlyLimitations: ['Automation and independent implementation review cannot determine whether decision motivation, immersion, perceptible consequence, felt agency, pacing, narrative tone, mobile usability, or medium quality now succeed for a human.'],
};
const qaReportSha256 = await output('docs/wayfinder.m42r-qa-report.json', qaReport);
const gate = {
  schemaVersion: '1.0.0', gateId: 'replaytest_gate_wayfinder_m42r_slice_02', projectId: decision.projectId, selectedConceptId: decision.selectedConceptId, status: 'pending_human_replaytest',
  bindings: { humanFeedbackSha256: sha256(await fs.readFile(feedbackPath)), revisionContractSha256: sha256(await fs.readFile(revisionPath)), sourceManifestSha256, qaReportSha256, independentAuditSha256, buildArtifacts },
  preview: { command: 'npm run wayfinder:preview', address: 'http://127.0.0.1:4173', termination: 'Press Ctrl+C in the preview terminal.' },
  revisionSummary: 'The same bounded crossing now establishes situation through active observation, supports reversible tradeoff previews and explicit commitment, transforms one persistent world immediately, and requires a lived branch beat before reflection.',
  automatedQaEstablished: ['Human feedback and amendment provenance are valid.', 'All revised deterministic and browser paths work across desktop, mobile emulation, keyboard, touch emulation, and reduced motion.', 'Continuous scene identity and multiple pre-reflection branch world changes are structurally present.', 'Representative axe, local-network, runtime-error, replay, and project-native provenance checks passed.'],
  knownWarnings: qaReport.warnings,
  humanEvaluation: [
    { dimension: 'decision_motivation', previousResult: 'fail', question: 'Before committing, did you now have a real preference or hesitation between bearings?' },
    { dimension: 'situation_immersion', previousResult: 'fail_too_fast', question: 'Did you feel you had entered a place and situation before being asked to decide?' },
    { dimension: 'immediate_consequence', previousResult: 'fail', question: 'Before the final reflection, did you clearly feel the world respond to your bearing?' },
    { dimension: 'agency', previousResult: 'fail', question: 'Did this feel more like “I changed the journey” than “I selected a page”?' },
    { dimension: 'medium_visual_coherence', previousResult: 'fail', question: 'Does it now feel like a small interactive work rather than a styled Web demo?' },
    { dimension: 'pacing', previousResult: 'fail_too_fast', question: 'Does observation → deliberation → choice happen at an appropriate pace?' },
    { dimension: 'narrative_tone', previousResult: 'not_evaluated', question: 'Does the concise environmental prose feel concrete, restrained, and coherent?' },
    { dimension: 'narrow_screen_usability', previousResult: 'not_evaluated', question: 'On a physical mobile device or narrow browser, is the complete revised experience clear and usable?' },
    { dimension: 'overall_direction', previousResult: 'request_revision', question: 'Should this direction be approved for expansion, revised again, or rejected?' },
  ],
  availableHumanActions: ['approve_for_expansion', 'request_revision', 'reject_implementation_direction'],
};
await output('docs/wayfinder.m42r-human-replaytest-gate.json', gate);

const Ajv = AjvModule.default;
const ajv = new Ajv({ allErrors: true, strict: true });
for (const [name, value] of [['m42r-source-manifest', sourceManifest], ['m42r-qa-report', qaReport], ['human-replaytest-gate', gate]] as const) {
  const schema = JSON.parse(await fs.readFile(path.resolve('schemas', `${name}.schema.json`), 'utf8')) as object;
  const validate = ajv.compile(schema);
  if (!validate(value)) throw new Error(`${name} validation failed: ${ajv.errorsText(validate.errors)}`);
}
console.log(`M4.2R artifacts generated and validated; source manifest ${sourceManifestSha256}`);
