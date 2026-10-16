import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCareer } from '../../application/career.js';
import { parseFootballPack } from '../../data/football-pack.js';
import { membershipFor } from '../../data/league-snapshots.js';
import { regulationById } from '../../data/competition-regulations.js';
import { serializeSave, deserializeSave } from '../../persistence/save.js';
import { advanceWorld, standings, type CompetitionWorld, type Fixture, type Tournament } from './world.js';
import { progressSpecial, specialOutcome, specialLegs, type ScheduleMatch } from './special-formats.js';
const pack=parseFootballPack(readFileSync('web/data/world-leagues.json','utf8'));
function career(country:string,seed=42){return createCareer({name:'Special',nationality:country,position:'ST',preferredFoot:'right',seed},{loadYouthClubs:()=>pack.clubs.filter(p=>membershipFor(p.club)?.key===`league:${country}`).map(p=>p.club)});}
const get=(s:ReturnType<typeof career>,country:string,second=false)=>s.world.tournaments.find(t=>t.key===`${second?'league-clausura':'league'}:${country}`)!;
const games=(w:CompetitionWorld,t:Tournament)=>w.fixtures.filter(f=>f.competitionId===t.id);
const advance=(s:ReturnType<typeof career>,date:string)=>{advanceWorld(s,date);s.date=date;};
function scheduler(w:CompetitionWorld,t:Tournament):ScheduleMatch{return(home,away,date,round,stage,group=-1)=>w.fixtures.push({id:`${t.id}:test:${w.fixtures.length}`,competitionId:t.id,round,stage,group,date,home,away,homeGoals:null,awayGoals:null,penalties:null});}
function scoreAll(fs:Fixture[],h=0,a=0){for(const f of fs){f.homeGoals=h;f.awayGoals=a;f.penalties=null;}}
function winnerOf(w:CompetitionWorld,t:Tournament,f:Fixture,id:string){f.homeGoals=f.home===id?1:0;f.awayGoals=f.away===id?1:0;f.penalties=null;assert.equal(specialOutcome(w,t,f)?.winner,id);}
test('bundled MLS preserves both real conferences, 34 games, 17 home/away and the six cross-conference opponents',()=>{
 const s=career('Estados Unidos'),t=get(s,'Estados Unidos'),fs=games(s.world,t);assert.equal(fs.length,510);assert.deepEqual(t.groups.map(g=>g.length),[15,15]);
 const toronto=s.clubs.find(c=>c.name==='Toronto FC')!,vancouver=s.clubs.find(c=>c.name==='Vancouver Whitecaps')!;assert.ok(t.groups[0]!.includes(toronto.id));assert.ok(t.groups[1]!.includes(vancouver.id));
 for(const id of t.participants){const own=fs.filter(f=>[f.home,f.away].includes(id)),group=t.groups.find(g=>g.includes(id))!;assert.equal(own.length,34);assert.equal(own.filter(f=>f.home===id).length,17);assert.equal(own.filter(f=>!group.includes(f.home)||!group.includes(f.away)).length,6);}
});
test('Argentina has 16 regular games including two interzonals, and each semester crowns a separate champion',()=>{
 const s=career('Argentina');for(const second of [false,true]){const t=get(s,'Argentina',second),fs=games(s.world,t);assert.equal(fs.length,240);for(const id of t.participants){const g=t.groups.find(g=>g.includes(id))!,own=fs.filter(f=>[f.home,f.away].includes(id));assert.equal(own.length,16);assert.equal(own.filter(f=>!g.includes(f.home)||!g.includes(f.away)).length,2);}}
 advance(s,'2027-06-30');for(const second of [false,true]){const t=get(s,'Argentina',second);assert.equal(t.phase,'complete');assert.equal(games(s.world,t).length,255);assert.equal(games(s.world,t).filter(f=>f.stage==='final').length,1);assert.ok(s.world.awards.some(a=>a.competitionId===t.id&&a.kind==='champion'));}
 assert.deepEqual(deserializeSave(serializeSave(s)),s);
});
test('Colombia resets points in two quadrangulars, honours seed advantage and plays two-legged finals twice',()=>{
 const s=career('Colômbia'),t=get(s,'Colômbia');assert.equal(games(s.world,t).length,200);
 scoreAll(games(s.world,t),3,0);progressSpecial(s.world,t,scheduler(s.world,t));assert.deepEqual(t.groups.map(g=>g.length),[4,4,12]);
 const quad=games(s.world,t).filter(f=>f.stage==='groups');assert.equal(quad.length,24);scoreAll(quad);
 for(let i=0;i<2;i++){const table=standings(s.world,t,i);assert.ok(table.every(r=>r.points===6&&r.played===6));assert.equal(table[0]!.teamId,t.groups[i]![0]);}
 const real=career('Colômbia');advance(real,'2027-06-30');for(const second of [false,true]){const cup=get(real,'Colômbia',second);assert.equal(cup.phase,'complete');assert.equal(games(real.world,cup).length,226);assert.equal(games(real.world,cup).filter(f=>f.stage==='final').length,2);}assert.doesNotThrow(()=>serializeSave(real));
});
test('Belgian and Greek groups use the documented point transport and keep title winners in the upper group',()=>{
 for(const [country,cuts,total,counts] of [['Bélgica',[6,6,4],312,[40,40,36]],['Grécia',[4,4,6],236,[32,32,36]]] as const){
  const s=career(country),t=get(s,country);scoreAll(games(s.world,t),1,0);const initial=new Map(standings(s.world,t).map(r=>[r.teamId,r.points]));progressSpecial(s.world,t,scheduler(s.world,t));assert.deepEqual(t.groups.map(g=>g.length),cuts);
  for(let i=0;i<3;i++)for(const r of standings(s.world,t,i)){const half=country==='Bélgica'?i<2:i===1;assert.equal(r.points,half?Math.ceil(initial.get(r.teamId)!/2):initial.get(r.teamId));}
  const real=career(country);advance(real,'2027-06-30');const cup=get(real,country);assert.equal(cup.phase,'complete');assert.equal(games(real.world,cup).length,total);assert.ok(cup.groups[0]!.includes(cup.champion!));for(let i=0;i<3;i++)assert.ok(standings(real.world,cup,i).every(r=>r.played===counts[i]));assert.doesNotThrow(()=>serializeSave(real));
 }
});
test('Mexican play-in gives seven/eight a second chance, reseeds eight qualifiers and distinguishes aggregate draws from final penalties',()=>{
 const s=career('México'),t=get(s,'México');scoreAll(games(s.world,t),1,0);const order=standings(s.world,t).map(r=>r.teamId);const schedule=scheduler(s.world,t);progressSpecial(s.world,t,schedule);
 const first=games(s.world,t).filter(f=>f.stage==='play-in');assert.equal(first.length,2);assert.deepEqual([first[0]!.home,first[0]!.away],[order[6],order[7]]);winnerOf(s.world,t,first[0]!,order[7]!);winnerOf(s.world,t,first[1]!,order[9]!);progressSpecial(s.world,t,schedule);
 const second=games(s.world,t).find(f=>f.round===102)!;assert.deepEqual([second.home,second.away],[order[6],order[9]]);winnerOf(s.world,t,second,order[6]!);progressSpecial(s.world,t,schedule);
 const quarters=games(s.world,t).filter(f=>f.stage==='knockout');assert.equal(quarters.length,8);assert.ok(quarters.some(f=>f.home===order[0]&&f.away===order[7]));assert.ok(quarters.every(f=>![order[8],order[9]].includes(f.home)&&![order[8],order[9]].includes(f.away)));
 scoreAll(quarters,1,0);for(const f of quarters){const o=specialOutcome(s.world,t,f)!;if(o.decisive){assert.equal(o.tied,true);assert.equal(o.penalties,false);const winner=order.indexOf(f.home)<order.indexOf(f.away)?f.home:f.away;assert.equal(o.winner,winner);}}
 progressSpecial(s.world,t,schedule);scoreAll(games(s.world,t).filter(f=>f.round===202),1,0);progressSpecial(s.world,t,schedule);
 const final=games(s.world,t).filter(f=>f.stage==='final');scoreAll(final,1,0);assert.equal(specialOutcome(s.world,t,final[1]!)!.penalties,true);assert.equal(specialOutcome(s.world,t,final[1]!)!.winner,null);final[1]!.penalties=[5,4];progressSpecial(s.world,t,schedule);assert.equal(t.champion,final[1]!.home);assert.doesNotThrow(()=>serializeSave(s));
 const bad=structuredClone(s);const q=bad.world.fixtures.find(f=>f.competitionId===t.id&&f.stage==='knockout'&&specialLegs(bad.world,get(bad,'México'),f).at(-1)!.id===f.id)!;q.penalties=[5,4];assert.throws(()=>serializeSave(bad));
 const incompatible=career('Grécia');games(incompatible.world,get(incompatible,'Grécia'))[0]!.stage='series';assert.throws(()=>serializeSave(incompatible));
});
test('MLS first round schedules no unused third game at 2–0 and retains its fixed conference bracket',()=>{
 for(const split of [false,true]){
  const s=career('Estados Unidos'),t=get(s,'Estados Unidos'),schedule=scheduler(s.world,t);scoreAll(games(s.world,t),1,0);progressSpecial(s.world,t,schedule);
  for(const f of games(s.world,t).filter(f=>f.stage==='play-in'))winnerOf(s.world,t,f,f.home);progressSpecial(s.world,t,schedule);
  const series=games(s.world,t).filter(f=>f.stage==='series'),first=series.filter(f=>f.round===102);assert.equal(series.length,16);
  for(const f of first){winnerOf(s.world,t,f,f.home);const second=series.find(x=>x.round===103&&x.home===f.away&&x.away===f.home)!;winnerOf(s.world,t,second,split?f.away:f.home);}
  progressSpecial(s.world,t,schedule);const thirds=games(s.world,t).filter(f=>f.round===104);assert.equal(thirds.length,split?8:0);
  if(split){for(const f of thirds)winnerOf(s.world,t,f,f.home);progressSpecial(s.world,t,schedule);}
  const semis=games(s.world,t).filter(f=>f.stage==='conference-semi');assert.equal(semis.length,4);assert.ok(semis.every(f=>t.groups.some(g=>g.includes(f.home)&&g.includes(f.away))));
  const expected=Array.from({length:4},(_,i)=>[first[i*2]!.home,first[i*2+1]!.home].sort().join('|')).sort();assert.deepEqual(semis.map(f=>[f.home,f.away].sort().join('|')).sort(),expected);assert.doesNotThrow(()=>serializeSave(s));
 }
});
test('special formats resume deterministically mid-playoffs, reject corrupt stages and preserve v1 editions',()=>{
 const a=career('Estados Unidos',81),b=structuredClone(a);advance(a,'2027-06-30');advance(b,'2027-03-01');const resumed=deserializeSave(serializeSave(b));advance(resumed,'2027-06-30');assert.deepEqual(a,resumed);assert.equal(get(a,'Estados Unidos').phase,'complete');assert.ok(games(a.world,get(a,'Estados Unidos')).filter(f=>f.stage==='series').length>=16);assert.equal(a.world.stats.some(p=>p.playerId===a.player.id),false);
 const old=career('México');const t=get(old,'México');t.regulationId='rules-v1:league:México';t.notice='Edição antiga compacta';assert.equal(regulationById(t.regulationId)!.engine,'reference-only');const loaded=deserializeSave(serializeSave(old));assert.equal(get(loaded,'México').regulationId,'rules-v1:league:México');
 const bad=structuredClone(a);games(bad.world,get(bad,'Estados Unidos'))[0]!.stage='invented-stage';assert.throws(()=>serializeSave(bad));
 const incompatible=career('Grécia');games(incompatible.world,get(incompatible,'Grécia'))[0]!.stage='series';assert.throws(()=>serializeSave(incompatible));
});
