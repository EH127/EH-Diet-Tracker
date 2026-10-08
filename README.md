# EH Diet Tracker

מעקב תזונה אישי בעברית (RTL), מותאם למובייל ו-PWA. מציג את תפריט היום (בוקר, צהריים, ערב), מאפשר לבחור מאכלים, לעקוב אחרי מכסות שבועיות, בנק קלוריות יומי, מים, משקל והערות. הנתונים נשמרים מקומית בדפדפן, ואפשר לסנכרן לענן עם Supabase.

## פיתוח מקומי

```bash
npm install
npm run dev
```

האפליקציה תעלה בכתובת http://localhost:5173/EH-Diet-Tracker/ . ללא משתני סביבה של Supabase היא עובדת במצב מקומי בלבד.

```bash
npm test         # בדיקות יחידה (vitest)
npm run lint     # בדיקת קוד (oxlint)
npm run build    # בנייה לפרודקשן
```

## הקמת Supabase

1. יוצרים פרויקט חדש ב-[Supabase](https://supabase.com).
2. ב-SQL Editor מריצים את הקובץ `supabase/migrations/0001_init.sql` (טבלאות, מדיניות RLS והרשאות).
3. ב-Authentication ← URL Configuration מגדירים Site URL: `https://eh127.github.io/EH-Diet-Tracker/`.
4. ב-Authentication ← Providers מפעילים את ספק Email (אימייל וסיסמה).
5. ממלאים בקובץ `.env.production` את `VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY` (המפתח הציבורי בטוח לפרסום, ההגנה על הנתונים היא באמצעות RLS).

## פריסה

הפריסה היא ל-GitHub Pages. בהגדרות המאגר: Settings ← Pages ← Source = GitHub Actions. כל push ל-`main` מריץ בדיקות, בונה ומפרסם (`.github/workflows/deploy.yml`).

## גיבוי וייצוא

במסך ההגדרות, בקטע הגיבוי, אפשר לייצא את כל ההגדרות והיומנים לקובץ JSON ולייבא אותו בחזרה. מומלץ לייצא מדי פעם.

## משימות ודוח שבועי

במסך היום אפשר לסמן משימות יומיות ולעקוב אחרי שתייה בכוסות או בליטרים. גודל הכוס והיעד מוגדרים בהגדרות. היומן שומר מספר כוסות; מעבר יחידה ממיר את היעד, ושינוי גודל הכוס משפיע גם על תצוגת ההיסטוריה. נתונים ישנים ממשיכים להיטען עם כוס של 250 מ״ל.

הכפתור ״📋 דוח שבועי״ במסך השבוע והבאנר ביום הראשון בשבוע פותחים את הדוח. ביום הראשון הוא מתייחס לשבוע שהסתיים, וביתר הימים לשבוע הנוכחי. אפשר לבחור שבוע אחר, לערוך את הפרטים והסימונים, להעתיק או לשתף לוואטסאפ. העריכות הן להודעה בלבד.

אפשר להפעיל בהגדרות התראות תזכורת לדוח השבועי; ברירת המחדל היא יום ראשון בשעה 10:00. לפני פריסת התכונה, יש לבדוק ולהחיל ידנית את `supabase/migrations/0005_weekly_report_reminder.sql`, ואז לפרוס את פונקציית `supabase/functions/push` המעודכנת ואת האפליקציה. אותה משימת cron קיימת מטפלת בסיכום הערב ובתזכורת השבועית. המיגרציה אינה משנה RLS, מדיניות או הרשאות.

---

## English

EH Diet Tracker is a Hebrew, RTL, mobile-first diet-tracking PWA (React 19, Vite, TypeScript). It shows the day's meals and tracks weekly food limits, a daily calorie bank, water, weight and notes. Data lives in localStorage and can optionally sync through Supabase.

- Local dev: `npm install`, `npm run dev`, then open http://localhost:5173/EH-Diet-Tracker/. Works without Supabase env vars (local-only mode).
- Checks: `npm test`, `npm run lint`, `npm run build`.
- Supabase: create a project, run `supabase/migrations/0001_init.sql`, set the Auth Site URL to `https://eh127.github.io/EH-Diet-Tracker/`, enable the email+password provider, and fill `.env.production` with the project URL and anon key.
- Deploy: GitHub Pages with Source = GitHub Actions; pushing to `main` deploys.
- Backup: export/import a JSON backup from Settings.
