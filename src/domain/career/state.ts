import type { CompetitionWorld } from '../competitions/world.js';
import type { FootballPack } from '../../data/football-pack.js';
import type { Shirt } from '../clubs/shirt.js';
import type { Attributes, CareerPlayer, Position } from '../player/player.js';
export const POSITIONS: Position[] = ['GK', 'CB', 'FB', 'DM', 'CM', 'AM', 'WG', 'ST'];
export const ATTRIBUTES: (keyof Attributes)[] = ['finishing', 'passing', 'vision', 'technique', 'pace', 'strength', 'defending', 'goalkeeping', 'setPieces', 'composure'];
export interface Club {
  id: string; name: string; country: string; reputation: number; facilities: number; coach: number;
  squadOverall: number; minimumOverall: number; minimumPotential: number; needs: Position[];
  youthPlaces: number; seniorPlaces: number; wageBudget: number; maxWeeklyWage: number;
}
export interface Offer {
  id: string; clubId: string; weeklyWage: number; signingBonus: number; durationWeeks: number;
  role: 'prospect' | 'reserve'; team: 'youth' | 'senior';
}
export interface Contract extends Offer { playerId: string; startDate: string; endDate: string }
export interface Development { appearances: number; minutes: number; goals: number; assists: number; recentRatings: number[] }
export interface Performance { rating: number; minutes: number; goals: number; assists: number }
export interface Report { clubId: string; team: 'youth' | 'senior'; estimatedPotential: number; score: number; stages: string[]; reason: string }
export interface Preparation { fixtureId: string | null; competition: string; opponent: string; date: string; role: 'prospect' | 'reserve'; expectedMinutes: number; coachTrust: number; objective: string }
export interface CareerState {
  schemaVersion: 3; world: CompetitionWorld; dataPack: FootballPack | null; shirt: Shirt; coachTrust: number; seed: number; rng: number; date: string;
  stage: 'created' | 'assessed' | 'trained' | 'offers' | 'contracted' | 'ready' | 'active';
  player: CareerPlayer; preferredFoot: 'left' | 'right' | 'both'; discipline: number;
  trainingSessions: number; assessment: { overall: number; potentialLow: number; potentialHigh: number } | null;
  clubs: Club[]; reports: Report[]; offers: Offer[]; contract: Contract | null;
  preparation: Preparation | null; development: Development; history: string[];
}
