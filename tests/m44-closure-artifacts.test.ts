import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createValidator } from '../src/schema.js';
import { fileHash } from '../src/m43r-validation.js';

const read = async <T>(name: string) => JSON.parse(await fs.readFile(path.join('docs', name), 'utf8')) as T;

describe('M4.4 Wayfinder pilot closure', () => {
  it('validates the bounded closure, registry, and lessons artifacts', async () => {
    const validator = await createValidator();
    for (const [schema, file] of [['pilot-registry', 'pilot-registry.json'], ['pilot-closure', 'wayfinder.pilot-closure.json'], ['project-lessons', 'wayfinder.project-lessons.json']] as const) {
      const validate = validator.getSchema(`https://agentic-website-studio.local/schemas/${schema}.schema.json`)!;
      expect(validate(await read(file)), JSON.stringify(validate.errors)).toBe(true);
    }
  });

  it('closes the pilot without rewriting the pending human gate into approval', async () => {
    const closure = await read<{ humanDecision: { action: string }; status: { pilot: string; releaseReadiness: string; publicDeployment: boolean }; historicalGate: { path: string; status: string; preservedAsUnanswered: boolean }; scopeBoundary: Record<string, boolean> }>('wayfinder.pilot-closure.json');
    expect(closure.humanDecision.action).toBe('close_pilot');
    expect(closure.status).toEqual({ pilot: 'completed_internal_pilot', releaseReadiness: 'not_requested', publicDeployment: false });
    expect(closure.historicalGate).toEqual({ path: 'docs/wayfinder.m43r-human-expansion-replaytest-gate.json', status: 'pending_human_expansion_replaytest', preservedAsUnanswered: true });
    expect(closure.scopeBoundary).toEqual({ furtherWayfinderImplementation: false, releaseReadiness: false, deployment: false, pilot2Implementation: false });
    expect(await fileHash('docs/wayfinder.m43r-human-expansion-replaytest-gate.json')).toBe('88e3f2c9c4d1fae12553a41ce84925c1a10909ecc808a7f2a43869916ee4bdb9');
  });

  it('keeps lessons as candidates and Pilot 2 as readiness only', async () => {
    const lessons = await read<{ candidateRules: Array<{ supportingPilots: string[]; promotionRequirement: string }>; promotionPolicy: { principle: string }; pilot2Readiness: { status: string; requirements: string[] } }>('wayfinder.project-lessons.json');
    expect(lessons.candidateRules).toHaveLength(3);
    expect(lessons.candidateRules.every((rule) => rule.supportingPilots.every((pilot) => pilot === 'wayfinder') && rule.promotionRequirement.includes('materially different later pilot'))).toBe(true);
    expect(lessons.promotionPolicy.principle).toBe('Evidence before self-improvement.');
    expect(lessons.pilot2Readiness.status).toBe('readiness_only_no_pilot_selected_or_implemented');
    expect(lessons.pilot2Readiness.requirements).toHaveLength(7);
  });
});
