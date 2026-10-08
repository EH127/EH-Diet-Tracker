import { useState } from 'react';
import type { BankEntry, BankPreset } from '../types';
import { addDays, displayDate } from '../lib/dates';
import { remaining, suggestChargeDate } from '../lib/bank';
import { useStore } from '../store/hooks';
import { editDay } from '../store/store';
import { Field, Sheet } from './ui';

export function BankSheet({ date, kind, onClose }: { date: string; kind: BankPreset['kind']; onClose: () => void }) {
  const { settings, logs } = useStore();
  const presets = settings.bankPresets.filter(p => p.kind === kind);
  const [presetId, setPresetId] = useState(presets[0]?.id ?? '');
  const [label, setLabel] = useState(presets[0]?.name ?? '');
  const [kcal, setKcal] = useState(String(presets[0]?.kcal ?? 250));
  const [customCharge, setCustomCharge] = useState(String(presets[0]?.charge ?? 250));
  const charge = Math.max(0, Number(customCharge) || 0);
  const suggested = suggestChargeDate(date, charge, logs, settings.dailyBankKcal);
  const [overrideDate, setOverrideDate] = useState('');
  const chargeDate = overrideDate || suggested;
  const balance = remaining(chargeDate, logs, settings.dailyBankKcal) - charge;
  function choose(p: BankPreset) { setPresetId(p.id); setLabel(p.name); setKcal(String(p.kcal)); setCustomCharge(String(p.charge)); }
  return <Sheet title={kind === 'alcohol' ? 'משקה קטן, רישום מסודר' : kind === 'snack' ? 'מוסיפים חטיף לבנק' : 'הוספה לבנק'} onClose={onClose}>
    <form className="stack" onSubmit={e => {
      e.preventDefault();
      const entry: BankEntry = { id: crypto.randomUUID(), kind, label: label.trim(), kcal: Number(kcal), charge, chargeDate };
      editDay(date, day => { day.bank.push(entry); }); onClose();
    }}>
      <div className="chips">{presets.map(p => <button type="button" className={`food-chip ${presetId === p.id ? 'selected' : ''}`} aria-pressed={presetId === p.id} key={p.id} onClick={() => choose(p)}>{p.name}<small>{p.kcal} קל׳ · חיוב {p.charge}</small></button>)}<button type="button" className={`food-chip ${presetId === '' ? 'selected' : ''}`} aria-pressed={presetId === ''} onClick={() => { setPresetId(''); setLabel(''); }}>בהתאמה אישית</button></div>
      <Field label="שם"><input required value={label} onChange={e => setLabel(e.target.value)} /></Field>
      <div className="form-grid"><Field label="קלוריות במנה"><input required type="number" min="0" step="1" value={kcal} onChange={e => { setKcal(e.target.value); if (kind !== 'alcohol') setCustomCharge(e.target.value); }} /></Field><Field label="חיוב מהבנק"><input required type="number" min="0" step="1" value={charge} disabled={kind === 'alcohol'} onChange={e => setCustomCharge(e.target.value)} /></Field></div>
      {kind === 'alcohol' && <p className="notice">כל משקה מחייב {charge} מהבנק, ללא תלות בקלוריות. לרישום משקה נוסף, מוסיפים רשומה נוספת.</p>}
      <fieldset className="component"><legend>מאיזה יום לחייב?</legend><div className="segmented"><button type="button" className={chargeDate === date ? 'active' : ''} onClick={() => setOverrideDate(date)}>היום</button><button type="button" className={chargeDate === addDays(date, 1) ? 'active' : ''} onClick={() => setOverrideDate(addDays(date, 1))}>מחר</button><button type="button" onClick={() => setOverrideDate(suggested)}>יום פנוי</button></div><Field label="תאריך אחר"><input required type="date" value={chargeDate} onChange={e => setOverrideDate(e.target.value)} /></Field></fieldset>
      <p className={balance < 0 ? 'notice error' : 'soft-hint'}>לאחר החיוב ב־{displayDate(chargeDate)}: {balance} קל׳ {balance < 0 ? '· אפשר לשמור גם בחריגה' : 'יישארו בבנק'}</p>
      <button className="primary-button" type="submit">שמירה בבנק · {charge} קל׳</button>
    </form>
  </Sheet>;
}
