import { Download } from 'lucide-react';
import { isIos, isStandalone, promptInstall, useCanInstall } from '../../lib/install';
export function InstallSettings() {
  const canInstall = useCanInstall();
  if (isStandalone()) return <p>האפליקציה מותקנת ✓</p>;
  if (canInstall) return <div className="stack"><p className="muted">מקבלים אייקון במסך הבית ופתיחה מהירה, כמו אפליקציה רגילה.</p><button className="primary-button" onClick={() => { void promptInstall(); }}><Download size={17} />התקנה במסך הבית</button></div>;
  if (isIos()) return <ol className="muted"><li>פותחים את האתר ב-Safari.</li><li>לוחצים על כפתור השיתוף.</li><li>בוחרים &quot;הוספה למסך הבית&quot;.</li></ol>;
  return <p className="muted">בתפריט הדפדפן בוחרים &quot;התקנת אפליקציה&quot; (Install app) או &quot;הוספה למסך הבית&quot; (Add to Home screen).</p>;
}
