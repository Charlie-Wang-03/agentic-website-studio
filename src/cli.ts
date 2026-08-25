#!/usr/bin/env node
import { captureReference } from './capture.js';
import { prepareAnalysis } from './analysis.js';
import { validateAnalysis } from './analysis-validation.js';

function value(args: string[], flag: string): string | undefined { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
function boundedInteger(args: string[], flag: string, maximum: number): number | undefined {
  const raw = value(args, flag); if (raw === undefined) return undefined;
  const parsed = Number(raw); if (!Number.isInteger(parsed) || parsed < 0 || parsed > maximum) throw new Error(`${flag} must be an integer from 0 to ${String(maximum)}`);
  return parsed;
}
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  if (command === 'capture') {
    const url = value(args, '--url'); const project = value(args, '--project');
    if (!url || !project) throw new Error('--url and --project are required');
    const settleMs = boundedInteger(args, '--settle-ms', 5_000);
    const result = await captureReference({ url, project, allowLocalFixture: args.includes('--local-fixture'), ...(settleMs === undefined ? {} : { settleMs }) });
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
  throw new Error('Usage: studio <capture|prepare-analysis|validate-analysis> [options]');
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
