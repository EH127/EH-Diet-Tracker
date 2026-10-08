import type { Settings, WaterUnit } from '../types';

type WaterSettings = Pick<Settings, 'waterGoal' | 'waterUnit' | 'cupMl'>;
// DayLog.water is always an integer cup count, including all existing backups.
// Changing cup size reinterprets those counts; it never rewrites historical logs.
export const waterAmount = (cups: number, settings: WaterSettings): number =>
  settings.waterUnit === 'liters' ? cups * settings.cupMl / 1000 : cups;
export const waterGoalCups = (settings: WaterSettings): number =>
  settings.waterUnit === 'liters' ? settings.waterGoal * 1000 / settings.cupMl : settings.waterGoal;
export const waterGoalMet = (cups: number, settings: WaterSettings): boolean => cups >= waterGoalCups(settings) - 1e-9;
export const waterUnitLabel = (unit: WaterUnit): string => unit === 'liters' ? 'ל׳' : 'כוסות';
export const formatWater = (value: number): string => String(Number(value.toFixed(3)));
export const waterProgressText = (cups: number, settings: WaterSettings): string =>
  `${formatWater(waterAmount(cups, settings))}/${formatWater(settings.waterGoal)} ${waterUnitLabel(settings.waterUnit)}`;
// Preserve the goal's volume when switching display units.
export const convertWaterGoal = (settings: WaterSettings, unit: WaterUnit): number =>
  waterAmount(waterGoalCups(settings), { ...settings, waterUnit: unit });
