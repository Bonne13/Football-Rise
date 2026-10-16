export function requireRule(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
export function bounded(value: unknown, min: number, max: number): asserts value is number {
  requireRule(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, `Valor deve estar entre ${min} e ${max}.`);
}
export function draw(state: number, min: number, max: number) {
  const next = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return { state: next, value: min + Math.floor(next / 4294967296 * (max - min + 1)) };
}
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`); result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export function ageOn(birthDate: string, date: string) {
  return Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4)) - (date.slice(5) < birthDate.slice(5) ? 1 : 0);
}
