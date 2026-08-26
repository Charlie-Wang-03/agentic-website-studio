import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { bearings } from '../pilots/wayfinder/src/content.js';
import { contractedTransitions, states, terminalStates } from '../pilots/wayfinder/src/state-machine.js';
import { validateImplementationContract } from '../src/m4.js';
import { validateHumanPlaytestFeedback, validateRevisionContract } from '../src/m42r-validation.js';

const revisionPath = path.resolve('docs/wayfinder.m42r-revision-contract.json');
const feedbackPath = path.resolve('docs/wayfinder.m42-human-playtest-feedback.json');
const revision = JSON.parse(fs.readFileSync(revisionPath, 'utf8')) as {
  selectedConceptId: string;
  deterministicStateMachine: { states: string[]; transitions: Array<{ from: string; event: string; to: string }>; terminalStates: string[] };
  branchWorldResponses: Record<string, Record<string, string>>;
  qaRequirements: Record<string, boolean>;
};

describe('M4.2R feedback and contract conformance', () => {
  it('keeps the original Human Decision and M4.1 Contract valid against actual M3 artifacts', async () => {
    await expect(validateImplementationContract({
      contractPath: path.resolve('docs/wayfinder.m4-implementation-contract.json'), decisionPath: path.resolve('docs/wayfinder.m4-human-decision.json'),
      conceptsPath: path.resolve('runs/wayfinder/m3/concepts.json'), gatePath: path.resolve('runs/wayfinder/m3/human-gate.json'),
      conceptReviewPath: path.resolve('runs/wayfinder/m3/concept-review.json'), originalityReviewPath: path.resolve('runs/wayfinder/m3/originality-review.json'),
    })).resolves.toMatchObject({ selectedConceptId: 'concept_three_bearings', states: 9 });
  });

  it('validates request_revision provenance without fabricating unevaluated results', async () => {
    await expect(validateHumanPlaytestFeedback(feedbackPath)).resolves.toEqual({ feedbackId: 'feedback_wayfinder_m42_playtest_01', action: 'request_revision', evaluated: 5, notEvaluated: 2 });
  });

  it('validates the revision amendment and all five objectives', async () => {
    await expect(validateRevisionContract(revisionPath, feedbackPath)).resolves.toEqual({ revisionContractId: 'revision_contract_wayfinder_m42r_slice_02', states: 15, transitions: 23 });
  });

  it('matches the exact amended states, transitions, and endings', () => {
    const key = (item: { from: string; event: string; to: string }) => `${item.from}|${item.event}|${item.to}`;
    expect([...states].sort()).toEqual([...revision.deterministicStateMachine.states].sort());
    expect(contractedTransitions.map(key).sort()).toEqual(revision.deterministicStateMachine.transitions.map(key).sort());
    expect([...terminalStates].sort()).toEqual([...revision.deterministicStateMachine.terminalStates].sort());
  });

  it('exposes distinct pre-commit tradeoffs without leaking response or ending copy', () => {
    expect(Object.keys(bearings).sort()).toEqual(['edge', 'gap', 'wait']);
    const previews = Object.values(bearings).map((item) => `${item.observation}|${item.offer}|${item.cost}`);
    expect(new Set(previews).size).toBe(3);
    for (const item of Object.values(bearings)) {
      expect(item.observation).not.toContain(item.response);
      expect(item.observation).not.toContain(item.ending);
      expect(item.offer).not.toBe(item.cost);
    }
  });

  it('defines multi-dimensional world responses and continuations for every branch', () => {
    for (const [bearing, response] of Object.entries(revision.branchWorldResponses)) {
      expect(Object.keys(response).sort()).toEqual(['continuationAction', 'environmentalState', 'geometryState', 'markerRelationship', 'routeRelationship', 'tradeoffPreview']);
      expect(new Set(Object.values(response)).size).toBe(6);
      expect(bearings[bearing as keyof typeof bearings].enactLabel.length).toBeGreaterThan(5);
    }
  });

  it('keeps every M4.2R QA prerequisite enabled', () => expect(Object.values(revision.qaRequirements).every(Boolean)).toBe(true));
});
