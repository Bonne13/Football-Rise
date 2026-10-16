import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_KITS, officialsColor, type OfficialsColor } from './official-kits.js';
test('officials have three plain-shirt options, black shorts/socks and deterministic contrast selection', () => {
  assert.deepEqual(Object.keys(OFFICIAL_KITS), ['black', 'yellow', 'red']);
  for (const [key, kit] of Object.entries(OFFICIAL_KITS)) { assert.equal(kit.pattern, 'plain'); assert.equal(kit.shorts, '#141c26'); assert.equal(kit.socks, '#141c26'); assert.equal(officialsColor(key as OfficialsColor, ['#ffffff']), key); }
  for (const kit of Object.values(OFFICIAL_KITS)) assert.notEqual(OFFICIAL_KITS[officialsColor('auto', [kit.shirt])].shirt, kit.shirt);
});
