import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrial, controlTrial, tickTrial } from '../gameplay/trial.js';
import { reviewIncident, reviewFrame, reviewVerdict } from './video-review.js';
function play(kind: 'shoot' | 'vision', x: number, y: number) { const t = createTrial(kind, 1, 42); controlTrial(t, { type: 'kick', aim: { x, y }, curve: 0, lift: 0 }); tickTrial(t, 1); return t; }
test('VAR evidence is a frozen copy of an actual resolved goal or involved offside', () => {
  assert.equal(reviewIncident(createTrial('shoot', 1, 42)), null);
  const goal = play('shoot', 300, 60), review = reviewIncident(goal)!;
  assert.equal(review.verdict, 'goal'); assert.equal(reviewVerdict(review), 'GOL CONFIRMADO');
  goal.shot!.ball.position.z = 9; assert.ok(review.ball.position.z < review.goal.z);
  const offside = reviewIncident(play('vision', 330, 120))!; assert.equal(offside.verdict, 'offside'); assert.equal(offside.offside!.offside, true);
  assert.equal(reviewIncident(play('vision', 150, 310)), null);
  assert.equal(reviewIncident(play('shoot', 440, 60))!.verdict, 'no-goal');
});
test('all cinematic stages complete and skipping cannot change the verdict or trial result', () => {
  const t = play('shoot', 300, 60), before = structuredClone(t), incident = reviewIncident(t)!;
  assert.equal(reviewFrame(0).phase, 'assistant'); assert.equal(reviewFrame(2).phase, 'room');
  assert.equal(reviewFrame(6).phase, 'walk'); assert.equal(reviewFrame(12).phase, 'monitor');
  assert.equal(reviewFrame(15).phase, 'decision'); assert.equal(reviewFrame(100).phase, 'complete');
  assert.deepEqual(t, before); assert.equal(incident.verdict, 'goal');
});
