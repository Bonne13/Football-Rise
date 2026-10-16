import { addDays, requireRule } from '../../core/rules.js';
import { isSpecialRegulation, regulationById } from '../../data/competition-regulations.js';
import { SPECIAL_SCHEDULES } from '../../data/special-schedules.js';
import type { CompetitionWorld, Fixture, Standing, Tournament } from './world.js';

export type ScheduleMatch = (home:string,away:string,date:string,round:number,stage:string,group?:number)=>void;
export const SPECIAL_KNOCKOUT_STAGES = ['knockout','playoff','play-in','series','conference-semi','conference-final','final'];
export const SPECIAL_STAGES = ['league','groups',...SPECIAL_KNOCKOUT_STAGES];
const cmp=(a:string,b:string)=>a<b?-1:a>b?1:0;
const engine=(t:Tournament)=>regulationById(t.regulationId)?.engine;
export function allowedSpecialStages(t:Tournament):readonly string[]{
 switch(engine(t)){
  case 'mls-playoffs':return ['league','play-in','series','conference-semi','conference-final','final'];
  case 'mexican-liguilla':return ['league','play-in','knockout','final'];
  case 'argentine-cups':return ['league','knockout','final'];
  case 'colombian-cups':return ['league','groups','final'];
  case 'belgian-split':case 'greek-split':return ['league','groups'];
  default:return [];
 }
}

const fixtures=(w:CompetitionWorld,t:Tournament)=>w.fixtures.filter(f=>f.competitionId===t.id);
const done=(fs:Fixture[])=>fs.length>0&&fs.every(f=>f.homeGoals!==null&&f.awayGoals!==null);

function rows(w:CompetitionWorld,t:Tournament,ids:string[],stage:string,group?:number):Standing[]{
 const map=new Map(ids.map(teamId=>[teamId,{teamId,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,points:0}]));
 for(const f of fixtures(w,t)){
  if(f.stage!==stage||f.homeGoals===null||f.awayGoals===null||group!==undefined&&f.group!==group)continue;
  for(const [id,gf,ga] of [[f.home,f.homeGoals,f.awayGoals],[f.away,f.awayGoals,f.homeGoals]] as const){
   const r=map.get(id);if(!r)continue;r.played++;r.goalsFor+=gf;r.goalsAgainst+=ga;
   if(gf>ga){r.won++;r.points+=3;}else if(gf===ga){r.drawn++;r.points++;}else r.lost++;
  }
 }
 return [...map.values()];
}
function basic(a:Standing,b:Standing,wins=false){return b.points-a.points||(wins?b.won-a.won:0)||(b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst)||b.goalsFor-a.goalsFor||cmp(a.teamId,b.teamId);}
/** Returns null for legacy editions; no saved v1 regulation is reinterpreted. */
export function specialStandings(w:CompetitionWorld,t:Tournament,group?:number):Standing[]|null{
 if(!isSpecialRegulation(t))return null;
 const kind=engine(t),ids=group===undefined?t.participants:t.groups[group]??[];
 const regular=rows(w,t,ids,'league');
 if(kind==='colombian-cups' && group!==undefined && group<2 && t.groups.length){
  const head=t.groups[group]![0];return rows(w,t,ids,'groups',group).sort((a,b)=>b.points-a.points||(Number(b.teamId===head)-Number(a.teamId===head))||basic(a,b));
 }
 if((kind==='belgian-split'||kind==='greek-split')&&group!==undefined){
  const reduced=kind==='belgian-split'?group<2:group===1;
  const second=rows(w,t,ids,'groups',group),wasRounded=new Set<string>();
  for(const r of regular){if(reduced){if(r.points%2)wasRounded.add(r.teamId);r.points=Math.ceil(r.points/2);}const later=second.find(x=>x.teamId===r.teamId)!;for(const key of ['played','won','drawn','lost','goalsFor','goalsAgainst','points'] as const)r[key]+=later[key];}
  return regular.sort((a,b)=>b.points-a.points||(reduced?Number(wasRounded.has(a.teamId))-Number(wasRounded.has(b.teamId)):0)||basic(a,b));
 }
 return regular.sort((a,b)=>basic(a,b,kind==='mls-playoffs'));
}
const ranked=(w:CompetitionWorld,t:Tournament,group?:number)=>specialStandings(w,t,group)!.map(r=>r.teamId);
function seedOrder(w:CompetitionWorld,t:Tournament):string[]{
 if(engine(t)!=='argentine-cups')return ranked(w,t);
 const groups=t.groups.map((_,i)=>specialStandings(w,t,i)!);
 return t.participants.slice().sort((a,b)=>{
  const ga=groups.find(g=>g.some(r=>r.teamId===a))!,gb=groups.find(g=>g.some(r=>r.teamId===b))!;
  return ga.findIndex(r=>r.teamId===a)-gb.findIndex(r=>r.teamId===b)||basic(ga.find(r=>r.teamId===a)!,gb.find(r=>r.teamId===b)!);
 });
}
function roundRobin(ids:string[],legs:number,date:string,schedule:ScheduleMatch,stage='league',group=-1,offset=0,spacing=6){
 const rotation:(string|null)[]=[...ids];if(rotation.length%2)rotation.push(null);
 const base:{a:string;b:string;r:number}[]=[];
 for(let r=0;r<rotation.length-1;r++){
  for(let i=0;i<rotation.length/2;i++){const a=rotation[i],b=rotation[rotation.length-1-i];if(a&&b)base.push({a:r%2?b:a,b:r%2?a:b,r});}
  rotation.splice(1,0,rotation.pop()!);
 }
 for(let leg=0;leg<legs;leg++)for(const f of base){const r=f.r+leg*(rotation.length-1);schedule(leg%2?f.b:f.a,leg%2?f.a:f.b,addDays(date,r*spacing),offset+r+1,stage,group);}
}
function sourceSchedule(t:Tournament,key:string,date:string,schedule:ScheduleMatch):boolean{
 const ref=SPECIAL_SCHEDULES[key];if(!ref)return false;
 const members=new Set(t.participants),present=new Set(ref.fixtures.flatMap(f=>[f[0],f[1]]));
 if(present.size!==members.size||![...present].every(id=>members.has(id)))return false;
 if(ref.groups.length)t.groups=ref.groups.map(g=>[...g]);
 const reverse=t.key.startsWith('league-clausura:');
 for(const [home,away,round] of ref.fixtures)schedule(reverse?away:home,reverse?home:away,addDays(date,(round-1)*6),round,'league');
 return true;
}
export function initializeSpecial(w:CompetitionWorld,t:Tournament,date:string,schedule:ScheduleMatch):boolean{
 if(!isSpecialRegulation(t))return false;
 const rule=regulationById(t.regulationId)!,kind=rule.engine;
 if(t.participants.length!==rule.expected){t.phase='unavailable';t.notice=`Formato ${rule.reference}: exige ${rule.expected} clubes; pacote contém ${t.participants.length}. Calendário não gerado com participantes incompletos.`;return true;}
 t.phase='league';t.notice=`${rule.reference}. Formato esportivo executado; datas adaptadas à carreira. Vagas e acesso/descenso entre divisões ainda não executados.`;
 if(kind==='mls-playoffs'||kind==='argentine-cups'){
  if(sourceSchedule(t,kind==='mls-playoffs'?'mls':'argentina',date,schedule))return true;
  t.groups=[t.participants.slice(0,15),t.participants.slice(15)];
  t.groups.forEach((g,i)=>roundRobin(g,kind==='mls-playoffs'?2:1,date,schedule,'league',-1));
  const cross=kind==='mls-playoffs'?6:2,offset=kind==='mls-playoffs'?28:15;
  for(let r=0;r<cross;r++)for(let i=0;i<15;i++){const a=t.groups[0]![i]!,b=t.groups[1]![(i+r)%15]!;schedule(r%2?b:a,r%2?a:b,addDays(date,(offset+r)*6),offset+r+1,'league');}
  t.notice+=' Conferências/zonas e confrontos procedurais para este pacote.';return true;
 }
 if(kind==='colombian-cups'&&sourceSchedule(t,'colombia',date,schedule))return true;
 roundRobin(t.participants,['belgian-split','greek-split'].includes(kind)?2:1,date,schedule,'league',-1,0,['belgian-split','greek-split'].includes(kind)?7:6);
 if(kind==='colombian-cups'){
  // A 20th regional round supplements the 19-round all-play-all fallback.
  for(let i=0;i<t.participants.length;i+=2)schedule(t.participants[i]!,t.participants[i+1]!,addDays(date,19*6),20,'league');
  t.notice+=' Rodada regional procedural para este pacote.';
 }
 return true;
}
export function specialLegs(w:CompetitionWorld,t:Tournament,f:Fixture):Fixture[]{
 if(!['mexican-liguilla','colombian-cups'].includes(engine(t)??'')||!['knockout','final'].includes(f.stage))return [f];
 return fixtures(w,t).filter(x=>x.round===f.round&&x.stage===f.stage&&((x.home===f.home&&x.away===f.away)||(x.home===f.away&&x.away===f.home))).sort((a,b)=>cmp(a.date,b.date)||cmp(a.id,b.id));
}
export interface SpecialOutcome { decisive:boolean; settled:boolean; tied:boolean; penalties:boolean; winner:string|null }
export function specialOutcome(w:CompetitionWorld,t:Tournament,f:Fixture):SpecialOutcome|null{
 if(!isSpecialRegulation(t)||!SPECIAL_KNOCKOUT_STAGES.includes(f.stage))return null;
 const legs=specialLegs(w,t,f),decisive=legs.at(-1)!.id===f.id,settled=done(legs);
 let home=0,away=0;for(const x of legs){home+=(x.home===f.home?x.homeGoals:x.awayGoals)??0;away+=(x.home===f.home?x.awayGoals:x.homeGoals)??0;}
 const tied=home===away,seedWins=engine(t)==='mexican-liguilla'&&f.stage==='knockout';
 let winner:string|null=null;
 if(settled&&decisive){if(!tied)winner=home>away?f.home:f.away;else if(seedWins){const seeds=seedOrder(w,t);winner=seeds.indexOf(f.home)<seeds.indexOf(f.away)?f.home:f.away;}else if(f.penalties)winner=f.penalties[0]>f.penalties[1]?f.home:f.away;}
 return {decisive,settled,tied,penalties:decisive&&settled&&tied&&!seedWins,winner};
}
function winner(w:CompetitionWorld,t:Tournament,f:Fixture):string{const id=specialOutcome(w,t,f)?.winner;requireRule(id,'Confronto especial ainda não decidido.');return id;}
function twoLegs(a:string,b:string,date:string,round:number,stage:string,schedule:ScheduleMatch){schedule(a,b,date,round,stage);schedule(b,a,addDays(date,4),round,stage);}
function lastLegs(w:CompetitionWorld,t:Tournament,fs:Fixture[]):Fixture[]{return fs.filter(f=>specialLegs(w,t,f).at(-1)!.id===f.id);}
function seedPairs(w:CompetitionWorld,t:Tournament,ids:string[],date:string,round:number,stage:string,schedule:ScheduleMatch,two=false){
 const seeds=seedOrder(w,t);ids=[...ids].sort((a,b)=>seeds.indexOf(a)-seeds.indexOf(b));
 for(let i=0;i<ids.length/2;i++){const higher=ids[i]!,lower=ids[ids.length-1-i]!;if(two)twoLegs(lower,higher,date,round,stage,schedule);else schedule(higher,lower,date,round,stage);}
}
function finish(t:Tournament,id:string){t.phase='complete';t.champion=id;t.waiting=[];}
/** Each transition runs only after all scheduled games have closed. Third series games
 * are created only at 1–1; no unused game or duplicate appearance is simulated. */
export function progressSpecial(w:CompetitionWorld,t:Tournament,schedule:ScheduleMatch):boolean{
 if(!isSpecialRegulation(t))return false;
 const all=fixtures(w,t);if(!done(all)||t.phase==='complete'||t.phase==='unavailable')return true;
 const kind=engine(t),last=Math.max(...all.map(f=>f.round)),current=all.filter(f=>f.round===last),date=addDays(all.reduce((max,f)=>f.date>max?f.date:max,all[0]!.date),4);
 if(kind==='belgian-split'||kind==='greek-split'){
  if(t.phase==='league'){
   const order=ranked(w,t),cuts=kind==='belgian-split'?[6,12]:[4,8];t.groups=[order.slice(0,cuts[0]),order.slice(cuts[0],cuts[1]),order.slice(cuts[1])];t.phase='groups';
   t.groups.forEach((g,i)=>roundRobin(g,2,date,schedule,'groups',i,100,7));
  }else finish(t,ranked(w,t,0)[0]!);return true;
 }
 if(kind==='colombian-cups'){
  if(t.phase==='league'){
   const order=ranked(w,t);t.groups=[[order[0]!,order[3]!,order[4]!,order[7]!],[order[1]!,order[2]!,order[5]!,order[6]!],order.slice(8)];t.phase='groups';
   t.groups.slice(0,2).forEach((g,i)=>roundRobin(g,2,date,schedule,'groups',i,100,4));
  }else if(t.phase==='groups'){
   const a=ranked(w,t,0)[0]!,b=ranked(w,t,1)[0]!,seeds=seedOrder(w,t);t.phase='knockout';
   if(seeds.indexOf(a)<seeds.indexOf(b))twoLegs(b,a,date,201,'final',schedule);else twoLegs(a,b,date,201,'final',schedule);
  }else finish(t,winner(w,t,current.at(-1)!));return true;
 }
 if(kind==='argentine-cups'){
  if(t.phase==='league'){
   const a=ranked(w,t,0).slice(0,8),b=ranked(w,t,1).slice(0,8);t.phase='knockout';
   const bracket=[[a[0]!,b[7]!],[b[3]!,a[4]!],[b[1]!,a[6]!],[a[2]!,b[5]!],[b[0]!,a[7]!],[a[3]!,b[4]!],[a[1]!,b[6]!],[b[2]!,a[5]!]];
   for(const [h,a] of bracket)schedule(h!,a!,date,101,'knockout');
  }else{
   const ids=current.map(f=>winner(w,t,f));if(ids.length===1)finish(t,ids[0]!);else{const seeds=seedOrder(w,t);for(let i=0;i<ids.length;i+=2){let a=ids[i]!,b=ids[i+1]!;if(seeds.indexOf(a)>seeds.indexOf(b))[a,b]=[b,a];schedule(a,b,date,last+1,ids.length===2?'final':'knockout');}}
  }return true;
 }
 if(kind==='mexican-liguilla'){
  const order=ranked(w,t);
  if(t.phase==='league'){
   t.phase='playoff';t.waiting=order.slice(0,6);schedule(order[6]!,order[7]!,date,101,'play-in');schedule(order[8]!,order[9]!,date,101,'play-in');
  }else if(last===101){
   const sevenEight=current.find(f=>[order[6],order[7]].includes(f.home))!,nineTen=current.find(f=>f!==sevenEight)!;
   const seventh=winner(w,t,sevenEight),loser=seventh===sevenEight.home?sevenEight.away:sevenEight.home;t.waiting.push(seventh);schedule(loser,winner(w,t,nineTen),date,102,'play-in');
  }else if(last===102){
   const ids=[...t.waiting,winner(w,t,current[0]!)];t.waiting=[];t.phase='knockout';seedPairs(w,t,ids,date,201,'knockout',schedule,true);
  }else{
   const ids=lastLegs(w,t,current).map(f=>winner(w,t,f));if(ids.length===1)finish(t,ids[0]!);else seedPairs(w,t,ids,date,last+1,ids.length===2?'final':'knockout',schedule,true);
  }return true;
 }
 if(kind==='mls-playoffs'){
  const conferences=t.groups.map((_,i)=>ranked(w,t,i)),order=ranked(w,t);
  if(t.phase==='league'){
   t.phase='playoff';for(const g of conferences)schedule(g[7]!,g[8]!,date,101,'play-in');
  }else if(last===101){
   t.phase='knockout';for(let i=0;i<2;i++){
    const g=conferences[i]!,wild=current.find(f=>g.includes(f.home))!,seeds=[...g.slice(0,7),winner(w,t,wild)];
    for(const [a,b] of [[0,7],[3,4],[1,6],[2,5]]){const home=seeds[a!]!,away=seeds[b!]!;schedule(home,away,date,102,'series');schedule(away,home,addDays(date,4),103,'series');}
   }
  }else if(last===103||last===104){
   const first=all.filter(f=>f.stage==='series'&&f.round===102),qualified:string[]=[];let added=false;
   for(const f of first){const series=all.filter(x=>x.stage==='series'&&[x.home,x.away].includes(f.home)&&[x.home,x.away].includes(f.away)),wins=series.filter(x=>winner(w,t,x)===f.home).length;
    if(wins>=2)qualified.push(f.home);else if(series.length-wins>=2)qualified.push(f.away);else{schedule(f.home,f.away,date,104,'series');added=true;}
   }
   if(!added)for(let i=0;i<qualified.length;i+=2){let a=qualified[i]!,b=qualified[i+1]!;if(order.indexOf(a)>order.indexOf(b))[a,b]=[b,a];schedule(a,b,date,105,'conference-semi');}
  }else if(last===105||last===106){
   const ids=current.map(f=>winner(w,t,f));for(let i=0;i<ids.length;i+=2){let a=ids[i]!,b=ids[i+1]!;if(order.indexOf(a)>order.indexOf(b))[a,b]=[b,a];schedule(a,b,date,last+1,last===105?'conference-final':'final');}
  }else finish(t,winner(w,t,current[0]!));return true;
 }
 return true;
}
export function specialGroupLabel(t:Tournament,index:number):string|null{
 if(!isSpecialRegulation(t))return null;
 const kind=engine(t);
 if(kind==='mls-playoffs')return index===0?'Conferência Leste':'Conferência Oeste';
 if(kind==='argentine-cups')return `Zona ${String.fromCharCode(65+index)}`;
 if(kind==='colombian-cups')return index===2?'Não classificados aos quadrangulares':`Quadrangular ${String.fromCharCode(65+index)}`;
 return index===0?'Disputa do título':index===1?'Disputa europeia':'Permanência';
}
