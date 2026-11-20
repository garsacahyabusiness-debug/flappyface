import { CharacterMetrics } from '../character/CharacterUnlockManager';
import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import {
  getWorldById,
  WeatherType,
  WORLD_MAP,
  WORLD_REGISTRY,
  WorldDefinition,
  WorldId,
} from './WorldRegistry';

export interface WorldProgressInfo {
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
}

export interface WorldMilestone {
  id: 'w2' | 'w4' | 'w6' | 'w8';
  worldsRequired: number;
  title: string;
  rewardLabel: string;
  unlocked: boolean;
}

export interface WorldCollectionSummary {
  unlockedCount: number;
  totalCount: number;
  percent: number;
  milestones: WorldMilestone[];
  hasTrailReward: boolean;
  hasEnvEffectReward: boolean;
  hasSkinReward: boolean;
  hasWorldExplorerBadge: boolean;
}

interface StoredWorldUnlockRecord {
  unlockedAt: number;
}

interface StoredWorldsPayload {
  version: number;
  unlocks: Partial<Record<WorldId, StoredWorldUnlockRecord>>;
  selectedWorldId: WorldId;
  weatherByWorld: Partial<Record<WorldId, WeatherType | 'auto'>>;
}

const WORLDS_STORAGE_KEY = 'flappy_face_worlds';
const WORLDS_STORAGE_VERSION = 1;

export class WorldUnlockManager {
  private unlockedMap: Partial<Record<WorldId, StoredWorldUnlockRecord>> = {};
  private selectedWorldId: WorldId = 'green_valley';
  private weatherByWorld: Partial<Record<WorldId, WeatherType | 'auto'>> = {};
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
    this.ensureStarterUnlocks();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isUnlocked(worldId: WorldId): boolean {
    return Boolean(this.unlockedMap[worldId]);
  }

  public getUnlockTimestamp(worldId: WorldId): number | null {
    return this.unlockedMap[worldId]?.unlockedAt ?? null;
  }

  public getUnlockedIds(): WorldId[] {
    return WORLD_REGISTRY.map((w) => w.id).filter((id) => this.isUnlocked(id));
  }

  public getSelectedWorldId(): WorldId {
    return this.isUnlocked(this.selectedWorldId) ? this.selectedWorldId : 'green_valley';
  }

  public getSelectedWorld(): WorldDefinition {
    return getWorldById(this.getSelectedWorldId());
  }

  public canPlayWorld(worldId: WorldId): boolean {
    return WORLD_MAP.has(worldId) && this.isUnlocked(worldId);
  }

  public selectWorld(worldId: WorldId): boolean {
    if (!this.canPlayWorld(worldId)) {
      return false;
    }
    this.selectedWorldId = worldId;
    this.save();
    this.notify();
    return true;
  }

  public getWeatherChoice(worldId: WorldId = this.getSelectedWorldId()): WeatherType | 'auto' {
    const def = getWorldById(worldId);
    const stored = this.weatherByWorld[def.id];
    if (stored === 'auto') return 'auto';
    if (stored && def.compatibleWeathers.includes(stored)) {
      return stored;
    }
    return 'auto';
  }

  public getEffectiveWeather(
    worldId: WorldId = this.getSelectedWorldId(),
    weatherEnabled = true
  ): WeatherType | null {
    if (!weatherEnabled) return null;
    const def = getWorldById(worldId);
    const choice = this.getWeatherChoice(def.id);
    if (choice === 'auto') return def.defaultWeather;
    return choice;
  }

  public setWeatherForWorld(worldId: WorldId, weather: WeatherType | 'auto'): boolean {
    if (!WORLD_MAP.has(worldId)) return false;
    const def = getWorldById(worldId);
    if (weather !== 'auto' && !def.compatibleWeathers.includes(weather)) {
      return false;
    }
    this.weatherByWorld[worldId] = weather;
    this.save();
    this.notify();
    return true;
  }

  public getProgressForWorld(
    def: WorldDefinition,
    metrics: CharacterMetrics
  ): WorldProgressInfo {
    const unlocked = this.isUnlocked(def.id);
    const { type, target } = def.unlockCondition;
    let current = 0;

    switch (type) {
      case 'starter':
        current = 1;
        break;
      case 'best_score':
        current = Math.max(0, Math.floor(metrics.bestScore));
        break;
      case 'games_played':
        current = Math.max(0, Math.floor(metrics.totalGamesPlayed));
        break;
      case 'tournaments_won':
        current = Math.max(0, Math.floor(metrics.tournamentsWon));
        break;
      case 'all_achievements':
        current = Math.max(0, Math.floor(metrics.unlockedAchievements));
        break;
    }

    const effectiveTarget =
      type === 'all_achievements'
        ? Math.max(1, metrics.totalAchievements || target)
        : Math.max(1, target);
    const clampedCurrent = unlocked ? effectiveTarget : Math.min(effectiveTarget, current);
    const percent = Math.min(100, Math.round((clampedCurrent / effectiveTarget) * 100));

    return {
      current: clampedCurrent,
      target: effectiveTarget,
      percent,
      unlocked,
    };
  }

  /**
   * Evaluates all 8 worlds against real gameplay metrics.
   * Emits ONLY newly unlocked worlds once (no duplicates).
   */
  public evaluateProgress(metrics: CharacterMetrics): WorldDefinition[] {
    const now = Date.now();
    const newlyUnlocked: WorldDefinition[] = [];

    for (const def of WORLD_REGISTRY) {
      if (this.unlockedMap[def.id]) continue;

      const { type, target } = def.unlockCondition;
      let met = false;

      switch (type) {
        case 'starter':
          met = true;
          break;
        case 'best_score':
          met = metrics.bestScore >= target;
          break;
        case 'games_played':
          met = metrics.totalGamesPlayed >= target;
          break;
        case 'tournaments_won':
          met = metrics.tournamentsWon >= target;
          break;
        case 'all_achievements': {
          const total = Math.max(1, metrics.totalAchievements || target);
          met = metrics.unlockedAchievements >= total;
          break;
        }
      }

      if (met) {
        this.unlockedMap[def.id] = { unlockedAt: now };
        newlyUnlocked.push(def);
        if (def.unlockCondition.type !== 'starter') {
          playerProgressionManager.recordWorldUnlockXP(def.id, def.name);
        }
      }
    }

    if (this.getCollectionSummary().hasEnvEffectReward) {
      playerProgressionManager.unlockTitle('world_traveler', 'solo');
    }

    if (newlyUnlocked.length > 0) {
      this.save();
      this.notify();
    }

    return newlyUnlocked;
  }

  public getCollectionSummary(): WorldCollectionSummary {
    const totalCount = WORLD_REGISTRY.length;
    let unlockedCount = 0;
    for (const def of WORLD_REGISTRY) {
      if (this.isUnlocked(def.id)) {
        unlockedCount += 1;
      }
    }
    const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    const milestones: WorldMilestone[] = [
      {
        id: 'w2',
        worldsRequired: 2,
        title: '2 WORLDS UNLOCKED',
        rewardLabel: 'Neon Trail Milestone',
        unlocked: unlockedCount >= 2,
      },
      {
        id: 'w4',
        worldsRequired: 4,
        title: '4 WORLDS UNLOCKED',
        rewardLabel: 'Enhanced Environment Glow',
        unlocked: unlockedCount >= 4,
      },
      {
        id: 'w6',
        worldsRequired: 6,
        title: '6 WORLDS UNLOCKED',
        rewardLabel: 'Golden Wing Skin Reward',
        unlocked: unlockedCount >= 6,
      },
      {
        id: 'w8',
        worldsRequired: 8,
        title: 'ALL 8 WORLDS',
        rewardLabel: 'WORLD EXPLORER Badge',
        unlocked: unlockedCount >= 8,
      },
    ];

    return {
      unlockedCount,
      totalCount,
      percent,
      milestones,
      hasTrailReward: unlockedCount >= 2,
      hasEnvEffectReward: unlockedCount >= 4,
      hasSkinReward: unlockedCount >= 6,
      hasWorldExplorerBadge: unlockedCount >= 8,
    };
  }

  public reset(): void {
    this.unlockedMap = {};
    this.selectedWorldId = 'green_valley';
    this.weatherByWorld = {};
    this.ensureStarterUnlocks(false);
    this.save();
    this.notify();
  }

  private ensureStarterUnlocks(saveIfChanged = true): void {
    let changed = false;
    const now = Date.now();
    for (const def of WORLD_REGISTRY) {
      if (def.unlockCondition.type === 'starter' && !this.unlockedMap[def.id]) {
        this.unlockedMap[def.id] = { unlockedAt: now };
        changed = true;
      }
    }
    if (!this.isUnlocked(this.selectedWorldId)) {
      this.selectedWorldId = 'green_valley';
      changed = true;
    }
    if (changed && saveIfChanged) {
      this.save();
    }
  }

  private notify(): void {
    for (const l of this.listeners) {
      l();
    }
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(WORLDS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredWorldsPayload>;
      if (!parsed || typeof parsed !== 'object') return;

      const cleanUnlocks: Partial<Record<WorldId, StoredWorldUnlockRecord>> = {};
      if (parsed.unlocks && typeof parsed.unlocks === 'object') {
        for (const [id, rec] of Object.entries(parsed.unlocks)) {
          if (!WORLD_MAP.has(id as WorldId) || !rec || typeof rec !== 'object') continue;
          const ts =
            typeof rec.unlockedAt === 'number' && Number.isFinite(rec.unlockedAt)
              ? rec.unlockedAt
              : Date.now();
          cleanUnlocks[id as WorldId] = { unlockedAt: ts };
        }
      }
      this.unlockedMap = cleanUnlocks;

      const sel = parsed.selectedWorldId;
      this.selectedWorldId =
        typeof sel === 'string' && WORLD_MAP.has(sel as WorldId) && cleanUnlocks[sel as WorldId]
          ? (sel as WorldId)
          : 'green_valley';

      const cleanWeather: Partial<Record<WorldId, WeatherType | 'auto'>> = {};
      if (parsed.weatherByWorld && typeof parsed.weatherByWorld === 'object') {
        for (const [id, w] of Object.entries(parsed.weatherByWorld)) {
          if (!WORLD_MAP.has(id as WorldId)) continue;
          const def = getWorldById(id);
          if (w === 'auto' || (typeof w === 'string' && def.compatibleWeathers.includes(w as WeatherType))) {
            cleanWeather[id as WorldId] = w as WeatherType | 'auto';
          }
        }
      }
      this.weatherByWorld = cleanWeather;
    } catch {
      this.unlockedMap = {};
      this.selectedWorldId = 'green_valley';
      this.weatherByWorld = {};
    }
  }

  private save(): void {
    try {
      const payload: StoredWorldsPayload = {
        version: WORLDS_STORAGE_VERSION,
        unlocks: this.unlockedMap,
        selectedWorldId: this.getSelectedWorldId(),
        weatherByWorld: this.weatherByWorld,
      };
      window.localStorage.setItem(WORLDS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures in restricted mode
    }
  }
}

export const worldUnlockManager = new WorldUnlockManager();
