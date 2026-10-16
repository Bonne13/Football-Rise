import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseFootballPack } from './football-pack.js';
import { createCareer } from '../application/career.js';
import { serializeSave, deserializeSave } from '../persistence/save.js';
const raw = readFileSync('web/data/community-2026-27.json', 'utf8');
test('community snapshot keeps factual names and provenance with explicit coverage limits', () => {
  const p = parseFootballPack(raw);
  assert.equal(p.clubs.length, 238); assert.equal(p.clubs.reduce((sum, c) => sum + c.senior.length, 0), 4605);
  assert.ok(p.clubs.some(c => c.club.name === 'Real Madrid'));
  assert.ok(p.clubs.some(c => c.senior.some(h => h.name.includes('Mbapp'))));
  assert.ok(p.clubs.every(c => c.kits.length === 3 && c.youth.length === 0));
  assert.ok(p.clubs.every(c => c.senior.every(h => !h.numberVerified && !h.source.includes('não confirmado'))));
  const s = createCareer({ name: 'Alex', nationality: 'Brasil', position: 'ST', preferredFoot: 'right', seed: 42, dataPack: p });
  assert.equal(s.clubs.length, 238); assert.deepEqual(deserializeSave(serializeSave(s)), s);
});
test('external packs reject duplicate clubs, numbers, unsafe colors and missing provenance', () => {
  for (const change of [
    (p: ReturnType<typeof parseFootballPack>) => { p.clubs.push(p.clubs[0]!); },
    (p: ReturnType<typeof parseFootballPack>) => { p.clubs[0]!.senior[1]!.number = p.clubs[0]!.senior[0]!.number; },
    (p: ReturnType<typeof parseFootballPack>) => { p.clubs[0]!.kits[0].shirt = 'url(https://example.org)'; },
    (p: ReturnType<typeof parseFootballPack>) => { p.source = ''; },
  ]) { const p = parseFootballPack(raw); change(p); assert.throws(() => parseFootballPack(JSON.stringify(p))); }
});
