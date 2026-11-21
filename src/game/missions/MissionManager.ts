import { characterRegistryHasRareOrHigher } from './missionContextHelpers';
import { characterSkinManager, SkinId } from '../character/CharacterSkinManager';
import { characterUnlockManager } from '../character/CharacterUnlockManager';
import { currencyManager } from '../powerups/CurrencyManager';
import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import { findTitleByNameOrId } from '../progression/TitleRegistry';
import { settingsManager } from '../settings/SettingsManager';
import { worldUnlockManager } from '../worlds/WorldUnlockManager';
import {
  deterministicPick,
  diffCalendarDays,
  getLocalDateKey,
  getLocalWeekKey,
} from './MissionDateUtils';
import {
  DAILY_EASY_POOL,
  DAILY_HARD_POOL,
  DAILY_MEDIUM_POOL,
  SPECIAL_CHALLENGES,
  STREAK_MILESTONES,
  WEEKLY_MISSIONS,
} from './MissionRegistry';
import {
  AvatarFrameId,
  ClaimRewardResult,
  MissionCompletionNotification,
  MissionCosmeticsState,
  MissionDefinition,
  MissionEligibilityContext,
  MissionEventPayload,
  MissionHistoryEntry,
  MissionInstance,
  MissionSnapshot,
  MissionStatsSummary,
  StreakMilestone,
  StreakState,
  UnclaimedMissionCounts,
} from './MissionTypes';

const MISSIONS_STORAGE_KEY = 'flappy_face_missions';
const MISSIONS_STORAGE_VERSION = 1;
const MAX_HISTORY_ENTRIES = 120;

interface StoredMissionPayload {
  version: number;
  dailyPeriodKey: string;
  weeklyPeriodKey: string;
  dailyMissions: MissionInstance[];
  weeklyMissions: MissionInstance[];
  specialMissions: MissionInstance[];
  history: MissionHistoryEntry[];
  streak: StreakState;
  stats: MissionStatsSummary;
  cosmetics: MissionCosmeticsState;
  claimedRewardKeys: string[];
}

const VALID_FRAMES = new Set<AvatarFrameId>([
  'default',
  'gold_champion',
  'perfect_wings',
  'cosmic_explorer',
  'streak_flame',
  'elite_azure',
  'ultimate_legend',
]);

const ALL_DEFINITIONS_MAP: ReadonlyMap<string, MissionDefinition> = new Map([
  ...DAILY_EASY_POOL.map((d) => [d.id, d] as const),
  ...DAILY_MEDIUM_POOL.map((d) => [d.id, d] as const),
  ...DAILY_HARD_POOL.map((d) => [d.id, d] as const),
  ...WEEKLY_MISSIONS.map((d) => [d.id, d] as const),
  ...SPECIAL_CHALLENGES.map((d) => [d.id, d] as const),
]);

function cloneMission(m: MissionInstance): MissionInstance {
  return {
    ...m,
    reward: { ...m.reward },
    metaProgress: m.metaProgress ? [...m.metaProgress] : undefined,
  };
}

function createInstanceFromDef(def: MissionDefinition, periodKey: string): MissionInstance {
  return {
    id: def.id,
    category: def.category,
    difficulty: def.difficulty,
    title: def.title,
    description: def.description,
    icon: def.icon,
    target: def.target,
    progress: 0,
    completed: false,
    claimed: false,
    completedAt: null,
    claimedAt: null,
    periodKey,
    reward: { ...def.reward },
    metaProgress:
      def.condition.kind === 'distinct_powerups' || def.condition.kind === 'distinct_worlds'
        ? []
        : undefined,
  };
}

function defaultStreakState(): StreakState {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastClaimDateKey: null,
    claimedMilestones: [],
    recentClaimDates: [],
  };
}

function defaultStatsSummary(): MissionStatsSummary {
  return {
    totalCompleted: 0,
    totalClaimed: 0,
    totalCoinsEarned: 0,
    totalGemsEarned: 0,
  };
}

function defaultCosmeticsState(): MissionCosmeticsState {
  return {
    titles: [],
    badges: [],
    frames: ['default'],
    equippedTitle: null,
    equippedFrame: 'default',
  };
}

function rarityRank(rarity?: string): number {
  switch (rarity) {
    case 'COMMON':
      return 1;
    case 'UNCOMMON':
      return 2;
    case 'RARE':
      return 3;
    case 'EPIC':
      return 4;
    case 'LEGENDARY':
      return 5;
    case 'MYTHIC':
      return 6;
    default:
      return 0;
  }
}

export interface MissionManagerOptions {
  nowProvider?: () => number;
  eligibilityProvider?: () => MissionEligibilityContext;
}

export class MissionManager {
  private nowProvider: () => number;
  private eligibilityProvider: () => MissionEligibilityContext;

  private dailyPeriodKey: string;
  private weeklyPeriodKey: string;
  private dailyMissions: MissionInstance[] = [];
  private weeklyMissions: MissionInstance[] = [];
  private specialMissions: MissionInstance[] = [];
  private history: MissionHistoryEntry[] = [];
  private streak: StreakState = defaultStreakState();
  private stats: MissionStatsSummary = defaultStatsSummary();
  private cosmetics: MissionCosmeticsState = defaultCosmeticsState();
  private claimedRewardKeys = new Set<string>();

  private listeners = new Set<(snapshot: MissionSnapshot) => void>();
  private notificationListeners = new Set<(note: MissionCompletionNotification) => void>();
  private externalAchievementHooks = new Set<
    (
      ev:
        | { type: 'mission_completed'; category: 'daily' | 'weekly' | 'special'; perfectDay: boolean }
        | { type: 'streak_updated'; currentStreak: number; bestStreak: number }
    ) => void
  >();

  public onExternalAchievementEvent(
    fn: (
      ev:
        | { type: 'mission_completed'; category: 'daily' | 'weekly' | 'special'; perfectDay: boolean }
        | { type: 'streak_updated'; currentStreak: number; bestStreak: number }
    ) => void
  ): () => void {
    this.externalAchievementHooks.add(fn);
    return () => {
      this.externalAchievementHooks.delete(fn);
    };
  }

  constructor(options: MissionManagerOptions = {}) {
    this.nowProvider = options.nowProvider ?? (() => Date.now());
    this.eligibilityProvider =
      options.eligibilityProvider ?? (() => this.buildLiveEligibilityContext());

    const now = this.nowProvider();
    this.dailyPeriodKey = getLocalDateKey(now);
    this.weeklyPeriodKey = getLocalWeekKey(now);

    this.load();
    this.ensureCurrentPeriods(now, true);
  }

  public setNowProviderForTesting(fn: () => number): void {
    this.nowProvider = fn;
  }

  private buildLiveEligibilityContext(): MissionEligibilityContext {
    const unlockedWorldIds = worldUnlockManager.getUnlockedIds();
    const unlockedCharacterIds = characterUnlockManager.getUnlockedIds();
    const settings = settingsManager.getSettings();
    return {
      unlockedWorldIds,
      unlockedCharacterIds,
      hasRareOrHigherCharacter: characterRegistryHasRareOrHigher(unlockedCharacterIds),
      powerUpsEnabled: settings.powerUpsEnabled,
      collectiblesEnabled: settings.collectiblesEnabled,
    };
  }

  public subscribe(listener: (snapshot: MissionSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeNotifications(
    listener: (note: MissionCompletionNotification) => void
  ): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  public getSnapshot(): MissionSnapshot {
    this.ensureCurrentPeriods(this.nowProvider(), true);
    return {
      dailyPeriodKey: this.dailyPeriodKey,
      weeklyPeriodKey: this.weeklyPeriodKey,
      dailyMissions: this.dailyMissions.map(cloneMission),
      weeklyMissions: this.weeklyMissions.map(cloneMission),
      specialMissions: this.specialMissions.map(cloneMission),
      history: this.history.map((h) => ({ ...h, reward: { ...h.reward } })),
      streak: {
        ...this.streak,
        claimedMilestones: [...this.streak.claimedMilestones],
        recentClaimDates: [...this.streak.recentClaimDates],
      },
      stats: { ...this.stats },
      cosmetics: {
        titles: [...this.cosmetics.titles],
        badges: [...this.cosmetics.badges],
        frames: [...this.cosmetics.frames],
        equippedTitle: this.cosmetics.equippedTitle,
        equippedFrame: this.cosmetics.equippedFrame,
      },
      unclaimed: this.getUnclaimedCountsInternal(),
      nowMs: this.nowProvider(),
    };
  }

  public getUnclaimedCounts(): UnclaimedMissionCounts {
    this.ensureCurrentPeriods(this.nowProvider(), true);
    return this.getUnclaimedCountsInternal();
  }

  private getUnclaimedCountsInternal(): UnclaimedMissionCounts {
    const daily = this.dailyMissions.filter((m) => m.completed && !m.claimed).length;
    const weekly = this.weeklyMissions.filter((m) => m.completed && !m.claimed).length;
    const special = this.specialMissions.filter((m) => m.completed && !m.claimed).length;
    return {
      daily,
      weekly,
      special,
      total: daily + weekly + special,
    };
  }

  /**
   * Checks local calendar day and Monday 00:00 week boundaries.
   * Ensures resets happen automatically without duplicate resets or early resets.
   */
  public ensureCurrentPeriods(nowMs: number = this.nowProvider(), saveIfChanged = true): boolean {
    const expectedDailyKey = getLocalDateKey(nowMs);
    const expectedWeeklyKey = getLocalWeekKey(nowMs);
    let changed = false;

    if (this.dailyPeriodKey !== expectedDailyKey || this.dailyMissions.length === 0) {
      this.dailyPeriodKey = expectedDailyKey;
      this.dailyMissions = this.generateDailyMissions(expectedDailyKey);
      changed = true;
    }

    if (this.weeklyPeriodKey !== expectedWeeklyKey || this.weeklyMissions.length === 0) {
      this.weeklyPeriodKey = expectedWeeklyKey;
      this.weeklyMissions = WEEKLY_MISSIONS.map((def) =>
        createInstanceFromDef(def, expectedWeeklyKey)
      );
      changed = true;
    }

    if (this.specialMissions.length === 0) {
      this.specialMissions = SPECIAL_CHALLENGES.map((def) =>
        createInstanceFromDef(def, 'permanent')
      );
      changed = true;
    }

    // Also reconcile streak if a day was missed (reset currentStreak cleanly to 0 for display accuracy)
    if (this.streak.lastClaimDateKey && this.streak.currentStreak > 0) {
      const gap = diffCalendarDays(this.streak.lastClaimDateKey, expectedDailyKey);
      if (gap !== null && gap >= 2) {
        this.streak.currentStreak = 0;
        changed = true;
      }
    }

    if (changed && saveIfChanged) {
      this.save();
    }
    return changed;
  }

  private generateDailyMissions(dateKey: string): MissionInstance[] {
    const ctx = this.eligibilityProvider();
    const usedGroups = new Set<string>();

    const pickFromPool = (
      pool: readonly MissionDefinition[],
      tierKey: string
    ): MissionDefinition => {
      const eligible = pool.filter(
        (d) => (!d.isEligible || d.isEligible(ctx)) && (!d.exclusiveGroup || !usedGroups.has(d.exclusiveGroup))
      );
      const fallbackEligible = pool.filter((d) => !d.isEligible || d.isEligible(ctx));
      const candidates =
        eligible.length > 0 ? eligible : fallbackEligible.length > 0 ? fallbackEligible : pool;
      const chosen = deterministicPick(candidates, `${dateKey}:${tierKey}`) ?? pool[0];
      if (chosen.exclusiveGroup) {
        usedGroups.add(chosen.exclusiveGroup);
      }
      return chosen;
    };

    const easy = pickFromPool(DAILY_EASY_POOL, 'easy');
    const med = pickFromPool(DAILY_MEDIUM_POOL, 'medium');
    const hard = pickFromPool(DAILY_HARD_POOL, 'hard');

    return [
      createInstanceFromDef(easy, dateKey),
      createInstanceFromDef(med, dateKey),
      createInstanceFromDef(hard, dateKey),
    ];
  }

  /**
   * Processes real gameplay events to update Daily, Weekly, and Special Challenge progress.
   * Never invents progress outside actual emitted events.
   */
  public emitEvent(event: MissionEventPayload): MissionInstance[] {
    const now = event.timestamp ?? this.nowProvider();
    this.ensureCurrentPeriods(now, false);

    const allLists = [this.dailyMissions, this.weeklyMissions, this.specialMissions];
    const newlyCompleted: MissionInstance[] = [];
    let dirty = false;

    for (const list of allLists) {
      for (const mission of list) {
        if (mission.completed) continue;
        const def = ALL_DEFINITIONS_MAP.get(mission.id);
        if (!def) continue;

        const prevProgress = mission.progress;
        const nextProgress = this.evaluateMissionProgress(mission, def, event);

        if (nextProgress > prevProgress) {
          mission.progress = Math.min(mission.target, nextProgress);
          dirty = true;
          if (mission.progress >= mission.target && !mission.completed) {
            this.markMissionCompleted(mission, now);
            newlyCompleted.push(cloneMission(mission));
          }
        }
      }
    }

    // Re-evaluate daily meta-missions ('complete_daily_missions') if any daily mission completed
    if (newlyCompleted.some((m) => m.category === 'daily')) {
      const dailyNewly = this.recalculateDailyMetaMissions(now);
      newlyCompleted.push(...dailyNewly);
    }

    if (dirty || newlyCompleted.length > 0) {
      this.save();
      this.notify();
    }

    for (const done of newlyCompleted) {
      this.emitNotification(done);
    }

    return newlyCompleted;
  }

  private evaluateMissionProgress(
    mission: MissionInstance,
    def: MissionDefinition,
    event: MissionEventPayload
  ): number {
    const cond = def.condition;
    const isSolo = !event.mode || event.mode === 'solo';

    switch (cond.kind) {
      case 'play_games': {
        if (event.type !== 'game_finished') return mission.progress;
        if (cond.soloOnly && !isSolo) return mission.progress;
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        if (cond.nonStarterWorld && (!event.worldId || event.worldId === 'green_valley')) {
          return mission.progress;
        }
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;
        if (cond.minRarity && rarityRank(event.characterRarity) < rarityRank(cond.minRarity)) {
          return mission.progress;
        }
        return mission.progress + 1;
      }

      case 'pass_pipes': {
        if (event.type !== 'pipe_passed') return mission.progress;
        if (cond.soloOnly && !isSolo) return mission.progress;
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        if (cond.nonStarterWorld && (!event.worldId || event.worldId === 'green_valley')) {
          return mission.progress;
        }
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;
        if (cond.minRarity && rarityRank(event.characterRarity) < rarityRank(cond.minRarity)) {
          return mission.progress;
        }
        const inc = Math.max(1, Math.floor(event.amount ?? 1));
        return mission.progress + inc;
      }

      case 'single_run_score': {
        if (event.type !== 'score_reached' && event.type !== 'game_finished') {
          return mission.progress;
        }
        if (cond.soloOnly && !isSolo) return mission.progress;
        if (cond.noCollision && event.collidedThisRun) return mission.progress;
        if (cond.noShield && event.usedShieldThisRun) return mission.progress;
        if (cond.noSecondChance && event.usedSecondChanceThisRun) return mission.progress;
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;

        const score = Math.max(0, Math.floor(event.score ?? 0));
        return Math.max(mission.progress, Math.min(mission.target, score));
      }

      case 'cumulative_score': {
        if (event.type !== 'game_finished') return mission.progress;
        if (cond.soloOnly && !isSolo) return mission.progress;
        const score = Math.max(0, Math.floor(event.score ?? 0));
        return mission.progress + score;
      }

      case 'collect_coins': {
        if (event.type !== 'coin_collected') return mission.progress;
        const amount = Math.max(0, Math.floor(event.amount ?? 0));
        return mission.progress + amount;
      }

      case 'collect_stars': {
        if (event.type !== 'star_collected') return mission.progress;
        const amount = Math.max(1, Math.floor(event.amount ?? 1));
        return mission.progress + amount;
      }

      case 'collect_gems': {
        if (event.type !== 'gem_collected') return mission.progress;
        const amount = Math.max(0, Math.floor(event.amount ?? 0));
        return mission.progress + amount;
      }

      case 'use_powerups': {
        if (event.type !== 'powerup_used') return mission.progress;
        const amount = Math.max(1, Math.floor(event.amount ?? 1));
        return mission.progress + amount;
      }

      case 'distinct_powerups': {
        if (event.type !== 'powerup_used' || !event.powerUpId) return mission.progress;
        if (!mission.metaProgress) mission.metaProgress = [];
        if (!mission.metaProgress.includes(event.powerUpId)) {
          mission.metaProgress.push(event.powerUpId);
        }
        return mission.metaProgress.length;
      }

      case 'distinct_worlds': {
        if (
          (event.type !== 'world_played' && event.type !== 'game_finished') ||
          !event.worldId
        ) {
          return mission.progress;
        }
        if (!mission.metaProgress) mission.metaProgress = [];
        if (!mission.metaProgress.includes(event.worldId)) {
          mission.metaProgress.push(event.worldId);
        }
        return mission.metaProgress.length;
      }

      case 'play_world': {
        if (event.type !== 'world_played' && event.type !== 'game_finished') {
          return mission.progress;
        }
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        return mission.progress + 1;
      }

      case 'use_character': {
        if (event.type !== 'character_used' && event.type !== 'game_finished') {
          return mission.progress;
        }
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;
        if (cond.minRarity && rarityRank(event.characterRarity) < rarityRank(cond.minRarity)) {
          return mission.progress;
        }
        return mission.progress + 1;
      }

      case 'play_multiplayer': {
        if (event.type !== 'multiplayer_played') return mission.progress;
        if (cond.matchFormat === 'quick' && event.mode !== 'quick') return mission.progress;
        if (cond.matchFormat === 'tournament' && event.mode !== 'bo3' && event.mode !== 'bo5') {
          return mission.progress;
        }
        return mission.progress + 1;
      }

      case 'win_matches': {
        if (event.type !== 'match_won' && event.type !== 'tournament_won') {
          return mission.progress;
        }
        if (event.winner === 'draw') return mission.progress;
        const isTournament =
          event.type === 'tournament_won' || event.mode === 'bo3' || event.mode === 'bo5';
        if (cond.matchFormat === 'tournament' && !isTournament) return mission.progress;
        if (cond.matchFormat === 'quick' && isTournament) return mission.progress;
        return mission.progress + 1;
      }

      case 'complete_daily_missions':
        return mission.progress;
    }
  }

  private recalculateDailyMetaMissions(now: number): MissionInstance[] {
    const newlyCompleted: MissionInstance[] = [];
    for (const mission of this.dailyMissions) {
      if (mission.completed) continue;
      const def = ALL_DEFINITIONS_MAP.get(mission.id);
      if (!def || def.condition.kind !== 'complete_daily_missions') continue;

      const otherCompletedCount = this.dailyMissions.filter(
        (m) => m.id !== mission.id && m.completed
      ).length;
      if (otherCompletedCount > mission.progress) {
        mission.progress = Math.min(mission.target, otherCompletedCount);
        if (mission.progress >= mission.target) {
          this.markMissionCompleted(mission, now);
          newlyCompleted.push(cloneMission(mission));
        }
      }
    }
    return newlyCompleted;
  }

  private markMissionCompleted(mission: MissionInstance, now: number): void {
    mission.completed = true;
    mission.completedAt = now;
    this.stats.totalCompleted += 1;

    const historyId = `${mission.periodKey}:${mission.id}`;
    const existing = this.history.find((h) => h.id === historyId);
    if (!existing) {
      const entry: MissionHistoryEntry = {
        id: historyId,
        missionId: mission.id,
        title: mission.title,
        category: mission.category,
        difficulty: mission.difficulty,
        icon: mission.icon,
        periodKey: mission.periodKey,
        completedAt: now,
        claimedAt: null,
        reward: { ...mission.reward },
        status: 'completed',
      };
      this.history = [entry, ...this.history].slice(0, MAX_HISTORY_ENTRIES);
    }

    if (mission.reward.xp && mission.reward.xp > 0) {
      playerProgressionManager.recordMissionCompletionXP(
        mission.periodKey,
        mission.id,
        mission.title,
        mission.reward.xp
      );
    }

    const perfectDay =
      mission.category === 'daily' &&
      this.dailyMissions.length > 0 &&
      this.dailyMissions.every((m) => m.completed);
    for (const hook of this.externalAchievementHooks) {
      hook({
        type: 'mission_completed',
        category: mission.category,
        perfectDay,
      });
    }
  }

  private emitNotification(mission: MissionInstance): void {
    const note: MissionCompletionNotification = {
      id: `${mission.periodKey}:${mission.id}:${mission.completedAt ?? Date.now()}`,
      missionId: mission.id,
      category: mission.category,
      difficulty: mission.difficulty,
      title: mission.title,
      icon: mission.icon,
      reward: { ...mission.reward },
    };
    for (const listener of this.notificationListeners) {
      listener(note);
    }
  }

  /**
   * Claims a completed mission reward idempotently.
   * Prevents duplicate payouts across double clicks, page refresh, or corrupted storage.
   */
  public claimReward(missionId: string): ClaimRewardResult {
    const now = this.nowProvider();
    this.ensureCurrentPeriods(now, false);

    const mission =
      this.dailyMissions.find((m) => m.id === missionId) ??
      this.weeklyMissions.find((m) => m.id === missionId) ??
      this.specialMissions.find((m) => m.id === missionId);

    if (!mission || !mission.completed || mission.claimed) {
      return {
        success: false,
        streakMilestonesUnlocked: [],
        unlockedCosmetics: {},
      };
    }

    const claimKey = `mission_claim:${mission.periodKey}:${mission.id}`;
    if (this.claimedRewardKeys.has(claimKey)) {
      mission.claimed = true;
      mission.claimedAt = mission.claimedAt ?? now;
      this.save();
      this.notify();
      return {
        success: false,
        streakMilestonesUnlocked: [],
        unlockedCosmetics: {},
      };
    }

    this.claimedRewardKeys.add(claimKey);
    mission.claimed = true;
    mission.claimedAt = now;

    const granted: ClaimRewardResult['unlockedCosmetics'] = {};
    let bonusCoins = 0;
    let bonusGems = 0;

    if (mission.reward.skinId) {
      const unlocked = characterSkinManager.unlockMilestoneSkin(mission.reward.skinId);
      if (unlocked) {
        granted.skinId = mission.reward.skinId;
      } else {
        // Fallback if player already unlocked this skin via another path
        bonusCoins += 100;
        bonusGems += 3;
      }
    }
    if (mission.reward.badge && !this.cosmetics.badges.includes(mission.reward.badge)) {
      this.cosmetics.badges.push(mission.reward.badge);
      granted.badge = mission.reward.badge;
    }
    if (mission.reward.title && !this.cosmetics.titles.includes(mission.reward.title)) {
      this.cosmetics.titles.push(mission.reward.title);
      if (!this.cosmetics.equippedTitle) {
        this.cosmetics.equippedTitle = mission.reward.title;
      }
      granted.title = mission.reward.title;
      playerProgressionManager.unlockTitle(mission.reward.title, 'solo');
    }
    if (
      mission.reward.avatarFrame &&
      VALID_FRAMES.has(mission.reward.avatarFrame) &&
      !this.cosmetics.frames.includes(mission.reward.avatarFrame)
    ) {
      this.cosmetics.frames.push(mission.reward.avatarFrame);
      if (this.cosmetics.equippedFrame === 'default') {
        this.cosmetics.equippedFrame = mission.reward.avatarFrame;
      }
      granted.avatarFrame = mission.reward.avatarFrame;
      playerProgressionManager.unlockFrame(mission.reward.avatarFrame, 'solo');
    }

    const totalMissionCoins = Math.max(0, Math.floor(mission.reward.coins + bonusCoins));
    const totalMissionGems = Math.max(0, Math.floor(mission.reward.gems + bonusGems));

    currencyManager.awardEventOnce(claimKey, totalMissionCoins, totalMissionGems);
    playerProgressionManager.recordCurrencyRewardStats(totalMissionCoins, totalMissionGems, 'solo');

    this.stats.totalClaimed += 1;
    this.stats.totalCoinsEarned += totalMissionCoins;
    this.stats.totalGemsEarned += totalMissionGems;

    // Update or insert history record
    const historyId = `${mission.periodKey}:${mission.id}`;
    const existingIdx = this.history.findIndex((h) => h.id === historyId);
    const updatedHistoryEntry: MissionHistoryEntry = {
      id: historyId,
      missionId: mission.id,
      title: mission.title,
      category: mission.category,
      difficulty: mission.difficulty,
      icon: mission.icon,
      periodKey: mission.periodKey,
      completedAt: mission.completedAt ?? now,
      claimedAt: now,
      reward: {
        ...mission.reward,
        coins: totalMissionCoins,
        gems: totalMissionGems,
      },
      status: 'claimed',
    };
    if (existingIdx >= 0) {
      this.history[existingIdx] = updatedHistoryEntry;
    } else {
      this.history = [updatedHistoryEntry, ...this.history].slice(0, MAX_HISTORY_ENTRIES);
    }

    // Update Daily Streak (at most +1 per calendar day when claiming a Daily Mission)
    let streakUpdated = false;
    const unlockedStreakMilestones: StreakMilestone[] = [];
    if (mission.category === 'daily') {
      const todayKey = mission.periodKey;
      if (this.streak.lastClaimDateKey !== todayKey) {
        const dayDiff = this.streak.lastClaimDateKey
          ? diffCalendarDays(this.streak.lastClaimDateKey, todayKey)
          : null;

        // Only advance if first claim ever or calendar moved forward cleanly (protects against clock rewind)
        if (dayDiff === null || dayDiff >= 1) {
          this.streak.currentStreak = dayDiff === 1 ? this.streak.currentStreak + 1 : 1;
          this.streak.bestStreak = Math.max(this.streak.bestStreak, this.streak.currentStreak);
          this.streak.lastClaimDateKey = todayKey;
          if (!this.streak.recentClaimDates.includes(todayKey)) {
            this.streak.recentClaimDates = [...this.streak.recentClaimDates, todayKey].slice(-30);
          }
          streakUpdated = true;

          // Evaluate Streak Milestones (strictly once per milestone achievement)
          for (const milestone of STREAK_MILESTONES) {
            if (
              this.streak.currentStreak >= milestone.days &&
              !this.streak.claimedMilestones.includes(milestone.days)
            ) {
              this.streak.claimedMilestones.push(milestone.days);
              const mKey = `streak_milestone:${milestone.days}`;
              let mCoins = milestone.reward.coins;
              let mGems = milestone.reward.gems;

              if (milestone.reward.skinId) {
                const skinUnlocked = characterSkinManager.unlockMilestoneSkin(milestone.reward.skinId);
                if (skinUnlocked) {
                  granted.skinId = milestone.reward.skinId;
                } else {
                  mCoins += 100;
                  mGems += 5;
                }
              }
              if (
                milestone.reward.avatarFrame &&
                VALID_FRAMES.has(milestone.reward.avatarFrame) &&
                !this.cosmetics.frames.includes(milestone.reward.avatarFrame)
              ) {
                this.cosmetics.frames.push(milestone.reward.avatarFrame);
                granted.avatarFrame = milestone.reward.avatarFrame;
                playerProgressionManager.unlockFrame(milestone.reward.avatarFrame, 'solo');
              }
              if (
                milestone.reward.badge &&
                !this.cosmetics.badges.includes(milestone.reward.badge)
              ) {
                this.cosmetics.badges.push(milestone.reward.badge);
                granted.badge = milestone.reward.badge;
              }
              if (
                milestone.reward.title &&
                !this.cosmetics.titles.includes(milestone.reward.title)
              ) {
                this.cosmetics.titles.push(milestone.reward.title);
                granted.title = milestone.reward.title;
                playerProgressionManager.unlockTitle(milestone.reward.title, 'solo');
              }

              currencyManager.awardEventOnce(mKey, mCoins, mGems);
              playerProgressionManager.recordCurrencyRewardStats(mCoins, mGems, 'solo');
              this.stats.totalCoinsEarned += mCoins;
              this.stats.totalGemsEarned += mGems;
              unlockedStreakMilestones.push(milestone);
            }
          }
        }
      }
    }

    this.save();
    this.notify();

    if (streakUpdated) {
      for (const hook of this.externalAchievementHooks) {
        hook({
          type: 'streak_updated',
          currentStreak: this.streak.currentStreak,
          bestStreak: this.streak.bestStreak,
        });
      }
    }

    return {
      success: true,
      mission: cloneMission(mission),
      rewardGranted: {
        ...mission.reward,
        coins: totalMissionCoins,
        gems: totalMissionGems,
      },
      streakUpdated,
      newStreak: this.streak.currentStreak,
      streakMilestonesUnlocked: unlockedStreakMilestones,
      unlockedCosmetics: granted,
    };
  }

  public equipTitle(title: string | null): void {
    if (title !== null && !this.cosmetics.titles.includes(title)) return;
    this.cosmetics.equippedTitle = title;
    if (title) {
      playerProgressionManager.unlockTitle(title, 'solo');
      const def = findTitleByNameOrId(title);
      if (def) {
        playerProgressionManager.equipTitle(def.id, 'solo');
      }
    } else {
      playerProgressionManager.equipTitle('newbie_flyer', 'solo');
    }
    this.save();
    this.notify();
  }

  public equipFrame(frame: AvatarFrameId): void {
    if (!this.cosmetics.frames.includes(frame)) return;
    this.cosmetics.equippedFrame = frame;
    playerProgressionManager.unlockFrame(frame, 'solo');
    playerProgressionManager.equipFrame(frame, 'solo');
    this.save();
    this.notify();
  }

  public grantTitleExternal(title: string): void {
    if (!title || this.cosmetics.titles.includes(title)) return;
    this.cosmetics.titles.push(title);
    this.save();
    this.notify();
  }

  public grantFrameExternal(frame: AvatarFrameId): void {
    if (!VALID_FRAMES.has(frame) || this.cosmetics.frames.includes(frame)) return;
    this.cosmetics.frames.push(frame);
    this.save();
    this.notify();
  }

  public reset(): void {
    const now = this.nowProvider();
    this.dailyPeriodKey = getLocalDateKey(now);
    this.weeklyPeriodKey = getLocalWeekKey(now);
    this.dailyMissions = this.generateDailyMissions(this.dailyPeriodKey);
    this.weeklyMissions = WEEKLY_MISSIONS.map((d) => createInstanceFromDef(d, this.weeklyPeriodKey));
    this.specialMissions = SPECIAL_CHALLENGES.map((d) => createInstanceFromDef(d, 'permanent'));
    this.history = [];
    this.streak = defaultStreakState();
    this.stats = defaultStatsSummary();
    this.cosmetics = defaultCosmeticsState();
    this.claimedRewardKeys.clear();
    this.save();
    this.notify();
  }

  private notify(): void {
    const snap = this.getSnapshot();
    for (const l of this.listeners) {
      l(snap);
    }
  }

  private sanitizeMissionArray(
    raw: unknown,
    expectedPeriodKey: string | null,
    allowedIds?: ReadonlySet<string>
  ): MissionInstance[] {
    if (!Array.isArray(raw)) return [];
    const out: MissionInstance[] = [];
    const seen = new Set<string>();

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as Partial<MissionInstance>;
      if (typeof obj.id !== 'string' || seen.has(obj.id)) continue;
      if (allowedIds && !allowedIds.has(obj.id)) continue;

      const def = ALL_DEFINITIONS_MAP.get(obj.id);
      if (!def) continue;
      if (expectedPeriodKey !== null && obj.periodKey !== expectedPeriodKey) continue;

      seen.add(obj.id);
      const target = def.target;
      const progress =
        typeof obj.progress === 'number' && Number.isFinite(obj.progress) && obj.progress >= 0
          ? Math.min(target, Math.floor(obj.progress))
          : 0;
      const completed = Boolean(obj.completed) || progress >= target;
      const claimed = completed && Boolean(obj.claimed);
      const metaProgress = Array.isArray(obj.metaProgress)
        ? obj.metaProgress.filter((s): s is string => typeof s === 'string' && s.length > 0)
        : def.condition.kind === 'distinct_powerups' || def.condition.kind === 'distinct_worlds'
          ? []
          : undefined;

      out.push({
        id: def.id,
        category: def.category,
        difficulty: def.difficulty,
        title: def.title,
        description: def.description,
        icon: def.icon,
        target,
        progress: completed ? target : metaProgress ? Math.min(target, metaProgress.length) : progress,
        completed,
        claimed,
        completedAt:
          completed && typeof obj.completedAt === 'number' && Number.isFinite(obj.completedAt)
            ? obj.completedAt
            : completed
              ? Date.now()
              : null,
        claimedAt:
          claimed && typeof obj.claimedAt === 'number' && Number.isFinite(obj.claimedAt)
            ? obj.claimedAt
            : null,
        periodKey: expectedPeriodKey ?? 'permanent',
        reward: { ...def.reward },
        metaProgress,
      });
    }
    return out;
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(MISSIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredMissionPayload>;
      if (!parsed || typeof parsed !== 'object') return;

      const now = this.nowProvider();
      const currentDailyKey = getLocalDateKey(now);
      const currentWeeklyKey = getLocalWeekKey(now);

      if (parsed.dailyPeriodKey === currentDailyKey) {
        this.dailyPeriodKey = currentDailyKey;
        this.dailyMissions = this.sanitizeMissionArray(parsed.dailyMissions, currentDailyKey);
      }

      if (parsed.weeklyPeriodKey === currentWeeklyKey) {
        this.weeklyPeriodKey = currentWeeklyKey;
        this.weeklyMissions = this.sanitizeMissionArray(
          parsed.weeklyMissions,
          currentWeeklyKey,
          new Set(WEEKLY_MISSIONS.map((w) => w.id))
        );
      }

      const loadedSpecials = this.sanitizeMissionArray(
        parsed.specialMissions,
        'permanent',
        new Set(SPECIAL_CHALLENGES.map((s) => s.id))
      );
      // Merge any newly introduced Special Challenges safely without overwriting progress
      const specialById = new Map(loadedSpecials.map((s) => [s.id, s]));
      this.specialMissions = SPECIAL_CHALLENGES.map(
        (def) => specialById.get(def.id) ?? createInstanceFromDef(def, 'permanent')
      );

      if (Array.isArray(parsed.history)) {
        const cleanHistory: MissionHistoryEntry[] = [];
        for (const h of parsed.history.slice(0, MAX_HISTORY_ENTRIES)) {
          if (!h || typeof h !== 'object') continue;
          if (typeof h.id !== 'string' || typeof h.missionId !== 'string') continue;
          const cat =
            h.category === 'daily' || h.category === 'weekly' || h.category === 'special'
              ? h.category
              : 'daily';
          const diff =
            h.difficulty === 'easy' ||
            h.difficulty === 'medium' ||
            h.difficulty === 'hard' ||
            h.difficulty === 'weekly' ||
            h.difficulty === 'special'
              ? h.difficulty
              : 'easy';
          cleanHistory.push({
            id: h.id,
            missionId: h.missionId,
            title: typeof h.title === 'string' ? h.title : h.missionId,
            category: cat,
            difficulty: diff,
            icon: typeof h.icon === 'string' ? h.icon : '🎯',
            periodKey: typeof h.periodKey === 'string' ? h.periodKey : '',
            completedAt:
              typeof h.completedAt === 'number' && Number.isFinite(h.completedAt)
                ? h.completedAt
                : now,
            claimedAt:
              typeof h.claimedAt === 'number' && Number.isFinite(h.claimedAt) ? h.claimedAt : null,
            reward: {
              coins:
                typeof h.reward?.coins === 'number' && Number.isFinite(h.reward.coins)
                  ? Math.max(0, Math.floor(h.reward.coins))
                  : 0,
              gems:
                typeof h.reward?.gems === 'number' && Number.isFinite(h.reward.gems)
                  ? Math.max(0, Math.floor(h.reward.gems))
                  : 0,
              skinId: h.reward?.skinId as SkinId | undefined,
              badge: typeof h.reward?.badge === 'string' ? h.reward.badge : undefined,
              title: typeof h.reward?.title === 'string' ? h.reward.title : undefined,
              avatarFrame: VALID_FRAMES.has(h.reward?.avatarFrame as AvatarFrameId)
                ? (h.reward?.avatarFrame as AvatarFrameId)
                : undefined,
            },
            status: h.status === 'claimed' ? 'claimed' : 'completed',
          });
        }
        this.history = cleanHistory;
      }

      if (parsed.streak && typeof parsed.streak === 'object') {
        const s = parsed.streak;
        this.streak = {
          currentStreak:
            typeof s.currentStreak === 'number' && Number.isFinite(s.currentStreak) && s.currentStreak >= 0
              ? Math.floor(s.currentStreak)
              : 0,
          bestStreak:
            typeof s.bestStreak === 'number' && Number.isFinite(s.bestStreak) && s.bestStreak >= 0
              ? Math.floor(s.bestStreak)
              : 0,
          lastClaimDateKey:
            typeof s.lastClaimDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastClaimDateKey)
              ? s.lastClaimDateKey
              : null,
          claimedMilestones: Array.isArray(s.claimedMilestones)
            ? s.claimedMilestones.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
            : [],
          recentClaimDates: Array.isArray(s.recentClaimDates)
            ? s.recentClaimDates.filter(
                (d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
              )
            : [],
        };
      }

      if (parsed.stats && typeof parsed.stats === 'object') {
        const cleanInt = (v: unknown) =>
          typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
        this.stats = {
          totalCompleted: cleanInt(parsed.stats.totalCompleted),
          totalClaimed: cleanInt(parsed.stats.totalClaimed),
          totalCoinsEarned: cleanInt(parsed.stats.totalCoinsEarned),
          totalGemsEarned: cleanInt(parsed.stats.totalGemsEarned),
        };
      }

      if (parsed.cosmetics && typeof parsed.cosmetics === 'object') {
        const c = parsed.cosmetics;
        const frames = new Set<AvatarFrameId>(['default']);
        if (Array.isArray(c.frames)) {
          for (const f of c.frames) {
            if (typeof f === 'string' && VALID_FRAMES.has(f as AvatarFrameId)) {
              frames.add(f as AvatarFrameId);
            }
          }
        }
        const titles = Array.isArray(c.titles)
          ? c.titles.filter((t): t is string => typeof t === 'string' && t.length > 0)
          : [];
        const badges = Array.isArray(c.badges)
          ? c.badges.filter((b): b is string => typeof b === 'string' && b.length > 0)
          : [];

        this.cosmetics = {
          titles,
          badges,
          frames: Array.from(frames),
          equippedTitle:
            typeof c.equippedTitle === 'string' && titles.includes(c.equippedTitle)
              ? c.equippedTitle
              : null,
          equippedFrame:
            typeof c.equippedFrame === 'string' && frames.has(c.equippedFrame as AvatarFrameId)
              ? (c.equippedFrame as AvatarFrameId)
              : 'default',
        };
      }

      if (Array.isArray(parsed.claimedRewardKeys)) {
        for (const key of parsed.claimedRewardKeys) {
          if (typeof key === 'string' && key.length > 0) {
            this.claimedRewardKeys.add(key);
          }
        }
      }
    } catch {
      this.dailyMissions = [];
      this.weeklyMissions = [];
      this.specialMissions = [];
      this.history = [];
      this.streak = defaultStreakState();
      this.stats = defaultStatsSummary();
      this.cosmetics = defaultCosmeticsState();
      this.claimedRewardKeys.clear();
    }
  }

  private save(): void {
    try {
      const payload: StoredMissionPayload = {
        version: MISSIONS_STORAGE_VERSION,
        dailyPeriodKey: this.dailyPeriodKey,
        weeklyPeriodKey: this.weeklyPeriodKey,
        dailyMissions: this.dailyMissions,
        weeklyMissions: this.weeklyMissions,
        specialMissions: this.specialMissions,
        history: this.history.slice(0, MAX_HISTORY_ENTRIES),
        streak: this.streak,
        stats: this.stats,
        cosmetics: this.cosmetics,
        claimedRewardKeys: Array.from(this.claimedRewardKeys).slice(-400),
      };
      window.localStorage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage failures
    }
  }
}

export const missionManager = new MissionManager();
