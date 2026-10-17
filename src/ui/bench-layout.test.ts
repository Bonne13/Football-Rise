import test from 'node:test';
import assert from 'node:assert/strict';
import { benchLayout } from './bench-layout.js';
import { stadiumFor } from '../data/stadiums.js';
test('local grounds and large arenas have different benches, always outside the pitch and separated',()=>{
  const local=benchLayout(stadiumFor(undefined,true)),arena=benchLayout(stadiumFor({id:'real',name:'Real Madrid',country:'Espanha',reputation:90}));
  assert.equal(local.seats,7);assert.equal(arena.seats,12);assert.notEqual(local.style,arena.style);
  for(const b of [local,arena]){assert.ok(b.x<-34);assert.ok(b.awayZ-b.homeZ>b.length);assert.ok(b.length>5);}
  assert.deepEqual(arena,benchLayout(stadiumFor({id:'real',name:'Real Madrid',country:'Espanha',reputation:90})));
});
