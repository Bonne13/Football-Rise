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
