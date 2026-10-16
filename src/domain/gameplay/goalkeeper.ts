export interface KeeperState { x: number; height: number; velocity: number; dive: number; target: number }
export function createKeeper(): KeeperState { return { x: 0, height: 1.05, velocity: 0, dive: 0, target: 0 }; }
/** React to the observed ball with a short anticipation, rather than deciding a save at kick-off. */
export function moveKeeper(k: KeeperState, ball: {x:number;y:number}, predicted: {x:number;y:number}, elapsed: number, dt: number): void {
  if (elapsed < .18) return;
  k.target = Math.max(-3.45, Math.min(3.45, predicted.x));
  const desired = Math.max(-2.6, Math.min(2.6, (k.target - k.x) * 6));
  k.velocity += (desired - k.velocity) * (1 - Math.exp(-11 * dt));
  k.x = Math.max(-3.45, Math.min(3.45, k.x + k.velocity * dt));
  k.height += (Math.max(.55, Math.min(1.65, ball.y)) - k.height) * (1 - Math.exp(-5 * dt));
  k.dive = Math.min(1, Math.abs(k.target - k.x) / 1.2);
}
export function keeperTouches(k: KeeperState, ball: {x:number;y:number}): boolean {
  return Math.abs(ball.x-k.x) <= .48 + k.dive * .48 && Math.abs(ball.y-k.height) <= .68;
}
