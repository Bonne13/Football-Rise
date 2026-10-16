import { bounded, requireRule } from '../core/rules.js';
import type { Attributes } from '../domain/player/player.js';
import { ATTRIBUTES } from '../domain/career/state.js';
import { DRILLS, type Drill, type Trial } from '../domain/gameplay/trial.js';
export interface DrillResult { kind: Drill; score: number; outcome: Trial['outcome'] }
export interface DrillSession { version: 1; mode: 'assessment' | 'practice' | 'match'; seed: number; sequence: Drill[]; results: DrillResult[] }
export function createSession(mode: DrillSession['mode'], seed: number, practice: Drill = 'shoot'): DrillSession {
  return { version: 1, mode, seed, sequence: mode === 'assessment' ? DRILLS.flatMap(kind => [kind, kind, kind]) : mode === 'practice' ? [practice, practice, practice] : ['pass', 'shoot', 'technique', 'freekick'], results: [] };
}
export function recordTrial(session: DrillSession, trial: Trial): DrillSession {
  requireRule(trial.resolved && session.sequence[session.results.length] === trial.kind, 'Tentativa inválida.');
  bounded(trial.score, 0, 100);
  requireRule(session.results.length < session.sequence.length, 'Sessão concluída.');
  return { ...session, results: [...session.results, { kind: trial.kind, score: trial.score, outcome: trial.outcome }] };
}
export function sessionAverage(s: DrillSession, kind?: Drill) {
  const results = s.results.filter(r => !kind || r.kind === kind); return results.reduce((sum, r) => sum + r.score, 0) / Math.max(1, results.length);
}
export function assessmentScores(s: DrillSession): Attributes {
  requireRule(s.mode === 'assessment' && s.results.length === s.sequence.length, 'Conclua todos os fundamentos.');
  const score = (kind: Drill) => Math.round(sessionAverage(s, kind));
  const mean = Math.round(sessionAverage(s));
  const values = { finishing: score('shoot'), passing: score('pass'), vision: score('vision'), technique: score('technique'), pace: score('speed'), strength: Math.round((score('speed') + score('technique')) / 2), defending: Math.round((score('vision') + score('technique')) / 2), goalkeeping: mean, setPieces: score('freekick'), composure: mean };
  // Derived scores, not separate claimed strength/keeper/defending trials.
  return Object.fromEntries(ATTRIBUTES.map(key => [key, values[key]])) as Attributes;
}
export function matchPerformance(s: DrillSession, minutes: number) {
  requireRule(s.mode === 'match' && s.results.length === s.sequence.length, 'Conclua as oportunidades da partida.');
  return { rating: Math.round((3 + sessionAverage(s) * .07) * 10) / 10, minutes,
    goals: s.results.filter(r => r.outcome === 'goal').length, assists: 0 };
}
export function restoreSession(text: string, expected: DrillSession): DrillSession {
  const s: unknown = JSON.parse(text);
  requireRule(s && typeof s === 'object', 'Sessão inválida.');
  const value = s as DrillSession;
  requireRule(value.version === 1 && value.mode === expected.mode && value.seed === expected.seed && JSON.stringify(value.sequence) === JSON.stringify(expected.sequence) && Array.isArray(value.results) && value.results.length <= value.sequence.length, 'Sessão incompatível.');
  value.results.forEach((r, i) => { requireRule(r.kind === value.sequence[i] && ['goal', 'save', 'wide', 'wall', 'received', 'intercepted', 'offside', 'complete', 'timeout'].includes(String(r.outcome)), 'Resultado inválido.'); bounded(r.score, 0, 100); });
  return value;
}
