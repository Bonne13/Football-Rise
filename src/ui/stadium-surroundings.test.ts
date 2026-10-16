import test from 'node:test';
import assert from 'node:assert/strict';
import { surroundingLayout } from './stadium-surroundings.js';
import { stadiumFor } from '../data/stadiums.js';
test('districts are deterministic, leave stadium access clear and keep homes off roads', () => {
  const footprint = { halfX: 65, halfZ: 100 };
  for (const name of ['Santos', 'Flamengo', 'Arsenal', 'União do Vale']) {
    const profile = stadiumFor({ id: name, name, country: name === 'Arsenal' ? 'Inglaterra' : 'Brasil', reputation: 80 });
    const homes = surroundingLayout(profile, footprint);
    assert.ok(homes.length > 15); assert.deepEqual(homes, surroundingLayout(profile, footprint));
    for (const b of homes) {
      assert.ok(Math.abs(b.x) - b.width / 2 > footprint.halfX + 20 || Math.abs(b.z - 52.5) - b.depth / 2 > footprint.halfZ + 20);
      assert.ok(b.height >= 3 && b.height <= 18);
      for (const offset of [19, 53, 87]) {
        assert.ok(Math.abs(Math.abs(b.x) - footprint.halfX - offset) >= b.width / 2 + 8);
        assert.ok(Math.abs(Math.abs(b.z - 52.5) - footprint.halfZ - offset) >= b.depth / 2 + 8);
      }
    }
  }
});
test('rural grounds have a lower density than cities, and venue seeds vary the neighbourhood', () => {
  const footprint = { halfX: 50, halfZ: 80 }, base = stadiumFor();
  const rural = surroundingLayout({ ...base, landscape: 'rural' }, footprint);
  const city = surroundingLayout({ ...base, landscape: 'urban' }, footprint);
  assert.ok(city.length > rural.length);
  assert.notDeepEqual(city, surroundingLayout({ ...base, landscape: 'urban', seed: base.seed + 1 }, footprint));
});
