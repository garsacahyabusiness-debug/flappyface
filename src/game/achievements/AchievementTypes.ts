import { AvatarFrameId } from '../missions/MissionTypes';
import { SkinId } from '../character/CharacterSkinManager';
import { PowerUpId } from '../powerups/PowerUpRegistry';
import { WorldId, WeatherType } from '../worlds/WorldRegistry';

export type AchievementCategory =
  | 'gameplay'
  | 'score'
  | 'skill'
  | 'collection'
  | 'characters'
  | 'worlds'
  | 'powerups'
  | 'missions'
  | 'tournament'
  | 'multiplayer'
  | 'hidden';

export type AchievementRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY';

export type AchievementRankTier =
  | 'BEGINNER'
  | 'COLLECTOR'
  | 'ACHIEVER'
  | 'MASTER'
  | 'ELITE'
  | 'LEGEND';

export type AchievementIconName =
  | 'feather'
  | 'award'
  | 'trophy'
  | 'flame'
  | 'crown'
  | 'sparkles'
  | 'shield'
  | 'heart'
  | 'coins'
  | 'gem'
  | 'zap'
  | 'star'
  | 'compass'
  | 'users'
  | 'target'
  | 'eye'
  | 'shopping'
  | 'medal';

// Preserved legacy requirementType union + 'custom' for Update 6 modular conditions
export type AchievementRequirementType =
  | 'score'
  | 'shield_saves'
  | 'revives'
  | 'coins'
  | 'gems'
  | 'powerups_total'
  | 'powerups_run'
  | 'custom';

export interface AchievementReward {
  xp: number;
  coins: number;
  gems: number;
  points: number;
  badgeId?: string;
  titleId?: string;
  frameId?: AvatarFrameId;
  skinId?: SkinId;
}

export interface AchievementMetrics {
  // Core gameplay
  gamesPlayed: number;
  totalPipes: number;
  totalScore: number;
  bestScore: number;
  totalLosses: number;
  highScoreBeats: number;
  ceilingCollisions: number;
  groundCollisions: number;
  bestSurvivalCombo: number; // 1 if survived 45s+ and scored 40+

  // Skill
  nearMissTotal: number;
  bestNearMissRun: number;
  maxRiskScoreRun: number; // max run score when >=3 near misses in that run
  bestPureSkillScore: number; // no shield & no second chance
  bestNoPowerUpScore: number;
  bestNoCoinScore: number;
  bestClassicPureScore: number; // classic_bird in green_valley without powerups
  pauseAndScore5Count: number;
  patientReadyWaitCount: number;

  // Collection & Economy
  totalCoinsCollected: number;
  totalCoinsEarned: number;
  totalGemsCollected: number;
  totalGemsEarned: number;
  totalStarsCollected: number;
  totalCoinsSpent: number;
  totalGemsSpent: number;
  shopPurchases: number;
  shopItemsOwnedCount: number;
  trifectaRuns: number; // coin + star + gem in single run

  // Characters & Skins
  unlockedCharactersCount: number;
  unlockedSkinsCount: number;
  distinctCharactersPlayed: string[];
  charsScored25: string[];
  distinctSkinsEquipped: string[];
  bestCustomFaceScore: number;

  // Worlds & Weather
  unlockedWorldsCount: number;
  nonStarterWorldGames: number;
  distinctWorldsPlayed: string[];
  worldsScored25: string[];
  distinctWeathersPlayed: string[];
  bestDarkWorldScore: number;

  // Power-Ups
  totalPowerUpsCollected: number;
  bestPowerUpsRun: number;
  shieldSaves: number;
  revivesUsed: number;
  magnetCollectedTotal: number;
  bestMagnetRun: number;
  slowMotionUsedTotal: number;
  distinctPowerUpsUsed: PowerUpId[];
  shieldSaveTo15Count: number;
  revivePlus15Count: number;

  // Missions & Daily Streaks (dailyStreak mirrored from MissionManager)
  totalMissionsCompleted: number;
  dailyMissionsCompleted: number;
  weeklyMissionsCompleted: number;
  specialMissionsCompleted: number;
  perfectDaysCount: number;
  bestStreak: number;

  // Tournament & Multiplayer
  tournamentsPlayed: number;
  tournamentsWon: number;
  bo3TournamentsWon: number;
  bo5TournamentsWon: number;
  cleanSweepTournamentsWon: number;
  comebackTournamentsWon: number;
  currentTournamentStreak: number;
  bestTournamentStreak: number;
  multiplayerPlayed: number;
  quickMatchesWon: number;
  p1Wins: number;
  p2Wins: number;
  multiplayerDraws: number;
  bestCombinedMultiplayerScore: number;

  // Hidden / Behavioral
  zeroScoreDeaths: number;
  exactScore7Count: number;
  exactScore77Count: number;
  nightOwlRuns: number;
  earlyBirdRuns: number;
  consecutiveLosses: number;
  comebackKidTriggered: number;
  visitedMenus: string[];
  lastPlayDateKey: string;
  runsTodayCount: number;
  maxRunsInSingleDay: number;
  weekendRunsCount: number;

  // Competitive Challenge System (Update 7)
  rivalsDefeated: number;
  legendRivalDefeatedCount: number;
  personalBestBreaks: number;
  challengesCompleted: number;
  dailyChallengesCompleted: number;
  weeklyChallengesCompleted: number;
  perfectRunsCompleted: number;
  competitivePoints: number;
}

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  hidden: boolean;
  secretHint?: string;
  requirement: number;
  requirementType: AchievementRequirementType;
  icon: AchievementIconName;
  rewardCoins: number;
  rewardGems: number;
  rewardXP: number;
  points: number;
  badgeId?: string;
  titleId?: string;
  frameId?: AvatarFrameId;
  skinId?: SkinId;
  chainId?: string;
  chainOrder?: number;
  getValue?: (metrics: AchievementMetrics) => number;
}

export interface AchievementRecord extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: number | null;
  progress: number;
}

export interface AchievementChainDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  achievementIds: readonly string[];
}

export interface AchievementChainState {
  chain: AchievementChainDef;
  completedCount: number;
  totalCount: number;
  nextAchievement: AchievementRecord | null;
  steps: AchievementRecord[];
}

export type BadgeCategory =
  | 'gameplay'
  | 'skill'
  | 'collection'
  | 'tournament'
  | 'world'
  | 'hidden'
  | 'seasonal';

export type BadgeShape =
  | 'shield'
  | 'wings'
  | 'crown'
  | 'star'
  | 'gem'
  | 'flame'
  | 'planet'
  | 'mask'
  | 'trophy'
  | 'medal'
  | 'ribbon'
  | 'crest';

export interface BadgeDefinition {
  id: string;
  name: string;
  category: BadgeCategory;
  rarity: AchievementRarity;
  shape: BadgeShape;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  description: string;
  unlockConditionLabel: string;
  points: number;
  linkedAchievementId?: string;
  linkedShopItemId?: string;
}

export interface BadgeRecord extends BadgeDefinition {
  unlocked: boolean;
  unlockedAt: number | null;
}

export interface AchievementHistoryEntry {
  achievementId: string;
  name: string;
  rarity: AchievementRarity;
  category: AchievementCategory;
  hidden: boolean;
  unlockedAt: number;
  points: number;
  coins: number;
  gems: number;
  xp: number;
  badgeId?: string;
  titleId?: string;
}

export interface AchievementStatsSummary {
  totalAchievements: number;
  unlockedAchievements: number;
  lockedAchievements: number;
  completionPercent: number;
  totalAchievementPoints: number;
  earnedAchievementPoints: number;
  remainingAchievementPoints: number;
  totalCoinsEarned: number;
  totalGemsEarned: number;
  totalXpEarned: number;
  unlockedHiddenCount: number;
  totalHiddenCount: number;
  byRarity: Record<AchievementRarity, { unlocked: number; total: number }>;
  byCategory: Record<AchievementCategory, { unlocked: number; total: number }>;
  rank: AchievementRankInfo;
}

export interface AchievementRankInfo {
  tier: AchievementRankTier;
  label: string;
  minPoints: number;
  nextTierLabel: string | null;
  nextTierPoints: number | null;
  progressPercent: number;
  colorHex: string;
}

export interface AchievementSnapshot {
  records: AchievementRecord[];
  badges: BadgeRecord[];
  chains: AchievementChainState[];
  stats: AchievementStatsSummary;
  recentUnlocks: AchievementHistoryEntry[];
  featuredAchievement: AchievementRecord | null;
  showcaseIds: string[];
}

export type AchievementEvent =
  | {
      type: 'game_started';
      mode: 'solo' | 'quick' | 'bo3' | 'bo5';
      characterId: string;
      skinId: string;
      worldId: WorldId;
      weather: WeatherType | null;
      isCustomFace: boolean;
      localHour: number;
      isWeekend?: boolean;
      readyWaitSeconds?: number;
    }
  | {
      type: 'pipe_passed';
      count?: number;
    }
  | {
      type: 'score_updated';
      score: number;
      mode: 'solo' | 'quick' | 'bo3' | 'bo5';
      usedPowerUp: boolean;
      usedShield: boolean;
      usedSecondChance: boolean;
      coinsInRun: number;
      nearMissCountInRun: number;
      characterId: string;
      worldId: WorldId;
      isCustomFace: boolean;
    }
  | {
      type: 'near_miss';
      count?: number;
      inRunTotal: number;
    }
  | {
      type: 'powerup_used';
      powerUpId: PowerUpId;
      inRunCount: number;
    }
  | {
      type: 'shield_saved';
    }
  | {
      type: 'revive_used';
    }
  | {
      type: 'magnet_collect';
      count: number;
      inRunTotal: number;
    }
  | {
      type: 'coin_collected';
      amount: number;
    }
  | {
      type: 'gem_collected';
      amount: number;
    }
  | {
      type: 'star_collected';
      amount: number;
    }
  | {
      type: 'game_completed';
      mode: 'solo' | 'quick' | 'bo3' | 'bo5';
      score: number;
      pipes: number;
      elapsedSeconds: number;
      reason: 'pipe' | 'ground' | 'ceiling';
      characterId: string;
      worldId: WorldId;
      isCustomFace: boolean;
      usedPowerUp: boolean;
      usedShield: boolean;
      usedSecondChance: boolean;
      shieldSavesInRun: number;
      scoreAfterRevive: number;
      coinsInRun: number;
      starsInRun: number;
      gemsInRun: number;
      didPauseAndScore5: boolean;
      localHour: number;
    }
  | {
      type: 'high_score_updated';
      newBest: number;
      previousBest: number;
    }
  | {
      type: 'character_unlocked';
      unlockedCount: number;
    }
  | {
      type: 'skin_unlocked';
      unlockedCount: number;
    }
  | {
      type: 'skin_equipped';
      skinId: string;
    }
  | {
      type: 'world_unlocked';
      unlockedCount: number;
    }
  | {
      type: 'tournament_completed';
      format: 'bo3' | 'bo5';
      won: boolean;
      winner: 'player1' | 'player2' | 'draw';
      cleanSweep: boolean;
      comebackWin: boolean;
    }
  | {
      type: 'multiplayer_played';
      format: 'quick' | 'bo3' | 'bo5';
      winner: 'player1' | 'player2' | 'draw';
      combinedScore: number;
    }
  | {
      type: 'mission_completed';
      category: 'daily' | 'weekly' | 'special';
      perfectDay?: boolean;
    }
  | {
      type: 'streak_updated';
      currentStreak: number;
      bestStreak: number;
    }
  | {
      type: 'shop_purchase';
      coinsSpent: number;
      gemsSpent: number;
      totalOwnedCount: number;
    }
  | {
      type: 'menu_visited';
      menuId: string;
    }
  | {
      type: 'competitive_sync';
      rivalsDefeated: number;
      legendRivalDefeatedCount: number;
      personalBestBreaks: number;
      challengesCompleted: number;
      dailyChallengesCompleted: number;
      weeklyChallengesCompleted: number;
      perfectRunsCompleted: number;
      competitivePoints: number;
    }
  | {
      type: 'external_sync';
    };

export interface ShopItemDefinition {
  id: string;
  name: string;
  description: string;
  kind: 'skin' | 'frame' | 'badge';
  rarity: AchievementRarity;
  costCoins: number;
  costGems: number;
  targetId: string;
  previewColor: string;
}
