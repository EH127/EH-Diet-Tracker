import { describe, expect, it } from 'vitest';
import { componentOptions } from './meals';
import { settings } from './test-helpers';
import { isSettings } from './validation';
import type { MealComponent } from '../types';
describe('componentOptions', () => {
  it('offers only the salad for the default lunch side', () => {
    const menu = settings();
    const side = menu.templates.find(t => t.id === 'lunch')!.components.find(c => c.id === 'lunch-side')!;
    expect(componentOptions(side, menu).map(o => o.id)).toEqual(['salad']);
  });
  it('offers every option of the groups when optionIds is missing or empty', () => {
    const menu = settings();
    const side = { ...menu.templates.find(t => t.id === 'lunch')!.components.find(c => c.id === 'lunch-side')! } as Extract<MealComponent, { kind: 'choice' }>;
    delete side.optionIds;
    expect(componentOptions(side, menu).map(o => o.id)).toEqual(['fruit', 'salad']);
    expect(componentOptions({ ...side, optionIds: [] }, menu).map(o => o.id)).toEqual(['fruit', 'salad']);
  });
  it('validates settings with and without optionIds', () => {
    const menu = settings();
    expect(isSettings(menu)).toBe(true);
    const side = menu.templates.find(t => t.id === 'lunch')!.components.find(c => c.id === 'lunch-side') as { optionIds?: unknown };
    delete side.optionIds; expect(isSettings(menu)).toBe(true);
    side.optionIds = [1]; expect(isSettings(menu)).toBe(false);
  });
});
