import './styles.css';
import { bearings, bearingForState, stateLabels } from './content.js';
import { reducePlayState, type GameEvent, type PlayState } from './state-machine.js';

const rootElement = document.querySelector<HTMLElement>('#experience');
const liveElement = document.querySelector<HTMLElement>('#route-announcement');
if (!rootElement || !liveElement) throw new Error('Wayfinder document shell is incomplete.');
const root = rootElement;
const live = liveElement;

let play: PlayState = { state: 'arrival', bearing: null };

function scene(bearing: PlayState['bearing']): string {
  const route = bearing ? `Route line: ${bearings[bearing].route}` : 'Route line: not yet chosen';
  return `<figure class="landscape" aria-labelledby="landscape-caption">
    <svg viewBox="0 0 900 420" role="img" aria-labelledby="scene-title scene-desc">
      <title id="scene-title">Abstract crossing and horizon</title>
      <desc id="scene-desc">${route}. A marker and layered horizon change position and shape with the selected bearing.</desc>
      <path class="sun-wash" d="M0 0h900v420H0z" />
      <path class="horizon horizon-far" d="M0 220 L145 172 L280 210 L430 148 L590 202 L742 158 L900 214 L900 420 L0 420 Z" />
      <path class="horizon horizon-near" d="M0 282 L165 232 L340 270 L520 218 L700 268 L900 238 L900 420 L0 420 Z" />
      <path class="route route-edge" d="M450 390 C350 350 270 310 170 258" />
      <path class="route route-wait" d="M450 390 C452 350 450 316 450 278" />
      <path class="route route-gap" d="M450 390 C560 338 646 294 746 245" />
      <g class="marker" aria-hidden="true"><path d="M438 280 L450 224 L462 280 Z"/><circle cx="450" cy="290" r="18"/></g>
    </svg>
    <figcaption id="landscape-caption">${route}</figcaption>
  </figure>`;
}

function controls(): string {
  const state = play.state;
  if (state === 'arrival') return '<button class="primary" data-event="start">Start crossing</button>';
  if (state === 'orientation') return '<button class="primary" data-event="ready">I am ready</button>';
  if (state === 'choice_prompt') return `<fieldset class="bearings"><legend>Choose one bearing</legend>${(Object.keys(bearings) as Array<keyof typeof bearings>).map((id) => `<button data-event="choose_${id}" aria-describedby="hint-${id}"><span>${bearings[id].label}</span><small id="hint-${id}">${bearings[id].hint}</small></button>`).join('')}</fieldset>`;
  if (state.startsWith('consequence_')) return '<button class="primary" data-event="continue">Continue to reflection</button>';
  return '<button class="primary" data-event="restart">Restart the crossing</button>';
}

function copy(): string {
  const state = play.state;
  if (state === 'arrival') return '<p class="eyebrow">A short crossing</p><h1 tabindex="-1">Three Bearings</h1><p>You reach a marker where the ground offers three ways of paying attention.</p>';
  if (state === 'orientation') return '<p class="eyebrow">Before choosing</p><h1 tabindex="-1">Read the ground</h1><p>The marker stands near. A ridge holds one edge of the horizon; an opening breaks the other. Choose by keyboard or touch: follow, wait, or cross.</p>';
  if (state === 'choice_prompt') return '<p class="eyebrow">One choice, no score</p><h1 tabindex="-1">Choose a bearing</h1><p>Each route changes what remains near, what opens ahead, and what the crossing asks you to notice.</p>';
  const bearing = bearingForState(state);
  if (!bearing) return '';
  const data = bearings[bearing];
  if (state.startsWith('consequence_')) return `<p class="eyebrow">Consequence</p><h1 tabindex="-1">${data.route}</h1><dl class="route-facts"><div><dt>Route</dt><dd data-testid="route">${data.route}</dd></div><div><dt>Atmosphere</dt><dd data-testid="atmosphere">${data.atmosphere}</dd></div></dl><p data-testid="consequence">${data.consequence}</p>`;
  return `<p class="eyebrow">Reflection</p><h1 tabindex="-1">${data.label}</h1><p data-testid="ending">${data.ending}</p><p class="route-recap">Route completed: ${data.route}. Atmosphere: ${data.atmosphere}.</p>`;
}

function render(announce = false): void {
  const bearing = bearingForState(play.state);
  root.dataset.state = play.state;
  root.dataset.bearing = bearing ?? 'none';
  root.innerHTML = `<section class="scene-panel">${scene(bearing)}</section><section class="story-panel" aria-labelledby="state-heading"><span class="state-label" id="state-heading">${stateLabels[play.state]}</span>${copy()}${controls()}</section>`;
  root.querySelectorAll<HTMLButtonElement>('button[data-event]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.event as GameEvent)));
  if (announce) {
    live.textContent = bearing ? `${stateLabels[play.state]}. Route: ${bearings[bearing].route}. Atmosphere: ${bearings[bearing].atmosphere}.` : stateLabels[play.state];
    root.querySelector<HTMLElement>('h1')?.focus();
  }
}

function dispatch(event: GameEvent): void {
  const next = reducePlayState(play, event);
  if (next === play) return;
  play = next;
  render(true);
}

render();
