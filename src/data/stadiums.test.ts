import test from 'node:test';
import assert from 'node:assert/strict';
import { stadiumFor } from './stadiums.js';
test('stadium size follows club profile and training uses a local ground', () => {
  const club = { id: 'vale', name: 'União do Vale', country: 'Brasil', reputation: 25 };
  assert.equal(stadiumFor(club).size, 'local');
  assert.equal(stadiumFor({ ...club, reputation: 55 }).size, 'regional');
  assert.equal(stadiumFor({ ...club, reputation: 80 }).size, 'arena');
  assert.equal(stadiumFor({ ...club, reputation: 80 }, true).size, 'local');
});
test('known cities choose regional scenery; unknown cities stay explicitly uncatalogued', () => {
  assert.equal(stadiumFor({ id: 'm', name: 'Real Madrid', country: 'Espanha', reputation: 90 }).city, 'Madri');
  assert.equal(stadiumFor({ id: 'f', name: 'Flamengo', country: 'Brasil', reputation: 80 }).landscape, 'mountains');
  assert.equal(stadiumFor({ id: 'b', name: 'Barcelona', country: 'Espanha', reputation: 90 }).landscape, 'coastal');
  const unknown = stadiumFor({ id: 'x', name: 'Clube desconhecido', country: 'Inglaterra', reputation: 50 });
  assert.equal(unknown.city, 'Cidade não catalogada'); assert.equal(unknown.landscape, 'rural'); assert.equal(unknown.simulated, true);
  assert.deepEqual(stadiumFor({ id: 'x', name: 'Clube desconhecido', country: 'Inglaterra', reputation: 50 }), unknown);
});

test('every bundled club has a named home reference and a deterministic stadium', async () => {
  const { readFileSync } = await import('node:fs');
  const { parseFootballPack } = await import('./football-pack.js');
  const { STADIUM_REFERENCES } = await import('./stadium-reference.js');
  const clubs = parseFootballPack(readFileSync('web/data/community-2026-27.json', 'utf8')).clubs;
  assert.equal(STADIUM_REFERENCES.length, clubs.length);
  for (const { club } of clubs) {
    const s = stadiumFor(club);
    assert.equal(s.reference, 'historical', club.name); assert.notEqual(s.city, 'Cidade não catalogada');
    assert.ok(s.capacity >= 3000 && s.capacity <= 100000); assert.deepEqual(stadiumFor(club), s);
    const training = stadiumFor(club, true); assert.equal(training.reference, 'training'); assert.equal(training.size, 'local'); assert.equal(training.track, false);
    assert.notEqual(training.venueId, s.venueId);
  }
  assert.equal(new Set(clubs.map(({ club }) => stadiumFor(club).id)).size, clubs.length);
});
test('shared home grounds stay shared while distinct architectures preserve field dimensions', () => {
  const club = (name: string, country = 'Brasil') => ({ id: name, name, country, reputation: 90 });
  const maracana = stadiumFor(club('Flamengo'));
  const flu = stadiumFor(club('Fluminense'));
  assert.equal(maracana.venueId, flu.venueId); assert.equal(maracana.seed, flu.seed); assert.deepEqual(maracana.seatColors, flu.seatColors);
  assert.equal(maracana.name, 'Maracanã'); assert.equal(maracana.shape, 'oval'); assert.equal(maracana.track, false);
  assert.equal(stadiumFor(club('Botafogo')).track, true);
  assert.equal(stadiumFor(club('Bayern München', 'Alemanha')).facade, 'ribs');
  assert.equal(stadiumFor(club('Liverpool', 'Inglaterra')).shape, 'rectangular');
  assert.equal(stadiumFor(club('Inter', 'Itália')).venueId, stadiumFor(club('Milan', 'Itália')).venueId);
  assert.notEqual(stadiumFor(club('Santos')).venueId, maracana.venueId);
});
