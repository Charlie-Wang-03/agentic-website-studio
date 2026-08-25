import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashFile } from './artifacts.js';
import { createReferenceId } from './reference.js';
import { createValidator } from './schema.js';
import type { EvidenceRecord, ReferenceRunManifest } from './types.js';

function findRepositoryRoot(start: string): string {
  let current = path.resolve(start);
  while (true) {
    if (existsSync(path.join(current, 'package.json')) && existsSync(path.join(current, 'schemas'))) return current;
    const parent = path.dirname(current); if (parent === current) throw new Error('Could not locate repository root'); current = parent;
  }
}
export const REPOSITORY_ROOT = findRepositoryRoot(path.dirname(fileURLToPath(import.meta.url)));
export interface RightsRecord { referenceId: string; runId: string; sourceReference: string; status: string; basis: string; isLegalOpinion: false; notes?: string }
export interface ValidatedRun { runDir: string; manifest: ReferenceRunManifest; evidence: EvidenceRecord[]; rights: RightsRecord[] }

function assertContained(root: string, target: string, message: string): void {
  const relative = path.relative(root, target);
  if (relative === '' || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(message);
}

function schemaErrors(errors: unknown): string { return JSON.stringify(errors ?? []); }
function duplicate(values: string[]): string | undefined { const seen = new Set<string>(); return values.find((value) => seen.has(value) || !seen.add(value)); }
const FORBIDDEN_VALUE_KEYS = new Set(['__proto__', 'constructor', 'prototype', 'html', 'responsebody', 'requestbody', 'headers', 'cookies', 'storage', 'sourcecode', 'stylesheetbody']);
const ALLOWED_VALUE_KEYS: Record<string, readonly string[]> = {
  navigation: ['requestedUrl', 'finalUrl', 'status'],
  page_metadata: ['title'],
  structure: ['title', 'sections', 'headings', 'budgets', 'landmarkOrder', 'counts', 'scroll', 'layoutModes', 'affordances'],
  'structure.sections[]': ['index', 'semanticType', 'heading', 'box', 'viewportTopRatio', 'descendantCount', 'interactiveCount', 'position', 'display'],
  'structure.sections[].box': ['x', 'y', 'width', 'height'],
  'structure.headings[]': ['level', 'text', 'fontSize'],
  'structure.budgets': ['visibleElementSample', 'sections', 'headings', 'affordances'],
  'structure.counts': ['links', 'buttons', 'forms', 'images', 'textBlocks'],
  'structure.scroll': ['width', 'height', 'horizontalOverflow'],
  'structure.layoutModes[]': ['value', 'count'],
  'structure.affordances[]': ['role', 'label', 'cursor'],
  visual_system: ['sampleSize', 'colors', 'fontFamilies', 'fontSizes', 'fontWeights', 'lineHeights', 'spacing', 'borderRadii', 'borders', 'boxShadows', 'opacities', 'textAlignments', 'layoutModes'],
  'visual_system.colors[]': ['value', 'count'], 'visual_system.fontFamilies[]': ['value', 'count'], 'visual_system.fontSizes[]': ['value', 'count'],
  'visual_system.fontWeights[]': ['value', 'count'], 'visual_system.lineHeights[]': ['value', 'count'], 'visual_system.spacing[]': ['value', 'count'],
  'visual_system.borderRadii[]': ['value', 'count'], 'visual_system.boxShadows[]': ['value', 'count'], 'visual_system.opacities[]': ['value', 'count'],
  'visual_system.textAlignments[]': ['value', 'count'], 'visual_system.layoutModes[]': ['value', 'count'],
  motion_interaction: ['signals', 'scrollSweep'],
  'motion_interaction.signals': ['cssAnimationElementCount', 'animationDurations', 'transitionElementCount', 'transitionDurations', 'activeAnimationCount', 'fixedOrStickyCount', 'fixedOrSticky', 'scrollSnapTypes', 'canvasCount', 'videoCount', 'audioCount', 'affordances'],
  'motion_interaction.signals.animationDurations[]': ['value', 'count'], 'motion_interaction.signals.transitionDurations[]': ['value', 'count'],
  'motion_interaction.signals.fixedOrSticky[]': ['tag', 'position'], 'motion_interaction.signals.scrollSnapTypes[]': ['value', 'count'],
  'motion_interaction.signals.affordances[]': ['role', 'label', 'cursor'],
  'motion_interaction.scrollSweep': ['viewport', 'positions'],
  'motion_interaction.scrollSweep.positions[]': ['position', 'scrollY', 'scrollHeight', 'bodyClassTokenCount', 'rootClassTokenCount', 'fixedOrStickyVisible'],
  technical_signal: ['scriptCount', 'moduleScriptCount', 'stylesheetCount', 'canvasCount', 'mediaCount', 'generator', 'historyApiAvailable', 'network'],
  'technical_signal.network': ['observedResponses', 'resourceTypes', 'resourceHosts'],
  'technical_signal.network.resourceTypes[]': ['value', 'count'], 'technical_signal.network.resourceHosts[]': ['value', 'count'],
  responsive: ['viewports'],
  'responsive.viewports[]': ['viewport', 'scrollHeight', 'horizontalOverflow', 'sectionCount', 'headingCount', 'fixedOrStickyCount'],
};
const STRING_VALUE_PATHS = new Set([
  'navigation.requestedUrl', 'navigation.finalUrl', 'page_metadata.title', 'structure.title', 'structure.sections[].semanticType', 'structure.sections[].heading', 'structure.sections[].position', 'structure.sections[].display',
  'structure.headings[].text', 'structure.headings[].fontSize', 'structure.landmarkOrder[]', 'structure.layoutModes[].value', 'structure.affordances[].role', 'structure.affordances[].label', 'structure.affordances[].cursor',
  'visual_system.colors[].value', 'visual_system.fontFamilies[].value', 'visual_system.fontSizes[].value', 'visual_system.fontWeights[].value', 'visual_system.lineHeights[].value', 'visual_system.spacing[].value', 'visual_system.borderRadii[].value', 'visual_system.boxShadows[].value', 'visual_system.opacities[].value', 'visual_system.textAlignments[].value', 'visual_system.layoutModes[].value',
  'motion_interaction.signals.animationDurations[].value', 'motion_interaction.signals.transitionDurations[].value', 'motion_interaction.signals.fixedOrSticky[].tag', 'motion_interaction.signals.fixedOrSticky[].position', 'motion_interaction.signals.scrollSnapTypes[].value', 'motion_interaction.signals.affordances[].role', 'motion_interaction.signals.affordances[].label', 'motion_interaction.signals.affordances[].cursor', 'motion_interaction.scrollSweep.viewport',
  'technical_signal.generator', 'technical_signal.network.resourceTypes[].value', 'technical_signal.network.resourceHosts[].value', 'responsive.viewports[].viewport',
]);
const BOOLEAN_VALUE_PATHS = new Set(['structure.scroll.horizontalOverflow', 'technical_signal.historyApiAvailable', 'responsive.viewports[].horizontalOverflow']);
const NUMBER_VALUE_PATHS = new Set([
  'navigation.status', 'structure.sections[].index', 'structure.sections[].box.x', 'structure.sections[].box.y', 'structure.sections[].box.width', 'structure.sections[].box.height', 'structure.sections[].viewportTopRatio', 'structure.sections[].descendantCount', 'structure.sections[].interactiveCount', 'structure.headings[].level',
  'structure.budgets.visibleElementSample', 'structure.budgets.sections', 'structure.budgets.headings', 'structure.budgets.affordances', 'structure.counts.links', 'structure.counts.buttons', 'structure.counts.forms', 'structure.counts.images', 'structure.counts.textBlocks', 'structure.scroll.width', 'structure.scroll.height', 'structure.layoutModes[].count',
  'visual_system.sampleSize', 'visual_system.colors[].count', 'visual_system.fontFamilies[].count', 'visual_system.fontSizes[].count', 'visual_system.fontWeights[].count', 'visual_system.lineHeights[].count', 'visual_system.spacing[].count', 'visual_system.borderRadii[].count', 'visual_system.borders', 'visual_system.boxShadows[].count', 'visual_system.opacities[].count', 'visual_system.textAlignments[].count', 'visual_system.layoutModes[].count',
  'motion_interaction.signals.cssAnimationElementCount', 'motion_interaction.signals.animationDurations[].count', 'motion_interaction.signals.transitionElementCount', 'motion_interaction.signals.transitionDurations[].count', 'motion_interaction.signals.activeAnimationCount', 'motion_interaction.signals.fixedOrStickyCount', 'motion_interaction.signals.scrollSnapTypes[].count', 'motion_interaction.signals.canvasCount', 'motion_interaction.signals.videoCount', 'motion_interaction.signals.audioCount', 'motion_interaction.scrollSweep.positions[].position', 'motion_interaction.scrollSweep.positions[].scrollY', 'motion_interaction.scrollSweep.positions[].scrollHeight', 'motion_interaction.scrollSweep.positions[].bodyClassTokenCount', 'motion_interaction.scrollSweep.positions[].rootClassTokenCount', 'motion_interaction.scrollSweep.positions[].fixedOrStickyVisible',
  'technical_signal.scriptCount', 'technical_signal.moduleScriptCount', 'technical_signal.stylesheetCount', 'technical_signal.canvasCount', 'technical_signal.mediaCount', 'technical_signal.network.observedResponses', 'technical_signal.network.resourceTypes[].count', 'technical_signal.network.resourceHosts[].count',
  'responsive.viewports[].scrollHeight', 'responsive.viewports[].sectionCount', 'responsive.viewports[].headingCount', 'responsive.viewports[].fixedOrStickyCount',
]);
function validatePersistedEvidenceText(value: string, location: string): void {
  if (/<(?:!doctype|html)\b/i.test(value) || /\b(?:authorization|cookie|set-cookie)\s*:/i.test(value) || /\b(?:password|token|api[_-]?key|secret)\s*[:=]\s*\S+/i.test(value)) throw new Error(`${location} contains forbidden raw content`);
  const trimmed = value.trim();
  if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && (() => { try { const parsed: unknown = JSON.parse(trimmed); return typeof parsed === 'object' && parsed !== null; } catch { return false; } })()) throw new Error(`${location} contains a serialized body`);
}
function validateAllowedShape(value: unknown, location: string): void {
  if (value === null || typeof value !== 'object') {
    const expected = STRING_VALUE_PATHS.has(location) ? 'string' : BOOLEAN_VALUE_PATHS.has(location) ? 'boolean' : NUMBER_VALUE_PATHS.has(location) ? 'number' : undefined;
    if (!expected || typeof value !== expected || (expected === 'number' && !Number.isFinite(value))) throw new Error(`Raw evidence has an invalid scalar at ${location}`);
    if (typeof value === 'string') { if (value.length > (location.endsWith('Url') ? 2_048 : 500)) throw new Error(`Raw evidence has an oversized scalar at ${location}`); validatePersistedEvidenceText(value, location); }
    return;
  }
  if (Array.isArray(value)) { value.forEach((item) => validateAllowedShape(item, `${location}[]`)); return; }
  const allowed = ALLOWED_VALUE_KEYS[location];
  if (!allowed) throw new Error(`Raw evidence contains an uncontracted object at ${location}`);
  for (const [name, item] of Object.entries(value)) {
    if (!allowed.includes(name)) throw new Error(`Raw evidence contains uncontracted field ${location}.${name}`);
    validateAllowedShape(item, `${location}.${name}`);
  }
}
export function validateBoundedEvidenceValue(value: unknown, location = 'evidence value', depth = 0): void {
  if (depth > 10) throw new Error(`${location} exceeds the maximum value depth`);
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) throw new Error(`${location} contains a non-finite number`); return; }
  if (typeof value === 'string') {
    if (value.length > 2_000) throw new Error(`${location} contains an oversized string`);
    if (/<(?:!doctype|html)\b/i.test(value) || /\b(?:authorization|cookie|set-cookie)\s*:/i.test(value)) throw new Error(`${location} contains forbidden raw content`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length > 500) throw new Error(`${location} contains an oversized array`);
    value.forEach((item, index) => validateBoundedEvidenceValue(item, `${location}[${String(index)}]`, depth + 1)); return;
  }
  if (typeof value !== 'object') throw new Error(`${location} contains an unsupported value`);
  const entries = Object.entries(value);
  if (entries.length > 200) throw new Error(`${location} contains too many object fields`);
  for (const [name, item] of entries) {
    if (FORBIDDEN_VALUE_KEYS.has(name.toLowerCase())) throw new Error(`${location} contains forbidden field ${name}`);
    validateBoundedEvidenceValue(item, `${location}.${name}`, depth + 1);
  }
}

export async function validateRunDirectory(rawRunDir: string): Promise<ValidatedRun> {
  const runDir = await fs.realpath(path.resolve(rawRunDir));
  const repositoryRoot = await fs.realpath(REPOSITORY_ROOT);
  assertContained(repositoryRoot, runDir, 'Run directory must be inside the repository');
  const [manifestText, evidenceText, rightsText] = await Promise.all([
    fs.readFile(path.join(runDir, 'manifest.json'), 'utf8'), fs.readFile(path.join(runDir, 'evidence.json'), 'utf8'), fs.readFile(path.join(runDir, 'rights.json'), 'utf8'),
  ]);
  if (Buffer.byteLength(evidenceText, 'utf8') > 2_000_000) throw new Error('evidence.json exceeds the 2 MB raw-evidence budget');
  const manifest = JSON.parse(manifestText) as ReferenceRunManifest;
  const evidence = JSON.parse(evidenceText) as EvidenceRecord[];
  const rights = JSON.parse(rightsText) as RightsRecord[];
  const ajv = await createValidator(repositoryRoot);
  const validateManifest = ajv.getSchema('https://agentic-website-studio.local/schemas/reference-run.schema.json');
  const validateEvidence = ajv.getSchema('https://agentic-website-studio.local/schemas/evidence.schema.json');
  const validateRights = ajv.getSchema('https://agentic-website-studio.local/schemas/rights.schema.json');
  if (!validateManifest?.(manifest)) throw new Error(`Manifest schema validation failed: ${schemaErrors(validateManifest?.errors)}`);
  for (const item of evidence) if (!validateEvidence?.(item)) throw new Error(`Evidence schema validation failed: ${schemaErrors(validateEvidence?.errors)}`);
  for (const item of rights) if (!validateRights?.(item)) throw new Error(`Rights schema validation failed: ${schemaErrors(validateRights?.errors)}`);
  const duplicateEvidence = duplicate(evidence.map(({ id }) => id));
  if (duplicateEvidence) throw new Error(`Duplicate evidence ID: ${duplicateEvidence}`);
  if (manifest.evidenceIds.length !== evidence.length || manifest.evidenceIds.some((id, index) => id !== evidence[index]?.id)) throw new Error('Manifest evidenceIds do not exactly match evidence.json');
  if (manifest.referenceId !== createReferenceId(manifest.finalUrl)) throw new Error('Reference identity does not match the normalized final URL');
  if (rights.length !== 1) throw new Error('Exactly one canonical rights record is required');
  const duplicateArtifactPath = duplicate(manifest.artifacts.map(({ path: artifactPath }) => artifactPath));
  if (duplicateArtifactPath) throw new Error(`Duplicate manifest artifact path: ${duplicateArtifactPath}`);
  const manifestArtifacts = new Map(manifest.artifacts.map((artifact) => [artifact.path, artifact.sha256]));
  for (const item of evidence) {
    if (item.runId !== manifest.runId) throw new Error(`Evidence ${item.id} belongs to a different run`);
    if (item.referenceId !== manifest.referenceId) throw new Error(`Evidence ${item.id} belongs to a different reference`);
    if (item.epistemicType !== 'observed_fact') throw new Error(`Raw evidence ${item.id} is not an observed fact`);
    if (item.rightsStatus !== rights[0]!.status) throw new Error(`Evidence ${item.id} escalates or changes source rights`);
    for (const [label, text] of [[`Evidence ${item.id}.claim`, item.claim], [`Evidence ${item.id}.sourceReference`, item.sourceReference], [`Evidence ${item.id}.provenance.method`, item.provenance.method], [`Evidence ${item.id}.provenance.locator`, item.provenance.locator], [`Evidence ${item.id}.notes`, item.notes]] as const) if (text !== undefined) validatePersistedEvidenceText(text, label);
    if (item.value !== undefined) {
      if (!['navigation', 'page_metadata', 'structure', 'visual_system', 'motion_interaction', 'technical_signal', 'responsive'].includes(item.kind) || item.value === null || Array.isArray(item.value) || typeof item.value !== 'object') throw new Error(`Evidence ${item.id} has a non-object or disallowed root value`);
      if (Buffer.byteLength(JSON.stringify(item.value), 'utf8') > 250_000) throw new Error(`Evidence ${item.id} exceeds its value-size budget`);
      validateBoundedEvidenceValue(item.value, `Evidence ${item.id}.value`);
      validateAllowedShape(item.value, item.kind);
    } else if (!['screenshot', 'console', 'network'].includes(item.kind)) throw new Error(`Evidence ${item.id} is missing its contracted value`);
    if (item.artifact) {
      if (item.kind !== 'screenshot') throw new Error(`Evidence ${item.id} has an artifact not allowed for its kind`);
      if (manifestArtifacts.get(item.artifact.path) !== item.artifact.sha256) throw new Error(`Evidence ${item.id} references an unlisted or mismatched artifact`);
      if (!/\/(desktop|mobile)\.png$/.test(item.artifact.path)) throw new Error(`Evidence ${item.id} references an unexpected screenshot path`);
    }
  }
  for (const item of rights) {
    if (item.runId !== manifest.runId || item.referenceId !== manifest.referenceId || item.sourceReference !== manifest.finalUrl) throw new Error('Rights metadata belongs to a different run, reference, or source');
  }
  for (const artifact of manifest.artifacts) {
    const file = await fs.realpath(path.resolve(repositoryRoot, ...artifact.path.split('/')));
    assertContained(runDir, file, `Artifact path is outside the run: ${artifact.path}`);
    if (await hashFile(file) !== artifact.sha256) throw new Error(`Artifact hash mismatch: ${artifact.path}`);
  }
  return { runDir, manifest, evidence, rights };
}
