import { addDays, ageOn, bounded, draw, requireRule } from '../core/rules.js';
import { ATTRIBUTES, POSITIONS, type CareerState, type Performance } from '../domain/career/state.js';
import { calculateOverall, type Attributes, type Position } from '../domain/player/player.js';
import { developmentClubs, type ClubDataProvider } from '../data/clubs.js';
import { assess, recruit } from '../domain/youth/youth.js';
import { train, type Focus } from '../domain/training/training.js';
import { sign } from '../domain/transfers/contracts.js';
import { eligible, record } from '../domain/career/progression.js';
export interface NewCareer { name: string; nationality: string; position: Position; preferredFoot: 'left' | 'right' | 'both'; seed: number; startingAge?: 14 | 15 | 16 }
export type Command = { type: 'practice'; focus: Focus; quality: number } | { type: 'assess'; performances: Attributes } | { type: 'train'; focus: Focus } | { type: 'accept'; offerId: string }
  | { type: 'performance'; performance: Performance } | { type: 'recover' | 'scout' | 'prepare' | 'promote' };
export function createCareer(input: NewCareer, provider: ClubDataProvider = developmentClubs): CareerState {
  for (const value of [input.name, input.nationality]) requireRule(typeof value === 'string' && value.trim().length > 0 && value.length <= 100, 'Nome/nacionalidade inválidos.');
  requireRule(POSITIONS.includes(input.position), 'Posição inválida.');
  requireRule(['left', 'right', 'both'].includes(input.preferredFoot), 'Pé preferido inválido.');
  bounded(input.seed, 0, 0xffffffff); requireRule(Number.isInteger(input.seed), 'Seed inválida.');
  const age = input.startingAge ?? 14; requireRule([14, 15, 16].includes(age), 'Idade inicial inválida.');
  let rng = input.seed; const attributes = {} as Attributes;
  for (const key of ATTRIBUTES) { const next = draw(rng, 35, 55); rng = next.state; attributes[key] = next.value; }
  const potential = draw(rng, 65, 95); rng = potential.state;
  const clubs = structuredClone([...provider.loadYouthClubs()]); requireRule(clubs.length > 0, 'Pacote de clubes vazio.');
  return { schemaVersion: 1, seed: input.seed, rng, date: '2026-07-01', stage: 'created',
    player: { id: `player-${input.seed}`, name: input.name.trim(), nationality: input.nationality.trim(), birthDate: `${2026 - age}-07-01`, position: input.position,
      attributes, potential: potential.value, perceivedPotential: 60, morale: 70, energy: 100, health: 100, reputation: 1 },
    preferredFoot: input.preferredFoot, discipline: 75, trainingSessions: 0, assessment: null, clubs, reports: [], offers: [], contract: null, preparation: null,
    development: { appearances: 0, minutes: 0, goals: 0, assists: 0, recentRatings: [] }, history: [`Carreira iniciada aos ${age} anos na base.`] };
}
function allowed(state: CareerState, stages: CareerState['stage'][]) { requireRule(stages.includes(state.stage), 'Ação indisponível nesta etapa.'); }
export function advanceCareer(previous: CareerState, command: Command): CareerState {
  const s = structuredClone(previous);
  switch (command.type) {
    case 'assess': { allowed(s, ['created']); const r = assess(s.player, command.performances, s.rng); Object.assign(s, r); s.stage = 'assessed'; s.history.push('Avaliação de fundamentos concluída.'); break; }
    case 'practice':
    case 'train': {
      allowed(s, ['assessed', 'trained', 'contracted', 'active']); const c = s.clubs.find(c => c.id === s.contract?.clubId);
      s.player = train(s.player, command.focus, c?.facilities ?? 40, c?.coach ?? 50, s.discipline, command.type === 'practice' ? command.quality : 100); s.trainingSessions++;
      if (!s.contract) s.stage = 'trained'; s.history.push(`Treino: ${command.focus}.`); break;
    }
    case 'recover': allowed(s, ['assessed', 'trained', 'offers', 'contracted', 'active']); s.player.energy = Math.min(100, s.player.energy + 30); s.history.push('Sessão de recuperação.'); break;
    case 'scout': {
      allowed(s, ['trained', 'offers', 'contracted', 'active', 'ready']);
      Object.assign(s, recruit(s.player, s.clubs, s.rng, ageOn(s.player.birthDate, s.date), s.development, s.contract?.clubId));
      if (s.offers.length) s.stage = 'offers'; s.history.push(`Observação: ${s.offers.length} propostas.`); break;
    }
    case 'accept': {
      allowed(s, ['offers']); const offer = s.offers.find(o => o.id === command.offerId); requireRule(offer, 'Proposta não encontrada.');
      const club = s.clubs.find(c => c.id === offer.clubId); requireRule(club && club.id !== s.contract?.clubId, 'Clube inválido.');
      if (offer.team === 'senior') requireRule(eligible(ageOn(s.player.birthDate, s.date), s.development), 'Sem elegibilidade para o principal.');
      const result = sign(s.player, club, offer, s.date);
      if (s.contract) { const old = s.clubs.find(c => c.id === s.contract?.clubId)!; old.wageBudget += s.contract.weeklyWage; if (s.contract.team === 'youth') old.youthPlaces++; else old.seniorPlaces++; }
      s.clubs = s.clubs.map(c => c.id === club.id ? result.club : c); s.contract = result.contract; s.offers = []; s.preparation = null; s.stage = 'contracted';
      s.history.push(`Contrato assinado: ${club.name} (${offer.team === 'youth' ? 'base' : 'principal'}).`); break;
    }
    case 'prepare': {
      allowed(s, ['contracted', 'active', 'offers']); requireRule(s.contract, 'Assine um contrato.');
      requireRule(s.player.energy >= 50 && s.player.health >= 60, 'Recupere energia e saúde antes da partida.');
      const date = addDays(s.date, 7); requireRule(date < s.contract.endDate, 'Contrato não cobre a partida.');
      s.preparation = { competition: s.contract.team === 'youth' ? 'Amistoso de integração da base' : 'Amistoso de integração do principal', opponent: 'Equipe de avaliação local', date,
        role: s.contract.role, expectedMinutes: s.contract.role === 'reserve' ? 30 : 15, coachTrust: s.contract.role === 'reserve' ? 50 : 35,
        objective: `Cumpra as ações da posição ${s.player.position}. Minutos previstos não são garantia.` };
      s.stage = 'ready'; s.offers = []; s.history.push('Preparação para a próxima partida concluída.'); break;
    }
    case 'performance': {
      allowed(s, ['ready']); requireRule(s.preparation, 'Partida não preparada.'); s.development = record(s.development, command.performance);
      s.date = s.preparation.date; s.preparation = null; s.stage = 'active';
      s.player.energy = Math.max(0, s.player.energy - Math.ceil(command.performance.minutes / 3));
      s.player.morale = Math.max(1, Math.min(100, s.player.morale + Math.round(command.performance.rating - 6)));
      s.player.reputation = Math.min(100, s.player.reputation + (command.performance.rating >= 7 ? 1 : 0));
      s.history.push(`Atuação registrada: nota ${command.performance.rating}.`); break;
    }
    case 'promote': {
      allowed(s, ['contracted', 'active']); requireRule(s.contract?.team === 'youth', 'Jogador deve estar na base.');
      requireRule(s.date < s.contract.endDate && eligible(ageOn(s.player.birthDate, s.date), s.development), 'Idade/desempenho insuficientes.');
      const club = s.clubs.find(c => c.id === s.contract?.clubId)!;
      requireRule(club.seniorPlaces > 0 && calculateOverall(s.player.position, s.player.attributes) >= club.squadOverall - 8, 'Principal sem vaga ou OVR insuficiente.');
      club.youthPlaces++; club.seniorPlaces--; s.contract = { ...s.contract, team: 'senior', role: 'prospect' }; s.stage = 'contracted'; s.offers = []; s.preparation = null;
      s.history.push('Promovido ao principal pelo desempenho.'); break;
    }
    default: throw new Error('Comando inválido.');
  }
  return s;
}
export function careerView(s: CareerState) {
  return { name: s.player.name, position: s.player.position, age: ageOn(s.player.birthDate, s.date), date: s.date, stage: s.stage,
    overall: calculateOverall(s.player.position, s.player.attributes), energy: s.player.energy,
    potentialEstimate: s.assessment ? { low: s.assessment.potentialLow, high: s.assessment.potentialHigh } : null,
    club: s.clubs.find(c => c.id === s.contract?.clubId)?.name ?? null, contract: s.contract, preparation: s.preparation,
    offers: s.offers.map(o => ({ ...o, clubName: s.clubs.find(c => c.id === o.clubId)?.name })), development: s.development };
}
