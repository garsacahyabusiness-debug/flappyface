import { AchievementRarity, AchievementRankInfo, AchievementRankTier } from './AchievementTypes';

export interface RarityRewardPreset {
  rarity: AchievementRarity;
  label: string;
  xp: number;
  coins: number;
  gems: number;
  points: number;
  colorHex: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  cardGradient: string;
  glowRgba: string;
}

export const ACHIEVEMENT_RARITY_CONFIG: Record<AchievementRarity, RarityRewardPreset> = {
  COMMON: {
    rarity: 'COMMON',
    label: 'COMMON',
    xp: 25,
    coins: 25,
    gems: 0,
    points: 10,
    colorHex: '#94A3B8',
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    borderClass: 'border-slate-300',
    cardGradient: 'from-slate-50 to-slate-100',
    glowRgba: 'rgba(148, 163, 184, 0.35)',
  },
  UNCOMMON: {
    rarity: 'UNCOMMON',
    label: 'UNCOMMON',
    xp: 50,
    coins: 50,
    gems: 0,
    points: 25,
    colorHex: '#22C55E',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    cardGradient: 'from-emerald-50 to-green-100',
    glowRgba: 'rgba(34, 197, 94, 0.35)',
  },
  RARE: {
    rarity: 'RARE',
    label: 'RARE',
    xp: 100,
    coins: 100,
    gems: 2,
    points: 50,
    colorHex: '#3B82F6',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    borderClass: 'border-sky-300',
    cardGradient: 'from-sky-50 to-blue-100',
    glowRgba: 'rgba(59, 130, 246, 0.42)',
  },
  EPIC: {
    rarity: 'EPIC',
    label: 'EPIC',
    xp: 250,
    coins: 250,
    gems: 5,
    points: 100,
    colorHex: '#9333EA',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    borderClass: 'border-purple-300',
    cardGradient: 'from-purple-50 to-fuchsia-100',
    glowRgba: 'rgba(147, 51, 234, 0.48)',
  },
  LEGENDARY: {
    rarity: 'LEGENDARY',
    label: 'LEGENDARY',
    xp: 500,
    coins: 500,
    gems: 10,
    points: 250,
    colorHex: '#F59E0B',
    badgeBg: 'bg-amber-200',
    badgeText: 'text-amber-950',
    borderClass: 'border-amber-400',
    cardGradient: 'from-amber-50 via-yellow-100 to-orange-100',
    glowRgba: 'rgba(245, 158, 11, 0.58)',
  },
};

export const ACHIEVEMENT_RANK_THRESHOLDS: readonly {
  tier: AchievementRankTier;
  label: string;
  minPoints: number;
  colorHex: string;
}[] = [
  { tier: 'BEGINNER', label: 'BEGINNER', minPoints: 0, colorHex: '#64748B' },
  { tier: 'COLLECTOR', label: 'COLLECTOR', minPoints: 100, colorHex: '#22C55E' },
  { tier: 'ACHIEVER', label: 'ACHIEVER', minPoints: 500, colorHex: '#3B82F6' },
  { tier: 'MASTER', label: 'MASTER', minPoints: 1000, colorHex: '#8B5CF6' },
  { tier: 'ELITE', label: 'ELITE', minPoints: 2500, colorHex: '#EC4899' },
  { tier: 'LEGEND', label: 'LEGEND', minPoints: 5000, colorHex: '#F59E0B' },
];

export function computeAchievementRank(earnedPoints: number): AchievementRankInfo {
  const safePoints = Math.max(0, Math.floor(earnedPoints));
  let currentIdx = 0;
  for (let i = ACHIEVEMENT_RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (safePoints >= ACHIEVEMENT_RANK_THRESHOLDS[i].minPoints) {
      currentIdx = i;
      break;
    }
  }
  const current = ACHIEVEMENT_RANK_THRESHOLDS[currentIdx];
  const next =
    currentIdx + 1 < ACHIEVEMENT_RANK_THRESHOLDS.length
      ? ACHIEVEMENT_RANK_THRESHOLDS[currentIdx + 1]
      : null;

  let progressPercent = 100;
  if (next) {
    const span = Math.max(1, next.minPoints - current.minPoints);
    progressPercent = Math.min(100, Math.max(0, Math.round(((safePoints - current.minPoints) / span) * 100)));
  }

  return {
    tier: current.tier,
    label: current.label,
    minPoints: current.minPoints,
    nextTierLabel: next ? next.label : null,
    nextTierPoints: next ? next.minPoints : null,
    progressPercent,
    colorHex: current.colorHex,
  };
}
