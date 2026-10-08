import type { DayLog, DaySlot, MealComponent, MealEntry, Settings } from '../types';

export function newMeal(slot: DaySlot, templateId = slot.defaultTemplateId): MealEntry {
  return { slotId: slot.id, templateId, selections: templateId === 'lunch' ? { 'lunch-side': ['salad'] } : {}, done: false };
}
export function newDay(date: string, settings: Settings): DayLog {
  return { date, workout: false, meals: settings.slots.map(slot => newMeal(slot)), bank: [], water: 0, updatedAt: '1970-01-01T00:00:00.000Z' };
}
export function viewDay(day: DayLog | undefined, date: string, settings: Settings): DayLog {
  if (!day) return newDay(date, settings);
  return { ...day, meals: [...settings.slots.map(slot => day.meals.find(m => m.slotId === slot.id) ?? newMeal(slot)), ...day.meals.filter(m => !settings.slots.some(s => s.id === m.slotId))] };
}
export function componentOptions(component: MealComponent, settings: Settings) {
  if (component.kind !== 'choice') return [];
  return settings.groups.filter(g => component.groupIds.includes(g.id)).flatMap(g => g.options);
}
export function isMealComplete(meal: MealEntry, settings: Settings): boolean {
  const template = settings.templates.find(t => t.id === meal.templateId);
  return !!template && template.components.every(c => c.kind !== 'choice' || !c.required ||
    (new Set(meal.selections[c.id] ?? []).size === c.pick && (meal.selections[c.id] ?? []).length === c.pick));
}
export function mealUntouched(meal: MealEntry): boolean {
  return !meal.done && !meal.freeText && !meal.extras && Object.values(meal.selections).every(s => s.length === 0);
}
export function toggleSelection(selected: string[], id: string, pick: number): string[] {
  if (selected.includes(id)) return selected.filter(s => s !== id);
  if (pick === 1) return [id];
  return selected.length < pick ? [...selected, id] : selected;
}
