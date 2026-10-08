import type { DeviationCategory } from '../../types';
import { editSettings } from '../../store/store';
import { TextField } from '../ui';
import { EditorActions } from './EditorActions';
import { moveItem } from '../../lib/reorder';
export function DeviationCategoriesEditor({ categories }: { categories: DeviationCategory[] }) {
  return <>{categories.map((category, index) => {
    const change = (patch: Partial<DeviationCategory>) => editSettings(s => { Object.assign(s.deviationCategories[index], patch); });
    return <details className="editor-item" key={category.id}><summary>{category.emoji} {category.name || 'סוג ללא שם'}</summary><div className="stack editor-body"><TextField label="שם" value={category.name} onChange={name => change({ name })} /><TextField label="אמוג׳י (לא חובה)" value={category.emoji} onChange={emoji => change({ emoji: emoji || undefined })} /><EditorActions name={category.name} index={index} count={categories.length} move={d => editSettings(s => moveItem(s.deviationCategories, index, d))} remove={() => editSettings(s => { s.deviationCategories.splice(index, 1); })} /></div></details>;
  })}<button className="secondary-button" onClick={() => editSettings(s => { s.deviationCategories.push({ id: crypto.randomUUID(), name: 'סוג חדש', emoji: '⚠️' }); })}>+ הוספת סוג חריגה</button></>;
}
