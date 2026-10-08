import type { Habit } from '../../types';
import { editSettings } from '../../store/store';
import { moveItem } from '../../lib/reorder';
import { TextField } from '../ui';
import { EditorActions } from './EditorActions';

export function HabitsEditor({ habits }: { habits: Habit[] }) {
  return <>{habits.map((habit, index) => {
    const change = (patch: Partial<Habit>) => editSettings(s => { Object.assign(s.habits[index], patch); });
    return <details className="editor-item" key={habit.id}><summary>{habit.emoji} {habit.name || 'משימה ללא שם'}</summary><div className="stack editor-body">
      <TextField label="שם" value={habit.name} onChange={name => change({ name })} />
      <TextField label="אמוג׳י (לא חובה)" value={habit.emoji} onChange={emoji => change({ emoji: emoji || undefined })} />
      <EditorActions name={habit.name} index={index} count={habits.length} move={d => editSettings(s => moveItem(s.habits, index, d))} remove={() => editSettings(s => { s.habits.splice(index, 1); })} />
    </div></details>;
  })}<button className="secondary-button" onClick={() => editSettings(s => { s.habits.push({ id: crypto.randomUUID(), name: 'משימה חדשה' }); })}>+ הוספת משימה יומית</button></>;
}
