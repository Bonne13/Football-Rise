import { stadiumReference } from './stadium-reference.js';
import type { Club } from '../domain/career/state.js';
export interface StadiumProfile { id: string; name: string; city: string; country: string; size: 'local' | 'regional' | 'arena'; landscape: 'urban' | 'mountains' | 'rural' | 'coastal'; seed: number; simulated: true; reference: 'historical' | 'procedural' | 'training'; venueId: string; capacity: number; shape: 'rectangular' | 'bowl' | 'oval'; roof: 'full' | 'partial' | 'open'; tiers: 1 | 2 | 3; track: boolean; facade: 'concrete' | 'glass' | 'ribs'; seatColors?: [string, string] }
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
  const id = club?.id ?? 'academy', country = club?.country ?? 'Brasil';
  const reference = club ? stadiumReference(club.name, country) : undefined;
  const venueId = reference && !training ? `${country}:${reference.city}:${reference.name}` : `${id}:${training ? 'training' : 'home'}`;
  let seed = 2166136261;
  for (const c of venueId) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  const location = locations[club?.name ?? 'União do Vale'];
  const coastal = new Set(['Santos', 'Vigo', 'A Coruña', 'Santander', 'Málaga', 'Barcelona', 'Valência', 'Cádiz', 'Palma', 'Las Palmas', 'Santa Cruz de Tenerife', 'Gênova', 'Nápoles', 'Veneza', 'Cagliari', 'Palermo', 'Marselha', 'Nice', 'Brest', 'Lorient', 'Le Havre', 'Dunkerque', 'Florianópolis', 'Salvador', 'Recife', 'Fortaleza', 'Maceió']);
  const mountains = new Set(['Bérgamo', 'Bolzano', 'Como', 'Grenoble', 'Annecy', 'Granada', 'Andorra la Vella', 'Eibar', 'Belo Horizonte', 'Rio de Janeiro', 'Caxias do Sul', 'São João del-Rei']);
  const city = reference?.city ?? location?.city ?? 'Cidade não catalogada';
  const regional = country === 'Portugal' || country === 'Espanha' || country === 'Itália' ? 'mountains' : country === 'Inglaterra' ? 'rural' : 'urban';
  const capacity = training ? 1000 : reference?.capacity ?? Math.round(2000 + (club?.reputation ?? 25) ** 2 * 7);
  const name = reference?.name ?? '';
  const track = ['Stadio Olimpico', 'Olympiastadion', 'Max-Morlock-Stadion', 'Eintracht-Stadion', 'Estádio Nilton Santos', 'Stade Louis II', 'Parc des Sports', 'Dei Marmi', 'Euganeo'].includes(name) && !training;
  const oval = track || ['Maracanã', 'Mineirão', 'Morumbi', 'Castelão', 'Beira-Rio', 'Estádio do Café', 'Barradão'].includes(name);
  const modern = ['Emirates Stadium', 'Tottenham Hotspur Stadium', 'Hill Dickinson Stadium', 'City of Manchester Stadium', 'Metropolitano', 'San Mamés', 'RCDE Stadium', 'Santiago Bernabéu', 'Camp Nou', 'Juventus Stadium', 'Allianz Arena', 'Arena AufSchalke', 'Stade Pierre-Mauroy', 'Parc Olympique Lyonnais', 'Stade de Nice', 'Arena MRV', 'Arena da Baixada', 'Arena Fonte Nova', 'Neo Química Arena', 'Arena do Grêmio', 'Allianz Parque', 'Arena Pantanal'];
  const isModern = modern.includes(name);
  const shape = training ? 'rectangular' : oval ? 'oval' : isModern || name === 'Parc des Princes' || name === 'Stade Vélodrome' ? 'bowl' : 'rectangular';
  const size = training ? 'local' : reference ? capacity < 12000 ? 'local' : capacity < 35000 ? 'regional' : 'arena' : (club?.reputation ?? 25) < 40 ? 'local' : (club?.reputation ?? 25) < 65 ? 'regional' : 'arena';
  const roof = training || capacity < 18000 ? 'partial' : ['Morumbi', 'Barradão', 'Estádio do Café', 'Baenão', 'Ilha do Retiro', 'Moisés Lucarelli', 'São Januário'].includes(name) ? 'partial' : 'full';
  return { id, venueId, name: training ? `Campo de treino · ${club?.name ?? 'Rise Academy'}` : reference?.name ?? `Estádio · ${club?.name ?? 'Rise Academy'}`, city, country, size,
    landscape: location?.landscape ?? (coastal.has(city) ? 'coastal' : mountains.has(city) ? 'mountains' : reference ? 'urban' : regional), seed, simulated: true,
    reference: training ? 'training' : reference ? 'historical' : 'procedural', capacity, shape, roof, track,
    tiers: training || capacity < 20000 ? 1 : capacity >= 60000 ? 3 : 2, facade: isModern ? name === 'Santiago Bernabéu' || name === 'Allianz Arena' ? 'ribs' : 'glass' : 'concrete',
    ...(['Maracanã', 'Mineirão'].includes(name) && !training ? { seatColors: ['#4c9bce', '#e2c64e'] as [string, string] } : name === 'Allianz Arena' && !training ? { seatColors: ['#bc2233', '#dfdddd'] as [string, string] } : {}) };
}
