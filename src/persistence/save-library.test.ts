import test from 'node:test';
import assert from 'node:assert/strict';
import { sortedSlots } from './save-library.js';
import { loadCareerText, writeCareerText, saveToSlot, listSaveSlots, removeSaveSlot, activeSaveSlot } from './browser-storage.js';
test('slot metadata validates and sorts newest first without mutating payloads', () => {
  const a = { id: 'slot:a', text: 'original-a', updatedAt: '2026-01-01T00:00:00Z' }, b = { id: 'slot:b', text: 'original-b', updatedAt: '2026-02-01T00:00:00Z' };
  assert.deepEqual(sortedSlots([a, { id: 'bad' }, b, null]), [b, a]);
});
test('fallback preserves independent careers, legacy payload, failed writes and active deletion', async () => {
  const entries = new Map<string, string>(); let fail = false;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => entries.get(k) ?? null, removeItem: (k: string) => entries.delete(k), setItem: (k: string, v: string) => { if (fail) throw new Error('Quota exceeded'); entries.set(k, v); } } });
  entries.set('football-rise.career.v1', 'legacy');
  assert.equal(await loadCareerText(), 'legacy');
  fail = true; await assert.rejects(saveToSlot('legacy', 'slot:old')); assert.equal(await loadCareerText(), 'legacy');
  fail = false; await saveToSlot('legacy', 'slot:old'); await saveToSlot('new', 'slot:new');
  assert.equal(await loadCareerText(), 'new'); assert.equal((await listSaveSlots()).length, 2);
  await writeCareerText('newer'); assert.equal((await listSaveSlots()).find(s => s.id === 'slot:new')!.text, 'newer');
  await removeSaveSlot('slot:old'); assert.equal(await loadCareerText(), 'newer');
  await removeSaveSlot('slot:new'); assert.equal(await loadCareerText(), null); assert.equal(await activeSaveSlot(), null);
  await assert.rejects(saveToSlot('bad', 'career'));
});
