import { bounded, requireRule } from '../../core/rules.js';

export interface RatedAction {score:number;outcome:string|null}
export function playerMatchRating(actions:readonly RatedAction[]):number {
  let rating=6;
  for(const action of actions){
    const gain=action.outcome==='goal'?1.5:action.outcome==='received'?.45:action.outcome==='complete'?.4:action.outcome==='save'?-.2:action.outcome==='intercepted'?-.65:action.outcome==='offside'?-.5:-.45;
    rating+=gain+(gain>0?(action.score-50)/150:0);
  }
  return Math.round(Math.max(3,Math.min(10,rating))*10)/10;
}
export interface Participation {
  entryMinute:number;plannedExit:number;minute:number;energy:number;coachTrust:number;entered:boolean;
  exitMinute:number|null;reason:'planned'|'fatigue'|'performance'|null;
}
export function plannedMinutes(role:'prospect'|'reserve',trust:number,energy:number,ratings:readonly number[]):number {
  const form=ratings.reduce((a,b)=>a+b,0)/Math.max(1,ratings.length);
  if(trust>=70&&ratings.length>=3&&form>=7)return energy>=80?75:60;
  return role==='reserve'?30:15;
}
export function createParticipation(minutes:number,energy:number,coachTrust:number):Participation {
  bounded(minutes,1,90);bounded(energy,0,100);bounded(coachTrust,0,100);
  requireRule(Number.isInteger(minutes),'Minutagem inválida.');
  const entryMinute=minutes>=60?0:90-minutes;
  return {entryMinute,plannedExit:entryMinute+minutes,minute:entryMinute,energy,coachTrust,entered:entryMinute===0,exitMinute:null,reason:null};
}
export function updateParticipation(previous:Participation,actions:readonly RatedAction[],total:number):Participation {
  const p={...previous};if(p.exitMinute!==null)return p;
  p.minute=Math.round(p.entryMinute+(p.plannedExit-p.entryMinute)*Math.min(1,actions.length/Math.max(1,total)));
  const remaining=p.energy-(p.minute-p.entryMinute)*.55,rating=playerMatchRating(actions);
  if(actions.length>=2&&actions.length<total){
    if(remaining<35){p.exitMinute=p.minute;p.reason='fatigue';}
    else if(rating<5.2&&p.coachTrust<70){p.exitMinute=p.minute;p.reason='performance';}
  }
  if(actions.length===total&&p.plannedExit<90){p.exitMinute=p.plannedExit;p.reason='planned';}
  return p;
}
