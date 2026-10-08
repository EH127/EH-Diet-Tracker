import { BookOpen, Pencil } from 'lucide-react';
import { useStore } from '../store/hooks';
import { componentOptions } from '../lib/meals';

export default function Menu({ edit }: { edit: () => void }) {
  const { settings } = useStore();
  return <div className="screen stack"><header className="page-heading"><p className="eyebrow">תמיד בהישג יד</p><div className="row between"><h1>התפריט שלי</h1><button className="text-button" onClick={edit}><Pencil size={16} />לעריכה ←</button></div><p className="muted">כל האפשרויות, הכמויות והכללים במקום אחד.</p></header>
    {settings.templates.map(template => <section key={template.id} className="card menu-template"><h2><span aria-hidden="true">{template.emoji}</span>{template.name}</h2><div className="chips">{template.requiresWorkout && <span className="badge badge-warning">רק ביום אימון</span>}{template.preferWorkout && <span className="badge">עדיף אחרי אימון</span>}{template.weeklyLimit !== undefined && <span className="badge">עד {template.weeklyLimit} בשבוע</span>}{template.countsAsCheat && <span className="badge">נחשב ארוחה בחוץ</span>}</div>
      {template.note && <p className="notice">{template.note}</p>}{template.bankChargeSameDay !== undefined && <p className="small-text">חיוב הבנק באותו יום: {template.bankChargeSameDay} קל׳</p>}{template.extraChargeKcal !== undefined && <p className="small-text">כל תוספת: {template.extraChargeKcal} קל׳ מיום אחר</p>}
      {template.components.map(c => <div className="menu-component" key={c.id}><h3>{c.label} {c.kind === 'choice' && <small className="muted">לבחור {c.pick}{!c.required && ' · לא חובה'}</small>}</h3>{c.kind === 'check' ? <p className="muted">תוספת לבחירה {c.note}</p> : <>{c.amountNote && <p className="amount-note">{c.amountNote}</p>}<ul className="menu-options">{componentOptions(c, settings).filter(o => o.active).map(o => <li key={o.id}><span>{o.name}{o.note && <small>{o.note}</small>}{o.weeklyLimit !== undefined && <small>עד {o.weeklyLimit} בשבוע</small>}</span><strong>{c.amountOverrides?.[o.id] ?? o.amount}{o.kcal !== undefined && <small>{o.kcal} קל׳</small>}</strong></li>)}</ul>{c.groupIds.filter(id => !settings.groups.some(g => g.id === id)).map(id => <p className="muted" key={id}>(נמחק)</p>)}</>}</div>)}
    </section>)}
    <section className="card"><h2>בנק {settings.dailyBankKcal} קלוריות</h2><ul className="menu-options">{settings.bankPresets.map(p => <li key={p.id}><span>{p.name}<small>{p.kcal} קל׳ במנה</small></span><strong>חיוב {p.kind === 'alcohol' ? 250 : p.charge}</strong></li>)}</ul></section>
    <section className="card"><h2><BookOpen size={20} /> הדברים שכדאי לזכור</h2><ul className="rules-list">{settings.rules.map((rule, i) => <li key={i}>{rule}</li>)}</ul>{!settings.rules.length && <p className="empty">אפשר להוסיף כללים אישיים בהגדרות.</p>}</section>
  </div>;
}
