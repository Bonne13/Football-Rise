import test from 'node:test';
import assert from 'node:assert/strict';
import { createParticipation, plannedMinutes, playerMatchRating, updateParticipation } from './participation.js';
import { configureMatch, createSession, matchPerformance, recordTrial, restoreSession, sessionFinished } from '../../application/drills.js';
import { createTrial } from '../gameplay/trial.js';

test('rating follows actual actions, starts at six, rewards goals and distinguishes saves from intercepted passes',()=>{
  assert.equal(playerMatchRating([]),6);
  assert.ok(playerMatchRating([{score:100,outcome:'goal'}])>playerMatchRating([{score:100,outcome:'received'}]));
  assert.ok(playerMatchRating([{score:0,outcome:'save'}])>playerMatchRating([{score:0,outcome:'intercepted'}]));
  assert.equal(playerMatchRating(Array.from({length:20},()=>({score:100,outcome:'goal'}))),10);
});
test('trust and sustained form earn starts; new prospects enter late from the bench',()=>{
  assert.equal(plannedMinutes('prospect',35,100,[]),15);
  assert.equal(plannedMinutes('reserve',50,100,[]),30);
  assert.equal(plannedMinutes('reserve',80,100,[8,8,8]),75);
  assert.equal(plannedMinutes('reserve',80,60,[8,8,8]),60);
  const p=createParticipation(15,100,35);assert.equal(p.entryMinute,75);assert.equal(p.entered,false);
});
test('fatigue, poor performance and the planned exit can substitute a player, but good actions preserve chances',()=>{
  const good=[{score:100,outcome:'received'},{score:100,outcome:'complete'}];
  const bad=[{score:0,outcome:'intercepted'},{score:0,outcome:'intercepted'}];
  const p=createParticipation(30,100,35);
  assert.equal(updateParticipation(p,good,4).exitMinute,null);
  assert.equal(updateParticipation(p,bad,4).reason,'performance');
  assert.equal(updateParticipation(createParticipation(75,50,80),good,4).reason,'fatigue');
  assert.equal(updateParticipation(createParticipation(75,100,80),[...good,...good],4).reason,'planned');
});
test('substituted sessions stop future opportunities and resume without fabricating minutes or goals',()=>{
  let s=configureMatch(createSession('match',42),30,100,35);
  const t=createTrial('pass',1,42);t.resolved=true;t.outcome='intercepted';t.score=0;
  assert.throws(()=>recordTrial(s,t));s.participation!.entered=true;s=recordTrial(s,t);
  const carry=createTrial('technique',2,42);carry.resolved=true;carry.outcome='intercepted';carry.score=0;s=recordTrial(s,carry);
  assert.equal(sessionFinished(s),true);assert.equal(s.results.length,2);
  const performance=matchPerformance(s,30);assert.equal(performance.minutes,15);assert.equal(performance.goals,0);assert.equal(performance.rating,4.7);
  assert.deepEqual(restoreSession(JSON.stringify(s),createSession('match',42)),s);
  assert.throws(()=>restoreSession(JSON.stringify({...s,participation:{...s.participation,exitMinute:90}}),createSession('match',42)));
  assert.throws(()=>recordTrial(s,{...t,kind:'shoot'}));
});
