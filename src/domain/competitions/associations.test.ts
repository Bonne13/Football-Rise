import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ASSOCIATIONS, associationFor } from '../../data/associations.js';
import { LEAGUE_SNAPSHOTS, membershipFor } from '../../data/league-snapshots.js';
import { parseFootballPack } from '../../data/football-pack.js';
import { createCareer } from '../../application/career.js';
import { createWorld, advanceWorld } from './world.js';
import { serializeSave, deserializeSave } from '../../persistence/save.js';
const input = { name:'Global',nationality:'Brasil',position:'ST' as const,preferredFoot:'right' as const,seed:42 };
const pack = parseFootballPack(readFileSync('web/data/world-leagues.json','utf8'));
test('all 106 associations are catalogued in the correct confederations without inventing a Liechtenstein league', () => {
  assert.equal(ASSOCIATIONS.length,106);assert.equal(new Set(ASSOCIATIONS.map(a=>a.country)).size,106);
  assert.equal(ASSOCIATIONS.filter(a=>a.confederation==='UEFA').length,55);assert.equal(ASSOCIATIONS.filter(a=>a.confederation==='CONMEBOL').length,10);assert.equal(ASSOCIATIONS.filter(a=>a.confederation==='CONCACAF').length,41);
  assert.equal(ASSOCIATIONS.filter(a=>a.leagueName).length,105);
  for (const country of ['Guyana','Suriname']) assert.equal(associationFor(country)?.confederation,'CONCACAF');
  for (const country of ['Israel','Cazaquistão','Geórgia']) assert.equal(associationFor(country)?.confederation,'UEFA');
  assert.equal(associationFor('Liechtenstein')?.leagueName,null);
});
test('global snapshot retains source season, distinct divisions, cross-border clubs and existing real player records', () => {
  assert.equal(pack.clubs.length,526);assert.equal(LEAGUE_SNAPSHOTS.length,26);
  assert.ok(pack.clubs.some(p=>p.club.country==='Argentina'));assert.ok(pack.clubs.some(p=>p.club.country==='México'));
  const canadian=pack.clubs.find(p=>p.club.name.includes('Toronto'))!;assert.equal(canadian.club.country,'Canadá');assert.equal(membershipFor(canadian.club)?.key,'league:Estados Unidos');
  const welsh=pack.clubs.find(p=>p.club.name==='Cardiff City')!;assert.equal(welsh.club.country,'País de Gales');assert.ok(membershipFor(welsh.club)?.key.endsWith('Inglaterra'));
  assert.ok(pack.clubs.some(p=>p.senior.length));assert.ok(pack.clubs.filter(p=>p.club.id.startsWith('world-')).every(p=>p.senior.length===0));
  const seen=new Set();for(const snapshot of LEAGUE_SNAPSHOTS){assert.match(snapshot.source,/openfootball/);assert.ok(snapshot.season);for(const id of snapshot.clubIds){assert.ok(!seen.has(id));seen.add(id);}}
});
test('all catalogued leagues are generated, with unavailable countries explicit and no mixing of domestic divisions', () => {
  const s=createCareer(input,{loadYouthClubs:()=>pack.clubs.map(p=>p.club)}),w=s.world;
  for(const a of ASSOCIATIONS) if(a.leagueName) assert.ok(w.tournaments.some(t=>t.key===`league:${a.country}`),a.country);
  assert.equal(w.tournaments.some(t=>t.key==='league:Liechtenstein'),false);
  assert.equal(w.tournaments.find(t=>t.key==='league:Bolívia')?.phase,'unavailable');
  const first=w.tournaments.find(t=>t.key==='league:Inglaterra')!, second=w.tournaments.find(t=>t.key==='league2:Inglaterra')!;
  assert.equal(first.participants.length,20);assert.equal(second.participants.length,24);assert.ok(first.participants.every(id=>!second.participants.includes(id)));
  assert.ok(w.tournaments.filter(t=>t.key.startsWith('unclassified:')).every(t=>t.name.includes('não confirmada')));
  const eligibility=['champions','europa','conference'].flatMap(key=>w.tournaments.find(t=>t.key===key)!.participants);
  for(const id of eligibility){const c=s.clubs.find(c=>c.id===id)!;assert.equal(membershipFor(c)?.division,1);assert.equal(associationFor(c.country)?.confederation,'UEFA');}
  const south=['libertadores','sudamericana'].map(key=>w.tournaments.find(t=>t.key===key)!);assert.ok(south[0]!.participants.length);assert.ok(south[1]!.participants.length);assert.ok(south[0]!.participants.every(id=>!south[1]!.participants.includes(id)));
  const concacaf=w.tournaments.find(t=>t.key==='concacaf-champions')!;assert.ok(concacaf.participants.length);for(const id of concacaf.participants) assert.equal(associationFor(s.clubs.find(c=>c.id===id)!.country)?.confederation,'CONCACAF');
});
test('expanded world simulates, saves and reloads without mutating an existing edition', () => {
  const s=createCareer({...input,dataPack:pack});const before=serializeSave(s);const copy=deserializeSave(before);assert.deepEqual(copy,s);
  advanceWorld(copy,'2026-09-01');copy.date='2026-09-01';assert.ok(copy.world.fixtures.some(f=>f.homeGoals!==null));assert.equal(serializeSave(s),before);
  assert.deepEqual(deserializeSave(serializeSave(copy)),copy);
  assert.deepEqual(createWorld(s.clubs,42,'2026-07-01'),createWorld(s.clubs,42,'2026-07-01'));
});
