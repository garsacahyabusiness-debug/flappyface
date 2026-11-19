export type AchievementIconName =
  | 'feather'
  | 'award'
  | 'trophy'
  | 'flame'
  | 'crown'
  | 'sparkles';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  requirement: number;
  icon: AchievementIconName;
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
    icon: 'feather',
  },
  {
    id: 'rookie',
    name: 'ROOKIE',
    description: 'You passed 5 pipes in one flight!',
    requirement: 5,
    icon: 'award',
  },
  {
    id: 'pro_flyer',
    name: 'PRO FLYER',
    description: 'You reached 10 points!',
    requirement: 10,
    icon: 'trophy',
  },
  {
    id: 'impossible',
    name: 'IMPOSSIBLE',
    description: 'You reached 25 points!',
    requirement: 25,
    icon: 'flame',
  },
  {
    id: 'sky_master',
    name: 'SKY MASTER',
    description: 'You reached 50 points!',
    requirement: 50,
    icon: 'crown',
  },
  {
    id: 'legend',
    name: 'LEGEND',
    description: 'You reached 100 points!',
    requirement: 100,
    icon: 'sparkles',
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
      (r) => r.unlocked || safeBest >= r.requirement
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
   * Checks the player's score against all locked achievements.
   * Returns ONLY newly unlocked achievements in this check.
   */
  public checkScore(score: number): AchievementRecord[] {
    const safeScore = Math.max(0, Math.floor(score));
    const newlyUnlocked: AchievementRecord[] = [];
    const now = Date.now();

    for (const rec of this.records) {
      if (!rec.unlocked && safeScore >= rec.requirement) {
        rec.unlocked = true;
        rec.unlockedAt = now;
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
