import type { Settings } from '../../types';
import { editSettings } from '../../store/store';
import { Field, TextField } from '../ui';
import { EditorActions } from './EditorActions';
import { moveItem } from '../../lib/reorder';
export function SlotsEditor({ settings }: { settings: Settings }) {
  return <>{settings.slots.map((slot, index) => <div key={slot.id} className="editor-item editor-body stack"><TextField label="שם הארוחה ביום" value={slot.name} onChange={name => editSettings(s => { s.slots[index].name = name; })} /><Field label="תבנית ברירת מחדל"><select value={slot.defaultTemplateId} onChange={e => editSettings(s => { s.slots[index].defaultTemplateId = e.target.value; })}>{!settings.templates.some(t => t.id === slot.defaultTemplateId) && <option value={slot.defaultTemplateId}>(נמחק)</option>}{settings.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field><EditorActions name={slot.name} index={index} count={settings.slots.length} move={d => editSettings(s => moveItem(s.slots, index, d))} remove={() => editSettings(s => { s.slots.splice(index, 1); })} /></div>)}<button className="secondary-button" disabled={!settings.templates.length} onClick={() => editSettings(s => { s.slots.push({ id: crypto.randomUUID(), name: 'ארוחה נוספת', defaultTemplateId: s.templates[0]?.id ?? '' }); })}>+ הוספת ארוחה למבנה היום</button></>;
}
