import type { Club } from '../domain/career/state.js';
export interface StadiumProfile { id: string; name: string; city: string; country: string; size: 'local' | 'regional' | 'arena'; landscape: 'urban' | 'mountains' | 'rural' | 'coastal'; seed: number; simulated: true }
const locations: Record<string, { city: string; landscape: StadiumProfile['landscape'] }> = {
  Arsenal: { city: 'Londres', landscape: 'urban' }, Chelsea: { city: 'Londres', landscape: 'urban' }, Tottenham: { city: 'Londres', landscape: 'urban' },
  Liverpool: { city: 'Liverpool', landscape: 'urban' }, 'Manchester City': { city: 'Manchester', landscape: 'urban' }, 'Manchester United': { city: 'Manchester', landscape: 'urban' },
  'Real Madrid': { city: 'Madri', landscape: 'urban' }, 'Atlético de Madrid': { city: 'Madri', landscape: 'urban' }, Barcelona: { city: 'Barcelona', landscape: 'coastal' },
  Granada: { city: 'Granada', landscape: 'mountains' }, Málaga: { city: 'Málaga', landscape: 'coastal' }, Valencia: { city: 'Valência', landscape: 'coastal' },
  Inter: { city: 'Milão', landscape: 'urban' }, Milan: { city: 'Milão', landscape: 'urban' }, Roma: { city: 'Roma', landscape: 'urban' }, Napoli: { city: 'Nápoles', landscape: 'coastal' },
  'Bayern München': { city: 'Munique', landscape: 'urban' }, 'Borussia Dortmund': { city: 'Dortmund', landscape: 'urban' }, Freiburg: { city: 'Friburgo', landscape: 'mountains' },
  'Paris Saint-Germain': { city: 'Paris', landscape: 'urban' }, Monaco: { city: 'Mônaco', landscape: 'mountains' }, Marseille: { city: 'Marselha', landscape: 'coastal' },
  Flamengo: { city: 'Rio de Janeiro', landscape: 'mountains' }, Fluminense: { city: 'Rio de Janeiro', landscape: 'mountains' }, Botafogo: { city: 'Rio de Janeiro', landscape: 'mountains' }, Vasco: { city: 'Rio de Janeiro', landscape: 'mountains' },
  Palmeiras: { city: 'São Paulo', landscape: 'urban' }, Corinthians: { city: 'São Paulo', landscape: 'urban' }, Santos: { city: 'Santos', landscape: 'coastal' },
  'União do Vale': { city: 'Vila do Vale (fictícia)', landscape: 'rural' }, 'Aurora Atlético': { city: 'Aurora (fictícia)', landscape: 'urban' }, 'Sporting da Serra': { city: 'Vila da Serra (fictícia)', landscape: 'mountains' },
};
export function stadiumFor(club?: Pick<Club, 'id' | 'name' | 'country' | 'reputation'>, training = false): StadiumProfile {
  const id = club?.id ?? 'academy'; let seed = 2166136261;
  for (const c of `${id}:${club?.country ?? 'Brasil'}`) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const location = locations[club?.name ?? 'União do Vale'];
  const country = club?.country ?? 'Brasil';
  const regional = country === 'Portugal' || country === 'Espanha' || country === 'Itália' ? 'mountains' : country === 'Inglaterra' ? 'rural' : 'urban';
  return { id, name: training ? `Campo de treino · ${club?.name ?? 'Rise Academy'}` : `Estádio · ${club?.name ?? 'Rise Academy'}`, city: location?.city ?? 'Cidade não catalogada', country,
    size: training || (club?.reputation ?? 25) < 40 ? 'local' : (club?.reputation ?? 25) < 65 ? 'regional' : 'arena', landscape: location?.landscape ?? regional, seed, simulated: true };
}
