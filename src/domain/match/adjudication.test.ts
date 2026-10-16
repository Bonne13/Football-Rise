import test from 'node:test';
import assert from 'node:assert/strict';
import { judgeGoal, judgeOffside, BALL_RADIUS, NEAR_GOAL, type PlayerBody } from './adjudication.js';
const from = { x: 0, y: 1, z: 1 };
const passBall = { position: { x: 0, y: .11, z: 30 }, radius: BALL_RADIUS };
const ball = (z: number, x = 0, y = 1) => ({ radius: BALL_RADIUS, position: { x, y, z } });
test('goal requires the whole ball beyond the outer edge, not its centre or contact with the line', () => {
  const edge = NEAR_GOAL.z - BALL_RADIUS;
  for (const z of [.05, NEAR_GOAL.z, edge + .001, edge]) assert.equal(judgeGoal(from, ball(z), NEAR_GOAL), 'not-crossed');
  assert.equal(judgeGoal(from, ball(edge - .001), NEAR_GOAL), 'goal');
  assert.equal(judgeGoal({ ...from, z: -1 }, ball(-2), NEAR_GOAL), 'not-crossed');
  assert.equal(judgeGoal({ ...from, z: -1 }, ball(1), NEAR_GOAL), 'not-crossed');
});
test('the swept crossing must be between posts, below the bar, and clear of offside', () => {
  assert.equal(judgeGoal({ x: 4, y: 1, z: 1 }, ball(-1, 4), NEAR_GOAL), 'outside-mouth');
  assert.equal(judgeGoal({ x: 0, y: 2.4, z: 1 }, ball(-1, 0, 2.4), NEAR_GOAL), 'outside-mouth');
  assert.equal(judgeGoal(from, ball(-1), NEAR_GOAL, true), 'offside');
  assert.equal(judgeGoal({ x: 0, y: .11, z: 1 }, ball(-1, 0, .11), NEAR_GOAL), 'goal');
  assert.equal(judgeGoal({ x: 0, y: 1, z: -1 }, ball(1), { ...NEAR_GOAL, z: 0, attackingDirection: 1 }), 'goal');
  assert.throws(() => judgeGoal(from, ball(NaN), NEAR_GOAL));
});
const player = (id: string, z: number, playableRadius = .12): PlayerBody => ({ id, position: { x: 0, y: 0, z }, playableRadius });
test('offside compares eligible body parts with the ball and second-last opponent, independent of goalkeeper identity', () => {
  const defenders = [player('gk', 0), player('d1', 15), player('d2', 20)];
  assert.equal(judgeOffside(player('a', 14), passBall, defenders).offside, true);
  assert.equal(judgeOffside(player('a', 15), passBall, defenders).offside, false);
  assert.equal(judgeOffside(player('a', 16), passBall, defenders).offside, false);
  assert.equal(judgeOffside(player('a', 16), passBall, defenders.reverse()).offside, false);
  assert.equal(judgeOffside(player('a', 15, .3), passBall, defenders).offside, true);
  assert.equal(judgeOffside(player('a', 60), passBall, defenders).offside, false);
  assert.equal(judgeOffside(player('a', 14), { position: { ...from, z: 10 }, radius: BALL_RADIUS }, defenders).offside, false);
});
test('offside snapshot is frozen at the pass; later movement does not change the decision', () => {
  const attacker = player('a', 14), defenders = [player('d', 15), player('gk', 0)];
  const snapshot = judgeOffside(attacker, passBall, defenders);
  attacker.position.z = 30; defenders[0]!.position.z = 10;
  assert.equal(snapshot.receiver.position.z, 14); assert.equal(snapshot.defenders[0]!.position.z, 15); assert.equal(snapshot.offside, true);
  const mirrored = judgeOffside(player('a', 91), { position: { ...from, z: 80 }, radius: BALL_RADIUS }, [player('gk', 105), player('d', 90)], 1);
  assert.equal(mirrored.offside, true);
});

test('first touch directly from goal kick, corner or throw-in is exempt; an uninvolved offside position is not a goal by itself', () => {
  const receiver = player('a', 5), defenders = [player('gk', 0), player('d', 15)];
  for (const restart of ['goal-kick', 'throw-in', 'corner'] as const) assert.equal(judgeOffside(receiver, passBall, defenders, -1, 52.5, restart).offside, false);
  assert.equal(judgeOffside(receiver, passBall, defenders).offside, true);
});
