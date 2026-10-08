import { Check, ChevronDown } from 'lucide-react';
import type { DayLog, MealEntry, Settings, Logs } from '../types';
import { componentOptions, isMealComplete, newMeal, toggleSelection } from '../lib/meals';
import { weeklyLimits } from '../lib/weekly';
import { autoExtraId } from '../lib/bank';
import { addDays } from '../lib/dates';
import { editDay } from '../store/store';
import { Field, Stepper } from './ui';

export function MealCard({ meal, day, settings, logs }: { meal: MealEntry; day: DayLog; settings: Settings; logs: Logs }) {
  const template = settings.templates.find(t => t.id === meal.templateId);
  const slot = settings.slots.find(s => s.id === meal.slotId);
  const limits = weeklyLimits(day.date, logs, settings);
  const allOptions = settings.groups.flatMap(g => g.options);
  const update = (change: (m: MealEntry) => void) => editDay(day.date, d => { const m = d.meals.find(m => m.slotId === meal.slotId); if (m) change(m); });
  const complete = isMealComplete(meal, settings);
  const templateLimit = limits.find(l => l.kind === 'template' && l.id === meal.templateId);
  const orphanSelections = Object.entries(meal.selections).filter(([id, selections]) => selections.length && !template?.components.some(c => c.id === id));
  return <article className={`card meal-card ${meal.done ? 'meal-done' : ''}`}>
    <div className="meal-heading"><span className="meal-emoji" aria-hidden="true">{template?.emoji ?? '🍽️'}</span><div className="grow"><span className="eyebrow">{slot?.name ?? '(נמחק)'}</span><label className="template-select"><span className="sr-only">סוג ארוחה · {slot?.name ?? '(נמחק)'}</span><select aria-label={`סוג ארוחה · ${slot?.name ?? '(נמחק)'}`} value={meal.templateId} onChange={e => update(m => Object.assign(m, newMeal({ id: m.slotId, name: '', defaultTemplateId: e.target.value }), { extras: 0, freeText: '' }))}>
      {!template && <option value={meal.templateId}>(נמחק)</option>}{settings.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
    </select><ChevronDown size={16} /></label></div>{meal.done && <Check className="text-primary" size={22} />}</div>
    {template?.requiresWorkout && !day.workout && <p className="notice">ערב בשרי רק ביום אימון</p>}
    {template?.preferWorkout && !day.workout && <p className="soft-hint">💡 עדיף אחרי אימון</p>}
    {templateLimit && templateLimit.status !== 'ok' && <p className={`notice ${templateLimit.status === 'over' ? 'error' : ''}`}>ארוחות השבוע: {templateLimit.count}/{templateLimit.limit}{templateLimit.status === 'over' ? ' · חריגה מהמכסה' : ' · המכסה נוצלה'}</p>}
    {template?.note && <p className="muted small-text">{template.note}</p>}
    <div className="stack meal-components">{template?.components.map(component => {
      const selected = meal.selections[component.id] ?? [];
      if (component.kind === 'check') return <label className="addon" key={component.id}><input type="checkbox" checked={selected.includes('1')} onChange={e => update(m => { m.selections[component.id] = e.target.checked ? ['1'] : []; })} />{component.label}{component.note && <small>{component.note}</small>}</label>;
      const options = componentOptions(component, settings);
      const visible = options.filter(o => o.active || selected.includes(o.id));
      return <fieldset className="component" key={component.id}><legend>{component.label} <span className="muted">{component.required ? `לבחור ${component.pick}` : `לבחירה · עד ${component.pick}`}</span></legend>
        {component.amountNote && <p className="amount-note">{component.amountNote}</p>}
        <div className="chips">{visible.map(option => {
          const checked = selected.includes(option.id);
          const limit = limits.find(l => l.kind === 'option' && l.id === option.id);
          return <button key={option.id} type="button" className={`food-chip ${checked ? 'selected' : ''}`} aria-pressed={checked} disabled={!checked && component.pick > 1 && selected.length >= component.pick} onClick={() => update(m => { m.selections[component.id] = toggleSelection(selected, option.id, component.pick); })}>
            <span className="chip-title">{checked && <Check size={14} />}{option.name}{!option.active && ' (לא פעיל)'}</span><small>{component.amountOverrides?.[option.id] ?? option.amount}</small>
            {option.note && <small className="chip-note">{option.note}</small>}{limit && <small className={`badge ${limit.status === 'over' ? 'badge-danger' : limit.status === 'at' ? 'badge-warning' : ''}`}>{limit.status === 'ok' ? '' : 'כבר '}{limit.count}/{limit.limit} השבוע</small>}
          </button>;
        })}{selected.filter(id => !options.some(o => o.id === id)).map(id => <button className="food-chip selected" key={id} aria-pressed="true" onClick={() => update(m => { m.selections[component.id] = selected.filter(s => s !== id); })}>{allOptions.find(o => o.id === id)?.name ?? '(נמחק)'} · הסרה</button>)}</div>
        {!visible.length && !selected.length && <p className="muted small-text">אין מאכלים פעילים בקבוצה. אפשר להוסיף בהגדרות.</p>}
      </fieldset>;
    })}</div>
    {orphanSelections.length > 0 && <div className="notice">בחירות מרכיבים שנמחקו: {orphanSelections.flatMap(([, ids]) => ids.map(id => allOptions.find(o => o.id === id)?.name ?? '(נמחק)')).join(' · ')}</div>}
    {template?.extraChargeKcal !== undefined && <div className="extras"><div className="row between"><div><strong>תוספות מיוחדות</strong><p className="muted small-text">כל תוספת מחייבת {template.extraChargeKcal} קל׳ מיום אחר</p></div><Stepper value={meal.extras ?? 0} onChange={n => update(m => { m.extras = n; })} label="תוספות" /></div>
      {Array.from({ length: meal.extras ?? 0 }, (_, i) => { const entry = day.bank.find(e => e.id === autoExtraId(meal.slotId, i)); return entry && <Field key={entry.id} label={`תאריך חיוב · תוספת ${i + 1}`}><input type="date" value={entry.chargeDate} onChange={e => { const date = e.target.value; if (date && date !== day.date) editDay(day.date, d => { const bank = d.bank.find(b => b.id === entry.id); if (bank) bank.chargeDate = date; }); }} min={undefined} aria-description={`יש לבחור יום אחר, למשל ${addDays(day.date, 1)}`} /></Field>; })}
    </div>}
    {(template?.countsAsCheat || template?.extraChargeKcal !== undefined || meal.freeText) && <Field label="מה אכלת? הערה לארוחה"><input value={meal.freeText ?? ''} placeholder="אפשר להוסיף פרטים…" onChange={e => update(m => { m.freeText = e.target.value; })} /></Field>}
    <button className={`done-button ${meal.done ? 'is-done' : ''}`} aria-pressed={meal.done} onClick={() => update(m => { m.done = !m.done; })}><Check size={20} />{meal.done ? 'אכלתי, סומן!' : 'אכלתי'}</button>
    {meal.done && !complete && <p className="soft-hint">סומן כאכלתי. נשאר להשלים את בחירות החובה.</p>}
  </article>;
}
