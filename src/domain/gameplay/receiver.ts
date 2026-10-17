import type { Point } from './trial.js';
export interface ReceiverState { position: Point; velocity: Point; stretching: boolean; controlled: boolean; index: number }
export function createReceiver(position: Point, index = 0): ReceiverState { return { position: {...position}, velocity: {x:0,y:0}, stretching:false, controlled:false, index }; }
export function moveReceiver(r: ReceiverState, target: Point, ball: Point, elapsed: number, dt: number): void {
  if (elapsed < .12 || r.controlled) return;
  const dx=target.x-r.position.x,dy=target.y-r.position.y,d=Math.hypot(dx,dy),speed=Math.min(210,d*6),blend=1-Math.exp(-10*dt);
  r.velocity.x+=((d?dx/d*speed:0)-r.velocity.x)*blend;r.velocity.y+=((d?dy/d*speed:0)-r.velocity.y)*blend;
  r.position.x+=r.velocity.x*dt;r.position.y+=r.velocity.y*dt;
  r.stretching=Math.hypot(ball.x-r.position.x,ball.y-r.position.y)<100;
}
/** A supporting player may meet the route, even when the pass was aimed at another teammate. */
export function receiverRouteTarget(position: Point, route: Point[]): Point | null {
  let nearest: Point | null = null, gap = 180;
  for (const point of route) {
    const d = Math.hypot(position.x - point.x, position.y - point.y);
    if (d < gap) { nearest = point; gap = d; }
  }
  return nearest;
}
/** First swept contact, including fast passes that cross a player's reach between frames. */
export function segmentContact(from: Point, to: Point, center: Point, radius: number): number | null {
  const x=from.x-center.x,y=from.y-center.y,dx=to.x-from.x,dy=to.y-from.y,a=dx*dx+dy*dy,c=x*x+y*y-radius*radius;
  if(c<=0)return 0;if(a<1e-10)return null;const b=2*(x*dx+y*dy),disc=b*b-4*a*c;
  if(disc<0)return null;const u=(-b-Math.sqrt(disc))/(2*a);return u>=0&&u<=1?u:null;
}
