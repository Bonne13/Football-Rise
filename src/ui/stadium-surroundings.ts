import type * as T from 'three';
import type { StadiumProfile } from '../data/stadiums.js';
declare const THREE: typeof T;
export interface GroundFootprint { halfX: number; halfZ: number }
interface Building { x: number; z: number; width: number; depth: number; height: number; pitched: boolean; tint: number }
/** A street-based district, leaving the stadium, its concourse and service access clear. */
export function surroundingLayout(profile: StadiumProfile, footprint: GroundFootprint): Building[] {
  let seed = profile.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const homes: Building[] = [];
  const dense = profile.landscape !== 'rural';
  for (let side = 0; side < 4; side++) for (let row = 0; row < (dense ? 3 : 2); row++) for (let lot = -5; lot <= 5; lot++) {
    if (random() < (dense ? .16 : .5)) continue;
    const width = 8 + random() * 4, depth = 8 + random() * 4;
    const apartment = dense && row > 0 && random() > .55;
    const height = apartment ? 9 + Math.floor(random() * 4) * 3 : 3.6 + Math.floor(random() * 2) * 3;
    const along = lot * 17 + (random() - .5) * 3;
    const outward = (side < 2 ? footprint.halfZ : footprint.halfX) + 37 + row * 34;
    // Rows occupy road blocks, not a ring of disconnected towers.
    homes.push({ x: side < 2 ? along : (side === 2 ? -outward : outward), z: 52.5 + (side < 2 ? (side === 0 ? -outward : outward) : along), width, depth, height, pitched: !apartment, tint: Math.floor(random() * 5) });
  }
  return homes.filter(b => {
    const acrossRoad = (position: number, half: number, extent: number) => [19, 53, 87].some(offset => Math.abs(Math.abs(position) - half - offset) < extent / 2 + 8);
    return !acrossRoad(b.x, footprint.halfX, b.width) && !acrossRoad(b.z - 52.5, footprint.halfZ, b.depth);
  });
}
export function buildSurroundings(scene: T.Scene, profile: StadiumProfile, footprint: GroundFootprint) {
  const materials = new Map<string, T.MeshStandardMaterial>();
  const mat = (color: string) => { let m = materials.get(color); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: .88 }); materials.set(color, m); } return m; };
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string | T.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color); mesh.position.set(x, y, z); mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  const pavement = '#a7a99f', asphalt = '#53585b', line = '#dddcc5';
  // Four connected streets, sidewalks and zebra crossings around a pedestrian apron.
  const roadX = footprint.halfX + 19, roadZ = footprint.halfZ + 19;
  for (const sign of [-1, 1]) {
    const z = 52.5 + sign * roadZ, x = sign * roadX;
    box(roadX * 2 + 70, .12, 11, 0, .005, z, asphalt);
    box(11, .12, roadZ * 2 + 70, x, .006, 52.5, asphalt);
    for (const edge of [-1, 1]) {
      box(roadX * 2 + 70, .2, 2.3, 0, .09, z + edge * 6.7, pavement);
      box(2.3, .2, roadZ * 2 + 70, x + edge * 6.7, .09, 52.5, pavement);
    }
    for (let pos = -roadX; pos <= roadX; pos += 12) box(4, .015, .16, pos, .075, z, line);
    for (let pos = -roadZ; pos <= roadZ; pos += 12) box(.16, .015, 4, x, .076, 52.5 + pos, line);
    for (let stripe = -3; stripe <= 3; stripe++) { box(.7, .018, 8, stripe * 1.3, .08, z, line); box(8, .018, .7, x, .08, 52.5 + stripe * 1.3, line); }
    // Secondary roads between the rows of homes give the district depth.
    for (const shift of [34, 68]) {
      box(255, .1, 7, 0, .005, z + sign * shift, asphalt);
      box(7, .1, 255, x + sign * shift, .005, 52.5, asphalt);
    }
  }
  // Paved entrance square, gates, ticket booths and service-side parking.
  const frontZ = 52.5 - footprint.halfZ - 5;
  box(29, .15, 14, 0, .04, frontZ, '#acae9e');
  for (const x of [-11, 11]) {
    box(3.6, 2.6, 3, x, 1.3, frontZ, '#c5c1ac'); box(4.1, .2, 3.5, x, 2.7, frontZ, '#455c62');
    box(2.3, .9, .05, x, 1.6, frontZ + 1.53, '#3b5961');
  }
  for (const x of [-5, 5]) box(.15, 3.3, .15, x, 1.65, frontZ, '#465859');
  box(10.2, .7, .25, 0, 3.25, frontZ, '#39535a');
  for (const x of [-4, -2, 0, 2, 4]) box(.06, 1.2, 1.6, x, .6, frontZ, '#829798');
  const parkingX = footprint.halfX + 7, parkingZ = 52.5 + footprint.halfZ * .3;
  box(11, .08, 39, parkingX, .015, parkingZ, '#777c78');
  for (let i = 0; i < 10; i++) box(4.5, .015, .08, parkingX - 2, .065, parkingZ - 18 + i * 3.8, line);
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
  for (let i = 0; i < 8; i++) car(parkingX - 1, parkingZ - 16 + i * 4.2, ['#a9b4b5', '#344e64', '#ae5748', '#d6d3bf'][i % 4]!, true);
  for (let i = 0; i < 8; i++) car(-65 + i * 18, 52.5 - roadZ + 3, ['#e1dbcd', '#566b78', '#935b4f'][i % 3]!, true);
  // Windows are original procedural textures, reused on the district's facades.
  const wall = document.createElement('canvas'); wall.width = wall.height = 128;
  const c = wall.getContext('2d')!; c.fillStyle = '#d9d5c9'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#a7a597'; for (let y = 0; y < 128; y += 16) c.fillRect(0, y, 128, 1);
  for (const x of [20, 77]) for (const y of [18, 76]) {
    c.fillStyle = '#ede9dc'; c.fillRect(x - 3, y - 3, 33, 38); c.fillStyle = '#45616b'; c.fillRect(x, y, 27, 32);
    c.fillStyle = '#8da7ad'; c.fillRect(x + 3, y + 3, 8, 25); c.fillStyle = '#d0d2c7'; c.fillRect(x + 12, y, 2, 32); c.fillRect(x, y + 15, 27, 2);
  }
  const tex = new THREE.CanvasTexture(wall); tex.colorSpace = THREE.SRGBColorSpace;
  const palette = ['#e6ddd0', '#c2b6a4', '#c9d2c9', '#dfc7ad', '#abbcca'];
  const facades = palette.map(color => new THREE.MeshStandardMaterial({ color, map: tex, roughness: .88 }));
  const roofs = ['#9c6550', '#6a7170', '#8d7763'];
  for (const b of surroundingLayout(profile, footprint)) {
    box(b.width, b.height, b.depth, b.x, b.height / 2, b.z, facades[b.tint]!);
    if (b.pitched) {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), mat(roofs[b.tint % 3]!));
      roof.rotation.y = Math.PI / 4; roof.scale.set(b.width * .78, 2, b.depth * .78); roof.position.set(b.x, b.height + 1, b.z); scene.add(roof);
      box(.35, 2, .4, b.x + b.width * .2, b.height + 1.5, b.z, '#8c8074');
    } else {
      box(b.width + .3, .25, b.depth + .3, b.x, b.height + .1, b.z, '#717d7e');
      box(2.2, .8, 1.3, b.x + 1, b.height + .6, b.z, '#a0aaa8');
      for (let floor = 1; floor * 3 < b.height; floor++) box(b.width * .75, .17, 1, b.x, floor * 3, b.z + b.depth / 2 + .35, '#939b97');
    }
  }
  // Human-scale street furniture is visible through the open stands.
  const treeGeo = new THREE.SphereGeometry(1, 8, 6), treeMat = mat('#3e6650');
  for (let i = -4; i <= 4; i++) for (const sign of [-1, 1]) {
    const x = i * 22, z = 52.5 + sign * (roadZ - 8);
    box(.16, 6, .16, x + 4, 3, z, '#606c6a'); box(1.4, .18, .55, x + 4.5, 6, z, '#d0d0b4');
    box(.3, 3.2, .3, x - 3, 1.6, z, '#77634d');
    const tree = new THREE.Mesh(treeGeo, treeMat); tree.scale.set(2.1, 2.9, 2.1); tree.position.set(x - 3, 4.6, z); scene.add(tree);
    if (i % 2 === 0) { box(2.3, .18, .65, x, .65, z, '#88755a'); for (const sx of [-.8, .8]) box(.15, .65, .5, x + sx, .33, z, '#465458'); }
  }
}
