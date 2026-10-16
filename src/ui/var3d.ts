import { drawReviewEvidence } from './var-room.js';
import type { ReviewIncident } from '../domain/match/video-review.js';
import type * as T from 'three';
declare const THREE: typeof T;
/** Pitch-side review area. Its screens are original procedural assets. */
export function buildReviewMonitor(scene: T.Scene) {
  const group = new THREE.Group(); group.name = 'pitch-side-var-monitor'; group.position.set(-35.5, 0, 13);
  const material = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: .8 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: string) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color)); mesh.position.set(x, y, z); group.add(mesh); };
  box(1.8, .08, 1.6, 0, .04, 0, '#25384a'); box(.14, 1.3, .14, 0, .7, 0, '#354e60');
  box(1.15, .8, .13, 0, 1.6, 0, '#0b1726'); box(1.5, .08, .9, 0, 2.15, -.12, '#16283c');
  for (const side of [-1, 1]) box(.08, 1.8, .8, side * .74, 1.2, -.12, '#253d53');
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 160; const c = canvas.getContext('2d')!;
  c.fillStyle = '#103e32'; c.fillRect(0, 0, 256, 160); c.strokeStyle = '#dcece2'; c.lineWidth = 4; c.strokeRect(12, 24, 232, 120); c.beginPath(); c.moveTo(160, 24); c.lineTo(160, 144); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(180, 89, 10, 0, Math.PI * 2); c.fill(); c.font = 'bold 18px monospace'; c.fillText('VAR · REVISÃO', 12, 19);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.03, .66), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })); screen.position.set(0, 1.6, .075); group.add(screen);
  scene.add(group); return { group, texture, setIncident(incident: ReviewIncident) { c.clearRect(0, 0, 256, 160); drawReviewEvidence(c, incident, 0, 24, 256, 136, incident.kind === 'offside' ? 0 : 1); c.fillStyle = '#0b1925'; c.fillRect(0, 0, 256, 24); c.fillStyle = '#e5f5e8'; c.font = 'bold 16px monospace'; c.fillText(incident.kind === 'offside' ? 'VAR · IMPEDIMENTO' : 'VAR · LINHA DO GOL', 8, 18); texture.needsUpdate = true; } };
}
