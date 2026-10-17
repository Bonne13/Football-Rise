import type { ReceptionFrame } from '../domain/gameplay/reception.js';
import type { CrowdProfile } from '../domain/match/crowd.js';
import { stadiumFor, type StadiumProfile } from '../data/stadiums.js';
import { paintPixelPlayers, spriteFrame, spriteFacing, SPRITE_SIZE, playerAnimationFrame, type PlayerAnimation } from './pixel-player.js';
import { OFFICIAL_KITS, officialsColor, type OfficialsChoice } from '../data/official-kits.js';
import { buildReviewMonitor } from './var3d.js';
import type { ReviewIncident, ReviewPhase } from '../domain/match/video-review.js';
import { buildStadium } from './stadium3d.js';
import { trainingKit, type Kit } from '../data/kits.js';
import type * as T from 'three';
import type { ShotPhase } from './aim-state.js';
import { BALL_RADIUS, NEAR_GOAL } from '../domain/match/adjudication.js';
import { receivingPlayers, trialZone, shotBallPosition, ballPath, keeperAt, teammateAt, type Point, type Trial } from '../domain/gameplay/trial.js';
declare const THREE: typeof T;
const GOAL_SCALE = 400 / 7.32;
/** Coordinates belong to the domain; only this adapter translates them into metres. */
export function worldPoint(p: Point, goal = false): { x: number; y: number; z: number } {
  return { x: (p.x - 440) / GOAL_SCALE, y: goal ? (95 - p.y) / 70 * 2.44 : BALL_RADIUS, z: goal ? 0 : (p.y - 95) / 50 };
}
export function sprintHeading(lateralSpeed: number, forwardSpeed: number) { return Math.max(-.35, Math.min(.35, Math.atan2(-lateralSpeed, Math.max(1, forwardSpeed)))); }
export function contactEffects(x: number, y: number) {
  const length = Math.hypot(x, y), scale = length > .95 ? .95 / length : 1;
  return { x: x * scale, y: y * scale, curve: x * scale, lift: Math.max(0, -y * scale) };
}
export interface FieldAppearance { number: number; training: boolean; kit: Kit; stadium: StadiumProfile; crowd?: CrowdProfile | undefined; homeColors?: { primary: string; secondary: string } }
export const fieldZone = trialZone;
export class Field3D {
  private renderKey = '';
  private officialsChoice: OfficialsChoice = 'auto';
  setOfficialsKit(choice: OfficialsChoice) { this.officialsChoice = choice; this.renderKey = ''; }
  private varView: { phase: ReviewPhase; progress: number } | null = null;
  private reviewMonitor!: ReturnType<typeof buildReviewMonitor>;
  setVARIncident(incident: ReviewIncident) { this.reviewMonitor.setIncident(incident); this.renderKey = ''; }
  setVARView(value: { phase: ReviewPhase; progress: number } | null) { if (this.varView && !value && this.actors[0]) delete this.actors[0].userData.goalStart; this.varView = value; }
  private overview = false;
  private goalReview = false;
  setGoalReview(value: boolean) { this.goalReview = value; }
  private portrait = false;
  private portraitBack = false;
  private animationPreview: PlayerAnimation | null = null;
  private previewStart: number | null = null;
  setAnimationPreview(value: PlayerAnimation | null) { this.animationPreview = value; this.previewStart = null; }
  setPortraitBack(value: boolean) { this.portraitBack = value; }
  setPortrait(value: boolean) { this.portrait = value; }
  setOverview(value: boolean) { this.overview = value; }
  setQuality(quality: 'auto' | 'high' | 'low') {
    const ratio = quality === 'low' ? 1 : quality === 'high' ? Math.min(devicePixelRatio || 1, 2) : Math.min(devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(ratio); this.contactRenderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = quality !== 'low';
    this.canvas.dataset.supporters = String(this.crowds.reduce((total, crowd) => total + crowd.count, 0));
    this.scene.traverse(object => {
      if (object.name === 'spectator-crowd') object.visible = quality !== 'low';
      if (object instanceof THREE.DirectionalLight && object.castShadow) { const size = quality === 'high' ? 2048 : 1024; if (object.shadow.mapSize.x !== size) { object.shadow.mapSize.set(size, size); object.shadow.map?.dispose(); object.shadow.map = null; } }
    });
    this.renderKey = ''; this.size = ''; this.contactSize = ''; this.resize();
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
  private aimLine: T.Line;
  private dribbleGuide:T.Line;
  private trail: T.Line;
  private actors: T.Group[] = [];
  private cones: T.Mesh[] = [];
  private gates: T.Group[] = [];
  private crowds: T.InstancedMesh[] = [];
  private line: T.Line;
  private observer: ResizeObserver;
  private size = '';
  private contactSize = '';
  private materials = new Map<string, T.MeshStandardMaterial>();
  private textures: T.Texture[] = [];
  private uniformMaterials = new Map<string, T.MeshBasicMaterial>();

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
    this.buildPitch(); this.reviewMonitor = buildReviewMonitor(this.scene); this.textures.push(this.reviewMonitor.texture);
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
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 24, 16), ballMaterial); this.ball.name = 'match-ball'; this.ball.castShadow = true; this.scene.add(this.ball);
    this.contactBall = new THREE.Mesh(new THREE.SphereGeometry(.9, 32, 24), ballMaterial); this.contactScene.add(this.contactBall);
    this.contactMark = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff744c', depthTest: false })); this.contactMark.renderOrder = 5; this.contactScene.add(this.contactMark); this.setContact(0, 0);
    this.aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#e0ff87', dashSize: .22, gapSize: .16, depthTest: false })); this.aimLine.renderOrder = 4; this.scene.add(this.aimLine);
    this.dribbleGuide=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:'#76ddc7',dashSize:.18,gapSize:.28,transparent:true,opacity:.65}));this.scene.add(this.dribbleGuide);
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#efffea', transparent: true, opacity: .65 })); this.scene.add(this.trail);
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-34, .04, 0), new THREE.Vector3(34, .04, 0)]), new THREE.LineBasicMaterial({ color: '#ff963b' })); this.scene.add(this.line);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.observer.observe(contactCanvas); this.resize();
  }
  private sprintLanes: T.Mesh[] = [];
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
    const goalLine = new THREE.Mesh(new THREE.BoxGeometry(7.32, .012, .1), this.material('#fafcf3')); goalLine.name = 'goal-line'; goalLine.position.set(0, .007, NEAR_GOAL.z + .05); this.scene.add(goalLine);
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
    this.crowds = buildStadium(this.scene, this.appearance.stadium, this.appearance.homeColors ?? { primary: this.appearance.kit.shirt, secondary: this.appearance.kit.secondary }, this.appearance.training ? 0 : this.appearance.crowd?.occupancy ?? 0);
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
  private uniform(index: number, role: string) {
    const official = role === 'referee' || role === 'assistant';
    const selected = officialsColor(this.officialsChoice, [this.appearance.kit.shirt, this.appearance.kit.secondary, '#b3364b', '#e9a643']);
    const key = `${role}:${index}:${official ? selected : ''}`; let material = this.uniformMaterials.get(key);
    if (!material) {
      const user = role === '#d9fa6b', ally = role === '#65beed' && !this.appearance.training;
      const color = (role === 'referee' || role === 'assistant') ? '#202d3c' : role === '#65beed' ? '#2477ab' : role === '#dd5860' ? '#b3364b' : '#e9a643';
      const kit: Kit = official ? OFFICIAL_KITS[selected] : user || ally ? this.appearance.kit : { name: 'Uniforme simulado', shirt: color, secondary: '#e8edf0', ink: '#ffffff', shorts: '#1d354d', socks: color, pattern: 'plain' };
      let number = user ? this.appearance.number : index === 1 && role === '#f7af65' ? 1 : index + 2;
      if (!user && number === this.appearance.number) number += 12;
      const canvas = document.createElement('canvas'); paintPixelPlayers(canvas, kit, number, !['referee', 'assistant'].includes(role) && this.appearance.training, index, official ? 'official' : 'player');
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      map.magFilter = map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; map.repeat.set(1 / SPRITE_SIZE.frames, 1 / SPRITE_SIZE.directions); this.textures.push(map);
      material = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: .5, side: THREE.DoubleSide, toneMapped: false });
      this.uniformMaterials.set(key, material);
    }
    return material;
  }
  private actor(index: number, point: Point, color: string) {
    let group = this.actors[index];
    if (!group) {
      group = new THREE.Group();
      const sprite = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.05), this.uniform(index, color)); sprite.position.y = .91; sprite.name = 'pixel-player'; group.add(sprite);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(.28, 20), new THREE.MeshBasicMaterial({ color: '#102317', transparent: true, opacity: .28, depthWrite: false }));
      shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .65; shadow.position.y = .018; group.add(shadow);
      if (color === '#d9fa6b') { const ring = new THREE.Mesh(new THREE.RingGeometry(.33, .365, 32), new THREE.MeshBasicMaterial({ color: '#d9fa6b', transparent: true, opacity: .85, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = .025; group.add(ring); }
      group.userData.yaw = 0; this.scene.add(group); this.actors[index] = group;
    }
    (group.children[0] as T.Mesh).material = this.uniform(index, color);
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
  render(t: Trial | null, aim: Point | null, curve: number, lift: number, phase: ShotPhase = 'preparing', animationTime = 0, charge = 1, incoming: ReceptionFrame | null = null) {
    if (!t) { this.renderer.render(this.scene, this.camera); return; }
    this.zoneOffset = fieldZone(t.kind, t.layout,t.context);
    if (this.previewStart === null) this.previewStart = animationTime;
    this.resize();
    const contactVisible = !!this.contactCanvas.getClientRects().length;
    const celebration = t.outcome === 'goal' ? Math.min(21, Math.floor((animationTime - (this.actors[0]?.userData.goalStart ?? animationTime)) * 7)) : null;
    const key = JSON.stringify([this.size, this.contactSize, t.kind, t.attempt, t.time, this.varView?.phase, this.varView ? Math.floor(this.varView.progress * 90) : null, t.outcome, charge, incoming, aim?.x, aim?.y, curve, lift, phase, this.overview, this.portrait, this.portraitBack, this.goalReview, contactVisible, this.animationPreview, this.animationPreview ? playerAnimationFrame(this.animationPreview, animationTime - this.previewStart!) : null, celebration]);
    if (key === this.renderKey) return; this.renderKey = key;
    this.actors.forEach(a => { a.visible = false; a.userData.receiving=false; }); this.cones.forEach(a => { a.visible = false; }); this.gates.forEach(a => { a.visible = false; });
    if (!this.sprintLanes.length) for (const x of [293, 587]) { const lane = new THREE.Mesh(new THREE.BoxGeometry(.045, .015, 26), this.material('#c4d3a9')); lane.userData.localX = x; this.scene.add(lane); this.sprintLanes.push(lane); }
    this.sprintLanes.forEach(lane => { lane.visible = t.kind === 'speed'; lane.position.copy(this.vector({ x: lane.userData.localX, y: 650 })); lane.position.y = .025; });
    this.line.visible = t.kind === 'vision' || t.kind === 'pass'; this.line.position.z = this.zoneOffset + (t.offsideLine - 95) / 50; let count = 0;
    let focus = t.kind === 'technique' ? t.player : t.origin;
    if (t.kind === 'speed') focus = t.player;
    const midfield = ['pass', 'vision', 'technique', 'speed'].includes(t.kind);
    const centre = this.vector(t.kind === 'speed' ? { x: 440, y: 1160 } : focus); this.reviewMonitor.group.position.z = this.zoneOffset + 13;
    const refStart = this.vector(t.referee.position), monitor = this.reviewMonitor.group.position;
    const walk = this.varView?.phase === 'walk' ? this.varView.progress : this.varView?.phase === 'monitor' ? 1 : 0;
    const refereePosition = refStart.clone().lerp(new THREE.Vector3(monitor.x, 0, monitor.z + 1.1), walk);
    // Identical framing while aiming, choosing curve and shooting: no phase zoom or jump.
    if (this.varView?.phase === 'assistant') { const z = this.zoneOffset + (t.offsideLine - 95) / 50; this.camera.position.set(-30, 2.4, z + 5); this.camera.lookAt(-34.7, 1, z); }
    else if (this.varView?.phase === 'walk') { this.camera.position.set(refereePosition.x + 6, 4, refereePosition.z + 7); this.camera.lookAt(refereePosition.x, 1, refereePosition.z); }
    else if (this.varView?.phase === 'monitor') { this.camera.position.set(monitor.x + 4, 2.8, monitor.z + 4); this.camera.lookAt(monitor.x, 1.3, monitor.z + .4); }
    else if (this.varView?.phase === 'decision') { this.camera.position.set(refStart.x + 3, 2.4, refStart.z + 4); this.camera.lookAt(refStart.x, 1, refStart.z); }
    else if (this.goalReview && t.shot) { const ball = t.shot.ball.position; this.camera.position.set(ball.x + 2, ball.y + 2, ball.z + 1.1); this.camera.lookAt(ball.x, ball.y * .45, ball.z); }
    else if (this.portrait) { const subject = this.vector(['speed', 'technique'].includes(t.kind) ? focus : { x: t.origin.x - 40, y: t.origin.y + 25 }); this.camera.position.set(subject.x + 1.2, 1.35, subject.z + (this.portraitBack ? 3.2 : -3.2)); this.camera.lookAt(subject.x, .95, subject.z); }
    else if (this.overview) { this.camera.position.set(105, 95, 158); this.camera.lookAt(0, 0, 52.5); }
    else { this.camera.position.set(centre.x + .3, midfield ? 8 : 5.4, centre.z + 9.5); this.camera.lookAt(centre.x, 1.05, Math.max(0, centre.z - (midfield ? 5 : 12))); }
    if (contactVisible && phase === 'preparing' && !this.overview && !this.portrait && !this.varView) { const subject=this.vector({x:t.origin.x-40,y:t.origin.y+25}); this.camera.position.set(subject.x+1.6,1.5,subject.z+3.4); this.camera.lookAt(subject.x,1.15,subject.z-.8); }
    this.camera.updateMatrixWorld();
    this.crowds.forEach((crowd, i) => { crowd.position.y = t.outcome === 'goal' && this.appearance.crowd?.homeIsPlayer ? Math.abs(Math.sin(animationTime * 9 + i)) * .16 : 0; });
    if (t.kind === 'technique') {
      this.actor(count++, t.player, '#d9fa6b'); this.ball.position.copy(this.vector(t.ball)); this.ball.position.y = BALL_RADIUS + Math.abs(Math.sin(t.time * 10)) * Math.min(.045, Math.hypot(t.velocity.x, t.velocity.y) / 5000); this.ball.rotation.x = t.ballTravel / 12; this.ball.rotation.z = -t.ballTravel / 24;this.trail.visible=false;
      t.gates.forEach((p,i)=>{
        let gate=this.gates[i];if(!gate){
          gate=new THREE.Group();
          for(const x of [-.92,.92]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.07,.7,8),this.material('#f7eee0'));pole.position.set(x,.35,0);gate.add(pole);}
          const stripe=new THREE.Mesh(new THREE.BoxGeometry(1.8,.018,.12),this.material('#7cf5db'));stripe.position.y=.025;gate.add(stripe);
          const arrow=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.3,.03,.35),new THREE.Vector3(0,.03,0),new THREE.Vector3(.3,.03,.35)]),new THREE.LineBasicMaterial({color:'#7cf5db'}));gate.add(arrow);
          const label=document.createElement('canvas');label.width=label.height=64;const c=label.getContext('2d')!;c.fillStyle='#123c38';c.fillRect(0,0,64,64);c.font='bold 44px sans-serif';c.textAlign='center';c.fillStyle='#e6fff4';c.fillText(String(i+1),32,48);const texture=new THREE.CanvasTexture(label);texture.colorSpace=THREE.SRGBColorSpace;this.textures.push(texture);
          const number=new THREE.Sprite(new THREE.SpriteMaterial({map:texture}));number.position.set(1.15,.85,0);number.scale.set(.42,.42,1);gate.add(number);
          this.scene.add(gate);this.gates[i]=gate;
        }
        gate.visible=i>=t.gate;gate.position.copy(this.vector(p));gate.position.y=0;
        gate.children[0]!.visible=gate.children[1]!.visible=gate.children[4]!.visible=t.context!=='match';
        (gate.children[2] as T.Mesh).material=this.material(i===t.gate?'#7cf5db':'#718768');gate.children[3]!.visible=i===t.gate;
      });
      if(t.context==='match'){t.defenders.forEach(p=>this.actor(count++,p,'#dd5860'));t.mates.forEach(p=>this.actor(count++,p,'#65beed'));}

      t.cones.forEach((p, i) => this.obstacle(i, p));
    } else if (t.kind === 'speed') {
      this.actor(count++, focus, '#d9fa6b'); this.ball.visible = false;
      t.obstacles.filter(o => !o.passed && o.distance - t.distance < 55).forEach((o, i) => this.obstacle(i, { x: [147, 440, 733][o.lane]!, y: 1150 - (o.distance - t.distance) * 20 }));
    } else {
      this.ball.visible = true;
      const approach = t.shot ? Math.sin(Math.min(1, t.shot.elapsed / t.shot.duration) * Math.PI / 2) : 0;
      this.actor(count++, { x: t.origin.x - 40 + approach * 30, y: t.origin.y + 25 - approach * 30 }, '#d9fa6b');
      if (t.kind === 'pass' || t.kind === 'vision') { t.defenders.forEach(p => this.actor(count++, p, '#dd5860')); receivingPlayers(t).forEach((p,i) => {const actor=this.actor(count++,p,'#65beed');actor.userData.receiving=!!t.shot?.support&&(t.kind==='pass'||i===t.shot.support.index);}); }
      else { this.actor(count++, { x: t.shot?.keeper ?? keeperAt(t.time), y: 95 }, '#f7af65'); if (t.kind === 'freekick') [360, 410, 460, 510].forEach(x => this.actor(count++, { x, y: 720 }, '#dd5860')); }
      if (t.shot) {
        const fraction = Math.min(1, t.shot.elapsed / t.shot.duration); const points = Array.from({ length: 41 }, (_, i) => { const p = shotBallPosition(t, t.shot!.elapsed * i / 40); return new THREE.Vector3(p.x, p.y, p.z); }); const body = t.shot.ball.position; points[points.length - 1]!.set(body.x,body.y,body.z); this.ball.position.set(body.x,body.y,body.z);
        this.ball.rotation.x = fraction * 12; this.ball.rotation.z = fraction * t.shot.curve * 8;
        this.setLine(this.trail, points); this.trail.visible = true;

      } else { this.ball.position.copy(this.vector(t.origin)); this.trail.visible = false; }
    }
    const refereeIndex = count; const referee = this.actor(count++, t.referee.position, 'referee'); referee.position.copy(refereePosition); referee.position.y = 0;
    const assistantIndex = count, lineZ = this.zoneOffset + (t.offsideLine - 95) / 50;
    for (const side of [-1, 1]) { const assistant = this.actor(count++, { x: 0, y: 0 }, 'assistant'); assistant.position.set(side * 34.7, 0, side < 0 ? lineZ : 105 - lineZ); assistant.userData.yaw = side < 0 ? -Math.PI / 2 : Math.PI / 2; }

    if (incoming && phase === 'preparing') { this.ball.position.copy(this.vector(t.origin)); this.ball.position.x += incoming.x; this.ball.position.y = incoming.height; this.ball.visible = true; }
    if (t.kind === 'technique') this.ball.visible = true;
    else if (phase !== 'aiming' && t.kind !== 'speed') this.ball.visible = true;
    else if (phase === 'aiming' && ['shoot', 'freekick', 'pass', 'vision'].includes(t.kind)) this.ball.visible = false;
    if (contactVisible && phase === 'preparing') this.ball.visible=false;
    this.dribbleGuide.visible=t.kind==='technique'&&!t.resolved&&!!t.gates[t.gate];
    if(this.dribbleGuide.visible){const from=this.vector(t.player),to=this.vector(t.gates[t.gate]!);from.y=to.y=.035;this.setLine(this.dribbleGuide,[from,to]);}
    this.aimLine.visible = !!aim && !t.shot && !['speed', 'technique'].includes(t.kind);
    if (aim && this.aimLine.visible) { const points = this.path(t, aim, curve, lift, charge * (t.kind === 'freekick' ? .65 : t.kind === 'shoot' ? .85 : 1)); this.setLine(this.aimLine, points); this.canvas.dataset.previewLength = String(points[0]!.distanceTo(points.at(-1)!)); }
    this.actors.forEach((actor, index) => {
      if (!actor.visible) return;
      const previous = actor.userData.attempt === `${t.kind}:${t.attempt}` ? actor.userData.previous as { x: number; z: number; time: number } | undefined : undefined;
      const elapsed = previous ? animationTime - previous.time : 0;
      const dx = previous ? actor.position.x - previous.x : 0, dz = previous ? actor.position.z - previous.z : 0;
      const moving = (index === refereeIndex && this.varView?.phase === 'walk') || !t.resolved && ((elapsed > 0 && elapsed < .15 && Math.hypot(dx, dz) / elapsed > .1) || (index === 0 && t.kind === 'speed' && t.velocity.y > .15));
      let yaw = actor.userData.yaw as number;
      if (moving && Math.hypot(dx, dz) > .001) yaw = Math.atan2(-dx, -dz);
      if (index === 0 && t.kind === 'speed') yaw = sprintHeading(t.velocity.x / GOAL_SCALE, t.velocity.y);
      if (index === 0 && t.kind === 'technique' && Math.hypot(t.velocity.x, t.velocity.y) > 4) yaw = Math.atan2(-t.velocity.x, -t.velocity.y);
      if (index === 0 && !['speed', 'technique'].includes(t.kind) && (aim || t.shot)) {
        const target = this.vector(aim ?? t.shot!.end, !['pass', 'vision'].includes(t.kind));
        yaw = Math.atan2(-(target.x - actor.position.x), -(target.z - actor.position.z));
      }
      if (index === 1 && ['shoot', 'freekick'].includes(t.kind)) yaw = Math.PI;
      const keeper = index === 1 && ['shoot', 'freekick'].includes(t.kind);
      const kickTime = t.shot && (index === 0 || keeper) && !t.resolved ? t.shot.elapsed : null;
      const cameraYaw = Math.atan2(this.camera.position.x - actor.position.x, this.camera.position.z - actor.position.z);
      let direction = spriteFacing(yaw, cameraYaw);
      let frame = spriteFrame(index===0&&t.kind==='technique'?t.travel/450:index===0&&t.kind==='speed'?t.distance/9:animationTime,moving,kickTime,keeper);
      if (actor.userData.receiving && t.shot?.support?.stretching) { frame = t.shot.support.controlled ? 6 : 5; const ball=t.shot.ball.position; yaw=Math.atan2(-(ball.x-actor.position.x),-(ball.z-actor.position.z)); }
      if (keeper && t.shot && t.shot.elapsed > .18 && t.shot.goalkeeper.dive > .15) frame = 7;
      if (index === 0 && incoming && t.shot && t.shot.elapsed < .65) frame = playerAnimationFrame(incoming.kind === 'bounce' ? 'volley' : incoming.kind === 'left-cross' ? 'header' : 'bicycle', t.shot.elapsed);
      if (index === 0 && t.outcome === 'goal') { actor.userData.goalStart ??= animationTime; if (animationTime - actor.userData.goalStart < 3) frame = playerAnimationFrame('celebrate', animationTime - actor.userData.goalStart); }
      else delete actor.userData.goalStart;
      if (index === refereeIndex && ['goal', 'offside'].includes(t.referee.signal)) { actor.userData.signalStart ??= animationTime; frame = playerAnimationFrame(t.referee.signal === 'goal' ? 'goal-check' : 'offside', animationTime - actor.userData.signalStart); } else delete actor.userData.signalStart;
      if (index === assistantIndex && t.referee.signal === 'offside') { actor.userData.flagStart ??= animationTime; frame = playerAnimationFrame('assistant-flag', animationTime - actor.userData.flagStart); } else delete actor.userData.flagStart;
      if (index === refereeIndex && this.varView?.phase === 'walk') { frame = spriteFrame(animationTime, true); yaw = Math.atan2(-(monitor.x - refStart.x), -(monitor.z + 1.1 - refStart.z)); }
      if (index === refereeIndex && this.varView?.phase === 'monitor') { frame = 0; yaw = 0; }
      if (index === 0 && this.portrait && this.animationPreview) frame = playerAnimationFrame(this.animationPreview, animationTime - this.previewStart!);
      direction = spriteFacing(yaw, cameraYaw);
      const sprite = actor.children[0] as T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>;
      sprite.rotation.y = cameraYaw; sprite.rotation.z = keeper && t.shot ? -Math.sign(t.shot.goalkeeper.target - t.shot.goalkeeper.x) * t.shot.goalkeeper.dive * (t.outcome==='save'?1.35:1.1) : index === 0 && t.kind === 'speed' ? -t.velocity.x / 700 * .09 : 0;
      sprite.position.y = keeper && t.shot ? .91 - t.shot.goalkeeper.dive * .45 : .91;
      if (index === 0) this.canvas.dataset.facing = JSON.stringify({ yaw, direction, x: actor.position.x, z: actor.position.z });
      if (index === 0 && this.portrait && (this.animationPreview?.endsWith('-card') || this.animationPreview === 'offside' || this.animationPreview === 'goal-check' || this.animationPreview === 'assistant-flag')) sprite.material = this.uniform(index, 'referee');
      sprite.material.map!.offset.set(frame / SPRITE_SIZE.frames, (SPRITE_SIZE.directions - 1 - direction) / SPRITE_SIZE.directions);
      if (actor.userData.receiving) this.canvas.dataset.receiverFrame=JSON.stringify({frame,facing:direction});
      sprite.userData.frame = frame; sprite.userData.facing = direction;
      actor.userData.yaw = yaw;
      actor.userData.attempt = `${t.kind}:${t.attempt}`;
      actor.userData.previous = { x: actor.position.x, z: actor.position.z, time: animationTime };
    });
    if (this.goalReview) this.actors.forEach(actor => { actor.visible = false; });
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
    this.uniformMaterials.forEach(material => material.dispose()); this.uniformMaterials.clear();
    this.observer.disconnect(); const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>();
    for (const scene of [this.scene, this.contactScene]) scene.traverse(object => { if (object instanceof THREE.InstancedMesh) object.dispose(); const mesh = object as T.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m)); });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.contactTexture.dispose(); this.textures.forEach(t => t.dispose());
    this.renderer.dispose(); this.contactRenderer.dispose(); this.renderer.forceContextLoss(); this.contactRenderer.forceContextLoss();
  }
}
