import { countriesIn } from './associations.js';
export interface CompetitionSpec { key: string; name: string; scope: 'national' | 'continental' | 'international' | 'state' | 'youth'; format: 'league' | 'cup' | 'league-knockout' | 'groups'; rounds: number; startMonth: number; startDay: number }
export const CUP_SPECS: CompetitionSpec[] = [
  { key: 'champions', name: 'UEFA Champions League', scope: 'continental', format: 'league-knockout', rounds: 8, startMonth: 9, startDay: 16 },
  { key: 'europa', name: 'UEFA Europa League', scope: 'continental', format: 'league-knockout', rounds: 8, startMonth: 9, startDay: 17 },
  { key: 'conference', name: 'UEFA Conference League', scope: 'continental', format: 'league-knockout', rounds: 6, startMonth: 10, startDay: 1 },
  { key: 'libertadores', name: 'CONMEBOL Libertadores', scope: 'continental', format: 'groups', rounds: 6, startMonth: 3, startDay: 3 },
  { key: 'sudamericana', name: 'CONMEBOL Sudamericana', scope: 'continental', format: 'groups', rounds: 6, startMonth: 3, startDay: 5 },
  { key: 'concacaf-champions', name: 'CONCACAF Champions Cup', scope: 'continental', format: 'cup', rounds: 5, startMonth: 2, startDay: 3 },
  { key: 'central-american', name: 'CONCACAF Central American Cup', scope: 'continental', format: 'groups', rounds: 4, startMonth: 8, startDay: 4 },
  { key: 'caribbean', name: 'CONCACAF Caribbean Cup', scope: 'continental', format: 'groups', rounds: 4, startMonth: 8, startDay: 6 },
  { key: 'leagues-cup', name: 'Leagues Cup', scope: 'continental', format: 'groups', rounds: 3, startMonth: 7, startDay: 20 },
  { key: 'world-cup', name: 'Copa do Mundo', scope: 'international', format: 'groups', rounds: 3, startMonth: 6, startDay: 1 },
];
export const BRAZIL_STATES: Record<string, { name: string; clubs: string[] }> = {
  AC: { name: 'Acreano', clubs: ['Rio Branco-AC', 'Atlético-AC', 'Galvez'] }, AL: { name: 'Alagoano', clubs: ['CRB', 'CSA', 'ASA'] }, AP: { name: 'Amapaense', clubs: ['Trem', 'Santos-AP'] }, AM: { name: 'Amazonense', clubs: ['Amazonas', 'Manaus', 'Nacional-AM'] },
  BA: { name: 'Baiano', clubs: ['Bahia', 'Vitória', 'Jacuipense'] }, CE: { name: 'Cearense', clubs: ['Ceará', 'Fortaleza', 'Ferroviário'] }, DF: { name: 'Candangão', clubs: ['Brasiliense', 'Gama'] }, ES: { name: 'Capixaba', clubs: ['Rio Branco-ES', 'Desportiva'] },
  GO: { name: 'Goiano', clubs: ['Goiás', 'Vila Nova', 'Atlético-GO', 'Atlético Goianiense'] }, MA: { name: 'Maranhense', clubs: ['Sampaio Corrêa', 'Moto Club'] }, MT: { name: 'Mato-Grossense', clubs: ['Cuiabá', 'Operário-VG'] }, MS: { name: 'Sul-Mato-Grossense', clubs: ['Operário-MS', 'Dourados'] },
  MG: { name: 'Mineiro', clubs: ['Atlético-MG', 'Atlético Mineiro', 'Cruzeiro', 'América-MG', 'Athletic Club-MG', 'Athletic-MG', 'Athletic Club', 'Aurora Atlético'] }, PA: { name: 'Paraense', clubs: ['Remo', 'Paysandu', 'Águia de Marabá'] }, PB: { name: 'Paraibano', clubs: ['Botafogo-PB', 'Treze', 'Campinense'] }, PR: { name: 'Paranaense', clubs: ['Athletico-PR', 'Athletico Paranaense', 'Coritiba', 'Londrina', 'Operário-PR'] },
  PE: { name: 'Pernambucano', clubs: ['Sport', 'Náutico', 'Santa Cruz'] }, PI: { name: 'Piauiense', clubs: ['Altos', 'River-PI', 'Parnahyba'] }, RJ: { name: 'Carioca', clubs: ['Flamengo', 'Fluminense', 'Botafogo', 'Vasco', 'Vasco da Gama', 'Volta Redonda'] }, RN: { name: 'Potiguar', clubs: ['ABC', 'América-RN'] },
  RS: { name: 'Gaúcho', clubs: ['Grêmio', 'Internacional', 'Juventude', 'Caxias', 'São José-RS'] }, RO: { name: 'Rondoniense', clubs: ['Porto Velho', 'Ji-Paraná'] }, RR: { name: 'Roraimense', clubs: ['São Raimundo-RR', 'GAS'] }, SC: { name: 'Catarinense', clubs: ['Avaí', 'Chapecoense', 'Criciúma', 'Figueirense', 'Brusque', 'Joinville'] },
  SP: { name: 'Paulista', clubs: ['Corinthians', 'Palmeiras', 'Santos', 'São Paulo', 'Red Bull Bragantino', 'Bragantino', 'Mirassol', 'Novorizontino', 'Ponte Preta', 'Guarani', 'Botafogo-SP', 'São Bernardo', 'Ferroviária', 'União do Vale'] }, SE: { name: 'Sergipano', clubs: ['Confiança', 'Sergipe'] }, TO: { name: 'Tocantinense', clubs: ['Tocantinópolis', 'Palmas'] },
};
export function brazilState(name: string): string | null { return Object.entries(BRAZIL_STATES).find(([, state]) => state.clubs.includes(name))?.[0] ?? null; }
export const EUROPE = countriesIn('UEFA');
export const SOUTH_AMERICA = countriesIn('CONMEBOL');
export const NORTH_AMERICA = countriesIn('CONCACAF');
export const CENTRAL_AMERICA = ['Belize', 'Costa Rica', 'El Salvador', 'Guatemala', 'Honduras', 'Nicarágua', 'Panamá'];
export const NATIONAL_TEAMS = ['Brasil', 'Argentina', 'França', 'Espanha', 'Inglaterra', 'Portugal', 'Alemanha', 'Países Baixos', 'Itália', 'Bélgica', 'Uruguai', 'Colômbia', 'Croácia', 'Marrocos', 'Japão', 'Senegal', 'Suíça', 'Dinamarca', 'Estados Unidos', 'México', 'Canadá', 'Equador', 'Áustria', 'Turquia', 'Noruega', 'Suécia', 'Polônia', 'Sérvia', 'Ucrânia', 'Escócia', 'República Tcheca', 'Grécia', 'Nigéria', 'Egito', 'Argélia', 'Tunísia', 'Costa do Marfim', 'Gana', 'Camarões', 'África do Sul', 'Coreia do Sul', 'Irã', 'Austrália', 'Arábia Saudita', 'Catar', 'Uzbequistão', 'Panamá', 'Costa Rica'];
