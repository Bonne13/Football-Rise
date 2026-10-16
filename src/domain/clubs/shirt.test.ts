import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, advanceCareer } from '../../application/career.js';
import { ATTRIBUTES } from '../career/state.js';
import { deserializeSave, serializeSave } from '../../persistence/save.js';
import { numberAvailability, joinShirt } from './shirt.js';
function contracted() {
  let s = createCareer({ name: 'Alex', nationality: 'Brasil', position: 'ST', preferredFoot: 'right', seed: 42 });
  s = advanceCareer(s, { type: 'assess', performances: Object.fromEntries(ATTRIBUTES.map(k => [k, 80])) as typeof s.player.attributes });
  s = advanceCareer(s, { type: 'train', focus: 'finishing' });
  s = advanceCareer(s, { type: 'scout' }); return advanceCareer(s, { type: 'accept', offerId: s.offers[0]!.id });
}
test('free shirts are available, occupied shirts require both trust and ability without mutating a rejected save', () => {
  const s = contracted(), before = serializeSave(s);
  assert.equal(s.shirt.number, 24);
  assert.equal(advanceCareer(s, { type: 'shirt-number', number: 99 }).shirt.number, 99);
  assert.throws(() => advanceCareer(s, { type: 'shirt-number', number: 10 }), /confiança/);
  assert.equal(serializeSave(s), before);
  const requirement = numberAvailability(s, 10);
  s.coachTrust = 100;
  for (const k of ATTRIBUTES) s.player.attributes[k] = 1;
  assert.equal(numberAvailability(s, 10).allowed, false);
  for (const k of ATTRIBUTES) s.player.attributes[k] = 90;
  s.coachTrust = requirement.requiredTrust - 1;
  assert.equal(numberAvailability(s, 10).allowed, false);
  s.coachTrust = requirement.requiredTrust;
  const result = advanceCareer(s, { type: 'shirt-number', number: 10 });
  assert.equal(result.shirt.number, 10);
  assert.equal(result.shirt.holders.find(h => h.id === requirement.holder!.id)!.number, 24);
  assert.equal(new Set([result.shirt.number, ...result.shirt.holders.map(h => h.number)]).size, 24);
});
test('number and kit choices validate integers, persist, and get reassigned on entering a new squad', () => {
  const s = contracted();
  for (const number of [0, 100, 3.5, NaN]) assert.throws(() => advanceCareer(s, { type: 'shirt-number', number }));
  for (const index of [-1, 3, 1.5, NaN]) assert.throws(() => advanceCareer(s, { type: 'kit', index }));
  let next = advanceCareer(advanceCareer(s, { type: 'shirt-number', number: 99 }), { type: 'kit', index: 2 });
  assert.deepEqual(deserializeSave(serializeSave(next)), next);
  next.shirt.preferredNumber = 10; joinShirt(next);
  assert.equal(next.shirt.number, 24); assert.equal(next.shirt.kitIndex, 0);
  const bad = structuredClone(next); bad.shirt.holders[0]!.number = bad.shirt.number;
  assert.throws(() => serializeSave(bad));
});
test('good and poor performances change the persistent coach trust', () => {
  const s = advanceCareer(contracted(), { type: 'prepare' });
  const good = advanceCareer(s, { type: 'performance', performance: { rating: 9, minutes: 15, goals: 0, assists: 0 } });
  const poor = advanceCareer(s, { type: 'performance', performance: { rating: 3, minutes: 15, goals: 0, assists: 0 } });
  assert.ok(good.coachTrust > s.coachTrust); assert.ok(poor.coachTrust < s.coachTrust);
});
test('version 1 saves migrate deterministically without losing career, results or RNG', () => {
  const s = contracted(); const { shirt, coachTrust, dataPack, world, ...legacy } = s;
  const migrated = deserializeSave(JSON.stringify({ ...legacy, schemaVersion: 1 }));
  assert.equal(migrated.schemaVersion, 3); assert.deepEqual(migrated.player, s.player);
  assert.deepEqual(migrated.development, s.development); assert.equal(migrated.rng, s.rng);
  assert.equal(migrated.shirt.number, 24); assert.deepEqual(deserializeSave(serializeSave(migrated)), migrated);
  assert.deepEqual(deserializeSave(JSON.stringify({ ...legacy, schemaVersion: 1 })), migrated);
});
