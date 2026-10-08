import type { MealTemplate, Settings } from '../../types';
import { editSettings } from '../../store/store';
import { NumberField, TextField, Toggle } from '../ui';
import { ComponentsEditor } from './ComponentsEditor';
import { EditorActions } from './EditorActions';
import { moveItem } from '../../lib/reorder';
export function TemplatesEditor({ settings }: { settings: Settings }) {
  return <>{settings.templates.map((template, index) => {
    const change = (patch: Partial<MealTemplate>) => editSettings(s => { Object.assign(s.templates[index], patch); });
    return <details className="editor-item" key={template.id}><summary>{template.emoji} {template.name || 'ארוחה ללא שם'}</summary><div className="stack editor-body"><TextField label="שם ארוחה" value={template.name} onChange={name => change({ name })} /><TextField label="אימוג׳י" value={template.emoji} onChange={emoji => change({ emoji })} /><TextField label="הערה לארוחה" value={template.note} onChange={note => change({ note })} /><Toggle label="דורשת אימון באותו יום" checked={!!template.requiresWorkout} onChange={requiresWorkout => change({ requiresWorkout })} /><Toggle label="עדיפות אחרי אימון" checked={!!template.preferWorkout} onChange={preferWorkout => change({ preferWorkout })} /><Toggle label="נחשבת ארוחה בחוץ בסטטיסטיקה" checked={!!template.countsAsCheat} onChange={countsAsCheat => change({ countsAsCheat })} />
      <NumberField label="מכסה שבועית (לא חובה)" optional value={template.weeklyLimit} onChange={weeklyLimit => change({ weeklyLimit })} /><div className="form-grid"><NumberField label="חיוב באותו יום (קל׳)" optional value={template.bankChargeSameDay} onChange={bankChargeSameDay => change({ bankChargeSameDay })} /><NumberField label="חיוב לכל תוספת (קל׳)" optional value={template.extraChargeKcal} onChange={extraChargeKcal => change({ extraChargeKcal })} /></div><p className="muted small-text">שדה חיוב ריק מבטל חיוב אוטומטי.</p><ComponentsEditor components={template.components} groups={settings.groups} onChange={components => change({ components })} /><EditorActions name={template.name} index={index} count={settings.templates.length} move={d => editSettings(s => moveItem(s.templates, index, d))} remove={() => editSettings(s => { s.templates.splice(index, 1); })} />
    </div></details>;
  })}<button className="secondary-button" onClick={() => editSettings(s => { s.templates.push({ id: crypto.randomUUID(), name: 'ארוחה חדשה', emoji: '🍽️', components: [] }); })}>+ הוספת תבנית ארוחה</button></>;
}
