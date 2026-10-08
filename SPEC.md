# EH Diet Tracker — Product & Technical Spec

A personal, mobile-first web app (PWA) for tracking adherence to a fixed diet menu. Single user, Hebrew UI, RTL.
The original menu text from the dietitian is in `docs/original-menu.md` — it is the source of truth for the default menu below.

Deployed to GitHub Pages at `https://eh127.github.io/EH-Diet-Tracker/` (repo `EH127/EH-Diet-Tracker`).
Data is offline-first in `localStorage` and synced to Supabase when the user is signed in.

---

## 1. Stack (already installed — do NOT add new npm dependencies; the sandbox has no network)

- Vite 8 + React 19 + TypeScript (strict). Project was scaffolded with `create-vite` (react-ts template); replace the demo content.
- Tailwind CSS v4 via `@tailwindcss/vite` (CSS-first config: `@import "tailwindcss";` + `@theme` in `src/index.css`; no tailwind.config.js).
- `@supabase/supabase-js` v2 — auth + data sync.
- `recharts` v3 — charts.
- `lucide-react` — icons.
- `@fontsource-variable/heebo` — the only font (import in `main.tsx`).
- `vite-plugin-pwa` — manifest + service worker (`registerType: 'autoUpdate'`), offline app shell.
- `@vite-pwa/assets-generator` — generate PNG icons from an SVG you author at `public/icon.svg` (add a `generate-pwa-assets` script and run it; commit the generated PNGs).
- `vitest` — unit tests for the pure logic (`npm test` script → `vitest run`).
- `oxlint` — lint (`npm run lint`).

No router library: use simple tab state in React, persisted to `location.hash` (`#/today`, `#/week`, `#/stats`, `#/menu`, `#/settings`) so refresh/back works on GitHub Pages without 404s.

`vite.config.ts`: `base: '/EH-Diet-Tracker/'`. Make sure the PWA manifest `start_url`/`scope` and icon paths respect the base.

`index.html`: `<html lang="he" dir="rtl">`, title `מעקב תפריט`, theme-color meta, apple-touch-icon, `viewport-fit=cover`.

---

## 2. Domain model

All dates are **local calendar dates** as `YYYY-MM-DD` strings. Never use `toISOString()` to derive a date key (UTC shift bug in Israel). Write small helpers in `src/lib/dates.ts` (format key, parse key, add days, start of week, week days, Hebrew day names, Hebrew date display) and unit-test them.

Week starts on **Sunday** by default (`weekStartsOn: 0`, configurable).

### 2.1 Settings (the editable menu — everything here is user-customizable)

```ts
type FoodOption = {
  id: string;
  name: string;            // e.g. "חזה עוף"
  amount: string;          // free text, e.g. "200 גרם אחרי בישול"
  kcal?: number;           // optional, informational
  weeklyLimit?: number;    // e.g. salmon 3, tuna in oil 3 (counts selections Sun–Sat)
  note?: string;           // e.g. "לשקול!"
  active: boolean;         // inactive options are hidden from pickers but kept for history
};

type OptionGroup = { id: string; name: string; options: FoodOption[] };

type MealComponent =
  | {
      id: string;
      kind: 'choice';
      label: string;                         // e.g. "חלבון"
      groupIds: string[];                    // options come from these groups
      pick: number;                          // how many to choose (dairy dinner protein = 2)
      required: boolean;
      amountOverrides?: Record<string, string>; // optionId -> amount text for this meal (e.g. bread "2 פרוסות")
      amountNote?: string;                   // shown under the label, e.g. "כחצי מהכמות בצהריים — 100–120 גרם"
    }
  | {
      id: string;
      kind: 'check';                         // optional add-on checkbox, e.g. "כף מיונז לייט"
      label: string;
      note?: string;
    };

type MealTemplate = {
  id: string;
  name: string;                // "ארוחת בוקר", "צהריים", ...
  emoji?: string;
  components: MealComponent[];
  requiresWorkout?: boolean;   // meat dinner: only allowed on workout days (warn, don't block)
  weeklyLimit?: number;        // eating out: 2 per week
  preferWorkout?: boolean;     // eating out: show a soft hint if the day is not a workout day
  bankChargeSameDay?: number;  // eating out: auto-charge 250 to the same day's bank
  extraChargeKcal?: number;    // eating out: each "extra topping" charges 250 to another day (default: next day)
  countsAsCheat?: boolean;     // eating out = true (shown in weekly stats)
  note?: string;               // rules shown on the card
};

type DaySlot = { id: string; name: string; defaultTemplateId: string };

type BankPreset = { id: string; kind: 'snack' | 'alcohol' | 'other'; name: string; kcal: number; charge: number };
type SnackItem = { id: string; name: string; portion?: string; kcal: number; note?: string };
type SnackCategory = { id: string; name: string; emoji?: string; items: SnackItem[] };
// snack presets: charge === kcal ("תפוציפס קידס 45 גרם" ~250).
// alcohol presets: charge is a flat 250 per drink regardless of kcal (rule: every drink costs 250 from that day or another day).

type Settings = {
  version: number;
  weekStartsOn: 0 | 1;              // 0 = Sunday (default)
  dailyBankKcal: number;            // 250
  waterGoal: number;                // glasses per day, default 8
  weightGoal?: number;              // kg, optional
  theme: 'system' | 'light' | 'dark';
  groups: OptionGroup[];
  templates: MealTemplate[];
  slots: DaySlot[];
  bankPresets: BankPreset[];
  snackCatalog: SnackCategory[];    // free-calorie snacks, separate from the existing bank presets
  rules: string[];                  // general guidelines shown on the Menu tab and as tips
  updatedAt: string;                // ISO timestamp, for sync LWW
};
```

### 2.2 Default settings (encode in `src/data/defaultSettings.ts`, faithful to `docs/original-menu.md`)

Option groups:

- **`bfCarbs` — פחמימה לבוקר/ערב**
  - קורנפלקס אלופים צהוב (בלי דבש/סוכר) — `45 גרם` — note `לשקול!`
  - לחם (כל סוג) — `3 פרוסות`
  - לחמניה — `1`
  - פיתה — `1`
  - טורטיה — `1`
- **`dairyProtein` — חלבון לבוקר/ערב**
  - משקה חלבון 0% — `20–25 גרם חלבון`
  - חלב 3% — `כוס וחצי (~200 גרם)`
  - מעדן חלבון 0% — `20–25 גרם חלבון`
  - ביצים (M/L) — `3`
  - קוטג' 5% — `חבילה`
  - טונה במים — `קופסה`
  - טונה בשמן — `קופסה` — weeklyLimit **3** — note `במקום טונה במים, עד 3 בשבוע`
  - גבינה לבנה 3%/5% — `חבילת 250 גרם`
- **`sides` — תוספת**
  - פרי — `1 (תפוח / ~10 ענבים)`
  - סלט ללא שמן — `3 כפות`
- **`meatProtein` — חלבון לצהריים**
  - חזה עוף — `200 גרם אחרי בישול`
  - עוף משולשים/פולקע — `2 משולשים או 4 פולקע`
  - דג — `200 גרם`
  - סלמון — `200 גרם` — weeklyLimit **3**
  - בשר טחון — `200 גרם`
  - צלי / אנטריקוט / סינטה — `200–250 גרם`
  - שאוורמה בצלחת — `200 גרם` — note `עדיף ביתי, רק כשאין ברירה`
- **`lunchCarbs` — פחמימה לצהריים**
  - אורז — `200 גרם`
  - פסטה — `150 גרם`
  - תפוח אדמה / פירה / בטטה (בתנור) — `250 גרם`
  - קינואה / כוסמת / בורגול / קוסקוס — `200 גרם`
- **`eatOut` — אוכל בחוץ**
  - לאפה שאוורמה — note `בלי צ'יפס, בלי טחינה; סלטי ירקות חופשי (לא מיונז/כרוב)`
  - פיתה שאוורמה — same note
  - פיצה — `3 משולשים ממשפחתית או אישית` — note `תוספות ירקות חופשי; נקניק/בטטה וכו' = תוספת`
  - סושי — `2–3 רולים` — note `עדיף שלא; לא מטוגנים, בלי ספייסי מיונז`
  - אחר — free

Meal templates:

1. **`breakfast` — ארוחת בוקר ☀️**: choice פחמימה (`bfCarbs`, pick 1, required); choice חלבון (`dairyProtein`, pick 1, required); choice תוספת (`sides`, pick 1, required); check `כף מיונז לייט`.
2. **`lunch` — ארוחת צהריים 🍗**: choice חלבון (`meatProtein`, pick 1, required); choice פחמימה (`lunchCarbs`, pick 1, required); choice תוספת (`sides` — only the salad option makes sense; use `amountOverrides`/default to "סלט ללא שמן 3 כפות", pick 1, required); check `כף מיונז לייט`.
3. **`dairyDinner` — ארוחת ערב חלבית 🥚**: choice חלבון (`dairyProtein`, **pick 2**, required); choice פחמימה (`bfCarbs`, pick 1, required, `amountOverrides` bread → `2 פרוסות`); choice תוספת (`sides`, pick 1, optional); check `כף מיונז לייט`.
4. **`meatDinner` — ארוחת ערב בשרית 🥩** (`requiresWorkout: true`): choice חלבון (`meatProtein`, pick 1, required); choice פחמימה (`lunchCarbs`, pick 1, required, `amountNote: "כחצי מהכמות בצהריים — 100–120 גרם"`); choice תוספת (`sides`, pick 1, optional); check `כף מיונז לייט`.
5. **`eatOut` — ארוחה בחוץ 🍕** (`weeklyLimit: 2`, `preferWorkout: true`, `bankChargeSameDay: 250`, `extraChargeKcal: 250`, `countsAsCheat: true`): choice מה אכלת (`eatOut`, pick 1, required). Note: `מוותרים על ה-250 של היום. כל תוספת מיוחדת = 250 מיום אחר. בלי צ'יפס.`

Day slots (default): `בוקר` → breakfast, `צהריים` → lunch, `ערב` → dairyDinner. (The 250 snack is handled by the bank, not a slot.)

Bank presets: snack `תפוציפס קידס 45 גרם` 250/250; snack `חטיף עד 250 קלוריות` 250/250; alcohol `2 צ'ייסרים` kcal 250 / charge 250; alcohol `שליש בירה` kcal 200 / charge 250; alcohol `כוס יין` kcal 120 / charge 250.

Snack catalog: 46 items from `docs/snacks-original.md`, grouped as גלידות 🍦, חטיפים 🥨, שוקולדים 🍫, ממתקים 🍬. The second repeated גלידות heading means חטיפים. גודי is counted as 100 kcal with a note about the 50–100 range. The snack bank sheet supports name/portion search, category filters, quantities 1–5 and a fits-remaining filter using the chosen charge date. Catalog entries charge their kcal × quantity; existing presets and custom entries stay available.

Older local settings, backups and pulled settings receive cloned defaults for missing catalogs via `withSettingsDefaults`. Menu export includes the catalog; importing a menu that lacks it keeps the current catalog (or applies defaults if both lack it). Intentionally empty catalogs remain empty. Settings supports category/item CRUD, reordering and confirmed default restoration; Menu displays the catalog next to the bank presets.

Rules (`rules[]`, shown on Menu tab; editable list):
- `מותר להחליף בין הארוחות (למשל צהריים בערב).`
- `ערב בשרי — רק ביום שהיה אימון בחדר כושר.`
- `שמן: ספריי על המחבת / לפני התנור, או כפית שמן מקסימום.`
- `אפשר כף מיונז לייט בכל ארוחה.`
- `אוכל בחוץ — עד פעמיים בשבוע, עדיף אחרי אימון. באותו יום מוותרים על ה-250. כל תוספת מיוחדת = 250 מיום אחר. בלי צ'יפס.`
- `מסעדה ביתית / מזרחית — להתאים לארוחת צהריים, ולא נחשב צ'יט.`
- `אלכוהול: עדיף עם משקאות ללא סוכר. כל משקה = 250 מהיום או מיום אחר.`
- `סלמון עד 3 פעמים בשבוע, טונה בשמן עד 3 פעמים בשבוע.`

### 2.3 Day log

```ts
type MealEntry = {
  slotId: string;
  templateId: string;                     // user can swap the template for this slot ("מותר להחליף בין הארוחות")
  selections: Record<string, string[]>;   // componentId -> optionIds (choice) ; componentId -> ['1'] for checked add-on
  done: boolean;
  extras?: number;                        // eatOut only: number of special toppings
  freeText?: string;                      // eatOut "אחר" / anything
};

type BankEntry = {
  id: string;
  kind: 'snack' | 'alcohol' | 'eatout' | 'extra' | 'other';
  label: string;
  kcal: number;         // informational (real calories)
  charge: number;       // what it costs from the bank
  chargeDate: string;   // YYYY-MM-DD of the day whose 250 is used (default: same day; can be another day)
  auto?: boolean;       // created automatically by an eatOut meal (kept in sync with the meal: remove if meal changed/removed)
};

type DayLog = {
  date: string;              // YYYY-MM-DD
  workout: boolean;
  meals: MealEntry[];        // one per slot (create lazily from settings.slots + defaultTemplateId)
  bank: BankEntry[];         // entries ORIGINATING on this day (chargeDate may point elsewhere)
  water: number;             // glasses
  weight?: number;           // kg
  notes?: string;
  updatedAt: string;         // ISO, for sync LWW
};
```

### 2.4 Pure logic (`src/lib/*.ts`, unit-tested with vitest)

- **Bank per day**: `spent(date) = Σ charge of all BankEntry in all logs where chargeDate === date`. `remaining = settings.dailyBankKcal − spent`. Negative = overdrawn (red).
- **Adding a bank entry**: default `chargeDate` = the current day if `remaining ≥ charge`, else the **next day** that has enough remaining (look up to 14 days ahead). User can always override the date in the add dialog (quick buttons: היום / מחר / תאריך אחר).
- **Eating out meal**: when a slot's template is `eatOut` (and `bankChargeSameDay` set), maintain one `auto` BankEntry `{kind:'eatout', charge:250, chargeDate: same day}`. Each `extras` unit maintains one `auto` `{kind:'extra', charge:250}` defaulting to the next day with room (user can change the date). Changing the template away from eatOut removes those auto entries.
- **Weekly limits** (week = 7 days starting at `weekStartsOn` containing the date): count selections of each option with `weeklyLimit` across all meals in the week; count meals per template with `weeklyLimit`. Status: ok / at limit / over. Show a warning chip when choosing an option that is at its limit ("כבר 3/3 השבוע").
- **Workout rule**: if a slot uses a `requiresWorkout` template on a day with `workout=false` → warning on the card ("ערב בשרי רק ביום אימון"). If eatOut on a non-workout day → soft hint ("עדיף אחרי אימון").
- **Meal completeness**: a meal is complete when every required choice component has exactly `pick` selections. Marking `done` on an incomplete meal is allowed but shows a subtle hint.
- **Day adherence score** (0–100): share of slots that are `done` & complete, minus penalties shown as flags (weekly limit exceeded that day, meat dinner without workout, bank overdrawn). Keep the formula simple and documented in code; the stats page shows the score plus the flags.

---

## 3. Screens (mobile-first, RTL, bottom tab bar; desktop = centered column max ~480px, or two columns on wide screens where it helps)

Bottom nav tabs (lucide icons + Hebrew labels): **היום**, **שבוע**, **גרפים**, **תפריט**, **הגדרות**.

### 3.1 היום (Today / any day)
- Header: Hebrew date with day name, prev/next arrows, tap to open a date picker, "חזרה להיום" when not on today. Sync status dot (synced / syncing / offline / not signed in).
- **Workout toggle** ("היה אימון היום 💪") — prominent switch. On ⇒ unlocks meat dinner suggestion: if the evening slot is still untouched, offer a one-tap "להחליף לערב בשרי?".
- **Meal cards**, one per slot: slot name + template selector (small dropdown/segmented to swap template) + for each component a row of selectable chips showing `name` and the amount (respecting `amountOverrides`/`amountNote`). Respect `pick` (pick 2 → up to two chips). Weekly-limit badges on chips. Check add-ons as small toggles. Big "✓ אכלתי" done button. Card shows warnings (workout rule, limits). Eating-out card: extras stepper (+/-) with the bank-charge explanation and free text.
- **Bank card ("בנק 250")**: progress ring/bar of today's remaining kcal; list of entries charged to today (including ones that came from other days, labelled "מיום X"); buttons "+ חטיף", "+ אלכוהול", "+ אחר" opening a bottom sheet with presets + custom kcal + charge-date choice; swipe/trash to delete. Show upcoming days that are already pre-spent ("מחר כבר נוצלו 250").
- **Water**: glass counter with +/− and goal progress.
- **Weight**: optional numeric input (kg, 1 decimal); show delta vs last recorded weight.
- **Notes**: free text area (autosave).
- Small "weekly limits" strip at the bottom: salmon x/3, tuna-in-oil x/3, eating out x/2, workouts this week.

### 3.2 שבוע (Week)
- Week selector (prev/next), range label.
- 7 day rows/cards (Sun→Sat): adherence score ring, meal dots (done/partial/empty), 💪 if workout, 🍕 if ate out, bank remaining (green/red), water. Tap → jumps to that day in "היום".
- Weekly limits panel: every option/template that has a `weeklyLimit` with count/limit progress bars.
- Weekly bank summary: total budget (7×250) vs spent, list of overdrawn days.

### 3.3 גרפים (Stats & history)
Range selector: 7 ימים / 30 יום / 90 יום / הכל. Charts (recharts, RTL-friendly, responsive, readable in dark mode, tooltips in Hebrew):
- Weight line chart (with goal reference line if set, and 7-day moving average).
- Daily adherence score bars.
- Bank usage per day (spent vs budget line).
- Water per day vs goal.
- Workouts per week bars.
- Top chosen foods (horizontal bars, per component type).
- Summary tiles: average adherence, streak of on-plan days, current weight & change, workouts this month, eat-outs this month.
- History list: scrollable list of past days with score; tap → open that day.

### 3.4 תפריט (Menu reference)
Read-only, nicely formatted view of the current settings: each template with its components and options/amounts, weekly limits, bank presets, and the rules list. This is the "cheat sheet" for the user. Link "לעריכה →" to Settings.

### 3.5 הגדרות (Settings — "as customizable as possible")
Sections (collapsible):
- **חשבון וסנכרון**: Supabase email+password sign in / sign up / sign out, current user email, last sync time, "סנכרן עכשיו" button. If Supabase env vars are missing: show "סנכרון לא הוגדר" and keep working locally.
- **קבוצות ומאכלים**: CRUD for groups and options (name, amount, kcal, weeklyLimit, note, active), reorder (up/down buttons are fine), delete with confirm. Option ids are generated (`crypto.randomUUID()`), never reused.
- **ארוחות (תבניות)**: CRUD templates: name, emoji, note, requiresWorkout, preferWorkout, weeklyLimit, bank charges, countsAsCheat; components editor (kind, label, groups multi-select, pick, required, amount overrides per option, amountNote).
- **מבנה היום**: CRUD slots (name, default template), reorder.
- **בנק קלוריות**: daily bank kcal, presets CRUD.
- **קטלוג נשנושים**: category name/emoji and item name/portion/kcal/note CRUD, reorder, confirmed deletion and restore defaults.
- **יעדים**: water goal, weight goal, week start day (ראשון/שני).
- **כללים**: edit the rules list.
- **תצוגה**: theme system/light/dark.
- **גיבוי**: export all data (settings + logs) as JSON download; import JSON (validate shape, confirm, merge or replace); reset settings to default (confirm); clear all local data (confirm, typed confirmation).
Changes autosave. Deleting an option/template must not break old logs: logs keep ids; when rendering an unknown id show it as "(נמחק)".

---

## 4. Persistence & sync

- `src/lib/storage.ts`: localStorage key `ehdt:v1` holding `{ settings, logs: Record<date, DayLog>, meta: { lastPulledAt?: string, dirtyDays: string[], settingsDirty: boolean } }`. Schema `version` + a migrate function. Wrap all localStorage access in try/catch.
- App state: a small store (React context + `useSyncExternalStore` or `useReducer`) — no new libraries. Every mutation updates `updatedAt` and marks the record dirty.
- `src/lib/supabase.ts`: create client only if `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist. Add `src/vite-env.d.ts` typings and a `.env.example`.
- `src/lib/sync.ts` (offline-first, last-write-wins by `updatedAt`):
  - Push: upsert dirty day logs into `day_logs` and settings into `user_settings` (debounced ~1.5s after changes, and on `visibilitychange` hidden).
  - Pull: on sign-in, app start, window focus/visibility visible, every 5 min while visible: select rows with `updated_at > lastPulledAt` (or everything on first sign-in), merge LWW per record (compare `data.updatedAt`).
  - On first sign-in with existing local data: merge both directions (LWW), never wipe local data.
  - Handle offline gracefully (navigator.onLine, errors → retry later), expose status for the header dot.
- SQL migration file `supabase/migrations/0001_init.sql`:
  ```sql
  create table public.user_settings (
    user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
    data jsonb not null,
    updated_at timestamptz not null default now()
  );
  create table public.day_logs (
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    day date not null,
    data jsonb not null,
    updated_at timestamptz not null default now(),
    primary key (user_id, day)
  );
  create index day_logs_user_updated_idx on public.day_logs (user_id, updated_at);
  alter table public.user_settings enable row level security;
  alter table public.day_logs enable row level security;
  -- policies: select/insert/update/delete only where (select auth.uid()) = user_id, `to authenticated`
  ```
  Write all 8 policies explicitly. `updated_at` is set by the client from the record's `updatedAt`.

---

## 5. Design

- Hebrew everywhere, `dir="rtl"`. Font: Heebo Variable. Numbers/kcal use tabular figures.
- Mobile-first: big tap targets (≥44px), bottom tab bar with safe-area padding, bottom sheets for add dialogs, no horizontal scroll at 360px width.
- Visual direction: clean and calm "healthy" feel — warm off-white background, deep green primary (`#1f7a4d`-ish), amber for bank/warnings, red only for over-limit. Rounded cards, soft shadows, subtle progress rings. Full dark mode (system + manual), defined as CSS variables in `@theme`/`:root` and a `.dark` class on `<html>`.
- Micro-feedback: done button animates, chips have clear selected state; respect `prefers-reduced-motion`.
- Empty states with friendly Hebrew copy.
- Accessibility: labels on inputs, aria-pressed on chips, focus-visible rings, sufficient contrast.

---

## 6. Deployment

- `.github/workflows/deploy.yml`: on push to `main` (+ `workflow_dispatch`): checkout, setup-node 22 with npm cache, `npm ci`, `npm test`, `npm run build`, upload `dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`, `contents: read`; concurrency group `pages`.
- Supabase URL + anon key will be committed in `.env.production` (they are public by design; RLS protects the data). Create `.env.production` with empty placeholders for now; the app must work in local-only mode while they are empty.
- `public/404.html` not needed (hash routing).
- Rewrite `README.md` (Hebrew + short English): what it is, local dev, Supabase setup steps (run migration, set Site URL, auth email settings), deploy.

---

## 7. Acceptance checklist

- `npm run build`, `npm test`, `npm run lint` all pass with zero errors.
- Works fully with no Supabase env vars (local mode).
- Fresh load shows today with 3 meal cards from defaults; choosing chips, swapping templates, marking done, adding bank entries, water, weight, notes all persist across reload.
- Weekly limits count correctly across Sun–Sat and warn at/over limit.
- Eat-out meal auto-charges 250 to the same day; extras charge the next day with room; removing eat-out removes the auto entries.
- Alcohol preset charges 250 per drink; overdrawn days show red.
- Meat dinner on a non-workout day shows a warning; workout toggle offers the swap.
- Settings edits (add an option, change an amount, add a template, change daily bank) immediately reflect on Today/Menu.
- Export → clear → import restores everything.
- Lighthouse-style basics: installable PWA (manifest + SW + icons), works offline after first load.
- No horizontal scroll at 360px; dark mode looks right.
