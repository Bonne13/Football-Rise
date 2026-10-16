import type * as T from 'three';
import type { StadiumProfile } from '../data/stadiums.js';
declare const THREE: typeof T;
import { districtPlan, type Footprint } from '../data/stadium-districts.js';
export type GroundFootprint = Footprint;
export const surroundingLayout = (profile: StadiumProfile, footprint: Footprint) => districtPlan(profile, footprint).homes;
export function buildSurroundings(scene: T.Scene, profile: StadiumProfile, footprint: GroundFootprint) {
  const materials = new Map<string, T.MeshStandardMaterial>();
  const mat = (color: string) => { let m = materials.get(color); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: .88 }); materials.set(color, m); } return m; };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string | T.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color); mesh.position.set(x, y, z); mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  const pavement = '#a7a99f', asphalt = '#53585b', line = '#dddcc5';
  const plan = districtPlan(profile, footprint);
  for (const r of plan.roads) {
    const dx = r.bx - r.ax, dz = r.bz - r.az, length = Math.hypot(dx, dz), angle = -Math.atan2(dz, dx);
    const segment = (width: number, height: number, depth: number, offset: number, color: string, y: number) => {
      const m = box(width, height, depth, (r.ax + r.bx) / 2 - dz / length * offset, y, 52.5 + (r.az + r.bz) / 2 + dx / length * offset, color); m.rotation.y = angle;
    };
    segment(length, .12, r.width, 0, asphalt, .005);
    for (const side of [-1, 1]) segment(length, .2, 1.7, side * (r.width / 2 + 1), pavement, .09);
    for (let along = 8; along < length; along += 13) {
      const mark = box(4, .015, .13, r.ax + dx / length * along, .075, 52.5 + r.az + dz / length * along, line); mark.rotation.y = angle;
    }
  }
  // Paved entrance square, gates, ticket booths and service-side parking.
  const frontZ = plan.entrance.z, entryX = plan.entrance.x;
  box(29, .15, 14, entryX, .04, frontZ, '#acae9e');
  for (const x of [-11, 11]) {
    box(3.6, 2.6, 3, entryX + x, 1.3, frontZ, '#c5c1ac'); box(4.1, .2, 3.5, entryX + x, 2.7, frontZ, '#455c62');
    box(2.3, .9, .05, entryX + x, 1.6, frontZ + 1.53, '#3b5961');
  }
  for (const x of [-5, 5]) box(.15, 3.3, .15, entryX + x, 1.65, frontZ, '#465859');
  box(10.2, .7, .25, entryX, 3.25, frontZ, '#39535a');
  for (const x of [-4, -2, 0, 2, 4]) box(.06, 1.2, 1.6, entryX + x, .6, frontZ, '#829798');
  const parkingX = plan.parking.x, parkingZ = plan.parking.z, parkingLength = plan.parking.count * 4.2 + 4;
  box(11, .08, parkingLength, parkingX, .015, parkingZ, '#777c78');
  for (let i = 0; i <= plan.parking.count; i++) box(4.5, .015, .08, parkingX - 2, .065, parkingZ - parkingLength / 2 + 2 + i * 4.2, line);
  // Cars have separate cabins, windscreens and wheels, not featureless cuboids.
  const car = (x: number, z: number, color: string, rotate = false) => {
    const group = new THREE.Group();
    const part = (w: number, h: number, d: number, px: number, py: number, pz: number, color: string) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(px, py, pz); group.add(m);
    };
    part(1.8, .65, 3.8, 0, .6, 0, color); part(1.55, .62, 2, 0, 1.15, -.1, '#506976'); part(1.6, .1, 1.5, 0, 1.5, -.1, color);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) part(.22, .5, .65, sx * .86, .37, sz * 1.15, '#222b30');
    part(1.45, .12, .06, 0, .7, 1.92, '#e7d8ac'); part(1.45, .12, .06, 0, .7, -1.92, '#a35148');
    group.position.set(x, 0, z); group.rotation.y = rotate ? Math.PI / 2 : 0;
    // Flatten transforms so the stadium's static batching can combine these boxes.
    group.updateMatrixWorld(true);
    for (const child of [...group.children]) { child.applyMatrix4(group.matrixWorld); scene.add(child); }
  };
  for (let i = 0; i < plan.parking.count; i++) car(parkingX - 1, parkingZ - parkingLength / 2 + 4 + i * 4.2, ['#a9b4b5', '#344e64', '#ae5748', '#d6d3bf'][i % 4]!, true);
  // Windows are original procedural textures, reused on the district's facades.
  const wall = document.createElement('canvas'); wall.width = wall.height = 128;
  const c = wall.getContext('2d')!; c.fillStyle = '#d9d5c9'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#a7a597'; for (let y = 0; y < 128; y += 16) c.fillRect(0, y, 128, 1);
  for (const x of [20, 77]) for (const y of [18, 76]) {
    c.fillStyle = '#ede9dc'; c.fillRect(x - 3, y - 3, 33, 38); c.fillStyle = '#45616b'; c.fillRect(x, y, 27, 32);
    c.fillStyle = '#8da7ad'; c.fillRect(x + 3, y + 3, 8, 25); c.fillStyle = '#d0d2c7'; c.fillRect(x + 12, y, 2, 32); c.fillRect(x, y + 15, 27, 2);
  }
  const tex = new THREE.CanvasTexture(wall); tex.colorSpace = THREE.SRGBColorSpace;
  const palette = plan.palette;
  const facades = palette.map(color => new THREE.MeshStandardMaterial({ color, map: tex, roughness: .88 }));
  const roofs = ['#9c6550', '#6a7170', '#8d7763'];
  for (const b of plan.homes) {
    if (b.base) box(b.width + 1, b.base, b.depth + 1, b.x, b.base / 2, b.z, '#92958a');
    box(b.width, b.height, b.depth, b.x, b.base + b.height / 2, b.z, facades[b.tint]!);
    if (['França', 'Itália', 'Espanha'].includes(profile.country)) for (const side of [-1, 1]) box(.5, 1.5, .08, b.x + side * b.width * .3, b.base + 2, b.z - b.depth / 2 - .08, profile.country === 'França' ? '#536d7a' : '#626a50');
    if (b.roof !== 'flat') {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), mat(b.roof === 'slate' ? '#59616b' : roofs[b.tint % 3]!));
      roof.rotation.y = Math.PI / 4; roof.scale.set(b.width * .78, 2, b.depth * .78); roof.position.set(b.x, b.base + b.height + 1, b.z); scene.add(roof);
      box(.35, 2, .4, b.x + b.width * .2, b.base + b.height + 1.5, b.z, '#8c8074');
    } else {
      box(b.width + .3, .25, b.depth + .3, b.x, b.base + b.height + .1, b.z, '#717d7e');
      box(2.2, .8, 1.3, b.x + 1, b.base + b.height + .6, b.z, '#a0aaa8');
      for (let floor = 1; floor * 3 < b.height; floor++) box(b.width * .75, .17, 1, b.x, b.base + floor * 3, b.z + b.depth / 2 + .35, '#939b97');
    }
  }
  const treeGeo = new THREE.SphereGeometry(1, 8, 6), pineGeo = new THREE.ConeGeometry(1, 1, 7), treeMat = mat('#3e6650');
  for (const t of plan.trees) {
    if ((plan.kind === 'english-park' || plan.kind === 'rural') && Math.abs(t.x + footprint.halfX + 61) < 27 && Math.abs(t.z - 52.5) < 38) continue;
    box(.3, 3 * t.scale, .3, t.x, 1.5 * t.scale, t.z, '#77634d');
    const tree = new THREE.Mesh(t.pine ? pineGeo : treeGeo, treeMat); tree.scale.set(2.2 * t.scale, (t.pine ? 7 : 3) * t.scale, 2.2 * t.scale); tree.position.set(t.x, (t.pine ? 5 : 4.5) * t.scale, t.z); scene.add(tree);
  }
  for (const r of plan.roads) {
    const dx = r.bx - r.ax, dz = r.bz - r.az, length = Math.hypot(dx, dz);
    for (let along = 18; along < length; along += plan.kind === 'metropolitan' ? 24 : 38) {
      const x = r.ax + dx / length * along - dz / length * (r.width / 2 + 2), z = 52.5 + r.az + dz / length * along + dx / length * (r.width / 2 + 2);
      box(.15, 6, .15, x, 3, z, '#606c6a'); box(1.3, .18, .55, x, 6, z, '#c9cbb3');
    }
  }
  if (plan.kind === 'english-park' || plan.kind === 'rural') {
    const x = -footprint.halfX - 61;
    box(49, .06, 73, x, .01, 52.5, '#4b8152');
    for (const dx of [-22, 22]) box(.12, .04, 65, x + dx, .06, 52.5, '#d0dcc4');
    for (const dz of [-32.5, 0, 32.5]) box(44, .04, .12, x, .06, 52.5 + dz, '#d0dcc4');
    for (const dz of [-33, 33]) { box(7, .13, .13, x, 2.2, 52.5 + dz, '#d9e0d3'); for (const dx of [-3.5, 3.5]) box(.12, 2.2, .12, x + dx, 1.1, 52.5 + dz, '#d9e0d3'); }
    box(12, 3, 6, footprint.halfX + 45, 1.5, 52.5 + footprint.halfZ + 12, '#a88c70');
  } else if (plan.kind === 'rio-neighborhood') {
    const z = frontZ - 3;
    box(29, 3.5, .8, 0, 1.75, z, '#dfd3b9');
    for (const x of [-9, 9]) { box(3, 6, 2.5, x, 3, z, '#d5c6a9'); box(3.4, .3, 2.9, x, 6.1, z, '#b66b50'); }
    for (const x of [-4, 4]) { box(3, 2.7, .9, x, 1.35, z - .1, '#45575a'); const arch = new THREE.Mesh(new THREE.TorusGeometry(1.55, .24, 5, 20, Math.PI), mat('#eee2c4')); arch.position.set(x, 2.7, z - .6); scene.add(arch); }
    // Water tanks and small workshops distinguish the compact Brazilian district.
    for (const b of plan.homes.filter((_, i) => i % 5 === 0)) box(1.5, 1.1, 1.5, b.x, b.height + 1, b.z, '#587e96');
  } else if (plan.kind === 'santos-blocks') {
    for (const b of plan.homes.filter(b => b.height > 12)) for (let floor = 1; floor * 3 < b.height; floor++) box(.8, .14, b.depth * .9, b.x + b.width / 2 + .3, floor * 3, b.z, '#c7c9bd');
    // A narrow cafe strip replaces a monumental forecourt in this residential setting.
    for (const x of [-18, 18]) { box(6, 3, 4, x, 1.5, frontZ - 4, '#ccb695'); box(7, .18, 2.5, x, 2.8, frontZ - 1, '#417c79'); }
  } else if (plan.kind === 'basque-valley') {
    box(1.3, 5, footprint.halfZ * 2 + 35, -footprint.halfX - 47, 2.5, 52.5, '#90958a');
    for (let step = 0; step < 12; step++) box(5, .25 + step * .35, 1.2, -footprint.halfX - 43, (.25 + step * .35) / 2, 36 + step * 1.2, '#b1b0a2');
  } else if (plan.kind === 'metropolitan') {
    box(78, .16, 21, 0, .06, frontZ - 8, '#bbbcb2');
    for (let i = -4; i <= 4; i++) box(.7, 2, .7, i * 7, 1, frontZ - 14, '#6b7e81');
    const railZ = 52.5 + footprint.halfZ + 93;
    box(270, .25, 9, 0, .1, railZ, '#858b88');
    for (const dz of [-2, 2]) box(270, .14, .15, 0, .3, railZ + dz, '#a5afad');
    for (let x = -125; x <= 125; x += 3) box(.3, .1, 5, x, .23, railZ, '#655f52');
    box(35, 1.1, 4, 20, .8, railZ + 7, '#bfc4ba'); box(36, .25, 6, 20, 4, railZ + 7, '#496d75');
    for (const x of [5, 20, 35]) box(.15, 3, .15, x, 2.5, railZ + 7, '#6a797a');
  }
}
