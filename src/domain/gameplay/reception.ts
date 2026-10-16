import type { Attributes } from '../player/player.js';
export type ReceptionKind = 'left-cross' | 'right-cross' | 'bounce';
export interface Reception { kind: ReceptionKind; elapsed: number; contactAt: number; window: number }
export interface ReceptionFrame { kind: ReceptionKind; x: number; height: number; progress: number; canStrike: boolean; expired: boolean }
export function createReception(attempt: number, technique: Attributes['technique']): Reception {
  return { kind: (['left-cross', 'right-cross', 'bounce'] as const)[(attempt - 1) % 3]!, elapsed: 0, contactAt: 1.6, window: .28 + Math.max(0, Math.min(100, technique)) * .003 };
}
export function receptionFrame(r: Reception): ReceptionFrame {
  const delta = r.elapsed - r.contactAt, progress = Math.max(0, Math.min(1, r.elapsed / (r.contactAt + r.window)));
  return { kind: r.kind, x: r.kind === 'bounce' ? 0 : delta * (r.kind === 'left-cross' ? 2.5 : -2.5), height: r.kind === 'bounce' ? .11 + Math.abs(Math.sin(r.elapsed * 4)) * .45 : Math.max(.11, 1.35 - delta * .4), progress, canStrike: Math.abs(delta) <= r.window, expired: delta > r.window };
}
export function receptionQuality(r: Reception): number { return Math.max(0, 1 - Math.abs(r.elapsed - r.contactAt) / r.window); }
