import type { Attributes } from '../player/player.js';
import { bounded, draw, requireRule } from '../../core/rules.js';
export const DRILLS = ['shoot', 'vision', 'pass', 'speed', 'technique', 'freekick'] as const;
export type Drill = typeof DRILLS[number];
export interface Point { x: number; y: number }
export interface Shot { from: Point; end: Point; curve: number; lift: number; elapsed: number; duration: number; receiver: Point | null; offside: boolean; keeper: number }
export interface Trial {
  kind: Drill; attempt: number; layout: number; time: number; started: boolean; resolved: boolean; score: number;
  message: string; outcome: 'goal' | 'save' | 'wide' | 'wall' | 'received' | 'intercepted' | 'offside' | 'complete' | 'timeout' | null;
  origin: Point; aim: Point; target: Point; shot: Shot | null; player: Point; destination: Point | null;
  gates: Point[]; gate: number; cones: Point[]; collisions: number; touching: boolean;
  lane: number; distance: number; obstacles: { distance: number; lane: number; passed: boolean }[];
  mates: Point[]; defenders: Point[]; offsideLine: number; accuracy: number;
}
export type TrialInput = { type: 'kick'; aim: Point; curve: number; lift: number; velocity?: number } | { type: 'move'; destination: Point } | { type: 'lane'; direction: -1 | 1 };
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
export function isOffside(receiver: Point, ball: Point, opponents: Point[]) {
  const line = [...opponents].sort((a, b) => a.y - b.y)[1]?.y ?? 0;
  return receiver.y < 660 && receiver.y < ball.y && receiver.y < line - .001;
}
export function createTrial(kind: Drill, attempt: number, seed: number, accuracy = 100): Trial {
  requireRule(DRILLS.includes(kind) && Number.isInteger(attempt) && attempt >= 1, 'Fundamento inválido.'); bounded(seed, 0, 0xffffffff); requireRule(Number.isInteger(seed), 'Seed inválida.'); bounded(accuracy, 1, 100);
  const layout = (seed % 3 + attempt - 1) % 3;
  const side = draw((seed + attempt) >>> 0, 0, 1).value;
  const trial: Trial = { kind, attempt, layout, time: 0, started: false, resolved: false, score: 0, message: '', outcome: null,
    origin: { x: 440, y: kind === 'freekick' ? 1100 : 950 }, aim: { x: 440, y: 65 }, target: { x: side ? 580 : 300, y: 60 },
    shot: null, player: { x: 440, y: 1170 }, destination: null,
    gates: [{ x: 440, y: 1010 }, { x: 230, y: 820 }, { x: 630, y: 640 }, { x: 300, y: 440 }, { x: 440, y: 260 }], gate: 0,
    cones: [{ x: 570, y: 980 }, { x: 410, y: 810 }, { x: 440, y: 620 }, { x: 500, y: 450 }], collisions: 0, touching: false,
    lane: 1, distance: 0, obstacles: Array.from({ length: 8 }, (_, i) => ({ distance: 15 + i * 10, lane: (i * 2 + attempt) % 3, passed: false })),
    mates: [{ x: 150, y: 310 }, { x: 330, y: 120 }, { x: 560, y: 330 }, { x: 740, y: 280 }],
    defenders: [{ x: 400, y: 250 }, { x: 560, y: 370 }, { x: 740, y: 320 }], offsideLine: 250, accuracy };
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
  return trial;
}
function finish(t: Trial, score: number, message: string, outcome: Trial['outcome']) {
  t.resolved = true; t.score = Math.round(clamp(score, 0, 100)); t.message = message; t.outcome = outcome;
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
  if (input.type === 'move') { if (t.kind !== 'technique') return; bounded(input.destination.x, 0, 880); bounded(input.destination.y, 0, 1320); t.started = true; t.destination = { ...input.destination }; return; }
  if (!['shoot', 'freekick', 'pass', 'vision'].includes(t.kind)) return;
  bounded(input.aim.x, -1500, 2500); bounded(input.aim.y, -1500, 2500); bounded(input.curve, -1, 1); bounded(input.lift, 0, 1);
  if (input.velocity !== undefined) bounded(input.velocity, 1, 150);
  t.started = true; t.aim = { ...input.aim };
  const receiver = t.kind === 'vision' ? [...t.mates].sort((a, b) => distance(a, input.aim) - distance(b, input.aim))[0]! : null;
  t.shot = { from: { ...t.origin }, end: { ...input.aim }, elapsed: 0, duration: input.velocity === undefined ? (t.kind === 'pass' || t.kind === 'vision' ? .85 : .8) : Math.max(.3, Math.hypot(input.aim.x - t.origin.x, input.aim.y - t.origin.y) / 50 / (input.velocity / 3.6)),
    curve: input.curve, lift: input.lift, receiver, offside: !!receiver && isOffside(receiver, t.origin, [{ x: 440, y: 75 }, ...t.defenders]), keeper: keeperAt(t.time) };
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
    const s = t.shot; s.elapsed += dt; if (s.elapsed < s.duration) return;
    if (t.kind === 'pass' || t.kind === 'vision') {
      if (blockedPath(s.from, s.end, t.defenders, s.curve)) { finish(t, 0, 'Passe interceptado. Procure uma linha livre.', 'intercepted'); return; }
      if (s.offside) { finish(t, 0, 'Impedimento! Observe a linha laranja.', 'offside'); return; }
      const gap = distance(s.end, s.receiver ?? teammateAt(t.time, t.layout));
      finish(t, gap < 65 ? 100 - gap : 0, gap < 65 ? 'Passe recebido! Boa leitura da jogada.' : 'O passe não encontrou o companheiro. Antecipe o movimento.', gap < 65 ? 'received' : 'wide'); return;
    }
    if (t.kind === 'freekick' && s.lift < .6 && blockedPath(s.from, s.end, [{ x: 360, y: 720 }, { x: 410, y: 720 }, { x: 460, y: 720 }, { x: 510, y: 720 }], s.curve)) { finish(t, 0, 'Na barreira! Use efeito ou elevação.', 'wall'); return; }
    if (s.end.x < 240 || s.end.x > 640 || s.end.y < 25 || s.end.y > 95) { finish(t, 0, 'Para fora! Ajuste a direção e a força.', 'wide'); return; }
    if (t.kind === 'shoot' && Math.abs(s.end.x - s.keeper) < 43) { finish(t, 0, 'O goleiro defendeu. Busque um canto.', 'save'); return; }
    finish(t, Math.max(60, 100 - distance(s.end, t.target) * .2), 'GOL! Boa finalização.', 'goal'); return;
  }
  if (t.kind === 'speed') {
    t.distance += dt * 14;
    for (const obstacle of t.obstacles) if (!obstacle.passed && t.distance >= obstacle.distance) { obstacle.passed = true; if (obstacle.lane === t.lane) t.collisions++; }
    if (t.distance >= 100) { finish(t, 100 - t.collisions * 20, `100 metros! ${t.collisions} colisões.`, 'complete'); return; }
  }
  if (t.kind === 'technique' && t.destination) {
    const dx = t.destination.x - t.player.x, dy = t.destination.y - t.player.y, d = Math.hypot(dx, dy);
    if (d > 2) { const speed = Math.min(d, 235 * dt); t.player.x += dx / d * speed; t.player.y += dy / d * speed; }
    const touching = t.cones.some(p => distance(p, t.player) < 32);
    if (touching && !t.touching) t.collisions++; t.touching = touching;
    const gate = t.gates[t.gate]; if (gate && distance(gate, t.player) < 40) t.gate++;
    if (t.gate === t.gates.length) { finish(t, 100 - t.collisions * 15 - Math.max(0, t.time - 12) * 2, 'Circuito concluído! Boa condução.', 'complete'); return; }
  }
  const limit = t.kind === 'technique' ? 22 : t.kind === 'speed' ? 9 : 15;
  if (t.time >= limit) finish(t, t.kind === 'technique' ? Math.max(0, t.gate * 15 - t.collisions * 15) : 0, 'Tempo encerrado. Tente de novo na próxima tentativa.', 'timeout');
}
