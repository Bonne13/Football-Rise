import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, advanceCareer } from '../../application/career.js';
import { initialYouthClub } from './placement.js';
import { ATTRIBUTES } from '../career/state.js';
import { serializeSave, deserializeSave } from '../../persistence/save.js';

function assessed(){let s=createCareer({name:'Talento',nationality:'Brasil',position:'ST',preferredFoot:'right',startingAge:14,seed:42});return advanceCareer(s,{type:'assess',performances:Object.fromEntries(ATTRIBUTES.map(k=>[k,80])) as typeof s.player.attributes});}
test('initial clubs are assigned after assessment, by performance, always to youth, with a valid number and budget',()=>{
  const s=assessed();assert.equal(s.contract,null);
  const weak=advanceCareer(s,{type:'place-youth',quality:0}),strong=advanceCareer(s,{type:'place-youth',quality:100});
  assert.equal(weak.contract!.team,'youth');assert.equal(strong.contract!.team,'youth');
  assert.notEqual(weak.contract!.clubId,strong.contract!.clubId);assert.ok(strong.coachTrust>weak.coachTrust);
  const club=strong.clubs.find(c=>c.id===strong.contract!.clubId)!,before=s.clubs.find(c=>c.id===club.id)!;
  assert.equal(club.youthPlaces,before.youthPlaces-1);assert.ok(club.wageBudget<before.wageBudget);
  assert.ok(strong.shirt.number>=1);assert.deepEqual(strong,advanceCareer(s,{type:'place-youth',quality:100}));
  assert.equal(strong.stage,'assessed');assert.equal(strong.trainingSessions,0);
  assert.deepEqual(deserializeSave(serializeSave(strong)),strong);
  const trained=advanceCareer(strong,{type:'practice',focus:'passing',quality:80});assert.equal(trained.stage,'contracted');assert.doesNotThrow(()=>serializeSave(advanceCareer(trained,{type:'prepare'})));
  assert.throws(()=>advanceCareer(strong,{type:'place-youth',quality:100}));
});
test('recruitment respects capacity, money and sporting requirements; no available club leaves training accessible',()=>{
  const s=assessed();s.clubs.forEach(c=>c.youthPlaces=0);
  assert.equal(initialYouthClub(s.player,s.clubs,80),null);
  const waiting=advanceCareer(s,{type:'place-youth',quality:80});assert.equal(waiting.contract,null);assert.equal(waiting.stage,'assessed');
  assert.equal(advanceCareer(waiting,{type:'practice',focus:'passing',quality:80}).stage,'trained');
});
