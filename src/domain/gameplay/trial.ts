import { BALL_RADIUS, NEAR_GOAL, judgeGoal, judgeOffside, type BallBody, type GoalLine, type GoalDecision, type OffsideSnapshot } from '../match/adjudication.js';
import type { Attributes } from '../player/player.js';
import { bounded, draw, requireRule } from '../../core/rules.js';
export const DRILLS = ['shoot', 'vision', 'pass', 'speed', 'technique', 'freekick'] as const;
export type Drill = typeof DRILLS[number];
export interface Point { x: number; y: number }
export interface Shot { from: Point; end: Point; curve: number; lift: number; elapsed: number; duration: number; receiver: Point | null; offside: boolean; keeper: number; ball: BallBody; goalLine: GoalLine; decision: GoalDecision | null; offsideSnapshot: OffsideSnapshot | null; stoppedBy: 'keeper' | 'wall' | null }
export interface Trial {
  kind: Drill; attempt: number; layout: number; time: number; started: boolean; resolved: boolean; score: number;
  message: string; outcome: 'goal' | 'save' | 'wide' | 'wall' | 'received' | 'intercepted' | 'offside' | 'complete' | 'timeout' | null;
  origin: Point; aim: Point; target: Point; shot: Shot | null; player: Point; destination: Point | null;
  ball: Point; velocity: Point; steering: Point | null; travel: number; handling: number; running: number;
  gates: Point[]; gate: number; cones: Point[]; collisions: number; touching: boolean;
  lane: number; distance: number; obstacles: { distance: number; lane: number; passed: boolean }[];
  mates: Point[]; defenders: Point[]; offsideLine: number; accuracy: number; referee: { position: Point; signal: 'none' | 'goal' | 'offside' | 'no-goal' };
}
export type TrialInput = { type: 'kick'; aim: Point; curve: number; lift: number; velocity?: number } | { type: 'move'; destination: Point } | { type: 'lane'; direction: -1 | 1 } | { type: 'steer'; direction: Point | null };
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function keeperAt(time: number) { return 440 + Math.sin(time * 1.8) * 135; }
export function teammateAt(time: number, layout = 0): Point { return { x: 320 + layout * 70 + Math.sin(time * 1.25 + layout * .8) * 150, y: 210 + layout * 100 }; }
export function ballPath(from: Point, to: Point, fraction: number, curve: number): Point {
  return { x: from.x + (to.x - from.x) * fraction + 640 * fraction * (1 - fraction) * curve, y: from.y + (to.y - from.y) * fraction };
}
export function blockedPath(from: Point, to: Point, defenders: Point[], curve: number) {
  for (let i = 1; i < 60; i++) if (defenders.some(p => distance(ballPath(from, to, i / 60, curve), p) < 35)) return true;
  return false;
}
export const trialZone = (kind: Drill, layout: number) => ['shoot', 'freekick'].includes(kind) ? 0 : [35, 28, 42][layout % 3]!;
export const fieldBody = (p: Point, zone = 0) => ({ x: (p.x - 440) / (400 / 7.32), y: BALL_RADIUS, z: (p.y - 95) / 50 + zone });
export function offsideAtPass(receiver: Point, ball: Point, opponents: Point[], zone = 0) {
  return judgeOffside({ id: 'receiver', position: fieldBody(receiver, zone), playableRadius: .12 }, { position: fieldBody(ball, zone), radius: BALL_RADIUS }, opponents.map((p, i) => ({ id: `defender-${i}`, position: fieldBody(p, zone), playableRadius: .12 })));
}
export function isOffside(receiver: Point, ball: Point, opponents: Point[]) { return offsideAtPass(receiver, ball, opponents).offside; }
export function createTrial(kind: Drill, attempt: number, seed: number, accuracy = 100, movement = { technique: 50, pace: 50 }): Trial {
  requireRule(DRILLS.includes(kind) && Number.isInteger(attempt) && attempt >= 1, 'Fundamento inválido.'); bounded(seed, 0, 0xffffffff); requireRule(Number.isInteger(seed), 'Seed inválida.'); bounded(accuracy, 1, 100);
  bounded(movement.technique, 0, 100); bounded(movement.pace, 0, 100);
  const layout = (seed % 3 + attempt - 1) % 3;
  const side = draw((seed + attempt) >>> 0, 0, 1).value;
  const trial: Trial = { kind, attempt, layout, time: 0, started: false, resolved: false, score: 0, message: '', outcome: null,
    origin: { x: 440, y: kind === 'freekick' ? 1100 : 950 }, aim: { x: 440, y: 65 }, target: { x: side ? 580 : 300, y: 60 },
    shot: null, player: { x: 440, y: 1170 }, destination: null,
    ball: { x: 440, y: 1150 }, velocity: { x: 0, y: 0 }, steering: null, travel: 0, handling: movement.technique, running: movement.pace,
    gates: [{ x: 440, y: 1010 }, { x: 230, y: 820 }, { x: 630, y: 640 }, { x: 300, y: 440 }, { x: 440, y: 260 }], gate: 0,
    cones: [{ x: 570, y: 980 }, { x: 410, y: 810 }, { x: 440, y: 620 }, { x: 500, y: 450 }], collisions: 0, touching: false,
    lane: 1, distance: 0, obstacles: Array.from({ length: 8 }, (_, i) => ({ distance: 15 + i * 10, lane: (i * 2 + attempt) % 3, passed: false })),
    mates: [{ x: 150, y: 310 }, { x: 330, y: 120 }, { x: 560, y: 330 }, { x: 740, y: 280 }],
    defenders: [{ x: 400, y: 250 }, { x: 560, y: 370 }, { x: 740, y: 320 }], offsideLine: 250, accuracy, referee: { position: { x: 115, y: 650 }, signal: 'none' } };
  if (layout) {
    if (kind === 'shoot') trial.origin = layout === 1 ? { x: 250, y: 850 } : { x: 650, y: 1200 };
    else if (kind === 'freekick') trial.origin = layout === 1 ? { x: 280, y: 1050 } : { x: 630, y: 1250 };
    else trial.origin = { x: layout === 1 ? 250 : 640, y: 1000 + layout * 60 };
    const variant = (p: Point, index: number) => ({ x: layout === 1 ? 880 - p.x : clamp(p.x + (index % 2 ? 90 : -80), 100, 780), y: p.y + (layout === 2 ? 35 : 0) });
    trial.gates = trial.gates.map(variant); trial.cones = trial.cones.map(variant);
    trial.player = { x: layout === 1 ? 620 : 220, y: 1200 };
    trial.mates = trial.mates.map(variant); trial.defenders = trial.defenders.map(variant);
    trial.offsideLine = layout === 2 ? 285 : 250;
    trial.obstacles.forEach((o, i) => { o.lane = (o.lane + layout + i % 2) % 3; o.distance += i % 2 ? layout * 2 : 0; });
  }
  if (kind === 'pass') trial.defenders.push({ x: 790, y: 130 });
  const zone = trialZone(kind, layout);
  trial.offsideLine = (offsideAtPass(trial.mates[0]!, trial.origin, [{ x: 440, y: 95 }, ...trial.defenders], zone).line - zone) * 50 + 95;
  trial.ball = { x: trial.player.x, y: trial.player.y - 20 };
  return trial;
}
function finish(t: Trial, score: number, message: string, outcome: Trial['outcome']) {
  t.resolved = true; t.score = Math.round(clamp(score, 0, 100)); t.message = message; t.outcome = outcome; t.referee.signal = outcome === 'goal' ? 'goal' : outcome === 'offside' ? 'offside' : ['save', 'wide', 'wall'].includes(outcome ?? '') ? 'no-goal' : 'none';
}
/** Prototype calibration: attributes set the ceiling, gesture selects a fraction of it. */
export function strikeVelocity(attributes: Attributes, kind: Drill, charge: number): number {
  bounded(charge, 0, 1);
  const skill = kind === 'pass' || kind === 'vision' ? attributes.passing : kind === 'freekick' ? attributes.setPieces : attributes.finishing;
  bounded(attributes.strength, 0, 100); bounded(attributes.technique, 0, 100); bounded(skill, 0, 100);
  const ceiling = 55 + attributes.strength * .45 + attributes.technique * .15 + skill * .25;
  return ceiling * charge;
}
/** Input mutates only a private copy owned by the running field adapter. */
export function controlTrial(t: Trial, input: TrialInput) {
  if (t.resolved || t.shot) return;
  if (input.type === 'lane') { if (t.kind !== 'speed') return; t.started = true; t.lane = clamp(t.lane + input.direction, 0, 2); return; }
  if (input.type === 'steer') {
    if (t.kind !== 'technique') return;
    if (input.direction) { bounded(input.direction.x, -1, 1); bounded(input.direction.y, -1, 1); const size = Math.max(1, Math.hypot(input.direction.x, input.direction.y)); t.steering = { x: input.direction.x / size, y: input.direction.y / size }; t.started = true; }
    else t.steering = null;
    t.destination = null; return;
  }
  if (input.type === 'move') { if (t.kind !== 'technique') return; bounded(input.destination.x, 0, 880); bounded(input.destination.y, 0, 1320); t.started = true; t.steering = null; t.destination = { ...input.destination }; return; }
  if (!['shoot', 'freekick', 'pass', 'vision'].includes(t.kind)) return;
  bounded(input.aim.x, -1500, 2500); bounded(input.aim.y, -1500, 2500); bounded(input.curve, -1, 1); bounded(input.lift, 0, 1);
  if (input.velocity !== undefined) bounded(input.velocity, 1, 150);
  t.started = true; t.aim = { ...input.aim };
  const receiver = t.kind === 'vision' ? [...t.mates].sort((a, b) => distance(a, input.aim) - distance(b, input.aim))[0]! : null;
  const duration = input.velocity === undefined ? (t.kind === 'pass' || t.kind === 'vision' ? .85 : .8) : Math.max(.3, Math.hypot(input.aim.x - t.origin.x, input.aim.y - t.origin.y) / 50 / (input.velocity / 3.6));
  const receiving = receiver ?? (t.kind === 'pass' ? teammateAt(t.time, t.layout) : null);
  const zone = trialZone(t.kind, t.layout);
  const snapshot = receiving ? offsideAtPass(receiving, t.origin, [{ x: 440, y: 95 }, ...t.defenders], zone) : null;
  const stoppedBy = t.kind === 'freekick' && input.lift < .6 && blockedPath(t.origin, input.aim, [{ x: 360, y: 720 }, { x: 410, y: 720 }, { x: 460, y: 720 }, { x: 510, y: 720 }], input.curve) ? 'wall' : t.kind === 'shoot' && Math.abs(input.aim.x - keeperAt(t.time)) < 43 ? 'keeper' : null;
  if (snapshot) t.offsideLine = (snapshot.line - zone) * 50 + 95;
  t.shot = { from: { ...t.origin }, end: { ...input.aim }, elapsed: 0, duration, curve: input.curve, lift: input.lift, receiver, offside: snapshot?.offside ?? false, keeper: keeperAt(t.time),
    ball: { position: fieldBody(t.origin, zone), radius: BALL_RADIUS }, goalLine: { ...NEAR_GOAL }, decision: null, offsideSnapshot: snapshot, stoppedBy };
}
/** The renderer and referee use this exact ball body, not a separate goal animation. */
export function shotBallPosition(t: Trial, elapsed: number) {
  const s = t.shot!; const u = Math.min(1, elapsed / s.duration), ground = t.kind === 'pass' || t.kind === 'vision';
  const aimedHeight = (95 - s.end.y) / 70 * 2.44;
  const endHeight = ground ? BALL_RADIUS : s.end.y <= 95 ? Math.max(BALL_RADIUS, aimedHeight) : aimedHeight;
  const zone = trialZone(t.kind, t.layout);
  const targetZ = ground ? (s.end.y - 95) / 50 : s.stoppedBy === 'wall' ? (720 - 95) / 50 : s.stoppedBy === 'keeper' ? .25 : -.45;
  const p = ballPath(s.from, s.end, u, s.curve);
  return { x: (p.x - 440) / (400 / 7.32), y: BALL_RADIUS + (endHeight - BALL_RADIUS) * u + Math.sin(u * Math.PI) * (ground ? .3 : .65 + s.lift * 2.2), z: fieldBody(s.from).z + (targetZ - fieldBody(s.from).z) * u + zone };

}
export function tickTrial(t: Trial, seconds: number) {
  bounded(seconds, 0, 1); if (t.resolved || !t.started) return;
  // Substeps keep collision/timing independent of the render frame rate.
  let remaining = seconds;
  while (remaining > 0 && !t.resolved) { const dt = Math.min(remaining, .025); remaining -= dt; step(t, dt); }
}
function step(t: Trial, dt: number) {
  t.time += dt;
  if (t.shot) {
    const s = t.shot, previous = { ...s.ball.position }; s.elapsed = Math.min(s.duration, s.elapsed + dt); s.ball.position = shotBallPosition(t, s.elapsed);
    if (t.kind === 'shoot' || t.kind === 'freekick') {
      const decision = judgeGoal(previous, s.ball, s.goalLine, s.offside);
      if (decision !== 'not-crossed' && s.decision === null) s.decision = decision;
      if (s.decision === 'goal') { finish(t, Math.max(60, 100 - distance(s.end, t.target) * .2), 'GOL validado! A bola inteira ultrapassou a linha.', 'goal'); return; }
      if (s.decision === 'offside') { finish(t, 0, 'Gol anulado: impedimento no momento do passe.', 'offside'); return; }
    }
    if (s.elapsed < s.duration) return;
    if (t.kind === 'pass' || t.kind === 'vision') {
      if (blockedPath(s.from, s.end, t.defenders, s.curve)) { finish(t, 0, 'Passe interceptado. Procure uma linha livre.', 'intercepted'); return; }
      const gap = distance(s.end, s.receiver ?? teammateAt(t.time, t.layout));
      if (gap < 65 && s.offside) { finish(t, 0, 'Impedimento! Posição registrada no momento do passe.', 'offside'); return; }
      finish(t, gap < 65 ? 100 - gap : 0, gap < 65 ? 'Passe recebido! Boa leitura da jogada.' : 'O passe não encontrou o companheiro. Antecipe o movimento.', gap < 65 ? 'received' : 'wide'); return;
    }
    if (s.stoppedBy === 'wall') { finish(t, 0, 'Na barreira! Use efeito ou elevação.', 'wall'); return; }
    if (s.stoppedBy === 'keeper') { finish(t, 0, 'O goleiro defendeu antes da linha. Sem gol.', 'save'); return; }
    finish(t, 0, s.decision === 'outside-mouth' ? 'Para fora! A bola cruzou fora da baliza.' : 'Sem gol: a bola não ultrapassou completamente a linha.', 'wide'); return;
  }

  if (t.kind === 'speed') {
    // Pace sets top speed; acceleration and impacts make lane choices matter physically.
    const topSpeed = 7 + t.running * .045;
    t.velocity.y = Math.min(topSpeed, t.velocity.y + (5 + t.running * .05) * dt);
    t.distance += dt * t.velocity.y;
    for (const obstacle of t.obstacles) if (!obstacle.passed && t.distance >= obstacle.distance) { obstacle.passed = true; if (obstacle.lane === t.lane) { t.collisions++; t.velocity.y *= .65; } }
    if (t.distance >= 100) { finish(t, 100 - t.collisions * 20, `100 metros! ${t.collisions} colisões.`, 'complete'); return; }
  }
  if (t.kind === 'technique') {
    const dx = t.destination ? t.destination.x - t.player.x : 0, dy = t.destination ? t.destination.y - t.player.y : 0, d = Math.hypot(dx, dy);
    const speed = 205 + t.running * .7;
    const direction = t.steering ?? (d > 2 ? { x: dx / d * Math.min(1, d / 45), y: dy / d * Math.min(1, d / 45) } : { x: 0, y: 0 });
    const blend = 1 - Math.exp(-(7 + t.handling * .08) * dt);
    t.velocity.x += (direction.x * speed - t.velocity.x) * blend;
    t.velocity.y += (direction.y * speed - t.velocity.y) * blend;
    const previous = { ...t.player };
    t.player.x = clamp(t.player.x + t.velocity.x * dt, 20, 860); t.player.y = clamp(t.player.y + t.velocity.y * dt, 100, 1290);
    t.travel += distance(previous, t.player);
    const moving = Math.hypot(t.velocity.x, t.velocity.y), reach = 12 + (1 - t.handling / 100) * 9 + (Math.sin(t.travel / 18) + 1) * 3;
    const ballTarget = moving > 3 ? { x: t.player.x + t.velocity.x / moving * reach, y: t.player.y + t.velocity.y / moving * reach } : t.player;
    const touch = 1 - Math.exp(-(10 + t.handling * .12) * dt);
    t.ball.x = clamp(t.ball.x + (ballTarget.x - t.ball.x) * touch, 10, 870); t.ball.y = clamp(t.ball.y + (ballTarget.y - t.ball.y) * touch, 90, 1300);
    const touching = t.cones.some(p => distance(p, t.player) < 32 || distance(p, t.ball) < 30);
    if (touching && !t.touching) { t.collisions++; t.velocity.x *= .45; t.velocity.y *= .45; } t.touching = touching;
    const gate = t.gates[t.gate]; if (gate && distance(gate, t.ball) < 40 && distance(gate, t.player) < 55) t.gate++;
    if (t.gate === t.gates.length) { finish(t, 100 - t.collisions * 15 - Math.max(0, t.time - 12) * 2, 'Circuito concluído! Boa condução.', 'complete'); return; }
  }
  const limit = t.kind === 'technique' ? 22 : t.kind === 'speed' ? 18 : 15;
  if (t.time >= limit) finish(t, t.kind === 'technique' ? Math.max(0, t.gate * 15 - t.collisions * 15) : 0, 'Tempo encerrado. Tente de novo na próxima tentativa.', 'timeout');
}
