import { useState } from 'react';
import { weekDays } from '../lib/dates';
import { remaining } from '../lib/bank';
import { allocateDeviation, categoryName, describeParts, entriesFor } from '../lib/deviations';
import { useStore } from '../store/hooks';
import { editDay } from '../store/store';
import { Field, Sheet } from './ui';

const quick = [100, 200, 250, 500];

export function DeviationSheet({ date, onClose }: { date: string; onClose: () => void }) {
  const { settings, logs } = useStore();
  const [category, setCategory] = useState(settings.deviationCategories[0]?.id);
  const [note, setNote] = useState('');
  const [kcal, setKcal] = useState('');
  const amount = Math.max(0, Math.round(Number(kcal) || 0));
  const parts = allocateDeviation(date, amount, logs, settings);
  const weekLeft = weekDays(date, settings.weekStartsOn).filter(d => d >= date).reduce((sum, d) => sum + remaining(d, logs, settings.dailyBankKcal), 0) - amount;
  return <Sheet title="רושמים חריגה" onClose={onClose}>
    <form className="stack" onSubmit={e => {
      e.preventDefault();
      if (!amount) return;
      const entries = entriesFor(date, amount, { groupId: crypto.randomUUID(), category, note: note.trim(), label: categoryName(category, settings) }, logs, settings);
      editDay(date, day => { day.bank.push(...entries); }); onClose();
    }}>
      {settings.deviationCategories.length > 0 && <div className="chips">{settings.deviationCategories.map(c => <button type="button" className={`food-chip ${category === c.id ? 'selected' : ''}`} aria-pressed={category === c.id} key={c.id} onClick={() => setCategory(c.id)}>{c.emoji} {c.name}</button>)}</div>}
      <Field label="מה אכלת?"><input value={note} placeholder="לא חובה, למשל: פיצה עם חברים" onChange={e => setNote(e.target.value)} /></Field>
      <Field label="כמה קלוריות?"><input required type="number" inputMode="numeric" min="1" step="1" value={kcal} placeholder="למשל 300" onChange={e => setKcal(e.target.value)} /></Field>
      <div className="chips">{quick.map(n => <button type="button" className={`food-chip ${amount === n ? 'selected' : ''}`} aria-pressed={amount === n} key={n} onClick={() => setKcal(String(n))}>{n}</button>)}</div>
      {amount > 0 && <p className={weekLeft < 0 ? 'notice error' : 'soft-hint'}>יחויב: {describeParts(parts, date)}. {weekLeft < 0 ? `חריגה של ${-weekLeft} קל׳ מהבנק של שאר השבוע` : `נשארו ${weekLeft} קל׳ בבנק של שאר השבוע`}</p>}
      <button className="primary-button" type="submit" disabled={!amount}>שמירת חריגה · {amount} קל׳</button>
    </form>
  </Sheet>;
}
