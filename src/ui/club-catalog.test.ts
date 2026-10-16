import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFootballPack } from '../data/football-pack.js';
import { catalogSelection } from './club-catalog.js';
test('country, division and accent-insensitive club searches compose without mixing countries', () => {
  const pack=parseFootballPack(readFileSync('web/data/world-leagues.json','utf8'));
  const brazil=catalogSelection(pack,{country:'Brasil',league:'league:Brasil',query:''});assert.equal(brazil.country,'Brasil');assert.equal(brazil.clubs.length,20);assert.ok(brazil.clubs.every(p=>p.club.country==='Brasil'));
  const all=catalogSelection(pack,{country:'Brasil',league:'all',query:'sao'});assert.ok(all.clubs.length>0);assert.ok(all.clubs.some(p=>p.club.name.includes('São')));
  const english=catalogSelection(pack,{country:'Inglaterra',league:'league2:Inglaterra',query:''});assert.equal(english.clubs.length,24);
  assert.equal(catalogSelection(pack,{country:'Brasil',league:'all',query:'zzzz-no-club'}).clubs.length,0);
});
