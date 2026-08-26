import { describe, expect, it } from 'vitest';
import { contractedTransitions, reducePlayState, states, terminalStates, transition, type GameEvent, type GameState } from '../pilots/wayfinder/src/state-machine.js';

describe('Wayfinder deterministic state machine', () => {
  it.each([
    ['arrival', 'start', 'orientation'], ['orientation', 'ready', 'choice_prompt'],
    ['choice_prompt', 'choose_edge', 'consequence_edge'], ['choice_prompt', 'choose_wait', 'consequence_wait'], ['choice_prompt', 'choose_gap', 'consequence_gap'],
    ['consequence_edge', 'continue', 'ending_edge'], ['consequence_wait', 'continue', 'ending_wait'], ['consequence_gap', 'continue', 'ending_gap'],
  ] as Array<[GameState, GameEvent, GameState]>)('maps %s + %s to %s', (from, event, to) => expect(transition(from, event)).toBe(to));

  it('fails closed for every invalid state/event pair', () => {
    const events: GameEvent[] = ['start', 'ready', 'choose_edge', 'choose_wait', 'choose_gap', 'continue'];
    for (const state of states) for (const event of events) {
      const legal = contractedTransitions.some((item) => item.from === state && item.event === event);
      if (!legal) expect(transition(state, event)).toBe(state);
    }
  });

  it('restarts only terminal states and clears the confirmed bearing', () => {
    expect(reducePlayState({ state: 'ending_edge', bearing: 'edge' }, 'restart')).toEqual({ state: 'arrival', bearing: null });
    expect(reducePlayState({ state: 'choice_prompt', bearing: null }, 'restart')).toEqual({ state: 'choice_prompt', bearing: null });
  });

  it.each(['edge', 'wait', 'gap'] as const)('replays the %s branch identically', (bearing) => {
    const events: GameEvent[] = ['start', 'ready', `choose_${bearing}`, 'continue'];
    const run = () => events.reduce(reducePlayState, { state: 'arrival', bearing: null } as const);
    expect(run()).toEqual(run());
    expect(run()).toEqual({ state: `ending_${bearing}`, bearing });
  });

  it('makes exactly the three expected terminal states reachable', () => {
    const reachable = new Set<GameState>(['arrival']);
    for (let index = 0; index < states.length; index += 1) for (const item of contractedTransitions) if (reachable.has(item.from)) reachable.add(item.to);
    expect([...reachable].sort()).toEqual([...states].sort());
    expect([...terminalStates].sort()).toEqual(['ending_edge', 'ending_gap', 'ending_wait']);
  });
});
