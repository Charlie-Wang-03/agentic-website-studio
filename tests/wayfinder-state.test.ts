import { describe, expect, it } from 'vitest';
import { bearings, historyKey, initialJourneyState, isComplete, reflectionFamily, transition, worldSignature, type Bearing, type JourneyEvent, type JourneyState } from '../pilots/wayfinder/src/state-machine.js';
function commit(state: JourneyState, bearing: Bearing): JourneyState { return transition(transition(state, `inspect_${bearing}`), `commit_${bearing}`); }
function enter(): JourneyState { return transition(transition(initialJourneyState, 'start'), 'reach_crossing'); }
function complete(history: readonly Bearing[]): JourneyState { let state = enter(); history.forEach((bearing, index) => { state = commit(state, bearing); state = transition(state, 'enact'); state = transition(state, index === 2 ? 'reflect' : 'arrive'); }); return state; }
const histories = bearings.flatMap((first) => bearings.flatMap((second) => bearings.map((third) => [first, second, third] as const)));
describe('M4.3 deterministic journey model', () => {
  it('requires arrival and approach before deliberation', () => { expect(transition(initialJourneyState, 'commit_edge')).toBe(initialJourneyState); expect(enter().phase).toBe('deliberation'); });
  it('keeps preview reversible and uncommitted', () => { const state = enter(); const edge = transition(state, 'inspect_edge'); const wait = transition(edge, 'inspect_wait'); expect(edge.history).toEqual([]); expect(wait.preview).toBe('wait'); expect(wait.history).toEqual([]); });
  it('requires the matching preview to commit', () => { const state = transition(enter(), 'inspect_edge'); expect(transition(state, 'commit_wait')).toBe(state); expect(transition(state, 'commit_edge').history).toEqual(['edge']); });
  it('makes commits irreversible except after complete restart', () => { const state = commit(enter(), 'edge'); for (const event of ['inspect_wait', 'commit_wait', 'restart'] as JourneyEvent[]) expect(transition(state, event)).toBe(state); });
  it('requires exactly three commits to finish', () => { const state = complete(['edge', 'wait', 'gap']); expect(state.history).toHaveLength(3); expect(isComplete(state)).toBe(true); });
  it('cannot reach an ending before Bearing III', () => { let state = enter(); state = commit(state, 'edge'); state = transition(state, 'enact'); expect(transition(state, 'reflect').phase).toBe('travel'); });
  it('all 27 histories are distinct and valid', () => { expect(new Set(histories.map((history) => historyKey(complete(history)))).size).toBe(27); });
  it('all 27 histories terminate', () => { for (const history of histories) expect(isComplete(complete(history))).toBe(true); });
  it('all 27 histories have deterministic signatures', () => { for (const history of histories) expect(worldSignature(complete(history))).toBe(worldSignature(complete(history))); });
  it('final representation depends on all three positions', () => { expect(new Set(histories.map((history) => worldSignature(complete(history)))).size).toBe(27); });
  it('Bearing I remains observable with identical II and III', () => { const left = complete(['edge', 'wait', 'gap']); const right = complete(['gap', 'wait', 'gap']); expect(left.memory).not.toEqual(right.memory); expect(worldSignature(left)).not.toBe(worldSignature(right)); });
  it('earlier histories do not collapse before the ending', () => { let a = enter(); let b = enter(); for (const bearing of ['edge', 'wait'] as Bearing[]) { a = transition(commit(a, bearing), 'enact'); a = transition(a, 'arrive'); } for (const bearing of ['gap', 'wait'] as Bearing[]) { b = transition(commit(b, bearing), 'enact'); b = transition(b, 'arrive'); } expect(a.act).toBe(3); expect(a.memory).not.toEqual(b.memory); });
  it('restart restores the canonical initial state', () => { expect(transition(complete(['wait', 'wait', 'wait']), 'restart')).toEqual(initialJourneyState); });
  it('invalid events fail safely', () => { for (const event of ['arrive', 'reflect', 'enact', 'commit_gap'] as JourneyEvent[]) expect(transition(initialJourneyState, event)).toBe(initialJourneyState); });
  it('contains no random dependency', async () => { const source = await import('node:fs/promises').then((fs) => fs.readFile('pilots/wayfinder/src/state-machine.ts', 'utf8')); expect(source).not.toContain('Math.random'); expect(source).not.toContain('crypto.random'); });
  it('uses bounded reflection families rather than majority endings', () => { const families = new Set(histories.map((history) => reflectionFamily(complete(history)))); expect(families.size).toBeGreaterThan(1); expect(families.size).toBeLessThan(27); });
});
