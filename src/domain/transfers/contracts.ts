import { addDays, requireRule } from '../../core/rules.js';
import { calculateOverall, type CareerPlayer } from '../player/player.js';
import type { Club, Offer, Contract } from '../career/state.js';
export function makeOffer(player: CareerPlayer, club: Club, team: Offer['team']): Offer | null {
  const overall = calculateOverall(player.position, player.attributes);
  const wage = Math.min(club.maxWeeklyWage, Math.round(20 + overall * 2 + club.reputation));
  if ((team === 'youth' ? club.youthPlaces : club.seniorPlaces) < 1 || wage < 1 || wage * 3 > club.wageBudget) return null;
  return { id: `${team}-${club.id}-${player.id}`, clubId: club.id, team, weeklyWage: wage, signingBonus: wage * 2, durationWeeks: 104,
    role: overall >= club.squadOverall - (team === 'youth' ? 3 : 0) ? 'reserve' : 'prospect' };
}
export function sign(player: CareerPlayer, club: Club, offer: Offer, date: string): { contract: Contract; club: Club } {
  const expected = makeOffer(player, club, offer.team);
  requireRule(expected && (Object.keys(expected) as (keyof Offer)[]).every(k => expected[k] === offer[k]), 'Proposta inválida ou sem orçamento.');
  return { contract: { ...offer, playerId: player.id, startDate: date, endDate: addDays(date, offer.durationWeeks * 7) },
    club: { ...club, youthPlaces: club.youthPlaces - (offer.team === 'youth' ? 1 : 0), seniorPlaces: club.seniorPlaces - (offer.team === 'senior' ? 1 : 0), wageBudget: club.wageBudget - offer.weeklyWage - offer.signingBonus } };
}
