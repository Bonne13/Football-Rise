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

test('free pull needs a backward gesture and permits steering beyond the posts', async () => {
  const { freePullShot } = await import('./aim-state.js');
  const origin = { x: 440, y: 950 };
  for (const dy of [-100, 0, 11]) assert.equal(freePullShot(origin, 30, dy, 120, false).active, false);
  const left = freePullShot(origin, 50, 90, 120, false);
  assert.equal(left.active, true); assert.equal(left.power, .75); assert.ok(left.aim.x < 240);
  assert.ok(freePullShot(origin, -50, 90, 120, false).aim.x > 640);
  assert.equal(freePullShot(origin, 0, 240, 120, false).power, 1);
  assert.equal(freePullShot(origin, NaN, 90, 120, false).active, false);
  assert.equal(freePullShot(origin, 0, 120, 120, true).aim.y, 95);
});

test('aim direction stays fixed when pulling farther along the same angle; charge changes independently', async () => {
  const { freePullShot, dribbleStick } = await import('./aim-state.js');
  const origin = { x: 640, y: 1200 };
  const soft = freePullShot(origin, 10, 50, 120, false), hard = freePullShot(origin, 20, 100, 120, false);
  assert.deepEqual(soft.aim, hard.aim); assert.ok(hard.power > soft.power);
  assert.equal(freePullShot(origin, 0, 200, 120, false).aim.y, 60);
  assert.ok(Math.abs(freePullShot(origin, 1, 100, 120, false).aim.x - origin.x) < 8);
  assert.equal(dribbleStick(4, 4), null); assert.equal(dribbleStick(NaN, 5), null);
  assert.deepEqual(dribbleStick(0, -100), { x: 0, y: -1 });
  const diagonal = dribbleStick(100, 100)!; assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
  assert.ok(Math.hypot(dribbleStick(0, 30)!.x, dribbleStick(0, 30)!.y) < 1);
});
