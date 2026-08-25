#!/usr/bin/env node
import { captureReference } from './capture.js';

function value(args: string[], flag: string): string | undefined { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] !== 'capture') throw new Error('Usage: npm run studio -- capture --url <public-url> --project <slug> [--local-fixture]');
  const url = value(args, '--url'); const project = value(args, '--project');
  if (!url || !project) throw new Error('--url and --project are required');
  const result = await captureReference({ url, project, allowLocalFixture: args.includes('--local-fixture') });
  process.stdout.write(`${result.runDir}\n`);
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
