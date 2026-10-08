import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY } from '../lib/storage';
import { parseBackup } from '../lib/validation';

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear(); vi.resetModules();
  vi.stubGlobal('window', { localStorage: { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => memory.set(k, v), removeItem: (k: string) => memory.delete(k) } });
});
afterEach(() => vi.unstubAllGlobals());
describe('persisted store', () => {
  it('persists meals, bank, workout, water, weight and notes across a reload', async () => {
    let store = await import('./store');
    store.editDay('2026-10-08', d => { d.workout = true; d.water = 4; d.weight = 75.5; d.notes = 'יום טוב'; d.meals[2].templateId = 'eatOut'; d.meals[2].extras = 1; d.meals[2].done = true; d.meals[2].selections = { 'eatout-food': ['pizza'] }; });
    const before = store.getState(); expect(before.meta.dirtyDays).toContain('2026-10-08');
    vi.resetModules(); store = await import('./store');
    expect(store.getState()).toEqual(before); expect(store.getState().logs['2026-10-08'].bank).toHaveLength(2);
  });
  it('exports, clears, and imports all editable settings and logs', async () => {
    const store = await import('./store');
    store.editSettings(s => { s.dailyBankKcal = 400; s.groups[0].options.push({ id: 'unique-food', name: 'חדש', amount: 'כוס', active: true }); });
    store.editDay('2026-10-08', d => { d.notes = 'restore me'; d.water = 3; });
    const backup = parseBackup(JSON.parse(JSON.stringify(store.getState())));
    store.clearLocalData(); expect(memory.has(STORAGE_KEY)).toBe(false); expect(store.getState().logs).toEqual({});
    store.importBackup(backup, 'replace');
    expect(store.getState().settings.dailyBankKcal).toBe(400); expect(store.getState().logs['2026-10-08'].notes).toBe('restore me');
    expect(store.getState().settings.groups[0].options.at(-1)?.id).toBe('unique-food');
    expect(store.getState().meta.dirtyDays).toEqual(['2026-10-08']);
  });
  it('updates automatic charges when template settings change and removes them when swapping away', async () => {
    const store = await import('./store');
    store.editDay('2026-10-08', d => { d.meals[2].templateId = 'eatOut'; });
    store.editSettings(s => { s.templates.find(t => t.id === 'eatOut')!.bankChargeSameDay = 300; });
    expect(store.getState().logs['2026-10-08'].bank[0].charge).toBe(300);
    store.editDay('2026-10-08', d => { d.meals[2].templateId = 'dairyDinner'; });
    expect(store.getState().logs['2026-10-08'].bank).toEqual([]);
  });
});
