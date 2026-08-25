import fs from 'node:fs/promises';
import path from 'node:path';
import { hashText } from './artifacts.js';
import { createValidator } from './schema.js';
import { REPOSITORY_ROOT, validateRunDirectory } from './run-validation.js';
import type { ArtifactRef, EvidenceRecord } from './types.js';

export interface AnalysisPacket {
  schemaVersion: '1.0.0'; packetId: string; preparedAt: string;
  reference: { referenceId: string; sanitizedUrl: string }; runId: string;
  sourceArtifacts: ArtifactRef[]; observations: EvidenceRecord[]; rights: unknown[]; screenshotArtifacts: ArtifactRef[];
  warnings: string[]; missingEvidence: string[];
  analysisPolicy: { evidenceOnly: true; doNotBrowseSource: true; doNotSearchClones: true; doNotCopySourceText: true; doNotReconstructCode: true; rightsAreNotReusePermission: true; enforcement: 'protocol' };
}

function stableJson(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }
async function writeDeterministic(file: string, value: unknown): Promise<void> {
  const output = stableJson(value);
  try {
    const existing = await fs.readFile(file, 'utf8');
    if (existing !== output) throw new Error('Existing analysis packet differs from deterministic output');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await fs.writeFile(file, output, { encoding: 'utf8', flag: 'wx' });
  }
}

export async function prepareAnalysis(rawRunDir: string): Promise<{ packetPath: string; packet: AnalysisPacket }> {
  const { runDir, manifest, evidence, rights } = await validateRunDirectory(rawRunDir);
  const missingEvidence: string[] = [];
  for (const viewport of ['desktop', 'mobile'] as const) {
    for (const kind of ['structure', 'visual_system', 'motion_interaction', 'technical_signal', 'screenshot'] as const) {
      if (!evidence.some((item) => item.viewport === viewport && item.kind === kind)) missingEvidence.push(`${viewport}:${kind}`);
    }
  }
  const sourceArtifacts = manifest.artifacts.filter(({ path: artifactPath }) => /\/(evidence|rights|network|console)\.json$/.test(artifactPath));
  const screenshotArtifacts = manifest.artifacts.filter(({ path: artifactPath }) => /\/(desktop|mobile)\.png$/.test(artifactPath));
  const evidenceArtifact = sourceArtifacts.find(({ path: artifactPath }) => artifactPath.endsWith('/evidence.json'));
  if (!evidenceArtifact) throw new Error('Run manifest does not reference evidence.json');
  const packet: AnalysisPacket = {
    schemaVersion: '1.0.0', packetId: `ap_${hashText(`${manifest.referenceId}:${manifest.runId}:${evidenceArtifact.sha256}`).slice(0, 20)}`,
    preparedAt: manifest.capturedAt, reference: { referenceId: manifest.referenceId, sanitizedUrl: manifest.finalUrl }, runId: manifest.runId,
    sourceArtifacts, observations: evidence, rights, screenshotArtifacts, warnings: manifest.warnings, missingEvidence,
    analysisPolicy: { evidenceOnly: true, doNotBrowseSource: true, doNotSearchClones: true, doNotCopySourceText: true, doNotReconstructCode: true, rightsAreNotReusePermission: true, enforcement: 'protocol' },
  };
  const ajv = await createValidator(REPOSITORY_ROOT);
  const validate = ajv.getSchema('https://agentic-website-studio.local/schemas/analysis-packet.schema.json');
  if (!validate?.(packet)) throw new Error(`Analysis packet schema validation failed: ${JSON.stringify(validate?.errors ?? [])}`);
  const packetPath = path.join(runDir, 'analysis-packet.json');
  await writeDeterministic(packetPath, packet);
  return { packetPath, packet };
}
