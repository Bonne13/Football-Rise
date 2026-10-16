import test from 'node:test';
import assert from 'node:assert/strict';
import { matchCrowd, crowdReaction } from './crowd.js';
import type { CompetitionWorld, Fixture, Tournament } from '../competitions/world.js';
const tournament = (id: string, level: Tournament['level']): Tournament => ({ id, level, key:id, name:id, season:2026, format:'league',phase:'league',participants:['a','b'],groups:[],waiting:[],champion:null,notice:'' });
function world(win: boolean): CompetitionWorld {
  const fixtures: Fixture[] = Array.from({length:6},(_,i)=>({id:`f${i}`,competitionId:'league',round:i+1,stage:'league',group:0,date:`2026-09-${10+i}`,home:i%2?'b':'a',away:i%2?'a':'b',homeGoals:win?(i%2?0:2):(i%2?2:0),awayGoals:win?(i%2?2:0):(i%2?0:2),penalties:null}));
  return {version:1,protagonistId:'p',season:2026,rng:42,teams:[],tournaments:[tournament('league','senior'),tournament('youth','youth')],fixtures,stats:[],awards:[],history:[],lastDate:'2026-09-20'};
}
test('club performance affects attendance and mood, with a safe neutral season start', () => {
  const good = matchCrowd(world(true),'a',40000,70,'2026-09-20','senior',true);
  const bad = matchCrowd(world(false),'a',40000,70,'2026-09-20','senior',true);
  assert.equal(good.samples,6);assert.equal(good.mood,'empolgada');assert.equal(bad.mood,'cobrando');assert.ok(good.attendance>bad.attendance);
  const first = matchCrowd(world(true),'a',40000,70,'2026-08-01','senior',true);assert.equal(first.samples,0);assert.equal(first.form,.5);
  const youth = matchCrowd(world(true),'a',40000,70,'2026-09-20','youth',true);assert.equal(youth.samples,0);assert.ok(youth.occupancy<good.occupancy);
  assert.deepEqual(matchCrowd(world(true),'a',40000,70,'2026-09-20','senior',true),good);
});
test('home support reacts to goals for its own side and does not celebrate an away goal', () => {
  const crowd = matchCrowd(world(true),'a',40000,70,'2026-09-20','senior',true);
  assert.equal(crowdReaction(crowd,'goal').cheer,true);assert.equal(crowdReaction({...crowd,homeIsPlayer:false},'goal').cheer,false);
  assert.equal(crowdReaction({...crowd,mood:'cobrando'},'wide').message,'A torcida cobra uma reação.');
});
