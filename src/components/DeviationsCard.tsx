import { useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import type { Logs, Settings } from '../types';
import { categoryName, categoryOf, describeParts, deviationGroups, type DeviationGroup } from '../lib/deviations';
import { editDay } from '../store/store';
import { DeviationSheet } from './DeviationSheet';

export function DeviationsCard({ date, logs, settings }: { date: string; logs: Logs; settings: Settings }) {
  const [adding, setAdding] = useState(false);
  const groups = deviationGroups(logs[date]);
  const remove = (g: DeviationGroup) => {
    if (window.confirm(`למחוק את החריגה (${g.kcal} קל׳)? הקלוריות יחזרו לבנק.`)) editDay(date, day => { day.bank = day.bank.filter(e => (e.groupId ?? e.id) !== g.groupId); });
  };
  return <section className="card"><div className="row between"><h2><AlertTriangle size={20} /> חריגות</h2><button className="secondary-button" onClick={() => setAdding(true)}><Plus size={18} /> חריגה</button></div>
    {groups.length ? <ul className="plain-list">{groups.map(g => <li key={g.groupId} className="bank-entry"><div className="grow"><strong>{categoryOf(g.category, settings)?.emoji ?? '⚠️'} {categoryName(g.category, settings)}</strong><small>{g.note && `${g.note} · `}{describeParts(g.parts, date)}</small></div><strong className="numeric">−{g.kcal}</strong><button className="icon-button" onClick={() => remove(g)} aria-label={`מחיקת חריגה: ${categoryName(g.category, settings)}`}><Trash2 size={17} /></button></li>)}</ul>
      : <p className="muted small-text">אין חריגות היום. אם יצא משהו מחוץ לתפריט, רושמים בלי דרמה ומתקדמים 🌿</p>}
    {adding && <DeviationSheet date={date} onClose={() => setAdding(false)} />}
  </section>;
}
