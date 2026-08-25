import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';

export async function hashFile(file: string): Promise<string> {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

export function hashText(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function writeJson(file: string, value: unknown): Promise<void> {
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}
