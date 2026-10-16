import type * as T from 'three';
import { buildSurroundings } from './stadium-surroundings.js';
import type { StadiumProfile } from '../data/stadiums.js';
declare const THREE: typeof T;
/** Batch static boxes without changing their transforms, reducing draw calls on phones. */
function consolidateBoxes(parent: T.Object3D) {
  const groups = new Map<T.Material, T.Mesh<T.BoxGeometry, T.Material>[]>();
  for (const child of [...parent.children]) if (child instanceof THREE.Mesh && !(child instanceof THREE.InstancedMesh) && child.geometry instanceof THREE.BoxGeometry && !Array.isArray(child.material)) { const list = groups.get(child.material) ?? []; list.push(child as T.Mesh<T.BoxGeometry, T.Material>); groups.set(child.material, list); }
  for (const [material, meshes] of groups) {
    if (meshes.length < 2) continue;
    const batch = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, meshes.length);
    meshes.forEach((mesh, i) => { mesh.updateMatrix(); const p = mesh.geometry.parameters; batch.setMatrixAt(i, mesh.matrix.clone().scale(new THREE.Vector3(p.width, p.height, p.depth))); batch.castShadow ||= mesh.castShadow; batch.receiveShadow ||= mesh.receiveShadow; parent.remove(mesh); mesh.geometry.dispose(); });
    batch.instanceMatrix.needsUpdate = true; parent.add(batch);
  }
}
/** Procedural four-sided stadium and scenery; independent of the football rules. */
export function buildStadium(scene: T.Scene, profile: StadiumProfile, colors: { primary: string; secondary: string }, occupancy = 0) {
  const crowds: T.InstancedMesh[] = [];
  const seatColors = profile.seatColors ?? [colors.primary, colors.secondary];
  let seed = profile.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .88 });
  const concrete = material('#657477'), dark = material('#263641'), pale = material('#b9c5c5');
  const panel = material('#4b626e'), clubTrim = material(colors.primary);
  const box = (parent: T.Object3D, size: [number, number, number], position: [number, number, number], mat: T.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.position.set(...position); parent.add(mesh); return mesh;
  };
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(2500, 2500), material(profile.country === 'Brasil' ? '#4f744a' : '#637b52')); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -.08, 52.5); grass.receiveShadow = true; scene.add(grass);
  const rows = Math.max(3, Math.min(19, Math.round(Math.sqrt(profile.capacity / 250))));
  const oval = profile.shape === 'oval';
  const sideX = oval ? (profile.track ? 57 : 49) : 42, endZ = oval ? (profile.track ? 37.5 : 23.5) : 8;
  if (profile.track) {
    const trackMaterial = material('#a65846');
    const track = new THREE.Mesh(new THREE.RingGeometry(48, 55, 96), trackMaterial); track.rotation.x = -Math.PI / 2; track.scale.y = 76 / 48; track.position.set(0, -.015, 52.5); scene.add(track);
    for (let lane = 1; lane < 8; lane++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(48 + lane * .85, 48.04 + lane * .85, 96), pale); ring.rotation.x = -Math.PI / 2; ring.scale.y = 76 / 48; ring.position.set(0, -.01, 52.5); scene.add(ring);
    }
  }
  const sides = [{ x: 0, z: -endZ, rotation: 0, length: oval ? 94 : 70 }, { x: 0, z: 105 + endZ, rotation: Math.PI, length: oval ? 94 : 70 }, { x: -sideX, z: 52.5, rotation: Math.PI / 2, length: 110 }, { x: sideX, z: 52.5, rotation: -Math.PI / 2, length: 110 }];
  const seatGeo = new THREE.BoxGeometry(.5, .36, .5), seatMat = material('#ffffff');
  for (const [sideIndex, side] of (oval ? [] : sides).entries()) {
    const stand = new THREE.Group(); stand.name = `stand-${sideIndex}`; stand.position.set(side.x, 0, side.z); stand.rotation.y = side.rotation;
    const seatsPerRow = Math.floor(side.length / .72), chairs = new THREE.InstancedMesh(seatGeo, seatMat, rows * seatsPerRow);
    for (let row = 0; row < rows; row++) {
      const height = .55 + row * .56, depth = -row * 1.05;
      const terrace = new THREE.Mesh(new THREE.BoxGeometry(side.length, height, 1.08), concrete); terrace.position.set(0, height / 2, depth); terrace.receiveShadow = true; stand.add(terrace);
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const i = row * seatsPerRow + seat;
        chairs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-side.length / 2 + .5 + seat * .72, height + .2, depth));
        chairs.setColorAt(i, new THREE.Color((seat + row * 2) % 11 < 3 ? seatColors[1] : seatColors[0]));
      }
    }
    chairs.instanceMatrix.needsUpdate = true; stand.add(chairs);
    const top = .55 + rows * .56;
    // Access stairs cut visual aisles through the seats; back panels give the stand a facade.
    for (const aisle of [-side.length / 3, 0, side.length / 3]) {
      for (let row = 0; row < rows; row++) box(stand, [1.1, .09, 1], [aisle, .61 + row * .56, -row * 1.05], pale);
      const rail = box(stand, [.045, .65, rows * 1.2], [aisle + .6, top / 2 + .7, -rows * .5], dark); rail.rotation.x = -.48;
    }
    if (profile.size !== 'local') {
      box(stand, [side.length, top + 1.5, .28], [0, (top + 1.5) / 2, -rows * 1.05 - .5], panel);
      box(stand, [side.length, .65, .34], [0, top + 1.15, -rows * 1.05 - .3], clubTrim);
      for (let x = -side.length / 2 + 3; x < side.length / 2; x += 7) {
        box(stand, [2.8, 2.1, .32], [x, 1.05, -rows * 1.05 - .7], dark);
        box(stand, [3.4, .12, 1.4], [x, 2.3, -rows * 1.05 - 1.1], pale);
      }
    }
    // Continuous arenas, partial traditional roofs and uncovered terraces differ visibly.
    if (profile.roof === 'full' || profile.roof === 'partial' && sideIndex === 2) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(side.length + 2, .22, rows * .8 + 3), pale); roof.position.set(0, top + 2.5, -rows * .55); roof.rotation.x = -.035; roof.castShadow = true; stand.add(roof);
      const roofDepth = rows * .8 + 3;
      box(stand, [side.length + 2, .5, .22], [0, top + 2.4, -rows * .55 + roofDepth / 2], clubTrim);
      for (let x = -side.length / 2; x <= side.length / 2; x += 5) {
        const rib = box(stand, [.09, .12, roofDepth], [x, top + 2.65, -rows * .55], dark); rib.rotation.x = -.035;
      }
      for (let x = -side.length / 2; x <= side.length / 2; x += side.length / 5) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, top + 3, 6), dark); post.position.set(x, (top + 3) / 2, -rows * 1.05); stand.add(post); }
    }
    // Tier fascias and vomitories break up the terraces; unique venue seed controls accents.
    for (let tier = 1; tier < profile.tiers; tier++) {
      const row = Math.floor(rows * tier / profile.tiers);
      box(stand, [side.length, .38, .3], [0, .8 + row * .56, -row * 1.05 + .5], clubTrim);
      for (const x of [-side.length / 4, side.length / 4]) box(stand, [2.4, 1.5, .7], [x, .55 + row * .56, -row * 1.05], dark);
    }
    if (profile.facade !== 'concrete') {
      const skin = profile.facade === 'glass' ? material('#73979e') : pale;
      const outside = -rows * 1.05 - 1.2;
      for (let x = -side.length / 2; x < side.length / 2; x += 3) {
        box(stand, [2.75, top + 2, .2], [x + 1.4, (top + 2) / 2, outside], skin);
        box(stand, [.12, top + 2.2, .38], [x, (top + 2.2) / 2, outside - .15], dark);
      }
      if (profile.facade === 'ribs') for (let y = 1; y < top + 2.5; y += .65) box(stand, [side.length, .16, .55], [0, y, outside - .4], pale);
    }
    const fence = new THREE.Mesh(new THREE.BoxGeometry(side.length, profile.size === 'local' ? 1.15 : 1.8, .15), dark); fence.position.set(0, profile.size === 'local' ? .6 : .9, 2); stand.add(fence);
    // Lightweight instanced spectators in the match arenas, leaving clear access aisles.
    if (occupancy > 0) {
      const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .24, 2, 5), material('#ffffff'), rows * seatsPerRow);
      crowd.name = 'spectator-crowd';
      let people = 0;
      for (let row = 0; row < rows; row++) for (let seat = 0; seat < seatsPerRow; seat++) {
        const x = -side.length / 2 + .5 + seat * .72;
        if (Math.abs(x) < 1 || Math.abs(Math.abs(x) - side.length / 3) < 1 || random() > occupancy) continue;
        crowd.setMatrixAt(people, new THREE.Matrix4().makeTranslation(x, 1.08 + row * .56, -row * 1.05));
        crowd.setColorAt(people, new THREE.Color([colors.primary, colors.secondary, '#bd967b', '#253747', '#e2dacb'][people % 5])); people++;
      }
      crowd.count = people; crowd.instanceMatrix.needsUpdate = true; stand.add(crowd); crowds.push(crowd);
    }
    consolidateBoxes(stand); scene.add(stand);
  }
  if (profile.size === 'arena' && profile.shape === 'bowl') {
    const top = .55 + rows * .56;
    const corners = [{ x: 34, z: 0, angle: 0 }, { x: -34, z: 0, angle: Math.PI / 2 }, { x: -34, z: 105, angle: Math.PI }, { x: 34, z: 105, angle: Math.PI * 1.5 }];
    for (const corner of corners) {
      const count = rows * 14, seats = new THREE.InstancedMesh(seatGeo, seatMat, count); let index = 0;
      const supporters = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .24, 2, 5), material('#ffffff'), count); let people = 0;
      for (let row = 0; row < rows; row++) {
        const radius = 8 + row * 1.05, height = .55 + row * .56;
        const step = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 1.05, 20, 1, corner.angle, Math.PI / 2), concrete); step.rotation.x = -Math.PI / 2; step.position.set(corner.x, height, corner.z); scene.add(step);
        for (let seat = 0; seat < 14; seat++) { const angle = corner.angle + (seat + .5) / 14 * Math.PI / 2; seats.setMatrixAt(index, new THREE.Matrix4().makeTranslation(corner.x + Math.cos(angle) * radius, height + .2, corner.z - Math.sin(angle) * radius)); seats.setColorAt(index, new THREE.Color(seat % 5 ? seatColors[0] : seatColors[1])); if (random() < occupancy) { supporters.setMatrixAt(people, new THREE.Matrix4().makeTranslation(corner.x + Math.cos(angle) * radius, height + .55, corner.z - Math.sin(angle) * radius)); supporters.setColorAt(people, new THREE.Color(people % 3 ? colors.primary : colors.secondary)); people++; } index++; }
      }
      const roof = new THREE.Mesh(new THREE.RingGeometry(7.8, 23, 28, 1, corner.angle, Math.PI / 2), pale); roof.rotation.x = -Math.PI / 2; roof.position.set(corner.x, top + 2.5, corner.z); roof.material.side = THREE.DoubleSide; roof.castShadow = true; scene.add(roof);
      seats.instanceMatrix.needsUpdate = true; scene.add(seats); supporters.count = people; supporters.instanceMatrix.needsUpdate = true; scene.add(supporters); crowds.push(supporters);
      for (let i = 0; i < 3; i++) { const angle = corner.angle + i / 2 * Math.PI / 2; box(scene, [.15, top + 2.5, .15], [corner.x + Math.cos(angle) * 22, (top + 2.5) / 2, corner.z - Math.sin(angle) * 22], dark); }
    }
  }
  if (oval) {
    const innerX = sideX, innerZ = 52.5 + endZ;
    const ellipse = (rx: number, rz: number, ix: number, iz: number, mat: T.Material, height: number) => {
      const shape = new THREE.Shape(); shape.absellipse(0, 0, rx, rz, 0, Math.PI * 2, false, 0);
      const hole = new THREE.Path(); hole.absellipse(0, 0, ix, iz, 0, Math.PI * 2, true, 0); shape.holes.push(hole);
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 80), mat); mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, height, 52.5); mesh.receiveShadow = true; scene.add(mesh); return mesh;
    };
    const seatsPerRow = 340, chairs = new THREE.InstancedMesh(seatGeo, seatMat, rows * seatsPerRow);
    const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .24, 2, 5), material('#ffffff'), rows * seatsPerRow); let people = 0;
    for (let row = 0; row < rows; row++) {
      const rx = innerX + row * 1.05, rz = innerZ + row * 1.05, height = .55 + row * .56;
      ellipse(rx + 1.05, rz + 1.05, rx, rz, concrete, height);
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .56, 96, 1, true), concrete); riser.scale.set(rx, 1, rz); riser.position.set(0, height - .28, 52.5); scene.add(riser);
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const angle = seat / seatsPerRow * Math.PI * 2, x = Math.cos(angle) * (rx + .5), z = 52.5 + Math.sin(angle) * (rz + .5);
        const transform = new THREE.Object3D(); transform.position.set(x, height + .2, z); transform.rotation.y = -angle; transform.updateMatrix();
        const index = row * seatsPerRow + seat; chairs.setMatrixAt(index, transform.matrix); chairs.setColorAt(index, new THREE.Color(seat % 32 < 8 ? seatColors[1] : seatColors[0]));
        if (seat % 28 < 2) continue;
        if (random() < occupancy) { crowd.setMatrixAt(people, new THREE.Matrix4().makeTranslation(x, height + .55, z)); crowd.setColorAt(people, new THREE.Color([colors.primary, colors.secondary, '#bd967b', '#253747'][people % 4])); people++; }
      }
      if (row > 0 && row % Math.max(1, Math.floor(rows / profile.tiers)) === 0) ellipse(rx + 1, rz + 1, rx + .65, rz + .65, clubTrim, height + .4);
    }
    chairs.instanceMatrix.needsUpdate = true; scene.add(chairs); crowd.count = people; crowd.instanceMatrix.needsUpdate = true; scene.add(crowd); crowds.push(crowd);
    const outerX = innerX + rows * 1.05, outerZ = innerZ + rows * 1.05;
    const facade = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, rows * .56 + 1, 96, 1, true), new THREE.MeshStandardMaterial({ color: '#a1aba8', roughness: .8, side: THREE.DoubleSide }));
    facade.scale.set(outerX + 2, 1, outerZ + 2); facade.position.set(0, rows * .28, 52.5); scene.add(facade);
    if (profile.roof === 'full') {
      const canopy = ellipse(outerX + 3, outerZ + 3, innerX - 1.5, innerZ - 1.5, new THREE.MeshStandardMaterial({ color: '#d8dedb', side: THREE.DoubleSide, roughness: .7 }), rows * .56 + 3.1); canopy.castShadow = true;
      for (let i = 0; i < 48; i++) { const angle = i / 48 * Math.PI * 2; const beam = box(scene, [.1, .15, rows * 1.05 + 3], [Math.cos(angle) * (outerX + innerX) / 2, rows * .56 + 3.25, 52.5 + Math.sin(angle) * (outerZ + innerZ) / 2], dark); beam.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle)); }
    }
  }
  if (profile.name === 'San Siro') {
    const towerMaterial = material('#9a9b95'), red = material('#a43330');
    for (const x of [-42, 42]) for (const z of [-9, 114]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 16, 16), towerMaterial); tower.position.set(x, 8, z); scene.add(tower);
      for (let level = 0; level < 8; level++) { const ramp = new THREE.Mesh(new THREE.TorusGeometry(3.4, .17, 4, 24), pale); ramp.rotation.x = Math.PI / 2; ramp.position.set(x, 1 + level * 2, z); scene.add(ramp); }
    }
    for (const z of [-10, 115]) box(scene, [92, .7, 1.1], [0, 16.5, z], red);
  }
  for (const x of [-37, 37]) for (const z of [-3, 108]) {
    const height = profile.size === 'arena' ? 24 : 14;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.11, .18, height, 8), pale); pole.position.set(x, height / 2, z); scene.add(pole);
    const lamps = new THREE.Mesh(new THREE.BoxGeometry(profile.size === 'arena' ? 4 : 2.2, .9, .3), new THREE.MeshStandardMaterial({ color: '#f4ffff', emissive: '#bfd6df', emissiveIntensity: .7 })); lamps.position.set(x, height - .5, z); scene.add(lamps);
  }
  // Dugouts, technical areas, scoreboards and access buildings make the ground feel inhabited.
  for (const z of [39, 66]) {
    const shelter = box(scene, [2.8, 2, 9], [-37.5, 1, z], panel);
    box(scene, [3.1, .16, 9.4], [-37.5, 2.1, z], pale);
    for (let i = 0; i < 7; i++) box(scene, [.55, .7, .5], [-37.8, .55, z - 3 + i], clubTrim);
  }
  const screenCanvas = document.createElement('canvas'); screenCanvas.width = 512; screenCanvas.height = 192;
  const screenContext = screenCanvas.getContext('2d')!;
  screenContext.fillStyle = '#091722'; screenContext.fillRect(0, 0, 512, 192);
  screenContext.fillStyle = '#bce9cf'; screenContext.font = 'bold 32px sans-serif'; screenContext.textAlign = 'center'; screenContext.fillText('FOOTBALL RISE', 256, 51);
  screenContext.fillStyle = '#f5faf9'; screenContext.font = 'bold 45px sans-serif'; screenContext.font = 'bold 27px sans-serif'; screenContext.fillText(profile.name, 256, 130, 480);
  const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture });
  const scoreboard = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), screenMaterial); scoreboard.position.set(0, rows * .56 + 5.1, -rows * 1.05 - 10); scene.add(scoreboard);
  for (const x of [-3.8, 3.8]) box(scene, [.18, 5, .2], [x, rows * .56 + 2.6, -rows * 1.05 - 10.1], dark);
  const footprint = { halfX: sideX + rows * 1.05 + 4, halfZ: 52.5 + endZ + rows * 1.05 + 4 };
  buildSurroundings(scene, profile, footprint);
  // Coast is a distant landscape, not a beach forced against every coastal club's stands.
  if (profile.landscape === 'coastal') {
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000), new THREE.MeshStandardMaterial({ color: '#287f96', roughness: .38, metalness: .12 })); ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -.055, -920); scene.add(ocean);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(1400, 16), material('#cdbd96')); sand.rotation.x = -Math.PI / 2; sand.position.set(0, -.05, -416); scene.add(sand);
  }
  if (profile.landscape === 'mountains' || profile.landscape === 'rural') {
    const terrain = new THREE.PlaneGeometry(1000, 1000, 64, 64), positions = terrain.getAttribute('position'); const vertexColors: number[] = [];
    const amplitude = profile.landscape === 'mountains' ? 90 : 24;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), distance = Math.hypot(x, y * .8), gain = Math.max(0, Math.min(1, (distance - 320) / 180));
      const h = Math.max(0, Math.sin(x * .016 + profile.seed % 31) * .55 + Math.cos(y * .023) * .35 + Math.sin((x + y) * .01) * .25 + .45) * amplitude * gain;
      positions.setZ(i, h);
      const color = new THREE.Color(h > 65 ? '#818d83' : h > 30 ? '#536e54' : '#668455'); vertexColors.push(color.r, color.g, color.b);
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3)); terrain.computeVertexNormals();
    const hills = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); hills.rotation.x = -Math.PI / 2; hills.position.set(0, -.6, 52.5); scene.add(hills);
  }
  consolidateBoxes(scene);
  return crowds;
}
