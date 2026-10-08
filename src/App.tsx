import { lazy, Suspense, useEffect, useSyncExternalStore } from 'react';
import { BarChart3, BookOpen, CalendarDays, House, Leaf, Settings as SettingsIcon } from 'lucide-react';
import { dateKey, isDateKey } from './lib/dates';
import { startSync, syncLabels, useSync } from './lib/sync';
import { useStorageError, useStore } from './store/hooks';
import Today from './screens/Today';

const Week = lazy(() => import('./screens/Week'));
const Stats = lazy(() => import('./screens/Stats'));
const Menu = lazy(() => import('./screens/Menu'));
const Settings = lazy(() => import('./screens/Settings'));
const Report = lazy(() => import('./screens/Report'));
const tabs = [
  { id: 'today', label: 'היום', icon: House }, { id: 'week', label: 'שבוע', icon: CalendarDays },
  { id: 'stats', label: 'גרפים', icon: BarChart3 }, { id: 'menu', label: 'תפריט', icon: BookOpen }, { id: 'settings', label: 'הגדרות', icon: SettingsIcon },
] as const;
type Tab = typeof tabs[number]['id'];
type Route = Tab | 'report';
const listenHash = (listener: () => void) => { window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); };
const listenClock = (listener: () => void) => { const timer = setInterval(listener, 30_000); return () => clearInterval(timer); };

export default function App() {
  const { settings } = useStore();
  const sync = useSync();
  const error = useStorageError();
  const today = useSyncExternalStore(listenClock, dateKey);
  const hash = useSyncExternalStore(listenHash, () => window.location.hash);
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const tab: Route = path === 'report' ? 'report' : tabs.some(t => t.id === path) ? path as Tab : 'today';
  const selectedDate = new URLSearchParams(query).get('date');
  const date = isDateKey(selectedDate) ? selectedDate : today;
  function navigate(next: Route, targetDate = date) {
    window.location.hash = `/${next}${(next === 'today' || next === 'week' || next === 'report') && targetDate !== today ? `?date=${targetDate}` : ''}`;
  }
  useEffect(() => startSync(), []);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14231c' : '#f6f7f2');
    };
    apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply);
  }, [settings.theme]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [tab]);
  return <><a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>דילוג לתוכן</a><div className="app-shell"><header className="app-bar"><a className="brand" href="#/today"><span className="brand-icon"><Leaf size={22} /></span><span>מעקב תפריט<small>להרגיש טוב, יום יום</small></span></a><button className="sync-indicator" onClick={() => navigate('settings')} aria-label={`מצב סנכרון: ${syncLabels[sync.status]}`}><span className={`status-dot ${sync.status}`} /><span>{syncLabels[sync.status]}</span></button></header>
    <main id="main-content" tabIndex={-1}>{error && <p className="notice error" role="alert">{error}</p>}<Suspense fallback={<p className="empty" role="status">פותחים את היומן…</p>}>{tab === 'today' && <Today date={date} onDate={d => navigate('today', d)} onReport={() => navigate('report')} />}{tab === 'week' && <Week date={date} onDate={d => navigate('week', d)} openDay={d => navigate('today', d)} />}{tab === 'report' && <Report key={`${date}|${settings.weekStartsOn}`} date={date} />}{tab === 'stats' && <Stats openDay={d => navigate('today', d)} />}{tab === 'menu' && <Menu edit={() => navigate('settings')} />}{tab === 'settings' && <Settings />}</Suspense></main>
  </div><nav className="bottom-nav" aria-label="ניווט ראשי">{tabs.map(({ id, label, icon: Icon }) => <a key={id} href={`#/${id}`} className={tab === id ? 'active' : ''} aria-current={tab === id ? 'page' : undefined}><span><Icon size={22} strokeWidth={tab === id ? 2.4 : 1.8} /></span>{label}</a>)}</nav></>;
}
