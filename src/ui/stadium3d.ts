import type * as T from 'three';
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
export function buildStadium(scene: T.Scene, profile: StadiumProfile, colors: { primary: string; secondary: string }) {
  let seed = profile.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .88 });
  const concrete = material('#657477'), dark = material('#263641'), pale = material('#b9c5c5');
  const panel = material('#4b626e'), clubTrim = material(colors.primary);
  const box = (parent: T.Object3D, size: [number, number, number], position: [number, number, number], mat: T.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); mesh.position.set(...position); parent.add(mesh); return mesh;
  };
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(2500, 2500), material(profile.country === 'Brasil' ? '#4f744a' : '#637b52')); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -.08, 52.5); grass.receiveShadow = true; scene.add(grass);
  const rows = profile.size === 'local' ? 3 : profile.size === 'regional' ? 7 : 14;
  const sides = [{ x: 0, z: -8, rotation: 0, length: 70 }, { x: 0, z: 113, rotation: Math.PI, length: 70 }, { x: -42, z: 52.5, rotation: Math.PI / 2, length: 110 }, { x: 42, z: 52.5, rotation: -Math.PI / 2, length: 110 }];
  const seatGeo = new THREE.BoxGeometry(.5, .36, .5), seatMat = material('#ffffff');
  for (const [sideIndex, side] of sides.entries()) {
    const stand = new THREE.Group(); stand.name = `stand-${sideIndex}`; stand.position.set(side.x, 0, side.z); stand.rotation.y = side.rotation;
    const seatsPerRow = Math.floor(side.length / .72), chairs = new THREE.InstancedMesh(seatGeo, seatMat, rows * seatsPerRow);
    for (let row = 0; row < rows; row++) {
      const height = .55 + row * .56, depth = -row * 1.05;
      const terrace = new THREE.Mesh(new THREE.BoxGeometry(side.length, height, 1.08), concrete); terrace.position.set(0, height / 2, depth); terrace.receiveShadow = true; stand.add(terrace);
      for (let seat = 0; seat < seatsPerRow; seat++) {
        const i = row * seatsPerRow + seat;
        chairs.setMatrixAt(i, new THREE.Matrix4().makeTranslation(-side.length / 2 + .5 + seat * .72, height + .2, depth));
        chairs.setColorAt(i, new THREE.Color((seat + row * 2) % 11 < 3 ? colors.secondary : colors.primary));
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
    if (profile.size !== 'local' || sideIndex === 2) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(side.length + 2, .22, rows * .8 + 3), pale); roof.position.set(0, top + 2.5, -rows * .55); roof.rotation.x = -.035; roof.castShadow = true; stand.add(roof);
      const roofDepth = rows * .8 + 3;
      box(stand, [side.length + 2, .5, .22], [0, top + 2.4, -rows * .55 + roofDepth / 2], clubTrim);
      for (let x = -side.length / 2; x <= side.length / 2; x += 5) {
        const rib = box(stand, [.09, .12, roofDepth], [x, top + 2.65, -rows * .55], dark); rib.rotation.x = -.035;
      }
      for (let x = -side.length / 2; x <= side.length / 2; x += side.length / 5) { const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, top + 3, 6), dark); post.position.set(x, (top + 3) / 2, -rows * 1.05); stand.add(post); }
    }
    const fence = new THREE.Mesh(new THREE.BoxGeometry(side.length, profile.size === 'local' ? 1.15 : 1.8, .15), dark); fence.position.set(0, profile.size === 'local' ? .6 : .9, 2); stand.add(fence);
    // Lightweight instanced spectators in the match arenas, leaving clear access aisles.
    if (profile.size === 'arena') {
      const crowd = new THREE.InstancedMesh(new THREE.CapsuleGeometry(.15, .24, 2, 5), material('#ffffff'), rows * seatsPerRow);
      crowd.name = 'spectator-crowd';
      let people = 0;
      for (let row = 0; row < rows; row++) for (let seat = 0; seat < seatsPerRow; seat++) {
        const x = -side.length / 2 + .5 + seat * .72;
        if (Math.abs(x) < 1 || Math.abs(Math.abs(x) - side.length / 3) < 1 || random() > .62) continue;
        crowd.setMatrixAt(people, new THREE.Matrix4().makeTranslation(x, 1.08 + row * .56, -row * 1.05));
        crowd.setColorAt(people, new THREE.Color([colors.primary, colors.secondary, '#bd967b', '#253747', '#e2dacb'][people % 5])); people++;
      }
      crowd.count = people; crowd.instanceMatrix.needsUpdate = true; stand.add(crowd);
    }
    consolidateBoxes(stand); scene.add(stand);
  }
  if (profile.size === 'arena') {
    const top = .55 + rows * .56;
    const corners = [{ x: 34, z: 0, angle: 0 }, { x: -34, z: 0, angle: Math.PI / 2 }, { x: -34, z: 105, angle: Math.PI }, { x: 34, z: 105, angle: Math.PI * 1.5 }];
    for (const corner of corners) {
      const count = rows * 14, seats = new THREE.InstancedMesh(seatGeo, seatMat, count); let index = 0;
      for (let row = 0; row < rows; row++) {
        const radius = 8 + row * 1.05, height = .55 + row * .56;
        const step = new THREE.Mesh(new THREE.RingGeometry(radius, radius + 1.05, 20, 1, corner.angle, Math.PI / 2), concrete); step.rotation.x = -Math.PI / 2; step.position.set(corner.x, height, corner.z); scene.add(step);
        for (let seat = 0; seat < 14; seat++) { const angle = corner.angle + (seat + .5) / 14 * Math.PI / 2; seats.setMatrixAt(index, new THREE.Matrix4().makeTranslation(corner.x + Math.cos(angle) * radius, height + .2, corner.z - Math.sin(angle) * radius)); seats.setColorAt(index, new THREE.Color(seat % 5 ? colors.primary : colors.secondary)); index++; }
      }
      const roof = new THREE.Mesh(new THREE.RingGeometry(7.8, 23, 28, 1, corner.angle, Math.PI / 2), pale); roof.rotation.x = -Math.PI / 2; roof.position.set(corner.x, top + 2.5, corner.z); roof.material.side = THREE.DoubleSide; roof.castShadow = true; scene.add(roof);
      seats.instanceMatrix.needsUpdate = true; scene.add(seats);
      for (let i = 0; i < 3; i++) { const angle = corner.angle + i / 2 * Math.PI / 2; box(scene, [.15, top + 2.5, .15], [corner.x + Math.cos(angle) * 22, (top + 2.5) / 2, corner.z - Math.sin(angle) * 22], dark); }
    }
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
  screenContext.fillStyle = '#f5faf9'; screenContext.font = 'bold 45px sans-serif'; screenContext.fillText(profile.size === 'arena' ? 'MATCH DAY' : 'RISE ACADEMY', 256, 134);
  const screenTexture = new THREE.CanvasTexture(screenCanvas); screenTexture.colorSpace = THREE.SRGBColorSpace;
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture });
  const scoreboard = new THREE.Mesh(new THREE.PlaneGeometry(9, 3.4), screenMaterial); scoreboard.position.set(0, rows * .56 + 5.1, -rows * 1.05 - 10); scene.add(scoreboard);
  for (const x of [-3.8, 3.8]) box(scene, [.18, 5, .2], [x, rows * .56 + 2.6, -rows * 1.05 - 10.1], dark);
  // Curving access path outside the bowl, visible at the corners and through low stands.
  const path = new THREE.Mesh(new THREE.RingGeometry(76, 81, 80), material('#7b817b')); path.rotation.x = -Math.PI / 2; path.scale.y = 1.2; path.position.set(0, -.045, 52.5); scene.add(path);
  if (profile.landscape === 'urban') {
    const count = profile.size === 'arena' ? 80 : 40;
    const buildings = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material('#a1aeb0'), count);
    const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(.8, 1, .03), new THREE.MeshStandardMaterial({ color: '#a9ced0', metalness: .25, roughness: .45 }), count * 48);
    const transform = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2 + (random() - .5) * .045, radius = 108 + random() * 55, height = 7 + random() * (profile.size === 'arena' ? 42 : 18), width = 5 + random() * 7, depth = 5 + random() * 8;
      const x = Math.cos(angle) * radius, z = 52.5 + Math.sin(angle) * radius * 1.2;
      transform.position.set(x, height / 2, z); transform.scale.set(width, height, depth); transform.updateMatrix(); buildings.setMatrixAt(i, transform.matrix);
      buildings.setColorAt(i, new THREE.Color(['#9eafba', '#a5b0aa', '#b8aaa0', '#748d9a'][i % 4]));
      for (let w = 0; w < 48; w++) { transform.position.set(x + ((w % 4) - 1.5) * width / 5, 1.5 + Math.floor(w / 4) * height / 13, z + depth / 2 + .03); transform.scale.set(1, 1.4, 1); transform.updateMatrix(); windows.setMatrixAt(i * 48 + w, transform.matrix); }
    }
    // Streets and small parked cars avoid a perfectly circular city wall.
    for (const z of [-95, 188]) {
      box(scene, [380, .025, 9], [0, -.035, z], material('#424e54'));
      for (let x = -150; x < 150; x += 12) box(scene, [4, .028, .18], [x, -.018, z], pale);
      for (let i = 0; i < 13; i++) box(scene, [2, 1.1, 4], [-145 + i * 23, .55, z + 2.5], i % 2 ? dark : pale);
    }
    buildings.instanceMatrix.needsUpdate = windows.instanceMatrix.needsUpdate = true; scene.add(buildings, windows);
  } else if (profile.landscape === 'coastal') {
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(500, 1000), new THREE.MeshStandardMaterial({ color: '#176f8c', roughness: .32, metalness: .18 })); ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, -.055, -565); scene.add(ocean);
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(500, 20), material('#d5c38e')); sand.rotation.x = -Math.PI / 2; sand.position.set(0, -.05, -62); scene.add(sand);
    for (let i = 0; i < 10; i++) {
      const foam = box(scene, [450 - i * 5, .012, .32], [Math.sin(i) * 10, -.025, -75 - i * 9], material(i % 2 ? '#71bcc3' : '#a6d3cf')); foam.rotation.y = Math.sin(i) * .008;
    }
  }
  if (profile.landscape === 'mountains' || profile.landscape === 'rural') {
    const terrain = new THREE.PlaneGeometry(1000, 1000, 64, 64), positions = terrain.getAttribute('position'); const vertexColors: number[] = [];
    const amplitude = profile.landscape === 'mountains' ? 90 : 24;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), distance = Math.hypot(x, y * .8), gain = Math.max(0, Math.min(1, (distance - 125) / 150));
      const h = Math.max(0, Math.sin(x * .016 + profile.seed % 31) * .55 + Math.cos(y * .023) * .35 + Math.sin((x + y) * .01) * .25 + .45) * amplitude * gain;
      positions.setZ(i, h);
      const color = new THREE.Color(h > 65 ? '#818d83' : h > 30 ? '#536e54' : '#668455'); vertexColors.push(color.r, color.g, color.b);
    }
    terrain.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3)); terrain.computeVertexNormals();
    const hills = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); hills.rotation.x = -Math.PI / 2; hills.position.set(0, -.065, 52.5); scene.add(hills);
  }
  const treeCount = profile.landscape === 'urban' ? 30 : 90;
  const trees = new THREE.InstancedMesh(new THREE.SphereGeometry(2.3, 8, 6), material(profile.country === 'Brasil' ? '#285a3b' : '#375a40'), treeCount);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(.22, .4, 3, 5), material('#705b42'), treeCount);
  let planted = 0;
  for (let i = 0; i < treeCount; i++) {
    const angle = random() * Math.PI * 2, radius = 83 + random() * 20, x = Math.cos(angle) * radius, z = 52.5 + Math.sin(angle) * radius * 1.2;
    if (profile.landscape === 'coastal' && z < -50) continue;
    const treeScale = .75 + random() * .65; const treeTransform = new THREE.Object3D(); treeTransform.position.set(x, 4.7 * treeScale, z); treeTransform.scale.set(treeScale, (profile.country === 'Brasil' ? 1.2 : 1.65) * treeScale, treeScale); treeTransform.updateMatrix(); trees.setMatrixAt(planted, treeTransform.matrix); trunks.setMatrixAt(planted, new THREE.Matrix4().makeTranslation(x, 1.5, z)); planted++;
  }
  trees.count = trunks.count = planted;
  trees.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true; scene.add(trees, trunks);
  consolidateBoxes(scene);
}
