import type { Kit } from '../data/kits.js';
export const SPRITE_SIZE = { width: 64, height: 80, frames: 50, directions: 4 } as const;
export const PLAYER_ANIMATIONS = {
  header: { label: 'Cabeceio', start: 8, count: 4, fps: 6, loop: true },
  bicycle: { label: 'Bicicleta', start: 12, count: 6, fps: 7, loop: true },
  volley: { label: 'Voleio', start: 18, count: 4, fps: 7, loop: true },
  celebrate: { label: 'Comemoração de gol', start: 22, count: 6, fps: 7, loop: true },
  'yellow-card': { label: 'Árbitro · cartão amarelo', start: 28, count: 4, fps: 5, loop: false },
  'red-card': { label: 'Árbitro · cartão vermelho', start: 32, count: 4, fps: 5, loop: false },
  offside: { label: 'Árbitro · impedimento', start: 42, count: 4, fps: 5, loop: false },
  'goal-check': { label: 'Árbitro · confirmação de gol', start: 46, count: 4, fps: 5, loop: false },
  injury: { label: 'Lesão · queda e dor', start: 36, count: 6, fps: 6, loop: false },
} as const;
export type PlayerAnimation = keyof typeof PLAYER_ANIMATIONS;
export function playerAnimationFrame(action: PlayerAnimation, elapsed: number) {
  const a = PLAYER_ANIMATIONS[action], step = Math.floor(Math.max(0, elapsed) * a.fps);
  return a.start + (a.loop ? step % a.count : Math.min(a.count - 1, step));
}
function poseAt(frame: number) {
  for (const [action, config] of Object.entries(PLAYER_ANIMATIONS)) if (frame >= config.start && frame < config.start + config.count) return { action, step: frame - config.start, progress: (frame - config.start) / (config.count - 1) };
  return { action: '', step: 0, progress: 0 };
}
export function spriteFrame(time: number, moving: boolean, kick: number | null = null, goalkeeper = false) {
  if (kick !== null && kick >= 0 && kick < .65) return goalkeeper ? 7 : kick < .16 ? 5 : 6;
  return moving ? 1 + Math.floor(Math.max(0, time) * 9) % 4 : 0;
}
/** Rows: front, back, right, left; orientation follows the athlete, not the camera. */
export function spriteFacing(playerYaw: number, cameraYaw: number) {
  const angle = Math.atan2(Math.sin(playerYaw + Math.PI - cameraYaw), Math.cos(playerYaw + Math.PI - cameraYaw));
  return Math.abs(angle) < Math.PI / 4 ? 0 : Math.abs(angle) > Math.PI * .75 ? 1 : angle > 0 ? 2 : 3;
}
const DIGITS = [
  ['01110','10001','10011','10101','11001','10001','01110'],
  ['00100','01100','00100','00100','00100','00100','01110'],
  ['01110','10001','00001','00010','00100','01000','11111'],
  ['11110','00001','00001','01110','00001','00001','11110'],
  ['00010','00110','01010','10010','11111','00010','00010'],
  ['11111','10000','10000','11110','00001','00001','11110'],
  ['01110','10000','10000','11110','10001','10001','01110'],
  ['11111','00001','00010','00100','01000','01000','01000'],
  ['01110','10001','10001','01110','10001','10001','01110'],
  ['01110','10001','10001','01111','00001','00001','01110'],
];
function pixelNumber(c: CanvasRenderingContext2D, value: number, y: number, ink: string) {
  const digits = String(value), start = Math.round((48 - (digits.length * 6 - 1)) / 2);
  const pixels: { x: number; y: number }[] = [];
  for (let n = 0; n < digits.length; n++) for (let row = 0; row < 7; row++) for (let col = 0; col < 5; col++) if (DIGITS[Number(digits[n])]![row]![col] === '1') pixels.push({ x: start + n * 6 + col, y: y + row });
  c.fillStyle = '#142130'; for (const p of pixels) c.fillRect(p.x - 1, p.y - 1, 3, 3);
  c.fillStyle = ink; for (const p of pixels) c.fillRect(p.x, p.y, 1, 1);
}
/** Original hand-built pixel silhouettes. No external sprites, logos or licensed artwork. */
export function paintPixelPlayers(canvas: HTMLCanvasElement, kit: Kit, number: number, training: boolean, skinIndex = 0) {
  canvas.width = SPRITE_SIZE.width * SPRITE_SIZE.frames; canvas.height = SPRITE_SIZE.height * SPRITE_SIZE.directions;
  const c = canvas.getContext('2d')!; c.imageSmoothingEnabled = false;
  const skin = ['#c58b61', '#925b3e', '#e1ad80'][skinIndex % 3]!, skinShadow = ['#986542', '#70422d', '#ba8059'][skinIndex % 3]!;
  for (let direction = 0; direction < 4; direction++) for (let frame = 0; frame < SPRITE_SIZE.frames; frame++) {
    c.save(); c.translate(frame * SPRITE_SIZE.width + 8, direction * SPRITE_SIZE.height + 8);
    if (direction === 3) { c.translate(48, 0); c.scale(-1, 1); }
    const pose = poseAt(frame), action = pose.action;
    const side = direction >= 2, back = direction === 1;
    const jump = action === 'header' ? Math.sin(pose.progress * Math.PI) * 8 : action === 'celebrate' ? Math.sin(pose.progress * Math.PI * 2) * 2 : 0;
    const rotation = action === 'bicycle' ? Math.sin(pose.progress * Math.PI) * 1.8 : action === 'injury' ? pose.progress * 1.5 : action === 'volley' ? Math.sin(pose.progress * Math.PI) * -.22 : 0;
    c.translate(24, 32 - jump + (action === 'injury' ? pose.progress * 24 : 0)); c.rotate(rotation); c.translate(-24, -32);
    const stride = frame >= 1 && frame <= 4 ? [0, -3, 0, 3][frame - 1]! : 0;
    const bob = frame === 2 || frame === 4 ? -1 : 0;
    const rect = (x: number, y: number, w: number, h: number, color: string) => { c.fillStyle = color; c.fillRect(x, y + bob, w, h); };
    // Far limbs are shaded; bent knees and alternating boots form a four-frame run cycle.
    const leg = (x: number, offset: number, far: boolean) => {
      if (action === 'volley' && !far && pose.step > 0 && pose.step < 3) { rect(x, 39, 4, 6, skin); rect(x + 3, 38, 9, 4, skin); rect(x + 11, 38, 6, 4, kit.socks); rect(x + 16, 38, 4, 6, '#102133'); return; }
      const knee = !far && (frame === 6 || action === 'volley') ? -7 : action === 'bicycle' ? (far ? 9 : -9) : action === 'injury' ? (far ? -3 : -6) : frame === 5 && !far ? 5 : offset;
      const ankleX = x + 2 + knee, ankleY = 58 + Math.min(0, knee), kneeX = x + 2 + Math.round(knee * .4), kneeY = 48 - Math.round(Math.abs(knee) * .4);
      const segment = (x1: number, y1: number, x2: number, y2: number, color: string) => {
        const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
        for (let i = 0; i <= steps; i++) rect(Math.round(x1 + (x2 - x1) * i / steps) - 2, Math.round(y1 + (y2 - y1) * i / steps), 4, 2, color);
      };
      segment(x + 2, 40, kneeX, kneeY, far ? skinShadow : skin);
      segment(kneeX, kneeY, ankleX, ankleY, skin);
      segment(Math.round(kneeX * .4 + ankleX * .6), Math.round(kneeY * .4 + ankleY * .6), ankleX, ankleY, kit.socks);
      rect(ankleX - 3, ankleY, side ? 8 : 6, 3, '#102133'); rect(ankleX - 2, ankleY, 4, 1, kit.secondary);
    };
    leg(side ? 21 : 18, stride, true); leg(side ? 24 : 26, -stride, false);
    const arm = (x: number, offset: number, far: boolean) => {
      const lifted = frame === 7 || action === 'celebrate' || ((action.endsWith('-card') || action === 'offside') && pose.step > 0 && !far);
      rect(x, lifted ? 17 : 23, 4, 7, training ? '#edf0e8' : kit.shirt);
      rect(x, lifted ? 13 : 29 + Math.min(0, offset), 3, lifted ? 7 : 7 + Math.abs(offset), far ? skinShadow : skin);
      rect(x + (side ? 2 : 0), lifted ? 10 : 35 + offset, 3, 3, skin);
      rect(x, lifted ? 22 : 28, 4, 1, kit.secondary);
    };
    arm(side ? 18 : 14, stride, true);
    // Short-sleeved tapered shirt, with continuous patterns and compact back printing.
    const left = side ? 20 : 17, width = side ? 10 : 15;
    rect(left, 22, width, 16, kit.shirt); rect(left + 1, 20, width - 2, 3, kit.shirt);
    c.save(); c.beginPath(); c.rect(left, 22 + bob, width, 16); c.clip();
    if (!training && kit.pattern !== 'plain') {
      if (kit.pattern === 'stripe') for (let x = left + 3; x < left + width; x += 5) rect(x, 22, 2, 16, kit.secondary);
      else for (let y = 25; y < 38; y += 6) rect(left, y, width, 2, kit.secondary);
    }
    rect(left, 23, 1, 14, '#00000038'); rect(left + width - 1, 23, 1, 14, '#00000038');
    rect(left + 2, 24, 1, 10, '#ffffff16'); rect(left, 37, width, 1, kit.secondary);
    c.restore();
    rect(side ? 20 : 17, 38, side ? 10 : 15, 5, kit.shorts);
    rect(side ? 28 : 17, 38, 1, 5, kit.secondary);
    if (back && !side) pixelNumber(c, number, 26 + bob, kit.ink);
    else if (!side) { rect(28, 25, 2, 3, kit.secondary); rect(28, 25, 1, 1, kit.ink); }
    if (action === 'goal-check' && pose.step > 0) { rect(31, 23, 7, 3, kit.shirt); rect(37, 23, 7, 3, skin); }
    else arm(side ? 27 : 31, -stride, false);
    rect(side ? 23 : 22, 17, 5, 5, skinShadow); rect(side ? 23 : 21, 20, 6, 1, kit.secondary);
    // Smaller head and restrained facial pixels keep the silhouette athletic at match scale.
    c.save(); if (action === 'header') c.translate(Math.round(Math.sin(pose.progress * Math.PI) * 3), 0);
    rect(side ? 21 : 20, 8, 9, 10, skin); rect(side ? 22 : 19, 10, 11, 6, skin);
    rect(side ? 21 : 20, 7, 9, 4, '#252724'); rect(side ? 22 : 21, 6, 7, 2, '#252724');
    if (back) { rect(20, 9, 9, 7, '#252724'); rect(21, 16, 7, 1, skinShadow); }
    else if (side) { rect(29, 12, 2, 3, skin); rect(27, 11, 1, 1, '#1e252a'); rect(27, 16, 2, 1, skinShadow); }
    else { rect(21, 12, 1, 1, '#17222b'); rect(27, 12, 1, 1, '#17222b'); rect(24, 13, 1, 2, skinShadow); rect(23, 16, 3, 1, skinShadow); }
    c.restore();
    if (action.endsWith('-card') && pose.step > 0) { rect(side ? 29 : 32, 5, 5, 7, '#18222c'); rect(side ? 30 : 33, 6, 3, 5, action === 'red-card' ? '#f34043' : '#ffdd40'); }
    c.restore();
  }
}
