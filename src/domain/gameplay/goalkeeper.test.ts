import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeeper, moveKeeper } from './goalkeeper.js';
import { createTrial, controlTrial, tickTrial } from './trial.js';
test('keeper reacts after a delay, follows observed movement and has finite reach and speed', () => {
  const k=createKeeper();moveKeeper(k,{x:3,y:1},{x:3,y:1},.1,.05);assert.equal(k.x,0);
  for(let i=0;i<10;i++)moveKeeper(k,{x:3,y:1.5},{x:3,y:1.5},.2+i*.05,.05);
  assert.ok(k.x>0&&k.x<3);assert.ok(k.velocity<=2.6);assert.ok(k.dive>0);
  const before=k.x;for(let i=0;i<20;i++)moveKeeper(k,{x:-3,y:.2},{x:-3,y:.2},1+i*.05,.05);assert.ok(k.x<before);
});
test('keeper decision is made in flight, slows shots give more reaction time and seeds preserve outcomes', () => {
  function kick(velocity:number){const t=createTrial('shoot',1,42);controlTrial(t,{type:'kick',aim:{x:300,y:60},curve:0,lift:0,velocity});assert.equal(t.shot!.stoppedBy,null);for(let i=0;i<120&&!t.resolved;i++)tickTrial(t,.05);return t;}
  const slow=kick(35),fast=kick(125);assert.equal(slow.outcome,'save');assert.equal(fast.outcome,'goal');assert.ok(Math.abs(slow.shot!.goalkeeper.x)>Math.abs(fast.shot!.goalkeeper.x));assert.deepEqual(kick(35),slow);
});
