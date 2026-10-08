import { useState } from 'react';
import { Cookie, Plus, Trash2, Wallet, Wine } from 'lucide-react';
import type { BankEntry, BankPreset, Logs, Settings } from '../types';
import { autoExtraId, autoMealId, chargedEntries, remaining } from '../lib/bank';
import { addDays, displayDate } from '../lib/dates';
import { categoryName } from '../lib/deviations';
import { newMeal } from '../lib/meals';
import { editDay } from '../store/store';
import { BankSheet } from './BankSheet';
import { Progress } from './ui';

export function BankCard({ date, logs, settings }: { date: string; logs: Logs; settings: Settings }) {
  const [adding, setAdding] = useState<BankPreset['kind']>();
  const entries = chargedEntries(date, logs);
  const outgoing = (logs[date]?.bank ?? []).filter(e => e.chargeDate !== date).map(e => ({ ...e, origin: date }));
  const balance = remaining(date, logs, settings.dailyBankKcal);
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(date, i + 1)).map(d => ({ date: d, spent: settings.dailyBankKcal - remaining(d, logs, settings.dailyBankKcal) })).filter(d => d.spent > 0);
  function remove(entry: BankEntry & { origin: string }) {
    if (entry.kind === 'deviation' && entry.groupId) {
      if (window.confirm('למחוק את החריגה כולה? כל חלקיה יוסרו מהבנק.')) editDay(entry.origin, day => { day.bank = day.bank.filter(b => b.groupId !== entry.groupId); });
      return;
    }
    if (entry.auto && !window.confirm('החיוב קשור לארוחה. מחיקה תסיר את התוספת או תחליף את הארוחה. להמשיך?')) return;
    editDay(entry.origin, day => {
      if (entry.auto) {
        const meal = day.meals.find(m => entry.id === autoMealId(m.slotId) || Array.from({ length: m.extras ?? 0 }, (_, i) => autoExtraId(m.slotId, i)).includes(entry.id));
        if (meal && entry.kind === 'extra') {
          const index = Array.from({ length: meal.extras ?? 0 }, (_, i) => autoExtraId(meal.slotId, i)).indexOf(entry.id);
          day.bank = day.bank.filter(b => b.id !== entry.id).map(b => {
            for (let i = index + 1; i < (meal.extras ?? 0); i++) if (b.id === autoExtraId(meal.slotId, i)) return { ...b, id: autoExtraId(meal.slotId, i - 1) };
            return b;
          });
          meal.extras = Math.max(0, (meal.extras ?? 0) - 1);
        } else if (meal) {
          const fallback = settings.templates.find(t => t.id === settings.slots.find(s => s.id === meal.slotId)?.defaultTemplateId && t.bankChargeSameDay === undefined)
            ?? settings.templates.find(t => t.bankChargeSameDay === undefined);
          Object.assign(meal, newMeal({ id: meal.slotId, name: '', defaultTemplateId: fallback?.id ?? '' }), { extras: 0, freeText: '' });
        }
      } else day.bank = day.bank.filter(b => b.id !== entry.id);
    });
  }
  const renderEntry = (raw: BankEntry & { origin: string }, future = false) => { const entry = raw.kind === 'deviation' ? { ...raw, label: `⚠️ ${categoryName(raw.category, settings)}` } : raw; return <li key={`${entry.origin}-${entry.id}`} className="bank-entry"><div className="grow"><strong>{entry.label}</strong><small>{entry.kcal ? `${entry.kcal} קל׳ במנה · ` : ''}{entry.auto ? 'חיוב מהארוחה · ' : ''}{future ? `לחיוב ב־${displayDate(entry.chargeDate)}` : entry.origin !== date ? `מיום ${displayDate(entry.origin)}` : 'מהיום'}</small></div><strong className="numeric">−{entry.charge}</strong><button className="icon-button" onClick={() => remove(entry)} aria-label={`מחיקת ${entry.label}`}><Trash2 size={17} /></button></li>; };
  return <section className="card bank-card"><div className="row between"><h2><Wallet size={20} /> בנק {settings.dailyBankKcal}</h2><span className="eyebrow">הפינוק שלך, בקצב שלך</span></div>
    <div className="bank-balance"><strong className={balance < 0 ? 'text-danger' : ''}>{balance}</strong><span>קלוריות {balance < 0 ? 'בחריגה' : 'נשארו להיום'}</span></div>
    <Progress label="יתרה בבנק" value={balance < 0 ? settings.dailyBankKcal : balance} max={settings.dailyBankKcal} danger={balance < 0} />
    {entries.length ? <ul className="plain-list">{entries.map(e => renderEntry(e))}</ul> : <p className="muted small-text">עוד לא נוצלו קלוריות מהבנק של היום.</p>}
    {outgoing.length > 0 && <div><h3>מהיום, על חשבון יום אחר</h3><ul className="plain-list">{outgoing.map(e => renderEntry(e, true))}</ul></div>}
    <div className="bank-actions"><button onClick={() => setAdding('snack')}><Cookie size={18} />+ חטיף</button><button onClick={() => setAdding('alcohol')}><Wine size={18} />+ אלכוהול</button><button onClick={() => setAdding('other')}><Plus size={18} />אחר</button></div>
    {upcoming.length > 0 && <details className="upcoming"><summary>{upcoming[0].date === addDays(date, 1) ? 'מחר' : displayDate(upcoming[0].date)} כבר נוצלו {upcoming[0].spent} קל׳</summary>{upcoming.map(d => <p key={d.date} className={d.spent > settings.dailyBankKcal ? 'text-danger small-text' : 'small-text'}>{displayDate(d.date)} · נוצלו {d.spent} מתוך {settings.dailyBankKcal}</p>)}</details>}
    {adding && <BankSheet date={date} kind={adding} onClose={() => setAdding(undefined)} />}
  </section>;
}
