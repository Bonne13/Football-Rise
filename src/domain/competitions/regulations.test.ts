import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer } from '../../application/career.js';
import { serializeSave, deserializeSave } from '../../persistence/save.js';
import { REGULATIONS, regulationById } from '../../data/competition-regulations.js';
import { advanceWorld, standings, aggregate, tieMatches, type Tournament } from './world.js';
import type { Club } from '../career/state.js';
const club=(id:string,country:string):Club=>({id,name:id,country,reputation:60,facilities:60,coach:60,squadOverall:60,minimumOverall:25,minimumPotential:40,needs:['ST'],youthPlaces:5,seniorPlaces:5,wageBudget:5000,maxWeeklyWage:300});
const career=(country:string,count:number)=>createCareer({name:'Rules',nationality:country,position:'ST',preferredFoot:'right',seed:42},{loadYouthClubs:()=>Array.from({length:count},(_,i)=>club(`c${i}`,country))});
const tournament=(s:ReturnType<typeof career>,key:string):Tournament=>s.world.tournaments.find(t=>t.key===key)!;
test('reference registry covers all 26 available divisions with stable names and versioned special formats',()=>{
 assert.equal(REGULATIONS.length,26);assert.equal(new Set(REGULATIONS.map(r=>r.id)).size,26);
 assert.equal(REGULATIONS.find(r=>r.key==='league:Estados Unidos')!.engine,'mls-playoffs');assert.equal(regulationById('rules-v1:league:Estados Unidos')!.engine,'reference-only');
 const s=career('México',18);assert.equal(s.world.tournaments.some(t=>t.key==='cup:México'),false);assert.match(tournament(s,'league:México').notice,/Formato esportivo executado/);assert.ok(tournament(s,'league-clausura:México'));
});
test('Premier League schedule has 380 matches, 19 at home and away, every opponent twice',()=>{
 const s=career('Inglaterra',20),t=tournament(s,'league:Inglaterra'),fixtures=s.world.fixtures.filter(f=>f.competitionId===t.id);
 assert.equal(t.name,'Premier League');assert.equal(fixtures.length,380);
 for(const id of t.participants){assert.equal(fixtures.filter(f=>f.home===id).length,19);assert.equal(fixtures.filter(f=>f.away===id).length,19);for(const other of t.participants.filter(x=>x!==id))assert.equal(fixtures.filter(f=>f.home===id&&f.away===other).length,1);}
 assert.deepEqual(deserializeSave(serializeSave(s)),s);
});
test('Scottish and Austrian splits preserve groups, points and expected per-club match counts',()=>{
 for(const [country,matches,total] of [['Escócia',38,228],['Áustria',32,192]] as const){
  const s=career(country,12),t=tournament(s,`league:${country}`);
  advanceWorld(s,'2027-06-30');s.date='2027-06-30';
  assert.equal(t.phase,'complete');assert.equal(t.groups.length,2);assert.equal(s.world.fixtures.filter(f=>f.competitionId===t.id).length,total);
  for(let i=0;i<2;i++)for(const row of standings(s.world,t,i)){
   assert.equal(row.played,matches);
   const base=s.world.fixtures.filter(f=>f.competitionId===t.id && f.stage==='league' && [f.home,f.away].includes(row.teamId)).reduce((n,f)=>{const scored=f.home===row.teamId?f.homeGoals!:f.awayGoals!,conceded=f.home===row.teamId?f.awayGoals!:f.homeGoals!;return n+(scored>conceded?3:scored===conceded?1:0)},0);
   const split=s.world.fixtures.filter(f=>f.competitionId===t.id && f.stage==='groups' && [f.home,f.away].includes(row.teamId)).reduce((n,f)=>{const scored=f.home===row.teamId?f.homeGoals!:f.awayGoals!,conceded=f.home===row.teamId?f.awayGoals!:f.homeGoals!;return n+(scored>conceded?3:scored===conceded?1:0)},0);
   assert.equal(row.points,(country==='Áustria'?Math.floor(base/2):base)+split);
  }
  assert.ok(t.groups[0]!.includes(t.champion!));assert.deepEqual(deserializeSave(serializeSave(s)),s);
 }
});
test('continental aggregate permits a drawn first leg, and penalties only on a tied decisive aggregate',()=>{
 const s=career('México',4),t=tournament(s,'concacaf-champions');const first=s.world.fixtures.find(f=>f.competitionId===t.id)!,legs=tieMatches(s.world,first);assert.equal(legs.length,2);
 first.homeGoals=1;first.awayGoals=0;
 const second=legs[1]!;second.homeGoals=1;second.awayGoals=0;second.penalties=[5,4];
 assert.deepEqual(aggregate(s.world,second),[1,1]);assert.doesNotThrow(()=>serializeSave(s));
 second.penalties=null;assert.throws(()=>serializeSave(s));
 first.homeGoals=first.awayGoals=0;second.homeGoals=2;second.awayGoals=0;assert.doesNotThrow(()=>serializeSave(s));
 first.penalties=[5,4];assert.throws(()=>serializeSave(s));
});
test('new continental league phases balance home/away and distinct opponents',()=>{
 const s=career('Inglaterra',110);
 for(const key of ['champions','europa','conference']){
  const t=tournament(s,key),n=key==='conference'?6:8,fixtures=s.world.fixtures.filter(f=>f.competitionId===t.id);
  for(const id of t.participants){const own=fixtures.filter(f=>[f.home,f.away].includes(id));assert.equal(own.length,n);assert.equal(own.filter(f=>f.home===id).length,n/2);assert.equal(new Set(own.map(f=>f.home===id?f.away:f.home)).size,n);}
 }
});
test('unrecognised regulation IDs are rejected and existing saves without IDs retain their calendars',()=>{
 const s=career('Inglaterra',4);for(const t of s.world.tournaments)delete t.regulationId;
 const legacy=tournament(s,'league:Inglaterra');s.world.fixtures=s.world.fixtures.filter(f=>f.competitionId!==legacy.id||f.round<=3);
 const old=serializeSave(s),loaded=deserializeSave(old);assert.equal(serializeSave(loaded),old);
 advanceWorld(loaded,'2026-09-01');loaded.date='2026-09-01';assert.deepEqual(loaded.world.fixtures.filter(f=>s.world.fixtures.some(old=>old.id===f.id)).map(f=>[f.id,f.date,f.home,f.away]),s.world.fixtures.map(f=>[f.id,f.date,f.home,f.away]));
 const t=tournament(s,'league:Inglaterra');t.regulationId='invented';assert.throws(()=>serializeSave(s));
});

test('head-to-head minitables outrank global goal difference in reference leagues',()=>{
 const s=career('Espanha',4),t=tournament(s,'league:Espanha'),fixtures=s.world.fixtures.filter(f=>f.competitionId===t.id);
 for(const f of fixtures){f.homeGoals=0;f.awayGoals=0;}
 const score=(home:string,away:string,h:number,a:number)=>{const f=fixtures.find(f=>f.home===home&&f.away===away)!;f.homeGoals=h;f.awayGoals=a;};
 score('c0','c1',1,0);score('c1','c2',6,0);score('c0','c3',0,1);
 const rows=standings(s.world,t),a=rows.find(r=>r.teamId==='c0')!,b=rows.find(r=>r.teamId==='c1')!;
 assert.equal(a.points,b.points);assert.ok(a.goalsFor-a.goalsAgainst<b.goalsFor-b.goalsAgainst);assert.ok(rows.indexOf(a)<rows.indexOf(b));
});
test('Concacaf Champions Cup advances its five byes and ends after 51 games with a single final',()=>{
 const s=career('México',27),t=tournament(s,'concacaf-champions');assert.equal(t.waiting.length,5);assert.equal(s.world.fixtures.filter(f=>f.competitionId===t.id).length,22);
 advanceWorld(s,'2027-06-30');s.date='2027-06-30';assert.equal(t.phase,'complete');
 const matches=s.world.fixtures.filter(f=>f.competitionId===t.id);assert.equal(matches.length,51);const last=Math.max(...matches.map(f=>f.round));assert.equal(matches.filter(f=>f.round===last).length,1);
 assert.deepEqual(deserializeSave(serializeSave(s)),s);
});
test('Central American and Caribbean groups contain five teams and finals retain both legs',()=>{
 for(const [country,key,n,groupCount] of [['Costa Rica','central-american',20,4],['Jamaica','caribbean',10,2]] as const){
  const s=career(country,n),t=tournament(s,key);assert.equal(t.groups.length,groupCount);assert.ok(t.groups.every(g=>g.length===5));
  const groups=s.world.fixtures.filter(f=>f.competitionId===t.id);assert.equal(groups.length,n*2);for(const id of t.participants)assert.equal(groups.filter(f=>[f.home,f.away].includes(id)).length,4);
  advanceWorld(s,'2027-06-30');s.date='2027-06-30';assert.equal(t.phase,'complete');const matches=s.world.fixtures.filter(f=>f.competitionId===t.id),round=Math.max(...matches.map(f=>f.round));assert.equal(matches.filter(f=>f.round===round).length,2);assert.doesNotThrow(()=>serializeSave(s));
 }
});
