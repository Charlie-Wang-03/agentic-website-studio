export const states = [
  'arrival', 'approach', 'survey',
  'deliberation_edge', 'deliberation_wait', 'deliberation_gap',
  'response_edge', 'response_wait', 'response_gap',
  'continuation_edge', 'continuation_wait', 'continuation_gap',
  'ending_edge', 'ending_wait', 'ending_gap',
] as const;

export type GameState = (typeof states)[number];
export type Bearing = 'edge' | 'wait' | 'gap';
export type GameEvent = 'start' | 'enter_marker' | 'inspect_edge' | 'inspect_wait' | 'inspect_gap' | 'commit_edge' | 'commit_wait' | 'commit_gap' | 'enact' | 'reflect' | 'restart';
export type GamePhase = 'arrival' | 'approach' | 'survey' | 'deliberation' | 'response' | 'continuation' | 'ending';

export interface PlayState { state: GameState; preview: Bearing | null; bearing: Bearing | null }
export interface Transition { from: GameState; event: Exclude<GameEvent, 'restart'>; to: GameState }

const inspections = (from: GameState): Transition[] => (['edge', 'wait', 'gap'] as const).map((bearing) => ({ from, event: `inspect_${bearing}`, to: `deliberation_${bearing}` }));

export const contractedTransitions: readonly Transition[] = [
  { from: 'arrival', event: 'start', to: 'approach' },
  { from: 'approach', event: 'enter_marker', to: 'survey' },
  ...inspections('survey'), ...inspections('deliberation_edge'), ...inspections('deliberation_wait'), ...inspections('deliberation_gap'),
  { from: 'deliberation_edge', event: 'commit_edge', to: 'response_edge' },
  { from: 'deliberation_wait', event: 'commit_wait', to: 'response_wait' },
  { from: 'deliberation_gap', event: 'commit_gap', to: 'response_gap' },
  { from: 'response_edge', event: 'enact', to: 'continuation_edge' },
  { from: 'response_wait', event: 'enact', to: 'continuation_wait' },
  { from: 'response_gap', event: 'enact', to: 'continuation_gap' },
  { from: 'continuation_edge', event: 'reflect', to: 'ending_edge' },
  { from: 'continuation_wait', event: 'reflect', to: 'ending_wait' },
  { from: 'continuation_gap', event: 'reflect', to: 'ending_gap' },
];

export const terminalStates: readonly GameState[] = ['ending_edge', 'ending_wait', 'ending_gap'];

export function bearingForState(state: GameState): Bearing | null {
  for (const bearing of ['edge', 'wait', 'gap'] as const) if (state.endsWith(`_${bearing}`)) return bearing;
  return null;
}

export function phaseForState(state: GameState): GamePhase {
  if (state.startsWith('deliberation_')) return 'deliberation';
  if (state.startsWith('response_')) return 'response';
  if (state.startsWith('continuation_')) return 'continuation';
  if (state.startsWith('ending_')) return 'ending';
  return state as GamePhase;
}

export function transition(current: GameState, event: GameEvent): GameState {
  if (event === 'restart') return terminalStates.includes(current) ? 'arrival' : current;
  return contractedTransitions.find((item) => item.from === current && item.event === event)?.to ?? current;
}

export function reducePlayState(current: PlayState, event: GameEvent): PlayState {
  const next = transition(current.state, event);
  if (event === 'restart' && next === 'arrival') return { state: 'arrival', preview: null, bearing: null };
  if (next === current.state) return current;
  const nextPreview = next.startsWith('deliberation_') ? bearingForState(next) : current.preview;
  const committed = event.startsWith('commit_') ? event.slice('commit_'.length) as Bearing : current.bearing;
  return { state: next, preview: nextPreview, bearing: committed };
}
