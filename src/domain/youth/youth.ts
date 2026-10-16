import { draw, bounded } from '../../core/rules.js';
import { ATTRIBUTES, type Club, type Development, type Offer, type Report } from '../career/state.js';
import { calculateOverall, clampRating, type Attributes, type CareerPlayer } from '../player/player.js';
import { eligible } from '../career/progression.js';
import { makeOffer } from '../transfers/contracts.js';
export function assess(player: CareerPlayer, scores: Attributes, rng: number) {
  const attributes = { ...player.attributes };
  for (const key of ATTRIBUTES) { bounded(scores[key], 0, 100); attributes[key] = clampRating(attributes[key] * .7 + scores[key] * .3); }
  const overall = calculateOverall(player.position, attributes); const noise = draw(rng, -9, 9);
  const perceivedPotential = clampRating(Math.max(overall, player.potential + noise.value));
  return { player: { ...player, attributes, perceivedPotential }, rng: noise.state,
    assessment: { overall, potentialLow: Math.max(overall, perceivedPotential - 8), potentialHigh: Math.min(100, perceivedPotential + 8) } };
}
export function recruit(player: CareerPlayer, clubs: Club[], rng: number, age: number, development: Development, currentClub: string | undefined) {
  const offers: Offer[] = []; const reports: Report[] = [];
  const overall = calculateOverall(player.position, player.attributes);
  for (const club of clubs) {
    if (club.id === currentClub) continue;
    for (const team of ['youth', 'senior'] as const) {
      const noise = draw(rng, -5, 5); rng = noise.state;
      const estimatedPotential = Math.max(overall, Math.min(100, player.perceivedPotential + noise.value));
      let reason = !club.needs.includes(player.position) ? 'Sem necessidade para a posição.'
        : team === 'senior' && !eligible(age, development) ? 'Idade/desempenho insuficientes para o principal.'
        : overall < club.minimumOverall || estimatedPotential < club.minimumPotential ? 'Avaliação abaixo do perfil esportivo.'
        : team === 'senior' && overall < club.squadOverall - 8 ? 'OVR abaixo do nível do principal.' : 'Proposta disponível.';
      const offer = reason === 'Proposta disponível.' ? makeOffer(player, club, team) : null;
      if (!offer && reason === 'Proposta disponível.') reason = 'Equipe sem vaga ou orçamento.';
      if (offer) offers.push(offer);
      reports.push({ clubId: club.id, team, estimatedPotential, score: Math.round(overall * .6 + estimatedPotential * .25 + (club.needs.includes(player.position) ? 15 : 0)),
        stages: offer ? ['observation', 'contact', 'proposal'] : ['observation', 'rejected'], reason });
    }
  }
  return { rng, offers, reports };
}
