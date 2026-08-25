#!/usr/bin/env node
import { captureReference } from './capture.js';
import { prepareAnalysis } from './analysis.js';
import { validateAnalysis } from './analysis-validation.js';
import { prepareCreative, prepareSynthesis, validateConcepts, validateSynthesis } from './m3.js';

function value(args: string[], flag: string): string | undefined { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function boundedInteger(args: string[], flag: string, maximum: number): number | undefined {
  const raw = value(args, flag); if (raw === undefined) return undefined;
  const parsed = Number(raw); if (!Number.isInteger(parsed) || parsed < 0 || parsed > maximum) throw new Error(`${flag} must be an integer from 0 to ${String(maximum)}`);
  return parsed;
}
function values(args: string[], flag: string): string[] { return args.flatMap((item, index) => item === flag && args[index + 1] ? [args[index + 1]!] : []); }
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  if (command === 'capture') {
    const url = value(args, '--url'); const project = value(args, '--project');
    if (!url || !project) throw new Error('--url and --project are required');
    const settleMs = boundedInteger(args, '--settle-ms', 5_000);
    const result = await captureReference({ url, project, allowLocalFixture: args.includes('--local-fixture'), disableJavaScript: args.includes('--disable-javascript'), ...(settleMs === undefined ? {} : { settleMs }) });
    process.stdout.write(`${result.runDir}\n`); return;
  }
  if (command === 'prepare-analysis') {
    const runDir = value(args, '--run'); if (!runDir) throw new Error('--run is required');
    const result = await prepareAnalysis(runDir); process.stdout.write(`${result.packetPath}\n`); return;
  }
  if (command === 'validate-analysis') {
    const runDir = value(args, '--run'); const profilePath = value(args, '--profile'); const principlesPath = value(args, '--principles');
    if (!runDir || !profilePath || !principlesPath) throw new Error('--run, --profile, and --principles are required');
    const result = await validateAnalysis({ runDir, profilePath, principlesPath }); process.stdout.write(`${JSON.stringify({ valid: true, ...result })}\n`); return;
  }
  if (command === 'prepare-synthesis') {
    const briefPath = value(args, '--brief'); const outputDir = value(args, '--output-dir'); const tuplePaths = values(args, '--reference');
    if (!briefPath || !outputDir || tuplePaths.length < 3) throw new Error('--brief, --output-dir, and at least three --reference tuple files are required');
    const result = await prepareSynthesis({ briefPath, tuplePaths, outputDir }); process.stdout.write(`${JSON.stringify({ referenceSetPath: result.referenceSetPath, packetPath: result.packetPath })}\n`); return;
  }
  if (command === 'validate-synthesis') {
    const packetPath = value(args, '--packet'); const mapPath = value(args, '--synthesis'); if (!packetPath || !mapPath) throw new Error('--packet and --synthesis are required');
    process.stdout.write(`${JSON.stringify({ valid: true, ...(await validateSynthesis({ packetPath, mapPath })) })}\n`); return;
  }
  if (command === 'prepare-creative') {
    const briefPath = value(args, '--brief'); const packetPath = value(args, '--packet'); const mapPath = value(args, '--synthesis'); const outputPath = value(args, '--output');
    if (!briefPath || !packetPath || !mapPath || !outputPath) throw new Error('--brief, --packet, --synthesis, and --output are required');
    process.stdout.write(`${(await prepareCreative({ briefPath, packetPath, mapPath, outputPath })).outputPath}\n`); return;
  }
  if (command === 'validate-concepts') {
    const briefPath = value(args, '--brief'); const packetPath = value(args, '--packet'); const mapPath = value(args, '--synthesis'); const creativePacketPath = value(args, '--creative-packet'); const conceptsPath = value(args, '--concepts'); const conceptReviewPath = value(args, '--concept-review'); const originalityReviewPath = value(args, '--originality-review'); const gatePath = value(args, '--gate');
    if (!briefPath || !packetPath || !mapPath || !creativePacketPath || !conceptsPath || !conceptReviewPath || !originalityReviewPath) throw new Error('--brief, --packet, --synthesis, --creative-packet, --concepts, --concept-review, and --originality-review are required');
    process.stdout.write(`${JSON.stringify({ valid: true, ...(await validateConcepts({ briefPath, packetPath, mapPath, creativePacketPath, conceptsPath, conceptReviewPath, originalityReviewPath, ...(gatePath ? { gatePath } : {}) })) })}\n`); return;
  }
  throw new Error('Usage: studio <capture|prepare-analysis|validate-analysis|prepare-synthesis|validate-synthesis|prepare-creative|validate-concepts> [options]');
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
