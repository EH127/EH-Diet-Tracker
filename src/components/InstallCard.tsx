import { useState } from 'react';
import { Download, X } from 'lucide-react';
import { isIos, isStandalone, promptInstall, useCanInstall } from '../lib/install';
const key = 'install-card-dismissed';
const wasDismissed = () => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
export function InstallCard() {
  const canInstall = useCanInstall();
  const [hidden, setHidden] = useState(wasDismissed);
  if (hidden || isStandalone()) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(key, '1'); } catch { /* ignore */ } };
  return <section className="notice row between"><span><Download size={16} /> {canInstall ? 'אפשר להתקין את האפליקציה במסך הבית.' : isIos() ? 'להתקנה: כפתור השיתוף ← "הוספה למסך הבית".' : 'אפשר להתקין את האפליקציה מתפריט הדפדפן.'}</span>{canInstall && <button className="text-button" onClick={() => { void promptInstall(); }}>התקנה</button>}<button className="icon-button" aria-label="סגירה" onClick={dismiss}><X size={16} /></button></section>;
}
