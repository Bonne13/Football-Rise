import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrial, controlTrial, tickTrial, keeperAt, teammateAt, isOffside, type Drill, type Trial } from './trial.js';
import { assessmentScores, createSession, recordTrial, restoreSession, matchPerformance } from '../../application/drills.js';
import { createCareer, advanceCareer } from '../../application/career.js';
function advance(t: Trial, seconds: number) { for (let i = 0; i < Math.ceil(seconds * 20); i++) tickTrial(t, .05); }
function kick(kind: Drill, aim: { x: number; y: number }, curve = 0, lift = 0) {
  const t = createTrial(kind, 1, 42); controlTrial(t, { type: 'kick', aim, curve, lift }); advance(t, 1); return t;
}
test('shots score goals, keeper saves central attempts, wide shots fail and resolved trials cannot change', () => {
  assert.equal(kick('shoot', { x: 300, y: 60 }).outcome, 'goal');
  assert.equal(kick('shoot', { x: keeperAt(0), y: 60 }).outcome, 'save');
  assert.equal(kick('shoot', { x: 700, y: 60 }).outcome, 'wide');
  const t = kick('shoot', { x: 300, y: 60 }); const before = structuredClone(t);
  controlTrial(t, { type: 'kick', aim: { x: 440, y: 60 }, curve: 0, lift: 0 }); advance(t, 1); assert.deepEqual(t, before);
});
test('free kicks hit a wall unless lift or curve clears it', () => {
  assert.equal(kick('freekick', { x: 440, y: 60 }).outcome, 'wall');
  assert.equal(kick('freekick', { x: 440, y: 60 }, 0, .8).outcome, 'goal');
  assert.equal(kick('freekick', { x: 440, y: 60 }, -1).outcome, 'goal');
});
test('passing anticipates teammate arrival and defenders intercept blocked paths', () => {
  const precise = kick('pass', teammateAt(.85)); assert.equal(precise.outcome, 'received'); assert.ok(precise.score > 95);
  assert.equal(kick('pass', { x: 400, y: 200 }).outcome, 'intercepted');
});
test('vision rejects offside but permits a free teammate behind the defensive line', () => {
  assert.equal(kick('vision', { x: 150, y: 310 }).outcome, 'received');
  assert.equal(kick('vision', { x: 330, y: 120 }).outcome, 'offside');
  assert.equal(isOffside({ x: 200, y: 250 }, { x: 440, y: 950 }, [{ x: 440, y: 75 }, { x: 440, y: 250 }]), false);
});
test('sprint responds to lanes and collision avoidance improves the result', () => {
  const good = createTrial('speed', 1, 42); controlTrial(good, { type: 'lane', direction: -1 });
  while (!good.resolved) {
    const upcoming = good.obstacles.find(o => !o.passed);
    if (upcoming && upcoming.distance - good.distance < 5 && upcoming.lane === good.lane) controlTrial(good, { type: 'lane', direction: good.lane === 0 ? 1 : -1 });
    tickTrial(good, .05);
  }
  const bad = createTrial('speed', 1, 42); bad.started = true; advance(bad, 8);
  assert.equal(good.outcome, 'complete'); assert.equal(good.score, 100); assert.ok(good.score > bad.score);
});
test('dribbling moves to destinations, requires ordered gates and penalizes cones', () => {
  const t = createTrial('technique', 1, 42);
  controlTrial(t, { type: 'move', destination: t.gates[4]! }); tickTrial(t, .1); assert.equal(t.gate, 0);
  for (const gate of t.gates) { controlTrial(t, { type: 'move', destination: gate }); for (let i = 0; i < 200 && !t.resolved && Math.hypot(t.player.x - gate.x, t.player.y - gate.y) > 3; i++) tickTrial(t, .05); }
  assert.equal(t.outcome, 'complete'); assert.equal(t.gate, 5); assert.ok(t.score > 0);
  const collision = createTrial('technique', 1, 42); controlTrial(collision, { type: 'move', destination: collision.cones[0]! }); advance(collision, 2); assert.ok(collision.collisions > 0);
});
test('waiting does not consume time, active trials time out and seeds reproduce targets', () => {
  for (const kind of ['shoot', 'vision', 'pass', 'speed', 'technique', 'freekick'] as const) {
    const t = createTrial(kind, 1, 42); advance(t, 25); assert.equal(t.time, 0); assert.equal(t.resolved, false);
    assert.deepEqual(t, createTrial(kind, 1, 42));
    t.started = true; advance(t, 25); assert.equal(t.resolved, true);
  }
});
test('invalid gameplay inputs fail and tick substeps preserve frame-rate outcomes', () => {
  const t = createTrial('shoot', 1, 42);
  assert.throws(() => controlTrial(t, { type: 'kick', aim: { x: NaN, y: 60 }, curve: 0, lift: 0 }));
  assert.throws(() => tickTrial(t, -1));
  assert.throws(() => createTrial('shoot', 1, 42.5));
  const a = createTrial('speed', 1, 42), b = structuredClone(a); a.started = b.started = true;
  for (let i = 0; i < 40; i++) tickTrial(a, .2); for (let i = 0; i < 400; i++) tickTrial(b, .02);
  assert.equal(a.outcome, b.outcome); assert.equal(a.score, b.score);
});
test('18 played trials produce assessment attributes and can resume between attempts', () => {
  let session = createSession('assessment', 42);
  assert.equal(session.sequence.length, 18); assert.throws(() => assessmentScores(session));
  for (const kind of session.sequence) {
    const t = createTrial(kind, session.results.length + 1, 42); t.resolved = true; t.score = 80; t.outcome = 'complete';
    session = recordTrial(session, t); session = restoreSession(JSON.stringify(session), createSession('assessment', 42));
  }
  assert.equal(assessmentScores(session).finishing, 80); assert.equal(assessmentScores(session).setPieces, 80);
  assert.throws(() => recordTrial(session, kick('shoot', { x: 300, y: 60 })));
  assert.throws(() => restoreSession(JSON.stringify({ ...session, seed: 43 }), createSession('assessment', 42)));
});
test('practice quality controls development and match goals come from actual goal outcomes', () => {
  let s = createCareer({ name: 'Alex', nationality: 'Brasil', position: 'ST', preferredFoot: 'right', seed: 42 });
  const scores = { finishing: 50, passing: 50, vision: 50, technique: 50, pace: 50, strength: 50, defending: 50, goalkeeping: 50, setPieces: 50, composure: 50 };
  s = advanceCareer(s, { type: 'assess', performances: scores });
  const failed = advanceCareer(s, { type: 'practice', focus: 'finishing', quality: 0 });
  assert.deepEqual(failed.player.attributes, s.player.attributes); assert.equal(failed.player.energy, s.player.energy - 15);
  assert.ok(advanceCareer(s, { type: 'practice', focus: 'finishing', quality: 100 }).player.attributes.finishing > s.player.attributes.finishing);
  assert.throws(() => advanceCareer(s, { type: 'practice', focus: 'finishing', quality: 101 }));
  let match = createSession('match', 42);
  for (const kind of match.sequence) { const t = createTrial(kind, 1, 42); t.resolved = true; t.score = 100; t.outcome = kind === 'shoot' || kind === 'freekick' ? 'goal' : 'complete'; match = recordTrial(match, t); }
  assert.deepEqual(matchPerformance(match, 30), { rating: 10, minutes: 30, goals: 2, assists: 0 });
});


test('gesture charge and player attributes determine strike speed independently of contact', async () => {
  const { strikeVelocity } = await import('./trial.js');
  const base = createCareer({ name: 'Força', nationality: 'Brasil', preferredFoot: 'right', position: 'ST', startingAge: 14, seed: 42 }).player.attributes;
  const weak = { ...base, strength: 20, technique: 20, finishing: 20, passing: 20, setPieces: 20 };
  const strong = { ...weak, strength: 80, technique: 80, finishing: 80, passing: 80, setPieces: 80 };
  assert.equal(strikeVelocity(strong, 'shoot', 0), 0);
  assert.equal(strikeVelocity(strong, 'shoot', .5), strikeVelocity(strong, 'shoot', 1) / 2);
  assert.ok(strikeVelocity(strong, 'shoot', 1) > strikeVelocity(weak, 'shoot', 1));
  assert.ok(strikeVelocity({ ...weak, passing: 90 }, 'pass', 1) > strikeVelocity(weak, 'pass', 1));
  assert.ok(strikeVelocity({ ...weak, setPieces: 90 }, 'freekick', 1) > strikeVelocity(weak, 'freekick', 1));
  const trial = createTrial('shoot', 1, 42), other = createTrial('shoot', 1, 42);
  controlTrial(trial, { type: 'kick', aim: trial.target, curve: 0, lift: 0, velocity: strikeVelocity(weak, 'shoot', .5) });
  controlTrial(other, { type: 'kick', aim: other.target, curve: 1, lift: 1, velocity: strikeVelocity(weak, 'shoot', .5) });
  assert.equal(trial.shot!.duration, other.shot!.duration);
  const fast = createTrial('shoot', 1, 42);
  controlTrial(fast, { type: 'kick', aim: fast.target, curve: 0, lift: 0, velocity: strikeVelocity(strong, 'shoot', 1) });
  assert.ok(fast.shot!.duration < trial.shot!.duration);
  assert.throws(() => strikeVelocity(strong, 'shoot', NaN));
});

test('each drill cycles through three reproducible layouts, with different shooting positions and courses', () => {
  for (const kind of ['shoot', 'freekick', 'pass', 'vision', 'technique', 'speed'] as const) {
    const variants = [1, 2, 3].map(attempt => createTrial(kind, attempt, 42));
    assert.equal(new Set(variants.map(t => t.layout)).size, 3);
    assert.deepEqual(variants[1], createTrial(kind, 2, 42));
    if (kind === 'shoot' || kind === 'freekick' || kind === 'pass') assert.equal(new Set(variants.map(t => JSON.stringify(t.origin))).size, 3);
    if (kind === 'technique') assert.equal(new Set(variants.map(t => JSON.stringify(t.gates))).size, 3);
    if (kind === 'speed') assert.equal(new Set(variants.map(t => JSON.stringify(t.obstacles))).size, 3);
    assert.notEqual(createTrial(kind, 1, 43).layout, variants[0]!.layout);
    for (const t of variants) {
      assert.ok(t.gates.every(p => p.x >= 20 && p.x <= 860 && p.y >= 100 && p.y <= 1290));
      assert.ok(t.cones.every(p => p.x >= 20 && p.x <= 860 && p.y >= 100 && p.y <= 1290));
    }
  }
});
test('moving receivers vary by scenario without changing their seeded trajectories', () => {
  assert.notDeepEqual(teammateAt(.85, 1), teammateAt(.85, 2));
  for (const layout of [0, 1, 2]) assert.deepEqual(teammateAt(.85, layout), teammateAt(.85, layout));
});

test('all dribbling layouts can be completed through the ordered gates', () => {
  for (const attempt of [1, 2, 3]) {
    const t = createTrial('technique', attempt, 42);
    for (const gate of t.gates) {
      controlTrial(t, { type: 'move', destination: gate });
      for (let i = 0; i < 220 && !t.resolved && Math.hypot(t.player.x - gate.x, t.player.y - gate.y) > 3; i++) tickTrial(t, .05);
    }
    assert.equal(t.outcome, 'complete'); assert.equal(t.gate, 5); assert.ok(t.score > 0);
  }
});

test('continuous dribbling accelerates, turns and brakes while the ball stays within reach', () => {
  const t = createTrial('technique', 1, 42);
  controlTrial(t, { type: 'steer', direction: { x: 1, y: 0 } });
  tickTrial(t, .05); const startSpeed = t.velocity.x;
  tickTrial(t, .25); assert.ok(t.velocity.x > startSpeed); assert.ok(t.player.x > 440);
  assert.ok(Math.hypot(t.ball.x - t.player.x, t.ball.y - t.player.y) < 40);
  controlTrial(t, { type: 'steer', direction: { x: 0, y: -1 } }); tickTrial(t, .4);
  assert.ok(t.velocity.y < -150); assert.ok(Math.abs(t.velocity.x) < 10);
  controlTrial(t, { type: 'steer', direction: null }); tickTrial(t, .7);
  assert.ok(Math.hypot(t.velocity.x, t.velocity.y) < 1);
  assert.ok(Math.hypot(t.ball.x - t.player.x, t.ball.y - t.player.y) < 3);
  assert.throws(() => controlTrial(t, { type: 'steer', direction: { x: NaN, y: 0 } }));
});
test('dribbling uses attributes, ordered ball crossings and reproducible time steps', () => {
  const low = createTrial('technique', 1, 42, 100, { technique: 10, pace: 10 });
  const high = createTrial('technique', 1, 42, 100, { technique: 90, pace: 90 });
  for (const t of [low, high]) { controlTrial(t, { type: 'steer', direction: { x: 0, y: -1 } }); tickTrial(t, .5); }
  assert.ok(high.player.y < low.player.y); assert.ok(high.gate >= 1);
  const a = createTrial('technique', 1, 42), b = structuredClone(a);
  for (const t of [a, b]) controlTrial(t, { type: 'steer', direction: { x: .25, y: -.75 } });
  tickTrial(a, 1); for (let i = 0; i < 40; i++) tickTrial(b, .025);
  assert.ok(Math.hypot(a.player.x - b.player.x, a.player.y - b.player.y) < .001);
  assert.equal(a.gate, b.gate); assert.equal(a.collisions, b.collisions);
});

test('goal result and the rendered ball share the same complete line crossing; saves stop in front of the line', () => {
  const scored = kick('shoot', { x: 300, y: 60 });
  assert.equal(scored.shot!.decision, 'goal');
  assert.ok(scored.shot!.ball.position.z + scored.shot!.ball.radius < scored.shot!.goalLine.z);
  assert.equal(scored.referee.signal, 'goal');
  const saved = kick('shoot', { x: keeperAt(0), y: 60 });
  assert.equal(saved.outcome, 'save'); assert.ok(saved.shot!.ball.position.z > saved.shot!.goalLine.z); assert.notEqual(saved.shot!.decision, 'goal');
  const offside = kick('vision', { x: 330, y: 120 });
  assert.equal(offside.outcome, 'offside'); assert.equal(offside.referee.signal, 'offside'); assert.equal(offside.shot!.offsideSnapshot!.offside, true);
});
