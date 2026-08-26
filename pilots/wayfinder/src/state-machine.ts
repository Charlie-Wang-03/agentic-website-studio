export const bearings = ['edge', 'wait', 'gap'] as const;
export type Bearing = (typeof bearings)[number];
export type Act = 1 | 2 | 3;
export type Phase = 'arrival' | 'approach' | 'deliberation' | 'response' | 'travel' | 'ending';
export type JourneyEvent = 'start' | 'reach_crossing' | `inspect_${Bearing}` | `commit_${Bearing}` | 'enact' | 'arrive' | 'reflect' | 'restart';

export interface WorldMemory { boundary: number; exposure: number; stillness: number; knowledge: number; movement: number }
export interface JourneyState { phase: Phase; act: Act; preview: Bearing | null; history: readonly Bearing[]; memory: WorldMemory }

export const initialMemory: WorldMemory = { boundary: 0, exposure: 0, stillness: 0, knowledge: 0, movement: 0 };
export const initialJourneyState: JourneyState = { phase: 'arrival', act: 1, preview: null, history: [], memory: initialMemory };

const effects: Record<Act, Record<Bearing, WorldMemory>> = {
  1: {
    edge: { boundary: 2, exposure: -1, stillness: 0, knowledge: 1, movement: 1 },
    wait: { boundary: 0, exposure: 0, stillness: 2, knowledge: 2, movement: -1 },
    gap: { boundary: -1, exposure: 2, stillness: -1, knowledge: 0, movement: 2 },
  },
  2: {
    edge: { boundary: 1, exposure: -1, stillness: 1, knowledge: 2, movement: 0 },
    wait: { boundary: 2, exposure: 0, stillness: 0, knowledge: 1, movement: 1 },
    gap: { boundary: -1, exposure: 2, stillness: -1, knowledge: 1, movement: 2 },
  },
  3: {
    edge: { boundary: 2, exposure: -1, stillness: 1, knowledge: 1, movement: -1 },
    wait: { boundary: 0, exposure: 1, stillness: 2, knowledge: 2, movement: 0 },
    gap: { boundary: -2, exposure: 2, stillness: -1, knowledge: 0, movement: 2 },
  },
};

function addMemory(left: WorldMemory, right: WorldMemory): WorldMemory {
  return { boundary: left.boundary + right.boundary, exposure: left.exposure + right.exposure, stillness: left.stillness + right.stillness, knowledge: left.knowledge + right.knowledge, movement: left.movement + right.movement };
}

export function isTerminal(state: JourneyState): boolean { return state.phase === 'ending'; }
export function isComplete(state: JourneyState): boolean { return state.history.length === 3 && state.phase === 'ending'; }
export function historyKey(state: JourneyState): string { return state.history.join('-') || 'none'; }
export function worldSignature(state: JourneyState): string {
  const route = state.history.map((bearing, index) => `${index + 1}${bearing[0]}`).join('.');
  return `${route || 'unmade'}|b${state.memory.boundary}|x${state.memory.exposure}|s${state.memory.stillness}|k${state.memory.knowledge}|m${state.memory.movement}`;
}
export function reflectionFamily(state: JourneyState): 'held-line' | 'read-light' | 'open-distance' | 'woven-course' {
  if (state.history.length !== 3) return 'woven-course';
  const [first, , last] = state.history;
  if (first === last && first === 'edge') return 'held-line';
  if (state.memory.knowledge >= 5 && state.memory.stillness >= 2) return 'read-light';
  if (state.memory.exposure >= 4 && state.memory.movement >= 4) return 'open-distance';
  return 'woven-course';
}

export function transition(current: JourneyState, event: JourneyEvent): JourneyState {
  if (event === 'restart') return current.phase === 'ending' ? initialJourneyState : current;
  if (current.phase === 'arrival' && event === 'start') return { ...current, phase: 'approach' };
  if (current.phase === 'approach' && event === 'reach_crossing') return { ...current, phase: 'deliberation' };
  if (event.startsWith('inspect_') && current.phase === 'deliberation') {
    const preview = event.slice('inspect_'.length) as Bearing;
    return bearings.includes(preview) ? { ...current, preview } : current;
  }
  if (event.startsWith('commit_') && current.phase === 'deliberation') {
    const bearing = event.slice('commit_'.length) as Bearing;
    if (!bearings.includes(bearing) || current.preview !== bearing || current.history.length !== current.act - 1) return current;
    return { ...current, phase: 'response', preview: null, history: [...current.history, bearing], memory: addMemory(current.memory, effects[current.act][bearing]) };
  }
  if (current.phase === 'response' && event === 'enact') return { ...current, phase: 'travel' };
  if (current.phase === 'travel' && current.act < 3 && event === 'arrive') return { ...current, act: (current.act + 1) as Act, phase: 'deliberation', preview: null };
  if (current.phase === 'travel' && current.act === 3 && event === 'reflect') return { ...current, phase: 'ending' };
  return current;
}
