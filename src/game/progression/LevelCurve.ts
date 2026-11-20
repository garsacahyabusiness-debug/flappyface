export const MIN_PLAYER_LEVEL = 1;
export const MAX_PLAYER_LEVEL = 100;

/**
 * Balanced arcade progression curve derived from baseline:
 * 100 + (LEVEL * 35) + floor(LEVEL * LEVEL * 1.5)
 *
 * Sample requirements (XP needed to advance FROM `level` TO `level + 1`):
 * - Lv 1 -> 2: 136 XP
 * - Lv 5 -> 6: 312 XP (Cumulative Lv 5: ~793 XP)
 * - Lv 10 -> 11: 600 XP (Cumulative Lv 10: ~2,851 XP)
 * - Lv 25 -> 26: 1,912 XP (Cumulative Lv 25: ~20,415 XP)
 * - Lv 50 -> 51: 5,600 XP (Cumulative Lv 50: ~109,321 XP)
 * - Lv 99 -> 100: 18,266 XP (Cumulative Lv 100: ~678,349 XP)
 */
export function getXPRequiredForLevel(level: number): number {
  const safeLevel = Math.floor(level);
  if (safeLevel < MIN_PLAYER_LEVEL || safeLevel >= MAX_PLAYER_LEVEL) {
    return 0;
  }
  return 100 + safeLevel * 35 + Math.floor(safeLevel * safeLevel * 1.5);
}

export function getCumulativeXPForLevel(targetLevel: number): number {
  const clamped = Math.max(MIN_PLAYER_LEVEL, Math.min(MAX_PLAYER_LEVEL, Math.floor(targetLevel)));
  let sum = 0;
  for (let lvl = MIN_PLAYER_LEVEL; lvl < clamped; lvl += 1) {
    sum += getXPRequiredForLevel(lvl);
  }
  return sum;
}

export interface ComputedLevelState {
  currentLevel: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

export function computeLevelStateFromTotalXP(rawTotalXP: number): ComputedLevelState {
  const totalXP =
    typeof rawTotalXP === 'number' && Number.isFinite(rawTotalXP) && rawTotalXP > 0
      ? Math.floor(rawTotalXP)
      : 0;

  let level = MIN_PLAYER_LEVEL;
  let remaining = totalXP;

  while (level < MAX_PLAYER_LEVEL) {
    const needed = getXPRequiredForLevel(level);
    if (needed <= 0 || remaining < needed) {
      break;
    }
    remaining -= needed;
    level += 1;
  }

  if (level >= MAX_PLAYER_LEVEL) {
    const capDisplay = getXPRequiredForLevel(MAX_PLAYER_LEVEL - 1);
    return {
      currentLevel: MAX_PLAYER_LEVEL,
      currentLevelXP: capDisplay,
      nextLevelXP: capDisplay,
      progressPercent: 100,
      isMaxLevel: true,
    };
  }

  const nextLevelXP = getXPRequiredForLevel(level);
  const progressPercent =
    nextLevelXP > 0 ? Math.min(100, Math.max(0, Math.round((remaining / nextLevelXP) * 100))) : 0;

  return {
    currentLevel: level,
    currentLevelXP: remaining,
    nextLevelXP,
    progressPercent,
    isMaxLevel: false,
  };
}
