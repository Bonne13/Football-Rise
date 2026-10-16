import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, advanceCareer, careerView } from './career.js';
import { ATTRIBUTES, POSITIONS, type CareerState } from '../domain/career/state.js';
import type { Attributes } from '../domain/player/player.js';
import { calculateOverall } from '../domain/player/player.js';
import { deserializeSave, serializeSave } from '../persistence/save.js';
import { ageOn } from '../core/rules.js';
import { eligible } from '../domain/career/progression.js';
const input = { name: 'Alex', nationality: 'Brasil', position: 'CM' as const, preferredFoot: 'right' as const, seed: 42 };
const performances = Object.fromEntries(ATTRIBUTES.map(k => [k, 65])) as Attributes;
function trained(age: 14 | 15 | 16 = 14) {
  let s = createCareer({ ...input, startingAge: age }); s = advanceCareer(s, { type: 'assess', performances });
  return advanceCareer(s, { type: 'train', focus: 'passing' });
}
function contracted(age: 14 | 15 | 16 = 14) {
  const s = advanceCareer(trained(age), { type: 'scout' }); return advanceCareer(s, { type: 'accept', offerId: s.offers[0]!.id });
}
function play(s: CareerState) {
  if (s.player.energy < 50) s = advanceCareer(s, { type: 'recover' });
  return advanceCareer(advanceCareer(s, { type: 'prepare' }), { type: 'performance', performance: { rating: 8, minutes: 60, goals: 0, assists: 0 } });
}
test('all positions and starting ages reach the first fixture with valid resumable saves', () => {
  for (const position of POSITIONS) for (const startingAge of [14, 15, 16] as const) {
    let s = createCareer({ ...input, position, startingAge });
    s = advanceCareer(s, { type: 'assess', performances }); s = advanceCareer(s, { type: 'train', focus: 'technique' });
    s = advanceCareer(s, { type: 'scout' }); assert.ok(s.offers.length); assert.ok(s.offers.every(o => o.team === 'youth'));
    s = advanceCareer(s, { type: 'accept', offerId: s.offers[0]!.id }); s = advanceCareer(s, { type: 'prepare' });
    assert.equal(s.stage, 'ready'); assert.equal(ageOn(s.player.birthDate, s.date), startingAge);
    assert.deepEqual(deserializeSave(serializeSave(s)), s); assert.ok(s.preparation!.expectedMinutes > 0);
  }
});
test('seed and save/resume preserve deterministic recruitment', () => {
  assert.deepEqual(createCareer(input), createCareer(input)); const s = trained();
  assert.deepEqual(advanceCareer(s, { type: 'scout' }), advanceCareer(deserializeSave(serializeSave(s)), { type: 'scout' }));
  assert.equal('potential' in careerView(s), false); assert.equal('rng' in careerView(s), false);
});
test('invalid inputs, scores and out-of-order actions fail without mutation', () => {
  for (const seed of [-1, NaN, .5]) assert.throws(() => createCareer({ ...input, seed }));
  assert.throws(() => createCareer({ ...input, name: '' }));
  const s = createCareer(input); const before = structuredClone(s);
  assert.throws(() => advanceCareer(s, { type: 'prepare' })); assert.throws(() => advanceCareer(s, { type: 'scout' }));
  assert.throws(() => advanceCareer(s, { type: 'assess', performances: { ...performances, passing: 101 } })); assert.deepEqual(s, before);
});
test('training improves focus, consumes energy, respects potential and requires recovery', () => {
  let s = trained(); const potential = s.player.potential;
  for (let i = 0; i < 100; i++) {
    if (s.player.energy < 20) s = advanceCareer(s, { type: 'recover' });
    s = advanceCareer(s, { type: 'train', focus: 'passing' }); assert.ok(calculateOverall(s.player.position, s.player.attributes) <= potential);
  }
  s.player.energy = 19; assert.throws(() => advanceCareer(s, { type: 'train', focus: 'passing' }));
});
test('recruitment rejects inadequate position, budget and vacancies', () => {
  for (const field of ['budget', 'vacancy', 'position', 'overall']) {
    const s = trained(); s.clubs.forEach(c => { if (field === 'budget') c.wageBudget = 0; if (field === 'vacancy') { c.youthPlaces = 0; c.seniorPlaces = 0; } if (field === 'position') c.needs = ['GK']; if (field === 'overall') c.minimumOverall = 100; });
    assert.equal(advanceCareer(s, { type: 'scout' }).offers.length, 0);
  }
});
test('signing validates terms, occupies a vacancy and debits wage and bonus once', () => {
  const s = advanceCareer(trained(), { type: 'scout' }); const o = s.offers[0]!; const c = s.clubs.find(c => c.id === o.clubId)!;
  const bad = structuredClone(s); bad.offers[0]!.weeklyWage++;
  assert.throws(() => advanceCareer(bad, { type: 'accept', offerId: o.id }));
  const result = advanceCareer(s, { type: 'accept', offerId: o.id }); const updated = result.clubs.find(x => x.id === c.id)!;
  assert.equal(updated.youthPlaces, c.youthPlaces - 1); assert.equal(updated.wageBudget, c.wageBudget - o.weeklyWage - o.signingBonus);
  assert.equal(result.offers.length, 0); assert.throws(() => advanceCareer(result, { type: 'accept', offerId: o.id }));
});
test('promotion at 15 and 16 depends on performance, never at 14', () => {
  const d = { appearances: 6, minutes: 360, goals: 0, assists: 0, recentRatings: [8, 8, 8, 8, 8, 8] };
  assert.equal(eligible(14, d), false); assert.equal(eligible(15, d), true);
  assert.equal(eligible(15, { ...d, recentRatings: [7, 7, 7, 7, 7, 7] }), false);
  assert.equal(eligible(16, { ...d, recentRatings: [7, 7, 7, 7, 7, 7] }), true);
  for (const age of [14, 15, 16] as const) { let s = contracted(age); for (let i = 0; i < 6; i++) s = play(s);
    if (age === 14) assert.throws(() => advanceCareer(s, { type: 'promote' })); else assert.equal(advanceCareer(s, { type: 'promote' }).contract!.team, 'senior'); }
});
test('calendar crossing from 14 to 15 allows earned promotion', () => {
  let s = contracted(); for (let i = 0; i < 52; i++) s = play(s); assert.equal(ageOn(s.player.birthDate, s.date), 14);
  s = play(s); assert.equal(ageOn(s.player.birthDate, s.date), 15); assert.equal(advanceCareer(s, { type: 'promote' }).contract!.team, 'senior');
});
test('midseason transfer releases previous vacancy and wage without refunding the bonus', () => {
  let s = play(contracted()); const old = s.contract!; const c = s.clubs.find(c => c.id === old.clubId)!;
  s.clubs.forEach(c => { c.minimumOverall = 1; c.minimumPotential = 1; });
  s = advanceCareer(s, { type: 'scout' }); const o = s.offers[0]!; assert.notEqual(o.clubId, old.clubId);
  s = advanceCareer(s, { type: 'accept', offerId: o.id }); assert.equal(s.clubs.find(x => x.id === c.id)!.youthPlaces, c.youthPlaces + 1);
  assert.equal(s.clubs.find(x => x.id === c.id)!.wageBudget, c.wageBudget + old.weeklyWage);
});
test('senior squads can recruit eligible teenagers in midseason', () => {
  let s = contracted(15); for (let i = 0; i < 6; i++) s = play(s);
  s.clubs.forEach(c => { c.minimumOverall = 1; c.minimumPotential = 1; c.squadOverall = 40; });
  s = advanceCareer(s, { type: 'scout' }); const o = s.offers.find(o => o.team === 'senior'); assert.ok(o);
  assert.equal(advanceCareer(s, { type: 'accept', offerId: o.id }).contract!.team, 'senior');
});
test('a result cannot be recorded twice and preparation requires fitness and a valid contract', () => {
  const s = contracted(); s.player.energy = 49; assert.throws(() => advanceCareer(s, { type: 'prepare' }));
  s.player.energy = 100; s.contract!.endDate = '2026-07-05'; assert.throws(() => advanceCareer(s, { type: 'prepare' }));
  assert.throws(() => advanceCareer(play(contracted()), { type: 'performance', performance: { rating: 8, minutes: 60, goals: 0, assists: 0 } }));
});
test('invalid and unsupported saves are rejected without silently resetting', () => {
  const s = contracted(); assert.throws(() => deserializeSave('{bad'));
  for (const bad of [{ ...s, schemaVersion: 99 }, { ...s, contract: null }, { ...s, date: '2026-02-30' }, { ...s, extra: 1 }, { ...s, development: { ...s.development, appearances: 10 } }]) assert.throws(() => deserializeSave(JSON.stringify(bad)));
  s.player.attributes.passing = NaN; assert.throws(() => serializeSave(s));
});
