import type { SnackCategory, SnackItem } from '../../types';
import { defaultSettings } from '../../data/defaultSettings';
import { editSettings } from '../../store/store';
import { NumberField, TextField } from '../ui';
import { EditorActions } from './EditorActions';
import { moveItem } from '../../lib/reorder';
export function SnackCatalogEditor({ categories }: { categories: SnackCategory[] }) {
  return <>{categories.map((category, index) => {
    const change = (patch: Partial<SnackCategory>) => editSettings(s => { Object.assign(s.snackCatalog[index], patch); });
    return <details className="editor-item" key={category.id}><summary>{category.emoji} {category.name || 'קטגוריה ללא שם'} <small>{category.items.length} נשנושים</small></summary><div className="stack editor-body"><TextField label="שם קטגוריה" value={category.name} onChange={name => change({ name })} /><TextField label="אמוג׳י (לא חובה)" value={category.emoji} onChange={emoji => change({ emoji: emoji || undefined })} /><EditorActions name={category.name} index={index} count={categories.length} move={d => editSettings(s => moveItem(s.snackCatalog, index, d))} remove={() => editSettings(s => { s.snackCatalog.splice(index, 1); })} />
      {category.items.map((item, ii) => {
        const changeItem = (patch: Partial<SnackItem>) => editSettings(s => { Object.assign(s.snackCatalog[index].items[ii], patch); });
        return <details className="editor-item food-editor" key={item.id}><summary>{item.name || 'נשנוש ללא שם'} <small>{item.portion && `${item.portion} · `}{item.kcal} קל׳</small></summary><div className="stack editor-body"><TextField label="שם נשנוש" value={item.name} onChange={name => changeItem({ name })} /><TextField label="כמות במנה (לא חובה)" value={item.portion} onChange={portion => changeItem({ portion: portion || undefined })} /><NumberField label="קלוריות במנה" value={item.kcal} onChange={kcal => changeItem({ kcal: kcal ?? 0 })} /><TextField label="הערה (לא חובה)" value={item.note} onChange={note => changeItem({ note: note || undefined })} /><EditorActions name={item.name} index={ii} count={category.items.length} move={d => editSettings(s => moveItem(s.snackCatalog[index].items, ii, d))} remove={() => editSettings(s => { s.snackCatalog[index].items.splice(ii, 1); })} /></div></details>;
      })}<button className="secondary-button" onClick={() => editSettings(s => { s.snackCatalog[index].items.push({ id: crypto.randomUUID(), name: 'נשנוש חדש', kcal: 100 }); })}>+ הוספת נשנוש</button>
    </div></details>;
  })}<button className="secondary-button" onClick={() => editSettings(s => { s.snackCatalog.push({ id: crypto.randomUUID(), name: 'קטגוריה חדשה', items: [] }); })}>+ הוספת קטגוריה</button><button onClick={() => { if (window.confirm('לשחזר את קטלוג הנשנושים לברירת המחדל? השינויים בקטלוג יוחלפו. רשומות העבר יישמרו.')) editSettings(s => { s.snackCatalog = structuredClone(defaultSettings.snackCatalog); }); }}>שחזור הקטלוג לברירת המחדל</button></>;
}
