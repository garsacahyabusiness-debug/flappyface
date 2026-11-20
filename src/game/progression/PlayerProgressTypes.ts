import type { CharacterRarity } from '../character/CharacterRegistry';
import type { SkinId } from '../character/CharacterSkinManager';
import type { AvatarFrameId } from '../missions/MissionTypes';

export type ProgressionProfileId = 'solo' | 'player1' | 'player2';

export type XPEventCategory =
  | 'gameplay'
  | 'mission'
  | 'tournament'
  | 'achievement'
  | 'collection';

export interface XPHistoryEntry {
  id: string;
  eventId: string;
  amount: number;
  label: string;
  category: XPEventCategory;
  timestamp: number;
  levelAfter: number;
}

export interface PlayerRankTier {
  id: string;
  minLevel: number;
  maxLevel: number;
  name: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  gradientClass: string;
}

export type TitleRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface TitleDefinition {
  id: string;
  name: string;
  rarity: TitleRarity;
  description: string;
  unlockRequirementLabel: string;
  sourceLabel: string;
  minLevel?: number;
}

export type LevelRewardKind =
  | 'coins'
  | 'gems'
  | 'title'
  | 'character_rarity'
  | 'skin'
  | 'world_theme'
  | 'avatar_frame'
  | 'ultimate_bundle';

export interface LevelRewardDef {
  level: number;
  title: string;
  subtitle: string;
  icon: string;
  kind: LevelRewardKind;
  isMilestone: boolean;
  coins?: number;
  gems?: number;
  titleId?: string;
  characterRarity?: CharacterRarity;
  skinId?: SkinId;
  avatarFrame?: AvatarFrameId;
  worldThemeId?: 'aurora_sky';
  fallbackCoins?: number;
  fallbackGems?: number;
}

export interface LevelRewardGrantOutcome {
  success: boolean;
  level: number;
  alreadyClaimed?: boolean;
  coinsGranted: number;
  gemsGranted: number;
  unlockedCharacterId?: string;
  unlockedCharacterName?: string;
  unlockedSkinId?: SkinId;
  unlockedTitleId?: string;
  unlockedFrameId?: AvatarFrameId;
  unlockedWorldTheme?: boolean;
  usedFallback?: boolean;
  summaryLabel: string;
}

export interface LevelUpEvent {
  id: string;
  profileId: ProgressionProfileId;
  fromLevel: number;
  toLevel: number;
  xpGained: number;
  previousRank: PlayerRankTier;
  newRank: PlayerRankTier;
  rankPromoted: boolean;
  unlockedRewardLevels: number[];
  unlockedTitleIds: string[];
  timestamp: number;
}

export interface XPNotificationItem {
  id: string;
  profileId: ProgressionProfileId;
  amount: number;
  label: string;
  category: XPEventCategory;
  count: number;
  timestamp: number;
}

export interface ProgressionProfileStats {
  playTimeSeconds: number;
  totalXPEarned: number;
  totalGameplayXP: number;
  totalMissionXP: number;
  totalTournamentXP: number;
  totalAchievementXP: number;
  totalCollectionXP: number;
  totalGamesPlayed: number;
  totalPipesPassed: number;
  totalScore: number;
  bestScore: number;
  quickMatchWins: number;
  tournamentWins: number;
  tournamentCompletions: number;
  totalCoinsEarned: number;
  totalGemsEarned: number;
  characterUsage: Record<string, number>;
  worldUsage: Record<string, number>;
}

export interface PlayerProgressProfile {
  profileId: ProgressionProfileId;
  playerName: string;
  currentLevel: number;
  totalXP: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
  isMaxLevel: boolean;
  totalLevelUps: number;
  highestLevel: number;
  rank: PlayerRankTier;
  equippedTitleId: string;
  unlockedTitleIds: string[];
  unlockedFrameIds: AvatarFrameId[];
  equippedFrameId: AvatarFrameId;
  claimedLevelRewards: number[];
  unlockedExclusiveWorldTheme: boolean;
  xpHistory: XPHistoryEntry[];
  stats: ProgressionProfileStats;
}

export interface AwardXPRequest {
  profileId?: ProgressionProfileId;
  eventId: string;
  amount: number;
  label: string;
  category: XPEventCategory;
  timestamp?: number;
  silentToast?: boolean;
}

export interface AwardXPResult {
  awarded: boolean;
  amount: number;
  previousLevel: number;
  newLevel: number;
  levelsGained: number;
  rankPromoted: boolean;
  levelUpEvent: LevelUpEvent | null;
}
