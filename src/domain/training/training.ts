import { bounded, requireRule } from '../../core/rules.js';
import { calculateOverall, clampRating, type AttributeId, type CareerPlayer } from '../player/player.js';
export const FOCUSES = ['finishing', 'passing', 'defending', 'goalkeeping', 'pace', 'technique'] as const;
export type Focus = typeof FOCUSES[number];
export function train(player: CareerPlayer, focus: Focus, facilities: number, coach: number, discipline: number): CareerPlayer {
  requireRule(FOCUSES.includes(focus), 'Treino inválido.');
  requireRule(player.energy >= 20 && player.health >= 60, 'Recupere energia e saúde antes de treinar.');
  for (const value of [facilities, coach, discipline]) bounded(value, 1, 100);
  const headroom = Math.max(0, player.potential - calculateOverall(player.position, player.attributes));
  const gain = headroom ? Math.min(headroom, Math.max(1, Math.round((facilities + coach + discipline + player.morale) / 100))) : 0;
  const attributes = { ...player.attributes, [focus]: clampRating(player.attributes[focus] + gain) };
  const secondary: AttributeId = focus === 'goalkeeping' ? 'composure' : 'technique';
  if (gain && secondary !== focus) attributes[secondary] = clampRating(attributes[secondary] + 1);
  return { ...player, attributes: calculateOverall(player.position, attributes) <= player.potential ? attributes : player.attributes,
    energy: player.energy - 15, morale: Math.min(100, player.morale + 1) };
}
