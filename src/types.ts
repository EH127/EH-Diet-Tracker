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
export type DeviationCategory = { id: string; name: string; emoji?: string };
export type Settings = {
  version: number; weekStartsOn: 0 | 1; dailyBankKcal: number; waterGoal: number; weightGoal?: number;
  theme: 'system' | 'light' | 'dark'; groups: OptionGroup[]; templates: MealTemplate[]; slots: DaySlot[];
  bankPresets: BankPreset[]; deviationCategories: DeviationCategory[]; rules: string[]; updatedAt: string;
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
};
export type Logs = Record<string, DayLog>;
export type StoreData = {
  settings: Settings; logs: Logs;
  meta: { lastPulledAt?: string; cursorVersion?: number; dirtyDays: string[]; settingsDirty: boolean; syncUserId?: string; lastSyncedAt?: string; localResetId?: string };
};
export type Backup = { version: number; settings: Settings; logs: Logs };
