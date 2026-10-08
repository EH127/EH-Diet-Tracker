import type { BankPreset } from '../../types';
import { editSettings } from '../../store/store';
import { Field, NumberField, TextField } from '../ui';
import { EditorActions } from './EditorActions';
import { moveItem } from '../../lib/reorder';
export function PresetsEditor({ presets }: { presets: BankPreset[] }) {
  return <>{presets.map((preset, index) => {
    const change = (patch: Partial<BankPreset>) => editSettings(s => { Object.assign(s.bankPresets[index], patch); });
    return <details className="editor-item" key={preset.id}><summary>{preset.name || 'פריט ללא שם'}</summary><div className="stack editor-body"><TextField label="שם" value={preset.name} onChange={name => change({ name })} /><Field label="סוג"><select value={preset.kind} onChange={e => change({ kind: e.target.value as BankPreset['kind'], ...(e.target.value === 'alcohol' ? { charge: 250 } : {}) })}><option value="snack">חטיף</option><option value="alcohol">אלכוהול</option><option value="other">אחר</option></select></Field><NumberField label="קלוריות במנה" value={preset.kcal} onChange={kcal => change({ kcal: kcal ?? 0 })} /><NumberField label="חיוב מהבנק" value={preset.charge} onChange={charge => change({ charge: charge ?? 0 })} /><EditorActions name={preset.name} index={index} count={presets.length} move={d => editSettings(s => moveItem(s.bankPresets, index, d))} remove={() => editSettings(s => { s.bankPresets.splice(index, 1); })} /></div></details>;
  })}<button className="secondary-button" onClick={() => editSettings(s => { s.bankPresets.push({ id: crypto.randomUUID(), name: 'פריט חדש', kind: 'snack', kcal: 250, charge: 250 }); })}>+ הוספת פריט לבנק</button></>;
}
