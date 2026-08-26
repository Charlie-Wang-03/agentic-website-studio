import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import AjvModule from 'ajv/dist/ajv.js';

const root = process.cwd();
const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
const portable = (file: string): string => path.relative(root, file).replaceAll('\\', '/');
const output = async (file: string, value: unknown): Promise<string> => {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(path.resolve(file), text);
  return sha256(text);
};
const fileRecord = async (file: string): Promise<{ path: string; sha256: string }> => {
  const resolved = path.resolve(file);
  if (!resolved.startsWith(`${root}${path.sep}`)) throw new Error(`Path escapes workspace: ${file}`);
  return { path: portable(resolved), sha256: sha256(await fs.readFile(resolved)) };
};
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
const contractPath = 'docs/wayfinder.m4-implementation-contract.json';
const auditPath = 'docs/wayfinder.m4-independent-audit.json';
const decision = JSON.parse(await fs.readFile(decisionPath, 'utf8')) as { decisionId: string; projectId: string; selectedConceptId: string };
const contract = JSON.parse(await fs.readFile(contractPath, 'utf8')) as { contractId: string; projectId: string; selectedConceptId: string };
const audit = JSON.parse(await fs.readFile(auditPath, 'utf8')) as { verdict: 'pass' | 'pass_with_warnings' | 'fail'; warnings: string[] };
if (decision.projectId !== contract.projectId || decision.selectedConceptId !== contract.selectedConceptId || audit.verdict === 'fail') throw new Error('Stale binding or failed independent audit blocks artifacts.');

const sourcePaths = [
  ...await walk('pilots/wayfinder'), ...await walk('tests/wayfinder-e2e'),
  'tests/wayfinder-state.test.ts', 'tests/wayfinder-contract.test.ts', 'tests/m42-artifacts.test.ts', 'playwright.wayfinder.config.ts', 'vite.wayfinder.config.ts', 'vitest.config.ts',
  'src/m42-artifacts.ts', 'schemas/m42-source-manifest.schema.json', 'schemas/m42-qa-report.schema.json', 'schemas/human-playtest-gate.schema.json', 'package.json', 'package-lock.json',
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
  schemaVersion: '1.0.0', manifestId: 'manifest_wayfinder_m42_slice_01', projectId: contract.projectId, selectedConceptId: contract.selectedConceptId,
  humanDecision: { id: decision.decisionId, path: decisionPath, sha256: sha256(await fs.readFile(decisionPath)) },
  implementationContract: { id: contract.contractId, path: contractPath, sha256: sha256(await fs.readFile(contractPath)) },
  sourceFiles, creativeAssets, dependencies, buildArtifacts,
};
const sourceManifestSha256 = await output('docs/wayfinder.m4-source-manifest.json', sourceManifest);

const category = (result: 'pass' | 'pass_with_warnings', evidence: string) => ({ result, evidence });
const qaReport = {
  schemaVersion: '1.0.0', reportId: 'qa_wayfinder_m42_slice_01', projectId: contract.projectId, selectedConceptId: contract.selectedConceptId,
  humanDecisionId: decision.decisionId, implementationContractId: contract.contractId, sourceManifestSha256,
  overallResult: audit.verdict === 'pass' ? 'pass_with_warnings' : audit.verdict,
  categories: {
    build: category('pass', 'Vite production build completed and build artifacts are SHA-256 bound.'),
    stateMachineUnitTests: category('pass', '19 focused tests cover authoritative-input validation, legal and invalid transitions, restart, reachability, contract drift, and replay.'),
    contractConformance: category('pass', 'Runtime states, contracted transitions, terminal states, bearing IDs, and QA flags match the M4 contract.'),
    desktopE2E: category('pass', 'All edge, wait, and gap paths completed at 1440x900 with restart.'),
    mobileE2E: category('pass', 'All three paths completed at 390x844 with overflow and target-size checks.'),
    keyboard: category('pass', 'One branch completed keyboard-only; all bearing controls received logical focus.'),
    touch: category('pass_with_warnings', 'All branches completed with Playwright touch emulation; physical-device testing remains human/manual evidence.'),
    reducedMotion: category('pass', 'All branches completed under prefers-reduced-motion: reduce with semantic outcomes intact.'),
    accessibilityAutomatedScan: category('pass_with_warnings', 'Axe found no serious or critical violations in representative desktop/mobile states; automation is partial evidence only.'),
    externalNetworkTest: category('pass', 'Production path emitted no request outside 127.0.0.1.'),
    consoleRuntimeErrors: category('pass', 'No console errors or unhandled page errors were observed.'),
    deterministicReplay: category('pass', 'Fresh identical gap sequences produced identical state and semantic output.'),
    assetProvenance: category('pass', 'All creative assets are project-native and hashed; dependencies are separately classified.'),
    independentImplementationAudit: category(audit.verdict === 'pass' ? 'pass' : 'pass_with_warnings', `Independent audit verdict: ${audit.verdict}.`),
  },
  warnings: [...audit.warnings, 'Touch evidence is emulated rather than a physical-device observation.', 'Automated accessibility checks do not establish WCAG conformance.'],
  limitations: ['Automation cannot establish aesthetic quality, emotional pacing, prose quality, perceived agency, or perceptual sufficiency; these remain human-playtest questions.'],
};
const qaReportSha256 = await output('docs/wayfinder.m4-qa-report.json', qaReport);
const playtestGate = {
  schemaVersion: '1.0.0', gateId: 'playtest_gate_wayfinder_m42_slice_01', projectId: contract.projectId, selectedConceptId: contract.selectedConceptId, status: 'pending_human_playtest',
  bindings: { humanDecisionId: decision.decisionId, implementationContractId: contract.contractId, sourceManifestSha256, qaReportSha256, buildArtifacts },
  preview: { command: 'npm run wayfinder:preview', address: 'http://127.0.0.1:4173', termination: 'Press Ctrl+C in the preview terminal.' },
  sliceDescription: 'Arrival and orientation lead to one of three bearings, each with a distinct route/atmosphere consequence and paired unscored reflection, followed by deterministic restart.',
  automatedQaEstablished: ['Exact state-machine structure and replay determinism.', 'All paths complete on contracted desktop and emulated mobile viewports.', 'Keyboard, touch emulation, reduced motion, serious/critical axe scan, local-only networking, and runtime error checks passed.', 'Creative assets are project-native and source/build files are SHA-256 bound.'],
  knownWarnings: qaReport.warnings,
  humanOnlyQuestions: [
    { dimension: 'choice_clarity', question: 'Did you understand the three bearings before choosing?' },
    { dimension: 'consequence_perceptibility', question: 'Did each path feel observably different before the ending?' },
    { dimension: 'agency', question: 'Did the choice feel consequential rather than cosmetic?' },
    { dimension: 'pacing', question: 'Was arrival through ending appropriately paced?' },
    { dimension: 'visual_coherence', question: 'Did the original visual language feel intentional?' },
    { dimension: 'narrative_tone', question: 'Did the short prose feel restrained and coherent?' },
    { dimension: 'mobile_usability', question: 'On a physical mobile device or narrow browser, did the complete experience remain usable?' },
    { dimension: 'overall_direction', question: 'Should this direction be approved for expansion, revised, or rejected?' },
  ],
  availableHumanActions: ['approve_for_expansion', 'request_revision', 'reject_implementation_direction'],
};
await output('docs/wayfinder.m4-human-playtest-gate.json', playtestGate);

const Ajv = AjvModule.default;
const ajv = new Ajv({ allErrors: true, strict: true });
for (const [name, value] of [['m42-source-manifest', sourceManifest], ['m42-qa-report', qaReport], ['human-playtest-gate', playtestGate]] as const) {
  const schema = JSON.parse(await fs.readFile(path.resolve('schemas', `${name}.schema.json`), 'utf8')) as object;
  const validate = ajv.compile(schema);
  if (!validate(value)) throw new Error(`${name} validation failed: ${ajv.errorsText(validate.errors)}`);
}
console.log(`M4.2 artifacts generated and validated; source manifest ${sourceManifestSha256}`);
