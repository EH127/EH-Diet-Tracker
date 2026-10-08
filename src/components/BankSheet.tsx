import { useState } from 'react';
import type { BankEntry, BankPreset, SnackItem } from '../types';
import { addDays, displayDate } from '../lib/dates';
import { remaining, suggestChargeDate } from '../lib/bank';
import { filterSnackCatalog, snackSelection } from '../lib/snacks';
import { useStore } from '../store/hooks';
import { editDay } from '../store/store';
import { Field, Sheet, Stepper, Toggle } from './ui';

export function BankSheet({ date, kind, onClose }: { date: string; kind: BankPreset['kind']; onClose: () => void }) {
  const { settings, logs } = useStore();
  const presets = settings.bankPresets.filter(p => p.kind === kind);
  const [presetId, setPresetId] = useState(presets[0]?.id ?? '');
  const [label, setLabel] = useState(presets[0]?.name ?? '');
  const [kcal, setKcal] = useState(String(presets[0]?.kcal ?? 250));
  const [customCharge, setCustomCharge] = useState(String(presets[0]?.charge ?? 250));
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [onlyFits, setOnlyFits] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSnack, setSelectedSnack] = useState<SnackItem>();
  const charge = Math.max(0, Number(customCharge) || 0);
  const suggested = suggestChargeDate(date, charge, logs, settings.dailyBankKcal);
  const [overrideDate, setOverrideDate] = useState('');
  const chargeDate = overrideDate || suggested;
  const available = remaining(chargeDate, logs, settings.dailyBankKcal);
  const balance = available - charge;
  const catalog = filterSnackCatalog(settings.snackCatalog, { query, categoryId, quantity, remaining: available, onlyFits });
  function choose(p: BankPreset) { setSelectedSnack(undefined); setPresetId(p.id); setLabel(p.name); setKcal(String(p.kcal)); setCustomCharge(String(p.charge)); }
  function chooseSnack(item: SnackItem, qty = quantity) {
    const entry = snackSelection(item, qty);
    setSelectedSnack(item); setPresetId(''); setLabel(entry.label); setKcal(String(entry.kcal)); setCustomCharge(String(entry.charge));
  }
  function custom() { setSelectedSnack(undefined); setPresetId(''); }
  return <Sheet title={kind === 'alcohol' ? 'משקה קטן, רישום מסודר' : kind === 'snack' ? 'מוסיפים חטיף לבנק' : 'הוספה לבנק'} onClose={onClose}>
    <form className="stack bank-sheet-form" onSubmit={e => {
      e.preventDefault();
      const entry: BankEntry = { id: crypto.randomUUID(), kind, label: label.trim(), kcal: Number(kcal), charge, chargeDate };
      editDay(date, day => { day.bank.push(entry); }); onClose();
    }}>
      <div className="stack bank-sheet-fields">
      {kind === 'snack' && <section className="stack snack-picker" aria-label="בחירת נשנוש מהקטלוג"><Field label="חיפוש נשנוש"><input type="search" placeholder="שם או כמות במנה" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }} /></Field>
        <div className="chips" role="group" aria-label="קטגוריות נשנושים"><button type="button" className={`food-chip ${categoryId === '' ? 'selected' : ''}`} aria-pressed={categoryId === ''} onClick={() => setCategoryId('')}>הכל</button>{settings.snackCatalog.map(c => <button type="button" className={`food-chip ${categoryId === c.id ? 'selected' : ''}`} aria-pressed={categoryId === c.id} key={c.id} onClick={() => setCategoryId(c.id)}>{c.name}</button>)}</div>
        <div className="row between"><Toggle label="רק מה שנכנס היום" checked={onlyFits} onChange={setOnlyFits} /><Stepper label="כמות מנות" value={quantity} min={1} max={5} onChange={n => { setQuantity(n); if (selectedSnack) chooseSnack(selectedSnack, n); }} /></div>
        <p className="muted small-text">יתרה ב־{displayDate(chargeDate)}: {available} קל׳ · לפי תאריך החיוב שנבחר · כמות ×{quantity}</p>
        <div className="snack-results" role="region" aria-label="תוצאות חיפוש נשנושים" tabIndex={0}>{catalog.map(c => <div className="stack snack-category" key={c.id}><h3>{c.emoji} {c.name}</h3>{c.items.map(item => {
          const total = item.kcal * quantity;
          return <button type="button" className={`food-chip snack-item ${selectedSnack?.id === item.id ? 'selected' : ''} ${total > available ? 'snack-over-budget' : ''}`} aria-pressed={selectedSnack?.id === item.id} key={item.id} onClick={() => chooseSnack(item)}><strong>{item.name}</strong><small>{item.portion && `${item.portion} · `}{item.kcal} קל׳{quantity > 1 && ` · ×${quantity} = ${total} קל׳`}</small>{item.note && <small>{item.note}</small>}{total > available && <span className="badge badge-warning">מעל היתרה ביום החיוב</span>}</button>;
        })}</div>)}{!catalog.length && <p className="empty">לא נמצאו נשנושים מתאימים. אפשר לשנות את הסינון או להוסיף בהתאמה אישית.</p>}</div>
      </section>}
      {kind === 'snack' && <h3>קבועים</h3>}
      <div className="chips">{presets.map(p => <button type="button" className={`food-chip ${presetId === p.id ? 'selected' : ''}`} aria-pressed={presetId === p.id} key={p.id} onClick={() => choose(p)}>{p.name}<small>{p.kcal} קל׳ · חיוב {p.charge}</small></button>)}<button type="button" className={`food-chip ${presetId === '' && !selectedSnack ? 'selected' : ''}`} aria-pressed={presetId === '' && !selectedSnack} onClick={() => { custom(); setLabel(''); }}>בהתאמה אישית</button></div>
      <Field label="שם"><input required value={label} onChange={e => { custom(); setLabel(e.target.value); }} /></Field>
      <div className="form-grid"><Field label="קלוריות במנה"><input required type="number" min="0" step="1" value={kcal} onChange={e => { custom(); setKcal(e.target.value); if (kind !== 'alcohol') setCustomCharge(e.target.value); }} /></Field><Field label="חיוב מהבנק"><input required type="number" min="0" step="1" value={charge} disabled={kind === 'alcohol'} onChange={e => { custom(); setCustomCharge(e.target.value); }} /></Field></div>
      {kind === 'alcohol' && <p className="notice">כל משקה מחייב {charge} מהבנק, ללא תלות בקלוריות. לרישום משקה נוסף, מוסיפים רשומה נוספת.</p>}
      <fieldset className="component"><legend>מאיזה יום לחייב?</legend><div className="segmented"><button type="button" className={chargeDate === date ? 'active' : ''} onClick={() => setOverrideDate(date)}>היום</button><button type="button" className={chargeDate === addDays(date, 1) ? 'active' : ''} onClick={() => setOverrideDate(addDays(date, 1))}>מחר</button><button type="button" onClick={() => setOverrideDate(suggested)}>יום פנוי</button></div><Field label="תאריך אחר"><input required type="date" value={chargeDate} onChange={e => setOverrideDate(e.target.value)} /></Field></fieldset>
      </div>
      <div className="stack bank-sheet-footer">
      <p className={balance < 0 ? 'notice error' : 'soft-hint'}>לאחר החיוב ב־{displayDate(chargeDate)}: {balance} קל׳ {balance < 0 ? '· אפשר לשמור גם בחריגה' : 'יישארו בבנק'}</p>
      <button className="primary-button" type="submit">שמירה בבנק · {charge} קל׳</button>
      </div>
    </form>
  </Sheet>;
}
