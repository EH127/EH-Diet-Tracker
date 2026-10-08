import type { FoodOption, MealComponent, Settings } from '../types';

const option = (id: string, name: string, amount: string, extra: Partial<FoodOption> = {}): FoodOption =>
  ({ id, name, amount, active: true, ...extra });
const choice = (id: string, label: string, groupId: string, pick = 1, required = true): MealComponent =>
  ({ id, kind: 'choice', label, groupIds: [groupId], pick, required });
const mayo = (id: string): MealComponent => ({ id, kind: 'check', label: 'כף מיונז לייט' });

export const defaultSettings: Settings = {
  version: 1, weekStartsOn: 0, dailyBankKcal: 250, waterGoal: 8, waterUnit: 'cups', cupMl: 250, stepsGoal: 10000, theme: 'system',
  habits: [
    { id: 'aerobic', name: 'אירובי', emoji: '🏃' },
    { id: 'noScreen', name: 'אכלתי בלי טלפון ובלי מסך', emoji: '📵' },
  ],
  weeklyReport: { workoutTarget: 3, aerobicTarget: 3, tasks: [
    { id: 'water', label: 'מים', rule: { type: 'water-every-day' } },
    { id: 'steps', label: '10 אלף צעדים', rule: { type: 'steps-average' } },
    { id: 'workouts', label: 'כל האימונים', rule: { type: 'workout-count' } },
    { id: 'menu', label: 'עמידה בתפריט 10/10', rule: { type: 'rating-10' } },
    { id: 'aerobic', label: '3 אירובי', rule: { type: 'habit-count', habitId: 'aerobic' } },
    { id: 'noScreen', label: 'לאכול בלי טלפון ולא מול מסך', rule: { type: 'habit-every-day', habitId: 'noScreen' } },
  ] },
  // Pristine defaults must never win against an edited cloud menu on first login.
  updatedAt: '1970-01-01T00:00:00.000Z',
  groups: [
    { id: 'bfCarbs', name: 'פחמימה לבוקר/ערב', options: [
      option('cornflakes', 'קורנפלקס אלופים צהוב (בלי דבש/סוכר)', '45 גרם', { note: 'לשקול!' }),
      option('bread', 'לחם (כל סוג)', '3 פרוסות'), option('roll', 'לחמניה', '1'),
      option('pita', 'פיתה', '1'), option('tortilla', 'טורטיה', '1'),
    ] },
    { id: 'dairyProtein', name: 'חלבון לבוקר/ערב', options: [
      option('proteinDrink', 'משקה חלבון 0%', '20–25 גרם חלבון'), option('milk', 'חלב 3%', 'כוס וחצי (~200 גרם)'),
      option('proteinYogurt', 'מעדן חלבון 0%', '20–25 גרם חלבון'), option('eggs', 'ביצים (M/L)', '3'),
      option('cottage', "קוטג' 5%", 'חבילה'), option('tunaWater', 'טונה במים', 'קופסה'),
      option('tunaOil', 'טונה בשמן', 'קופסה', { weeklyLimit: 3, note: 'במקום טונה במים, עד 3 בשבוע' }),
      option('whiteCheese', 'גבינה לבנה 3%/5%', 'חבילת 250 גרם'),
    ] },
    { id: 'sides', name: 'תוספת', options: [option('fruit', 'פרי', '1 (תפוח / ~10 ענבים)'), option('salad', 'סלט ללא שמן', '3 כפות')] },
    { id: 'meatProtein', name: 'חלבון לצהריים', options: [
      option('chickenBreast', 'חזה עוף', '200 גרם אחרי בישול'), option('chicken', 'עוף משולשים/פולקע', '2 משולשים או 4 פולקע'),
      option('fish', 'דג', '200 גרם'), option('salmon', 'סלמון', '200 גרם', { weeklyLimit: 3 }),
      option('groundBeef', 'בשר טחון', '200 גרם'), option('steak', 'צלי / אנטריקוט / סינטה', '200–250 גרם'),
      option('shawarmaPlate', 'שאוורמה בצלחת', '200 גרם', { note: 'עדיף ביתי, רק כשאין ברירה' }),
    ] },
    { id: 'lunchCarbs', name: 'פחמימה לצהריים', options: [
      option('rice', 'אורז', '200 גרם'), option('pasta', 'פסטה', '150 גרם'),
      option('potato', 'תפוח אדמה / פירה / בטטה (בתנור)', '250 גרם'), option('grains', 'קינואה / כוסמת / בורגול / קוסקוס', '200 גרם'),
    ] },
    { id: 'eatOut', name: 'אוכל בחוץ', options: [
      option('shawarmaLaffa', 'לאפה שאוורמה', '', { note: "בלי צ'יפס, בלי טחינה; סלטי ירקות חופשי (לא מיונז/כרוב)" }),
      option('shawarmaPita', 'פיתה שאוורמה', '', { note: "בלי צ'יפס, בלי טחינה; סלטי ירקות חופשי (לא מיונז/כרוב)" }),
      option('pizza', 'פיצה', '3 משולשים ממשפחתית או אישית', { note: "תוספות ירקות חופשי; נקניק/בטטה וכו' = תוספת" }),
      option('sushi', 'סושי', '2–3 רולים', { note: 'עדיף שלא; לא מטוגנים, בלי ספייסי מיונז' }), option('otherEatOut', 'אחר', 'לפי הבחירה'),
    ] },
  ],
  templates: [
    { id: 'breakfast', name: 'ארוחת בוקר', emoji: '☀️', components: [choice('bf-carb', 'פחמימה', 'bfCarbs'), choice('bf-protein', 'חלבון', 'dairyProtein'), choice('bf-side', 'תוספת', 'sides'), mayo('bf-mayo')] },
    { id: 'lunch', name: 'ארוחת צהריים', emoji: '🍗', components: [choice('lunch-protein', 'חלבון', 'meatProtein'), choice('lunch-carb', 'פחמימה', 'lunchCarbs'), { ...choice('lunch-side', 'תוספת', 'sides'), optionIds: ['salad'], amountOverrides: { salad: '3 כפות' } } as MealComponent, mayo('lunch-mayo')] },
    { id: 'dairyDinner', name: 'ארוחת ערב חלבית', emoji: '🥚', components: [choice('dairy-protein', 'חלבון', 'dairyProtein', 2), { ...choice('dairy-carb', 'פחמימה', 'bfCarbs'), amountOverrides: { bread: '2 פרוסות' } } as MealComponent, choice('dairy-side', 'תוספת', 'sides', 1, false), mayo('dairy-mayo')] },
    { id: 'meatDinner', name: 'ארוחת ערב בשרית', emoji: '🥩', requiresWorkout: true, components: [choice('meat-protein', 'חלבון', 'meatProtein'), { ...choice('meat-carb', 'פחמימה', 'lunchCarbs'), amountNote: 'כחצי מהכמות בצהריים — 100–120 גרם' } as MealComponent, choice('meat-side', 'תוספת', 'sides', 1, false), mayo('meat-mayo')] },
    { id: 'eatOut', name: 'ארוחה בחוץ', emoji: '🍕', weeklyLimit: 2, preferWorkout: true, bankChargeSameDay: 250, extraChargeKcal: 250, countsAsCheat: true, components: [choice('eatout-food', 'מה אכלת', 'eatOut')], note: "מוותרים על ה-250 של היום. כל תוספת מיוחדת = 250 מיום אחר. בלי צ'יפס." },
  ],
  slots: [
    { id: 'morning', name: 'בוקר', defaultTemplateId: 'breakfast' }, { id: 'noon', name: 'צהריים', defaultTemplateId: 'lunch' }, { id: 'evening', name: 'ערב', defaultTemplateId: 'dairyDinner' },
  ],
  bankPresets: [
    { id: 'chips', kind: 'snack', name: 'תפוציפס קידס 45 גרם', kcal: 250, charge: 250 },
    { id: 'snack', kind: 'snack', name: 'חטיף עד 250 קלוריות', kcal: 250, charge: 250 },
    { id: 'shots', kind: 'alcohol', name: "2 צ'ייסרים", kcal: 250, charge: 250 },
    { id: 'beer', kind: 'alcohol', name: 'שליש בירה', kcal: 200, charge: 250 },
    { id: 'wine', kind: 'alcohol', name: 'כוס יין', kcal: 120, charge: 250 },
  ],
  snackCatalog: [
    { id: 'ice', name: 'גלידות', emoji: '🍦', items: [
      { id: 'ice-gumigam', name: 'גומיגם', kcal: 110 },
      { id: 'ice-watermelon', name: 'אבטיח', kcal: 110 },
      { id: 'ice-mastikgam', name: 'מסטיקגם', kcal: 130 },
      { id: 'ice-target', name: 'מטרה', kcal: 100 },
      { id: 'ice-bubble-gum', name: 'באבל גם', kcal: 100 },
      { id: 'ice-choco-banana', name: 'שוקו בננה', kcal: 150 },
      { id: 'ice-cassata', name: 'קסטה', kcal: 150 },
      { id: 'ice-la-frutta', name: 'לה פרוטה', kcal: 70 },
      { id: 'ice-glidonit', name: 'גלידונית', portion: '4 יחידות', kcal: 150 },
      { id: 'ice-bomba', name: 'בומבה', kcal: 230 },
      { id: 'ice-goody', name: 'גודי', kcal: 100, note: '50–100 קלוריות לפי הסוג, נספר כ-100' },
    ] },
    { id: 'salty', name: 'חטיפים', emoji: '🥨', items: [
      { id: 'salty-bamba', name: 'במבה', portion: '28 יחידות', kcal: 100 },
      { id: 'salty-bamba-nougat', name: 'במבה נוגט', portion: '13 יחידות', kcal: 100 },
      { id: 'salty-bissli-grill', name: 'ביסלי גריל', portion: '20 יחידות', kcal: 100 },
      { id: 'salty-small-bamba', name: 'במבה קטנה', kcal: 135 },
      { id: 'salty-pretzels', name: 'בייגלה', portion: '26 יחידות', kcal: 100 },
      { id: 'salty-dubonim', name: 'דובונים', portion: 'שקית', kcal: 210 },
      { id: 'salty-red-bamba', name: 'במבה אדומה', portion: 'שקית', kcal: 140 },
      { id: 'salty-chips-kids', name: 'ציפס קידס', kcal: 100 },
      { id: 'salty-mini-dubonim', name: 'מיני דובונים', kcal: 110 },
    ] },
    { id: 'chocolate', name: 'שוקולדים', emoji: '🍫', items: [
      { id: 'chocolate-twist', name: 'טוויסט', kcal: 134 },
      { id: 'chocolate-tortit', name: 'טורטית', kcal: 230 },
      { id: 'chocolate-egozi', name: 'אגוזי', kcal: 220 },
      { id: 'chocolate-cubes', name: 'קוביות שוקולד', portion: '5 קוביות', kcal: 100 },
      { id: 'chocolate-mini-kifkef', name: 'כיפכף / פסק זמן מיני', kcal: 110 },
      { id: 'chocolate-happy-hippo', name: 'הפי היפו', kcal: 120 },
      { id: 'chocolate-kinder-finger', name: 'אצבע קינדר', kcal: 70 },
      { id: 'chocolate-kinder-egg', name: 'ביצת קינדר', kcal: 110 },
      { id: 'chocolate-kinder-bueno', name: 'קינדר בואנו', portion: 'פס', kcal: 120 },
      { id: 'chocolate-click-pillows', name: 'קליק כריות', portion: '6 יחידות', kcal: 100 },
      { id: 'chocolate-click-brown-white', name: 'קליק חום לבן', portion: '27 יחידות', kcal: 70 },
      { id: 'chocolate-mms', name: "M&M's", portion: '20 יחידות', kcal: 100 },
      { id: 'chocolate-quarter-to-seven', name: 'רבע לשבע / עד חצות', portion: 'יחידה', kcal: 75 },
      { id: 'chocolate-ferrero-rocher', name: 'פררו רושה', portion: 'יחידה', kcal: 70 },
      { id: 'chocolate-krembo', name: 'קרמבו', kcal: 100 },
      { id: 'chocolate-oreo', name: 'אוראו', portion: 'עוגייה', kcal: 50 },
    ] },
    { id: 'candy', name: 'ממתקים', emoji: '🍬', items: [
      { id: 'candy-mentos', name: 'מנטוס', portion: '10 יחידות', kcal: 100 },
      { id: 'candy-baby-doll', name: 'סוכריות בייבי דול', portion: 'חבילה', kcal: 110 },
      { id: 'candy-tic-tac', name: 'טיקטק', portion: 'חבילה', kcal: 65 },
      { id: 'candy-mini-skittles', name: 'מיני סקיטלס', portion: 'שקית', kcal: 150 },
      { id: 'candy-gummy-carpet', name: 'שטיח גומי', kcal: 40 },
      { id: 'candy-gummy-bears', name: 'דובוני גומי', portion: '8 יחידות', kcal: 100 },
      { id: 'candy-sour-lion', name: 'חמצוצים אריה', portion: 'חבילה', kcal: 180 },
      { id: 'candy-long-licorice', name: 'ליקריץ ארוך', portion: 'יחידה', kcal: 100 },
      { id: 'candy-marshmallow', name: 'מרשמלו', portion: '6 יחידות', kcal: 100 },
      { id: 'candy-mike-like', name: 'מייק לייק', portion: '15 יחידות', kcal: 100 },
    ] },
  ],
  deviationCategories: [
    { id: 'bigPortion', name: 'מנה גדולה מהמותר', emoji: '🍽️' }, { id: 'offMenu', name: 'מאכל מחוץ לתפריט', emoji: '🍔' },
    { id: 'fried', name: "מטוגן / צ'יפס", emoji: '🍟' }, { id: 'sweet', name: 'מתוק', emoji: '🍫' },
    { id: 'sugaryDrink', name: 'משקה ממותק', emoji: '🥤' }, { id: 'otherDeviation', name: 'אחר', emoji: '✏️' },
  ],
  rules: [
    'מותר להחליף בין הארוחות (למשל צהריים בערב).',
    'ערב בשרי — רק ביום שהיה אימון בחדר כושר.',
    'שמן: ספריי על המחבת / לפני התנור, או כפית שמן מקסימום.',
    'אפשר כף מיונז לייט בכל ארוחה.',
    "אוכל בחוץ — עד פעמיים בשבוע, עדיף אחרי אימון. באותו יום מוותרים על ה-250. כל תוספת מיוחדת = 250 מיום אחר. בלי צ'יפס.",
    "מסעדה ביתית / מזרחית — להתאים לארוחת צהריים, ולא נחשב צ'יט.",
    'אלכוהול: עדיף עם משקאות ללא סוכר. כל משקה = 250 מהיום או מיום אחר.',
    'סלמון עד 3 פעמים בשבוע, טונה בשמן עד 3 פעמים בשבוע.',
  ],
};
export const freshSettings = (): Settings => structuredClone(defaultSettings);
