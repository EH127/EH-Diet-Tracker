# QA findings — round 1 (2026-10-08)

Manual browser QA against SPEC.md §7 at 360px/375px, light + dark. Everything in the acceptance checklist passed
(meal chips, template swap, done, weekly limits, meat-dinner warning + workout swap offer, eat-out auto charge + extras
to next day, alcohol → next free day, water/weight/notes persistence across reload, settings edits reflected on Today,
daily bank change, backup section present, no horizontal scroll, no console errors).

Remaining fixes:

1. **Lunch side should be salad only.** The original menu says lunch comes with "3 כפות סלט (ללא שמן)", but the lunch
   `תוספת` component offers the whole `sides` group (fruit + salad). Add an optional `optionIds?: string[]` restriction to
   `choice` components (when set, only those options from `groupIds` are offered), expose it in the templates editor
   (checkbox list of the options of the selected groups, "all" when empty), and set the default lunch side to the salad
   option only. Make sure existing stored settings still load (field is optional) and add a unit test.
2. **Bank presets: charge not editable for alcohol.** In Settings → בנק קלוריות, snack presets show name/kcal/charge but
   alcohol presets only show name/kcal. Every preset kind should expose an editable `charge` field (alcohol default 250).
   Give the preset inputs visible labels (they currently have no label/aria-label).
3. **README.md is missing** (create-vite README was deleted, not rewritten). Write a README per SPEC §6: Hebrew first,
   short English section; what the app is, local dev (`npm install`, `npm run dev` → http://localhost:5173/EH-Diet-Tracker/),
   tests/lint/build, Supabase setup (create project, run `supabase/migrations/0001_init.sql`, Auth → URL configuration
   Site URL `https://eh127.github.io/EH-Diet-Tracker/`, email+password provider, fill `.env.production`), deploy
   (GitHub Pages, Source = GitHub Actions; push to main deploys), backup/export.
4. **Migration grants.** Newer Supabase projects don't always grant table privileges to `authenticated` automatically.
   Append to `supabase/migrations/0001_init.sql`:
   `grant select, insert, update, delete on table public.user_settings, public.day_logs to authenticated;`
