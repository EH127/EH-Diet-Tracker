import { describe, expect, it } from 'vitest';
import type { SnackCategory } from '../types';
import { filterSnackCatalog, snackSelection } from './snacks';
import { remaining } from './bank';
import { bank, day } from './test-helpers';

const catalog: SnackCategory[] = [
  { id: 'ice', name: 'גלידות', emoji: '🍦', items: [{ id: 'gumigam', name: 'גומיגם', kcal: 110 }, { id: 'glidonit', name: 'גלידונית', portion: '4 יחידות', kcal: 150 }] },
  { id: 'chocolate', name: 'שוקולדים', items: [{ id: 'oreo', name: 'אוראו', portion: 'עוגייה', kcal: 50 }, { id: 'mms', name: "M&M's", portion: '20 יחידות', kcal: 100, note: 'הערה' }] },
  { id: 'empty', name: 'ריק', items: [] },
];
const ids = (filtered: SnackCategory[]) => filtered.flatMap(c => c.items.map(i => i.id));
describe('snack picker', () => {
  it('searches Hebrew names and portions, trims whitespace and ignores Latin case', () => {
    expect(ids(filterSnackCatalog(catalog, { query: '  גלידו  ' }))).toEqual(['glidonit']);
    expect(ids(filterSnackCatalog(catalog, { query: 'יחידות' }))).toEqual(['glidonit', 'mms']);
    expect(ids(filterSnackCatalog(catalog, { query: 'm&m' }))).toEqual(['mms']);
    expect(filterSnackCatalog(catalog, { query: 'הערה' })).toEqual([]);
  });
  it('combines category and search filters without changing catalog order or data', () => {
    const before = structuredClone(catalog);
    expect(ids(filterSnackCatalog(catalog))).toEqual(['gumigam', 'glidonit', 'oreo', 'mms']);
    expect(ids(filterSnackCatalog(catalog, { categoryId: 'ice', query: 'יחידות' }))).toEqual(['glidonit']);
    expect(filterSnackCatalog(catalog, { categoryId: 'missing' })).toEqual([]);
    expect(filterSnackCatalog([], { query: 'אוראו' })).toEqual([]); expect(catalog).toEqual(before);
  });
  it('filters by total calories for quantity, including the exact remaining balance', () => {
    expect(ids(filterSnackCatalog(catalog, { quantity: 2, remaining: 200, onlyFits: true }))).toEqual(['oreo', 'mms']);
    expect(ids(filterSnackCatalog(catalog, { quantity: 5, remaining: 250, onlyFits: true }))).toEqual(['oreo']);
    expect(filterSnackCatalog(catalog, { remaining: 0, onlyFits: true })).toEqual([]);
    expect(filterSnackCatalog(catalog, { remaining: -50, onlyFits: true })).toEqual([]);
    expect(ids(filterSnackCatalog(catalog, { quantity: 5, remaining: -50 }))).toHaveLength(4);
  });
  it('uses the chosen charge date balance, including charges originating on other days', () => {
    const logs = { '2026-10-04': day('2026-10-04', { bank: [bank('2026-10-05', 200)] }) };
    expect(ids(filterSnackCatalog(catalog, { remaining: remaining('2026-10-04', logs, 250), onlyFits: true }))).toHaveLength(4);
    expect(ids(filterSnackCatalog(catalog, { remaining: remaining('2026-10-05', logs, 250), onlyFits: true }))).toEqual(['oreo']);
    expect(filterSnackCatalog(catalog, { quantity: 2, remaining: remaining('2026-10-05', logs, 250), onlyFits: true })).toEqual([]);
  });
  it.each([1, 2, 3, 4, 5])('builds a snack entry label and matching calorie charge for quantity %i', quantity => {
    expect(snackSelection(catalog[0].items[1], quantity)).toEqual({ label: `${quantity > 1 ? `${quantity}× ` : ''}גלידונית (4 יחידות)`, kcal: 150 * quantity, charge: 150 * quantity });
  });
  it('omits absent portions and the multiplier for a single serving', () => {
    expect(snackSelection(catalog[0].items[0])).toEqual({ label: 'גומיגם', kcal: 110, charge: 110 });
    expect(snackSelection(catalog[0].items[0], 2)).toEqual({ label: '2× גומיגם', kcal: 220, charge: 220 });
    expect(snackSelection({ ...catalog[0].items[0], portion: '' }).label).toBe('גומיגם');
  });
});
