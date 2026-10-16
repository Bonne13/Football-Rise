import test from 'node:test';
import assert from 'node:assert/strict';
import { districtPlan, roadDistance } from '../data/stadium-districts.js';
import { stadiumFor } from '../data/stadiums.js';
const footprint = { halfX: 65, halfZ: 100 };
const profile = (name: string, country = 'Brasil') => stadiumFor({ id: name, name, country, reputation: 80 });
test('districts reproduce their layout and leave the pitch and actual road paths clear', () => {
  for (const [name, country] of [['Vasco','Brasil'], ['Santos','Brasil'], ['Bournemouth','Inglaterra'], ['Eibar','Espanha'], ['Flamengo','Brasil']]) {
    const p = profile(name!, country!), plan = districtPlan(p, footprint);
    assert.deepEqual(plan, districtPlan(p, footprint)); assert.ok(plan.homes.length > 0);
    for (const b of plan.homes) {
      assert.ok(Math.abs(b.x) - b.width / 2 >= footprint.halfX + 5 || Math.abs(b.z - 52.5) - b.depth / 2 >= footprint.halfZ + 5);
      for (const r of plan.roads) assert.ok(roadDistance(b.x, b.z - 52.5, r) >= r.width / 2 + Math.hypot(b.width,b.depth) / 2 + 2 - 1e-8);
    }
  }
});
test('five reviewed venues have structurally different districts, not just different seeds', () => {
  const plans = [['Vasco','Brasil'], ['Santos','Brasil'], ['Bournemouth','Inglaterra'], ['Eibar','Espanha'], ['Flamengo','Brasil']].map(([n,c]) => districtPlan(profile(n!,c!),footprint));
  assert.equal(new Set(plans.map(p => p.kind)).size, 5);
  assert.equal(new Set(plans.map(p => JSON.stringify(p.roads))).size, 5);
  assert.ok(plans[2]!.trees.length > plans[0]!.trees.length);
  assert.ok(plans[3]!.homes.some(b => b.base > 0));
  assert.ok(plans[1]!.homes.some(b => b.height > 18));
});
test('countries change architectural palette and roofing, shared venues retain their district', () => {
  const base = profile('Unknown');
  const plans = ['Brasil','Inglaterra','França','Alemanha','Itália','Espanha'].map(country => districtPlan({...base,country,landscape:'urban',capacity:25000},footprint));
  assert.equal(new Set(plans.map(p => JSON.stringify(p.palette))).size,6);
  assert.ok(plans[1]!.homes.every(b => b.roof === 'slate'));
  assert.deepEqual(districtPlan(profile('Flamengo'),footprint),districtPlan(profile('Fluminense'),footprint));
});


test('all 238 club grounds receive country-aware districts with unique venue access layouts', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseFootballPack } = await import('../data/football-pack.js');
  const clubs = parseFootballPack(readFileSync('web/data/community-2026-27.json','utf8')).clubs;
  const byVenue = new Map<string,string>(); const byLayout = new Map<string,string>();
  for (const {club} of clubs) {
    const p = stadiumFor(club), plan = districtPlan(p,footprint), signature = JSON.stringify(plan.roads);
    assert.ok(plan.homes.length > 0,club.name);assert.ok(plan.roads.length >= 3,club.name);
    if (byVenue.has(p.venueId)) assert.equal(byVenue.get(p.venueId),signature);
    else { assert.ok(!byLayout.has(signature),`${club.name} reused ${byLayout.get(signature)}`);byLayout.set(signature,club.name);byVenue.set(p.venueId,signature); }
    assert.deepEqual(plan,districtPlan(p,footprint));
    for (const b of plan.homes) for (const r of plan.roads) assert.ok(roadDistance(b.x,b.z-52.5,r) >= r.width/2 + Math.hypot(b.width,b.depth)/2 + 2 - 1e-8,club.name);
  }
  assert.equal(clubs.length,238);assert.ok(byVenue.size > 225);
});
