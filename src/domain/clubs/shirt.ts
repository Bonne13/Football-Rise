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
export function joinShirt(s: CareerState, randomInitial = false) {
  const club = s.clubs.find(c => c.id === s.contract?.clubId);
  const profile = s.dataPack?.clubs.find(p => p.club.id === club?.id);
  s.shirt.holders = club && s.contract ? structuredClone(profile ? profile[s.contract.team] : clubNumberHolders(club, s.contract.team)) : [];
  s.shirt.number = s.shirt.holders.some(h => h.number === s.shirt.preferredNumber) ? Array.from({ length: 99 }, (_, i) => i + 1).find(n => !s.shirt.holders.some(h => h.number === n))! : s.shirt.preferredNumber;
  if (randomInitial) s.shirt.number = welcomeNumbers(s)[0]!;
  s.shirt.kitIndex = 0;
}
export function welcomeNumbers(s: CareerState): number[] {
  const free = Array.from({ length: 99 }, (_, i) => i + 1).filter(n => !s.shirt.holders.some(h => h.number === n));
  const salt = [...(s.contract?.clubId ?? '')].reduce((n, c) => n + c.charCodeAt(0), s.seed);
  const offset = salt % free.length;
  return Array.from({ length: Math.min(3, free.length) }, (_, i) => free[(offset + i) % free.length]!).filter((n, i, all) => all.indexOf(n) === i);
}
export function numberAvailability(s: CareerState, number: number) {
  checkNumber(number);
  const holder = s.shirt.holders.find(h => h.number === number);
  const overall = calculateOverall(s.player.position, s.player.attributes);
  const requiredTrust = holder ? Math.min(100, holder.coachTrust + 5) : 0;
  const requiredOverall = holder ? Math.min(100, holder.overall + 2) : 0;
  const requiredAppearances = holder ? 4 : 0, requiredRating = holder ? 7 : 0;
  const recent = s.development.recentRatings, average = recent.reduce((a,b)=>a+b,0) / Math.max(1,recent.length);
  return { holder, requiredTrust, requiredOverall, requiredAppearances, requiredRating, allowed: !holder || (s.coachTrust >= requiredTrust && overall >= requiredOverall && recent.length >= requiredAppearances && average >= requiredRating) };
}
export function chooseNumber(s: CareerState, number: number) {
  requireRule(s.contract, 'Escolha sua camisa depois de chegar a um clube.');
  const status = numberAvailability(s, number);
  requireRule(status.allowed, `Número ocupado. Precisa de confiança ${status.requiredTrust} e OVR ${status.requiredOverall}, além de média ${status.requiredRating} em pelo menos ${status.requiredAppearances} atuações recentes.`);
  if (status.holder) { status.holder.number = s.shirt.number; }
  s.shirt.number = number; s.shirt.preferredNumber = number;
}
