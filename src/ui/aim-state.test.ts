import test from 'node:test';
import assert from 'node:assert/strict';
import { validTarget, pulledShot } from './aim-state.js';
test('aim rejects sky, invalid coordinates and touches outside the goal', () => {
  for (const p of [null, { x: NaN, y: 60 }, { x: 100, y: 60 }, { x: 300, y: -20 }, { x: 300, y: 500 }]) assert.equal(validTarget(p, false), null);
  assert.deepEqual(validTarget({ x: 300, y: 60 }, false), { x: 300, y: 60 });
  assert.deepEqual(validTarget({ x: 235, y: 24 }, false), { x: 240, y: 25 });
  assert.equal(validTarget({ x: 300, y: 40 }, true), null);
  assert.deepEqual(validTarget({ x: 300, y: 300 }, true), { x: 300, y: 300 });
});
test('pull starts at zero, reaches the selected target at full power, and clamps force', () => {
  const origin = { x: 440, y: 950 }, target = { x: 300, y: 60 };
  assert.deepEqual(pulledShot(origin, target, 0, 0, 60), { power: 0, aim: origin });
  assert.deepEqual(pulledShot(origin, target, 0, 60, 60), { power: 1, aim: target });
  assert.equal(pulledShot(origin, target, 0, 100, 60).power, 1);
  assert.equal(pulledShot(origin, target, 0, -20, 60).power, 0);
  assert.ok(pulledShot(origin, target, 10, 60, 60).aim.x < target.x);
});
