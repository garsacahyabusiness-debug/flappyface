import type { AvatarFrameId } from '../missions/MissionTypes';
import {
  computeLevelStateFromTotalXP,
  MAX_PLAYER_LEVEL,
  MIN_PLAYER_LEVEL,
} from './LevelCurve';
import { LEVEL_REWARD_MAP, LEVEL_REWARD_TRACK } from './LevelRewardRegistry';
import {
  AwardXPRequest,
  AwardXPResult,
  LevelUpEvent,
  PlayerProgressProfile,
  ProgressionProfileId,
  ProgressionProfileStats,
  XPEventCategory,
  XPHistoryEntry,
  XPNotificationItem,
} from './PlayerProgressTypes';
import { getRankForLevel } from './RankManager';
import { findTitleByNameOrId, getTitleById, TITLE_MAP, TITLE_REGISTRY } from './TitleRegistry';

const PROGRESSION_STORAGE_KEY = 'flappy_face_player_progression';
const PROGRESSION_STORAGE_VERSION = 1;
const MAX_XP_HISTORY = 150;
const MAX_PROCESSED_EVENTS = 800;

const VALID_FRAMES = new Set<AvatarFrameId>([
  'default',
  'gold_champion',
  'perfect_wings',
  'cosmic_explorer',
  'streak_flame',
  'elite_azure',
  'ultimate_legend',
]);

const WORLD_UNLOCK_XP_MAP: Record<string, number> = {
  green_valley: 0,
  candy_world: 50,
  snow_land: 75,
  tropical_island: 100,
  lava_world: 150,
  neon_city: 200,
  sky_kingdom: 250,
  space_odyssey: 500,
};

const ACHIEVEMENT_XP_MAP: Record<string, number> = {
  first_flight: 25,
  rookie: 25,
  pro_flyer: 50,
  shield_savior: 50,
  second_chance_master: 50,
  lucky_flyer: 50,
  impossible: 100,
  sky_master: 100,
  coin_collector: 100,
  power_user: 100,
  gem_hunter: 250,
  legend: 250,
};

const SKIN_UNLOCK_XP_MAP: Record<string, number> = {
  default: 0,
  neon: 25,
  retro_pixel: 25,
  shadow: 25,
  halloween: 25,
  golden: 50,
  christmas: 50,
  galaxy: 50,
  rainbow: 100,
};

const SCORE_MILESTONE_XP: ReadonlyArray<{ score: number; xp: number }> = [
  { score: 5, xp: 10 },
  { score: 10, xp: 20 },
  { score: 20, xp: 35 },
  { score: 30, xp: 50 },
  { score: 50, xp: 100 },
];

interface InternalProfileState {
  profileId: ProgressionProfileId;
  playerName: string;
  totalXP: number;
  totalLevelUps: number;
  highestLevel: number;
  equippedTitleId: string;
  unlockedTitleIds: string[];
  unlockedFrameIds: AvatarFrameId[];
  equippedFrameId: AvatarFrameId;
  claimedLevelRewards: number[];
  unlockedExclusiveWorldTheme: boolean;
  xpHistory: XPHistoryEntry[];
  processedEventIds: string[];
  stats: ProgressionProfileStats;
}

interface StoredProgressionPayload {
  version: number;
  profiles: Record<ProgressionProfileId, InternalProfileState>;
}

function defaultPlayerName(profileId: ProgressionProfileId): string {
  if (profileId === 'player1') return 'PLAYER 1';
  if (profileId === 'player2') return 'PLAYER 2';
  return 'GARSA PLAYER';
}

function createEmptyStats(): ProgressionProfileStats {
  return {
    playTimeSeconds: 0,
    totalXPEarned: 0,
    totalGameplayXP: 0,
    totalMissionXP: 0,
    totalTournamentXP: 0,
    totalAchievementXP: 0,
    totalCollectionXP: 0,
    totalGamesPlayed: 0,
    totalPipesPassed: 0,
    totalScore: 0,
    bestScore: 0,
    quickMatchWins: 0,
    tournamentWins: 0,
    tournamentCompletions: 0,
    totalCoinsEarned: 0,
    totalGemsEarned: 0,
    characterUsage: {},
    worldUsage: {},
  };
}

function createEmptyProfile(profileId: ProgressionProfileId): InternalProfileState {
  return {
    profileId,
    playerName: defaultPlayerName(profileId),
    totalXP: 0,
    totalLevelUps: 0,
    highestLevel: MIN_PLAYER_LEVEL,
    equippedTitleId: 'newbie_flyer',
    unlockedTitleIds: ['newbie_flyer'],
    unlockedFrameIds: ['default'],
    equippedFrameId: 'default',
    claimedLevelRewards: [],
    unlockedExclusiveWorldTheme: false,
    xpHistory: [],
    processedEventIds: [],
    stats: createEmptyStats(),
  };
}

function cleanPositiveInt(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) return 0;
  return Math.floor(val);
}

function cleanPositiveFloat(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) return 0;
  return val;
}

function sanitizeUsageMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (typeof key === 'string' && key.length > 0) {
      const count = cleanPositiveInt(val);
      if (count > 0) out[key] = count;
    }
  }
  return out;
}

export class PlayerProgressionManager {
  private profiles: Record<ProgressionProfileId, InternalProfileState> = {
    solo: createEmptyProfile('solo'),
    player1: createEmptyProfile('player1'),
    player2: createEmptyProfile('player2'),
  };

  private processedSets: Record<ProgressionProfileId, Set<string>> = {
    solo: new Set(),
    player1: new Set(),
    player2: new Set(),
  };

  private xpNotificationQueue: XPNotificationItem[] = [];
  private levelUpQueue: LevelUpEvent[] = [];
  private listeners = new Set<() => void>();
  private queueListeners = new Set<() => void>();
  private playTimeDirtySeconds = 0;
  private nowProvider: () => number;

  constructor(nowProvider: () => number = () => Date.now()) {
    this.nowProvider = nowProvider;
    this.load();
  }

  public setNowProviderForTesting(fn: () => number): void {
    this.nowProvider = fn;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeQueues(listener: () => void): () => void {
    this.queueListeners.add(listener);
    return () => {
      this.queueListeners.delete(listener);
    };
  }

  public getProfile(profileId: ProgressionProfileId = 'solo'): PlayerProgressProfile {
    const internal = this.profiles[profileId];
    const computed = computeLevelStateFromTotalXP(internal.totalXP);
    const highestLevel = Math.max(internal.highestLevel, computed.currentLevel);
    const rank = getRankForLevel(computed.currentLevel);

    return {
      profileId: internal.profileId,
      playerName: internal.playerName,
      currentLevel: computed.currentLevel,
      totalXP: internal.totalXP,
      currentLevelXP: computed.currentLevelXP,
      nextLevelXP: computed.nextLevelXP,
      progressPercent: computed.progressPercent,
      isMaxLevel: computed.isMaxLevel,
      totalLevelUps: internal.totalLevelUps,
      highestLevel,
      rank,
      equippedTitleId: internal.unlockedTitleIds.includes(internal.equippedTitleId)
        ? internal.equippedTitleId
        : 'newbie_flyer',
      unlockedTitleIds: [...internal.unlockedTitleIds],
      unlockedFrameIds: [...internal.unlockedFrameIds],
      equippedFrameId: internal.unlockedFrameIds.includes(internal.equippedFrameId)
        ? internal.equippedFrameId
        : 'default',
      claimedLevelRewards: [...internal.claimedLevelRewards],
      unlockedExclusiveWorldTheme: internal.unlockedExclusiveWorldTheme,
      xpHistory: internal.xpHistory.map((h) => ({ ...h })),
      stats: {
        ...internal.stats,
        characterUsage: { ...internal.stats.characterUsage },
        worldUsage: { ...internal.stats.worldUsage },
      },
    };
  }

  public getXPHistory(
    profileId: ProgressionProfileId = 'solo',
    categoryFilter: 'all' | XPEventCategory = 'all'
  ): XPHistoryEntry[] {
    const list = this.profiles[profileId].xpHistory;
    if (categoryFilter === 'all') {
      return list.map((h) => ({ ...h }));
    }
    return list.filter((h) => h.category === categoryFilter).map((h) => ({ ...h }));
  }

  public getPendingXPNotifications(): XPNotificationItem[] {
    return this.xpNotificationQueue.map((item) => ({ ...item }));
  }

  public consumeXPNotification(id?: string): void {
    if (this.xpNotificationQueue.length === 0) return;
    if (!id) {
      this.xpNotificationQueue = this.xpNotificationQueue.slice(1);
    } else {
      this.xpNotificationQueue = this.xpNotificationQueue.filter((item) => item.id !== id);
    }
    this.notifyQueues();
  }

  public clearXPNotifications(): void {
    if (this.xpNotificationQueue.length === 0) return;
    this.xpNotificationQueue = [];
    this.notifyQueues();
  }

  public getPendingLevelUps(): LevelUpEvent[] {
    return this.levelUpQueue.map((ev) => ({
      ...ev,
      unlockedRewardLevels: [...ev.unlockedRewardLevels],
      unlockedTitleIds: [...ev.unlockedTitleIds],
    }));
  }

  public consumeLevelUp(id?: string): void {
    if (this.levelUpQueue.length === 0) return;
    if (!id) {
      this.levelUpQueue = this.levelUpQueue.slice(1);
    } else {
      this.levelUpQueue = this.levelUpQueue.filter((ev) => ev.id !== id);
    }
    this.notifyQueues();
  }

  public setPlayerName(name: string, profileId: ProgressionProfileId = 'solo'): string {
    const trimmed = name.trim().replace(/\s+/g, ' ').slice(0, 18).toUpperCase();
    const clean = trimmed.length > 0 ? trimmed : defaultPlayerName(profileId);
    if (this.profiles[profileId].playerName !== clean) {
      this.profiles[profileId].playerName = clean;
      this.save();
      this.notify();
    }
    return clean;
  }

  public hasExclusiveWorldTheme(profileId: ProgressionProfileId = 'solo'): boolean {
    return this.profiles[profileId].unlockedExclusiveWorldTheme;
  }

  public getFavoriteCharacterId(profileId: ProgressionProfileId = 'solo'): string | null {
    return this.pickTopUsageKey(this.profiles[profileId].stats.characterUsage);
  }

  public getFavoriteWorldId(profileId: ProgressionProfileId = 'solo'): string | null {
    return this.pickTopUsageKey(this.profiles[profileId].stats.worldUsage);
  }

  private pickTopUsageKey(map: Record<string, number>): string | null {
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [key, count] of Object.entries(map)) {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    }
    return bestKey;
  }

  public getUnclaimedRewardLevels(profileId: ProgressionProfileId = 'solo'): number[] {
    const profile = this.getProfile(profileId);
    return LEVEL_REWARD_TRACK.filter(
      (r) => r.level <= profile.currentLevel && !profile.claimedLevelRewards.includes(r.level)
    ).map((r) => r.level);
  }

  public awardXP(req: AwardXPRequest): AwardXPResult {
    const profileId: ProgressionProfileId = req.profileId ?? 'solo';
    const amount =
      typeof req.amount === 'number' && Number.isFinite(req.amount) ? Math.floor(req.amount) : 0;

    if (!req.eventId || amount <= 0) {
      const current = computeLevelStateFromTotalXP(this.profiles[profileId].totalXP).currentLevel;
      return {
        awarded: false,
        amount: 0,
        previousLevel: current,
        newLevel: current,
        levelsGained: 0,
        rankPromoted: false,
        levelUpEvent: null,
      };
    }

    const processed = this.processedSets[profileId];
    if (processed.has(req.eventId)) {
      const current = computeLevelStateFromTotalXP(this.profiles[profileId].totalXP).currentLevel;
      return {
        awarded: false,
        amount: 0,
        previousLevel: current,
        newLevel: current,
        levelsGained: 0,
        rankPromoted: false,
        levelUpEvent: null,
      };
    }

    const internal = this.profiles[profileId];
    const now = req.timestamp ?? this.nowProvider();
    const prevComputed = computeLevelStateFromTotalXP(internal.totalXP);
    const prevRank = getRankForLevel(prevComputed.currentLevel);

    // Record idempotency key (bounded ring list)
    processed.add(req.eventId);
    internal.processedEventIds.push(req.eventId);
    if (internal.processedEventIds.length > MAX_PROCESSED_EVENTS) {
      const removed = internal.processedEventIds.shift();
      if (removed) {
        processed.delete(removed);
      }
    }

    internal.totalXP += amount;
    internal.stats.totalXPEarned += amount;
    switch (req.category) {
      case 'gameplay':
        internal.stats.totalGameplayXP += amount;
        break;
      case 'mission':
        internal.stats.totalMissionXP += amount;
        break;
      case 'tournament':
        internal.stats.totalTournamentXP += amount;
        break;
      case 'achievement':
        internal.stats.totalAchievementXP += amount;
        break;
      case 'collection':
        internal.stats.totalCollectionXP += amount;
        break;
    }

    const nextComputed = computeLevelStateFromTotalXP(internal.totalXP);
    const levelsGained = Math.max(0, nextComputed.currentLevel - prevComputed.currentLevel);
    const nextRank = getRankForLevel(nextComputed.currentLevel);
    const rankPromoted = prevRank.id !== nextRank.id;

    if (levelsGained > 0) {
      internal.totalLevelUps += levelsGained;
      internal.highestLevel = Math.max(internal.highestLevel, nextComputed.currentLevel);
    }

    // Unlock any level-gated titles automatically upon reaching that level
    const unlockedTitleIds: string[] = [];
    for (const t of TITLE_REGISTRY) {
      if (
        typeof t.minLevel === 'number' &&
        nextComputed.currentLevel >= t.minLevel &&
        !internal.unlockedTitleIds.includes(t.id)
      ) {
        internal.unlockedTitleIds.push(t.id);
        unlockedTitleIds.push(t.id);
      }
    }

    // Also unlock any titles linked directly to reward milestones crossed
    const unlockedRewardLevels: number[] = [];
    if (levelsGained > 0) {
      for (let lvl = prevComputed.currentLevel + 1; lvl <= nextComputed.currentLevel; lvl += 1) {
        const rewardDef = LEVEL_REWARD_MAP.get(lvl);
        if (rewardDef) {
          unlockedRewardLevels.push(lvl);
          if (rewardDef.titleId && !internal.unlockedTitleIds.includes(rewardDef.titleId)) {
            internal.unlockedTitleIds.push(rewardDef.titleId);
            unlockedTitleIds.push(rewardDef.titleId);
          }
        }
      }
    }

    // Prepend XP History entry (capped at MAX_XP_HISTORY)
    const entry: XPHistoryEntry = {
      id: `${now}-${req.eventId}`,
      eventId: req.eventId,
      amount,
      label: req.label,
      category: req.category,
      timestamp: now,
      levelAfter: nextComputed.currentLevel,
    };
    internal.xpHistory = [entry, ...internal.xpHistory].slice(0, MAX_XP_HISTORY);

    let levelUpEvent: LevelUpEvent | null = null;
    if (levelsGained > 0) {
      levelUpEvent = {
        id: `lvlup-${profileId}-${now}-${nextComputed.currentLevel}`,
        profileId,
        fromLevel: prevComputed.currentLevel,
        toLevel: nextComputed.currentLevel,
        xpGained: amount,
        previousRank: prevRank,
        newRank: nextRank,
        rankPromoted,
        unlockedRewardLevels,
        unlockedTitleIds,
        timestamp: now,
      };
      this.enqueueAggregatedLevelUp(levelUpEvent);
    }

    if (!req.silentToast && profileId === 'solo') {
      this.enqueueXPNotification({
        id: `xptoast-${now}-${req.eventId}`,
        profileId,
        amount,
        label: req.label,
        category: req.category,
        count: 1,
        timestamp: now,
      });
    }

    this.save();
    this.notify();
    if (levelUpEvent || (!req.silentToast && profileId === 'solo')) {
      this.notifyQueues();
    }

    return {
      awarded: true,
      amount,
      previousLevel: prevComputed.currentLevel,
      newLevel: nextComputed.currentLevel,
      levelsGained,
      rankPromoted,
      levelUpEvent,
    };
  }

  private enqueueXPNotification(next: XPNotificationItem): void {
    const existing = this.xpNotificationQueue.find((item) => item.profileId === next.profileId);
    if (existing) {
      existing.amount += next.amount;
      existing.count += 1;
      existing.label = `${existing.count} XP REWARDS`;
      existing.timestamp = next.timestamp;
      return;
    }
    this.xpNotificationQueue.push(next);
  }

  private enqueueAggregatedLevelUp(next: LevelUpEvent): void {
    const existing = this.levelUpQueue.find((ev) => ev.profileId === next.profileId);
    if (existing) {
      existing.toLevel = Math.max(existing.toLevel, next.toLevel);
      existing.xpGained += next.xpGained;
      existing.newRank = next.newRank;
      existing.rankPromoted = existing.previousRank.id !== next.newRank.id;
      for (const lvl of next.unlockedRewardLevels) {
        if (!existing.unlockedRewardLevels.includes(lvl)) {
          existing.unlockedRewardLevels.push(lvl);
        }
      }
      for (const tid of next.unlockedTitleIds) {
        if (!existing.unlockedTitleIds.includes(tid)) {
          existing.unlockedTitleIds.push(tid);
        }
      }
      existing.timestamp = next.timestamp;
      return;
    }
    this.levelUpQueue.push(next);
  }

  // ---- Gameplay XP & Metrics Helpers ----

  public recordGameplayStarted(
    profileId: ProgressionProfileId,
    runId: string,
    characterId: string,
    worldId: string
  ): AwardXPResult {
    const internal = this.profiles[profileId];
    if (characterId) {
      internal.stats.characterUsage[characterId] =
        (internal.stats.characterUsage[characterId] ?? 0) + 1;
    }
    if (worldId) {
      internal.stats.worldUsage[worldId] = (internal.stats.worldUsage[worldId] ?? 0) + 1;
    }
    return this.awardXP({
      profileId,
      eventId: `run_start:${runId}`,
      amount: 5,
      label: 'GAME STARTED',
      category: 'gameplay',
      silentToast: true,
    });
  }

  public recordGameplayPipePassed(
    profileId: ProgressionProfileId,
    runId: string,
    pipeNumber: number,
    currentRunScore: number
  ): { pipeResult: AwardXPResult; milestoneResults: AwardXPResult[] } {
    const pipeResult = this.awardXP({
      profileId,
      eventId: `run_pipe:${runId}:${pipeNumber}`,
      amount: 2,
      label: 'PIPE PASSED',
      category: 'gameplay',
      silentToast: true,
    });

    const milestoneResults = this.recordGameplayScoreMilestones(profileId, runId, currentRunScore);
    return { pipeResult, milestoneResults };
  }

  public recordGameplayScoreMilestones(
    profileId: ProgressionProfileId,
    runId: string,
    score: number
  ): AwardXPResult[] {
    const results: AwardXPResult[] = [];
    for (const ms of SCORE_MILESTONE_XP) {
      if (score >= ms.score) {
        const res = this.awardXP({
          profileId,
          eventId: `run_ms:${runId}:${ms.score}`,
          amount: ms.xp,
          label: `SCORE ${ms.score} MILESTONE`,
          category: 'gameplay',
        });
        if (res.awarded) results.push(res);
      }
    }
    return results;
  }

  public recordPersonalBestXP(
    profileId: ProgressionProfileId,
    runId: string,
    newBestScore: number
  ): AwardXPResult {
    if (profileId !== 'solo' || newBestScore <= 0) {
      return this.awardXP({
        profileId,
        eventId: '',
        amount: 0,
        label: '',
        category: 'gameplay',
      });
    }
    return this.awardXP({
      profileId,
      eventId: `run_best:${runId}`,
      amount: 25,
      label: `NEW HIGH SCORE (${newBestScore})`,
      category: 'gameplay',
    });
  }

  public recordGameplayFinished(
    profileId: ProgressionProfileId,
    runId: string,
    finalScore: number,
    pipesPassed: number,
    coinsEarned = 0,
    gemsEarned = 0
  ): AwardXPResult {
    const internal = this.profiles[profileId];
    const safeScore = Math.max(0, Math.floor(finalScore));
    const safePipes = Math.max(0, Math.floor(pipesPassed));

    const finishKey = `run_end_stats:${runId}`;
    if (!this.processedSets[profileId].has(finishKey)) {
      this.processedSets[profileId].add(finishKey);
      internal.processedEventIds.push(finishKey);
      if (internal.processedEventIds.length > MAX_PROCESSED_EVENTS) {
        const removed = internal.processedEventIds.shift();
        if (removed) this.processedSets[profileId].delete(removed);
      }

      internal.stats.totalGamesPlayed += 1;
      internal.stats.totalPipesPassed += safePipes;
      internal.stats.totalScore += safeScore;
      internal.stats.bestScore = Math.max(internal.stats.bestScore, safeScore);
      internal.stats.totalCoinsEarned += Math.max(0, Math.floor(coinsEarned));
      internal.stats.totalGemsEarned += Math.max(0, Math.floor(gemsEarned));
    }

    if (internal.stats.totalPipesPassed >= 500 && !internal.unlockedTitleIds.includes('pipe_master')) {
      internal.unlockedTitleIds.push('pipe_master');
    }

    const res = this.awardXP({
      profileId,
      eventId: `run_end:${runId}`,
      amount: 10,
      label: 'GAME COMPLETED',
      category: 'gameplay',
    });

    this.flushPlayTime();
    return res;
  }

  public recordCurrencyRewardStats(
    coins: number,
    gems: number,
    profileId: ProgressionProfileId = 'solo'
  ): void {
    const safeCoins = Math.max(0, Math.floor(coins));
    const safeGems = Math.max(0, Math.floor(gems));
    if (safeCoins === 0 && safeGems === 0) return;

    const internal = this.profiles[profileId];
    internal.stats.totalCoinsEarned += safeCoins;
    internal.stats.totalGemsEarned += safeGems;
    this.save();
    this.notify();
  }

  public recordPlayTime(profileId: ProgressionProfileId, deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const clamped = Math.min(5, deltaSeconds);
    this.profiles[profileId].stats.playTimeSeconds += clamped;
    this.playTimeDirtySeconds += clamped;
    if (this.playTimeDirtySeconds >= 5) {
      this.playTimeDirtySeconds = 0;
      this.save();
    }
  }

  public flushPlayTime(): void {
    if (this.playTimeDirtySeconds > 0) {
      this.playTimeDirtySeconds = 0;
      this.save();
      this.notify();
    }
  }

  // ---- Collection, Mission, Achievement & Tournament XP ----

  public recordAchievementXP(
    achievementId: string,
    achievementName: string,
    xpAmount?: number
  ): AwardXPResult {
    const xp =
      typeof xpAmount === 'number' && Number.isFinite(xpAmount) && xpAmount > 0
        ? Math.floor(xpAmount)
        : (ACHIEVEMENT_XP_MAP[achievementId] ?? 50);
    if (achievementId === 'power_user') {
      this.unlockTitle('power_user', 'solo');
    }
    return this.awardXP({
      profileId: 'solo',
      eventId: `ach_xp:${achievementId}`,
      amount: xp,
      label: `ACHIEVEMENT: ${achievementName}`,
      category: 'achievement',
    });
  }

  public recordMissionCompletionXP(
    periodKey: string,
    missionId: string,
    missionTitle: string,
    xpAmount: number
  ): AwardXPResult {
    const safeXp = Math.max(0, Math.floor(xpAmount));
    if (safeXp <= 0) {
      return this.awardXP({
        profileId: 'solo',
        eventId: '',
        amount: 0,
        label: '',
        category: 'mission',
      });
    }
    return this.awardXP({
      profileId: 'solo',
      eventId: `mission_xp:${periodKey}:${missionId}`,
      amount: safeXp,
      label: `MISSION: ${missionTitle}`,
      category: 'mission',
    });
  }

  public recordCharacterUnlockXP(
    characterId: string,
    characterName: string,
    source: 'gameplay' | 'level_reward' = 'gameplay'
  ): AwardXPResult | null {
    if (source === 'level_reward') {
      return null;
    }
    return this.awardXP({
      profileId: 'solo',
      eventId: `char_unlock_xp:${characterId}`,
      amount: 50,
      label: `UNLOCKED CHARACTER: ${characterName}`,
      category: 'collection',
    });
  }

  public recordSkinUnlockXP(
    skinId: string,
    skinName: string,
    source: 'gameplay' | 'milestone' | 'level_reward' = 'milestone'
  ): AwardXPResult | null {
    if (source === 'level_reward') {
      return null;
    }
    const xp = SKIN_UNLOCK_XP_MAP[skinId] ?? 25;
    if (xp <= 0) return null;
    return this.awardXP({
      profileId: 'solo',
      eventId: `skin_unlock_xp:${skinId}`,
      amount: xp,
      label: `UNLOCKED SKIN: ${skinName}`,
      category: 'collection',
    });
  }

  public recordWorldUnlockXP(worldId: string, worldName: string): AwardXPResult | null {
    const xp = WORLD_UNLOCK_XP_MAP[worldId] ?? 50;
    if (xp <= 0) return null;
    return this.awardXP({
      profileId: 'solo',
      eventId: `world_unlock_xp:${worldId}`,
      amount: xp,
      label: `UNLOCKED WORLD: ${worldName}`,
      category: 'collection',
    });
  }

  public recordMultiplayerMatchXP(match: {
    matchId: string;
    format: 'quick' | 'bo3' | 'bo5';
    status: string;
    winner: 'player1' | 'player2' | 'draw' | null;
    player1Name: string;
    player2Name: string;
  }): void {
    if (match.status !== 'completed' || !match.winner) {
      return;
    }

    this.setPlayerName(match.player1Name, 'player1');
    this.setPlayerName(match.player2Name, 'player2');

    const isTournament = match.format === 'bo3' || match.format === 'bo5';
    const slots: Array<{ slot: 'player1' | 'player2'; profileId: ProgressionProfileId }> = [
      { slot: 'player1', profileId: 'player1' },
      { slot: 'player2', profileId: 'player2' },
    ];

    for (const { slot, profileId } of slots) {
      const internal = this.profiles[profileId];

      if (isTournament) {
        const compKey = `tourn_comp:${match.matchId}:${profileId}`;
        if (!this.processedSets[profileId].has(compKey)) {
          internal.stats.tournamentCompletions += 1;
        }
        this.awardXP({
          profileId,
          eventId: compKey,
          amount: 50,
          label: `${match.format.toUpperCase()} TOURNAMENT COMPLETED`,
          category: 'tournament',
          silentToast: true,
        });
      }

      if (match.winner === slot) {
        if (match.format === 'quick') {
          const winKey = `quick_win:${match.matchId}:${profileId}`;
          if (!this.processedSets[profileId].has(winKey)) {
            internal.stats.quickMatchWins += 1;
          }
          this.awardXP({
            profileId,
            eventId: winKey,
            amount: 25,
            label: 'QUICK MATCH WIN',
            category: 'tournament',
            silentToast: true,
          });
        } else {
          const winXp = match.format === 'bo5' ? 100 : 50;
          const winKey = `tourn_win:${match.matchId}:${profileId}`;
          if (!this.processedSets[profileId].has(winKey)) {
            internal.stats.tournamentWins += 1;
          }
          this.awardXP({
            profileId,
            eventId: winKey,
            amount: winXp,
            label: `${match.format.toUpperCase()} TOURNAMENT WIN`,
            category: 'tournament',
            silentToast: true,
          });
          this.awardXP({
            profileId,
            eventId: `tourn_champ:${match.matchId}:${profileId}`,
            amount: 150,
            label: 'TOURNAMENT CHAMPION BONUS',
            category: 'tournament',
            silentToast: true,
          });
          this.unlockTitle('tournament_champion', profileId);
        }
      }
    }

    this.save();
    this.notify();
  }

  // ---- Titles, Frames, & Reward Claim State ----

  public unlockTitle(titleIdOrName: string, profileId: ProgressionProfileId = 'solo'): boolean {
    const def = findTitleByNameOrId(titleIdOrName);
    if (!def) return false;
    const internal = this.profiles[profileId];
    if (internal.unlockedTitleIds.includes(def.id)) return false;

    internal.unlockedTitleIds.push(def.id);
    this.save();
    this.notify();
    return true;
  }

  public equipTitle(titleId: string, profileId: ProgressionProfileId = 'solo'): boolean {
    const internal = this.profiles[profileId];
    if (!TITLE_MAP.has(titleId) || !internal.unlockedTitleIds.includes(titleId)) {
      return false;
    }
    internal.equippedTitleId = titleId;
    this.save();
    this.notify();
    return true;
  }

  public getEquippedTitleName(profileId: ProgressionProfileId = 'solo'): string {
    const profile = this.getProfile(profileId);
    return getTitleById(profile.equippedTitleId).name;
  }

  public unlockFrame(frameId: AvatarFrameId, profileId: ProgressionProfileId = 'solo'): boolean {
    if (!VALID_FRAMES.has(frameId)) return false;
    const internal = this.profiles[profileId];
    if (internal.unlockedFrameIds.includes(frameId)) return false;
    internal.unlockedFrameIds.push(frameId);
    this.save();
    this.notify();
    return true;
  }

  public equipFrame(frameId: AvatarFrameId, profileId: ProgressionProfileId = 'solo'): boolean {
    const internal = this.profiles[profileId];
    if (!VALID_FRAMES.has(frameId) || !internal.unlockedFrameIds.includes(frameId)) {
      return false;
    }
    internal.equippedFrameId = frameId;
    this.save();
    this.notify();
    return true;
  }

  /**
   * Atomically marks a level reward as claimed if unlocked and unclaimed.
   * Returns true only the first time a level reward is claimed.
   */
  public markLevelRewardClaimed(
    level: number,
    profileId: ProgressionProfileId = 'solo'
  ): boolean {
    if (!LEVEL_REWARD_MAP.has(level)) return false;
    const internal = this.profiles[profileId];
    const currentLevel = computeLevelStateFromTotalXP(internal.totalXP).currentLevel;
    if (currentLevel < level || internal.claimedLevelRewards.includes(level)) {
      return false;
    }

    internal.claimedLevelRewards.push(level);
    internal.claimedLevelRewards.sort((a, b) => a - b);

    const rewardDef = LEVEL_REWARD_MAP.get(level);
    if (rewardDef?.titleId && !internal.unlockedTitleIds.includes(rewardDef.titleId)) {
      internal.unlockedTitleIds.push(rewardDef.titleId);
    }
    if (rewardDef?.avatarFrame && VALID_FRAMES.has(rewardDef.avatarFrame)) {
      if (!internal.unlockedFrameIds.includes(rewardDef.avatarFrame)) {
        internal.unlockedFrameIds.push(rewardDef.avatarFrame);
      }
      internal.equippedFrameId = rewardDef.avatarFrame;
    }
    if (rewardDef?.worldThemeId === 'aurora_sky') {
      internal.unlockedExclusiveWorldTheme = true;
    }

    this.save();
    this.notify();
    return true;
  }

  public reset(includeMultiplayerProfiles = true): void {
    this.profiles.solo = createEmptyProfile('solo');
    this.processedSets.solo = new Set();
    if (includeMultiplayerProfiles) {
      this.profiles.player1 = createEmptyProfile('player1');
      this.profiles.player2 = createEmptyProfile('player2');
      this.processedSets.player1 = new Set();
      this.processedSets.player2 = new Set();
    }
    this.xpNotificationQueue = [];
    this.levelUpQueue = [];
    this.playTimeDirtySeconds = 0;
    this.save();
    this.notify();
    this.notifyQueues();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private notifyQueues(): void {
    for (const listener of this.queueListeners) {
      listener();
    }
  }

  private sanitizeLoadedProfile(
    profileId: ProgressionProfileId,
    raw: Partial<InternalProfileState> | undefined
  ): InternalProfileState {
    const base = createEmptyProfile(profileId);
    if (!raw || typeof raw !== 'object') return base;

    const totalXP = cleanPositiveInt(raw.totalXP);
    const computed = computeLevelStateFromTotalXP(totalXP);
    const highestLevel = Math.max(
      computed.currentLevel,
      Math.min(MAX_PLAYER_LEVEL, cleanPositiveInt(raw.highestLevel) || MIN_PLAYER_LEVEL)
    );

    const unlockedTitles = new Set<string>(['newbie_flyer']);
    if (Array.isArray(raw.unlockedTitleIds)) {
      for (const tid of raw.unlockedTitleIds) {
        if (typeof tid === 'string' && TITLE_MAP.has(tid)) {
          unlockedTitles.add(tid);
        }
      }
    }
    for (const t of TITLE_REGISTRY) {
      if (typeof t.minLevel === 'number' && computed.currentLevel >= t.minLevel) {
        unlockedTitles.add(t.id);
      }
    }

    const unlockedFrames = new Set<AvatarFrameId>(['default']);
    if (Array.isArray(raw.unlockedFrameIds)) {
      for (const f of raw.unlockedFrameIds) {
        if (typeof f === 'string' && VALID_FRAMES.has(f as AvatarFrameId)) {
          unlockedFrames.add(f as AvatarFrameId);
        }
      }
    }

    const claimedLevelRewards = Array.isArray(raw.claimedLevelRewards)
      ? Array.from(
          new Set(
            raw.claimedLevelRewards.filter(
              (n): n is number =>
                typeof n === 'number' &&
                Number.isFinite(n) &&
                LEVEL_REWARD_MAP.has(n) &&
                n <= computed.currentLevel
            )
          )
        ).sort((a, b) => a - b)
      : [];

    const processedEventIds = Array.isArray(raw.processedEventIds)
      ? raw.processedEventIds
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
          .slice(-MAX_PROCESSED_EVENTS)
      : [];

    const xpHistory: XPHistoryEntry[] = [];
    if (Array.isArray(raw.xpHistory)) {
      for (const h of raw.xpHistory.slice(0, MAX_XP_HISTORY)) {
        if (!h || typeof h !== 'object') continue;
        if (typeof h.eventId !== 'string' || typeof h.label !== 'string') continue;
        const cat: XPEventCategory =
          h.category === 'gameplay' ||
          h.category === 'mission' ||
          h.category === 'tournament' ||
          h.category === 'achievement' ||
          h.category === 'collection'
            ? h.category
            : 'gameplay';
        const amt = cleanPositiveInt(h.amount);
        if (amt <= 0) continue;
        xpHistory.push({
          id: typeof h.id === 'string' && h.id ? h.id : `${h.eventId}`,
          eventId: h.eventId,
          amount: amt,
          label: h.label,
          category: cat,
          timestamp: cleanPositiveInt(h.timestamp) || this.nowProvider(),
          levelAfter: Math.max(
            MIN_PLAYER_LEVEL,
            Math.min(MAX_PLAYER_LEVEL, cleanPositiveInt(h.levelAfter) || MIN_PLAYER_LEVEL)
          ),
        });
      }
    }

    const s = raw.stats && typeof raw.stats === 'object' ? raw.stats : createEmptyStats();
    const cleanName =
      typeof raw.playerName === 'string' && raw.playerName.trim().length > 0
        ? raw.playerName.trim().slice(0, 18).toUpperCase()
        : defaultPlayerName(profileId);

    const equippedTitleId =
      typeof raw.equippedTitleId === 'string' && unlockedTitles.has(raw.equippedTitleId)
        ? raw.equippedTitleId
        : 'newbie_flyer';
    const equippedFrameId =
      typeof raw.equippedFrameId === 'string' &&
      unlockedFrames.has(raw.equippedFrameId as AvatarFrameId)
        ? (raw.equippedFrameId as AvatarFrameId)
        : 'default';

    return {
      profileId,
      playerName: cleanName,
      totalXP,
      totalLevelUps: Math.max(
        computed.currentLevel - MIN_PLAYER_LEVEL,
        cleanPositiveInt(raw.totalLevelUps)
      ),
      highestLevel,
      equippedTitleId,
      unlockedTitleIds: Array.from(unlockedTitles),
      unlockedFrameIds: Array.from(unlockedFrames),
      equippedFrameId,
      claimedLevelRewards,
      unlockedExclusiveWorldTheme:
        Boolean(raw.unlockedExclusiveWorldTheme) || claimedLevelRewards.includes(40),
      xpHistory,
      processedEventIds,
      stats: {
        playTimeSeconds: cleanPositiveFloat(s.playTimeSeconds),
        totalXPEarned: Math.max(totalXP, cleanPositiveInt(s.totalXPEarned)),
        totalGameplayXP: cleanPositiveInt(s.totalGameplayXP),
        totalMissionXP: cleanPositiveInt(s.totalMissionXP),
        totalTournamentXP: cleanPositiveInt(s.totalTournamentXP),
        totalAchievementXP: cleanPositiveInt(s.totalAchievementXP),
        totalCollectionXP: cleanPositiveInt(s.totalCollectionXP),
        totalGamesPlayed: cleanPositiveInt(s.totalGamesPlayed),
        totalPipesPassed: cleanPositiveInt(s.totalPipesPassed),
        totalScore: cleanPositiveInt(s.totalScore),
        bestScore: cleanPositiveInt(s.bestScore),
        quickMatchWins: cleanPositiveInt(s.quickMatchWins),
        tournamentWins: cleanPositiveInt(s.tournamentWins),
        tournamentCompletions: cleanPositiveInt(s.tournamentCompletions),
        totalCoinsEarned: cleanPositiveInt(s.totalCoinsEarned),
        totalGemsEarned: cleanPositiveInt(s.totalGemsEarned),
        characterUsage: sanitizeUsageMap(s.characterUsage),
        worldUsage: sanitizeUsageMap(s.worldUsage),
      },
    };
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredProgressionPayload>;
      if (!parsed || typeof parsed !== 'object' || !parsed.profiles) return;

      const slots: ProgressionProfileId[] = ['solo', 'player1', 'player2'];
      for (const slot of slots) {
        const sanitized = this.sanitizeLoadedProfile(slot, parsed.profiles[slot]);
        this.profiles[slot] = sanitized;
        this.processedSets[slot] = new Set(sanitized.processedEventIds);
      }
    } catch {
      this.profiles = {
        solo: createEmptyProfile('solo'),
        player1: createEmptyProfile('player1'),
        player2: createEmptyProfile('player2'),
      };
      this.processedSets = {
        solo: new Set(),
        player1: new Set(),
        player2: new Set(),
      };
    }
  }

  private save(): void {
    try {
      const payload: StoredProgressionPayload = {
        version: PROGRESSION_STORAGE_VERSION,
        profiles: this.profiles,
      };
      window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage environments
    }
  }
}

export const playerProgressionManager = new PlayerProgressionManager();
