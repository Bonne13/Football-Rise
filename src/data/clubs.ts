import type { Club } from '../domain/career/state.js';
import { POSITIONS } from '../domain/career/state.js';
export interface ClubDataProvider { loadYouthClubs(): readonly Club[] }
export const developmentClubs: ClubDataProvider = { loadYouthClubs: () => [
  { id: 'vale', name: 'União do Vale', country: 'Brasil', reputation: 25, facilities: 45, coach: 55, squadOverall: 49, minimumOverall: 25, minimumPotential: 40, needs: [...POSITIONS], youthPlaces: 5, seniorPlaces: 3, wageBudget: 1500, maxWeeklyWage: 120 },
  { id: 'aurora', name: 'Aurora Atlético', country: 'Brasil', reputation: 52, facilities: 70, coach: 72, squadOverall: 60, minimumOverall: 43, minimumPotential: 60, needs: ['ST', 'WG', 'AM', 'CM'], youthPlaces: 2, seniorPlaces: 2, wageBudget: 4000, maxWeeklyWage: 300 },
  { id: 'serra', name: 'Sporting da Serra', country: 'Portugal', reputation: 65, facilities: 82, coach: 80, squadOverall: 66, minimumOverall: 49, minimumPotential: 67, needs: ['GK', 'CB', 'FB', 'DM', 'CM'], youthPlaces: 2, seniorPlaces: 2, wageBudget: 6000, maxWeeklyWage: 450 },
] };
