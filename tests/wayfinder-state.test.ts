import { describe, expect, it } from 'vitest';
import { contractedTransitions, reducePlayState, states, terminalStates, transition, type Bearing, type GameEvent, type GameState, type PlayState } from '../pilots/wayfinder/src/state-machine.js';

const initial: PlayState = { state: 'arrival', preview: null, bearing: null };

describe('M4.2R deterministic state machine', () => {
  it('requires approach and active inspection before any commit', () => {
    expect(transition('arrival', 'start')).toBe('approach');
    expect(transition('approach', 'enter_marker')).toBe('survey');
    expect(transition('survey', 'commit_edge')).toBe('survey');
    expect(transition('survey', 'inspect_edge')).toBe('deliberation_edge');
  });

  it.each(['edge', 'wait', 'gap'] as const)('previews %s without committing and permits comparison', (bearing) => {
    const previewed = reducePlayState({ state: 'survey', preview: null, bearing: null }, `inspect_${bearing}`);
    expect(previewed).toEqual({ state: `deliberation_${bearing}`, preview: bearing, bearing: null });
    const other: Bearing = bearing === 'edge' ? 'wait' : 'edge';
    expect(reducePlayState(previewed, `inspect_${other}`)).toEqual({ state: `deliberation_${other}`, preview: other, bearing: null });
  });

  it.each(['edge', 'wait', 'gap'] as const)('separates %s commit, response, continuation, and ending', (bearing) => {
    const deliberating: PlayState = { state: `deliberation_${bearing}`, preview: bearing, bearing: null };
    const response = reducePlayState(deliberating, `commit_${bearing}`);
    expect(response).toEqual({ state: `response_${bearing}`, preview: bearing, bearing });
    expect(response.state).not.toBe(`ending_${bearing}`);
    const continuation = reducePlayState(response, 'enact');
    expect(continuation.state).toBe(`continuation_${bearing}`);
    expect(reducePlayState(continuation, 'reflect').state).toBe(`ending_${bearing}`);
  });

  it('fails closed for every uncontracted event pair', () => {
    const events: GameEvent[] = ['start', 'enter_marker', 'inspect_edge', 'inspect_wait', 'inspect_gap', 'commit_edge', 'commit_wait', 'commit_gap', 'enact', 'reflect'];
    for (const state of states) for (const event of events) {
      const legal = contractedTransitions.some((item) => item.from === state && item.event === event);
      if (!legal) expect(transition(state, event)).toBe(state);
    }
  });

  it('restarts only terminal states and clears preview and bearing', () => {
    expect(reducePlayState({ state: 'ending_gap', preview: 'gap', bearing: 'gap' }, 'restart')).toEqual(initial);
    expect(reducePlayState({ state: 'response_gap', preview: 'gap', bearing: 'gap' }, 'restart')).toEqual({ state: 'response_gap', preview: 'gap', bearing: 'gap' });
  });

  it.each(['edge', 'wait', 'gap'] as const)('replays the full %s sequence deterministically', (bearing) => {
    const events: GameEvent[] = ['start', 'enter_marker', `inspect_${bearing}`, `commit_${bearing}`, 'enact', 'reflect'];
    const run = (): PlayState => events.reduce<PlayState>(reducePlayState, initial);
    expect(run()).toEqual(run());
    expect(run()).toEqual({ state: `ending_${bearing}`, preview: bearing, bearing });
  });

  it('makes all 15 states and only three endings reachable', () => {
    const reachable = new Set<GameState>(['arrival']);
    for (let pass = 0; pass < states.length; pass += 1) for (const item of contractedTransitions) if (reachable.has(item.from)) reachable.add(item.to);
    expect([...reachable].sort()).toEqual([...states].sort());
    expect([...terminalStates].sort()).toEqual(['ending_edge', 'ending_gap', 'ending_wait']);
  });
});
