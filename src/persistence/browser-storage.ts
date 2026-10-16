const LEGACY_KEY = 'football-rise.career.v1';
const DATABASE = 'football-rise-saves';
const STORE = 'saves';
let database: Promise<IDBDatabase | null> | undefined;
function openDatabase(): Promise<IDBDatabase | null> {
  return database ??= new Promise(resolve => {
    if (!('indexedDB' in globalThis)) { resolve(null); return; }
    const request = indexedDB.open(DATABASE, 1);
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
  return localStorage.getItem(LEGACY_KEY);
}
export async function writeCareerText(text: string): Promise<void> {
  const stored = await operation('readwrite', store => store.put(text, 'career'));
  if (!stored.available) localStorage.setItem(LEGACY_KEY, text);
  else { try { localStorage.removeItem(LEGACY_KEY); } catch { /* IndexedDB is authoritative after a committed transaction. */ } }
}
export async function deleteCareer(): Promise<void> {
  await operation('readwrite', store => store.delete('career')); localStorage.removeItem(LEGACY_KEY);
}
