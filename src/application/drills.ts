import { bounded, requireRule } from '../core/rules.js';
import type { Attributes } from '../domain/player/player.js';
import { ATTRIBUTES } from '../domain/career/state.js';
import { trialZone, DRILLS, type Drill, type Trial } from '../domain/gameplay/trial.js';
import { createParticipation, updateParticipation, playerMatchRating, type Participation } from '../domain/match/participation.js';
export interface DrillResult { kind: Drill; score: number; outcome: Trial['outcome']; carry?: {x:number;y:number} }
export interface DrillSession { version: 1; mode: 'assessment' | 'practice' | 'match'; seed: number; sequence: Drill[]; results: DrillResult[]; participation?:Participation }
export function sessionFinished(s:DrillSession){return s.results.length===s.sequence.length||s.mode==='match'&&s.participation?.exitMinute!==null&&s.participation?.exitMinute!==undefined;}
export function configureMatch(s:DrillSession,minutes:number,energy:number,trust:number):DrillSession {
  if(s.mode!=='match'||s.participation)return s;
  const participation=createParticipation(minutes,energy,trust);if(s.results.length)participation.entered=true;
  return {...s,participation:updateParticipation(participation,s.results,s.sequence.length)};
}
export function createSession(mode: DrillSession['mode'], seed: number, practice: Drill = 'shoot'): DrillSession {
  return { version: 1, mode, seed, sequence: mode === 'assessment' ? DRILLS.flatMap(kind => [kind, kind, kind]) : mode === 'practice' ? [practice, practice, practice] : ['pass', 'technique', 'shoot', 'freekick'], results: [] };
}
export function recordTrial(session: DrillSession, trial: Trial): DrillSession {
  requireRule(!session.participation||session.participation.entered,'Entre em campo antes de registrar uma jogada.');
  requireRule(trial.resolved && session.sequence[session.results.length] === trial.kind, 'Tentativa inválida.');
  bounded(trial.score, 0, 100);
  requireRule(!sessionFinished(session), 'Sessão concluída.');
  const results=[...session.results, { kind: trial.kind, score: trial.score, outcome: trial.outcome, ...(session.mode==='match'&&trial.kind==='technique'&&trial.outcome==='complete'?{carry:{x:trial.ball.x,y:trial.ball.y+trialZone(trial.kind,trial.layout,trial.context)*50}}:{}) }];
  return { ...session,results,...(session.participation?{participation:updateParticipation(session.participation,results,session.sequence.length)}:{}) };
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
  requireRule(s.mode === 'match' && sessionFinished(s), 'Conclua as oportunidades da partida.');
  return { rating: playerMatchRating(s.results), minutes:s.participation?(s.participation.exitMinute??s.participation.minute)-s.participation.entryMinute:minutes,
    goals: s.results.filter(r => r.outcome === 'goal').length, assists: 0 };
}
export function restoreSession(text: string, expected: DrillSession): DrillSession {
  const s: unknown = JSON.parse(text);
  requireRule(s && typeof s === 'object', 'Sessão inválida.');
  const value = s as DrillSession;
  requireRule(value.version === 1 && value.mode === expected.mode && value.seed === expected.seed && (JSON.stringify(value.sequence) === JSON.stringify(expected.sequence)||expected.mode==='match'&&JSON.stringify(value.sequence)===JSON.stringify(['pass','shoot','technique','freekick'])) && Array.isArray(value.results) && value.results.length <= value.sequence.length, 'Sessão incompatível.');
  value.results.forEach((r, i) => { requireRule(r.kind === value.sequence[i] && ['goal', 'save', 'wide', 'wall', 'received', 'intercepted', 'offside', 'complete', 'timeout'].includes(String(r.outcome)), 'Resultado inválido.'); bounded(r.score, 0, 100);if(r.carry!==undefined){requireRule(r.kind==='technique'&&r.outcome==='complete'&&r.carry&&typeof r.carry==='object','Saída de condução inválida.');bounded(r.carry.x,20,860);bounded(r.carry.y,100,2000);} });
  if(value.participation!==undefined){
    const p=value.participation;requireRule(value.mode==='match'&&p&&typeof p==='object'&&typeof p.entered==='boolean','Participação inválida.');
    for(const n of [p.entryMinute,p.plannedExit,p.minute,p.energy,p.coachTrust])bounded(n,0,100);
    requireRule(Number.isInteger(p.entryMinute)&&Number.isInteger(p.plannedExit)&&Number.isInteger(p.minute)&&p.entryMinute<p.plannedExit&&p.plannedExit<=90&&p.minute>=p.entryMinute&&p.minute<=p.plannedExit,'Minutagem inválida.');
    requireRule([null,'planned','fatigue','performance'].includes(p.reason),'Substituição inválida.');
    if(p.exitMinute!==null)requireRule(Number.isInteger(p.exitMinute)&&p.exitMinute>p.entryMinute&&p.exitMinute===p.minute&&p.reason!==null,'Saída inválida.');
    else requireRule(p.reason===null,'Saída sem minuto.');
    const initial=createParticipation(p.plannedExit-p.entryMinute,p.energy,p.coachTrust);const computed=updateParticipation(initial,value.results,value.sequence.length);
    requireRule(p.entryMinute===initial.entryMinute&&p.minute===computed.minute&&p.exitMinute===computed.exitMinute&&p.reason===computed.reason&&(value.results.length===0||p.entered),'Participação incompatível com as ações.');
  }
  return value;
}

export function canRetryTrial(mode: DrillSession['mode'], trial: Trial): boolean {
  return mode !== 'match' && trial.resolved && !['goal', 'received'].includes(trial.outcome ?? '') && (trial.outcome !== 'complete' || trial.collisions > 0);
}
