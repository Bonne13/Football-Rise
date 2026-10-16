import type { CompetitionWorld, Tournament } from '../competitions/world.js';
export interface CrowdProfile { occupancy: number; attendance: number; form: number; samples: number; mood: 'empolgada' | 'apoiando' | 'cobrando'; homeIsPlayer: boolean }
/** Recent club results alter demand; reputation supplies the baseline. No random result affects play. */
export function matchCrowd(world: CompetitionWorld, teamId: string, capacity: number, reputation: number, date: string, level: Tournament['level'], homeIsPlayer: boolean): CrowdProfile {
  const ids = new Set(world.tournaments.filter(t => t.level === level).map(t => t.id));
  const recent = world.fixtures.filter(f => ids.has(f.competitionId) && f.date <= date && f.homeGoals !== null && f.awayGoals !== null && (f.home === teamId || f.away === teamId)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, 6);
  const points = recent.reduce((sum, f) => { const h = f.home === teamId, own = h ? f.homeGoals! : f.awayGoals!, other = h ? f.awayGoals! : f.homeGoals!; return sum + (own > other ? 3 : own === other ? 1 : 0); }, 0);
  const form = recent.length ? points / (recent.length * 3) : .5;
  const demand = .32 + Math.max(0, Math.min(100, reputation)) * .004 + (form - .5) * .45;
  const occupancy = Math.max(.08, Math.min(.98, demand * (level === 'youth' ? .4 : 1)));
  return { occupancy, attendance: Math.floor(Math.max(0, capacity) * occupancy), form, samples: recent.length, mood: form >= .65 ? 'empolgada' : form <= .3 ? 'cobrando' : 'apoiando', homeIsPlayer };
}
export function crowdReaction(crowd: CrowdProfile, outcome: string | null): { message: string; cheer: boolean; strength: number } {
  if (outcome === 'goal') return { message: crowd.homeIsPlayer ? 'Torcida da casa comemora o gol!' : 'Torcida da casa lamenta o gol sofrido.', cheer: crowd.homeIsPlayer, strength: .9 };
  if (['save', 'wide', 'wall', 'offside', 'intercepted'].includes(outcome ?? '')) return { message: crowd.homeIsPlayer ? crowd.mood === 'cobrando' ? 'A torcida cobra uma reação.' : 'A torcida lamenta a chance perdida.' : 'A torcida da casa respira aliviada.', cheer: !crowd.homeIsPlayer, strength: .45 };
  return { message: crowd.homeIsPlayer ? 'A torcida aplaude a jogada.' : 'A torcida acompanha o lance.', cheer: crowd.homeIsPlayer, strength: .25 };
}
