export type Position = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'WG' | 'ST';

export type AttributeId =
  | 'finishing'
  | 'passing'
  | 'vision'
  | 'technique'
  | 'pace'
  | 'strength'
  | 'defending'
  | 'goalkeeping'
  | 'setPieces'
  | 'composure';

export type Attributes = Record<AttributeId, number>;

export interface CareerPlayer {
  id: string;
  name: string;
  birthDate: string;
  nationality: string;
  position: Position;
  attributes: Attributes;
  potential: number;
  perceivedPotential: number;
  morale: number;
  energy: number;
  health: number;
  reputation: number;
}

const POSITION_WEIGHTS: Record<Position, Partial<Record<AttributeId, number>>> = {
  GK: { goalkeeping: 0.62, composure: 0.14, passing: 0.1, strength: 0.08, vision: 0.06 },
  CB: { defending: 0.34, strength: 0.2, composure: 0.13, pace: 0.1, passing: 0.1, vision: 0.07, technique: 0.06 },
  FB: { defending: 0.22, pace: 0.2, passing: 0.15, technique: 0.13, vision: 0.1, strength: 0.08, composure: 0.07, setPieces: 0.05 },
  DM: { defending: 0.22, passing: 0.18, vision: 0.16, composure: 0.13, strength: 0.1, technique: 0.09, pace: 0.07, setPieces: 0.05 },
  CM: { passing: 0.2, vision: 0.18, technique: 0.16, composure: 0.12, pace: 0.09, defending: 0.08, strength: 0.07, setPieces: 0.06, finishing: 0.04 },
  AM: { vision: 0.2, technique: 0.19, passing: 0.17, composure: 0.12, finishing: 0.1, pace: 0.09, setPieces: 0.08, strength: 0.05 },
  WG: { pace: 0.22, technique: 0.2, finishing: 0.15, passing: 0.12, vision: 0.1, composure: 0.08, setPieces: 0.07, strength: 0.06 },
  ST: { finishing: 0.27, composure: 0.18, pace: 0.15, technique: 0.12, strength: 0.1, vision: 0.06, passing: 0.06, setPieces: 0.06 },
};

export function clampRating(value: number): number {
  return Math.max(1, Math.min(100, Math.round(value)));
}

export function calculateOverall(position: Position, attributes: Attributes): number {
  const weights = POSITION_WEIGHTS[position];
  const score = Object.entries(weights).reduce((total, [attribute, weight]) => {
    return total + attributes[attribute as AttributeId] * (weight ?? 0);
  }, 0);
  return clampRating(score);
}

export function developmentHeadroom(player: CareerPlayer): number {
  return Math.max(0, player.potential - calculateOverall(player.position, player.attributes));
}
