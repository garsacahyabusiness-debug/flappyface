import { CharacterRarity } from '../character/CharacterRegistry';
import { SkinId } from '../character/CharacterSkinManager';
import { PowerUpId } from '../powerups/PowerUpRegistry';
import { WorldId } from '../worlds/WorldRegistry';

export type MissionCategory = 'daily' | 'weekly' | 'special';

export type MissionDifficulty = 'easy' | 'medium' | 'hard' | 'weekly' | 'special';

export type MissionEventType =
  | 'game_started'
  | 'game_finished'
  | 'pipe_passed'
  | 'score_reached'
  | 'coin_collected'
  | 'star_collected'
  | 'gem_collected'
  | 'powerup_used'
  | 'world_played'
  | 'character_used'
  | 'tournament_started'
  | 'tournament_won'
  | 'match_won'
  | 'multiplayer_played'
  | 'mission_completed';

export type AvatarFrameId =
  | 'default'
  | 'gold_champion'
  | 'perfect_wings'
  | 'cosmic_explorer'
  | 'streak_flame'
  | 'elite_azure'
  | 'ultimate_legend';

export interface MissionReward {
  coins: number;
  gems: number;
  xp?: number;
  skinId?: SkinId;
  badge?: string;
  title?: string;
  avatarFrame?: AvatarFrameId;
}

export type MissionConditionKind =
  | 'play_games'
  | 'pass_pipes'
  | 'single_run_score'
  | 'cumulative_score'
  | 'collect_coins'
  | 'collect_stars'
  | 'collect_gems'
  | 'use_powerups'
  | 'distinct_powerups'
  | 'distinct_worlds'
  | 'play_world'
  | 'use_character'
  | 'play_multiplayer'
  | 'win_matches'
  | 'complete_daily_missions';

export interface MissionCondition {
  kind: MissionConditionKind;
  soloOnly?: boolean;
  worldId?: WorldId;
  nonStarterWorld?: boolean;
  characterId?: string;
  minRarity?: CharacterRarity;
  noCollision?: boolean;
  noShield?: boolean;
  noSecondChance?: boolean;
  matchFormat?: 'any' | 'quick' | 'tournament';
}

export interface MissionEligibilityContext {
  unlockedWorldIds: readonly WorldId[];
  unlockedCharacterIds: readonly string[];
  hasRareOrHigherCharacter: boolean;
  powerUpsEnabled: boolean;
  collectiblesEnabled: boolean;
}

export interface MissionDefinition {
  id: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  title: string;
  description: string;
  icon: string;
  target: number;
  condition: MissionCondition;
  reward: MissionReward;
  exclusiveGroup?: string;
  isEligible?: (ctx: MissionEligibilityContext) => boolean;
}

export interface MissionInstance {
  id: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  completedAt: number | null;
  claimedAt: number | null;
  periodKey: string;
  reward: MissionReward;
  metaProgress?: string[];
}

export interface MissionEventPayload {
  type: MissionEventType;
  mode?: 'solo' | 'quick' | 'bo3' | 'bo5';
  playerSlot?: 1 | 2 | null;
  score?: number;
  pipes?: number;
  amount?: number;
  worldId?: WorldId;
  characterId?: string;
  characterRarity?: CharacterRarity;
  powerUpId?: PowerUpId;
  collidedThisRun?: boolean;
  usedShieldThisRun?: boolean;
  usedSecondChanceThisRun?: boolean;
  winner?: 'player1' | 'player2' | 'draw';
  completedMissionId?: string;
  completedMissionCategory?: MissionCategory;
  timestamp?: number;
}

export interface MissionHistoryEntry {
  id: string;
  missionId: string;
  title: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  icon: string;
  periodKey: string;
  completedAt: number;
  claimedAt: number | null;
  reward: MissionReward;
  status: 'completed' | 'claimed';
}

export interface StreakMilestone {
  days: number;
  label: string;
  reward: MissionReward;
}

export interface StreakState {
  currentStreak: number;
  bestStreak: number;
  lastClaimDateKey: string | null;
  claimedMilestones: number[];
  recentClaimDates: string[];
}

export interface MissionCosmeticsState {
  titles: string[];
  badges: string[];
  frames: AvatarFrameId[];
  equippedTitle: string | null;
  equippedFrame: AvatarFrameId;
}

export interface MissionStatsSummary {
  totalCompleted: number;
  totalClaimed: number;
  totalCoinsEarned: number;
  totalGemsEarned: number;
}

export interface UnclaimedMissionCounts {
  daily: number;
  weekly: number;
  special: number;
  total: number;
}

export interface MissionCompletionNotification {
  id: string;
  missionId: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  title: string;
  icon: string;
  reward: MissionReward;
}

export interface ClaimRewardResult {
  success: boolean;
  mission?: MissionInstance;
  rewardGranted?: MissionReward;
  streakUpdated?: boolean;
  newStreak?: number;
  streakMilestonesUnlocked: StreakMilestone[];
  unlockedCosmetics: {
    skinId?: SkinId;
    badge?: string;
    title?: string;
    avatarFrame?: AvatarFrameId;
  };
}

export interface MissionSnapshot {
  dailyPeriodKey: string;
  weeklyPeriodKey: string;
  dailyMissions: MissionInstance[];
  weeklyMissions: MissionInstance[];
  specialMissions: MissionInstance[];
  history: MissionHistoryEntry[];
  streak: StreakState;
  stats: MissionStatsSummary;
  cosmetics: MissionCosmeticsState;
  unclaimed: UnclaimedMissionCounts;
  nowMs: number;
}
