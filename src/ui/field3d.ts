import type * as T from 'three';
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
  private materials = new Map<string, T.MeshLambertMaterial>();
  private actorGeometries = { head: new THREE.SphereGeometry(.14, 12, 8), body: new THREE.CylinderGeometry(.21, .17, .55, 10), limb: new THREE.BoxGeometry(.12, .47, .14) };
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
    this.scene.background = new THREE.Color('#91b6bd'); this.scene.fog = new THREE.Fog('#91b6bd', 65, 160);
    this.scene.add(new THREE.HemisphereLight('#efffff', '#37583b', 2.2));
    const sun = new THREE.DirectionalLight('#fff3db', 2.6); sun.position.set(-12, 25, 18); this.scene.add(sun);
    this.contactScene.add(new THREE.HemisphereLight('#fff', '#325340', 2.3));
    const key = new THREE.DirectionalLight('#fff', 2.1); key.position.set(-2, 4, 5); this.contactScene.add(key);
    this.contactCamera.position.set(0, 0, 3.6);
    this.buildPitch();
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
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), ballMaterial); this.scene.add(this.ball);
    this.contactBall = new THREE.Mesh(new THREE.SphereGeometry(.9, 32, 24), ballMaterial); this.contactScene.add(this.contactBall);
    this.contactMark = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff744c', depthTest: false })); this.contactMark.renderOrder = 5; this.contactScene.add(this.contactMark); this.setContact(0, 0);
    this.aimLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#e0ff87', dashSize: .22, gapSize: .16, depthTest: false })); this.aimLine.renderOrder = 4; this.scene.add(this.aimLine);
    this.trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#efffea', transparent: true, opacity: .65 })); this.scene.add(this.trail);
    this.aimMark = new THREE.Mesh(new THREE.TorusGeometry(.25, .025, 8, 28), new THREE.MeshBasicMaterial({ color: '#deff70', depthTest: false })); this.aimMark.renderOrder = 5; this.scene.add(this.aimMark);
    this.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-8, .04, 3.1), new THREE.Vector3(8, .04, 3.1)]), new THREE.LineBasicMaterial({ color: '#ff963b' })); this.scene.add(this.line);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.observer.observe(contactCanvas); this.resize();
  }
  private material(color: string) { let value = this.materials.get(color); if (!value) { value = new THREE.MeshLambertMaterial({ color }); this.materials.set(color, value); } return value; }
  private buildPitch() {
    for (let i = 0; i < 21; i++) {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(68, 5), this.material(i % 2 ? '#297c49' : '#328b50')); grass.rotation.x = -Math.PI / 2; grass.position.set(0, 0, i * 5 + 2.5); this.scene.add(grass);
    }
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
    // Modest procedural stands keep the scene self-contained and inexpensive.
    for (let row = 0; row < 4; row++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(43, .8 + row * .55, 1.8), this.material(row % 2 ? '#36534c' : '#536c5d'));
      step.position.set(0, (.8 + row * .55) / 2, -6 - row * 1.8); this.scene.add(step);
      const chairs = new THREE.InstancedMesh(new THREE.BoxGeometry(.65, .3, .6), this.material('#ffffff'), 24);
      for (let seat = 0; seat < 24; seat++) {
        chairs.setMatrixAt(seat, new THREE.Matrix4().makeTranslation(-20 + seat * 1.7, 1 + row * .55, -6 - row * 1.8));
        chairs.setColorAt(seat, new THREE.Color(seat % 5 ? '#96b190' : '#d3dc93'));
      }
      chairs.instanceMatrix.needsUpdate = true; this.scene.add(chairs);
    }
  }
  private resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight; if (w && h && this.size !== `${w}:${h}`) { this.size = `${w}:${h}`; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
    const cw = this.contactCanvas.clientWidth, ch = this.contactCanvas.clientHeight; if (cw && ch && this.contactSize !== `${cw}:${ch}`) { this.contactSize = `${cw}:${ch}`; this.contactRenderer.setSize(cw, ch, false); this.contactCamera.aspect = cw / ch; this.contactCamera.updateProjectionMatrix(); }
  }
  private vector(p: Point, goal = false) { const v = worldPoint(p, goal); return new THREE.Vector3(v.x, v.y, v.z); }
  private actor(index: number, point: Point, color: string) {
    let group = this.actors[index];
    if (!group) {
      group = new THREE.Group();
      const body = new THREE.Mesh(this.actorGeometries.body, this.material(color)); body.position.y = 1.05; group.add(body);
      const head = new THREE.Mesh(this.actorGeometries.head, this.material('#d6a27e')); head.position.y = 1.53; group.add(head);
      for (const x of [-.1, .1]) { const leg = new THREE.Mesh(this.actorGeometries.limb, this.material('#20322a')); leg.position.set(x, .48, 0); group.add(leg); }
      for (const x of [-.28, .28]) { const arm = new THREE.Mesh(this.actorGeometries.limb, this.material('#d6a27e')); arm.position.set(x, 1.02, 0); group.add(arm); }
      this.scene.add(group); this.actors[index] = group;
    }
    (group.children[0] as T.Mesh).material = this.material(color); group.position.copy(this.vector(point)); group.position.y = 0; group.visible = true; return group;
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
  render(t: Trial | null, aim: Point | null, curve: number, lift: number) {
    if (!t) { this.renderer.render(this.scene, this.camera); return; }
    this.resize(); this.actors.forEach(a => { a.visible = false; }); this.cones.forEach(a => { a.visible = false; }); this.gates.forEach(a => { a.visible = false; });
    this.line.visible = t.kind === 'vision'; let count = 0;
    let focus = t.kind === 'technique' ? t.player : t.origin;
    if (t.kind === 'speed') focus = { x: [147, 440, 733][t.lane]!, y: 1160 };
    const centre = this.vector(focus);
    this.camera.position.set(centre.x * .45 + .8, 5.5, centre.z + 8.5); this.camera.lookAt(centre.x * .3, .8, Math.max(0, centre.z - 11)); this.camera.updateMatrixWorld();
    if (t.kind === 'technique') {
      this.actor(count++, t.player, '#d9fa6b'); this.ball.position.copy(this.vector({ x: t.player.x + 17, y: t.player.y - 20 }));
      t.gates.forEach((p, i) => { let gate = this.gates[i]; if (!gate) { gate = new THREE.Mesh(new THREE.TorusGeometry(.65, .06, 8, 24), this.material('#d7fa76')); gate.rotation.x = -Math.PI / 2; this.scene.add(gate); this.gates[i] = gate; } gate.visible = i >= t.gate; gate.position.copy(this.vector(p)); gate.position.y = .05; gate.scale.setScalar(i === t.gate ? 1.2 : .8); });
      t.cones.forEach((p, i) => this.obstacle(i, p));
    } else if (t.kind === 'speed') {
      this.actor(count++, focus, '#d9fa6b'); this.ball.visible = false;
      t.obstacles.filter(o => !o.passed && o.distance - t.distance < 55).forEach((o, i) => this.obstacle(i, { x: [147, 440, 733][o.lane]!, y: 1150 - (o.distance - t.distance) * 20 }));
    } else {
      this.ball.visible = true;
      const striker = this.actor(count++, { x: t.origin.x - 40, y: t.origin.y + 25 }, '#d9fa6b');
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
    this.aimLine.visible = !!aim && !t.shot && !['speed', 'technique'].includes(t.kind);
    this.aimMark.visible = this.aimLine.visible;
    if (aim && this.aimLine.visible) { this.setLine(this.aimLine, this.path(t, aim, curve, lift)); this.aimMark.position.copy(this.vector(aim, t.kind !== 'pass' && t.kind !== 'vision')); this.aimMark.rotation.x = t.kind === 'pass' || t.kind === 'vision' ? -Math.PI / 2 : 0; }
    this.renderer.render(this.scene, this.camera);
    if (this.contactCanvas.getClientRects().length) this.contactRenderer.render(this.contactScene, this.contactCamera);
  }
  private obstacle(index: number, p: Point) { let mesh = this.cones[index]; if (!mesh) { mesh = new THREE.Mesh(new THREE.ConeGeometry(.32, .8, 10), this.material('#fa934a')); this.scene.add(mesh); this.cones[index] = mesh; } mesh.visible = true; mesh.position.copy(this.vector(p)); mesh.position.y = .4; }
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
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); this.contactTexture.dispose();
    this.renderer.dispose(); this.contactRenderer.dispose(); this.renderer.forceContextLoss(); this.contactRenderer.forceContextLoss();
  }
}
