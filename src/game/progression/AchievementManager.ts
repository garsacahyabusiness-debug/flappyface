import { currencyManager, PowerUpCurrencyStats } from '../powerups/CurrencyManager';

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
  | 'star';

export type AchievementRequirementType =
  | 'score'
  | 'shield_saves'
  | 'revives'
  | 'coins'
  | 'gems'
  | 'powerups_total'
  | 'powerups_run';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  requirement: number;
  requirementType: AchievementRequirementType;
  icon: AchievementIconName;
  rewardCoins: number;
  rewardGems: number;
}

export interface AchievementRecord extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: number | null;
}

interface StoredAchievementState {
  unlocked: boolean;
  unlockedAt: number | null;
}

const ACHIEVEMENTS_STORAGE_KEY = 'flappy_face_achievements';
const ACHIEVEMENTS_STORAGE_VERSION = 1;

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first_flight',
    name: 'FIRST FLIGHT',
    description: 'You scored your very first point!',
    requirement: 1,
    requirementType: 'score',
    icon: 'feather',
    rewardCoins: 5,
    rewardGems: 0,
  },
  {
    id: 'rookie',
    name: 'ROOKIE',
    description: 'You passed 5 pipes in one flight!',
    requirement: 5,
    requirementType: 'score',
    icon: 'award',
    rewardCoins: 10,
    rewardGems: 0,
  },
  {
    id: 'pro_flyer',
    name: 'PRO FLYER',
    description: 'You reached 10 points!',
    requirement: 10,
    requirementType: 'score',
    icon: 'trophy',
    rewardCoins: 15,
    rewardGems: 0,
  },
  {
    id: 'impossible',
    name: 'IMPOSSIBLE',
    description: 'You reached 25 points!',
    requirement: 25,
    requirementType: 'score',
    icon: 'flame',
    rewardCoins: 25,
    rewardGems: 1,
  },
  {
    id: 'sky_master',
    name: 'SKY MASTER',
    description: 'You reached 50 points!',
    requirement: 50,
    requirementType: 'score',
    icon: 'crown',
    rewardCoins: 40,
    rewardGems: 2,
  },
  {
    id: 'legend',
    name: 'LEGEND',
    description: 'You reached 100 points!',
    requirement: 100,
    requirementType: 'score',
    icon: 'sparkles',
    rewardCoins: 75,
    rewardGems: 3,
  },
  {
    id: 'shield_savior',
    name: 'SHIELD SAVIOR',
    description: 'Avoid 3 collisions using Shield!',
    requirement: 3,
    requirementType: 'shield_saves',
    icon: 'shield',
    rewardCoins: 20,
    rewardGems: 1,
  },
  {
    id: 'second_chance_master',
    name: 'SECOND CHANCE',
    description: 'Revive 3 times during flights!',
    requirement: 3,
    requirementType: 'revives',
    icon: 'heart',
    rewardCoins: 25,
    rewardGems: 1,
  },
  {
    id: 'coin_collector',
    name: 'COIN COLLECTOR',
    description: 'Collect 100 Coins in total!',
    requirement: 100,
    requirementType: 'coins',
    icon: 'coins',
    rewardCoins: 30,
    rewardGems: 1,
  },
  {
    id: 'gem_hunter',
    name: 'GEM HUNTER',
    description: 'Collect 10 Gems in total!',
    requirement: 10,
    requirementType: 'gems',
    icon: 'gem',
    rewardCoins: 40,
    rewardGems: 2,
  },
  {
    id: 'power_user',
    name: 'POWER USER',
    description: 'Collect 20 Power-Ups in total!',
    requirement: 20,
    requirementType: 'powerups_total',
    icon: 'zap',
    rewardCoins: 35,
    rewardGems: 1,
  },
  {
    id: 'lucky_flyer',
    name: 'LUCKY FLYER',
    description: 'Collect 3 Power-Ups in one flight!',
    requirement: 3,
    requirementType: 'powerups_run',
    icon: 'star',
    rewardCoins: 25,
    rewardGems: 1,
  },
];

export class AchievementManager {
  private records: AchievementRecord[];
  private listeners = new Set<(records: AchievementRecord[]) => void>();

  constructor() {
    this.records = this.load();
  }

  public getAll(): AchievementRecord[] {
    return this.records.map((r) => ({ ...r }));
  }

  public getUnlockedCount(): number {
    return this.records.filter((r) => r.unlocked).length;
  }

  public getTotalCount(): number {
    return this.records.length;
  }

  public getHighestMilestoneName(bestScore: number): string {
    const safeBest = Math.max(0, Math.floor(bestScore));
    const unlockedByOrder = this.records.filter(
      (r) => r.requirementType === 'score' && (r.unlocked || safeBest >= r.requirement)
    );
    if (unlockedByOrder.length === 0) {
      return 'BEGINNER';
    }
    return unlockedByOrder[unlockedByOrder.length - 1].name;
  }

  public subscribe(listener: (records: AchievementRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAll());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Checks the player's score against all locked score achievements.
   * Returns ONLY newly unlocked achievements in this check.
   */
  public checkScore(score: number): AchievementRecord[] {
    const safeScore = Math.max(0, Math.floor(score));
    const newlyUnlocked: AchievementRecord[] = [];
    const now = Date.now();

    for (const rec of this.records) {
      if (
        rec.requirementType === 'score' &&
        !rec.unlocked &&
        safeScore >= rec.requirement
      ) {
        rec.unlocked = true;
        rec.unlockedAt = now;
        currencyManager.awardEventOnce(
          `ach_${rec.id}`,
          rec.rewardCoins,
          rec.rewardGems
        );
        newlyUnlocked.push({ ...rec });
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save();
      this.notify();
    }

    return newlyUnlocked;
  }

  /**
   * Checks Power-Up & Collectible progression metrics without duplicating unlocks.
   */
  public checkPowerUpMetrics(
    stats: PowerUpCurrencyStats,
    runPowerUpsCollected = 0
  ): AchievementRecord[] {
    const newlyUnlocked: AchievementRecord[] = [];
    const now = Date.now();

    for (const rec of this.records) {
      if (rec.unlocked || rec.requirementType === 'score') continue;

      let value = 0;
      switch (rec.requirementType) {
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

      if (value >= rec.requirement) {
        rec.unlocked = true;
        rec.unlockedAt = now;
        currencyManager.awardEventOnce(
          `ach_${rec.id}`,
          rec.rewardCoins,
          rec.rewardGems
        );
        newlyUnlocked.push({ ...rec });
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save();
      this.notify();
    }

    return newlyUnlocked;
  }

  public reset(): void {
    this.records = ACHIEVEMENT_DEFINITIONS.map((def) => ({
      ...def,
      unlocked: false,
      unlockedAt: null,
    }));
    this.save();
    this.notify();
  }

  private notify(): void {
    const snap = this.getAll();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private load(): AchievementRecord[] {
    let storedMap: Record<string, StoredAchievementState> = {};
    try {
      const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | { version?: number; records?: Record<string, StoredAchievementState> }
          | Record<string, StoredAchievementState>;
        if (parsed && typeof parsed === 'object') {
          if (
            'records' in parsed &&
            parsed.records &&
            typeof parsed.records === 'object'
          ) {
            storedMap = parsed.records as Record<string, StoredAchievementState>;
          } else {
            storedMap = parsed as Record<string, StoredAchievementState>;
          }
        }
      }
    } catch {
      storedMap = {};
    }

    return ACHIEVEMENT_DEFINITIONS.map((def) => {
      const saved = storedMap[def.id];
      const unlocked = Boolean(saved?.unlocked);
      const unlockedAt =
        unlocked && typeof saved?.unlockedAt === 'number' && Number.isFinite(saved.unlockedAt)
          ? saved.unlockedAt
          : null;
      return {
        ...def,
        unlocked,
        unlockedAt,
      };
    });
  }

  private save(): void {
    try {
      const records: Record<string, StoredAchievementState> = {};
      for (const rec of this.records) {
        records[rec.id] = {
          unlocked: rec.unlocked,
          unlockedAt: rec.unlockedAt,
        };
      }
      window.localStorage.setItem(
        ACHIEVEMENTS_STORAGE_KEY,
        JSON.stringify({ version: ACHIEVEMENTS_STORAGE_VERSION, records })
      );
    } catch {
      // Ignore storage failures in restricted mode
    }
  }
}

export const achievementManager = new AchievementManager();
