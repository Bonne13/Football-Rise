import type { Point } from './trial.js';

export interface CarryState {
  velocity: Point;
  heading: Point;
  sinceTouch: number;
  touches: number;
  foot: number;
}
export function createCarry(): CarryState {
  return { velocity: { x: 0, y: 0 }, heading: { x: 0, y: -1 }, sinceTouch: 1, touches: 0, foot: 1 };
}
/** Short foot impulses separated by free rolling; never teleport the ball to the athlete. */
export function stepCarry(c: CarryState, ball: Point, player: Point, velocity: Point, technique: number, sprint: boolean, dt: number): void {
  const speed = Math.hypot(velocity.x, velocity.y);
  c.sinceTouch += dt;
  if (speed > 4) {
    const angle = Math.atan2(velocity.y, velocity.x), previous = Math.atan2(c.heading.y, c.heading.x);
    const delta = Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous));
    const turn = Math.min(Math.abs(delta), (5 + technique * .05) * dt) * Math.sign(delta);
    c.heading = { x: Math.cos(previous + turn), y: Math.sin(previous + turn) };
  }
  const gap = Math.hypot(player.x - ball.x, player.y - ball.y);
  const cadence = .19 + (100 - technique) * .001 + (sprint ? .07 : 0);
  const ballSpeed=Math.hypot(c.velocity.x,c.velocity.y);
  const turning=ballSpeed>8&&speed>8&&(c.velocity.x*velocity.x+c.velocity.y*velocity.y)/(ballSpeed*speed)<.8;
  const correction=turning&&c.sinceTouch>=.07+(100-technique)*.0003;
  if (speed > 8 && gap < 65 && (c.sinceTouch >= cadence||correction)) {
    c.foot *= -1; c.touches++; c.sinceTouch = 0;
    const lead = 12 + (100 - technique) * .07 + (sprint ? 12 : 0);
    const side = c.foot * 3;
    const target = { x: player.x + velocity.x * cadence + c.heading.x * lead - c.heading.y * side, y: player.y + velocity.y * cadence + c.heading.y * lead + c.heading.x * side };
    const rollingTime = (1 - Math.exp(-.9 * cadence)) / .9;
    c.velocity = { x: (target.x - ball.x) / rollingTime, y: (target.y - ball.y) / rollingTime };
    const magnitude = Math.hypot(c.velocity.x, c.velocity.y), limit = 550;
    if (magnitude > limit) { c.velocity.x *= limit / magnitude; c.velocity.y *= limit / magnitude; }
  } else if (speed <= 8 && gap < 65) {
    // Cushion the last rolling touch while braking, including after a cancelled gesture.
    const blend = 1 - Math.exp(-18 * dt);
    c.velocity.x += ((player.x - ball.x) * 12 - c.velocity.x) * blend;
    c.velocity.y += ((player.y - ball.y) * 12 - c.velocity.y) * blend;
  }
  const drag = Math.exp(-.9 * dt), rollingTime = (1 - drag) / .9;
  ball.x += c.velocity.x * rollingTime; ball.y += c.velocity.y * rollingTime;
  c.velocity.x *= drag; c.velocity.y *= drag;
}
