import './styles.css';
import { copy, historyContext, localeFromBrowser, type Locale } from './content.js';
import { historyKey, initialJourneyState, reflectionFamily, transition, worldSignature, type Bearing, type JourneyEvent, type JourneyState } from './state-machine.js';

function required<T extends Element>(selector: string): T { const element = document.querySelector<T>(selector); if (!element) throw new Error(`Wayfinder shell is missing ${selector}.`); return element; }
const root = required<HTMLElement>('#experience');
const title = required<HTMLElement>('#story-title'); const kicker = required<HTMLElement>('#story-kicker'); const body = required<HTMLElement>('#story-body');
const stage = required<HTMLElement>('#stage-label'); const environment = required<HTMLElement>('#environment-label'); const sceneTitle = required<SVGTitleElement>('#scene-title'); const sceneDescription = required<SVGDescElement>('#scene-description');
const live = required<HTMLElement>('#route-announcement'); const controls = required<HTMLFieldSetElement>('#world-controls'); const legend = required<HTMLElement>('#world-legend');
const tradeoff = required<HTMLElement>('#tradeoff'); const offer = required<HTMLElement>('#tradeoff-offer'); const cost = required<HTMLElement>('#tradeoff-cost'); const recap = required<HTMLOListElement>('#journey-recap');
const hotspots = [...document.querySelectorAll<HTMLButtonElement>('.hotspot')]; const localeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-locale]')];
const buttons = { start: required<HTMLButtonElement>('#start-action'), approach: required<HTMLButtonElement>('#approach-action'), commit: required<HTMLButtonElement>('#commit-action'), enact: required<HTMLButtonElement>('#enact-action'), arrive: required<HTMLButtonElement>('#arrive-action'), reflect: required<HTMLButtonElement>('#reflect-action'), restart: required<HTMLButtonElement>('#restart-action') };
let state: JourneyState = initialJourneyState;
let locale: Locale = localeFromBrowser(navigator.language);

function show(button: HTMLButtonElement, visible: boolean): void { button.hidden = !visible; }
function activeBearing(): Bearing | null { return state.history[state.history.length - 1] ?? null; }

function render(announce = false, preserveFocus = false): void {
  const text = copy[locale]; const act = text.acts[state.act]; const selected = state.preview ?? activeBearing();
  document.documentElement.lang = locale; document.title = text.documentTitle; required<HTMLElement>('#skip-link').textContent = text.skip;
  required<HTMLElement>('#language-switch').setAttribute('aria-label', text.languageLabel); localeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.locale === locale)));
  required<HTMLElement>('#offer-label').textContent = text.offers; required<HTMLElement>('#cost-label').textContent = text.costs;
  root.dataset.phase = state.phase; root.dataset.act = String(state.act); root.dataset.history = historyKey(state); root.dataset.preview = state.preview ?? 'none'; root.dataset.signature = worldSignature(state);
  root.dataset.first = state.history[0] ?? 'none'; root.dataset.second = state.history[1] ?? 'none'; root.dataset.third = state.history[2] ?? 'none';
  root.dataset.boundary = String(state.memory.boundary); root.dataset.exposure = String(state.memory.exposure); root.dataset.knowledge = String(state.memory.knowledge);
  sceneTitle.textContent = text.documentTitle; sceneDescription.textContent = text.scene(state); live.lang = locale;
  controls.hidden = state.phase !== 'deliberation'; tradeoff.hidden = !(state.phase === 'deliberation' && state.preview); recap.hidden = state.phase !== 'ending'; for (const button of Object.values(buttons)) button.hidden = true;
  hotspots.forEach((button) => { const bearing = button.dataset.event?.slice('inspect_'.length) as Bearing; const choice = act.choices[bearing]; button.querySelector('span')!.textContent = choice.label; button.querySelector('small')!.textContent = choice.cue; button.setAttribute('aria-pressed', String(state.preview === bearing)); }); legend.textContent = act.legend;
  if (state.phase === 'arrival') { kicker.textContent = text.arrival.kicker; title.textContent = text.arrival.title; body.textContent = text.arrival.body; environment.textContent = text.arrival.environment; stage.textContent = text.arrival.kicker; buttons.start.textContent = text.arrival.start; show(buttons.start, true); }
  else if (state.phase === 'approach') { kicker.textContent = text.approach.kicker; title.textContent = text.approach.title; body.textContent = text.approach.body; environment.textContent = text.approach.environment; stage.textContent = text.approach.kicker; buttons.approach.textContent = text.approach.action; show(buttons.approach, true); }
  else if (state.phase === 'deliberation' && !state.preview) { kicker.textContent = text.bearingCount(state.act); title.textContent = act.title; body.textContent = `${act.situation} ${historyContext(locale, state)}`.trim(); environment.textContent = act.environment; stage.textContent = `${text.bearingCount(state.act)} · ${act.name}`; }
  else if (state.phase === 'deliberation' && state.preview) { const choice = act.choices[state.preview]; kicker.textContent = `${text.preview} · ${text.notCommitted}`; title.textContent = choice.label; body.textContent = choice.observation; offer.textContent = choice.offer; cost.textContent = choice.cost; environment.textContent = act.environment; stage.textContent = text.bearingCount(state.act); buttons.commit.dataset.event = `commit_${state.preview}`; buttons.commit.textContent = text.commit(choice.label); show(buttons.commit, true); }
  else if (state.phase === 'response' && selected) { const choice = act.choices[selected]; kicker.textContent = text.bearingCount(state.act); title.textContent = choice.responseTitle; body.textContent = choice.response; environment.textContent = act.environment; stage.textContent = `${act.name} · ${choice.label}`; buttons.enact.textContent = choice.enact; show(buttons.enact, true); }
  else if (state.phase === 'travel' && selected) { const choice = act.choices[selected]; kicker.textContent = act.name; title.textContent = choice.travelTitle; body.textContent = choice.travel; environment.textContent = act.environment; stage.textContent = text.bearingCount(state.act); if (state.act < 3) { buttons.arrive.textContent = act.arrive; show(buttons.arrive, true); } else { buttons.reflect.textContent = act.arrive; show(buttons.reflect, true); } }
  else { kicker.textContent = text.ending.kicker; title.textContent = text.ending.title; body.textContent = text.families[reflectionFamily(state)]; environment.textContent = text.ending.recapLabel; stage.textContent = text.ending.kicker; recap.replaceChildren(...state.history.map((bearing, index) => { const item = document.createElement('li'); item.textContent = `${index + 1}. ${text.acts[(index + 1) as 1 | 2 | 3].choices[bearing].label}`; return item; })); buttons.restart.textContent = text.ending.restart; show(buttons.restart, true); }
  if (announce) { live.textContent = text.announcement(stage.textContent ?? '', environment.textContent ?? ''); if (!preserveFocus) title.focus(); }
}

function dispatch(event: JourneyEvent): void { const next = transition(state, event); if (next === state) return; state = next; render(true, event.startsWith('inspect_')); if (event === 'reach_crossing' || event === 'arrive') hotspots[0]?.focus(); }
document.querySelectorAll<HTMLButtonElement>('button[data-event]').forEach((button) => button.addEventListener('click', () => dispatch(button.dataset.event as JourneyEvent)));
localeButtons.forEach((button) => button.addEventListener('click', () => { locale = button.dataset.locale as Locale; render(true, true); button.focus(); }));
render();
