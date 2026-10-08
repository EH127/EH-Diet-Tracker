import { useStore } from '../store/hooks';
import { editSettings } from '../store/store';
import { Field, NumberField, Section, TextField } from '../components/ui';
import { AccountSettings } from '../components/settings/AccountSettings';
import { InstallSettings } from '../components/settings/InstallSettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { BackupSettings } from '../components/settings/BackupSettings';
import { GroupsEditor } from '../components/settings/GroupsEditor';
import { TemplatesEditor } from '../components/settings/TemplatesEditor';
import { SlotsEditor } from '../components/settings/SlotsEditor';
import { PresetsEditor } from '../components/settings/PresetsEditor';
import { SnackCatalogEditor } from '../components/settings/SnackCatalogEditor';
import { DeviationCategoriesEditor } from '../components/settings/DeviationCategoriesEditor';
import { EditorActions } from '../components/settings/EditorActions';
import { moveItem } from '../lib/reorder';
import { HabitsEditor } from '../components/settings/HabitsEditor';
import { WeeklyReportEditor } from '../components/settings/WeeklyReportEditor';
import { convertWaterGoal } from '../lib/water';
import type { WaterUnit } from '../types';
export default function SettingsScreen() {
  const { settings } = useStore();
  return <div className="screen stack"><header className="page-heading"><p className="eyebrow">בדיוק בשבילך</p><h1>הגדרות</h1><p className="muted">התפריט שלך גמיש. השינויים נשמרים אוטומטית.</p></header><Section title="התקנת האפליקציה"><InstallSettings /></Section><Section title="חשבון וסנכרון" open><AccountSettings /></Section><Section title="התראות"><NotificationSettings /></Section><Section title="קבוצות ומאכלים"><GroupsEditor groups={settings.groups} /></Section><Section title="ארוחות · תבניות"><TemplatesEditor settings={settings} /></Section><Section title="מבנה היום"><SlotsEditor settings={settings} /></Section><Section title="בנק קלוריות"><NumberField label="תקציב קלוריות יומי" value={settings.dailyBankKcal} onChange={n => editSettings(s => { s.dailyBankKcal = n ?? 0; })} /><h3>פריטים לבחירה מהירה</h3><PresetsEditor presets={settings.bankPresets} /></Section><Section title="קטלוג נשנושים"><SnackCatalogEditor categories={settings.snackCatalog} /></Section><Section title="סוגי חריגות"><DeviationCategoriesEditor categories={settings.deviationCategories} /></Section><Section title="משימות יומיות"><HabitsEditor habits={settings.habits} /></Section><Section title="דוח שבועי"><WeeklyReportEditor settings={settings} /></Section><Section title="יעדים">
    <Field label="יחידת מים"><select value={settings.waterUnit} onChange={e => editSettings(s => { const unit = e.target.value as WaterUnit; s.waterGoal = convertWaterGoal(s, unit); s.waterUnit = unit; })}><option value="cups">כוסות</option><option value="liters">ליטרים</option></select></Field>
    <NumberField label="גודל כוס במ״ל" min={1} value={settings.cupMl} onChange={n => editSettings(s => { s.cupMl = n ?? 250; })} />
    <NumberField label="יעד צעדים ליום" min={1} value={settings.stepsGoal} onChange={n => editSettings(s => { s.stepsGoal = n ?? 10000; })} />
    <NumberField label={settings.waterUnit === 'cups' ? 'יעד כוסות מים ליום' : 'יעד ליטרים ליום'} min={0.01} step={0.01} value={settings.waterGoal} onChange={n => editSettings(s => { s.waterGoal = n ?? (s.waterUnit === 'cups' ? 8 : 2); })} /><NumberField label="משקל יעד בק״ג (לא חובה)" min={1} step={0.1} optional value={settings.weightGoal} onChange={n => editSettings(s => { s.weightGoal = n; })} /><Field label="היום הראשון בשבוע"><select value={settings.weekStartsOn} onChange={e => editSettings(s => { s.weekStartsOn = Number(e.target.value) as 0 | 1; })}><option value="0">ראשון</option><option value="1">שני</option></select></Field></Section><Section title="כללים">{settings.rules.map((rule, index) => <div className="editor-item editor-body" key={index}><TextField label={`כלל ${index + 1}`} value={rule} onChange={value => editSettings(s => { s.rules[index] = value; })} /><EditorActions name={`כלל ${index + 1}`} index={index} count={settings.rules.length} move={d => editSettings(s => moveItem(s.rules, index, d))} remove={() => editSettings(s => { s.rules.splice(index, 1); })} /></div>)}<button className="secondary-button" onClick={() => editSettings(s => { s.rules.push('כלל חדש'); })}>+ הוספת כלל</button></Section><Section title="תצוגה"><Field label="ערכת נושא"><select value={settings.theme} onChange={e => editSettings(s => { s.theme = e.target.value as typeof s.theme; })}><option value="system">לפי המכשיר</option><option value="light">בהיר</option><option value="dark">כהה</option></select></Field></Section><Section title="גיבוי"><BackupSettings /></Section><p className="app-footer">מעקב תפריט · נבנה להרגלים שעושים טוב 🌿</p></div>;
}
