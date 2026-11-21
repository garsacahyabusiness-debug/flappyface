import { characterSkinManager } from '../character/CharacterSkinManager';
import { characterUnlockManager } from '../character/CharacterUnlockManager';
import { getLocalDateKey } from '../missions/MissionDateUtils';
import { missionManager } from '../missions/MissionManager';
import { currencyManager, PowerUpCurrencyStats } from '../powerups/CurrencyManager';
import { PowerUpId } from '../powerups/PowerUpRegistry';
import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import { worldUnlockManager } from '../worlds/WorldUnlockManager';
import { WORLD_MAP } from '../worlds/WorldRegistry';
import { ACHIEVEMENT_CHAINS } from './AchievementChains';
import {
  ACHIEVEMENT_RARITY_CONFIG,
  computeAchievementRank,
} from './AchievementPointsManager';
import {
  ACHIEVEMENT_DEFINITIONS,
  ACHIEVEMENT_MAP,
} from './AchievementRegistry';
import {
  AchievementCategory,
  AchievementChainState,
  AchievementDefinition,
  AchievementEvent,
  AchievementHistoryEntry,
  AchievementMetrics,
  AchievementRarity,
  AchievementRecord,
  AchievementSnapshot,
  AchievementStatsSummary,
  BadgeRecord,
} from './AchievementTypes';
import { FIXED_BADGE_REGISTRY } from './BadgeRegistry';
import { rewardShopManager } from './RewardShopManager';

const ACHIEVEMENTS_STORAGE_KEY = 'flappy_face_achievements';
const ACHIEVEMENTS_STORAGE_VERSION = 2;
const MAX_HISTORY_ENTRIES = 150;
const MAX_SHOWCASE_SLOTS = 3;

const LEGACY_POWERUP_TYPES = new Set([
  'shield_saves',
  'revives',
  'coins',
  'gems',
  'powerups_total',
  'powerups_run',
]);

export type PowerUpMetricsInput = Pick<
  PowerUpCurrencyStats,
  | 'shieldSaves'
  | 'revivesUsed'
  | 'totalCoinsCollected'
  | 'totalGemsCollected'
  | 'totalStarsCollected'
  | 'totalPowerUpsCollected'
> &
  Partial<PowerUpCurrencyStats>;

interface StoredAchievementEntry {
  unlocked: boolean;
  unlockedAt: number | null;
}

interface StoredAchievementPayload {
  version: number;
  records: Record<string, StoredAchievementEntry>;
  metrics?: Partial<AchievementMetrics>;
  history?: AchievementHistoryEntry[];
  showcaseIds?: string[];
}

function defaultMetrics(): AchievementMetrics {
  return {
    gamesPlayed: 0,
    totalPipes: 0,
    totalScore: 0,
    bestScore: 0,
    totalLosses: 0,
    highScoreBeats: 0,
    ceilingCollisions: 0,
    groundCollisions: 0,
    bestSurvivalCombo: 0,

    nearMissTotal: 0,
    bestNearMissRun: 0,
    maxRiskScoreRun: 0,
    bestPureSkillScore: 0,
    bestNoPowerUpScore: 0,
    bestNoCoinScore: 0,
    bestClassicPureScore: 0,
    pauseAndScore5Count: 0,
    patientReadyWaitCount: 0,

    totalCoinsCollected: 0,
    totalCoinsEarned: 0,
    totalGemsCollected: 0,
    totalGemsEarned: 0,
    totalStarsCollected: 0,
    totalCoinsSpent: 0,
    totalGemsSpent: 0,
    shopPurchases: 0,
    shopItemsOwnedCount: 0,
    trifectaRuns: 0,

    unlockedCharactersCount: 2,
    unlockedSkinsCount: 1,
    distinctCharactersPlayed: [],
    charsScored25: [],
    distinctSkinsEquipped: [],
    bestCustomFaceScore: 0,

    unlockedWorldsCount: 1,
    nonStarterWorldGames: 0,
    distinctWorldsPlayed: [],
    worldsScored25: [],
    distinctWeathersPlayed: [],
    bestDarkWorldScore: 0,

    totalPowerUpsCollected: 0,
    bestPowerUpsRun: 0,
    shieldSaves: 0,
    revivesUsed: 0,
    magnetCollectedTotal: 0,
    bestMagnetRun: 0,
    slowMotionUsedTotal: 0,
    distinctPowerUpsUsed: [],
    shieldSaveTo15Count: 0,
    revivePlus15Count: 0,

    totalMissionsCompleted: 0,
    dailyMissionsCompleted: 0,
    weeklyMissionsCompleted: 0,
    specialMissionsCompleted: 0,
    perfectDaysCount: 0,
    bestStreak: 0,

    tournamentsPlayed: 0,
    tournamentsWon: 0,
    bo3TournamentsWon: 0,
    bo5TournamentsWon: 0,
    cleanSweepTournamentsWon: 0,
    comebackTournamentsWon: 0,
    currentTournamentStreak: 0,
    bestTournamentStreak: 0,
    multiplayerPlayed: 0,
    quickMatchesWon: 0,
    p1Wins: 0,
    p2Wins: 0,
    multiplayerDraws: 0,
    bestCombinedMultiplayerScore: 0,

    zeroScoreDeaths: 0,
    exactScore7Count: 0,
    exactScore77Count: 0,
    nightOwlRuns: 0,
    earlyBirdRuns: 0,
    consecutiveLosses: 0,
    comebackKidTriggered: 0,
    visitedMenus: [],
    lastPlayDateKey: '',
    runsTodayCount: 0,
    maxRunsInSingleDay: 0,
    weekendRunsCount: 0,
  };
}

function pushUnique<T extends string>(arr: T[], value: T): void {
  if (value && !arr.includes(value)) {
    arr.push(value);
  }
}

function sanitizeStringArray<T extends string = string>(raw: unknown): T[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim().length > 0 && !seen.has(item)) {
      seen.add(item);
      out.push(item as T);
    }
  }
  return out;
}

function safeNonNeg(raw: unknown, fallback = 0): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return fallback;
  return Math.floor(raw);
}

export class AchievementManager {
  private unlockedState = new Map<string, StoredAchievementEntry>();
  private metrics: AchievementMetrics = defaultMetrics();
  private history: AchievementHistoryEntry[] = [];
  private showcaseIds: string[] = [];

  private listeners = new Set<(records: AchievementRecord[]) => void>();
  private snapshotListeners = new Set<(snapshot: AchievementSnapshot) => void>();
  private unlockQueueListeners = new Set<(unlocked: AchievementRecord[]) => void>();

  constructor() {
    this.load();
    this.bindExternalMissionHooks();
  }

  private bindExternalMissionHooks(): void {
    try {
      missionManager.onExternalAchievementEvent?.((ev) => {
        if (ev.type === 'mission_completed') {
          this.recordEvent({
            type: 'mission_completed',
            category: ev.category,
            perfectDay: ev.perfectDay,
          });
        } else if (ev.type === 'streak_updated') {
          this.recordEvent({
            type: 'streak_updated',
            currentStreak: ev.currentStreak,
            bestStreak: ev.bestStreak,
          });
        }
      });
    } catch {
      // Ignore if test harnesses isolate singletons
    }
  }

  public reloadFromStorage(): void {
    this.load();
    this.notifyAll();
  }

  // ---- Progress / Evaluation Helpers ----

  private computeProgressValue(
    def: AchievementDefinition,
    unlockedWithoutMeta: number,
    unlockedHiddenWithoutExplorer: number
  ): number {
    if (def.id === 'secret_explorer') {
      return unlockedHiddenWithoutExplorer;
    }
    if (def.id === 'the_legend') {
      return unlockedWithoutMeta;
    }
    if (def.getValue) {
      return Math.max(0, Math.floor(def.getValue(this.metrics)));
    }
    switch (def.requirementType) {
      case 'score':
        return this.metrics.bestScore;
      case 'shield_saves':
        return this.metrics.shieldSaves;
      case 'revives':
        return this.metrics.revivesUsed;
      case 'coins':
        return this.metrics.totalCoinsCollected;
      case 'gems':
        return this.metrics.totalGemsCollected;
      case 'powerups_total':
        return this.metrics.totalPowerUpsCollected;
      case 'powerups_run':
        return this.metrics.bestPowerUpsRun;
      default:
        return 0;
    }
  }

  private countUnlockedForMeta(): { totalWithoutLegend: number; hiddenWithoutExplorer: number } {
    let totalWithoutLegend = 0;
    let hiddenWithoutExplorer = 0;
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const state = this.unlockedState.get(def.id);
      if (!state?.unlocked) continue;
      if (def.id !== 'the_legend') totalWithoutLegend += 1;
      if (def.hidden && def.id !== 'secret_explorer' && def.id !== 'the_legend') {
        hiddenWithoutExplorer += 1;
      }
    }
    return { totalWithoutLegend, hiddenWithoutExplorer };
  }

  public getAll(): AchievementRecord[] {
    const { totalWithoutLegend, hiddenWithoutExplorer } = this.countUnlockedForMeta();
    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const state = this.unlockedState.get(def.id);
      const unlocked = Boolean(state?.unlocked);
      const rawProgress = this.computeProgressValue(
        def,
        totalWithoutLegend,
        hiddenWithoutExplorer
      );
      const progress = unlocked
        ? def.requirement
        : Math.min(def.requirement, Math.max(0, rawProgress));
      return {
        ...def,
        unlocked,
        unlockedAt: unlocked ? state?.unlockedAt ?? null : null,
        progress,
      };
    });
  }

  public getUnlockedCount(): number {
    let count = 0;
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (this.unlockedState.get(def.id)?.unlocked) count += 1;
    }
    return count;
  }

  public getTotalCount(): number {
    return ACHIEVEMENT_DEFINITIONS.length;
  }

  public getHighestMilestoneName(bestScore: number): string {
    const safeBest = Math.max(0, Math.floor(bestScore));
    const scoreRecords = this.getAll().filter(
      (r) =>
        r.requirementType === 'score' &&
        (r.unlocked || safeBest >= r.requirement)
    );
    if (scoreRecords.length === 0) {
      return 'BEGINNER';
    }
    scoreRecords.sort((a, b) => a.requirement - b.requirement);
    return scoreRecords[scoreRecords.length - 1].name;
  }

  public getBadgeCollection(): BadgeRecord[] {
    const shopOwned = new Set(rewardShopManager.getOwnedIds());
    return FIXED_BADGE_REGISTRY.map((badge) => {
      let unlocked = false;
      let unlockedAt: number | null = null;
      if (badge.linkedAchievementId) {
        const st = this.unlockedState.get(badge.linkedAchievementId);
        if (st?.unlocked) {
          unlocked = true;
          unlockedAt = st.unlockedAt;
        }
      }
      if (!unlocked && badge.linkedShopItemId && shopOwned.has(badge.linkedShopItemId)) {
        unlocked = true;
        unlockedAt = unlockedAt ?? Date.now();
      }
      return {
        ...badge,
        unlocked,
        unlockedAt,
      };
    });
  }

  public getChainStates(): AchievementChainState[] {
    const recordMap = new Map(this.getAll().map((r) => [r.id, r]));
    return ACHIEVEMENT_CHAINS.map((chain) => {
      const steps = chain.achievementIds
        .map((id) => recordMap.get(id))
        .filter((r): r is AchievementRecord => Boolean(r));
      const completedCount = steps.filter((s) => s.unlocked).length;
      const nextAchievement = steps.find((s) => !s.unlocked) ?? null;
      return {
        chain,
        completedCount,
        totalCount: steps.length,
        nextAchievement,
        steps,
      };
    });
  }

  public getStatsSummary(recordsInput?: AchievementRecord[]): AchievementStatsSummary {
    const records = recordsInput ?? this.getAll();
    const byRarity: Record<AchievementRarity, { unlocked: number; total: number }> = {
      COMMON: { unlocked: 0, total: 0 },
      UNCOMMON: { unlocked: 0, total: 0 },
      RARE: { unlocked: 0, total: 0 },
      EPIC: { unlocked: 0, total: 0 },
      LEGENDARY: { unlocked: 0, total: 0 },
    };
    const byCategory: Record<AchievementCategory, { unlocked: number; total: number }> = {
      gameplay: { unlocked: 0, total: 0 },
      score: { unlocked: 0, total: 0 },
      skill: { unlocked: 0, total: 0 },
      collection: { unlocked: 0, total: 0 },
      characters: { unlocked: 0, total: 0 },
      worlds: { unlocked: 0, total: 0 },
      powerups: { unlocked: 0, total: 0 },
      missions: { unlocked: 0, total: 0 },
      tournament: { unlocked: 0, total: 0 },
      multiplayer: { unlocked: 0, total: 0 },
      hidden: { unlocked: 0, total: 0 },
    };

    let unlockedAchievements = 0;
    let totalAchievementPoints = 0;
    let earnedAchievementPoints = 0;
    let totalCoinsEarned = 0;
    let totalGemsEarned = 0;
    let totalXpEarned = 0;
    let unlockedHiddenCount = 0;
    let totalHiddenCount = 0;

    for (const r of records) {
      byRarity[r.rarity].total += 1;
      byCategory[r.category].total += 1;
      totalAchievementPoints += r.points;
      if (r.hidden) totalHiddenCount += 1;

      if (r.unlocked) {
        unlockedAchievements += 1;
        byRarity[r.rarity].unlocked += 1;
        byCategory[r.category].unlocked += 1;
        earnedAchievementPoints += r.points;
        totalCoinsEarned += r.rewardCoins;
        totalGemsEarned += r.rewardGems;
        totalXpEarned += r.rewardXP;
        if (r.hidden) unlockedHiddenCount += 1;
      }
    }

    const totalAchievements = records.length;
    const lockedAchievements = totalAchievements - unlockedAchievements;
    const completionPercent =
      totalAchievements > 0
        ? Math.round((unlockedAchievements / totalAchievements) * 100)
        : 0;

    return {
      totalAchievements,
      unlockedAchievements,
      lockedAchievements,
      completionPercent,
      totalAchievementPoints,
      earnedAchievementPoints,
      remainingAchievementPoints: Math.max(0, totalAchievementPoints - earnedAchievementPoints),
      totalCoinsEarned,
      totalGemsEarned,
      totalXpEarned,
      unlockedHiddenCount,
      totalHiddenCount,
      byRarity,
      byCategory,
      rank: computeAchievementRank(earnedAchievementPoints),
    };
  }

  public getFeaturedAchievement(recordsInput?: AchievementRecord[]): AchievementRecord | null {
    const records = recordsInput ?? this.getAll();
    const lockedNonHidden = records.filter((r) => !r.unlocked && !r.hidden);
    if (lockedNonHidden.length === 0) {
      return records.find((r) => !r.unlocked) ?? null;
    }
    lockedNonHidden.sort((a, b) => {
      const ratioA = a.requirement > 0 ? a.progress / a.requirement : 0;
      const ratioB = b.requirement > 0 ? b.progress / b.requirement : 0;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return b.points - a.points;
    });
    return lockedNonHidden[0] ?? null;
  }

  public getShowcaseIds(): string[] {
    return this.showcaseIds.filter((id) => Boolean(this.unlockedState.get(id)?.unlocked));
  }

  public getShowcaseRecords(): AchievementRecord[] {
    const validIds = this.getShowcaseIds();
    const map = new Map(this.getAll().map((r) => [r.id, r]));
    return validIds
      .map((id) => map.get(id))
      .filter((r): r is AchievementRecord => Boolean(r && r.unlocked));
  }

  public setShowcaseSlots(ids: string[]): string[] {
    const next: string[] = [];
    for (const id of ids) {
      if (
        typeof id === 'string' &&
        !next.includes(id) &&
        this.unlockedState.get(id)?.unlocked &&
        ACHIEVEMENT_MAP.has(id)
      ) {
        next.push(id);
        if (next.length >= MAX_SHOWCASE_SLOTS) break;
      }
    }
    this.showcaseIds = next;
    this.save();
    this.notifyAll();
    return [...this.showcaseIds];
  }

  public toggleShowcaseAchievement(achievementId: string): {
    updated: string[];
    added: boolean;
    error?: string;
  } {
    if (!this.unlockedState.get(achievementId)?.unlocked) {
      return {
        updated: this.getShowcaseIds(),
        added: false,
        error: 'Hanya achievement yang sudah terbuka dapat dipajang di Showcase.',
      };
    }
    const current = this.getShowcaseIds();
    if (current.includes(achievementId)) {
      const next = current.filter((id) => id !== achievementId);
      this.showcaseIds = next;
      this.save();
      this.notifyAll();
      return { updated: next, added: false };
    }
    if (current.length >= MAX_SHOWCASE_SLOTS) {
      const next = [...current.slice(0, MAX_SHOWCASE_SLOTS - 1), achievementId];
      this.showcaseIds = next;
      this.save();
      this.notifyAll();
      return { updated: next, added: true };
    }
    const next = [...current, achievementId];
    this.showcaseIds = next;
    this.save();
    this.notifyAll();
    return { updated: next, added: true };
  }

  public getSnapshot(): AchievementSnapshot {
    const records = this.getAll();
    const stats = this.getStatsSummary(records);
    const badges = this.getBadgeCollection();
    const chains = this.getChainStates();
    return {
      records,
      badges,
      chains,
      stats,
      recentUnlocks: [...this.history].slice(0, 12),
      featuredAchievement: this.getFeaturedAchievement(records),
      showcaseIds: this.getShowcaseIds(),
    };
  }

  public getMetricsSnapshot(): AchievementMetrics {
    return {
      ...this.metrics,
      distinctCharactersPlayed: [...this.metrics.distinctCharactersPlayed],
      charsScored25: [...this.metrics.charsScored25],
      distinctSkinsEquipped: [...this.metrics.distinctSkinsEquipped],
      distinctWorldsPlayed: [...this.metrics.distinctWorldsPlayed],
      worldsScored25: [...this.metrics.worldsScored25],
      distinctWeathersPlayed: [...this.metrics.distinctWeathersPlayed],
      distinctPowerUpsUsed: [...this.metrics.distinctPowerUpsUsed],
      visitedMenus: [...this.metrics.visitedMenus],
    };
  }

  // ---- Subscriptions ----

  public subscribe(listener: (records: AchievementRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeSnapshot(listener: (snapshot: AchievementSnapshot) => void): () => void {
    this.snapshotListeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  public subscribeUnlocks(listener: (unlocked: AchievementRecord[]) => void): () => void {
    this.unlockQueueListeners.add(listener);
    return () => {
      this.unlockQueueListeners.delete(listener);
    };
  }

  // ---- Backward-Compatible Direct Methods ----

  /**
   * Preserves legacy Test 9 / Test 37 behavior: checks score achievements cleanly.
   */
  public checkScore(score: number): AchievementRecord[] {
    const safeScore = Math.max(0, Math.floor(score));
    this.metrics.bestScore = Math.max(this.metrics.bestScore, safeScore);
    const newlyUnlocked: AchievementRecord[] = [];
    const now = Date.now();

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (def.requirementType !== 'score') continue;
      if (this.unlockedState.get(def.id)?.unlocked) continue;
      if (safeScore >= def.requirement) {
        const rec = this.grantUnlock(def, now);
        if (rec) newlyUnlocked.push(rec);
      }
    }

    if (newlyUnlocked.length > 0) {
      const meta = this.evaluateMetaAchievements(now);
      newlyUnlocked.push(...meta);
      this.save();
      this.notifyAll(newlyUnlocked);
    } else {
      this.save();
    }

    return newlyUnlocked;
  }

  /**
   * Preserves legacy Test 25 contract: checks ONLY the 6 legacy Power-Up requirement types.
   */
  public checkPowerUpMetrics(
    stats: PowerUpMetricsInput,
    runPowerUpsCollected = 0
  ): AchievementRecord[] {
    this.metrics.shieldSaves = Math.max(this.metrics.shieldSaves, safeNonNeg(stats.shieldSaves));
    this.metrics.revivesUsed = Math.max(this.metrics.revivesUsed, safeNonNeg(stats.revivesUsed));
    this.metrics.totalCoinsCollected = Math.max(
      this.metrics.totalCoinsCollected,
      safeNonNeg(stats.totalCoinsCollected)
    );
    this.metrics.totalGemsCollected = Math.max(
      this.metrics.totalGemsCollected,
      safeNonNeg(stats.totalGemsCollected)
    );
    this.metrics.totalStarsCollected = Math.max(
      this.metrics.totalStarsCollected,
      safeNonNeg(stats.totalStarsCollected)
    );
    this.metrics.totalPowerUpsCollected = Math.max(
      this.metrics.totalPowerUpsCollected,
      safeNonNeg(stats.totalPowerUpsCollected)
    );
    this.metrics.bestPowerUpsRun = Math.max(
      this.metrics.bestPowerUpsRun,
      safeNonNeg(runPowerUpsCollected)
    );

    const newlyUnlocked: AchievementRecord[] = [];
    const now = Date.now();

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (!LEGACY_POWERUP_TYPES.has(def.requirementType)) continue;
      if (this.unlockedState.get(def.id)?.unlocked) continue;

      let value = 0;
      switch (def.requirementType) {
        case 'shield_saves':
          value = stats.shieldSaves;
          break;
        case 'revives':
          value = stats.revivesUsed;
          break;
        case 'coins':
          value = stats.totalCoinsCollected;
          break;
        case 'gems':
          value = stats.totalGemsCollected;
          break;
        case 'powerups_total':
          value = stats.totalPowerUpsCollected;
          break;
        case 'powerups_run':
          value = runPowerUpsCollected;
          break;
      }

      if (value >= def.requirement) {
        const rec = this.grantUnlock(def, now);
        if (rec) newlyUnlocked.push(rec);
      }
    }

    if (newlyUnlocked.length > 0) {
      const meta = this.evaluateMetaAchievements(now);
      newlyUnlocked.push(...meta);
      this.save();
      this.notifyAll(newlyUnlocked);
    } else {
      this.save();
    }

    return newlyUnlocked;
  }

  // ---- Real Event Processing & External Sync ----

  public recordMenuVisit(menuId: string): AchievementRecord[] {
    return this.recordEvent({ type: 'menu_visited', menuId });
  }

  public syncExternalSystems(emitUnlocks = true): AchievementRecord[] {
    try {
      this.metrics.unlockedCharactersCount = Math.max(
        this.metrics.unlockedCharactersCount,
        characterUnlockManager.getUnlockedIds().length
      );
      const unlockedSkins = characterSkinManager.getUnlockedSkins();
      this.metrics.unlockedSkinsCount = Math.max(
        this.metrics.unlockedSkinsCount,
        unlockedSkins.length
      );
      this.metrics.unlockedWorldsCount = Math.max(
        this.metrics.unlockedWorldsCount,
        worldUnlockManager.getUnlockedIds().length
      );
      const cStats = currencyManager.getSnapshot().stats;
      this.metrics.totalCoinsCollected = Math.max(
        this.metrics.totalCoinsCollected,
        cStats.totalCoinsCollected
      );
      this.metrics.totalCoinsEarned = Math.max(
        this.metrics.totalCoinsEarned,
        cStats.totalCoinsEarned ?? 0
      );
      this.metrics.totalGemsCollected = Math.max(
        this.metrics.totalGemsCollected,
        cStats.totalGemsCollected
      );
      this.metrics.totalGemsEarned = Math.max(
        this.metrics.totalGemsEarned,
        cStats.totalGemsEarned ?? 0
      );
      this.metrics.totalStarsCollected = Math.max(
        this.metrics.totalStarsCollected,
        cStats.totalStarsCollected
      );
      this.metrics.totalPowerUpsCollected = Math.max(
        this.metrics.totalPowerUpsCollected,
        cStats.totalPowerUpsCollected
      );
      this.metrics.shieldSaves = Math.max(
        this.metrics.shieldSaves,
        cStats.shieldSaves
      );
      this.metrics.revivesUsed = Math.max(
        this.metrics.revivesUsed,
        cStats.revivesUsed
      );
      this.metrics.shopPurchases = Math.max(
        this.metrics.shopPurchases,
        cStats.shopPurchases ?? 0
      );
      this.metrics.totalCoinsSpent = Math.max(
        this.metrics.totalCoinsSpent,
        cStats.totalCoinsSpent ?? 0
      );
      this.metrics.totalGemsSpent = Math.max(
        this.metrics.totalGemsSpent,
        cStats.totalGemsSpent ?? 0
      );
      this.metrics.shopItemsOwnedCount = Math.max(
        this.metrics.shopItemsOwnedCount,
        rewardShopManager.getOwnedCount()
      );

      // Daily streak is owned by MissionManager (no duplicate streak system!)
      const mSnap = missionManager.getSnapshot();
      this.metrics.bestStreak = Math.max(
        this.metrics.bestStreak,
        mSnap.streak.bestStreak,
        mSnap.streak.currentStreak
      );
      this.metrics.totalMissionsCompleted = Math.max(
        this.metrics.totalMissionsCompleted,
        mSnap.stats.totalCompleted
      );
    } catch {
      // Safe fallback in isolated tests
    }

    const newlyUnlocked = this.evaluateAll();
    if (newlyUnlocked.length > 0) {
      this.save();
      this.notifyAll(emitUnlocks ? newlyUnlocked : undefined);
    } else {
      this.save();
    }
    return newlyUnlocked;
  }

  public recordEvent(ev: AchievementEvent): AchievementRecord[] {
    const m = this.metrics;

    switch (ev.type) {
      case 'game_started': {
        m.gamesPlayed += 1;
        pushUnique(m.distinctCharactersPlayed, ev.characterId);
        pushUnique(m.distinctSkinsEquipped, ev.skinId);
        pushUnique(m.distinctWorldsPlayed, ev.worldId);
        if (ev.weather) {
          pushUnique(m.distinctWeathersPlayed, ev.weather);
        }
        if (ev.worldId !== 'green_valley') {
          m.nonStarterWorldGames += 1;
        }
        if ((ev.readyWaitSeconds ?? 0) >= 8) {
          m.patientReadyWaitCount += 1;
        }
        const today = getLocalDateKey(Date.now());
        if (m.lastPlayDateKey === today) {
          m.runsTodayCount += 1;
        } else {
          m.lastPlayDateKey = today;
          m.runsTodayCount = 1;
        }
        m.maxRunsInSingleDay = Math.max(m.maxRunsInSingleDay, m.runsTodayCount);
        if (ev.isWeekend) {
          m.weekendRunsCount += 1;
        }
        break;
      }

      case 'pipe_passed': {
        m.totalPipes += Math.max(1, Math.floor(ev.count ?? 1));
        break;
      }

      case 'near_miss': {
        m.nearMissTotal += Math.max(1, Math.floor(ev.count ?? 1));
        m.bestNearMissRun = Math.max(m.bestNearMissRun, Math.floor(ev.inRunTotal));
        break;
      }

      case 'powerup_used': {
        m.totalPowerUpsCollected += 1;
        m.bestPowerUpsRun = Math.max(m.bestPowerUpsRun, Math.floor(ev.inRunCount));
        pushUnique(m.distinctPowerUpsUsed, ev.powerUpId as PowerUpId);
        if (ev.powerUpId === 'slow_motion') {
          m.slowMotionUsedTotal += 1;
        }
        break;
      }

      case 'shield_saved': {
        m.shieldSaves += 1;
        break;
      }

      case 'revive_used': {
        m.revivesUsed += 1;
        break;
      }

      case 'magnet_collect': {
        m.magnetCollectedTotal += Math.max(0, Math.floor(ev.count));
        m.bestMagnetRun = Math.max(m.bestMagnetRun, Math.floor(ev.inRunTotal));
        break;
      }

      case 'coin_collected': {
        m.totalCoinsCollected += Math.max(0, Math.floor(ev.amount));
        break;
      }

      case 'gem_collected': {
        m.totalGemsCollected += Math.max(0, Math.floor(ev.amount));
        break;
      }

      case 'star_collected': {
        m.totalStarsCollected += Math.max(0, Math.floor(ev.amount));
        break;
      }

      case 'score_updated': {
        const s = Math.max(0, Math.floor(ev.score));
        m.bestScore = Math.max(m.bestScore, s);
        if (!ev.usedShield && !ev.usedSecondChance) {
          m.bestPureSkillScore = Math.max(m.bestPureSkillScore, s);
        }
        if (!ev.usedPowerUp) {
          m.bestNoPowerUpScore = Math.max(m.bestNoPowerUpScore, s);
          if (ev.characterId === 'classic_bird' && ev.worldId === 'green_valley') {
            m.bestClassicPureScore = Math.max(m.bestClassicPureScore, s);
          }
        }
        if (ev.coinsInRun === 0) {
          m.bestNoCoinScore = Math.max(m.bestNoCoinScore, s);
        }
        if (ev.isCustomFace) {
          m.bestCustomFaceScore = Math.max(m.bestCustomFaceScore, s);
        }
        if (s >= 25) {
          pushUnique(m.charsScored25, ev.characterId);
          pushUnique(m.worldsScored25, ev.worldId);
        }
        const wDef = WORLD_MAP.get(ev.worldId);
        if (wDef?.isDarkWorld) {
          m.bestDarkWorldScore = Math.max(m.bestDarkWorldScore, s);
        }
        if (ev.nearMissCountInRun >= 3) {
          m.maxRiskScoreRun = Math.max(m.maxRiskScoreRun, s);
        }
        break;
      }

      case 'high_score_updated': {
        if (ev.newBest > ev.previousBest && ev.previousBest > 0) {
          m.highScoreBeats += 1;
        }
        m.bestScore = Math.max(m.bestScore, ev.newBest);
        break;
      }

      case 'game_completed': {
        const s = Math.max(0, Math.floor(ev.score));
        m.totalScore += s;
        m.bestScore = Math.max(m.bestScore, s);
        if (s === 0) {
          m.zeroScoreDeaths += 1;
        }
        if (s === 7) {
          m.exactScore7Count += 1;
        }
        if (s === 77) {
          m.exactScore77Count += 1;
        }
        if (ev.reason === 'ceiling') {
          m.ceilingCollisions += 1;
        } else if (ev.reason === 'ground') {
          m.groundCollisions += 1;
        }
        if (ev.elapsedSeconds >= 45 && s >= 40) {
          m.bestSurvivalCombo = 1;
        }
        if (ev.shieldSavesInRun > 0 && s >= 15) {
          m.shieldSaveTo15Count += 1;
        }
        if (ev.usedSecondChance && ev.scoreAfterRevive >= 15) {
          m.revivePlus15Count += 1;
        }
        if (ev.didPauseAndScore5) {
          m.pauseAndScore5Count += 1;
        }
        if (ev.coinsInRun > 0 && ev.starsInRun > 0 && ev.gemsInRun > 0) {
          m.trifectaRuns += 1;
        }
        if (ev.localHour >= 0 && ev.localHour <= 4) {
          m.nightOwlRuns += 1;
        } else if (ev.localHour >= 5 && ev.localHour <= 6) {
          m.earlyBirdRuns += 1;
        }

        // Track consecutive losses vs comeback kid
        if (s < 5) {
          m.consecutiveLosses += 1;
          m.totalLosses += 1;
        } else {
          m.totalLosses += 1;
          if (m.consecutiveLosses >= 3 && s >= 15) {
            m.comebackKidTriggered += 1;
          }
          m.consecutiveLosses = 0;
        }
        break;
      }

      case 'character_unlocked': {
        m.unlockedCharactersCount = Math.max(m.unlockedCharactersCount, ev.unlockedCount);
        break;
      }

      case 'skin_unlocked': {
        m.unlockedSkinsCount = Math.max(m.unlockedSkinsCount, ev.unlockedCount);
        break;
      }

      case 'skin_equipped': {
        pushUnique(m.distinctSkinsEquipped, ev.skinId);
        break;
      }

      case 'world_unlocked': {
        m.unlockedWorldsCount = Math.max(m.unlockedWorldsCount, ev.unlockedCount);
        break;
      }

      case 'tournament_completed': {
        m.tournamentsPlayed += 1;
        if (ev.won && ev.winner !== 'draw') {
          m.tournamentsWon += 1;
          if (ev.format === 'bo3') m.bo3TournamentsWon += 1;
          if (ev.format === 'bo5') m.bo5TournamentsWon += 1;
          if (ev.cleanSweep) m.cleanSweepTournamentsWon += 1;
          if (ev.comebackWin) m.comebackTournamentsWon += 1;
          m.currentTournamentStreak += 1;
          m.bestTournamentStreak = Math.max(
            m.bestTournamentStreak,
            m.currentTournamentStreak
          );
          if (m.consecutiveLosses >= 3) {
            m.comebackKidTriggered += 1;
          }
          m.consecutiveLosses = 0;
        } else {
          m.currentTournamentStreak = 0;
        }
        break;
      }

      case 'multiplayer_played': {
        m.multiplayerPlayed += 1;
        m.bestCombinedMultiplayerScore = Math.max(
          m.bestCombinedMultiplayerScore,
          Math.max(0, Math.floor(ev.combinedScore))
        );
        if (ev.winner === 'draw') {
          m.multiplayerDraws += 1;
        } else {
          if (ev.format === 'quick') m.quickMatchesWon += 1;
          if (ev.winner === 'player1') m.p1Wins += 1;
          if (ev.winner === 'player2') m.p2Wins += 1;
        }
        break;
      }

      case 'mission_completed': {
        m.totalMissionsCompleted += 1;
        if (ev.category === 'daily') m.dailyMissionsCompleted += 1;
        if (ev.category === 'weekly') m.weeklyMissionsCompleted += 1;
        if (ev.category === 'special') m.specialMissionsCompleted += 1;
        if (ev.perfectDay) m.perfectDaysCount += 1;
        break;
      }

      case 'streak_updated': {
        m.bestStreak = Math.max(m.bestStreak, ev.bestStreak, ev.currentStreak);
        break;
      }

      case 'shop_purchase': {
        m.shopPurchases += 1;
        m.totalCoinsSpent += Math.max(0, Math.floor(ev.coinsSpent));
        m.totalGemsSpent += Math.max(0, Math.floor(ev.gemsSpent));
        m.shopItemsOwnedCount = Math.max(m.shopItemsOwnedCount, ev.totalOwnedCount);
        break;
      }

      case 'menu_visited': {
        pushUnique(m.visitedMenus, ev.menuId);
        break;
      }

      case 'external_sync': {
        break;
      }
    }

    // Keep synced with external authoritative stores safely
    return this.syncExternalSystems(true);
  }

  private evaluateAll(): AchievementRecord[] {
    const newlyUnlocked: AchievementRecord[] = [];
    const now = Date.now();
    const { totalWithoutLegend, hiddenWithoutExplorer } = this.countUnlockedForMeta();

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (this.unlockedState.get(def.id)?.unlocked) continue;
      if (def.id === 'secret_explorer' || def.id === 'the_legend') continue;
      const val = this.computeProgressValue(def, totalWithoutLegend, hiddenWithoutExplorer);
      if (val >= def.requirement) {
        const rec = this.grantUnlock(def, now);
        if (rec) newlyUnlocked.push(rec);
      }
    }

    if (newlyUnlocked.length > 0 || !this.unlockedState.get('secret_explorer')?.unlocked || !this.unlockedState.get('the_legend')?.unlocked) {
      const meta = this.evaluateMetaAchievements(now);
      newlyUnlocked.push(...meta);
    }

    return newlyUnlocked;
  }

  private evaluateMetaAchievements(now: number): AchievementRecord[] {
    const unlockedMeta: AchievementRecord[] = [];
    const { totalWithoutLegend, hiddenWithoutExplorer } = this.countUnlockedForMeta();

    const secretExpDef = ACHIEVEMENT_MAP.get('secret_explorer');
    if (
      secretExpDef &&
      !this.unlockedState.get('secret_explorer')?.unlocked &&
      hiddenWithoutExplorer >= secretExpDef.requirement
    ) {
      const rec = this.grantUnlock(secretExpDef, now);
      if (rec) unlockedMeta.push(rec);
    }

    const updatedCounts = this.countUnlockedForMeta();
    const legendDef = ACHIEVEMENT_MAP.get('the_legend');
    if (
      legendDef &&
      !this.unlockedState.get('the_legend')?.unlocked &&
      Math.max(totalWithoutLegend, updatedCounts.totalWithoutLegend) >= legendDef.requirement
    ) {
      const rec = this.grantUnlock(legendDef, now);
      if (rec) unlockedMeta.push(rec);
    }

    return unlockedMeta;
  }

  private grantUnlock(def: AchievementDefinition, now: number): AchievementRecord | null {
    const existing = this.unlockedState.get(def.id);
    if (existing?.unlocked) return null;

    this.unlockedState.set(def.id, { unlocked: true, unlockedAt: now });

    // Idempotent atomic reward payout
    currencyManager.awardEventOnce(`ach_${def.id}`, def.rewardCoins, def.rewardGems);
    playerProgressionManager.recordAchievementXP(def.id, def.name, def.rewardXP);

    if (def.titleId) {
      playerProgressionManager.unlockTitle(def.titleId, 'solo');
    }
    if (def.frameId) {
      missionManager.grantFrameExternal(def.frameId);
      playerProgressionManager.unlockFrame(def.frameId, 'solo');
    }
    if (def.skinId) {
      characterSkinManager.unlockMilestoneSkin(def.skinId, 'achievement');
    }

    const histEntry: AchievementHistoryEntry = {
      achievementId: def.id,
      name: def.name,
      rarity: def.rarity,
      category: def.category,
      hidden: def.hidden,
      unlockedAt: now,
      points: def.points,
      coins: def.rewardCoins,
      gems: def.rewardGems,
      xp: def.rewardXP,
      badgeId: def.badgeId,
      titleId: def.titleId,
    };
    this.history = [
      histEntry,
      ...this.history.filter((h) => h.achievementId !== def.id),
    ].slice(0, MAX_HISTORY_ENTRIES);

    // Auto-fill up to 3 Showcase slots initially if showcase is empty and high rarity
    if (this.showcaseIds.length < MAX_SHOWCASE_SLOTS && !this.showcaseIds.includes(def.id)) {
      this.showcaseIds.push(def.id);
    }

    return {
      ...def,
      unlocked: true,
      unlockedAt: now,
      progress: def.requirement,
    };
  }

  public reset(): void {
    this.unlockedState.clear();
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      this.unlockedState.set(def.id, { unlocked: false, unlockedAt: null });
    }
    this.metrics = defaultMetrics();
    this.history = [];
    this.showcaseIds = [];
    this.save();
    this.notifyAll();
  }

  private notifyAll(newlyUnlocked?: AchievementRecord[]): void {
    const records = this.getAll();
    for (const listener of this.listeners) {
      listener(records);
    }
    if (this.snapshotListeners.size > 0) {
      const snap = this.getSnapshot();
      for (const listener of this.snapshotListeners) {
        listener(snap);
      }
    }
    if (newlyUnlocked && newlyUnlocked.length > 0) {
      for (const listener of this.unlockQueueListeners) {
        listener(newlyUnlocked);
      }
    }
  }

  private load(): void {
    this.unlockedState.clear();
    this.metrics = defaultMetrics();
    this.history = [];
    this.showcaseIds = [];

    let storedMap: Record<string, StoredAchievementEntry> = {};
    let parsedPayload: Partial<StoredAchievementPayload> | null = null;

    try {
      const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | Partial<StoredAchievementPayload>
          | Record<string, StoredAchievementEntry>;
        if (parsed && typeof parsed === 'object') {
          if ('records' in parsed && parsed.records && typeof parsed.records === 'object') {
            storedMap = parsed.records as Record<string, StoredAchievementEntry>;
            parsedPayload = parsed as Partial<StoredAchievementPayload>;
          } else {
            storedMap = parsed as Record<string, StoredAchievementEntry>;
          }
        }
      }
    } catch {
      storedMap = {};
      parsedPayload = null;
    }

    // Hydrate achievements (supports seamless v1 -> v2 migration without duplicate payouts)
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const saved = storedMap[def.id];
      const unlocked = Boolean(saved?.unlocked);
      const unlockedAt =
        unlocked && typeof saved?.unlockedAt === 'number' && Number.isFinite(saved.unlockedAt)
          ? saved.unlockedAt
          : unlocked
            ? Date.now()
            : null;
      this.unlockedState.set(def.id, { unlocked, unlockedAt });
    }

    // Hydrate metrics
    const mRaw = parsedPayload?.metrics;
    if (mRaw && typeof mRaw === 'object') {
      const d = this.metrics;
      d.gamesPlayed = safeNonNeg(mRaw.gamesPlayed);
      d.totalPipes = safeNonNeg(mRaw.totalPipes);
      d.totalScore = safeNonNeg(mRaw.totalScore);
      d.bestScore = safeNonNeg(mRaw.bestScore);
      d.totalLosses = safeNonNeg(mRaw.totalLosses);
      d.highScoreBeats = safeNonNeg(mRaw.highScoreBeats);
      d.ceilingCollisions = safeNonNeg(mRaw.ceilingCollisions);
      d.groundCollisions = safeNonNeg(mRaw.groundCollisions);
      d.bestSurvivalCombo = safeNonNeg(mRaw.bestSurvivalCombo);

      d.nearMissTotal = safeNonNeg(mRaw.nearMissTotal);
      d.bestNearMissRun = safeNonNeg(mRaw.bestNearMissRun);
      d.maxRiskScoreRun = safeNonNeg(mRaw.maxRiskScoreRun);
      d.bestPureSkillScore = safeNonNeg(mRaw.bestPureSkillScore);
      d.bestNoPowerUpScore = safeNonNeg(mRaw.bestNoPowerUpScore);
      d.bestNoCoinScore = safeNonNeg(mRaw.bestNoCoinScore);
      d.bestClassicPureScore = safeNonNeg(mRaw.bestClassicPureScore);
      d.pauseAndScore5Count = safeNonNeg(mRaw.pauseAndScore5Count);
      d.patientReadyWaitCount = safeNonNeg(mRaw.patientReadyWaitCount);

      d.totalCoinsCollected = safeNonNeg(mRaw.totalCoinsCollected);
      d.totalCoinsEarned = safeNonNeg(mRaw.totalCoinsEarned);
      d.totalGemsCollected = safeNonNeg(mRaw.totalGemsCollected);
      d.totalGemsEarned = safeNonNeg(mRaw.totalGemsEarned);
      d.totalStarsCollected = safeNonNeg(mRaw.totalStarsCollected);
      d.totalCoinsSpent = safeNonNeg(mRaw.totalCoinsSpent);
      d.totalGemsSpent = safeNonNeg(mRaw.totalGemsSpent);
      d.shopPurchases = safeNonNeg(mRaw.shopPurchases);
      d.shopItemsOwnedCount = safeNonNeg(mRaw.shopItemsOwnedCount);
      d.trifectaRuns = safeNonNeg(mRaw.trifectaRuns);

      d.unlockedCharactersCount = Math.max(2, safeNonNeg(mRaw.unlockedCharactersCount, 2));
      d.unlockedSkinsCount = Math.max(1, safeNonNeg(mRaw.unlockedSkinsCount, 1));
      d.distinctCharactersPlayed = sanitizeStringArray(mRaw.distinctCharactersPlayed);
      d.charsScored25 = sanitizeStringArray(mRaw.charsScored25);
      d.distinctSkinsEquipped = sanitizeStringArray(mRaw.distinctSkinsEquipped);
      d.bestCustomFaceScore = safeNonNeg(mRaw.bestCustomFaceScore);

      d.unlockedWorldsCount = Math.max(1, safeNonNeg(mRaw.unlockedWorldsCount, 1));
      d.nonStarterWorldGames = safeNonNeg(mRaw.nonStarterWorldGames);
      d.distinctWorldsPlayed = sanitizeStringArray(mRaw.distinctWorldsPlayed);
      d.worldsScored25 = sanitizeStringArray(mRaw.worldsScored25);
      d.distinctWeathersPlayed = sanitizeStringArray(mRaw.distinctWeathersPlayed);
      d.bestDarkWorldScore = safeNonNeg(mRaw.bestDarkWorldScore);

      d.totalPowerUpsCollected = safeNonNeg(mRaw.totalPowerUpsCollected);
      d.bestPowerUpsRun = safeNonNeg(mRaw.bestPowerUpsRun);
      d.shieldSaves = safeNonNeg(mRaw.shieldSaves);
      d.revivesUsed = safeNonNeg(mRaw.revivesUsed);
      d.magnetCollectedTotal = safeNonNeg(mRaw.magnetCollectedTotal);
      d.bestMagnetRun = safeNonNeg(mRaw.bestMagnetRun);
      d.slowMotionUsedTotal = safeNonNeg(mRaw.slowMotionUsedTotal);
      d.distinctPowerUpsUsed = sanitizeStringArray<PowerUpId>(mRaw.distinctPowerUpsUsed);
      d.shieldSaveTo15Count = safeNonNeg(mRaw.shieldSaveTo15Count);
      d.revivePlus15Count = safeNonNeg(mRaw.revivePlus15Count);

      d.totalMissionsCompleted = safeNonNeg(mRaw.totalMissionsCompleted);
      d.dailyMissionsCompleted = safeNonNeg(mRaw.dailyMissionsCompleted);
      d.weeklyMissionsCompleted = safeNonNeg(mRaw.weeklyMissionsCompleted);
      d.specialMissionsCompleted = safeNonNeg(mRaw.specialMissionsCompleted);
      d.perfectDaysCount = safeNonNeg(mRaw.perfectDaysCount);
      d.bestStreak = safeNonNeg(mRaw.bestStreak);

      d.tournamentsPlayed = safeNonNeg(mRaw.tournamentsPlayed);
      d.tournamentsWon = safeNonNeg(mRaw.tournamentsWon);
      d.bo3TournamentsWon = safeNonNeg(mRaw.bo3TournamentsWon);
      d.bo5TournamentsWon = safeNonNeg(mRaw.bo5TournamentsWon);
      d.cleanSweepTournamentsWon = safeNonNeg(mRaw.cleanSweepTournamentsWon);
      d.comebackTournamentsWon = safeNonNeg(mRaw.comebackTournamentsWon);
      d.currentTournamentStreak = safeNonNeg(mRaw.currentTournamentStreak);
      d.bestTournamentStreak = safeNonNeg(mRaw.bestTournamentStreak);
      d.multiplayerPlayed = safeNonNeg(mRaw.multiplayerPlayed);
      d.quickMatchesWon = safeNonNeg(mRaw.quickMatchesWon);
      d.p1Wins = safeNonNeg(mRaw.p1Wins);
      d.p2Wins = safeNonNeg(mRaw.p2Wins);
      d.multiplayerDraws = safeNonNeg(mRaw.multiplayerDraws);
      d.bestCombinedMultiplayerScore = safeNonNeg(mRaw.bestCombinedMultiplayerScore);

      d.zeroScoreDeaths = safeNonNeg(mRaw.zeroScoreDeaths);
      d.exactScore7Count = safeNonNeg(mRaw.exactScore7Count);
      d.exactScore77Count = safeNonNeg(mRaw.exactScore77Count);
      d.nightOwlRuns = safeNonNeg(mRaw.nightOwlRuns);
      d.earlyBirdRuns = safeNonNeg(mRaw.earlyBirdRuns);
      d.consecutiveLosses = safeNonNeg(mRaw.consecutiveLosses);
      d.comebackKidTriggered = safeNonNeg(mRaw.comebackKidTriggered);
      d.visitedMenus = sanitizeStringArray(mRaw.visitedMenus);
      d.lastPlayDateKey = typeof mRaw.lastPlayDateKey === 'string' ? mRaw.lastPlayDateKey : '';
      d.runsTodayCount = safeNonNeg(mRaw.runsTodayCount);
      d.maxRunsInSingleDay = safeNonNeg(mRaw.maxRunsInSingleDay);
      d.weekendRunsCount = safeNonNeg(mRaw.weekendRunsCount);
    }

    // Hydrate history (backfill from unlocked v1 saves if history absent)
    if (Array.isArray(parsedPayload?.history)) {
      this.history = parsedPayload.history
        .filter(
          (h): h is AchievementHistoryEntry =>
            Boolean(h && typeof h.achievementId === 'string' && ACHIEVEMENT_MAP.has(h.achievementId))
        )
        .slice(0, MAX_HISTORY_ENTRIES);
    } else {
      const migratedHistory: AchievementHistoryEntry[] = [];
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        const st = this.unlockedState.get(def.id);
        if (st?.unlocked) {
          migratedHistory.push({
            achievementId: def.id,
            name: def.name,
            rarity: def.rarity,
            category: def.category,
            hidden: def.hidden,
            unlockedAt: st.unlockedAt ?? Date.now(),
            points: def.points,
            coins: def.rewardCoins,
            gems: def.rewardGems,
            xp: def.rewardXP,
            badgeId: def.badgeId,
            titleId: def.titleId,
          });
        }
      }
      migratedHistory.sort((a, b) => b.unlockedAt - a.unlockedAt);
      this.history = migratedHistory.slice(0, MAX_HISTORY_ENTRIES);
    }

    // Hydrate showcase IDs (strictly unlocked)
    if (Array.isArray(parsedPayload?.showcaseIds)) {
      const valid: string[] = [];
      for (const id of parsedPayload.showcaseIds) {
        if (
          typeof id === 'string' &&
          !valid.includes(id) &&
          this.unlockedState.get(id)?.unlocked &&
          ACHIEVEMENT_MAP.has(id)
        ) {
          valid.push(id);
          if (valid.length >= MAX_SHOWCASE_SLOTS) break;
        }
      }
      this.showcaseIds = valid;
    } else {
      // Auto-populate up to 3 showcase slots on v1 upgrade
      this.showcaseIds = this.history
        .slice(0, MAX_SHOWCASE_SLOTS)
        .map((h) => h.achievementId);
    }
  }

  private save(): void {
    try {
      const records: Record<string, StoredAchievementEntry> = {};
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        const st = this.unlockedState.get(def.id);
        records[def.id] = {
          unlocked: Boolean(st?.unlocked),
          unlockedAt: st?.unlocked ? st.unlockedAt : null,
        };
      }
      const payload: StoredAchievementPayload = {
        version: ACHIEVEMENTS_STORAGE_VERSION,
        records,
        metrics: this.metrics,
        history: this.history,
        showcaseIds: this.showcaseIds,
      };
      window.localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage errors
    }
  }
}

export const achievementManager = new AchievementManager();
