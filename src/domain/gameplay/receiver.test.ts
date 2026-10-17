import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiver, moveReceiver, segmentContact } from './receiver.js';
import { createTrial, controlTrial, tickTrial, ballPath, receivingPlayers } from './trial.js';
test('swept reach detects a fast ball crossing a leg between frames, but not one outside reach',()=>{
  assert.ok(segmentContact({x:-100,y:40},{x:100,y:40},{x:0,y:0},52)!>0);
  assert.equal(segmentContact({x:-100,y:60},{x:100,y:60},{x:0,y:0},52),null);
});
test('a teammate reacts, runs with bounded speed and stretches instead of teleporting',()=>{
  const r=createReceiver({x:320,y:210});moveReceiver(r,{x:380,y:210},{x:360,y:210},.05,.05);assert.equal(r.position.x,320);
  moveReceiver(r,{x:380,y:210},{x:360,y:210},.2,.05);assert.ok(r.position.x>320&&r.position.x<=330.5);assert.equal(r.stretching,true);
});
function pass(x:number,blocked=false){const t=createTrial('pass',1,42);t.defenders=[{x:20,y:95},{x:860,y:100}];if(blocked)t.defenders.push(ballPath(t.origin,{x,y:210},.45,0));controlTrial(t,{type:'kick',aim:{x,y:210},curve:0,lift:0});for(let i=0;i<50&&!t.resolved;i++)tickTrial(t,.025);return t;}
test('nearby passes are physically controlled; distant passes and earlier interceptions still fail',()=>{
  const nearby=pass(375);assert.equal(nearby.outcome,'received');assert.equal(nearby.shot!.support!.controlled,true);assert.equal(nearby.shot!.support!.stretching,true);assert.ok(nearby.shot!.elapsed<nearby.shot!.duration);
  assert.deepEqual(receivingPlayers(nearby)[0],nearby.shot!.support!.position);assert.ok(Math.abs(nearby.shot!.ball.position.x-(nearby.shot!.support!.position.x-440)/(400/7.32))<1e-8);
  assert.equal(pass(850).outcome,'wide');assert.equal(pass(375,true).outcome,'intercepted');assert.deepEqual(pass(375),nearby);
});

test('a direct fast pass to the visible teammate can be controlled in all three layouts',async()=>{
  const {teammateAt}=await import('./trial.js');
  for(const seed of [0,1,2]){const t=createTrial('pass',1,seed);controlTrial(t,{type:'kick',aim:teammateAt(0,t.layout),curve:0,lift:0,velocity:115});for(let i=0;i<50&&!t.resolved;i++)tickTrial(t,.025);assert.equal(t.outcome,'received');}
});
