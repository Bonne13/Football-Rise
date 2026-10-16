import test from 'node:test';
import assert from 'node:assert/strict';
import { contactEffects, worldPoint } from './field3d.js';
test('goal coordinates project into a regulation-sized 3D goal', () => {
  assert.deepEqual(worldPoint({ x: 440, y: 95 }, true), { x: 0, y: 0, z: 0 });
  assert.ok(Math.abs(worldPoint({ x: 240, y: 25 }, true).x + 3.66) < 1e-10);
  assert.equal(worldPoint({ x: 640, y: 25 }, true).y, 2.44);
  assert.ok(worldPoint({ x: 440, y: 950 }).z > 0);
});
test('contact on the lower half lifts the ball, side contact curves it, and contact stays on the sphere', () => {
  assert.deepEqual(contactEffects(0, 0), { x: 0, y: 0, curve: -0, lift: 0 });
  assert.ok(contactEffects(-.5, 0).curve > 0);
  assert.ok(contactEffects(0, -.5).lift > 0);
  assert.equal(contactEffects(0, .5).lift, 0);
  const edge = contactEffects(1, 1);
  assert.ok(Math.hypot(edge.x, edge.y) <= .95 + 1e-10);
});
