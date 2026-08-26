import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contractedTransitions, states, terminalStates } from '../pilots/wayfinder/src/state-machine.js';
import { bearings } from '../pilots/wayfinder/src/content.js';
import { validateImplementationContract } from '../src/m4.js';

const contract = JSON.parse(fs.readFileSync(path.resolve('docs/wayfinder.m4-implementation-contract.json'), 'utf8')) as {
  selectedConceptId: string;
  engineeringScope: { deterministicStateMachine: { states: string[]; transitions: Array<{ from: string; event: string; to: string }>; terminalStates: string[] } };
  qaRequirements: Record<string, boolean>;
};

describe('Wayfinder contract-to-runtime conformance', () => {
  it('revalidates the authoritative Human Decision and Contract against the actual M3 artifacts', async () => {
    await expect(validateImplementationContract({
      contractPath: path.resolve('docs/wayfinder.m4-implementation-contract.json'),
      decisionPath: path.resolve('docs/wayfinder.m4-human-decision.json'),
      conceptsPath: path.resolve('runs/wayfinder/m3/concepts.json'),
      gatePath: path.resolve('runs/wayfinder/m3/human-gate.json'),
      conceptReviewPath: path.resolve('runs/wayfinder/m3/concept-review.json'),
      originalityReviewPath: path.resolve('runs/wayfinder/m3/originality-review.json'),
    })).resolves.toMatchObject({ selectedConceptId: 'concept_three_bearings', states: 9 });
  });
  it('matches the exact contracted state, transition, and terminal sets', () => {
    const machine = contract.engineeringScope.deterministicStateMachine;
    const key = (item: { from: string; event: string; to: string }) => `${item.from}|${item.event}|${item.to}`;
    expect([...states].sort()).toEqual([...machine.states].sort());
    expect(contractedTransitions.map(key).sort()).toEqual(machine.transitions.map(key).sort());
    expect([...terminalStates].sort()).toEqual([...machine.terminalStates].sort());
  });

  it('binds only the approved concept and bearing IDs', () => {
    expect(contract.selectedConceptId).toBe('concept_three_bearings');
    expect(Object.keys(bearings).sort()).toEqual(['edge', 'gap', 'wait']);
  });

  it('keeps every required QA dimension enabled', () => {
    expect(contract.qaRequirements).toEqual({ desktop: true, mobile: true, keyboard: true, touch: true, reducedMotion: true, accessibility: true, deterministicReplay: true });
  });

  it('uses multiple non-color semantic indicators for every bearing', () => {
    for (const value of Object.values(bearings)) {
      expect(new Set([value.route, value.atmosphere, value.consequence, value.ending]).size).toBe(4);
      expect(value.route.length).toBeGreaterThan(3);
      expect(value.atmosphere.length).toBeGreaterThan(3);
    }
  });
});
