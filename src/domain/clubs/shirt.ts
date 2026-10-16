import { requireRule } from '../../core/rules.js';
import type { CareerState, Club } from '../career/state.js';
import { calculateOverall } from '../player/player.js';
export interface NumberHolder { id: string; name: string; number: number; overall: number; coachTrust: number; position: string; source: string; numberVerified: boolean }
export interface Shirt { preferredNumber: number; number: number; kitIndex: number; holders: NumberHolder[] }
export function checkNumber(number: number) { requireRule(Number.isInteger(number) && number >= 1 && number <= 99, 'Escolha um número inteiro de 1 a 99.'); }
/** Small, persistent development squads. Real squad providers can replace these records. */
export function clubNumberHolders(club: Club, team: 'youth' | 'senior'): NumberHolder[] {
  return Array.from({ length: 23 }, (_, i) => ({ id: `${club.id}-${team}-${i + 1}`, name: `Atleta ${i + 1}`, number: i + 1,
    overall: Math.max(1, Math.min(99, club.squadOverall + (i % 7) - 3)), coachTrust: 45 + (i % 6) * 5, position: club.needs[i % Math.max(1, club.needs.length)] ?? 'CM', source: 'Elenco fictício do protótipo', numberVerified: false }));
}
export function joinShirt(s: CareerState) {
  const club = s.clubs.find(c => c.id === s.contract?.clubId);
  const profile = s.dataPack?.clubs.find(p => p.club.id === club?.id);
  s.shirt.holders = club && s.contract ? structuredClone(profile ? profile[s.contract.team] : clubNumberHolders(club, s.contract.team)) : [];
  s.shirt.number = s.shirt.holders.some(h => h.number === s.shirt.preferredNumber) ? Array.from({ length: 99 }, (_, i) => i + 1).find(n => !s.shirt.holders.some(h => h.number === n))! : s.shirt.preferredNumber;
  s.shirt.kitIndex = 0;
}
export function numberAvailability(s: CareerState, number: number) {
  checkNumber(number);
  const holder = s.shirt.holders.find(h => h.number === number);
  const overall = calculateOverall(s.player.position, s.player.attributes);
  const requiredTrust = holder ? Math.min(100, holder.coachTrust + 5) : 0;
  const requiredOverall = holder ? Math.min(100, holder.overall + 2) : 0;
  return { holder, requiredTrust, requiredOverall, allowed: !holder || (s.coachTrust >= requiredTrust && overall >= requiredOverall) };
}
export function chooseNumber(s: CareerState, number: number) {
  const status = numberAvailability(s, number);
  requireRule(status.allowed, `Número ocupado. Precisa de confiança ${status.requiredTrust} e OVR ${status.requiredOverall}.`);
  if (status.holder) { status.holder.number = s.shirt.number; }
  s.shirt.number = number; s.shirt.preferredNumber = number;
}
