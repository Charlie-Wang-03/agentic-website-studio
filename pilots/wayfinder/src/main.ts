import './styles.css';
import { bearings, commonCopy, stageLabels } from './content.js';
import { bearingForState, phaseForState, reducePlayState, type Bearing, type GameEvent, type PlayState } from './state-machine.js';

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Wayfinder shell is missing ${selector}.`);
  return element;
}

const root = required<HTMLElement>('#experience');
const title = required<HTMLElement>('#story-title');
const kicker = required<HTMLElement>('#story-kicker');
const body = required<HTMLElement>('#story-body');
const stageLabel = required<HTMLElement>('#stage-label');
const environmentLabel = required<HTMLElement>('#environment-label');
const sceneDescription = required<SVGDescElement>('#scene-description');
const live = required<HTMLElement>('#route-announcement');
const worldControls = required<HTMLFieldSetElement>('#world-controls');
const tradeoff = required<HTMLElement>('#tradeoff');
const tradeoffOffer = required<HTMLElement>('#tradeoff-offer');
const tradeoffCost = required<HTMLElement>('#tradeoff-cost');
const actionButtons = {
  start: required<HTMLButtonElement>('#start-action'), approach: required<HTMLButtonElement>('#approach-action'),
  commit: required<HTMLButtonElement>('#commit-action'), enact: required<HTMLButtonElement>('#enact-action'),
  reflect: required<HTMLButtonElement>('#reflect-action'), restart: required<HTMLButtonElement>('#restart-action'),
};
const hotspotButtons = [...document.querySelectorAll<HTMLButtonElement>('.hotspot')];
let play: PlayState = { state: 'arrival', preview: null, bearing: null };

function setVisible(button: HTMLButtonElement, visible: boolean): void { button.hidden = !visible; }

function render(announce = false, preserveFocus = false): void {
  const phase = phaseForState(play.state);
  const stateBearing = bearingForState(play.state);
  const worldBearing = play.bearing ?? (phase === 'deliberation' ? play.preview : null);
  root.dataset.state = play.state;
  root.dataset.phase = phase;
  root.dataset.preview = play.preview ?? 'none';
  root.dataset.bearing = play.bearing ?? 'none';
  root.dataset.geometry = play.bearing ? bearings[play.bearing].geometryState : 'common_crossing';
  root.dataset.markerRelationship = play.bearing ? bearings[play.bearing].markerRelationship : 'marker_ahead';
  stageLabel.textContent = stageLabels[play.state];

  worldControls.hidden = !['survey', 'deliberation'].includes(phase);
  hotspotButtons.forEach((button) => {
    const bearing = button.dataset.event?.slice('inspect_'.length) as Bearing;
    button.setAttribute('aria-pressed', String(play.preview === bearing));
  });
  tradeoff.hidden = phase !== 'deliberation';
  for (const button of Object.values(actionButtons)) button.hidden = true;

  if (play.state === 'arrival' || play.state === 'approach' || play.state === 'survey') {
    const copy = commonCopy[play.state];
    kicker.textContent = copy.kicker; title.textContent = copy.title; body.textContent = copy.body; environmentLabel.textContent = copy.environment;
    sceneDescription.textContent = `${copy.environment}. A ridge, stone marker, opening, traveler, and moving light share one persistent crossing.`;
    setVisible(play.state === 'arrival' ? actionButtons.start : actionButtons.approach, play.state !== 'survey');
  } else if (phase === 'deliberation' && worldBearing) {
    const content = bearings[worldBearing];
    kicker.textContent = 'Bearing preview · not committed'; title.textContent = content.label; body.textContent = content.observation;
    tradeoffOffer.textContent = content.offer; tradeoffCost.textContent = content.cost; environmentLabel.textContent = `Inspecting ${content.label.toLowerCase()}`;
    sceneDescription.textContent = `Previewing ${content.label}. ${content.observation} No bearing has been committed.`;
    actionButtons.commit.dataset.event = `commit_${worldBearing}`; actionButtons.commit.textContent = `Commit to ${content.label.toLowerCase()}`; setVisible(actionButtons.commit, true);
  } else if (stateBearing) {
    const content = bearings[stateBearing];
    environmentLabel.textContent = content.environment;
    sceneDescription.textContent = `${content.route}. ${content.environment}. ${content.markerRelationship.replaceAll('_', ' ')}.`;
    if (phase === 'response') {
      kicker.textContent = 'The bearing is committed'; title.textContent = content.responseTitle; body.textContent = content.response;
      actionButtons.enact.textContent = content.enactLabel; setVisible(actionButtons.enact, true);
    } else if (phase === 'continuation') {
      kicker.textContent = 'Living the bearing'; title.textContent = content.continuationTitle; body.textContent = content.continuation; setVisible(actionButtons.reflect, true);
    } else {
      kicker.textContent = 'Reflection'; title.textContent = content.label; body.textContent = content.ending; setVisible(actionButtons.restart, true);
    }
  }

  if (announce) {
    const announcement = phase === 'deliberation' && worldBearing
      ? `Previewing ${bearings[worldBearing].label}. Offers ${bearings[worldBearing].offer}. Costs ${bearings[worldBearing].cost}. Not committed.`
      : `${stageLabels[play.state]}. ${environmentLabel.textContent ?? ''}`;
    live.textContent = announcement;
    if (!preserveFocus) title.focus();
  }
}

function dispatch(event: GameEvent): void {
  const next = reducePlayState(play, event);
  if (next === play) return;
  play = next;
  render(true, event.startsWith('inspect_'));
  if (event === 'enter_marker') hotspotButtons[0]?.focus();
}

document.querySelectorAll<HTMLButtonElement>('button[data-event]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.event as GameEvent)));
render();
