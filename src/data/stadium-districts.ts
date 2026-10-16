import type { StadiumProfile } from './stadiums.js';
export interface Footprint { halfX: number; halfZ: number }
export interface Road { ax: number; az: number; bx: number; bz: number; width: number }
export interface DistrictBuilding { x: number; z: number; width: number; depth: number; height: number; base: number; roof: 'flat' | 'tile' | 'slate'; tint: number }
export interface DistrictTree { x: number; z: number; scale: number; pine: boolean }
export type DistrictKind = 'rio-neighborhood' | 'santos-blocks' | 'english-park' | 'basque-valley' | 'metropolitan' | 'terraced-town' | 'rural' | 'continental';
export function districtKind(p: StadiumProfile): DistrictKind {
  const named: Record<string, DistrictKind> = { 'São Januário': 'rio-neighborhood', 'Vila Belmiro': 'santos-blocks', 'Dean Court': 'english-park', Ipurua: 'basque-valley', 'Maracanã': 'metropolitan', 'Allianz Arena': 'english-park', Anfield: 'terraced-town' };
  return named[p.name] ?? (p.landscape === 'rural' ? 'rural' : p.country === 'Inglaterra' ? 'terraced-town' : p.country === 'Espanha' && p.landscape === 'mountains' ? 'basque-valley' : p.capacity > 55000 ? 'metropolitan' : p.country === 'Brasil' ? p.landscape === 'coastal' ? 'santos-blocks' : 'rio-neighborhood' : 'continental');
}
export function roadDistance(x: number, z: number, r: Road) {
  const dx = r.bx - r.ax, dz = r.bz - r.az, u = Math.max(0, Math.min(1, ((x - r.ax) * dx + (z - r.az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - r.ax - dx * u, z - r.az - dz * u);
}
export interface DistrictPlan { kind: DistrictKind; roads: Road[]; homes: DistrictBuilding[]; trees: DistrictTree[]; parking: { x: number; z: number; count: number }; entrance: { x: number; z: number }; palette: string[] }
/** Interpretation of each site's character, not a surveyed street map. Coordinates are pitch-centred in Z. */
export function districtPlan(p: StadiumProfile, f: Footprint): DistrictPlan {
  let seed = p.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const kind = districtKind(p), roads: Road[] = [], homes: DistrictBuilding[] = [], trees: DistrictTree[] = [];
  const road = (ax: number, az: number, bx: number, bz: number, width: number) => roads.push({ ax, az, bx, bz, width });
  const x = f.halfX, z = f.halfZ;
  if (kind === 'rio-neighborhood') {
    road(-x - 22, -z - 19, x + 78, -z - 19, 7);
    road(-x - 18, -z - 19, -x - 35, z + 90, 6);
    road(x + 20, -z - 19, x + 39, z + 52, 6);
    road(-x - 85, z + 38, x + 65, z + 66, 6);
    road(-x - 65, -z - 70, x + 50, -z - 62, 5);
  } else if (kind === 'santos-blocks') {
    road(-x - 18, -z - 62, -x - 18, z + 65, 7);
    road(x + 28, -z - 55, x + 28, z + 68, 9);
    road(-x - 75, -z - 20, x + 75, -z - 20, 7);
    road(-x - 70, z + 26, x + 70, z + 26, 7);
    road(x + 79, -z - 65, x + 79, z + 65, 8);
  } else if (kind === 'english-park' || kind === 'rural') {
    road(-x - 80, z + 37, x + 40, z + 37, 7);
    road(x + 28, z + 37, x + 28, -z - 12, 6);
    road(x + 28, -z - 12, x + 74, -z - 52, 6);
  } else if (kind === 'basque-valley') {
    road(-x - 24, -z - 52, -x - 24, z + 62, 8);
    road(-x - 24, -z - 26, x + 33, -z - 26, 6);
    road(-x - 24, z + 25, x + 27, z + 25, 6);
    road(-x - 72, -z - 65, -x - 67, z + 72, 6);
  } else if (kind === 'metropolitan') {
    road(-x - 110, -z - 42, x + 110, -z - 42, 20);
    road(x + 47, -z - 42, x + 47, z + 100, 14);
    road(-x - 33, -z - 42, -x - 33, z + 100, 10);
    road(-x - 105, z + 56, x + 100, z + 56, 12);
  } else if (kind === 'continental') {
    const avenue = p.country === 'Alemanha' ? 12 : p.country === 'França' ? 11 : 7;
    road(-x - 30, -z - 70, -x - 24, z + 65, avenue);
    road(-x - 30, -z - 23, x + 76, -z - 32, avenue);
    road(x + 26, -z - 32, x + 45, z + 75, 7);
    if (p.country === 'Alemanha' || p.country === 'França') road(-x - 30, z + 37, x + 45, z + 54, 8);
  } else {
    road(-x - 24, -z - 90, -x - 24, z + 75, 8);
    road(x + 22, -z - 45, x + 22, z + 75, 7);
    road(-x - 75, -z - 24, x + 55, -z - 24, 7);
    road(-x - 75, z + 32, x + 55, z + 32, 7);
  }
  // A venue's access geometry is stable and shared by its tenants. Country families
  // supply construction vocabulary; individual sites have different road setbacks,
  // branch lengths, junction widths and entrance/parking positions.
  const siteX = .88 + (p.seed % 29) / 100, siteZ = .87 + ((p.seed >>> 5) % 31) / 100;
  const spread = (value: number, half: number, scale: number) => Math.abs(value) <= half ? value * (.92 + (p.seed % 17) / 100) : Math.sign(value) * (half + (Math.abs(value) - half) * scale);
  roads.forEach((r, i) => {
    r.ax = spread(r.ax, x, siteX); r.bx = spread(r.bx, x, siteX);
    r.az = spread(r.az, z, siteZ); r.bz = spread(r.bz, z, siteZ);
    r.width += ((p.seed >>> (i + 3)) % 4) * .35;
  });
  const parking = kind === 'english-park' || kind === 'rural' ? { x: x + 9, z: 10, count: 13 } : kind === 'metropolitan' ? { x: x + 22, z: 5, count: 18 } : { x: x + 8, z: z * (.15 + (p.seed % 5) * .1), count: 4 + p.seed % 4 };
  const inStadium = (bx: number, bz: number, hw: number, hd: number) => Math.abs(bx) - hw < x + 5 && Math.abs(bz) - hd < z + 5;
  for (const [ri, r] of roads.entries()) {
    const length = Math.hypot(r.bx - r.ax, r.bz - r.az), dx = (r.bx - r.ax) / length, dz = (r.bz - r.az) / length;
    const step = kind === 'rio-neighborhood' ? 11 : kind === 'terraced-town' ? 9 : 17;
    for (let along = 13; along < length - 10; along += step) for (const side of [-1, 1]) {
      if ((kind === 'english-park' || kind === 'rural') && (ri !== 0 || side < 0 || random() < .5)) continue;
      if (kind === 'basque-valley' && ri !== 3 && side > 0) continue;
      if (kind === 'metropolitan' && random() < .45) continue;
      const width = kind === 'terraced-town' ? 6.8 : kind === 'rio-neighborhood' ? 7 + random() * 2 : 9 + random() * 5;
      const depth = kind === 'terraced-town' ? 10 : 8 + random() * 4;
      const setback = r.width / 2 + 5 + Math.max(width, depth) / 2;
      const bx = r.ax + along * dx - dz * side * setback, bz = r.az + along * dz + dx * side * setback;
      if (inStadium(bx, bz, width / 2, depth / 2)) continue;
      if (roads.some(other => roadDistance(bx, bz, other) < other.width / 2 + Math.hypot(width, depth) / 2 + 2)) continue;
      if (homes.some(b => Math.abs(b.x - bx) < (b.width + width) / 2 + 1 && Math.abs(b.z - bz) < (b.depth + depth) / 2 + 1)) continue;
      if (Math.abs(bx - parking.x) < width / 2 + 7 && Math.abs(bz - parking.z) < depth / 2 + parking.count * 2.1) continue;
      const tower = kind === 'santos-blocks' && ri === 4 || kind === 'basque-valley' || kind === 'metropolitan';
      const height = tower ? 13 + Math.floor(random() * 5) * 3 : kind === 'rio-neighborhood' ? 3.2 + Math.floor(random() * 3) * 2.7 : 4 + Math.floor(random() * 2) * 2.7;
      homes.push({ x: bx, z: bz + 52.5, width, depth, height, base: kind === 'basque-valley' && ri === 3 ? 5 : 0, roof: kind === 'terraced-town' || kind === 'english-park' || kind === 'rural' ? 'slate' : kind === 'rio-neighborhood' || tower ? 'flat' : 'tile', tint: Math.floor(random() * 5) });
    }
  }
  const green = kind === 'english-park' || kind === 'rural';
  for (let i = 0; i < (green ? 95 : kind === 'metropolitan' ? 30 : 16); i++) {
    const bx = green ? -x - 13 - random() * 95 : (random() - .5) * (x + 30) * 2;
    const bz = green ? (random() - .5) * (z + 75) * 2 : (i % 2 ? -1 : 1) * (z + (kind === 'metropolitan' ? 19 : 10)) + (random() - .5) * 6;
    if (roads.some(r => roadDistance(bx, bz, r) < r.width / 2 + 3) || homes.some(b => Math.abs(b.x - bx) < b.width / 2 + 3 && Math.abs(b.z - 52.5 - bz) < b.depth / 2 + 3)) continue;
    trees.push({ x: bx, z: bz + 52.5, scale: .75 + random() * .65, pine: green && random() > .4 });
  }
  let palette = kind === 'terraced-town' || kind === 'english-park' ? ['#ad8170', '#b69b7d', '#b48973', '#bfb7a6', '#a58b79'] : kind === 'rio-neighborhood' ? ['#d9c4a5', '#c8b8a7', '#b5c9c2', '#d6b6a0', '#b4c1cd'] : kind === 'basque-valley' ? ['#c2b1a2', '#c9c6b7', '#c7ac9c', '#b3bfbb', '#c4c5ca'] : ['#e6ddd0', '#c2b6a4', '#c9d2c9', '#dfc7ad', '#abbcca'];
  if (p.country === 'Alemanha') palette = ['#d8d3bc', '#c4bcaa', '#ded7c8', '#bca792', '#b8c1bb'];
  if (p.country === 'França') palette = ['#dbd5c5', '#d4ccbc', '#bdbbb4', '#c5c1b5', '#b1bec1'];
  if (p.country === 'Itália') palette = ['#d8bda0', '#c7a486', '#d9c99d', '#c7b69f', '#dbb6a2'];
  if (p.country === 'Espanha') palette = ['#d6c3a4', '#e1d3b7', '#c8b29d', '#d5b7a3', '#bdb7a6'];
  for (const b of homes) if (kind === 'continental') b.roof = p.country === 'França' ? 'slate' : p.country === 'Alemanha' || p.country === 'Itália' ? 'tile' : b.height > 8 ? 'flat' : 'tile';
  return { kind, roads, homes, trees, parking: { ...parking, z: parking.z + 52.5 }, entrance: kind === 'english-park' || kind === 'rural' ? { x: x + 5, z: 52.5 + z * .7 } : { x: kind === 'rio-neighborhood' || kind === 'metropolitan' ? 0 : ((p.seed % 7) - 3) * 5, z: 52.5 - z - 6 }, palette };
}
