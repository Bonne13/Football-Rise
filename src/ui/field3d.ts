import { stadiumFor, type StadiumProfile } from '../data/stadiums.js';
import { buildStadium } from './stadium3d.js';
import { trainingKit, type Kit } from '../data/kits.js';
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
export interface FieldAppearance { number: number; training: boolean; kit: Kit; stadium: StadiumProfile }
export function fieldZone(kind: Trial['kind'], layout: number) { return ['shoot', 'freekick'].includes(kind) ? 0 : [35, 28, 42][layout % 3]!; }
export class Field3D {
  private overview = false;
  private portrait = false;
  setPortrait(value: boolean) { this.portrait = value; }
  setOverview(value: boolean) { this.overview = value; }
  setQuality(quality: 'auto' | 'high' | 'low') {
    const ratio = quality === 'low' ? 1 : quality === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(ratio); this.contactRenderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = quality !== 'low';
    this.scene.traverse(object => {
      if (object.name === 'spectator-crowd') object.visible = quality !== 'low';
      if (object instanceof THREE.DirectionalLight && object.castShadow) { const size = quality === 'high' ? 2048 : 1024; if (object.shadow.mapSize.x !== size) { object.shadow.mapSize.set(size, size); object.shadow.map?.dispose(); object.shadow.map = null; } }
    });
    this.size = ''; this.contactSize = ''; this.resize();
  }
  private renderer: T.WebGLRenderer;
  private contactRenderer: T.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(55, 1, .05, 500);
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
  private actorGeometries = { head: new THREE.SphereGeometry(.14, 16, 12), body: new THREE.CylinderGeometry(.235, .165, .55, 20) };
  private contactTexture: T.CanvasTexture;
  constructor(private canvas: HTMLCanvasElement, private contactCanvas: HTMLCanvasElement, private appearance: FieldAppearance = { number: 10, training: true, kit: trainingKit, stadium: stadiumFor() }) {
    if (typeof THREE === 'undefined') throw new Error('Biblioteca 3D indisponível.');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    try { this.contactRenderer = new THREE.WebGLRenderer({ canvas: contactCanvas, antialias: true, alpha: true }); }
    catch (error) { this.renderer.dispose(); this.renderer.forceContextLoss(); throw error; }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.contactRenderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.contactRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const sky = document.createElement('canvas'); sky.width = 1024; sky.height = 512;
    const sc = sky.getContext('2d')!; const skyGradient = sc.createLinearGradient(0, 0, 0, 512);
    skyGradient.addColorStop(0, '#547caa'); skyGradient.addColorStop(.65, '#c5d7df'); skyGradient.addColorStop(1, '#f4e5ca'); sc.fillStyle = skyGradient; sc.fillRect(0, 0, 1024, 512);
    let cloudSeed = this.appearance.stadium.seed;
    for (let i = 0; i < 28; i++) { cloudSeed = (Math.imul(cloudSeed, 1664525) + 1013904223) >>> 0; const x = cloudSeed % 1024, y = 50 + (cloudSeed >>> 12) % 160; const cloud = sc.createRadialGradient(x, y, 2, x, y, 65); cloud.addColorStop(0, '#ffffff55'); cloud.addColorStop(1, '#ffffff00'); sc.fillStyle = cloud; sc.save(); sc.translate(x, y); sc.scale(1.9, .45); sc.fillRect(-70, -70, 140, 140); sc.restore(); }
    const skyTexture = new THREE.CanvasTexture(sky); skyTexture.colorSpace = THREE.SRGBColorSpace; this.textures.push(skyTexture); this.scene.background = skyTexture;
    this.scene.fog = new THREE.Fog('#b7ccd0', 175, 520);
    this.scene.add(new THREE.HemisphereLight('#eaf5ff', '#344c30', 1.7));
    const sun = new THREE.DirectionalLight('#fff0ce', 2.8); sun.position.set(-12, 21, 15); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: .5, far: 65 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .025;
    sun.target.position.set(0, 0, 10); this.scene.add(sun.target, sun);
    this.contactScene.add(new THREE.HemisphereLight('#fff', '#325340', 2.3));
    const key = new THREE.DirectionalLight('#fff', 2.1); key.position.set(-2, 4, 5); this.contactScene.add(key);
    this.contactCamera.position.set(0, 0, 3.6);
    this.buildPitch();
    const shirt = document.createElement('canvas'); shirt.width = 128; shirt.height = 128; const sh = shirt.getContext('2d')!;
    sh.fillStyle = this.appearance.kit.shirt; sh.fillRect(0, 0, 128, 128); sh.fillStyle = this.appearance.kit.ink; sh.font = 'bold 84px sans-serif'; sh.textAlign = 'center'; sh.fillText(String(this.appearance.number), 64, 103);
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
    for (let i = 0; i < image.data.length; i += 4) { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; const n = random / 4294967296; const blade = (i / 4 % 256) % 3 === 0 ? 10 : 0; image.data[i] = 50 + n * 24 + blade; image.data[i + 1] = 94 + n * 33 + blade; image.data[i + 2] = 32 + n * 17; image.data[i + 3] = 255; }
    tc.putImageData(image, 0, 0); const grassTexture = new THREE.CanvasTexture(turf); grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping; grassTexture.repeat.set(32, 3); grassTexture.colorSpace = THREE.SRGBColorSpace; grassTexture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy()); this.textures.push(grassTexture);
    const turfMaterials = [new THREE.MeshStandardMaterial({ color: '#b9d6ad', map: grassTexture, roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#c6dab0', map: grassTexture, roughness: 1 })];
    for (let i = 0; i < 21; i++) { const grass = new THREE.Mesh(new THREE.PlaneGeometry(68, 5), turfMaterials[i % 2]); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0, i * 5 + 2.5); grass.receiveShadow = true; this.scene.add(grass); }
    const markings = (points: number[][]) => { const geo = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p[0]!, .015, p[1]!))); this.scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#f2f3d9' }))); };
    // Fine mowing tracks add scale in the player camera without extra meshes.
    for (let stripe = 0; stripe < 10; stripe++) { const track = new THREE.Mesh(new THREE.PlaneGeometry(.035, 105), new THREE.MeshBasicMaterial({ color: '#b7c99b', transparent: true, opacity: .08, depthWrite: false })); track.rotation.x = -Math.PI / 2; track.position.set(-30 + stripe * 6.5, .012, 52.5); this.scene.add(track); }
    markings([[-34, 0], [34, 0], [34, 105], [-34, 105], [-34, 0]]);
    markings([[-20.16, 0], [-20.16, 16.5], [20.16, 16.5], [20.16, 0]]);
    markings([[-9.16, 0], [-9.16, 5.5], [9.16, 5.5], [9.16, 0]]); markings([[-34, 52.5], [34, 52.5]]);
    markings(Array.from({ length: 65 }, (_, i) => [Math.cos(i * Math.PI / 32) * 9.15, 52.5 + Math.sin(i * Math.PI / 32) * 9.15]));
    for (const z of [11, 52.5, 94]) { const spot = new THREE.Mesh(new THREE.CircleGeometry(.12, 12), this.material('#f4f3df')); spot.rotation.x = -Math.PI / 2; spot.position.set(0, .02, z); this.scene.add(spot); }
    for (const z of [0, 105]) for (const x of [-34, 34]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.018, .024, 1.5, 8), this.material('#e4e8d9')); pole.position.set(x, .75, z); this.scene.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(.4, .3), new THREE.MeshStandardMaterial({ color: this.appearance.kit.secondary, side: THREE.DoubleSide, roughness: .9 })); flag.position.set(x + .2, 1.32, z); this.scene.add(flag);
    }
    for (const goalLine of [0, 105]) markings(Array.from({ length: 41 }, (_, i) => { const angle = .645 + (Math.PI - 1.29) * i / 40; return [Math.cos(angle) * 9.15, goalLine === 0 ? 11 + Math.sin(angle) * 9.15 : 94 - Math.sin(angle) * 9.15]; }));
    const goal = new THREE.Group();
    const bar = (position: T.Vector3, length: number, horizontal = false) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, length, 10), this.material('#fafcf3')); if (horizontal) m.rotation.z = Math.PI / 2; m.position.copy(position); goal.add(m); };
    for (const x of [-3.66, 3.66]) { bar(new THREE.Vector3(x, 1.22, 0), 2.44); bar(new THREE.Vector3(x, 1.22, -1.2), 2.44); }
    bar(new THREE.Vector3(0, 2.44, 0), 7.32, true); bar(new THREE.Vector3(0, 2.44, -1.2), 7.32, true);
    const wires: number[] = []; const wire = (...p: number[]) => wires.push(...p);
    for (let x = -3.66; x <= 3.67; x += .25) { wire(x, 0, -1.2, x, 2.44, -1.2); wire(x, 2.44, -1.2, x, 2.44, 0); }
    for (let y = 0; y <= 2.45; y += .2) { wire(-3.66, y, -1.2, 3.66, y, -1.2); wire(-3.66, y, -1.2, -3.66, y, 0); wire(3.66, y, -1.2, 3.66, y, 0); }
    goal.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)), new THREE.LineBasicMaterial({ color: '#f2f8ef', transparent: true, opacity: .6 })));
    this.scene.add(goal);
    const otherGoal = goal.clone(true); otherGoal.rotation.y = Math.PI; otherGoal.position.z = 105; this.scene.add(otherGoal);
    markings([[-20.16, 105], [-20.16, 88.5], [20.16, 88.5], [20.16, 105]]);
    markings([[-9.16, 105], [-9.16, 99.5], [9.16, 99.5], [9.16, 105]]);
    buildStadium(this.scene, this.appearance.stadium, { primary: this.appearance.kit.shirt, secondary: this.appearance.kit.secondary });
    this.scene.traverse(object => { const mesh = object as T.Mesh; if (mesh.material) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) { const map = (mat as T.MeshStandardMaterial).map; if (map && !this.textures.includes(map)) this.textures.push(map); } });
    const boardCanvas = document.createElement('canvas'); boardCanvas.width = 1024; boardCanvas.height = 128; const bc = boardCanvas.getContext('2d')!;
    bc.fillStyle = '#10253d'; bc.fillRect(0, 0, 1024, 128); bc.fillStyle = '#eff7fa'; bc.font = 'bold 47px sans-serif'; bc.fillText('FOOTBALL RISE', 35, 78); bc.fillStyle = '#a8e6c5'; bc.fillText('RISE ACADEMY', 565, 78);
    const boardTexture = new THREE.CanvasTexture(boardCanvas); boardTexture.colorSpace = THREE.SRGBColorSpace; boardTexture.wrapS = THREE.RepeatWrapping; boardTexture.repeat.x = 3; this.textures.push(boardTexture);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(55, 1.1), new THREE.MeshBasicMaterial({ map: boardTexture })); board.position.set(0, .65, -3); this.scene.add(board);
    const backBoard = board.clone(); backBoard.rotation.y = Math.PI; backBoard.position.z = 108; this.scene.add(backBoard);
    for (const side of [-1, 1]) { const sideBoard = board.clone(); sideBoard.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; sideBoard.position.set(side * 37, .65, 52.5); sideBoard.scale.x = 1.85; this.scene.add(sideBoard); }
  }

  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (w && h && this.size !== `${w}:${h}`) { this.size = `${w}:${h}`; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    const cw = this.contactCanvas.clientWidth, ch = this.contactCanvas.clientHeight; if (cw && ch && this.contactSize !== `${cw}:${ch}`) { this.contactSize = `${cw}:${ch}`; this.contactRenderer.setSize(cw, ch, false); this.contactCamera.aspect = cw / ch; this.contactCamera.updateProjectionMatrix(); }
  }
  private zoneOffset = 0;
  private vector(p: Point, goal = false) { const v = worldPoint(p, goal); return new THREE.Vector3(v.x, v.y, v.z + this.zoneOffset); }
  private actor(index: number, point: Point, color: string) {
    let group = this.actors[index]; const user = color === '#d9fa6b'; const kit = user ? this.appearance.kit.shirt : color === '#65beed' ? '#2477ab' : color === '#dd5860' ? '#b3364b' : '#f7b956';
    if (!group) {
      group = new THREE.Group();
      const body = new THREE.Mesh(this.actorGeometries.body, this.material(kit)); body.position.y = 1.1; body.castShadow = true; group.add(body);
      const head = new THREE.Mesh(this.actorGeometries.head, this.material('#c98e64')); head.scale.set(.92, 1.14, 1); head.position.y = 1.6; head.castShadow = true; group.add(head);
      for (const x of [-.1, .1]) {
        const leg = new THREE.Group(); leg.position.set(x, .79, 0);
        const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .19, 4, 10), this.material('#bc815b')); thigh.position.y = -.13; thigh.castShadow = true; leg.add(thigh);
        const knee = new THREE.Group(); knee.position.y = -.29;
        const calf = new THREE.Mesh(new THREE.CapsuleGeometry(.055, .16, 4, 10), this.material('#bc815b')); calf.position.y = -.14; knee.add(calf);
        const sock = new THREE.Mesh(new THREE.CylinderGeometry(.061, .051, .2, 12), this.material(user ? this.appearance.kit.socks : '#e9f1f3')); sock.position.y = -.23; knee.add(sock);
        const boot = new THREE.Mesh(new THREE.CapsuleGeometry(.073, .13, 4, 12), this.material('#162638')); boot.rotation.x = Math.PI / 2; boot.position.set(0, -.41, -.06); boot.castShadow = true; knee.add(boot);
        const accent = new THREE.Mesh(new THREE.BoxGeometry(.11, .014, .12), this.material(user ? this.appearance.kit.secondary : '#afd4d6')); accent.position.set(0, -.35, -.075); knee.add(accent);
        leg.add(knee); group.add(leg);
      }
      for (const x of [-.27, .27]) {
        const arm = new THREE.Group(); arm.position.set(x, 1.32, 0); arm.rotation.z = x < 0 ? -.15 : .15;
        const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(.082, .09, 4, 12), this.material(user && this.appearance.training ? '#e8edf2' : kit)); sleeve.position.y = -.07; sleeve.castShadow = true; arm.add(sleeve);
        const elbow = new THREE.Group(); elbow.position.y = -.2;
        const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(.049, .12, 4, 10), this.material('#c98e64')); forearm.position.y = -.1; forearm.castShadow = true; elbow.add(forearm);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 8), this.material('#c98e64')); hand.scale.y = 1.25; hand.position.y = -.24; elbow.add(hand);
        arm.add(elbow); group.add(arm);
      }
      const shorts = new THREE.Mesh(new THREE.CylinderGeometry(.19, .2, .26, 12), this.material(user ? this.appearance.kit.shorts : '#1d354d')); shorts.position.y = .77; group.add(shorts);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(.145, 14, 8, 0, Math.PI * 2, 0, 1.2), this.material('#292725')); hair.position.y = 1.63; group.add(hair);
      const number = new THREE.Mesh(new THREE.PlaneGeometry(.25, .27), new THREE.MeshBasicMaterial({ map: this.shirtTexture })); number.position.set(0, 1.11, .226); group.add(number);
      const front = number.clone(); front.position.set(0, 1.11, -.226); front.rotation.y = Math.PI; front.scale.setScalar(.7); group.add(front);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(.055, .062, .12, 12), this.material('#c98e64')); neck.position.y = 1.42; group.add(neck);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(.087, .018, 6, 16), this.material(user ? this.appearance.kit.secondary : '#eef3f8')); collar.rotation.x = Math.PI / 2; collar.position.y = 1.39; group.add(collar);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), this.material('#20242c')); eye.position.set(side * .047, 1.63, -.125); group.add(eye);
      }
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(.027, 10, 8), this.material('#c98e64')); ear.scale.y = 1.3; ear.position.set(side * .13, 1.6, -.015); group.add(ear);
        const brow = new THREE.Mesh(new THREE.BoxGeometry(.045, .009, .012), this.material('#392d27')); brow.position.set(side * .045, 1.655, -.126); group.add(brow);
      }
      const mouth = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.028, 1.54, -.122), new THREE.Vector3(0, 1.535, -.135), new THREE.Vector3(.028, 1.54, -.122)]), new THREE.LineBasicMaterial({ color: '#8e5c4a' })); group.add(mouth);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), this.material('#c98e64')); nose.position.set(0, 1.585, -.14); group.add(nose);
      if (user && !this.appearance.training) {
        const stripes = this.appearance.kit.pattern === 'plain' ? 1 : 3;
        for (let i = 0; i < stripes; i++) {
          const horizontal = this.appearance.kit.pattern === 'hoops';
          const trim = new THREE.Mesh(new THREE.BoxGeometry(horizontal ? .39 : .045, horizontal ? .045 : .45, .014), this.material(this.appearance.kit.secondary));
          trim.position.set(horizontal ? 0 : (i - (stripes - 1) / 2) * .12, horizontal ? .95 + i * .13 : 1.1, -.2); group.add(trim);
        }
      }
      this.scene.add(group); this.actors[index] = group;
    }
    (group.children[0] as T.Mesh).material = this.material(kit); group.children[8]!.visible = user; group.children[9]!.visible = user;
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
    this.zoneOffset = fieldZone(t.kind, t.layout);
    this.resize(); this.actors.forEach(a => { a.visible = false; }); this.cones.forEach(a => { a.visible = false; }); this.gates.forEach(a => { a.visible = false; });
    this.line.visible = t.kind === 'vision'; this.line.position.z = this.zoneOffset + (t.offsideLine - 95) / 50 - 3.1; let count = 0;
    let focus = t.kind === 'technique' ? t.player : t.origin;
    if (t.kind === 'speed') focus = { x: [147, 440, 733][t.lane]!, y: 1160 };
    const centre = this.vector(focus);
    // Identical framing while aiming, choosing curve and shooting: no phase zoom or jump.
    if (this.portrait) { const subject = this.vector(['speed', 'technique'].includes(t.kind) ? focus : { x: t.origin.x - 40, y: t.origin.y + 25 }); this.camera.position.set(subject.x + 1.2, 1.35, subject.z - 3.2); this.camera.lookAt(subject.x, .95, subject.z); }
    else if (this.overview) { this.camera.position.set(105, 95, 158); this.camera.lookAt(0, 0, 52.5); }
    else { this.camera.position.set(centre.x + .3, 5.4, centre.z + 9.5); this.camera.lookAt(centre.x, 1.05, Math.max(0, centre.z - 12)); }
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
      if (t.kind === 'pass' || t.kind === 'vision') { t.defenders.forEach(p => this.actor(count++, p, '#dd5860')); (t.kind === 'vision' ? t.mates : [teammateAt(t.time, t.layout)]).forEach(p => this.actor(count++, p, '#65beed')); }
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
      if (index === 0 && !['speed', 'technique'].includes(t.kind) && (aim || t.shot)) {
        const target = this.vector(aim ?? t.shot!.end, !['pass', 'vision'].includes(t.kind));
        actor.rotation.y = Math.atan2(-(target.x - actor.position.x), -(target.z - actor.position.z));
      }
      if (index === 1 && ['shoot', 'freekick'].includes(t.kind)) actor.rotation.y = Math.PI;
      actor.children[2]!.rotation.x = moving ? stride * .65 : 0;
      if (!(index === 0 && t.shot)) actor.children[3]!.rotation.x = moving ? -stride * .65 : phase === 'preparing' && index === 0 ? .35 : 0;
      for (const legIndex of [2, 3]) {
        const knee = actor.children[legIndex]!.children[1]!;
        knee.rotation.x = moving ? Math.max(0, Math.sin(animationTime * 12 + legIndex * Math.PI)) * .7 : .06;
      }
      for (const armIndex of [4, 5]) actor.children[armIndex]!.children[1]!.rotation.x = moving ? -.45 : -.15;
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
    return { x: 440 + p.x * GOAL_SCALE, y: ground ? (p.z - this.zoneOffset) * 50 + 95 : 95 - p.y / 2.44 * 70 };
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
