import type { Club } from '../domain/career/state.js';
import type { NumberHolder } from '../domain/clubs/shirt.js';
import type { Kit } from './kits.js';
import { requireRule } from '../core/rules.js';
export interface ClubProfile { club: Club; kits: [Kit, Kit, Kit]; youth: NumberHolder[]; senior: NumberHolder[] }
export interface FootballPack { version: 1; id: string; season: string; source: string; license: string; coverage: string; clubs: ClubProfile[] }
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 500;
const integer = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const fields = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
function validKit(v: unknown) {
  return object(v) && fields(v, ['name', 'shirt', 'secondary', 'shorts', 'socks', 'ink', 'pattern']) && string(v.name) && ['plain', 'stripe', 'hoops'].includes(String(v.pattern)) && ['shirt', 'secondary', 'shorts', 'socks', 'ink'].every(k => typeof v[k] === 'string' && /^#[a-fA-F0-9]{6}$/.test(v[k] as string));
}
function validSquad(v: unknown) {
  if (!Array.isArray(v) || v.length > 98) return false;
  return v.every(h => object(h) && fields(h, ['id', 'name', 'number', 'overall', 'coachTrust', 'position', 'source', 'numberVerified']) && string(h.id) && string(h.name) && integer(h.number, 1, 99) && integer(h.overall, 1, 100) && integer(h.coachTrust, 1, 100) && string(h.position) && string(h.source) && typeof h.numberVerified === 'boolean') && new Set(v.map(h => h.number)).size === v.length && new Set(v.map(h => h.id)).size === v.length;
}
export function validateFootballPack(value: unknown): asserts value is FootballPack {
  requireRule(object(value) && fields(value, ['version', 'id', 'season', 'source', 'license', 'coverage', 'clubs']), 'Formato do pacote inválido.');
  requireRule(value.version === 1 && string(value.id) && typeof value.season === 'string' && /^\d{4}\/\d{2}$/.test(value.season) && string(value.source) && /^https:\/\//.test(String(value.source)) && string(value.license) && string(value.coverage), 'Informe temporada, fonte HTTPS, licença e cobertura do pacote.');
  requireRule(Array.isArray(value.clubs) && value.clubs.length > 0 && value.clubs.length <= 10000, 'Pacote deve conter de 1 a 10.000 clubes.');
  const ids = new Set<string>();
  for (const profile of value.clubs) {
    requireRule(object(profile) && fields(profile, ['club', 'kits', 'youth', 'senior']), 'Perfil de clube inválido.');
    const c = profile.club;
    requireRule(object(c) && fields(c, ['id', 'name', 'country', 'reputation', 'facilities', 'coach', 'squadOverall', 'minimumOverall', 'minimumPotential', 'needs', 'youthPlaces', 'seniorPlaces', 'wageBudget', 'maxWeeklyWage']), 'Clube inválido.');
    requireRule(string(c.id) && string(c.name) && string(c.country) && !ids.has(String(c.id)), 'Identidade de clube inválida ou duplicada.');
    ids.add(String(c.id));
    requireRule(['reputation', 'facilities', 'coach', 'squadOverall', 'minimumOverall', 'minimumPotential'].every(k => integer(c[k], 1, 100)), 'Avaliação de clube inválida.');
    requireRule(Array.isArray(c.needs) && c.needs.length <= 8 && c.needs.every(p => ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WG', 'ST'].includes(p)), 'Posições inválidas.');
    requireRule(integer(c.youthPlaces, 0, 1000) && integer(c.seniorPlaces, 0, 1000) && integer(c.wageBudget, 0, 1e9) && integer(c.maxWeeklyWage, 0, 1e6), 'Economia do clube inválida.');
    requireRule(Array.isArray(profile.kits) && profile.kits.length === 3 && profile.kits.every(validKit), 'Cada clube deve ter três uniformes com cores válidas.');
    requireRule(validSquad(profile.youth) && validSquad(profile.senior), 'Elenco inválido ou números duplicados.');
  }
}
export function parseFootballPack(text: string): FootballPack {
  requireRule(new TextEncoder().encode(text).length <= 10 * 1024 * 1024, 'Pacote excede 10 MB.');
  const value: unknown = JSON.parse(text); validateFootballPack(value); return value;
}
