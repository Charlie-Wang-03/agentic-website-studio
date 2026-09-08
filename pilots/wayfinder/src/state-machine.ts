export const bearings = ['edge', 'wait', 'gap'] as const;
export type Bearing = (typeof bearings)[number];
export type Act = 1 | 2 | 3;
export type Trace = 'drift' | 'reflection' | 'reeds';
export const traces: readonly Trace[] = ['drift', 'reflection', 'reeds'];
export type Phase = 'arrival' | 'approach' | 'route_survey' | 'response' | 'travel' | 'evidence' | 'final_assembly' | 'culmination' | 'ending';
export type JourneyEvent = 'start' | 'reach_crossing' | `survey_${Bearing}` | `commit_route_${Bearing}` | `inspect_trace_${Trace}` | `act_on_${Bearing}` | `commit_final_${Bearing}` | 'enact' | 'observe_travel' | 'advance_travel' | 'gather_history' | 'reflect' | 'restart';

export interface WorldMemory { boundary: number; exposure: number; stillness: number; knowledge: number; movement: number }
export interface JourneyState { phase: Phase; act: Act; preview: Bearing | null; inspectedTraces: readonly Trace[]; travelStep: number; travelObserved: boolean; history: readonly Bearing[]; memory: WorldMemory }
export interface TradeoffContract { opportunity: string; relinquishment: string; uncertainty: string; affectedDimensions: readonly (keyof WorldMemory)[] }
export interface ActBlueprint { primitive: 'spatial_route_commitment' | 'environmental_evidence_interpretation' | 'irreversible_legacy_commitment'; semanticSequence: readonly string[]; question: string; options: Record<Bearing, TradeoffContract> }

export const actBlueprints: Record<Act, ActBlueprint> = {
  1: { primitive: 'spatial_route_commitment', semanticSequence: ['survey_landscape','preview_route','commit_route','world_response','traverse_region'], question: 'How do I enter this journey?', options: {
    edge: { opportunity:'shelter and a dependable boundary', relinquishment:'the long view beyond the bend', uncertainty:'what waits out of sight', affectedDimensions:['boundary','exposure','knowledge'] },
    wait: { opportunity:'time to read a changing route', relinquishment:'distance before daylight falls', uncertainty:'whether the revealed trace remains useful', affectedDimensions:['stillness','knowledge','movement'] },
    gap: { opportunity:'distance and a broad sightline', relinquishment:'shelter near the ridge', uncertainty:'how the open wind will alter the crossing', affectedDimensions:['exposure','movement','boundary'] },
  } },
  2: { primitive: 'environmental_evidence_interpretation', semanticSequence: ['inspect_multiple_traces','compare_incomplete_evidence','act_on_interpretation','world_response','traverse_transformed_region'], question: 'What do I trust in the world my route produced?', options: {
    edge: { opportunity:'evidence of recent safe footing', relinquishment:'remaining light for the climb', uncertainty:'whether the traces still describe the water', affectedDimensions:['knowledge','stillness','movement'] },
    wait: { opportunity:'a return marker shared across both banks', relinquishment:'warmth and time before dusk', uncertainty:'who else may read the marker', affectedDimensions:['boundary','knowledge','exposure'] },
    gap: { opportunity:'speed through the shallow current', relinquishment:'the known alignment on the far bank', uncertainty:'where the current releases the route', affectedDimensions:['movement','exposure','boundary'] },
  } },
  3: { primitive: 'irreversible_legacy_commitment', semanticSequence: ['gather_visible_history','weigh_irreversible_sacrifice','commit_once','transform_accumulated_world','reflect'], question: 'What do I preserve, reveal, or leave behind?', options: {
    edge: { opportunity:'a retraceable route through darkness', relinquishment:'unexplored distance beyond the rise', uncertainty:'whether return will matter more than advance', affectedDimensions:['boundary','movement','knowledge'] },
    wait: { opportunity:'a signal another traveler can read', relinquishment:'concealment on the exposed rise', uncertainty:'who will answer the light', affectedDimensions:['exposure','knowledge','stillness'] },
    gap: { opportunity:'distance while the saddle remains visible', relinquishment:'the markers that make return possible', uncertainty:'what lies beyond the dark seam', affectedDimensions:['movement','exposure','boundary'] },
  } },
};

export const initialMemory: WorldMemory = { boundary:0, exposure:0, stillness:0, knowledge:0, movement:0 };
export const initialJourneyState: JourneyState = { phase:'arrival', act:1, preview:null, inspectedTraces:[], travelStep:0, travelObserved:false, history:[], memory:initialMemory };
const effects: Record<Act, Record<Bearing, WorldMemory>> = {
  1:{edge:{boundary:2,exposure:-1,stillness:0,knowledge:1,movement:1},wait:{boundary:0,exposure:0,stillness:2,knowledge:2,movement:-1},gap:{boundary:-1,exposure:2,stillness:-1,knowledge:0,movement:2}},
  2:{edge:{boundary:1,exposure:-1,stillness:1,knowledge:2,movement:0},wait:{boundary:2,exposure:1,stillness:0,knowledge:1,movement:0},gap:{boundary:-1,exposure:2,stillness:-1,knowledge:1,movement:2}},
  3:{edge:{boundary:2,exposure:-1,stillness:1,knowledge:1,movement:-1},wait:{boundary:0,exposure:2,stillness:2,knowledge:2,movement:0},gap:{boundary:-2,exposure:2,stillness:-1,knowledge:0,movement:2}},
};
function addMemory(a:WorldMemory,b:WorldMemory):WorldMemory{return{boundary:a.boundary+b.boundary,exposure:a.exposure+b.exposure,stillness:a.stillness+b.stillness,knowledge:a.knowledge+b.knowledge,movement:a.movement+b.movement};}
function commit(current:JourneyState,bearing:Bearing):JourneyState{return{...current,preview:null,history:[...current.history,bearing],memory:addMemory(current.memory,effects[current.act][bearing]),phase:current.act===3?'culmination':'response'};}
export function isTerminal(state:JourneyState):boolean{return state.phase==='ending';}
export function isComplete(state:JourneyState):boolean{return state.history.length===3&&state.phase==='ending';}
export function historyKey(state:JourneyState):string{return state.history.join('-')||'none';}
export function worldSignature(state:JourneyState):string{const route=state.history.map((b,i)=>`${i+1}${b[0]}`).join('.');return`${route||'unmade'}|b${state.memory.boundary}|x${state.memory.exposure}|s${state.memory.stillness}|k${state.memory.knowledge}|m${state.memory.movement}`;}
export function reflectionFamily(state:JourneyState):'held-line'|'read-light'|'open-distance'|'woven-course'{if(state.history.length!==3)return'woven-course';const[first,,last]=state.history;if(first===last&&first==='edge')return'held-line';if(state.memory.knowledge>=5&&state.memory.stillness>=2)return'read-light';if(state.memory.exposure>=4&&state.memory.movement>=4)return'open-distance';return'woven-course';}

export function transition(current:JourneyState,event:JourneyEvent):JourneyState{
  if(event==='restart')return current.phase==='ending'?initialJourneyState:current;
  if(current.phase==='arrival'&&event==='start')return{...current,phase:'approach'};
  if(current.phase==='approach'&&event==='reach_crossing')return{...current,phase:'route_survey'};
  if(current.phase==='route_survey'&&event.startsWith('survey_')){const b=event.slice(7)as Bearing;return bearings.includes(b)?{...current,preview:b}:current;}
  if(current.phase==='route_survey'&&event.startsWith('commit_route_')){const b=event.slice(13)as Bearing;return bearings.includes(b)&&current.preview===b&&current.history.length===0?commit(current,b):current;}
  if(current.phase==='evidence'&&event.startsWith('inspect_trace_')){const trace=event.slice(14)as Trace;if(!traces.includes(trace)||current.inspectedTraces.includes(trace))return current;return{...current,inspectedTraces:[...current.inspectedTraces,trace]};}
  if(current.phase==='evidence'&&event.startsWith('act_on_')){const b=event.slice(7)as Bearing;return bearings.includes(b)&&current.inspectedTraces.length>=2&&current.history.length===1?commit(current,b):current;}
  if(current.phase==='final_assembly'&&event==='gather_history')return{...current,travelStep:1};
  if(current.phase==='final_assembly'&&event.startsWith('commit_final_')){const b=event.slice(13)as Bearing;return bearings.includes(b)&&current.travelStep===1&&current.history.length===2?commit(current,b):current;}
  if(current.phase==='response'&&event==='enact')return{...current,phase:'travel',travelStep:0,travelObserved:false};
  if(current.phase==='travel'&&event==='observe_travel'&&!current.travelObserved)return{...current,travelObserved:true};
  if(current.phase==='travel'&&event==='advance_travel'&&current.travelObserved){
    if(current.travelStep===0)return{...current,travelStep:1,travelObserved:false};
    if(current.act===1)return{...current,act:2,phase:'evidence',travelStep:0,travelObserved:false,inspectedTraces:[]};
    if(current.act===2)return{...current,act:3,phase:'final_assembly',travelStep:0,travelObserved:false,inspectedTraces:[]};
  }
  if(current.phase==='culmination'&&event==='reflect')return{...current,phase:'ending'};
  return current;
}
