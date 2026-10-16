/** Slot metadata lives outside the versioned career payload. */
export interface SaveSlot { id: string; updatedAt: string; text: string }
export function isSaveSlot(value: unknown): value is SaveSlot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<SaveSlot>;
  return typeof s.id === 'string' && s.id.startsWith('slot:') && typeof s.text === 'string' && typeof s.updatedAt === 'string' && Number.isFinite(Date.parse(s.updatedAt));
}
export function sortedSlots(values: unknown[]): SaveSlot[] {
  return values.filter(isSaveSlot).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id));
}
