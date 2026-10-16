export interface Kit { name: string; shirt: string; secondary: string; shorts: string; socks: string; ink: string; pattern: 'plain' | 'stripe' | 'hoops' }
export interface KitDataProvider { kitsFor(clubId: string): readonly [Kit, Kit, Kit] }
const kit = (name: string, shirt: string, secondary: string, shorts: string, socks: string, ink: string, pattern: Kit['pattern']): Kit => ({ name, shirt, secondary, shorts, socks, ink, pattern });
/** Original designs for fictional clubs. No official/licensed kit claims. */
export const clubKits: KitDataProvider = { kitsFor: id => {
  if (id === 'aurora') return [kit('Principal', '#8e2540', '#e9c985', '#15243c', '#8e2540', '#ffffff', 'stripe'), kit('Visitante', '#f7f0dd', '#8e2540', '#f7f0dd', '#f7f0dd', '#8e2540', 'plain'), kit('Alternativo', '#162e49', '#52cfcb', '#162e49', '#162e49', '#f4ffff', 'hoops')];
  if (id === 'serra') return [kit('Principal', '#186943', '#f8f3dd', '#173e32', '#186943', '#ffffff', 'hoops'), kit('Visitante', '#f8f3dd', '#186943', '#186943', '#f8f3dd', '#173e32', 'plain'), kit('Alternativo', '#3d234f', '#dcb35d', '#291b36', '#3d234f', '#ffffff', 'stripe')];
  return [kit('Principal', '#194a88', '#f5f4eb', '#142e51', '#194a88', '#ffffff', 'stripe'), kit('Visitante', '#f5f4eb', '#194a88', '#194a88', '#f5f4eb', '#142e51', 'plain'), kit('Alternativo', '#123f40', '#73e3bb', '#0e3032', '#123f40', '#ffffff', 'hoops')];
} };
export const trainingKit: Kit = kit('Colete de treino', '#f77728', '#ffb260', '#17283d', '#eaf1f6', '#192b3c', 'plain');

export function nationalKit(country: string): Kit {
  const palettes: Record<string, [string, string, string, string]> = { Brasil: ['#f0cf37', '#287e48', '#235a9b', '#ffffff'], Argentina: ['#d9edf2', '#74b8dc', '#18283a', '#18283a'], França: ['#193a79', '#d9e6f0', '#193a79', '#ffffff'], Espanha: ['#a62435', '#e6b442', '#1d3658', '#ffffff'], Inglaterra: ['#f1f2ec', '#a62639', '#1c2b46', '#1c2b46'], Portugal: ['#a62638', '#246443', '#246443', '#ffffff'], Alemanha: ['#f1f1e9', '#242d3a', '#242d3a', '#242d3a'], Itália: ['#2365b0', '#e9eddf', '#e9eddf', '#ffffff'] };
  const [shirt, secondary, shorts, ink] = palettes[country] ?? ['#eef1ef', '#273e60', '#273e60', '#273e60'];
  return { name: 'Seleção · desenho simulado', shirt, secondary, shorts, socks: shirt, ink, pattern: country === 'Argentina' ? 'stripe' : 'plain' };
}
