import type { Kit } from './kits.js';
export type OfficialsColor = 'black' | 'yellow' | 'red';
export type OfficialsChoice = OfficialsColor | 'auto';
/** Original referee designs. The three colours are choices, not a claim of FIFA certification. */
export const OFFICIAL_KITS: Record<OfficialsColor, Kit> = {
  black: { name: 'Preto', shirt: '#202730', secondary: '#53606b', shorts: '#141c26', socks: '#141c26', ink: '#ffffff', pattern: 'plain' },
  yellow: { name: 'Amarelo', shirt: '#f2d33e', secondary: '#232b34', shorts: '#141c26', socks: '#141c26', ink: '#141c26', pattern: 'plain' },
  red: { name: 'Vermelho', shirt: '#dd414b', secondary: '#232b34', shorts: '#141c26', socks: '#141c26', ink: '#ffffff', pattern: 'plain' },
};
function rgb(hex: string) { return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); }
/** Maximise the worst colour distance from the visible player/keeper shirts. */
export function officialsColor(choice: OfficialsChoice, shirts: readonly string[]): OfficialsColor {
  if (choice !== 'auto') return choice;
  const distance = (a: string, b: string) => rgb(a).reduce((sum, n, i) => sum + (n - rgb(b)[i]!) ** 2, 0);
  return (Object.keys(OFFICIAL_KITS) as OfficialsColor[]).sort((a, b) => {
    const score = (key: OfficialsColor) => Math.min(...shirts.map(s => distance(OFFICIAL_KITS[key].shirt, s)), Infinity);
    return score(b) - score(a);
  })[0]!;
}
