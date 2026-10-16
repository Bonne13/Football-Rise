import type * as T from 'three';
import type { ShotPhase } from './aim-state.js';
import { ballPath, keeperAt, teammateAt, type Point, type Trial } from '../domain/gameplay/trial.js';
declare const THREE: typeof T;
const GOAL_SCALE = 400 / 7.32;
/** Coordinates belong to the domain; only this adapter translates them into metres. */
export function worldPoint(p: Point, goal = false): { x: number; y: number; z: number } {
  return { x: (p.x - 440) / GOAL_SCALE, y: goal ? (95 - p.y) / 70 * 2.44 : .22, z: goal ? 0 : (p.y - 95) / 50 };
}
export function contactEffects(x: number, y: number) {
  const length = Math.hypot(x, y), scale = length > .95 ? .95 / length : 1;
  return { x: x * scale, y: y * scale, curve: -x * scale, lift: Math.max(0, -y * scale) };
}
export class Field3D {
  private renderer: T.WebGLRenderer;
  private contactRenderer: T.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(48, 1, .05, 250);
  private contactScene = new THREE.Scene();
  private contactCamera = new THREE.PerspectiveCamera(35, 1, .1, 10);
  private ray = new THREE.Raycaster();
  private ball: T.Mesh;
  private contactBall: T.Mesh;
  private contactMark: T.Mesh;
  private aimMark: T.Mesh;
  private aimLine: T.Line;
  private trail: T.Line;
  private actors: T.Group[] = [];
  private cones: T.Mesh[] = [];
  private gates: T.Mesh[] = [];
  private line: T.Line;
  private observer: ResizeObserver;
  private size = '';
  private contactSize = '';
  private materials = new Map<string, T.MeshStandardMaterial>();
  private textures: T.Texture[] = [];
  private shirtTexture!: T.CanvasTexture;
  private actorGeometries = { head: new THREE.SphereGeometry(.14, 16, 12), body: new THREE.CapsuleGeometry(.19, .36, 5, 14), limb: new THREE.CapsuleGeometry(.062, .31, 4, 10) };
  private contactTexture: T.CanvasTexture;
  constructor(private canvas: HTMLCanvasElement, private contactCanvas: HTMLCanvasElement) {
    if (typeof THREE === 'undefined') throw new Error('Biblioteca 3D indisponível.');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    try { this.contactRenderer = new THREE.WebGLRenderer({ canvas: contactCanvas, antialias: true, alpha: true }); }
    catch (error) { this.renderer.dispose(); this.renderer.forceContextLoss(); throw error; }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.contactRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.contactRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const sky = document.createElement('canvas'); sky.width = 32; sky.height = 512;
    const sc = sky.getContext('2d')!; const skyGradient = sc.createLinearGradient(0, 0, 0, 512);
    skyGradient.addColorStop(0, '#547caa'); skyGradient.addColorStop(.65, '#c5d7df'); skyGradient.addColorStop(1, '#f4e5ca'); sc.fillStyle = skyGradient; sc.fillRect(0, 0, 32, 512);
    const skyTexture = new THREE.CanvasTexture(sky); skyTexture.colorSpace = THREE.SRGBColorSpace; this.textures.push(skyTexture); this.scene.background = skyTexture;
    this.scene.fog = new THREE.Fog('#cad9dd', 65, 155);
    this.scene.add(new THREE.HemisphereLight('#eaf5ff', '#344c30', 1.7));
    const sun = new THREE.DirectionalLight('#fff0ce', 2.8); sun.position.set(-12, 21, 15); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: .5, far: 65 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .025;
    sun.target.position.set(0, 0, 10); this.scene.add(sun.target, sun);
    this.contactScene.add(new THREE.HemisphereLight('#fff', '#325340', 2.3));
    const key = new THREE.DirectionalLight('#fff', 2.1); key.position.set(-2, 4, 5); this.contactScene.add(key);
    this.contactCamera.position.set(0, 0, 3.6);
    this.buildPitch();
    const shirt = document.createElement('canvas'); shirt.width = 128; shirt.height = 128; const sh = shirt.getContext('2d')!;
    sh.fillStyle = '#f0f5f8'; sh.fillRect(0, 0, 128, 128); sh.fillStyle = '#162b47'; sh.font = 'bold 84px sans-serif'; sh.textAlign = 'center'; sh.fillText('10', 64, 103);
    this.shirtTexture = new THREE.CanvasTexture(shirt); this.shirtTexture.colorSpace = THREE.SRGBColorSpace; this.textures.push(this.shirtTexture);
    const texture = document.createElement('canvas'); texture.width = 512; texture.height = 256;
    const ctx = texture.getContext('2d')!; ctx.fillStyle = '#f7f6ec'; ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = '#71817b'; ctx.lineWidth = 2;
    for (let row = 0; row < 4; row++) for (let col = 0; col < 8; col++) {
      const x = col * 75 + (row % 2) * 37, y = row * 75 + 10;
      ctx.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; const px = x + Math.cos(a) * 23, py = y + Math.sin(a) * 23; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fillStyle = '#172a26'; ctx.fill(); ctx.stroke();
    }
    this.contactTexture = new THREE.CanvasTexture(texture); this.contactTexture.colorSpace = THREE.SRGBColorSpace;
    const ballMaterial = new THREE.MeshStandardMaterial({ map: this.contactTexture, roughness: .65 });
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), ballMaterial); this.ball.castShadow = true; this.scene.add(this.ball);
    this.contactBall = new THREE.Mesh(new THREE.SphereGeometry(.9, 32, 24), ballMaterial); this.contactScene.add(this.contactBall);
    this.contactMark = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff744c', depthTest: false })); this.contactMark.renderOrder = 5; this.contactScene.add(this.contactMark); this.setContact(0, 0);
    this.aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#e0ff87', dashSize: .22, gapSize: .16, depthTest: false })); this.aimLine.renderOrder = 4; this.scene.add(this.aimLine);
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#efffea', transparent: true, opacity: .65 })); this.scene.add(this.trail);
    this.aimMark = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 8, 32), new THREE.MeshBasicMaterial({ color: '#deff70', depthTest: false })); this.aimMark.renderOrder = 5; this.scene.add(this.aimMark);
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-8, .04, 3.1), new THREE.Vector3(8, .04, 3.1)]), new THREE.LineBasicMaterial({ color: '#ff963b' })); this.scene.add(this.line);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.observer.observe(contactCanvas); this.resize();
  }
  private material(color: string) { let value = this.materials.get(color); if (!value) { value = new THREE.MeshStandardMaterial({ color, roughness: .85 }); this.materials.set(color, value); } return value; }
  private buildPitch() {
    const turf = document.createElement('canvas'); turf.width = turf.height = 256; const tc = turf.getContext('2d')!;
    const image = tc.createImageData(256, 256); let random = 127;
    for (let i = 0; i < image.data.length; i += 4) { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; const n = random / 4294967296; image.data[i] = 65 + n * 20; image.data[i + 1] = 111 + n * 27; image.data[i + 2] = 49 + n * 14; image.data[i + 3] = 255; }
    tc.putImageData(image, 0, 0); const grassTexture = new THREE.CanvasTexture(turf); grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping; grassTexture.repeat.set(22, 2); grassTexture.colorSpace = THREE.SRGBColorSpace; grassTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy()); this.textures.push(grassTexture);
    const turfMaterials = [new THREE.MeshStandardMaterial({ color: '#b8d5b5', map: grassTexture, roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#d0e2bc', map: grassTexture, roughness: 1 })];
    for (let i = 0; i < 21; i++) { const grass = new THREE.Mesh(new THREE.PlaneGeometry(68, 5), turfMaterials[i % 2]); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0, i * 5 + 2.5); grass.receiveShadow = true; this.scene.add(grass); }
    const markings = (points: number[][]) => { const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p[0]!, .015, p[1]!))); this.scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#f2f3d9' }))); };
    markings([[-34, 0], [34, 0], [34, 105], [-34, 105], [-34, 0]]);
    markings([[-20.16, 0], [-20.16, 16.5], [20.16, 16.5], [20.16, 0]]);
    markings([[-9.16, 0], [-9.16, 5.5], [9.16, 5.5], [9.16, 0]]); markings([[-34, 52.5], [34, 52.5]]);
    const goal = new THREE.Group();
    const bar = (position: T.Vector3, length: number, horizontal = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, length, 10), this.material('#fafcf3')); if (horizontal) m.rotation.z = Math.PI / 2; m.position.copy(position); goal.add(m); };
    for (const x of [-3.66, 3.66]) { bar(new THREE.Vector3(x, 1.22, 0), 2.44); bar(new THREE.Vector3(x, 1.22, -1.2), 2.44); }
    bar(new THREE.Vector3(0, 2.44, 0), 7.32, true); bar(new THREE.Vector3(0, 2.44, -1.2), 7.32, true);
    const wires: number[] = []; const wire = (...p: number[]) => wires.push(...p);
    for (let x = -3.66; x <= 3.67; x += .25) { wire(x, 0, -1.2, x, 2.44, -1.2); wire(x, 2.44, -1.2, x, 2.44, 0); }
    for (let y = 0; y <= 2.45; y += .2) { wire(-3.66, y, -1.2, 3.66, y, -1.2); wire(-3.66, y, -1.2, -3.66, y, 0); wire(3.66, y, -1.2, 3.66, y, 0); }
    goal.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)), new THREE.LineBasicMaterial({ color: '#f2f8ef', transparent: true, opacity: .6 })));
    this.scene.add(goal);
    // Roof, seating and branding are procedural and contain no licensed club assets.
    const steel = this.material('#263c52');
    for (let row = 0; row < 8; row++) {
      const height = .7 + row * .65;
      const terrace = new THREE.Mesh(new THREE.BoxGeometry(58, height, 1.7), this.material(row % 2 ? '#627484' : '#7e8c95')); terrace.position.set(0, height / 2, -6 - row * 1.7); terrace.receiveShadow = true; this.scene.add(terrace);
      const chairs = new THREE.InstancedMesh(new THREE.BoxGeometry(.58, .44, .65), this.material('#ffffff'), 64);
      for (let seat = 0; seat < 64; seat++) { chairs.setMatrixAt(seat, new THREE.Matrix4().makeTranslation(-27 + seat * .86, height + .22, -6 - row * 1.7)); chairs.setColorAt(seat, new THREE.Color((seat + row * 3) % 13 < 3 ? '#d4e5e9' : (seat % 7 === 0 ? '#9ec3bd' : '#284d70'))); }
      chairs.instanceMatrix.needsUpdate = true; this.scene.add(chairs);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(64, .16, 10), new THREE.MeshStandardMaterial({ color: '#93a5b1', roughness: .75, metalness: .15, emissive: '#405768', emissiveIntensity: .55 })); roof.position.set(0, 8.3, -13.5); roof.rotation.x = -.06; roof.castShadow = true; this.scene.add(roof);
    for (const x of [-28, -14, 0, 14, 28]) { const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, 9, 8), steel); pillar.position.set(x, 4.5, -18); this.scene.add(pillar); }
    for (const x of [-23, 23]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.09, .15, 15, 8), this.material('#b9c8cb')); pole.position.set(x, 7.5, -3); this.scene.add(pole);
      const lamps = new THREE.Mesh(new THREE.BoxGeometry(2.2, .75, .25), new THREE.MeshStandardMaterial({ color: '#f8ffff', emissive: '#d2e9ff', emissiveIntensity: .6 })); lamps.position.set(x, 14.5, -3); this.scene.add(lamps);
    }
    const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 128; const bc = boardCanvas.getContext('2d')!;
    bc.fillStyle = '#10253d'; bc.fillRect(0, 0, 1024, 128); bc.fillStyle = '#eff7fa'; bc.font = 'bold 47px sans-serif'; bc.fillText('FOOTBALL RISE', 35, 78); bc.fillStyle = '#a8e6c5'; bc.fillText('RISE ACADEMY', 565, 78);
    const boardTexture = new THREE.CanvasTexture(boardCanvas); boardTexture.colorSpace = THREE.SRGBColorSpace; boardTexture.wrapS = THREE.RepeatWrapping; boardTexture.repeat.x = 3; this.textures.push(boardTexture);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(55, 1.1), new THREE.MeshBasicMaterial({ map: boardTexture })); board.position.set(0, .65, -3); this.scene.add(board);
  }

  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (w && h && this.size !== `${w}:${h}`) { this.size = `${w}:${h}`; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    const cw = this.contactCanvas.clientWidth, ch = this.contactCanvas.clientHeight; if (cw && ch && this.contactSize !== `${cw}:${ch}`) { this.contactSize = `${cw}:${ch}`; this.contactRenderer.setSize(cw, ch, false); this.contactCamera.aspect = cw / ch; this.contactCamera.updateProjectionMatrix(); }
  }
  private vector(p: Point, goal = false) { const v = worldPoint(p, goal); return new THREE.Vector3(v.x, v.y, v.z); }
  private actor(index: number, point: Point, color: string) {
    let group = this.actors[index]; const user = color === '#d9fa6b'; const kit = user ? '#edf3f5' : color === '#65beed' ? '#2477ab' : color === '#dd5860' ? '#b3364b' : '#f7b956';
    if (!group) {
      group = new THREE.Group();
      const body = new THREE.Mesh(this.actorGeometries.body, this.material(kit)); body.position.y = 1.1; body.castShadow = true; group.add(body);
      const head = new THREE.Mesh(this.actorGeometries.head, this.material('#c98e64')); head.position.y = 1.6; head.castShadow = true; group.add(head);
      for (const x of [-.1, .1]) {
        const leg = new THREE.Group(); leg.position.set(x, .53, 0);
        const skin = new THREE.Mesh(this.actorGeometries.limb, this.material('#bc815b')); leg.add(skin);
        const sock = new THREE.Mesh(new THREE.CylinderGeometry(.067, .058, .25, 10), this.material('#e9f1f3')); sock.position.y = -.23; leg.add(sock);
        const boot = new THREE.Mesh(new THREE.CapsuleGeometry(.075, .1, 4, 10), this.material('#162638')); boot.rotation.x = Math.PI / 2; boot.position.set(0, -.36, -.05); leg.add(boot); group.add(leg);
      }
      for (const x of [-.265, .265]) { const arm = new THREE.Mesh(this.actorGeometries.limb, this.material('#c98e64')); arm.position.set(x, 1.08, 0); arm.rotation.z = x < 0 ? -.15 : .15; arm.castShadow = true; group.add(arm); }
      const shorts = new THREE.Mesh(new THREE.CylinderGeometry(.19, .2, .26, 12), this.material('#1d354d')); shorts.position.y = .77; group.add(shorts);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(.145, 14, 8, 0, Math.PI * 2, 0, 1.2), this.material('#292725')); hair.position.y = 1.63; group.add(hair);
      const number = new THREE.Mesh(new THREE.PlaneGeometry(.25, .27), new THREE.MeshBasicMaterial({ map: this.shirtTexture })); number.position.set(0, 1.13, .197); group.add(number);
      this.scene.add(group); this.actors[index] = group;
    }
    (group.children[0] as T.Mesh).material = this.material(kit); group.children[8]!.visible = user;
    group.position.copy(this.vector(point)); group.position.y = 0; group.rotation.z = 0; group.visible = true; return group;
  }
  private path(trial: Trial, end: Point, curve: number, lift: number, fraction = 1) {
    const ground = trial.kind === 'pass' || trial.kind === 'vision';
    const a = this.vector(trial.origin), b = this.vector(end, !ground);
    return Array.from({ length: 41 }, (_, i) => {
      const u = i / 40 * fraction, p = ballPath(trial.origin, end, u, curve);
      return new THREE.Vector3((p.x - 440) / GOAL_SCALE, a.y + (b.y - a.y) * u + Math.sin(u * Math.PI) * (ground ? .3 : .65 + lift * 2.2), a.z + (b.z - a.z) * u);
    });
  }
  private setLine(line: T.Line, points: T.Vector3[]) { line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(points); line.computeLineDistances(); }
  render(t: Trial | null, aim: Point | null, curve: number, lift: number, phase: ShotPhase = 'preparing', animationTime = 0) {
    if (!t) { this.renderer.render(this.scene, this.camera); return; }
    this.resize(); this.actors.forEach(a => { a.visible = false; }); this.cones.forEach(a => { a.visible = false; }); this.gates.forEach(a => { a.visible = false; });
    this.line.visible = t.kind === 'vision'; let count = 0;
    let focus = t.kind === 'technique' ? t.player : t.origin;
    if (t.kind === 'speed') focus = { x: [147, 440, 733][t.lane]!, y: 1160 };
    const centre = this.vector(focus);
    const aimingGoal = phase === 'aiming' && (t.kind === 'shoot' || t.kind === 'freekick');
    if (aimingGoal) { const distance = Math.max(10, 7.32 / (2 * Math.tan(this.camera.fov * Math.PI / 360) * this.camera.aspect * .82)); this.camera.position.set(.15, 3.1, distance); this.camera.lookAt(0, 1.05, 0); }
    else { this.camera.position.set(centre.x * .35 + .7, 4.2, centre.z + 7.2); this.camera.lookAt(centre.x * .2, 1.05, Math.max(0, centre.z - 12)); }
    this.camera.updateMatrixWorld();
    if (t.kind === 'technique') {
      this.actor(count++, t.player, '#d9fa6b'); this.ball.position.copy(this.vector({ x: t.player.x + 17, y: t.player.y - 20 }));
      t.gates.forEach((p, i) => { let gate = this.gates[i]; if (!gate) { gate = new THREE.Mesh(new THREE.TorusGeometry(.65, .06, 8, 24), this.material('#d7fa76')); gate.rotation.x = -Math.PI / 2; this.scene.add(gate); this.gates[i] = gate; } gate.visible = i >= t.gate; gate.position.copy(this.vector(p)); gate.position.y = .05; gate.scale.setScalar(i === t.gate ? 1.2 : .8); });
      t.cones.forEach((p, i) => this.obstacle(i, p));
    } else if (t.kind === 'speed') {
      this.actor(count++, focus, '#d9fa6b'); this.ball.visible = false;
      t.obstacles.filter(o => !o.passed && o.distance - t.distance < 55).forEach((o, i) => this.obstacle(i, { x: [147, 440, 733][o.lane]!, y: 1150 - (o.distance - t.distance) * 20 }));
    } else {
      this.ball.visible = true;
      const approach = t.shot ? Math.sin(Math.min(1, t.shot.elapsed / t.shot.duration) * Math.PI / 2) : 0;
      const striker = this.actor(count++, { x: t.origin.x - 40 + approach * 30, y: t.origin.y + 25 - approach * 30 }, '#d9fa6b');
      if (t.kind === 'pass' || t.kind === 'vision') { t.defenders.forEach(p => this.actor(count++, p, '#dd5860')); (t.kind === 'vision' ? t.mates : [teammateAt(t.time)]).forEach(p => this.actor(count++, p, '#65beed')); }
      else { const keeper = this.actor(count++, { x: t.shot?.keeper ?? keeperAt(t.time), y: 95 }, '#f7af65'); if (t.shot && t.outcome === 'save') keeper.rotation.z = -.35; else keeper.rotation.z = 0; if (t.kind === 'freekick') [360, 410, 460, 510].forEach(x => this.actor(count++, { x, y: 720 }, '#dd5860')); }
      if (t.shot) {
        const fraction = Math.min(1, t.shot.elapsed / t.shot.duration); const points = this.path(t, t.shot.end, t.shot.curve, t.shot.lift, fraction); this.ball.position.copy(points[points.length - 1]!);
        this.ball.rotation.x = fraction * 12; this.ball.rotation.z = fraction * t.shot.curve * 8;
        this.setLine(this.trail, points); this.trail.visible = true;
        (striker.children[3] as T.Mesh).rotation.x = -Math.sin(fraction * Math.PI) * 1.2;
        if (t.resolved && t.outcome === 'save') this.ball.position.copy(this.vector({ x: t.shot.keeper, y: 95 })).setY(.9);
        if (t.resolved && t.outcome === 'wall') this.ball.position.copy(this.vector({ x: 440, y: 720 })).setY(.6);
        if (t.resolved && t.outcome === 'goal') this.ball.position.z = -.45;
      } else { this.ball.position.copy(this.vector(t.origin)); this.trail.visible = false; (striker.children[3] as T.Mesh).rotation.x = 0; }
    }
    if (t.kind === 'technique') this.ball.visible = true;
    else if (phase === 'aiming' && ['shoot', 'freekick', 'pass', 'vision'].includes(t.kind)) this.ball.visible = false;
    this.aimLine.visible = !!aim && !t.shot && !['speed', 'technique'].includes(t.kind);
    this.aimMark.visible = this.aimLine.visible;
    if (aim && this.aimLine.visible) { this.setLine(this.aimLine, this.path(t, aim, curve, lift)); this.aimMark.position.copy(this.vector(aim, t.kind !== 'pass' && t.kind !== 'vision')); this.aimMark.rotation.x = t.kind === 'pass' || t.kind === 'vision' ? -Math.PI / 2 : 0; }
    this.actors.forEach((actor, index) => {
      if (!actor.visible) return;
      const previous = actor.userData.attempt === `${t.kind}:${t.attempt}` ? actor.userData.previous as { x: number; z: number; time: number } | undefined : undefined;
      const elapsed = previous ? animationTime - previous.time : 0;
      const dx = previous ? actor.position.x - previous.x : 0, dz = previous ? actor.position.z - previous.z : 0;
      const moving = !t.resolved && ((elapsed > 0 && elapsed < .15 && Math.hypot(dx, dz) / elapsed > .1) || (index === 0 && t.kind === 'speed' && t.started));
      const stride = Math.sin(animationTime * (t.kind === 'speed' ? 17 : 12));
      if (index === 0 && t.kind === 'speed' && previous && elapsed > 0) { const blend = 1 - Math.exp(-elapsed * 16); actor.position.x = previous.x + dx * blend; }
      actor.position.y = moving ? Math.abs(stride) * .065 : Math.sin(animationTime * 2 + index) * .012;
      if (moving && Math.hypot(dx, dz) > .001) actor.rotation.y = Math.atan2(-dx, -dz);
      else if (!moving) actor.rotation.y *= .9;
      actor.children[2]!.rotation.x = moving ? stride * .65 : 0;
      if (!(index === 0 && t.shot)) actor.children[3]!.rotation.x = moving ? -stride * .65 : phase === 'preparing' && index === 0 ? .35 : 0;
      actor.children[4]!.rotation.x = moving ? -stride * .5 : .08;
      actor.children[5]!.rotation.x = moving ? stride * .5 : -.08;
      if (index === 1 && t.shot && !['pass', 'vision'].includes(t.kind)) {
        const reach = Math.min(1, t.shot.elapsed / t.shot.duration);
        const side = Math.sign(t.shot.end.x - t.shot.keeper);
        actor.rotation.z = -side * Math.sin(reach * Math.PI / 2) * .5;
        actor.children[4]!.rotation.z = -.15 - reach * .9;
        actor.children[5]!.rotation.z = .15 + reach * .9;
      } else { actor.children[4]!.rotation.z = -.15; actor.children[5]!.rotation.z = .15; }
      actor.userData.attempt = `${t.kind}:${t.attempt}`;
      actor.userData.previous = { x: actor.position.x, z: actor.position.z, time: animationTime };
    });
    this.renderer.render(this.scene, this.camera);
    if (this.contactCanvas.getClientRects().length) this.contactRenderer.render(this.contactScene, this.contactCamera);
  }
  private obstacle(index: number, p: Point) { let mesh = this.cones[index]; if (!mesh) { mesh = new THREE.Mesh(new THREE.ConeGeometry(.32, .8, 10), this.material('#fa934a')); this.scene.add(mesh); this.cones[index] = mesh; } mesh.visible = true; mesh.position.copy(this.vector(p)); mesh.position.y = .4; }
  screenPoint(p: Point, goal: boolean) { const v = this.vector(p, goal).project(this.camera); return { x: (v.x + 1) * this.canvas.clientWidth / 2, y: (1 - v.y) * this.canvas.clientHeight / 2 }; }
  pick(clientX: number, clientY: number, ground: boolean): Point | null {
    const r = this.canvas.getBoundingClientRect(); this.ray.setFromCamera(new THREE.Vector2((clientX - r.left) / r.width * 2 - 1, 1 - (clientY - r.top) / r.height * 2), this.camera);
    const p = this.ray.ray.intersectPlane(ground ? new THREE.Plane(new THREE.Vector3(0, 1, 0), 0) : new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), new THREE.Vector3());
    if (!p) return null;
    return { x: 440 + p.x * GOAL_SCALE, y: ground ? p.z * 50 + 95 : 95 - p.y / 2.44 * 70 };
  }
  contact(clientX: number, clientY: number) {
    const r = this.contactCanvas.getBoundingClientRect(); this.contactCamera.updateMatrixWorld(); this.ray.setFromCamera(new THREE.Vector2((clientX - r.left) / r.width * 2 - 1, 1 - (clientY - r.top) / r.height * 2), this.contactCamera);
    const hit = this.ray.intersectObject(this.contactBall)[0]; if (!hit) return null; return this.setContact(hit.point.x / .9, hit.point.y / .9);
  }
  setContact(x: number, y: number) { const e = contactEffects(x, y); this.contactMark.position.set(e.x * .93, e.y * .93, Math.sqrt(Math.max(.02, 1 - e.x * e.x - e.y * e.y)) * .93); return e; }
  dispose() {
    this.observer.disconnect(); const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
    for (const scene of [this.scene, this.contactScene]) scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); const mesh = object as T.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.contactTexture.dispose(); this.textures.forEach(t => t.dispose());
    this.renderer.dispose(); this.contactRenderer.dispose(); this.renderer.forceContextLoss(); this.contactRenderer.forceContextLoss();
  }
}
