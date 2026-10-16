const LEGACY_KEY = 'football-rise.career.v1';
const DATABASE = 'football-rise-saves';
const STORE = 'saves';
let database: Promise<IDBDatabase | null> | undefined;
function openDatabase(): Promise<IDBDatabase | null> {
  return database ??= new Promise(resolve => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(DATABASE, 1); } catch { resolve(null); return; }
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
    request.onsuccess = () => { const db = request.result; db.onversionchange = () => { db.close(); database = undefined; }; resolve(db); };
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}
async function operation<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<{ available: boolean; value?: T }> {
  const db = await openDatabase(); if (!db) return { available: false };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode), request = action(tx.objectStore(STORE)); let value: T;
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => resolve({ available: true, value });
    tx.onerror = tx.onabort = () => reject(new Error('Não foi possível salvar/carregar a carreira. Verifique o armazenamento disponível no navegador.'));
  });
}
export async function loadCareerText(): Promise<string | null> {
  const stored = await operation<unknown>('readonly', store => store.get('career'));
  if (stored.available && stored.value !== undefined) { if (typeof stored.value !== 'string') throw new Error('Save inválido. O original foi preservado.'); return stored.value; }
  if (!stored.available) { const library = fallbackLibrary(); const active = library.slots.find(s => s.id === library.active); if (active) return active.text; }
  return localStorage.getItem(LEGACY_KEY);
}
export async function writeCareerText(text: string): Promise<void> {
  const active = await activeSaveSlot();
  if (active) { await saveToSlot(text, active); return; }
  const stored = await operation('readwrite', store => store.put(text, 'career'));
  if (!stored.available) localStorage.setItem(LEGACY_KEY, text);
  else { try { localStorage.removeItem(LEGACY_KEY); } catch { /* IndexedDB is authoritative after a committed transaction. */ } }
}
export async function deleteCareer(): Promise<void> {
  const active = await activeSaveSlot(); if (active) await removeSaveSlot(active);
  await operation('readwrite', store => store.delete('career')); localStorage.removeItem(LEGACY_KEY);
}

// Each write commits the active compatibility copy and its library slot together.
import { sortedSlots, type SaveSlot } from './save-library.js';
const LIBRARY_KEY = 'football-rise.library.v1';
interface Library { active: string | null; slots: SaveSlot[] }
function fallbackLibrary(): Library {
  const raw = localStorage.getItem(LIBRARY_KEY);
  if (!raw) return { active: null, slots: [] };
  const value = JSON.parse(raw) as Library;
  if (!value || !Array.isArray(value.slots) || (value.active !== null && typeof value.active !== 'string') || sortedSlots(value.slots).length !== value.slots.length) throw new Error('Biblioteca inválida. Os saves foram preservados.');
  return value;
}
async function libraryWrite(slot: SaveSlot | null, removeId?: string): Promise<void> {
  const db = await openDatabase();
  if (!db) {
    const library = fallbackLibrary();
    if (slot) { library.slots = [...library.slots.filter(s => s.id !== slot.id), slot]; library.active = slot.id; }
    if (removeId) { library.slots = library.slots.filter(s => s.id !== removeId); if (library.active === removeId) library.active = null; }
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(library));
    localStorage.removeItem(LEGACY_KEY); return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'), store = tx.objectStore(STORE);
    if (slot) { store.put(slot, slot.id); store.put(slot.text, 'career'); store.put(slot.id, 'active-slot'); }
    if (removeId) {
      store.delete(removeId);
      const active = store.get('active-slot');
      active.onsuccess = () => { if (active.result === removeId) { store.delete('career'); store.delete('active-slot'); } };
    }
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(new Error('Não foi possível atualizar a biblioteca. Verifique o espaço disponível.'));
  });
  try { localStorage.removeItem(LEGACY_KEY); } catch {}
}
export async function listSaveSlots(): Promise<SaveSlot[]> {
  const stored = await operation<unknown[]>('readonly', store => store.getAll());
  return stored.available ? sortedSlots(stored.value ?? []) : sortedSlots(fallbackLibrary().slots);
}
export async function saveToSlot(text: string, id: string): Promise<void> {
  if (!id.startsWith('slot:')) throw new Error('Identificador de save inválido.');
  await libraryWrite({ id, text, updatedAt: new Date().toISOString() });
}
export async function activeSaveSlot(): Promise<string | null> {
  const stored = await operation<unknown>('readonly', store => store.get('active-slot'));
  return stored.available ? typeof stored.value === 'string' ? stored.value : null : fallbackLibrary().active;
}
export async function removeSaveSlot(id: string): Promise<void> { await libraryWrite(null, id); }
