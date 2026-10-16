import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, advanceCareer } from '../../application/career.js';
import { createWorld, advanceWorld, nationalEligibility, standings, type Tournament } from './world.js';
import type { Club, CareerState } from '../career/state.js';
import { serializeSave, deserializeSave } from '../../persistence/save.js';
const input = { name: 'Alex', nationality: 'Brasil', preferredFoot: 'right' as const, position: 'ST' as const, seed: 42 };
function club(id: string, country = 'Brasil', name = id): Club { return { id, name, country, reputation: 60, facilities: 60, coach: 60, squadOverall: 60, minimumOverall: 25, minimumPotential: 40, needs: ['ST'], youthPlaces: 5, seniorPlaces: 5, wageBudget: 5000, maxWeeklyWage: 300 }; }
function state(clubs: Club[]) { return createCareer(input, { loadYouthClubs: () => clubs }); }
function advance(s: CareerState, date: string) { advanceWorld(s, date); s.date = date; }
function get(s: CareerState, key: string): Tournament { return s.world.tournaments.find(t => t.key === key)!; }
test('catalog creates all requested cups and states without assigning unknown clubs to arbitrary states', () => {
  const s = state([club('f', 'Brasil', 'Flamengo'), club('v', 'Brasil', 'Vasco'), club('x')]);
  for (const key of ['champions', 'europa', 'conference', 'libertadores', 'world-cup', 'cup:Brasil']) assert.ok(get(s, key));
  assert.equal(s.world.tournaments.filter(t => t.key.startsWith('state:')).length, 27);
  assert.deepEqual(get(s, 'state:RJ').participants, ['f', 'v']);
  assert.equal(get(s, 'state:SP').phase, 'unavailable');
  assert.ok(s.world.tournaments.filter(t => t.key.startsWith('state:')).every(t => !t.participants.includes('x')));
  assert.equal(get(s, 'champions').phase, 'unavailable');
});
test('knockout byes, progression, ties and champion work with non-power-of-two participant counts', () => {
  for (const count of [2, 3, 5, 7, 8]) {
    const s = state(Array.from({ length: count }, (_, i) => club(`b${i}`)));
    advance(s, '2027-06-30'); const cup = get(s, 'cup:Brasil'); const fixtures = s.world.fixtures.filter(f => f.competitionId === cup.id);
    assert.equal(cup.phase, 'complete'); assert.ok(cup.champion); assert.equal(fixtures.length, count - 1);
    assert.ok(fixtures.every(f => f.home !== f.away && f.homeGoals !== null && (f.homeGoals !== f.awayGoals || f.penalties)));
    assert.ok(s.world.awards.some(a => a.competitionId === cup.id && a.kind === 'champion' && a.teamId === cup.champion));
    assert.deepEqual(deserializeSave(serializeSave(s)), s);
  }
});
test('league tables account for every result and calendars never double-book a team within its level', () => {
  const s = state(Array.from({ length: 6 }, (_, i) => club(`c${i}`)));
  advance(s, '2027-06-30'); const table = standings(s.world, get(s, 'league:Brasil'));
  assert.equal(table.length, 6); assert.ok(table.every(t => t.played === 5));
  assert.equal(table.reduce((n, t) => n + t.goalsFor, 0), table.reduce((n, t) => n + t.goalsAgainst, 0));
  assert.ok(table.every(t => t.points === t.won * 3 + t.drawn && t.played === t.won + t.drawn + t.lost));
  const busy = new Set<string>();
  for (const f of s.world.fixtures) for (const id of [f.home, f.away]) { const level = s.world.tournaments.find(t => t.id === f.competitionId)!.level; const key = `${id}:${level}:${f.date}`; assert.equal(busy.has(key), false); busy.add(key); }
});
test('continental qualification is disjoint and league phases lead to playoffs and knockout champions', () => {
  const countries = ['Inglaterra', 'Espanha', 'Alemanha', 'Itália', 'França'];
  const s = state(countries.flatMap((country, c) => Array.from({ length: 24 }, (_, i) => club(`${c}-${i}`, country))));
  const ids = ['champions', 'europa', 'conference'].flatMap(key => get(s, key).participants);
  assert.equal(ids.length, 108); assert.equal(new Set(ids).size, 108);
  for (const key of ['champions', 'europa', 'conference']) { const cup = get(s, key); const fixtures = s.world.fixtures.filter(f => f.competitionId === cup.id); assert.equal(fixtures.length, 36 * (key === 'conference' ? 6 : 8) / 2); }
  advance(s, '2027-06-30');
  for (const key of ['champions', 'europa', 'conference']) { const cup = get(s, key); assert.equal(cup.phase, 'complete'); assert.ok(s.world.fixtures.some(f => f.competitionId === cup.id && f.stage === 'playoff')); assert.ok(cup.participants.includes(cup.champion!)); }
  assert.deepEqual(deserializeSave(serializeSave(s)), s);
});
test('World Cup has 48 simulated qualifiers, groups, best third places and a final; it recurs every four years', () => {
  const s = state([club('a'), club('b')]); const cup = get(s, 'world-cup');
  assert.equal(cup.participants.length, 48); assert.equal(cup.groups.length, 12);
  advance(s, '2026-07-08'); assert.equal(cup.phase, 'complete');
  const fixtures = s.world.fixtures.filter(f => f.competitionId === cup.id);
  assert.equal(fixtures.filter(f => f.stage === 'groups').length, 72);
  assert.equal(fixtures.filter(f => f.stage === 'knockout').length, 31);
  assert.equal(createWorld(s.clubs, 42, '2027-07-01').tournaments.some(t => t.key === 'world-cup'), false);
  const future = createWorld(s.clubs, 42, '2029-07-01'); assert.ok(future.tournaments.some(t => t.name === 'Copa do Mundo 2030'));
});
test('simulation is seeded, stops at the requested date, resumes exactly and never grants unplayed appearances', () => {
  const a = state([club('a'), club('b')]), b = structuredClone(a);
  advance(a, '2026-10-01'); advance(b, '2026-08-01'); const resumed = deserializeSave(serializeSave(b)); advance(resumed, '2026-10-01');
  assert.deepEqual(a, resumed);
  assert.ok(a.world.fixtures.filter(f => f.homeGoals !== null).every(f => f.date <= a.date));
  assert.equal(a.world.stats.some(p => p.playerId === a.player.id), false); assert.equal(a.development.appearances, 0);
  const before = serializeSave(a); advance(a, a.date); assert.equal(serializeSave(a), before);
});
test('played opportunities feed actual team scores and player awards, without awarding an eliminated spectator', () => {
  const s = state([club('a'), club('b')]); const cup = get(s, 'cup:Brasil'); const f = s.world.fixtures.find(f => f.competitionId === cup.id)!;
  s.contract = { id: 'test', clubId: f.home, playerId: s.player.id, weeklyWage: 50, signingBonus: 0, durationWeeks: 104, role: 'reserve', team: 'senior', startDate: s.date, endDate: '2028-07-01' };
  advanceWorld(s, f.date, { fixtureId: f.id, performance: { rating: 10, minutes: 90, goals: 10, assists: 1 } }); s.date = f.date;
  assert.ok(f.homeGoals! >= 11); assert.equal(cup.champion, f.home);
  const stats = s.world.stats.find(p => p.playerId === s.player.id && p.competitionId === cup.id)!;
  assert.equal(stats.goals, 10); assert.equal(stats.assists, 1); assert.equal(stats.appearances, 1);
  assert.ok(s.world.awards.some(a => a.playerId === s.player.id && a.kind === 'champion'));
  const spectator = state([club('a'), club('b')]); advance(spectator, '2027-06-30'); assert.equal(spectator.world.awards.some(a => a.playerId === spectator.player.id), false);
});
test('senior level, age, actual minutes, recent form, trust and skill are all necessary for national selection', () => {
  const s = state([club('a'), club('b')]);
  s.contract = { id: 'test', clubId: 'a', playerId: s.player.id, weeklyWage: 50, signingBonus: 0, durationWeeks: 104, role: 'reserve', team: 'senior', startDate: s.date, endDate: '2031-07-01' };
  s.date = '2029-07-01'; s.world = createWorld(s.clubs, 42, s.date); s.coachTrust = 70;
  for (const key of Object.keys(s.player.attributes) as (keyof typeof s.player.attributes)[]) s.player.attributes[key] = 85;
  s.development = { appearances: 6, minutes: 360, goals: 0, assists: 0, recentRatings: [8, 8, 8, 8, 8, 8] };
  assert.equal(nationalEligibility(s), true);
  for (const change of [(x: CareerState) => { x.contract!.team = 'youth'; }, (x: CareerState) => { x.player.birthDate = '2014-07-01'; }, (x: CareerState) => { x.coachTrust = 59; }, (x: CareerState) => { x.development.minutes = 100; }, (x: CareerState) => { x.development.recentRatings = [5]; }, (x: CareerState) => { x.player.attributes.finishing = 1; }]) { const copy = structuredClone(s); change(copy); assert.equal(nationalEligibility(copy), false); }
});
test('old v2 saves migrate to v3 and reject corrupt matches, duplicate prizes and invalid knockout draws', () => {
  const s = state([club('a'), club('b')]); const { world, ...old } = s;
  const restored = deserializeSave(JSON.stringify({ ...old, schemaVersion: 2 })); assert.equal(restored.schemaVersion, 3); assert.deepEqual(restored.player, s.player); assert.equal(restored.rng, s.rng);
  const corrupt = structuredClone(s); corrupt.world.fixtures[0]!.away = corrupt.world.fixtures[0]!.home; assert.throws(() => serializeSave(corrupt));
  advance(s, '2027-06-30'); const duplicate = structuredClone(s); duplicate.world.awards.push(duplicate.world.awards[0]!); assert.throws(() => serializeSave(duplicate));
  const badDraw = structuredClone(s); const f = badDraw.world.fixtures.find(f => f.stage === 'knockout')!; f.homeGoals = f.awayGoals = 1; f.penalties = null; assert.throws(() => serializeSave(badDraw));
});
