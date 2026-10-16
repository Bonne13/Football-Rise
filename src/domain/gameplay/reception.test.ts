import test from 'node:test';
import assert from 'node:assert/strict';
import { createReception, receptionFrame, receptionQuality } from './reception.js';
import { createTrial, missReception, ballPath } from './trial.js';
import { canRetryTrial } from '../../application/drills.js';
test('crosses arrive from opposite sides and timing windows depend on technique', () => {
  const a = createReception(1, 50), b = createReception(2, 50), bounce = createReception(3, 50);
  assert.ok(receptionFrame(a).x < 0 && receptionFrame(b).x > 0);
  assert.equal(receptionFrame(a).canStrike, false);
  a.elapsed = a.contactAt; assert.equal(receptionFrame(a).canStrike, true); assert.equal(receptionQuality(a), 1);
  assert.equal(receptionFrame(a).x, 0);
  a.elapsed += a.window + .01; assert.equal(receptionFrame(a).expired, true); assert.equal(receptionQuality(a), 0);
  assert.equal(bounce.kind,'bounce'); assert.ok(createReception(1, 90).window > createReception(1, 20).window);
});
test('misses resolve without a shot or a goal and retries are restricted to failed practice/assessment actions', () => {
  const t = createTrial('shoot',1,42); missReception(t,true);
  assert.equal(t.outcome,'timeout'); assert.equal(t.shot,null); assert.equal(t.score,0);
  assert.equal(canRetryTrial('assessment',t),true); assert.equal(canRetryTrial('match',t),false);
  t.outcome='goal';assert.equal(canRetryTrial('assessment',t),false);
  t.outcome='received';assert.equal(canRetryTrial('practice',t),false);
  t.outcome='complete';t.collisions=0;assert.equal(canRetryTrial('practice',t),false);
  t.collisions=1;assert.equal(canRetryTrial('practice',t),true);
});
test('positive and negative curves bend to their respective sides of the original line', () => {
  const from={x:440,y:950},to={x:440,y:60};assert.ok(ballPath(from,to,.5,-.5).x<440);assert.ok(ballPath(from,to,.5,.5).x>440);
});
