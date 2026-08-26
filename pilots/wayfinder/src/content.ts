import type { Bearing, GameState } from './state-machine.js';

export const bearings: Record<Bearing, { label: string; hint: string; route: string; atmosphere: string; consequence: string; ending: string }> = {
  edge: {
    label: 'Follow the cool edge', hint: 'Keep the long ridge at your shoulder.', route: 'Ridge-side traverse', atmosphere: 'Sheltered and close',
    consequence: 'The ridge rises beside you. Its shadow shortens the view, but every footfall has a clear boundary.',
    ending: 'A boundary can narrow the world and still help you move. You arrive knowing exactly what stayed beside you.',
  },
  wait: {
    label: 'Wait beside the marker', hint: 'Let the crossing change around a fixed point.', route: 'Marker hold', atmosphere: 'Still and watchful',
    consequence: 'You remain at the marker. The light crosses its face, and a route that was hidden becomes legible by staying still.',
    ending: 'Not every bearing begins with distance. You arrive at a clearer reading of the place you chose not to leave.',
  },
  gap: {
    label: 'Cross toward the bright gap', hint: 'Leave the marker for the opening ahead.', route: 'Open-gap crossing', atmosphere: 'Exposed and widening',
    consequence: 'The marker falls behind. The horizon opens into two banks, and the unshaded ground gives you room without cover.',
    ending: 'An opening offers no promise about what follows. You arrive with more horizon—and fewer edges to answer for you.',
  },
};

export const stateLabels: Record<GameState, string> = {
  arrival: 'Arrival', orientation: 'Orientation', choice_prompt: 'Choose a bearing',
  consequence_edge: 'Ridge-side consequence', consequence_wait: 'Marker consequence', consequence_gap: 'Open-gap consequence',
  ending_edge: 'Ridge-side ending', ending_wait: 'Marker ending', ending_gap: 'Open-gap ending',
};

export function bearingForState(state: GameState): Bearing | null {
  if (state.endsWith('_edge')) return 'edge';
  if (state.endsWith('_wait')) return 'wait';
  if (state.endsWith('_gap')) return 'gap';
  return null;
}
