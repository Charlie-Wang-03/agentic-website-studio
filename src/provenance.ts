import type { EvidenceRef } from './types.js';

export function evidenceRefKey(reference: EvidenceRef): string {
  return `${reference.runId}\u0000${reference.evidenceId}`;
}
