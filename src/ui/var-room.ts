import type { ReviewIncident } from '../domain/match/video-review.js';
import { reviewVerdict } from '../domain/match/video-review.js';
/** A dedicated broadcast view: three officials and six screens showing the same frozen evidence. */
export class VARroom {
  constructor(private canvas: HTMLCanvasElement) { canvas.width = 1000; canvas.height = 600; }
  draw(incident: ReviewIncident, time: number, final = false) {
    const c = this.canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
    c.fillStyle = '#091722'; c.fillRect(0, 0, 1000, 600);
    c.fillStyle = '#132b3d'; c.fillRect(35, 65, 930, 370);
    c.fillStyle = '#66d8ba'; c.font = 'bold 24px monospace'; c.fillText('CENTRAL DE VÍDEO · FOOTBALL RISE', 45, 40);
    c.font = '12px monospace'; c.fillStyle = '#d2e8e5'; c.fillText('VAR  /  ASSISTENTE VAR  /  OPERADOR DE REPLAY', 45, 58);
    for (let i = 0; i < 6; i++) {
      const x = 65 + i % 3 * 305, y = 88 + Math.floor(i / 3) * 142;
      c.fillStyle = '#030a12'; c.fillRect(x - 8, y - 8, 283, 132);
      drawReviewEvidence(c, incident, x, y, 267, 106, i);
      c.fillStyle = '#78d8b9'; c.font = '10px monospace'; c.fillText(`${(incident.kind === 'offside' ? ['VISTA GERAL', 'RECEPTOR', 'POSIÇÃO NO PASSE', 'PENÚLTIMO OPONENTE', 'DETALHE DA BOLA', 'LINHA DE IMPEDIMENTO'] : ['VISTA DA BALIZA', 'LINHA DO GOL', 'DETALHE', 'VISTA FRONTAL', 'DETALHE DA BOLA', 'BORDA DA LINHA'])[i]} · DADOS CONGELADOS`, x, y + 119);
    }
    // Three independent chairs/operators; consoles, headsets and active replay controls.
    c.fillStyle = '#243c4d'; c.fillRect(45, 412, 910, 105); c.fillStyle = '#5c7784'; c.fillRect(45, 411, 910, 6);
    for (let i = 0; i < 3; i++) {
      const x = 180 + i * 315;
      // Rear view: operators look up toward the monitors, with hands on the desk.
      c.fillStyle = '#071018'; c.fillRect(x - 58, 420, 116, 22);
      for (let k = 0; k < 12; k++) { c.fillStyle = k === Math.floor(time * 2 + i) % 12 ? '#78e3bf' : '#35556b'; c.fillRect(x - 47 + k * 8, 427, 5, 4); }
      const skin = ['#bc865f', '#d3a17d', '#925f45'][i]!;
      // Forearms recede toward the keyboard; no face or chest is visible from this camera.
      c.fillStyle = '#286373'; c.fillRect(x - 35, 429, 13, 39); c.fillRect(x + 23, 429, 13, 39);
      c.fillStyle = skin; c.fillRect(x - 33, 425, 12, 12); c.fillRect(x + 23, 425, 12, 12);
      c.fillStyle = '#1d5060'; c.fillRect(x - 25, 422, 52, 68); c.fillRect(x - 31, 429, 64, 23);
      c.fillStyle = '#286373'; c.fillRect(x - 15, 428, 32, 4);
      c.fillStyle = skin; c.fillRect(x - 7, 412, 16, 13); c.fillRect(x - 19, 391, 40, 26);
      c.fillStyle = ['#252b2d', '#40312b', '#22292b'][i]!;
      c.fillRect(x - 17, 383, 36, 29); c.fillRect(x - 12, 379, 26, 7);
      c.strokeStyle = '#a6c1cb'; c.lineWidth = 5; c.beginPath(); c.arc(x + 1, 401, 23, Math.PI, 0); c.stroke();
      c.fillStyle = '#a3beca'; c.fillRect(x - 24, 399, 7, 15); c.fillRect(x + 19, 399, 7, 15);
      // Knees and shoes project under the console; the backrest overlaps the lower back.
      c.fillStyle = '#172a3a'; c.fillRect(x - 24, 492, 20, 40); c.fillRect(x + 6, 492, 20, 40);
      c.fillStyle = '#09131c'; c.fillRect(x - 27, 526, 23, 9); c.fillRect(x + 6, 526, 23, 9);
      c.fillStyle = '#08131d'; c.fillRect(x - 35, 460, 72, 49); c.fillRect(x - 38, 504, 78, 10);
      c.fillStyle = '#355465'; c.fillRect(x - 28, 466, 58, 35);
      c.fillStyle = '#456372'; c.fillRect(x - 3, 514, 8, 27);
      c.fillStyle = '#0a121a'; c.fillRect(x - 38, 539, 80, 5);
      for (const dx of [-38, 33]) c.fillRect(x + dx, 540, 9, 8);
      // Individual identification belongs to the workstation; officials' clothes stay plain.
      c.fillStyle = '#0a1a25'; c.fillRect(x - 105, 550, 210, 20); c.fillStyle = '#b7e8df'; c.textAlign = 'center'; c.font = 'bold 12px monospace'; c.fillText(['VAR · ÁRBITRO DE VÍDEO', 'AVAR · ASSISTENTE VAR', 'OPERADOR DE REPLAY'][i]!, x, 564); c.textAlign = 'left';
    }
    c.fillStyle = '#07131e'; c.fillRect(0, 572, 1000, 28); c.font = 'bold 18px monospace'; c.fillStyle = final ? '#b4f58d' : '#f3d47d';
    c.fillText(final ? reviewVerdict(incident) : 'ANÁLISE EM ANDAMENTO · DADOS DO LANCE', 40, 593);
  }
}
export function drawReviewEvidence(c: CanvasRenderingContext2D, v: ReviewIncident, x: number, y: number, w: number, h: number, camera: number) {
    c.fillStyle = camera === 1 || camera === 4 ? '#285947' : '#194d3d'; c.fillRect(x, y, w, h);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    if (v.kind === 'offside' && v.offside) {
      const s = v.offside, bodies = [...s.defenders, s.receiver];
      const zoomed = camera === 1 || camera === 5;
      const low = zoomed ? s.receiver.position.z - 4 : Math.min(s.ball.position.z, ...bodies.map(b => b.position.z)) - 3, high = zoomed ? s.receiver.position.z + 4 : Math.max(s.ball.position.z, ...bodies.map(b => b.position.z)) + 3;
      const z = (value: number) => y + 8 + (value - low) / Math.max(1, high - low) * (h - 16);
      const px = (value: number) => x + w / 2 + (value - (zoomed ? s.receiver.position.x : 0)) * (zoomed ? 20 : 10);
      c.strokeStyle = '#fbd063'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, z(s.line)); c.lineTo(x + w, z(s.line)); c.stroke();
      for (const p of bodies) { c.fillStyle = p.id === s.receiver.id ? '#66d7f7' : '#f3797c'; c.fillRect(px(p.position.x) - 4, z(p.position.z) - 5, 8, 10); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(px(s.ball.position.x), z(s.ball.position.z), 3, 0, Math.PI * 2); c.fill();
    } else if (camera % 3 === 0) {
      const scale = Math.min((w - 25) / (v.goal.halfWidth * 2), (h - 20) / v.goal.height), base = y + h - 8;
      c.strokeStyle = '#f4f3e5'; c.lineWidth = 2; c.strokeRect(x + w / 2 - v.goal.halfWidth * scale, base - v.goal.height * scale, v.goal.halfWidth * 2 * scale, v.goal.height * scale);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + w / 2 + v.ball.position.x * scale, base - v.ball.position.y * scale, v.ball.radius * scale, 0, Math.PI * 2); c.fill();
    } else {
      const lineX = x + w * .58, scale = camera === 4 ? 130 : 70;
      c.fillStyle = '#eef3df'; c.fillRect(lineX - 2, y, 4, h);
      const bx = lineX + (v.goal.z - v.ball.position.z) * scale, radius = v.ball.radius * scale;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(bx, y + h * .5, radius, 0, Math.PI * 2); c.fill(); c.fillStyle = '#233843'; c.fillRect(bx - 2, y + h * .5 - 2, 4, 4);
      c.fillStyle = '#d4e8db'; c.font = '10px monospace'; c.fillText(`RAIO ${v.ball.radius.toFixed(2)}m · BORDA DA LINHA`, x + 6, y + h - 8);
    }
    c.restore();
}
