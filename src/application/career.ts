import { createWorld, nextFixture, advanceWorld } from '../domain/competitions/world.js';
import { validateFootballPack, type FootballPack } from '../data/football-pack.js';
import { chooseNumber, joinShirt } from '../domain/clubs/shirt.js';
import { addDays, ageOn, bounded, draw, requireRule } from '../core/rules.js';
import { ATTRIBUTES, POSITIONS, type CareerState, type Performance } from '../domain/career/state.js';
import { calculateOverall, type Attributes, type Position } from '../domain/player/player.js';
import { developmentClubs, type ClubDataProvider } from '../data/clubs.js';
import { assess, recruit } from '../domain/youth/youth.js';
import { initialYouthClub } from '../domain/youth/placement.js';
import { plannedMinutes } from '../domain/match/participation.js';
import { train, type Focus } from '../domain/training/training.js';
import { makeOffer, sign } from '../domain/transfers/contracts.js';
import { eligible, record } from '../domain/career/progression.js';
export interface NewCareer { name: string; nationality: string; position: Position; preferredFoot: 'left' | 'right' | 'both'; seed: number; startingAge?: 14 | 15 | 16; startingClubId?: string; shirtNumber?: number; dataPack?: FootballPack }
export type Command = { type: 'place-youth'; quality: number } | { type: 'practice'; focus: Focus; quality: number } | { type: 'assess'; performances: Attributes } | { type: 'train'; focus: Focus } | { type: 'accept'; offerId: string }
  | { type: 'shirt-number'; number: number } | { type: 'kit'; index: number } | { type: 'performance'; performance: Performance } | { type: 'recover' | 'scout' | 'prepare' | 'promote' | 'advance-week' | 'renew' };
export function createCareer(input: NewCareer, provider: ClubDataProvider = developmentClubs): CareerState {
  for (const value of [input.name, input.nationality]) requireRule(typeof value === 'string' && value.trim().length > 0 && value.length <= 100, 'Nome/nacionalidade inválidos.');
  requireRule(POSITIONS.includes(input.position), 'Posição inválida.');
  requireRule(['left', 'right', 'both'].includes(input.preferredFoot), 'Pé preferido inválido.');
  bounded(input.seed, 0, 0xffffffff); requireRule(Number.isInteger(input.seed), 'Seed inválida.');
  const age = input.startingAge ?? 14; requireRule([14, 15, 16].includes(age), 'Idade inicial inválida.');
  let rng = input.seed; const attributes = {} as Attributes;
  for (const key of ATTRIBUTES) { const next = draw(rng, 35, 55); rng = next.state; attributes[key] = next.value; }
  const potential = draw(rng, 65, 95); rng = potential.state;
  if (input.dataPack) validateFootballPack(input.dataPack);
  const clubs = structuredClone(input.dataPack ? input.dataPack.clubs.map(p => p.club) : [...provider.loadYouthClubs()]); requireRule(clubs.length > 0, 'Pacote de clubes vazio.');
  const number = input.shirtNumber ?? 10; requireRule(Number.isInteger(number) && number >= 1 && number <= 99, 'Número inválido.');
  const career: CareerState = { schemaVersion: 3, world: createWorld(clubs, input.seed, '2026-07-01'), dataPack: input.dataPack ? structuredClone(input.dataPack) : null, shirt: { preferredNumber: number, number, kitIndex: 0, holders: [] }, coachTrust: 35, seed: input.seed, rng, date: '2026-07-01', stage: 'created',
    player: { id: `player-${input.seed}`, name: input.name.trim(), nationality: input.nationality.trim(), birthDate: `${2026 - age}-07-01`, position: input.position,
      attributes, potential: potential.value, perceivedPotential: 60, morale: 70, energy: 100, health: 100, reputation: 1 },
    preferredFoot: input.preferredFoot, discipline: 75, trainingSessions: 0, assessment: null, clubs, reports: [], offers: [], contract: null, preparation: null,
    development: { appearances: 0, minutes: 0, goals: 0, assists: 0, recentRatings: [] }, history: [`Carreira iniciada aos ${age} anos na base.`] };
  if (input.startingClubId) {
    const club = career.clubs.find(c => c.id === input.startingClubId); requireRule(club, 'Clube inicial inválido.');
    const offer = makeOffer(career.player,club,'youth'); requireRule(offer, 'A base deste clube não possui vaga ou orçamento. Escolha outro clube.');
    const result = sign(career.player,club,offer,career.date);
    career.contract = result.contract; career.clubs = career.clubs.map(c=>c.id===club.id?result.club:c); joinShirt(career,true);
    career.history.push(`Entrada na base do ${club.name}, antes da avaliação e dos treinos.`);
  }
  return career;
}
function allowed(state: CareerState, stages: CareerState['stage'][]) { requireRule(stages.includes(state.stage), 'Ação indisponível nesta etapa.'); }
export function advanceCareer(previous: CareerState, command: Command): CareerState {
  const s = structuredClone(previous);
  switch (command.type) {
    case 'place-youth': {
      allowed(s,['assessed','trained']);requireRule(!s.contract,'O jogador já pertence a um clube.');
      const club=initialYouthClub(s.player,s.clubs,command.quality);
      if(!club){s.history.push('Nenhuma base com vaga, orçamento e perfil compatível. Continue treinando para uma nova avaliação.');break;}
      const offer=makeOffer(s.player,club,'youth')!,result=sign(s.player,club,offer,s.date);
      s.contract=result.contract;s.clubs=s.clubs.map(c=>c.id===club.id?result.club:c);s.stage=s.trainingSessions>0?'contracted':'assessed';s.offers=[];
      s.coachTrust=Math.round(35+command.quality*.15);joinShirt(s,true);
      s.history.push(`Avaliação ${Math.round(command.quality)}/100: recrutado automaticamente pela base do ${club.name}.`);break;
    }
    case 'shirt-number': chooseNumber(s, command.number); s.history.push(`Camisa ${command.number} escolhida.`); break;
    case 'kit': requireRule(Number.isInteger(command.index) && command.index >= 0 && command.index <= 2, 'Uniforme inválido.'); s.shirt.kitIndex = command.index; break;
    case 'assess': { allowed(s, ['created']); const r = assess(s.player, command.performances, s.rng); Object.assign(s, r); s.stage = 'assessed'; s.history.push('Avaliação de fundamentos concluída.'); break; }
    case 'practice':
    case 'train': {
      allowed(s, ['assessed', 'trained', 'contracted', 'active']); const c = s.clubs.find(c => c.id === s.contract?.clubId);
      s.player = train(s.player, command.focus, c?.facilities ?? 40, c?.coach ?? 50, s.discipline, command.type === 'practice' ? command.quality : 100); s.trainingSessions++;
      if (!s.contract) s.stage = 'trained'; else if (s.stage === 'assessed') s.stage = 'contracted'; s.history.push(`Treino: ${command.focus}.`); break;
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
      s.coachTrust = offer.role === 'reserve' ? 50 : 35; joinShirt(s, true);
      s.history.push(`Contrato assinado: ${club.name} (${offer.team === 'youth' ? 'base' : 'principal'}).`); break;
    }
    case 'advance-week': {
      allowed(s, ['assessed', 'trained', 'contracted', 'active', 'offers']); s.date = addDays(s.date, 7); advanceWorld(s, s.date);
      s.player.energy = Math.min(100, s.player.energy + 15); s.history.push('Uma semana avançou: partidas e copas do mundo simulado foram processadas. Nenhuma atuação foi atribuída ao atleta.'); break;
    }
    case 'renew': {
      allowed(s, ['contracted', 'active', 'offers']); requireRule(s.contract, 'Assine um contrato.');
      requireRule(s.coachTrust >= 40, 'O treinador precisa de confiança 40 para renovar.');
      requireRule(s.contract.endDate <= addDays(s.date, 180), 'A renovação fica disponível nos últimos seis meses do contrato.');
      requireRule(s.date <= addDays(s.contract.endDate, 30), 'Prazo de renovação encerrado.');
      s.contract.endDate = addDays(s.contract.endDate > s.date ? s.contract.endDate : s.date, 728); s.preparation = null;
      s.history.push('Contrato renovado por mais 104 semanas, mantendo salário e papel.'); break;
    }
    case 'prepare': {
      allowed(s, ['contracted', 'active', 'offers']); requireRule(s.contract, 'Assine um contrato.');
      requireRule(s.player.energy >= 50 && s.player.health >= 60, 'Recupere energia e saúde antes da partida.');
      const fixture = nextFixture(s);
      const date = fixture?.date ?? addDays(s.date, 7); requireRule(date < s.contract.endDate, 'Contrato não cobre a partida.');
      s.preparation = { fixtureId: fixture?.id ?? null, competition: fixture ? s.world.tournaments.find(t => t.id === fixture.competitionId)!.name : s.contract.team === 'youth' ? 'Amistoso de integração da base' : 'Amistoso de integração do principal', opponent: fixture ? s.world.teams.find(t => t.id === (fixture.home === s.contract!.clubId || fixture.home === `nation:${s.player.nationality}` ? fixture.away : fixture.home))!.name : 'Equipe de avaliação local', date,
        role: s.contract.role, expectedMinutes: plannedMinutes(s.contract.role,s.coachTrust,s.player.energy,s.development.recentRatings), coachTrust: s.coachTrust,
        objective: `Cumpra as ações da posição ${s.player.position}. Minutos previstos não são garantia.` };
      s.stage = 'ready'; s.offers = []; s.history.push('Preparação para a próxima partida concluída.'); break;
    }
    case 'performance': {
      allowed(s, ['ready']); requireRule(s.preparation, 'Partida não preparada.'); s.development = record(s.development, command.performance);
      s.coachTrust = Math.max(1, Math.min(100, s.coachTrust + Math.round((command.performance.rating - 6) * 3)));
      const awardsBefore = new Set(s.world.awards.map(a => a.id));
      advanceWorld(s, s.preparation.date, s.preparation.fixtureId ? { fixtureId: s.preparation.fixtureId, performance: command.performance } : undefined);
      for (const award of s.world.awards) if (!awardsBefore.has(award.id) && award.playerId === s.player.id) s.history.push(`Premiação conquistada: ${award.name}.`);
      s.date = s.preparation.date; s.preparation = null; s.stage = 'active';
      s.player.energy = Math.max(0, s.player.energy - Math.ceil(command.performance.minutes / 3));
      s.player.morale = Math.max(1, Math.min(100, s.player.morale + Math.round(command.performance.rating - 6)));
      s.player.reputation = Math.min(100, s.player.reputation + (command.performance.rating >= 7 ? 1 : 0));
      s.history.push(`Atuação registrada: nota ${command.performance.rating} · ${command.performance.minutes} minutos · ${command.performance.goals} gols.`); break;
    }
    case 'promote': {
      allowed(s, ['contracted', 'active']); requireRule(s.contract?.team === 'youth', 'Jogador deve estar na base.');
      requireRule(s.date < s.contract.endDate && eligible(ageOn(s.player.birthDate, s.date), s.development), 'Idade/desempenho insuficientes.');
      const club = s.clubs.find(c => c.id === s.contract?.clubId)!;
      requireRule(club.seniorPlaces > 0 && calculateOverall(s.player.position, s.player.attributes) >= club.squadOverall - 8, 'Principal sem vaga ou OVR insuficiente.');
      club.youthPlaces++; club.seniorPlaces--; s.contract = { ...s.contract, team: 'senior', role: 'prospect' }; s.stage = 'contracted'; s.offers = []; s.preparation = null;
      s.coachTrust = Math.min(s.coachTrust, 40); joinShirt(s, true);
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
