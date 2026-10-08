export type FoodOption = {
  id: string; name: string; amount: string; kcal?: number; weeklyLimit?: number; note?: string; active: boolean;
};
export type OptionGroup = { id: string; name: string; options: FoodOption[] };
export type MealComponent =
  | { id: string; kind: 'choice'; label: string; groupIds: string[]; pick: number; required: boolean; optionIds?: string[]; amountOverrides?: Record<string, string>; amountNote?: string }
  | { id: string; kind: 'check'; label: string; note?: string };
export type MealTemplate = {
  id: string; name: string; emoji?: string; components: MealComponent[]; requiresWorkout?: boolean;
  weeklyLimit?: number; preferWorkout?: boolean; bankChargeSameDay?: number; extraChargeKcal?: number;
  countsAsCheat?: boolean; note?: string;
};
export type DaySlot = { id: string; name: string; defaultTemplateId: string };
export type BankPreset = { id: string; kind: 'snack' | 'alcohol' | 'other'; name: string; kcal: number; charge: number };
export type SnackItem = { id: string; name: string; portion?: string; kcal: number; note?: string };
export type SnackCategory = { id: string; name: string; emoji?: string; items: SnackItem[] };
export type DeviationCategory = { id: string; name: string; emoji?: string };
export type Habit = { id: string; name: string; emoji?: string };
export type WaterUnit = 'cups' | 'liters';
export type ReportRule =
  | { type: 'water-every-day' | 'rating-10' | 'manual' }
  | { type: 'habit-every-day'; habitId: string }
  // An omitted count follows the corresponding weekly report target.
  | { type: 'habit-count'; habitId: string; n?: number }
  | { type: 'workout-count'; n?: number };
export type ReportTask = { id: string; label: string; rule: ReportRule };
export type WeeklyReportSettings = { startWeight?: number; workoutTarget: number; aerobicTarget: number; tasks: ReportTask[] };
export type Settings = {
  version: number; weekStartsOn: 0 | 1; dailyBankKcal: number; waterGoal: number; weightGoal?: number;
  waterUnit: WaterUnit; cupMl: number; habits: Habit[]; weeklyReport: WeeklyReportSettings;
  theme: 'system' | 'light' | 'dark'; groups: OptionGroup[]; templates: MealTemplate[]; slots: DaySlot[];
  bankPresets: BankPreset[]; snackCatalog: SnackCategory[]; deviationCategories: DeviationCategory[]; rules: string[]; updatedAt: string;
};
export type MealEntry = {
  slotId: string; templateId: string; selections: Record<string, string[]>; done: boolean; extras?: number; freeText?: string;
};
export type BankEntry = {
  id: string; kind: 'snack' | 'alcohol' | 'eatout' | 'extra' | 'other' | 'deviation'; label: string; kcal: number;
  charge: number; chargeDate: string; auto?: boolean; category?: string; note?: string; groupId?: string;
};
export type DayLog = {
  date: string; workout: boolean; meals: MealEntry[]; bank: BankEntry[]; water: number; weight?: number; notes?: string; updatedAt: string;
  habits?: Record<string, boolean>;
};
export type Logs = Record<string, DayLog>;
export type StoreData = {
  settings: Settings; logs: Logs;
  meta: { lastPulledAt?: string; cursorVersion?: number; dirtyDays: string[]; settingsDirty: boolean; syncUserId?: string; lastSyncedAt?: string; localResetId?: string };
};
export type Backup = { version: number; settings: Settings; logs: Logs };
