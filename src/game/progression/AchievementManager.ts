export {
  AchievementManager,
  achievementManager,
  type PowerUpMetricsInput,
} from '../achievements/AchievementManager';
export {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_MAP,
  ACHIEVEMENT_CATEGORY_LABELS,
} from '../achievements/AchievementRegistry';
export {
  ACHIEVEMENT_RARITY_CONFIG,
  ACHIEVEMENT_RANK_THRESHOLDS,
  computeAchievementRank,
} from '../achievements/AchievementPointsManager';
export { ACHIEVEMENT_CHAINS } from '../achievements/AchievementChains';
export { FIXED_BADGE_REGISTRY as BADGE_REGISTRY, BADGE_MAP, getBadgeById } from '../achievements/BadgeRegistry';
export { REWARD_SHOP_ITEMS, rewardShopManager } from '../achievements/RewardShopManager';
export type {
  AchievementCategory,
  AchievementRarity,
  AchievementRankTier,
  AchievementIconName,
  AchievementRequirementType,
  AchievementDefinition,
  AchievementRecord,
  AchievementSnapshot,
  AchievementStatsSummary,
  AchievementChainState,
  AchievementHistoryEntry,
  AchievementEvent,
  BadgeCategory,
  BadgeShape,
  BadgeDefinition,
  BadgeRecord,
  ShopItemDefinition,
} from '../achievements/AchievementTypes';
