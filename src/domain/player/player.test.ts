import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateOverall, type Attributes } from './player.js';

const base: Attributes = {
  finishing: 50,
  passing: 50,
  vision: 50,
  technique: 50,
  pace: 50,
  strength: 50,
  defending: 50,
  goalkeeping: 50,
  setPieces: 50,
  composure: 50,
};

test('overall reflects positional strengths', () => {
  const striker = { ...base, finishing: 90, composure: 85 };
  assert.ok(calculateOverall('ST', striker) > calculateOverall('CB', striker));
});

test('goalkeeping matters most to goalkeepers', () => {
  const keeper = { ...base, goalkeeping: 95 };
  assert.ok(calculateOverall('GK', keeper) > calculateOverall('ST', keeper));
});
