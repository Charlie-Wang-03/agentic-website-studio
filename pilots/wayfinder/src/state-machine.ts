export const states = [
  'arrival', 'orientation', 'choice_prompt',
  'consequence_edge', 'consequence_wait', 'consequence_gap',
  'ending_edge', 'ending_wait', 'ending_gap',
] as const;

export type GameState = (typeof states)[number];
export type Bearing = 'edge' | 'wait' | 'gap';
export type GameEvent = 'start' | 'ready' | 'choose_edge' | 'choose_wait' | 'choose_gap' | 'continue' | 'restart';

export interface PlayState { state: GameState; bearing: Bearing | null }
export interface Transition { from: GameState; event: Exclude<GameEvent, 'restart'>; to: GameState }

export const contractedTransitions: readonly Transition[] = [
  { from: 'arrival', event: 'start', to: 'orientation' },
  { from: 'orientation', event: 'ready', to: 'choice_prompt' },
  { from: 'choice_prompt', event: 'choose_edge', to: 'consequence_edge' },
  { from: 'choice_prompt', event: 'choose_wait', to: 'consequence_wait' },
  { from: 'choice_prompt', event: 'choose_gap', to: 'consequence_gap' },
  { from: 'consequence_edge', event: 'continue', to: 'ending_edge' },
  { from: 'consequence_wait', event: 'continue', to: 'ending_wait' },
  { from: 'consequence_gap', event: 'continue', to: 'ending_gap' },
] as const;

export const terminalStates: readonly GameState[] = ['ending_edge', 'ending_wait', 'ending_gap'];

export function transition(current: GameState, event: GameEvent): GameState {
  if (event === 'restart') return terminalStates.includes(current) ? 'arrival' : current;
  return contractedTransitions.find((item) => item.from === current && item.event === event)?.to ?? current;
}

export function reducePlayState(current: PlayState, event: GameEvent): PlayState {
  const next = transition(current.state, event);
  if (next === current.state) return current;
  if (event === 'restart') return { state: 'arrival', bearing: null };
  const selected = event.startsWith('choose_') ? event.slice('choose_'.length) as Bearing : current.bearing;
  return { state: next, bearing: selected };
}
