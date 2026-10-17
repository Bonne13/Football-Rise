import test from 'node:test';
import assert from 'node:assert/strict';
import { coachFor } from './coaches.js';
import { clubKits } from './kits.js';

test('each club and category has a stable separate coach and staff colors without a claimed real identity',()=>{
  const club={id:'aurora',name:'Aurora Atlético',country:'Brasil'},kit=clubKits.kitsFor(club.id)[0];
  const youth=coachFor(club,kit),senior=coachFor(club,kit,'senior');
  assert.deepEqual(youth,coachFor(club,kit));assert.notEqual(youth.id,senior.id);assert.notEqual(youth.appearanceSeed,senior.appearanceSeed);
  assert.match(youth.label,/base/);assert.match(senior.label,/principal/);assert.equal(youth.simulated,true);
  assert.equal(youth.kit.secondary,kit.secondary);assert.equal(youth.kit.pattern,'plain');assert.notEqual(youth.kit.shorts,'#f77728');
  assert.match(youth.source,/não confirmada/);
  assert.notEqual(youth.appearanceSeed,coachFor({...club,id:'vale'},kit).appearanceSeed);
});
