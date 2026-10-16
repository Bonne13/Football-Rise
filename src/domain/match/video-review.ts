import type { Trial } from '../gameplay/trial.js';
import { judgeOffside, type BallBody, type GoalLine, type OffsideSnapshot } from './adjudication.js';
export interface ReviewIncident {
  id: string; kind: 'goal-line' | 'offside'; verdict: 'goal' | 'no-goal' | 'offside';
  ball: BallBody; goal: GoalLine; offside: OffsideSnapshot | null; explanation: string;
}
/** Evidence comes exclusively from the finished play; presentation cannot invent an infringement. */
export function reviewIncident(t: Trial): ReviewIncident | null {
  if (!t.resolved || !t.shot) return null;
  const s = t.shot;
  if (t.outcome === 'offside' && s.offsideSnapshot) {
    const snap = s.offsideSnapshot;
    if (!judgeOffside(snap.receiver, snap.ball, snap.defenders, snap.attackingDirection).offside) return null;
    return structuredClone({ id: `${t.kind}:${t.attempt}:offside`, kind: 'offside', verdict: 'offside', ball: s.ball, goal: s.goalLine, offside: snap, explanation: 'Receptor adiantado no instante do passe e envolvido na recepção.' });
  }
  if (!['shoot', 'freekick'].includes(t.kind)) return null;
  const goal = t.outcome === 'goal' && s.decision === 'goal';
  return structuredClone({ id: `${t.kind}:${t.attempt}:goal-line`, kind: 'goal-line', verdict: goal ? 'goal' : 'no-goal', ball: s.ball, goal: s.goalLine, offside: null,
    explanation: goal ? 'A bola inteira ultrapassou a borda externa da linha, dentro da baliza.' : s.decision === 'outside-mouth' ? 'O cruzamento ocorreu fora da abertura da baliza.' : 'A bola não ultrapassou completamente a linha dentro da baliza.' });
}
export const REVIEW_STAGES = [
  { phase: 'assistant', duration: 1.8 }, { phase: 'room', duration: 3.5 },
  { phase: 'walk', duration: 6 }, { phase: 'monitor', duration: 3 }, { phase: 'decision', duration: 2.5 },
] as const;
export type ReviewPhase = typeof REVIEW_STAGES[number]['phase'] | 'complete';
/** Deterministic cinematic timing; the verdict never depends on elapsed time or a skip. */
export function reviewFrame(elapsed: number): { phase: ReviewPhase; progress: number } {
  let left = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  for (const stage of REVIEW_STAGES) { if (left < stage.duration) return { phase: stage.phase, progress: left / stage.duration }; left -= stage.duration; }
  return { phase: 'complete', progress: 1 };
}
export function reviewVerdict(incident: ReviewIncident) { return incident.verdict === 'goal' ? 'GOL CONFIRMADO' : incident.verdict === 'offside' ? 'IMPEDIMENTO CONFIRMADO' : 'SEM GOL'; }
