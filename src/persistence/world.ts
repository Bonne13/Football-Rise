import { regulationById } from '../data/competition-regulations.js';
import { aggregate, tieMatches, type Tournament, type Fixture } from '../domain/competitions/world.js';
import type { CompetitionWorld } from '../domain/competitions/world.js';
import { requireRule } from '../core/rules.js';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 500;
const number = (v: unknown, lo: number, hi: number, int = true) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi && (!int || Number.isInteger(v));
const date = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && new Date(v).toString() !== 'Invalid Date' && new Date(v).toISOString().slice(0, 10) === v;
const fields = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const list = (v: unknown, max: number): v is unknown[] => Array.isArray(v) && v.length <= max;
export function validateWorld(value: unknown): asserts value is CompetitionWorld {
  requireRule(object(value) && fields(value, ['version', 'protagonistId', 'season', 'rng', 'teams', 'tournaments', 'fixtures', 'stats', 'awards', 'history', 'lastDate']), 'Formato de competições inválido.');
  requireRule(value.version === 1 && text(value.protagonistId) && number(value.season, 1900, 3000) && number(value.rng, 0, 0xffffffff) && date(value.lastDate), 'Calendário inválido.');
  requireRule(list(value.teams, 11000) && list(value.tournaments, 1000) && list(value.fixtures, 100000) && list(value.stats, 200000) && list(value.awards, 100000) && list(value.history, 1000), 'Mundo de competições excede os limites.');
  const teams = new Set<string>(), tournaments = new Map<string, { level: string; participants: Set<string>; phase: string }>(), fixtures = new Set<string>(), occupied = new Set<string>(), stats = new Set<string>(), awards = new Set<string>();
  for (const t of value.teams) { requireRule(object(t) && fields(t, ['id', 'name', 'country', 'strength', 'national']) && text(t.id) && text(t.name) && text(t.country) && number(t.strength, 1, 100) && typeof t.national === 'boolean' && !teams.has(String(t.id)), 'Equipe inválida ou duplicada.'); teams.add(String(t.id)); }
  for (const t of value.tournaments) {
    requireRule(object(t) && fields(t, [...(Object.hasOwn(t,'regulationId')?['regulationId']:[]), 'id', 'key', 'name', 'season', 'level', 'format', 'phase', 'participants', 'groups', 'waiting', 'champion', 'notice']) && text(t.id) && text(t.key) && text(t.name) && t.season === value.season && text(t.notice) && ['youth', 'senior', 'national'].includes(String(t.level)) && ['league', 'cup', 'league-knockout', 'groups'].includes(String(t.format)) && ['league', 'groups', 'playoff', 'knockout', 'complete', 'unavailable'].includes(String(t.phase)), 'Competição inválida.');
    if(Object.hasOwn(t,'regulationId')) requireRule(typeof t.regulationId==='string' && (regulationById(t.regulationId)?.key===t.key || (['champions','europa','conference','libertadores','sudamericana','concacaf-champions','central-american','caribbean','world-cup'].includes(String(t.key)) && t.regulationId===`continental-v1:${t.key}`)), 'Regulamento desconhecido.');
    requireRule(list(t.participants, 10000) && t.participants.every(id => typeof id === 'string' && teams.has(id)) && new Set(t.participants).size === t.participants.length, 'Participantes inválidos.');
    const participants = new Set(t.participants as string[]);
    requireRule(list(t.waiting, 10000) && t.waiting.every(id => participants.has(String(id))) && new Set(t.waiting).size === t.waiting.length && list(t.groups, 1000) && t.groups.every(g => Array.isArray(g) && g.every(id => participants.has(String(id)))) && (t.champion === null || participants.has(String(t.champion))) && (t.phase === 'complete' ? t.champion !== null : t.champion === null), 'Classificação inconsistente.');
    const grouped = (t.groups as string[][]).flat(); requireRule(!grouped.length || (grouped.length === participants.size && new Set(grouped).size === grouped.length), 'Grupos duplicados ou incompletos.');
    requireRule(!tournaments.has(String(t.id)), 'Competição duplicada.'); tournaments.set(String(t.id), { level: String(t.level), participants, phase: String(t.phase) });
  }
  for (const f of value.fixtures) {
    requireRule(object(f) && fields(f, ['id', 'competitionId', 'round', 'stage', 'group', 'date', 'home', 'away', 'homeGoals', 'awayGoals', 'penalties']) && text(f.id) && !fixtures.has(String(f.id)) && tournaments.has(String(f.competitionId)) && number(f.round, 1, 1000) && ['league', 'groups', 'knockout', 'playoff'].includes(String(f.stage)) && number(f.group, -1, 1000) && date(f.date), 'Partida inválida.');
    const t = tournaments.get(String(f.competitionId))!;
    const full = (value.tournaments as unknown as { id: string; groups: string[][] }[]).find(c => c.id === f.competitionId)!;
    requireRule(f.stage === 'groups' ? Number(f.group) >= 0 && !!full.groups[Number(f.group)]?.includes(String(f.home)) && !!full.groups[Number(f.group)]?.includes(String(f.away)) : f.group === -1, 'Grupo da partida inconsistente.');
    requireRule(f.home !== f.away && t.participants.has(String(f.home)) && t.participants.has(String(f.away)), 'Adversários inválidos.');
    const pending = f.homeGoals === null && f.awayGoals === null;
    requireRule(pending || (number(f.homeGoals, 0, 100) && number(f.awayGoals, 0, 100)), 'Placar inválido.');
    const pens = f.penalties;
    const knockout = ['knockout', 'playoff'].includes(String(f.stage));
    const competition=(value.tournaments as unknown as Tournament[]).find(c=>c.id===f.competitionId)!;
    const revised=competition.regulationId?.startsWith('continental-v1:');
    const fw=value as unknown as CompetitionWorld, match=f as unknown as Fixture;
    const legs=revised?tieMatches(fw,match):[match];
    requireRule(legs.length<=2 && (legs.length!==2 || (legs[0]!.home===legs[1]!.away && legs[0]!.away===legs[1]!.home)), 'Confronto de ida e volta inválido.');
    requireRule(legs.length!==2 || legs[1]!.homeGoals===null || legs[0]!.homeGoals!==null, 'Volta disputada antes da ida.');
    const last=legs.at(-1)!.id===f.id, settled=legs.every(l=>l.homeGoals!==null);
    const [h,a]=revised?aggregate(fw,match):[f.homeGoals,f.awayGoals];
    requireRule(pens === null || (!pending && knockout && last && settled && h===a && Array.isArray(pens) && pens.length===2 && number(pens[0],0,100) && number(pens[1],0,100) && pens[0]!==pens[1]), 'Pênaltis inválidos.');
    requireRule(pending || !knockout || !last || !settled || h!==a || pens!==null, 'Mata-mata empatado sem desempate.');
    if (pending) requireRule(pens === null, 'Partida pendente com pênaltis.');
    for (const team of [f.home, f.away]) { const key = `${t.level}:${team}:${f.date}`; requireRule(!occupied.has(key), 'Equipe com duas partidas na mesma data.'); occupied.add(key); }
    fixtures.add(String(f.id));
  }
  for (const [id, t] of tournaments) requireRule(t.phase !== 'complete' || !value.fixtures.some(f => object(f) && f.competitionId === id && f.homeGoals === null), 'Competição encerrada com jogos pendentes.');
  for (const p of value.stats) {
    requireRule(object(p) && fields(p, ['playerId', 'name', 'teamId', 'competitionId', 'position', 'birthDate', 'appearances', 'minutes', 'goals', 'assists', 'ratingTotal', 'cleanSheets']) && text(p.playerId) && text(p.name) && text(p.position) && tournaments.has(String(p.competitionId)) && tournaments.get(String(p.competitionId))!.participants.has(String(p.teamId)) && (p.birthDate === null || date(p.birthDate)) && number(p.appearances, 1, 10000) && number(p.minutes, 1, 900000) && number(p.goals, 0, 100000) && number(p.assists, 0, 100000) && number(p.ratingTotal, 0, 100000, false) && number(p.cleanSheets, 0, Number(p.appearances)), 'Estatísticas inválidas.');
    requireRule(Number(p.minutes) <= Number(p.appearances) * 90 && Number(p.ratingTotal) <= Number(p.appearances) * 10, 'Estatísticas fora dos limites.');
    const key = JSON.stringify([p.playerId, p.competitionId, p.teamId]); requireRule(!stats.has(key), 'Estatísticas duplicadas.'); stats.add(key);
  }
  for (const a of value.awards) {
    requireRule(object(a) && fields(a, ['id', 'season', 'competitionId', 'kind', 'name', 'playerId', 'playerName', 'teamId', 'value']) && text(a.id) && !awards.has(String(a.id)) && number(a.season, 1900, Number(value.season)) && text(a.competitionId) && ['champion', 'top-scorer', 'best-player', 'young-player', 'goalkeeper', 'team-of-tournament', 'season-player'].includes(String(a.kind)) && text(a.name) && (a.playerId === null || text(a.playerId)) && typeof a.playerName === 'string' && a.playerName.length <= 500 && text(a.teamId) && number(a.value, 0, 100000, false), 'Premiação inválida ou duplicada.'); if (a.season === value.season) { const t = tournaments.get(String(a.competitionId)); requireRule(t?.phase === 'complete' && t.participants.has(String(a.teamId)) && (a.playerId === null || stats.has(JSON.stringify([a.playerId, a.competitionId, a.teamId]))), 'Premiação sem competição ou atuação concluída.'); } awards.add(String(a.id));
  }
  for (const h of value.history) requireRule(object(h) && fields(h, ['season', 'champions']) && number(h.season, 1900, Number(value.season) - 1) && list(h.champions, 1000) && h.champions.every(c => object(c) && fields(c, ['competition', 'team']) && text(c.competition) && text(c.team)), 'Histórico de temporadas inválido.');
}
