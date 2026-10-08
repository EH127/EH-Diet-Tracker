import { describe, expect, it } from 'vitest';
import { eveningSummary } from './summary';
import { bank, day, settings } from './test-helpers';
import type { Logs } from '../types';

describe('evening summary', () => {
  it('summarizes meals, bank, water and a limit at its cap', () => {
    const menu = settings();
    const log = day('2026-10-08', { water: 5 });
    log.meals.forEach((m, i) => { m.done = i === 0; });
    log.meals[1].selections['lunch-protein'] = ['salmon'];
    const logs: Logs = { [log.date]: log };
    const { title, body } = eveningSummary(log.date, logs, menu);
    expect(title).toBe('סיכום היום 🌙');
    expect(body).toContain(`סימנת 1 מתוך ${menu.slots.length} ארוחות`);
    expect(body).toContain(`בבנק נשארו ${menu.dailyBankKcal} קל׳`);
    expect(body).toContain(`מים 5/${menu.waterGoal}`);
    expect(body.length).toBeLessThan(180);
  });
  it('celebrates when all meals are done and reports bank overdraft', () => {
    const menu = settings();
    const log = day('2026-10-08'); log.meals.forEach(m => { m.done = true; });
    log.bank.push(bank(log.date, menu.dailyBankKcal + 120));
    const { body } = eveningSummary(log.date, { [log.date]: log }, menu);
    expect(body).toContain('כל הארוחות סומנו 💪');
    expect(body).toContain('חריגה של 120 קל׳');
  });
  it('adds a short deviations part, singular and plural', () => {
    const menu = settings();
    const log = day('2026-10-08'); log.bank.push({ id: crypto.randomUUID(), kind: 'deviation' as const, label: 'מתוק', kcal: 120, charge: 120, chargeDate: '2026-10-08', groupId: 'g1', category: 'sweet' });
    expect(eveningSummary(log.date, { [log.date]: log }, menu).body).toContain('חריגה אחת · 120 קל׳');
    log.bank.push({ id: crypto.randomUUID(), kind: 'deviation' as const, label: 'מתוק', kcal: 100, charge: 100, chargeDate: '2026-10-08', groupId: 'g2', category: 'sweet' }, { id: crypto.randomUUID(), kind: 'deviation' as const, label: 'מתוק', kcal: 130, charge: 130, chargeDate: '2026-10-09', groupId: 'g2', category: 'sweet' });
    expect(eveningSummary(log.date, { [log.date]: log }, menu).body).toContain('2 חריגות · 350 קל׳');
  });
  it('names at most two limits that are at or over the cap', () => {
    const menu = settings();
    const log = day('2026-10-08'); log.meals.forEach(m => { m.templateId = 'eatOut'; });
    const { body } = eveningSummary(log.date, { [log.date]: log }, menu);
    expect(body).toContain('השבוע (חריגה)');
    expect(body.split('השבוע').length - 1).toBeLessThanOrEqual(2);
  });
});
