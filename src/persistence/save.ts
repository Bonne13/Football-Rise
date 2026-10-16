import type { CareerState } from '../domain/career/state.js';
import { ATTRIBUTES, POSITIONS } from '../domain/career/state.js';
import { requireRule } from '../core/rules.js';
import { calculateOverall } from '../domain/player/player.js';
type Check = (value: unknown) => boolean;
const num = (min: number, max: number, integer = false): Check => v => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
const str: Check = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 500;
const one = (...values: unknown[]): Check => v => values.includes(v);
const arr = (check: Check, max = 10000): Check => v => Array.isArray(v) && v.length <= max && v.every(check);
const nullable = (check: Check): Check => v => v === null || check(v);
const obj = (fields: Record<string, Check>): Check => v => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === Object.keys(fields).length && Object.entries(fields).every(([k, check]) => Object.hasOwn(v, k) && check((v as Record<string, unknown>)[k]));
const date: Check = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const rating = num(1, 100);
const offer = { id: str, clubId: str, weeklyWage: num(1, 1e6), signingBonus: num(0, 1e9), durationWeeks: num(1, 156, true), role: one('reserve', 'prospect'), team: one('youth', 'senior') };
const check = obj({ schemaVersion: one(1), seed: num(0, 0xffffffff, true), rng: num(0, 0xffffffff, true), date,
  stage: one('created', 'assessed', 'trained', 'offers', 'contracted', 'ready', 'active'),
  player: obj({ id: str, name: str, nationality: str, birthDate: date, position: one(...POSITIONS), attributes: obj(Object.fromEntries(ATTRIBUTES.map(k => [k, rating]))), potential: rating, perceivedPotential: rating, morale: num(0, 100), energy: num(0, 100), health: num(0, 100), reputation: num(0, 100) }),
  preferredFoot: one('left', 'right', 'both'), discipline: rating, trainingSessions: num(0, 1e9, true),
  assessment: nullable(obj({ overall: rating, potentialLow: rating, potentialHigh: rating })),
  clubs: arr(obj({ id: str, name: str, country: str, reputation: rating, facilities: rating, coach: rating, squadOverall: rating, minimumOverall: rating, minimumPotential: rating, needs: arr(one(...POSITIONS), 8), youthPlaces: num(0, 1000, true), seniorPlaces: num(0, 1000, true), wageBudget: num(0, 1e9), maxWeeklyWage: num(0, 1e6) })),
  reports: arr(obj({ clubId: str, team: one('youth', 'senior'), estimatedPotential: rating, score: num(0, 100), stages: arr(one('observation', 'contact', 'proposal', 'rejected'), 4), reason: str })),
  offers: arr(obj(offer)), contract: nullable(obj({ ...offer, playerId: str, startDate: date, endDate: date })),
  preparation: nullable(obj({ competition: str, opponent: str, date, role: one('reserve', 'prospect'), expectedMinutes: num(0, 90, true), coachTrust: rating, objective: str })),
  development: obj({ appearances: num(0, 1e9, true), minutes: num(0, 1e12, true), goals: num(0, 1e12, true), assists: num(0, 1e12, true), recentRatings: arr(num(0, 10), 6) }), history: arr(str, 1000000),
});
export function validateSave(value: unknown): asserts value is CareerState {
  requireRule(check(value), 'Save inválido ou versão não suportada.'); const s = value as CareerState;
  const ids = new Set(s.clubs.map(c => c.id)); requireRule(ids.size === s.clubs.length && ids.size > 0, 'Clubes inválidos.');
  requireRule(s.player.birthDate <= s.date && s.player.potential >= calculateOverall(s.player.position, s.player.attributes), 'Atleta inconsistente.');
  requireRule(s.offers.every(o => ids.has(o.clubId)) && s.reports.every(r => ids.has(r.clubId)), 'Clube ausente.');
  requireRule(new Set(s.offers.map(o => o.id)).size === s.offers.length, 'Propostas duplicadas.');
  if (s.stage !== 'created') requireRule(s.assessment, 'Avaliação ausente.');
  if (['trained', 'offers', 'contracted', 'ready', 'active'].includes(s.stage)) requireRule(s.trainingSessions > 0, 'Treino ausente.');
  if (s.stage === 'offers') requireRule(s.offers.length > 0, 'Propostas ausentes.');
  if (['contracted', 'ready', 'active'].includes(s.stage)) requireRule(s.contract, 'Contrato ausente.');
  if (s.contract) requireRule(ids.has(s.contract.clubId) && s.contract.playerId === s.player.id && s.contract.startDate <= s.date && s.contract.endDate > s.contract.startDate, 'Contrato inconsistente.');
  if (s.stage === 'ready') requireRule(s.preparation, 'Preparação ausente.');
  if (s.preparation) requireRule(['ready', 'offers'].includes(s.stage) && s.contract && s.preparation.date > s.date && s.preparation.date < s.contract.endDate, 'Preparação inconsistente.');
  const d = s.development; requireRule(d.recentRatings.length === Math.min(d.appearances, 6) && d.minutes >= d.appearances && d.minutes <= d.appearances * 90, 'Histórico inconsistente.');
}
export function serializeSave(state: CareerState): string {
  validateSave(state); const text = JSON.stringify(state, null, 2);
  requireRule(new TextEncoder().encode(text).length <= 10 * 1024 * 1024, 'Save excede 10 MB.'); return text;
}
export function deserializeSave(text: string): CareerState {
  requireRule(new TextEncoder().encode(text).length <= 10 * 1024 * 1024, 'Save excede 10 MB.');
  const value: unknown = JSON.parse(text); validateSave(value); return value;
}
