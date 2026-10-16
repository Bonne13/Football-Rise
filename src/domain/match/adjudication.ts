import { requireRule } from '../../core/rules.js';
export interface Vector3 { x: number; y: number; z: number }
export interface BallBody { position: Vector3; radius: number }
export interface GoalLine { z: number; halfWidth: number; height: number; attackingDirection: -1 | 1 }
export const BALL_RADIUS = .11;
export const NEAR_GOAL: GoalLine = { z: -.05, halfWidth: 3.66, height: 2.44, attackingDirection: -1 };
export type GoalDecision = 'goal' | 'not-crossed' | 'outside-mouth' | 'offside';
function finite(...values: number[]) { requireRule(values.every(Number.isFinite), 'Geometria inválida.'); }
/** Swept sphere: the trailing edge must pass the outer goal plane; touching it is insufficient. */
export function judgeGoal(previous: Vector3, ball: BallBody, line: GoalLine, offside = false): GoalDecision {
  const p = ball.position, sign = line.attackingDirection;
  finite(previous.x, previous.y, previous.z, p.x, p.y, p.z, ball.radius, line.z, line.halfWidth, line.height);
  requireRule(ball.radius > 0 && line.halfWidth > ball.radius && line.height > ball.radius * 2 && (sign === -1 || sign === 1), 'Baliza ou bola inválida.');
  const before = (previous.z - line.z) * sign - ball.radius, after = (p.z - line.z) * sign - ball.radius;
  if (before > 0 || after <= 1e-9 || after <= before) return 'not-crossed';
  const fraction = -before / (after - before), x = previous.x + (p.x - previous.x) * fraction, y = previous.y + (p.y - previous.y) * fraction;
  if (Math.abs(x) + ball.radius > line.halfWidth + 1e-9 || y - ball.radius < -1e-9 || y + ball.radius > line.height + 1e-9) return 'outside-mouth';
  return offside ? 'offside' : 'goal';
}
export interface PlayerBody { id: string; position: Vector3; playableRadius: number }
export interface OffsideSnapshot { receiver: PlayerBody; defenders: PlayerBody[]; ball: BallBody; line: number; offside: boolean; attackingDirection: -1 | 1 }
/** Arms/hands are excluded: playableRadius represents only eligible body parts. Snapshot at the pass. */
export function judgeOffside(receiver: PlayerBody, ball: BallBody, defenders: PlayerBody[], direction: -1 | 1 = -1, halfway = 52.5, restart: 'open-play' | 'goal-kick' | 'throw-in' | 'corner' = 'open-play'): OffsideSnapshot {
  finite(ball.position.x, ball.position.y, ball.position.z, ball.radius, halfway); requireRule(ball.radius > 0, 'Bola inválida.'); requireRule(direction === -1 || direction === 1, 'Direção inválida.');
  for (const p of [receiver, ...defenders]) { finite(p.position.x, p.position.y, p.position.z, p.playableRadius); requireRule(p.playableRadius >= 0 && p.playableRadius <= 1, 'Corpo de jogador inválido.'); }
  const leading = (p: PlayerBody) => p.position.z * direction + p.playableRadius;
  const ordered = [...defenders].sort((a, b) => leading(b) - leading(a));
  // Missing bodies do not produce an invented last defender. The ball still defines the line.
  const defenderLine = ordered[1] ? leading(ordered[1]) : -Infinity;
  const limit = Math.max(ball.position.z * direction + ball.radius, defenderLine);
  const inOpponentHalf = (receiver.position.z - halfway) * direction > -receiver.playableRadius;
  const offside = restart === 'open-play' && inOpponentHalf && leading(receiver) > limit + 1e-9;
  return structuredClone({ receiver, defenders, ball, line: limit * direction, offside, attackingDirection: direction });
}
