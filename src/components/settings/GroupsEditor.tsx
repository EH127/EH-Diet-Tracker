import type { OptionGroup } from '../../types';
import { editSettings } from '../../store/store';
import { NumberField, TextField, Toggle } from '../ui';
import { EditorActions } from './EditorActions';
import { moveItem } from '../../lib/reorder';
export function GroupsEditor({ groups }: { groups: OptionGroup[] }) {
  return <>{groups.map((group, index) => <details className="editor-item" key={group.id}><summary>{group.name || 'קבוצה ללא שם'} <small>{group.options.length} מאכלים</small></summary><div className="stack editor-body"><TextField label="שם קבוצה" value={group.name} onChange={v => editSettings(s => { s.groups[index].name = v; })} /><EditorActions name={group.name} index={index} count={groups.length} move={d => editSettings(s => moveItem(s.groups, index, d))} remove={() => editSettings(s => { s.groups.splice(index, 1); })} />
    {group.options.map((option, oi) => {
      const change = (patch: Partial<typeof option>) => editSettings(s => { Object.assign(s.groups[index].options[oi], patch); });
      return <details className="editor-item food-editor" key={option.id}><summary>{option.name || 'מאכל ללא שם'} <small>{option.amount}{!option.active && ' · לא פעיל'}</small></summary><div className="stack editor-body"><TextField label="שם מאכל" value={option.name} onChange={name => change({ name })} /><TextField label="כמות" value={option.amount} onChange={amount => change({ amount })} /><div className="form-grid"><NumberField label="קלוריות (לא חובה)" value={option.kcal} optional onChange={kcal => change({ kcal })} /><NumberField label="מכסה שבועית (לא חובה)" value={option.weeklyLimit} optional onChange={weeklyLimit => change({ weeklyLimit })} /></div><TextField label="הערה" value={option.note} onChange={note => change({ note })} /><Toggle label="מאכל פעיל בבחירה" checked={option.active} onChange={active => change({ active })} /><EditorActions name={option.name} index={oi} count={group.options.length} move={d => editSettings(s => moveItem(s.groups[index].options, oi, d))} remove={() => editSettings(s => { s.groups[index].options.splice(oi, 1); })} /></div></details>;
    })}<button className="secondary-button" onClick={() => editSettings(s => { s.groups[index].options.push({ id: crypto.randomUUID(), name: 'מאכל חדש', amount: '', active: true }); })}>+ הוספת מאכל</button>
  </div></details>)}<button className="secondary-button" onClick={() => editSettings(s => { s.groups.push({ id: crypto.randomUUID(), name: 'קבוצה חדשה', options: [] }); })}>+ הוספת קבוצה</button></>;
}
