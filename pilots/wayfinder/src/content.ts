import type { Act, Bearing, JourneyState } from './state-machine.js';

export type Locale = 'zh-CN' | 'en';
export const locales: readonly Locale[] = ['zh-CN', 'en'];
export interface ChoiceCopy { label: string; cue: string; observation: string; offer: string; cost: string; responseTitle: string; response: string; enact: string; travelTitle: string; travel: string }
export interface ActCopy { name: string; title: string; situation: string; environment: string; legend: string; choices: Record<Bearing, ChoiceCopy>; arrive: string }
export interface LocaleCopy {
  documentTitle: string; skip: string; languageLabel: string; zhLabel: string; enLabel: string; offers: string; costs: string; preview: string; notCommitted: string;
  commit: (label: string) => string; bearingCount: (act: Act) => string;
  arrival: { kicker: string; title: string; body: string; environment: string; start: string };
  approach: { kicker: string; title: string; body: string; environment: string; action: string };
  acts: Record<Act, ActCopy>;
  ending: { kicker: string; title: string; restart: string; recapLabel: string };
  families: Record<'held-line' | 'read-light' | 'open-distance' | 'woven-course', string>;
  scene: (state: JourneyState) => string; announcement: (stage: string, environment: string) => string;
}

const en: LocaleCopy = {
  documentTitle: 'Three Bearings', skip: 'Skip to the journey', languageLabel: 'Language', zhLabel: '中文', enLabel: 'EN', offers: 'Makes possible', costs: 'Leaves uncertain', preview: 'Bearing preview', notCommitted: 'not committed',
  commit: (label) => `Commit to ${label.toLowerCase()}`, bearingCount: (act) => `Bearing ${['I', 'II', 'III'][act - 1]} · ${act} of 3`,
  arrival: { kicker: 'Dusk · an erased track', title: 'Three Bearings', body: 'Wind has taken the path behind you. One stone marker remains where the ground divides.', environment: 'Wind across unmarked ground', start: 'Enter the crossing' },
  approach: { kicker: 'Approach', title: 'The last track disappears', body: 'Near the marker, the ridge cuts one side of the wind. An opening holds the far ground. The world asks to be read before it is crossed.', environment: 'Ridge, marker, and gap ahead', action: 'Walk into the marker’s shade' },
  acts: {
    1: { name: 'Orientation', title: 'Read the first crossing', situation: 'The ridge, marker, and opening each keep something from you. Inspect them. Choose what kind of uncertainty to carry.', environment: 'The first marker at divided ground', legend: 'Inspect the first three bearings', arrive: 'Follow the changed ground', choices: {
      edge: { label: 'Ridge edge', cue: 'Shelter · shortened view', observation: 'Wind thins beside the ridge. Its bend is readable; the ground beyond it is not.', offer: 'cover and a boundary you can follow', cost: 'the view beyond the turn', responseTitle: 'The ridge takes the sky', response: 'Wind drops. Stone fills the left of your view, and the first line bends out of sight.', enact: 'Follow the sheltered bend', travelTitle: 'Inside the boundary', travel: 'You move with one shoulder near stone. Behind you, the marker remains framed by the bend.' },
      wait: { label: 'Stone marker', cue: 'Stillness · changing signs', observation: 'The marker’s shadow is moving. A faint line reaches its base, but the lowering light has not cleared it yet.', offer: 'time to read what movement conceals', cost: 'distance while the crossing changes without you', responseTitle: 'The world moves first', response: 'You stay. Shadow swings from the stone and a cross-route separates from the ground.', enact: 'Stay through the changing light', travelTitle: 'From the still point', travel: 'When you leave, the completed shadow-line remains behind: a direction learned without walking it.' },
      gap: { label: 'Open gap', cue: 'Long view · no cover', observation: 'The gap gives a straight view to distant ground. No ridge interrupts the line—or the wind.', offer: 'a direct line and the widest view', cost: 'open ground without nearby cover', responseTitle: 'The opening widens', response: 'The marker falls behind. The horizon banks separate and wind crosses the full route.', enact: 'Cross the open ground', travelTitle: 'Beyond the marker', travel: 'You cross with the far notch held ahead. The marker becomes a small gold point in a wide field.' },
    } },
    2: { name: 'Consequence', title: 'Where the water divides', situation: 'A shallow watercourse cuts the route. The line you carried here changes what can be seen on its farther bank.', environment: 'Running water below the remembered first route', legend: 'Inspect three ways through the watercourse', arrive: 'Reach the final rise', choices: {
      edge: { label: 'Read the pools', cue: 'Evidence · fading light', observation: 'Still pools hold the sky and traces of recent crossings. Reading them takes the remaining light.', offer: 'signs of where others found ground', cost: 'daylight for the climb beyond', responseTitle: 'Small marks gather', response: 'Ripples settle. Hoofprints and one human heel appear where glare had hidden them.', enact: 'Trace the quiet pools', travelTitle: 'A route assembled', travel: 'You step between marks rather than along a single path. The first landmark stays aligned behind you.' },
      wait: { label: 'Build a marker', cue: 'Return line · weight to carry', observation: 'Flat stones could make a cairn visible from either bank. Building it means crossing with less light and cold hands.', offer: 'a landmark that survives your departure', cost: 'time and warmth before the upper ground', responseTitle: 'A second point stands', response: 'Stone settles on stone. The new cairn catches the same low gold as the first marker behind you.', enact: 'Cross by the new cairn', travelTitle: 'Between two points', travel: 'The two markers hold a line across water. Your route now has a direction it did not have before.' },
      gap: { label: 'Use the current', cue: 'Momentum · surrendered line', observation: 'The current runs diagonally toward a lower opening. It offers speed, but not the destination you can presently see.', offer: 'movement through the easiest water', cost: 'the known line on the farther bank', responseTitle: 'The water turns the route', response: 'You enter with the current. The first route slides sideways behind reeds and the lower opening grows.', enact: 'Move with the current', travelTitle: 'Along the moving line', travel: 'Water chooses each next foothold before you do. What you knew remains visible only in brief gaps.' },
    } },
    3: { name: 'Commitment', title: 'The last light on the rise', situation: 'From the final rise, the first marker and the watercourse share one view. Darkness will preserve only the relation you choose now.', environment: 'A final rise holding the accumulated journey', legend: 'Inspect three final commitments', arrive: 'Carry the journey onward', choices: {
      edge: { label: 'Turn toward the markers', cue: 'Retraceable line · unfinished distance', observation: 'The markers can hold a route back through darkness. Turning toward them leaves the unseen country for another day.', offer: 'a line that can be followed in reverse', cost: 'the farther ground beyond this rise', responseTitle: 'The landmarks answer', response: 'One gold point finds another. The route behind becomes a connected shape instead of separate memories.', enact: 'Face the returning line', travelTitle: 'What can be returned through', travel: 'You test the first steps back. Each earlier decision appears again from its opposite side.' },
      wait: { label: 'Raise the dusk signal', cue: 'Shared position · exposed flame', observation: 'A small flame would place you in the landscape for anyone watching. It would also make the exposed rise visible from below.', offer: 'a position that another traveler could read', cost: 'concealment in the coming dark', responseTitle: 'A light joins the ground', response: 'The signal catches. Water, cairn, ridge, and open field briefly share the same warm edge.', enact: 'Keep the signal through dusk', travelTitle: 'Visible from elsewhere', travel: 'You remain until the first stars. The world does not disclose an answer, but it now contains your location.' },
      gap: { label: 'Cross the dark saddle', cue: 'Unseen distance · no return sign', observation: 'The saddle keeps a pale seam after the rest of the horizon dims. Beyond it, no landmark is visible.', offer: 'distance while the last seam remains', cost: 'a route back that the night can erase', responseTitle: 'The horizon opens once more', response: 'You cross the crest. Every earlier landmark drops below the same dark line, but their arrangement stays with you.', enact: 'Enter the dark saddle', travelTitle: 'Beyond the held view', travel: 'The ground ahead is new. You place each step with the boundaries, pauses, and openings already learned.' },
    } },
  },
  ending: { kicker: 'Journey reflection', title: 'The route you made', restart: 'Restart entire journey', recapLabel: 'Three bearings carried' },
  families: { 'held-line': 'You leave with a route held at both ends. Its certainty came from what you agreed not to see.', 'read-light': 'Your distance is modest, but the journey has become legible in changing light: not one route, but relations you can still read.', 'open-distance': 'The landmarks fall behind, yet the exposed crossings have taught your body a direction no marker could keep for you.', 'woven-course': 'No single bearing explains the route. Boundary, pause, and open ground remain joined in the way you now read the dark.' },
  scene: (state) => `A continuous dusk landscape at act ${state.act}. ${state.history.length} of three bearings are committed. Earlier route marks remain visible.`, announcement: (stage, environment) => `${stage}. ${environment}`,
};

const zh: LocaleCopy = {
  ...en, documentTitle: '三次定向', skip: '跳到旅程内容', languageLabel: '语言', offers: '由此可得', costs: '仍须承担', preview: '路线预览', notCommitted: '尚未决定', commit: (label) => `决定：${label}`, bearingCount: (act) => `第${['一', '二', '三'][act - 1]}次定向 · 共三次`,
  arrival: { kicker: '黄昏 · 路痕已失', title: '三次定向', body: '风抹去了身后的路。前方地势分开，只剩一块石标。', environment: '风掠过无路的荒地', start: '走进岔地' },
  approach: { kicker: '靠近', title: '最后的路痕消失了', body: '走近石标，山脊挡住一侧的风，缺口仍露着远处。这里要先读懂，才能穿过。', environment: '前方是山脊、石标与缺口', action: '走到石标的影子里' },
  acts: {
    1: { name: '辨向', title: '读第一处岔地', situation: '山脊、石标和缺口，各自遮住一些东西。逐一察看，再决定要带着哪一种不确定上路。', environment: '地势分开的第一块石标', legend: '察看第一次定向的三条路线', arrive: '沿变化后的地势前行', choices: {
      edge: { label: '贴着山脊', cue: '有遮蔽 · 视野变短', observation: '山脊边的风薄了。转弯本身看得清，弯后的地面却看不见。', offer: '可沿着走的边界和避风处', cost: '转弯以后的视野', responseTitle: '山脊收走了天空', response: '风声低下去。左侧只剩近在身边的岩石，第一条路线弯出视线。', enact: '沿避风的弯道走', travelTitle: '在边界以内', travel: '你让一侧肩膀贴近岩石。回头时，石标仍被弯道框在身后。' },
      wait: { label: '留在石标旁', cue: '停留 · 等迹象变化', observation: '石标的影子正在移动。一道浅痕伸到它脚下，但低斜的光还没把浅痕照清。', offer: '看见行走时会错过的迹象', cost: '任岔地自行变化的这段时间', responseTitle: '世界先动了', response: '你没有走。石影慢慢转开，一道横向的旧路从地面分离出来。', enact: '等光线完成变化', travelTitle: '从静止处出发', travel: '离开时，完整的影线留在身后——有一个方向，你没有走过，却已经认得。' },
      gap: { label: '穿过开阔地', cue: '看得远 · 无处避风', observation: '缺口直通远处，没有山脊截断视线，也没有山脊截断风。', offer: '最直接的路线和最宽的视野', cost: '没有近处遮蔽的开阔地', responseTitle: '缺口继续张开', response: '石标退到身后。两侧地平线分开，风横穿整条路线。', enact: '穿过迎风的地面', travelTitle: '越过石标', travel: '你始终对着远处的凹口前行。身后，石标缩成宽阔地面上的一点金色。' },
    } },
    2: { name: '后果', title: '水流分路的地方', situation: '一道浅水横在路上。你带到这里的那条线，改变了对岸哪些地方能够被看见。', environment: '第一段路线的记忆下方，水正流过', legend: '察看穿过水道的三种方式', arrive: '到达最后一道高地', choices: {
      edge: { label: '细看静水', cue: '留下的迹象 · 渐少的天光', observation: '静水映着天空，也藏着最近有人经过的痕迹。要读清它们，会用掉剩下的光。', offer: '别人找到落脚处的证据', cost: '翻越前方高地所需的天光', responseTitle: '细小的痕迹聚拢了', response: '波纹平下去。蹄印和一枚人的脚跟印，从刚才的反光里显出来。', enact: '沿静水边的痕迹走', travelTitle: '拼出的路线', travel: '你从一处痕迹走向下一处，而不是跟随一条完整的路。第一处地标仍在身后对齐。' },
      wait: { label: '垒一座新石标', cue: '可返回的线 · 手中的重量', observation: '扁石可以垒成两岸都看得见的小石堆。只是等它站稳，过水时天会更暗，手也会更冷。', offer: '一处在你离开后仍存在的地标', cost: '登上高地前的时间和暖意', responseTitle: '第二个点站住了', response: '石块逐一安稳。新石堆接住低处的金光，与身后第一块石标遥遥相应。', enact: '借新石标的方向过水', travelTitle: '两个点之间', travel: '两块石标把水面两边连成一线。你的路线第一次有了可以回看的方向。' },
      gap: { label: '顺着水流', cue: '保持速度 · 放开原有方向', observation: '水流斜向下方的开口，走起来省力，却并不通往眼下看得见的目的地。', offer: '借最浅的水势继续移动', cost: '对岸那条已经认出的线', responseTitle: '水把路线转开了', response: '你顺水而入。芦苇把第一段路推向侧后方，下游的开口渐渐变大。', enact: '随水流向下移动', travelTitle: '沿着会动的线', travel: '每一处落脚都先由水势选出。你认得的方向，只在芦苇间偶尔露面。' },
    } },
    3: { name: '承诺', title: '高地上的最后一道光', situation: '站上最后的高地，第一块石标与水道同时进入视野。入夜以后，只有你此刻选定的关系会留下。', environment: '整段旅程在最后一道高地汇合', legend: '察看三种最后的承诺', arrive: '把这段旅程带往下一处', choices: {
      edge: { label: '转向来时的地标', cue: '可以折返 · 远方暂且未完', observation: '两处地标足以在黑暗里牵住归路。转身，也意味着把高地以外留给另一天。', offer: '一条能反向跟随的路线', cost: '这道高地以外尚未看见的地面', responseTitle: '地标彼此回应', response: '一个金色小点找到另一个。身后的路不再是散开的记忆，而成了一幅相连的形状。', enact: '面向可以返回的线', travelTitle: '可以重新经过的地方', travel: '你试走了几步回程。先前每个决定，都从相反的一面再次出现。' },
      wait: { label: '点起黄昏信号', cue: '让位置可见 · 火光也会暴露', observation: '一小簇火能让远处的人读到你的位置，也会让高地上的身影被下方看见。', offer: '一处能被另一位行者读到的位置', cost: '入夜后的隐蔽', responseTitle: '地面多了一点光', response: '火光站稳了。水、石堆、山脊和开阔地短暂地共享同一圈暖色。', enact: '守着信号直到天黑', travelTitle: '从别处也能看见', travel: '你留下，直到第一颗星出现。世界没有给出答案，但从此包含了你的位置。' },
      gap: { label: '越过黑暗的鞍部', cue: '未知的距离 · 不留归路标记', observation: '其余地平线都暗下去以后，鞍部仍留着一道浅色。那边没有可见的地标。', offer: '趁最后一道浅色继续前进', cost: '一条可能被夜色抹去的归路', responseTitle: '地平线最后一次打开', response: '你越过最高处。先前的地标一齐沉到暗线以下，但它们的排列还留在你身上。', enact: '走进黑暗的鞍部', travelTitle: '越过曾经握住的视野', travel: '前方全是新地面。你用已经学会的边界、停顿和缺口，一步步安放自己。' },
    } },
  },
  ending: { kicker: '旅程回望', title: '你走出的路线', restart: '重新开始整段旅程', recapLabel: '带到终点的三次定向' },
  families: { 'held-line': '你带走一条两端都被握住的路线。它的确定，来自那些你同意暂时不看的地方。', 'read-light': '你走出的距离不算远，但变化的光让旅程变得可读：留下的不是一条路，而是仍能辨认的关系。', 'open-distance': '地标已经退远；几次毫无遮蔽的穿越，却让身体记住了任何石标都无法替你保管的方向。', 'woven-course': '没有一次决定足以解释整段路线。边界、停留与开阔地，仍连在你如今阅读黑暗的方式里。' },
  scene: (state) => `同一片黄昏中的地景，目前是第${state.act}幕。三次定向已完成${state.history.length}次，先前的路线痕迹仍然可见。`, announcement: (stage, environment) => `${stage}。${environment}`,
};

export const copy: Record<Locale, LocaleCopy> = { 'zh-CN': zh, en };
export function localeFromBrowser(language: string): Locale { return language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en'; }

const echoes: Record<Locale, { first: Record<Bearing, string>; second: Record<Bearing, string> }> = {
  en: {
    first: { edge: 'The close ridge-line you carried here ends at moving water.', wait: 'The shadow-line you learned at the marker reappears only when the pools settle.', gap: 'The long sightline you followed ends abruptly at the reeds.' },
    second: { edge: 'The small traces you read below remain visible from this height.', wait: 'The new cairn now answers the first marker across the water.', gap: 'The current has left your earlier landmarks out of alignment.' },
  },
  'zh-CN': {
    first: { edge: '你一路依靠的近处边界，到流动的水边忽然中断。', wait: '石标旁认出的影线，只有等水面静下来才再次出现。', gap: '你一路跟随的长视线，在芦苇前突然断开。' },
    second: { edge: '刚才在水边读到的细小痕迹，从高处仍依稀可见。', wait: '新垒的石堆越过水面，与第一块石标彼此回应。', gap: '水流已经让先前的地标错开，不再排成一线。' },
  },
};

export function historyContext(locale: Locale, state: JourneyState): string {
  if (state.act === 2 && state.history[0]) return echoes[locale].first[state.history[0]];
  if (state.act === 3 && state.history[0] && state.history[1]) return `${echoes[locale].first[state.history[0]]} ${echoes[locale].second[state.history[1]]}`;
  return '';
}
