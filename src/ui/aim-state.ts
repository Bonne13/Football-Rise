import type { Point } from '../domain/gameplay/trial.js';
export type ShotPhase = 'aiming' | 'preparing' | 'flight' | 'resolved';
/** Reject sky/outside-goal touches instead of silently accepting an impossible shot. */
export function validTarget(point: Point | null, ground: boolean): Point | null {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  if (ground) return point.x >= 0 && point.x <= 880 && point.y >= 95 && point.y <= 1320 ? { ...point } : null;
  if (point.x < 230 || point.x > 650 || point.y < 20 || point.y > 100) return null;
  return { x: Math.max(240, Math.min(640, point.x)), y: Math.max(25, Math.min(95, point.y)) };
}
export function pulledShot(origin: Point, target: Point, dx: number, dy: number, maxPull: number) {
  const power = Math.max(0, Math.min(1, dy / Math.max(1, maxPull)));
  return { power, aim: { x: Math.max(-1500, Math.min(2500, origin.x + (target.x - origin.x) * power - dx / Math.max(1, maxPull) * 180)), y: Math.max(-1500, Math.min(2500, origin.y + (target.y - origin.y) * power)) } };
}

/** Reverse drag: a small dead zone prevents taps from firing; sideways pull stays independent of power. */
export function freePullShot(origin: Point, dx: number, dy: number, maxPull: number, ground: boolean) {
  const limit = Math.max(40, maxPull);
  const active = Number.isFinite(dx) && Number.isFinite(dy) && dy >= 12;
  const power = active ? Math.min(1, dy / limit) : 0;
  return { active, power, aim: { x: origin.x - (active ? dx / limit * 900 : 0), y: ground ? origin.y - power * 1100 : 95 - power * 70 } };
}
