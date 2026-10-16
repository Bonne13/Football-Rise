import type { Development, Performance } from './state.js';
import { bounded, requireRule } from '../../core/rules.js';
export function eligible(age: number, d: Development) {
  const average = d.recentRatings.reduce((a, b) => a + b, 0) / Math.max(1, d.recentRatings.length);
  return age >= 15 && d.appearances >= (age === 15 ? 6 : 4) && d.minutes >= (age === 15 ? 270 : 180)
    && d.recentRatings.length >= (age === 15 ? 6 : 4) && average >= (age === 15 ? 7.5 : 6.5);
}
export function record(d: Development, p: Performance): Development {
  bounded(p.rating, 0, 10); bounded(p.minutes, 1, 90);
  for (const v of [p.minutes, p.goals, p.assists]) requireRule(Number.isInteger(v), 'Minutos, gols e assistências devem ser inteiros.');
  bounded(p.goals, 0, 30); bounded(p.assists, 0, 30);
  return { appearances: d.appearances + 1, minutes: d.minutes + p.minutes, goals: d.goals + p.goals, assists: d.assists + p.assists, recentRatings: [...d.recentRatings, p.rating].slice(-6) };
}
