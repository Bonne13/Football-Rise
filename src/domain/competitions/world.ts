import { addDays, ageOn, draw, requireRule } from '../../core/rules.js';
import { BRAZIL_STATES, CUP_SPECS, EUROPE, SOUTH_AMERICA, NATIONAL_TEAMS, brazilState } from '../../data/competitions.js';
import type { CareerState, Club, Performance } from '../career/state.js';
import { calculateOverall } from '../player/player.js';
export interface Team { id: string; name: string; country: string; strength: number; national: boolean }
export interface Fixture { id: string; competitionId: string; round: number; stage: string; group: number; date: string; home: string; away: string; homeGoals: number | null; awayGoals: number | null; penalties: [number, number] | null }
export interface Tournament { id: string; key: string; name: string; season: number; level: 'youth' | 'senior' | 'national'; format: 'league' | 'cup' | 'league-knockout' | 'groups'; phase: 'league' | 'groups' | 'playoff' | 'knockout' | 'complete' | 'unavailable'; participants: string[]; groups: string[][]; waiting: string[]; champion: string | null; notice: string }
export interface PlayerStats { playerId: string; name: string; teamId: string; competitionId: string; position: string; birthDate: string | null; appearances: number; minutes: number; goals: number; assists: number; ratingTotal: number; cleanSheets: number }
export interface Award { id: string; season: number; competitionId: string; kind: 'champion' | 'top-scorer' | 'best-player' | 'young-player' | 'goalkeeper' | 'team-of-tournament' | 'season-player'; name: string; playerId: string | null; playerName: string; teamId: string; value: number }
export interface SeasonSummary { season: number; champions: { competition: string; team: string }[] }
export interface CompetitionWorld { version: 1; protagonistId: string; season: number; rng: number; teams: Team[]; tournaments: Tournament[]; fixtures: Fixture[]; stats: PlayerStats[]; awards: Award[]; history: SeasonSummary[]; lastDate: string }
export interface Standing { teamId: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const startDate = (year: number, month: number, day: number) => `${year + (month < 7 ? 1 : 0)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const seasonOn = (date: string) => Number(date.slice(0, 4)) - (date.slice(5, 7) < '07' ? 1 : 0);
const sortedTeams = (clubs: readonly Club[]) => [...clubs].sort((a, b) => b.squadOverall - a.squadOverall || compare(a.id, b.id));
export function standings(w: CompetitionWorld, t: Tournament, group?: number): Standing[] {
  const rows = new Map((group === undefined ? t.participants : t.groups[group] ?? []).map(teamId => [teamId, { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 }]));
  for (const f of w.fixtures) {
    if (f.competitionId !== t.id || !['league', 'groups'].includes(f.stage) || f.homeGoals === null || f.awayGoals === null || (group !== undefined && f.group !== group)) continue;
    const h = rows.get(f.home), a = rows.get(f.away); if (!h || !a) continue;
    h.played++; a.played++; h.goalsFor += f.homeGoals; h.goalsAgainst += f.awayGoals; a.goalsFor += f.awayGoals; a.goalsAgainst += f.homeGoals;
    if (f.homeGoals === f.awayGoals) { h.drawn++; a.drawn++; h.points++; a.points++; } else { const winner = f.homeGoals > f.awayGoals ? h : a, loser = winner === h ? a : h; winner.won++; loser.lost++; winner.points += 3; }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || compare(a.teamId, b.teamId));
}
const calendarIndexes = new WeakMap<CompetitionWorld, { busy: Set<string>; counters: Map<string, number>; ids: Set<string> }>();
function calendarIndex(w: CompetitionWorld) {
  let index = calendarIndexes.get(w);
  if (!index) {
    index = { busy: new Set(), counters: new Map(), ids: new Set() };
    const levels = new Map(w.tournaments.map(t => [t.id, t.level]));
    for (const f of w.fixtures) { const level = levels.get(f.competitionId); index.busy.add(`${level}:${f.home}:${f.date}`); index.busy.add(`${level}:${f.away}:${f.date}`); index.ids.add(f.id); index.counters.set(f.competitionId, (index.counters.get(f.competitionId) ?? 0) + 1); }
    calendarIndexes.set(w, index);
  }
  return index;
}
function fixture(w: CompetitionWorld, t: Tournament, home: string, away: string, date: string, round: number, stage: string, group = -1) {
  const index = calendarIndex(w);
  while (index.busy.has(`${t.level}:${home}:${date}`) || index.busy.has(`${t.level}:${away}:${date}`)) date = addDays(date, 1);
  let count = index.counters.get(t.id) ?? 0;
  while (index.ids.has(`${t.id}:${count}`)) count++;
  const id = `${t.id}:${count}`; index.counters.set(t.id, count + 1); index.ids.add(id);
  index.busy.add(`${t.level}:${home}:${date}`); index.busy.add(`${t.level}:${away}:${date}`);
  w.fixtures.push({ id, competitionId: t.id, home, away, date, round, stage, group, homeGoals: null, awayGoals: null, penalties: null });
}
function roundRobin(w: CompetitionWorld, t: Tournament, ids: string[], firstDate: string, stage: string, rounds?: number, group = -1, secondLeg = false) {
  const rotation: (string | null)[] = [...ids]; if (rotation.length % 2) rotation.push(null);
  const base: { home: string; away: string; round: number }[] = [];
  for (let round = 0; round < rotation.length - 1; round++) {
    for (let i = 0; i < rotation.length / 2; i++) { const a = rotation[i], b = rotation[rotation.length - 1 - i]; if (a && b) base.push({ home: round % 2 ? b : a, away: round % 2 ? a : b, round }); }
    rotation.splice(1, 0, rotation.pop()!);
  }
  const schedule = secondLeg ? [...base, ...base.map(f => ({ home: f.away, away: f.home, round: f.round + rotation.length - 1 }))] : base;
  for (const f of schedule) if (rounds === undefined || f.round < rounds) fixture(w, t, f.home, f.away, addDays(firstDate, f.round * (t.key.includes('champions') || t.key === 'europa' || t.key === 'conference' ? 14 : 7)), f.round + 1, stage, group);
}
function knockout(w: CompetitionWorld, t: Tournament, ids: string[], date: string, round: number, stage = 'knockout') {
  const size = 2 ** Math.ceil(Math.log2(ids.length)), byes = size - ids.length;
  t.waiting = ids.slice(0, byes);
  const paired = ids.slice(byes);
  for (let i = 0; i < paired.length; i += 2) fixture(w, t, paired[i]!, paired[paired.length - 1 - i]!, date, round, stage);
}
function addTournament(w: CompetitionWorld, key: string, name: string, ids: string[], format: Tournament['format'], level: Tournament['level'], date: string, rounds?: number) {
  const t: Tournament = { id: `${w.season}:${key}`, key, name, season: w.season, level, format, phase: ids.length < 2 ? 'unavailable' : format === 'league' || format === 'league-knockout' ? 'league' : format === 'groups' ? 'groups' : 'knockout', participants: [...ids], groups: [], waiting: [], champion: null,
    notice: 'Calendário, participantes e classificações simulados no save. Formatos compactos; não é o regulamento oficial integral.' };
  w.tournaments.push(t); if (ids.length < 2) { t.notice = 'Clubes/seleções insuficientes no pacote para realizar esta edição.'; return; }
  if (t.phase === 'league') roundRobin(w, t, ids, date, 'league', rounds);
  else if (t.phase === 'groups') {
    // Seeded pots distribute the strongest teams across groups instead of stacking them together.
    const count = Math.max(1, Math.ceil(ids.length / 4)); t.groups = Array.from({ length: count }, () => []);
    ids.forEach((id, i) => t.groups[i % count]!.push(id));
    t.groups.forEach((group, i) => roundRobin(w, t, group, date, 'groups', undefined, i, key === 'libertadores'));
  } else knockout(w, t, ids, date, 1);
}
export function createWorld(clubs: readonly Club[], seed: number, date: string, previous?: CompetitionWorld, protagonistId = `player-${seed}`): CompetitionWorld {
  const season = seasonOn(date);
  const w: CompetitionWorld = { version: 1, protagonistId, season, rng: seed >>> 0, lastDate: date, teams: clubs.map(c => ({ id: c.id, name: c.name, country: c.country, strength: c.squadOverall, national: false })), tournaments: [], fixtures: [], stats: [], awards: structuredClone(previous?.awards ?? []), history: structuredClone(previous?.history ?? []) };
  const countries = [...new Set(clubs.map(c => c.country))].sort();
  const previousRank = new Map<string, number>();
  for (const t of previous?.tournaments ?? []) if (t.key.startsWith('league:')) standings(previous!, t).forEach((row, i) => previousRank.set(row.teamId, i));
  const ranked = sortedTeams(clubs).sort((a, b) => (previousRank.get(a.id) ?? 99) - (previousRank.get(b.id) ?? 99));
  for (const country of countries) {
    const ids = ranked.filter(c => c.country === country).map(c => c.id);
    addTournament(w, `league:${country}`, `Liga nacional · ${country}`, ids, 'league', 'senior', startDate(season, 8, 8));
    addTournament(w, `youth:${country}`, `Liga da base · ${country}`, ids, 'league', 'youth', addDays(`${season}-07-01`, 7));
    addTournament(w, `cup:${country}`, country === 'Brasil' ? 'Copa do Brasil' : `Copa nacional · ${country}`, ids, 'cup', 'senior', startDate(season, 10, 7));
  }
  for (const [state, meta] of Object.entries(BRAZIL_STATES)) addTournament(w, `state:${state}`, `Campeonato ${meta.name}`, ranked.filter(c => c.country === 'Brasil' && brazilState(c.name) === state).map(c => c.id), 'cup', 'senior', startDate(season, 1, 10));
  const european = ranked.filter(c => EUROPE.includes(c.country)); const used = new Set<string>();
  for (const spec of CUP_SPECS.filter(c => ['champions', 'europa', 'conference'].includes(c.key))) {
    // Country quotas first; vacancies then filled from remaining eligible clubs. No overlapping berths.
    const chosen: string[] = [];
    for (const country of countries.filter(c => EUROPE.includes(c))) chosen.push(...european.filter(c => c.country === country && !used.has(c.id)).slice(0, 4).map(c => c.id));
    for (const c of european) if (chosen.length < 36 && !used.has(c.id) && !chosen.includes(c.id)) chosen.push(c.id);
    const ids = chosen.slice(0, 36); ids.forEach(id => used.add(id));
    addTournament(w, spec.key, spec.name, ids, spec.format, 'senior', startDate(season, spec.startMonth, spec.startDay), spec.rounds);
  }
  const lib = CUP_SPECS.find(c => c.key === 'libertadores')!;
  const south = ranked.filter(c => SOUTH_AMERICA.includes(c.country));
  const ids = countries.flatMap(country => south.filter(c => c.country === country).slice(0, 8).map(c => c.id)).slice(0, 32);
  addTournament(w, lib.key, lib.name, ids, lib.format, 'senior', startDate(season, lib.startMonth, lib.startDay));
  const edition = (season + 1) % 4 === 2 ? season + 1 : season;
  if (edition % 4 === 2 && !previous?.tournaments.some(t => t.key === 'world-cup' && t.name === `Copa do Mundo ${edition}`)) {
    const nations = [...NATIONAL_TEAMS];
    nations.forEach((name, i) => w.teams.push({ id: `nation:${name}`, name, country: name, strength: Math.max(55, 90 - Math.floor(i * .6)), national: true }));
    addTournament(w, 'world-cup', `Copa do Mundo ${edition}`, nations.map(n => `nation:${n}`), 'groups', 'national', `${edition}-06-01`);
  }
  return w;
}
function winner(f: Fixture): string { requireRule(f.homeGoals !== null && f.awayGoals !== null, 'Partida não encerrada.'); return f.homeGoals === f.awayGoals ? (f.penalties![0] > f.penalties![1] ? f.home : f.away) : f.homeGoals > f.awayGoals ? f.home : f.away; }
function grant(w: CompetitionWorld, t: Tournament, kind: Award['kind'], name: string, player: PlayerStats | null, teamId: string, value: number) {
  const id = `${t.id}:${kind}:${player?.playerId ?? teamId}`;
  if (!w.awards.some(a => a.id === id)) w.awards.push({ id, season: w.season, competitionId: t.id, kind, name, playerId: player?.playerId ?? null, playerName: player?.name ?? '', teamId, value });
}
function awardTournament(w: CompetitionWorld, t: Tournament) {
  if (t.champion) { grant(w, t, 'champion', `Campeão · ${t.name}`, null, t.champion, 1); const contributor = w.stats.find(p => p.playerId === w.protagonistId && p.competitionId === t.id && p.teamId === t.champion && p.appearances > 0); if (contributor) grant(w, t, 'champion', `Campeão · ${t.name}`, contributor, t.champion, 1); }
  const stats = w.stats.filter(p => p.competitionId === t.id && p.appearances >= 1);
  const scorer = [...stats].sort((a, b) => b.goals - a.goals || b.assists - a.assists || compare(a.playerId, b.playerId))[0];
  if (scorer?.goals) grant(w, t, 'top-scorer', `Artilheiro · ${t.name}`, scorer, scorer.teamId, scorer.goals);
  const minimum = Math.min(3, Math.max(1, ...stats.map(p => p.appearances)));
  const eligible = stats.filter(p => p.appearances >= minimum);
  const score = (p: PlayerStats) => p.ratingTotal / p.appearances + Math.min(2, (p.goals + p.assists) / p.appearances * .2);
  const best = [...eligible].sort((a, b) => score(b) - score(a) || b.minutes - a.minutes || compare(a.playerId, b.playerId));
  if (best[0]) grant(w, t, 'best-player', `Melhor jogador · ${t.name}`, best[0], best[0].teamId, Math.round(score(best[0]) * 100) / 100);
  const young = best.find(p => p.birthDate && ageOn(p.birthDate, w.lastDate) <= 21);
  if (young) grant(w, t, 'young-player', `Revelação · ${t.name}`, young, young.teamId, Math.round(score(young) * 100) / 100);
  const keeper = best.filter(p => p.position === 'GK').sort((a, b) => b.cleanSheets - a.cleanSheets || score(b) - score(a))[0];
  if (keeper) grant(w, t, 'goalkeeper', `Melhor goleiro · ${t.name}`, keeper, keeper.teamId, keeper.cleanSheets);
  for (const [positions, places] of [[['GK'], 1], [['CB', 'FB', 'DF'], 4], [['DM', 'CM', 'AM', 'MF'], 3], [['WG', 'ST', 'FW'], 3]] as const) {
    for (const p of best.filter(p => (positions as readonly string[]).includes(p.position)).slice(0, places)) grant(w, t, 'team-of-tournament', `Seleção · ${t.name}`, p, p.teamId, Math.round(score(p) * 100) / 100);
  }
}
function progress(w: CompetitionWorld, t: Tournament) {
  const all = w.fixtures.filter(f => f.competitionId === t.id);
  const current = all.filter(f => f.stage === t.phase && (t.phase === 'knockout' ? f.round === Math.max(...all.map(f => f.round)) : true));
  if (!current.length || current.some(f => f.homeGoals === null)) return;
  if (t.format === 'league') { t.phase = 'complete'; t.champion = standings(w, t)[0]!.teamId; awardTournament(w, t); return; }
  let qualified: string[];
  if (t.phase === 'league') {
    const ranked = standings(w, t).map(r => r.teamId);
    if (ranked.length >= 24) { t.phase = 'playoff'; knockout(w, t, ranked.slice(8, 24), addDays(current.reduce((max, f) => f.date > max ? f.date : max, current[0]!.date), 7), 1, 'playoff'); t.waiting = ranked.slice(0, 8); return; }
    qualified = ranked.slice(0, 2 ** Math.floor(Math.log2(ranked.length)));
  } else if (t.phase === 'groups') {
    qualified = t.groups.flatMap((_, i) => standings(w, t, i).slice(0, 2).map(r => r.teamId));
    if (t.key === 'world-cup') {
      const thirds = t.groups.flatMap((_, i) => standings(w, t, i)[2] ?? []).sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || compare(a.teamId, b.teamId));
      qualified.push(...thirds.slice(0, Math.max(0, 32 - qualified.length)).map(r => r.teamId));
    }
  } else qualified = [...t.waiting, ...current.map(winner)];
  if (qualified.length === 1) { t.phase = 'complete'; t.champion = qualified[0]!; t.waiting = []; awardTournament(w, t); return; }
  t.phase = 'knockout'; knockout(w, t, qualified, addDays(current.reduce((date, f) => f.date > date ? f.date : date, current[0]!.date), t.level === 'national' ? 3 : 7), Math.max(...all.map(f => f.round)) + 1);
}
export function nationalEligibility(s: CareerState) {
  const nation = s.world.teams.find(t => t.id === `nation:${s.player.nationality}`);
  const average = s.development.recentRatings.reduce((a, b) => a + b, 0) / Math.max(1, s.development.recentRatings.length);
  return !!nation && s.contract?.team === 'senior' && ageOn(s.player.birthDate, s.date) >= 16 && calculateOverall(s.player.position, s.player.attributes) >= Math.max(65, nation.strength - 12) && s.development.minutes >= 180 && average >= 7 && s.coachTrust >= 60;
}
export function nextFixture(s: CareerState): Fixture | null {
  if (!s.contract) return null;
  const level = s.contract.team === 'youth' ? 'youth' : 'senior'; const national = nationalEligibility(s);
  return [...s.world.fixtures].filter(f => f.homeGoals === null && f.date > s.date && f.date <= addDays(s.date, 7) && s.world.tournaments.some(t => t.id === f.competitionId && ((t.level === level && [f.home, f.away].includes(s.contract!.clubId)) || (national && t.level === 'national' && [f.home, f.away].includes(`nation:${s.player.nationality}`))))).sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id))[0] ?? null;
}
function stat(w: CompetitionWorld, index: Map<string, PlayerStats>, player: Omit<PlayerStats, 'appearances' | 'minutes' | 'goals' | 'assists' | 'ratingTotal' | 'cleanSheets'>): PlayerStats {
  const key = JSON.stringify([player.playerId, player.competitionId, player.teamId]);
  let result = index.get(key);
  if (!result) { result = { ...player, appearances: 0, minutes: 0, goals: 0, assists: 0, ratingTotal: 0, cleanSheets: 0 }; w.stats.push(result); index.set(key, result); }
  return result;
}
export function advanceWorld(s: CareerState, through: string, played?: { fixtureId: string; performance: Performance }) {
  const w = s.world;
  if (played) requireRule(w.fixtures.some(f => f.id === played.fixtureId && f.homeGoals === null && f.date <= through), 'Partida já disputada ou ausente.');
  requireRule(through >= w.lastDate, 'O calendário não pode retroceder.');
  const statsIndex = new Map(w.stats.map(p => [JSON.stringify([p.playerId, p.competitionId, p.teamId]), p]));
  const teamsIndex = new Map(w.teams.map(t => [t.id, t]));
  let pending = w.fixtures.filter(f => f.homeGoals === null && f.date <= through).sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id)), cursor = 0;
  const random = (min: number, max: number) => { const r = draw(w.rng, min, max); w.rng = r.state; return r.value; };
  while (true) {
    const f = pending[cursor++]; if (!f) break;
    const t = w.tournaments.find(t => t.id === f.competitionId)!;
    const home = teamsIndex.get(f.home)!, away = teamsIndex.get(f.away)!;
    f.homeGoals = Math.max(0, Math.min(5, random(0, 3) + Math.round((home.strength - away.strength + 4) / 25)));
    f.awayGoals = Math.max(0, Math.min(5, random(0, 3) + Math.round((away.strength - home.strength) / 25)));
    const controlled = played && played.fixtureId === f.id ? played : null;
    const playerTeam = t.level === 'national' ? `nation:${s.player.nationality}` : s.contract?.clubId;
    if (controlled) { requireRule(playerTeam === f.home || playerTeam === f.away, 'Atleta fora desta partida.'); if (playerTeam === f.home) f.homeGoals += controlled!.performance.goals + controlled!.performance.assists; else f.awayGoals += controlled!.performance.goals + controlled!.performance.assists; }
    if (['knockout', 'playoff'].includes(f.stage) && f.homeGoals === f.awayGoals) f.penalties = random(0, 1) ? [5, 4] : [4, 5];
    for (const team of [home, away]) {
      let goals = team.id === home.id ? f.homeGoals : f.awayGoals;
      const conceded = team.id === home.id ? f.awayGoals : f.homeGoals;
      if (controlled && playerTeam === team.id) {
        const p = stat(w, statsIndex, { playerId: s.player.id, name: s.player.name, teamId: team.id, competitionId: t.id, position: s.player.position, birthDate: s.player.birthDate });
        p.appearances++; p.minutes += controlled!.performance.minutes; p.goals += controlled!.performance.goals; p.assists += controlled!.performance.assists; p.ratingTotal += controlled!.performance.rating; if (!conceded && p.position === 'GK') p.cleanSheets++;
        goals -= controlled!.performance.goals;
      }
      const real = t.level === 'senior' ? s.dataPack?.clubs.find(p => p.club.id === team.id)?.senior ?? [] : [];
      const roster = real.length ? [real.find(p => p.position === 'GK'), ...real.filter(p => ['DF', 'CB', 'FB'].includes(p.position)).slice(0, 4), ...real.filter(p => ['MF', 'CM', 'AM', 'DM'].includes(p.position)).slice(0, 3), ...real.filter(p => ['FW', 'ST', 'WG'].includes(p.position)).slice(0, 3)].filter((p): p is typeof real[number] => !!p).map(p => ({ id: p.id, name: p.name, position: p.position })) : Array.from({ length: 11 }, (_, i) => ({ id: `sim:${team.id}:${t.level}:${i}`, name: `Atleta simulado ${i + 1} · ${team.name}`, position: i === 0 ? 'GK' : i < 5 ? 'DF' : i < 8 ? 'MF' : 'FW' }));
      const goalScorers = Array.from({ length: goals }, () => random(roster.length > 1 ? 1 : 0, roster.length - 1));
      const assistScorers = Array.from({ length: Math.max(0, goals - (controlled && playerTeam === team.id ? controlled!.performance.assists : 0)) }, (_, i) => { const choices = roster.map((_, j) => j).filter(j => j !== goalScorers[i]); return choices.length ? choices[random(0, choices.length - 1)]! : -1; });
      roster.forEach((npc, i) => { const p = stat(w, statsIndex, { playerId: `npc:${npc.id}`, name: npc.name, teamId: team.id, competitionId: t.id, position: npc.position, birthDate: t.level === 'youth' ? `${w.season - 17}-01-01` : null }); p.appearances++; p.minutes += 90; p.goals += goalScorers.filter(g => g === i).length; p.assists += assistScorers.filter(g => g === i).length; p.ratingTotal += (random(50, 80) + (goalScorers.includes(i) ? 10 : 0)) / 10; if (!conceded && npc.position === 'GK') p.cleanSheets++; });
    }
    const countBefore = w.fixtures.length; w.lastDate = f.date; progress(w, t);
    if (w.fixtures.length !== countBefore) { pending = [...pending.slice(cursor), ...w.fixtures.slice(countBefore).filter(next => next.date <= through)].sort((a, b) => compare(a.date, b.date) || compare(a.id, b.id)); cursor = 0; }
  }
  w.lastDate = through;
  if (seasonOn(through) > w.season) {
    const old = w;
    const candidates = new Map<string, { id: string; name: string; teamId: string; appearances: number; minutes: number; rating: number; goals: number; assists: number }>();
    const adult = new Set(old.tournaments.filter(t => t.level === 'senior').map(t => t.id));
    for (const p of old.stats.filter(p => adult.has(p.competitionId))) { const current = candidates.get(p.playerId) ?? { id: p.playerId, name: p.name, teamId: p.teamId, appearances: 0, minutes: 0, rating: 0, goals: 0, assists: 0 }; current.appearances += p.appearances; current.minutes += p.minutes; current.rating += p.ratingTotal; current.goals += p.goals; current.assists += p.assists; candidates.set(p.playerId, current); }
    const score = (p: { rating: number; appearances: number; goals: number; assists: number }) => p.rating / p.appearances + Math.min(2, (p.goals + p.assists) / p.appearances * .25);
    const best = [...candidates.values()].filter(p => p.appearances >= 10 && p.minutes >= 300).sort((a, b) => score(b) - score(a) || compare(a.id, b.id))[0];
    if (best) old.awards.push({ id: `${old.season}:season:season-player:${best.id}`, season: old.season, competitionId: `${old.season}:season`, kind: 'season-player', name: 'Jogador da temporada · mundo simulado', playerId: best.id, playerName: best.name, teamId: best.teamId, value: Math.round(score(best) * 100) / 100 });
    old.history.push({ season: old.season, champions: old.tournaments.filter(t => t.champion).map(t => ({ competition: t.name, team: old.teams.find(team => team.id === t.champion)!.name })) });
    s.world = createWorld(s.clubs, old.rng, through, old, old.protagonistId);
  }
}
