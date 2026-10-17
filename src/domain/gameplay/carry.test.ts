import test from 'node:test';
import assert from 'node:assert/strict';
import { createCarry, stepCarry } from './carry.js';
import { controlTrial, createTrial, tickTrial } from './trial.js';

test('a foot impulse is followed by independent rolling without another touch',()=>{
  const c=createCarry(),ball={x:0,y:-20},player={x:0,y:0};
  stepCarry(c,ball,player,{x:0,y:-220},80,false,.025);
  assert.equal(c.touches,1);const y=ball.y,v=c.velocity.y;
  stepCarry(c,ball,player,{x:0,y:-220},80,false,.025);
  assert.equal(c.touches,1);assert.ok(ball.y<y);assert.ok(Math.abs(c.velocity.y)<Math.abs(v));
});
test('turns change heading gradually and touches alternate feet, with shorter control at higher technique',()=>{
  const c=createCarry(),ball={x:0,y:-20},player={x:0,y:0};
  stepCarry(c,ball,player,{x:220,y:0},80,false,.025);
  assert.ok(c.heading.x>0&&c.heading.x<.5);assert.ok(c.heading.y<-.9);
  const feet=new Set<number>();
  for(let i=0;i<40;i++){player.x+=220*.025;stepCarry(c,ball,player,{x:220,y:0},80,false,.025);feet.add(c.foot);}
  assert.equal(feet.size,2);assert.ok(c.touches>=4);
  const counts=[10,90].map(technique=>{const t=createTrial('technique',1,42,100,{technique,pace:50});t.cones=[];controlTrial(t,{type:'steer',direction:{x:0,y:-1}});tickTrial(t,1);return t.carry.touches;});
  assert.ok(counts[1]!>counts[0]!);
});
test('braking cushions a rolling ball and equivalent substeps preserve possession and touch count',()=>{
  const a=createTrial('technique',1,42),b=structuredClone(a);
  for(const t of [a,b]){t.cones=[];controlTrial(t,{type:'steer',direction:{x:.3,y:-.7}});}
  tickTrial(a,1);for(let i=0;i<40;i++)tickTrial(b,.025);
  assert.equal(a.carry.touches,b.carry.touches);assert.equal(a.carry.foot,b.carry.foot);
  assert.ok(Math.abs(a.carry.sinceTouch-b.carry.sinceTouch)<1e-8);
  assert.ok(Math.hypot(a.carry.velocity.x-b.carry.velocity.x,a.carry.velocity.y-b.carry.velocity.y)<1e-8);
  assert.ok(Math.hypot(a.ball.x-b.ball.x,a.ball.y-b.ball.y)<1e-8);
  controlTrial(a,{type:'steer',direction:null});tickTrial(a,1);
  assert.ok(Math.hypot(a.ball.x-a.player.x,a.ball.y-a.player.y)<3);
});

test('repeated sharp changes get corrective touches without losing the ball or snapping its position',()=>{
  for(const sprint of [false,true])for(const technique of [10,90]){
    const t=createTrial('technique',1,42,100,{technique,pace:80});t.cones=[];t.gates=[{x:30,y:120}];
    controlTrial(t,{type:'sprint',active:sprint});
    for(let i=0;i<200;i++){
      const angle=Math.floor(i/15)*Math.PI*.7,before={...t.ball};
      controlTrial(t,{type:'steer',direction:{x:Math.cos(angle),y:Math.sin(angle)}});tickTrial(t,.025);
      assert.ok(Math.hypot(t.ball.x-t.player.x,t.ball.y-t.player.y)<65);
      assert.ok(Math.hypot(t.ball.x-before.x,t.ball.y-before.y)<14);
    }
    assert.ok(t.carry.touches>15);
  }
});
