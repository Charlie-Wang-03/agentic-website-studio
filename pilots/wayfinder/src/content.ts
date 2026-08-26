import type { Bearing, GameState } from './state-machine.js';

export interface BearingContent {
  label: string;
  observation: string;
  offer: string;
  cost: string;
  route: string;
  environment: string;
  geometryState: string;
  markerRelationship: string;
  responseTitle: string;
  response: string;
  enactLabel: string;
  continuationTitle: string;
  continuation: string;
  ending: string;
}

export const bearings: Record<Bearing, BearingContent> = {
  edge: {
    label: 'Ridge edge',
    observation: 'Wind thins beside the ridge. Its bend is readable; the ground beyond the bend is not.',
    offer: 'cover and a boundary you can follow', cost: 'a shortened view beyond the turn',
    route: 'A bending line along the ridge', environment: 'Sheltered, close, partly occluded',
    geometryState: 'ridge_dominant_narrow_aperture', markerRelationship: 'marker_near_behind_bend',
    responseTitle: 'The ridge takes the sky', response: 'The wind drops. Stone fills the left of your view, and the route turns before you can see its end.',
    enactLabel: 'Follow the sheltered bend', continuationTitle: 'Inside the boundary',
    continuation: 'You move with one shoulder near stone. The marker stays visible through the bend, while the open ground disappears behind the ridge.',
    ending: 'You reach the far side with less horizon and a clear account of what guided you.',
  },
  wait: {
    label: 'Stone marker',
    observation: 'The marker’s shadow is moving. A faint line meets its base, but the lowering light has not cleared it yet.',
    offer: 'time to read what movement conceals', cost: 'distance while the crossing changes without you',
    route: 'A transverse line revealed by stillness', environment: 'Stationary, lowering light, newly legible',
    geometryState: 'fixed_view_moving_light_cross_route', markerRelationship: 'marker_fixed_shadow_rotating',
    responseTitle: 'The world moves first', response: 'You stay. The light lowers across the marker, its shadow swings, and a cross-route emerges from the ground.',
    enactLabel: 'Stay through the changing light', continuationTitle: 'At the still point',
    continuation: 'The ridge darkens and the opening pales. Your position does not change, but the line at your feet becomes complete.',
    ending: 'You leave the marker with no added distance behind you and one more direction made visible.',
  },
  gap: {
    label: 'Open gap',
    observation: 'The gap gives a straight view to distant ground. No ridge interrupts the line, and no ridge interrupts the wind.',
    offer: 'a direct line and the widest view', cost: 'open ground without nearby cover',
    route: 'A long line through the opening', environment: 'Exposed, widening, wind-crossed',
    geometryState: 'banks_receding_wide_aperture', markerRelationship: 'marker_small_and_receding',
    responseTitle: 'The opening widens', response: 'The marker falls behind. The horizon banks separate, and wind crosses the full width of the route ahead.',
    enactLabel: 'Cross the open ground', continuationTitle: 'Beyond the marker',
    continuation: 'You walk into the gap. The route remains visible far ahead; behind you, the marker becomes one small point in a wide field.',
    ending: 'You reach the next rise carrying a long view and no close boundary to confirm it.',
  },
};

export const commonCopy: Record<'arrival' | 'approach' | 'survey', { kicker: string; title: string; body: string; environment: string }> = {
  arrival: { kicker: 'Dusk · an erased track', title: 'Three Bearings', body: 'Wind has taken the path behind you. One stone marker remains where the ground divides.', environment: 'Wind across unmarked ground' },
  approach: { kicker: 'Approach', title: 'The last track disappears', body: 'As you move closer, the ridge cuts one side of the wind. The marker holds the center. An opening keeps the far ground in view.', environment: 'Ridge, marker, and gap ahead' },
  survey: { kicker: 'At the marker', title: 'Read the crossing', body: 'Inspect each part of the world. Learn what it offers and what it withholds; choose when one tradeoff feels worth carrying.', environment: 'Three possible relationships to the ground' },
};

export const stageLabels: Record<GameState, string> = {
  arrival: 'Arrival', approach: 'Approach', survey: 'Observation',
  deliberation_edge: 'Considering the ridge', deliberation_wait: 'Considering stillness', deliberation_gap: 'Considering the opening',
  response_edge: 'World response · edge', response_wait: 'World response · wait', response_gap: 'World response · gap',
  continuation_edge: 'Living the edge', continuation_wait: 'Living the wait', continuation_gap: 'Living the gap',
  ending_edge: 'Reflection · edge', ending_wait: 'Reflection · wait', ending_gap: 'Reflection · gap',
};
