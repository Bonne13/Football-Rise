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
  assert.deepEqual(contactEffects(0, 0), { x: 0, y: 0, curve: 0, lift: 0 });
  assert.ok(contactEffects(-.5, 0).curve < 0);
  assert.ok(contactEffects(0, -.5).lift > 0);
  assert.equal(contactEffects(0, .5).lift, 0);
  const edge = contactEffects(1, 1);
  assert.ok(Math.hypot(edge.x, edge.y) <= .95 + 1e-10);
});

test('passing, vision, dribbling and sprinting are placed in midfield zones, away from the box', async () => {
  const { fieldZone } = await import('./field3d.js');
  for (const kind of ['pass', 'vision', 'technique', 'speed'] as const) {
    assert.equal(new Set([0, 1, 2].map(layout => fieldZone(kind, layout))).size, 3);
    for (const layout of [0, 1, 2]) assert.ok(fieldZone(kind, layout) > 16.5);
  }
  for (const kind of ['shoot', 'freekick'] as const) assert.equal(fieldZone(kind, 0), 0);
});

test('sprint faces forward at rest and on straight runs; changing lanes never turns the runner sideways', async () => { const { sprintHeading } = await import('./field3d.js'); assert.equal(sprintHeading(0, 10), -0); assert.ok(Math.abs(sprintHeading(20, 10)) < Math.PI / 4); assert.ok(sprintHeading(-2,10) > 0); });
