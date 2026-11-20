import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import {
  CHARACTER_MAP,
  CHARACTER_REGISTRY,
  CharacterDefinition,
  CharacterRarity,
  RARITY_ORDER,
} from './CharacterRegistry';
import { characterSkinManager } from './CharacterSkinManager';
import { CharacterSlot } from './CharacterStorage';

export type CharacterSelectionMode = 'character' | 'custom_face';

export interface CharacterMetrics {
  bestScore: number;
  totalGamesPlayed: number;
  tournamentsWon: number;
  bestWinStreak: number;
  unlockedAchievements: number;
  totalAchievements: number;
}

export interface CharacterProgressInfo {
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
}

export interface CollectionMilestone {
  id: 'm25' | 'm50' | 'm75' | 'm100';
  percentRequired: number;
  title: string;
  rewardLabel: string;
  unlocked: boolean;
}

export interface CollectionSummary {
  unlockedCount: number;
  totalCount: number;
  percent: number;
  byRarity: Record<CharacterRarity, { unlocked: number; total: number }>;
  milestones: CollectionMilestone[];
  hasSpecialBackground: boolean;
  hasLegendTitle: boolean;
}

export interface SlotCharacterSelection {
  mode: CharacterSelectionMode;
  characterId: string;
}

interface StoredUnlockRecord {
  unlockedAt: number;
}

interface StoredCollectionPayload {
  version: number;
  unlocks: Record<string, StoredUnlockRecord>;
  selectionBySlot: Record<CharacterSlot, SlotCharacterSelection>;
}

const COLLECTION_STORAGE_KEY = 'flappy_face_collection_unlocks';
const COLLECTION_STORAGE_VERSION = 1;

const DEFAULT_SELECTION_BY_SLOT: Record<CharacterSlot, SlotCharacterSelection> = {
  default: { mode: 'character', characterId: 'classic_bird' },
  player1: { mode: 'character', characterId: 'classic_bird' },
  player2: { mode: 'character', characterId: 'chicky' },
};

export class CharacterUnlockManager {
  private unlockedMap: Record<string, StoredUnlockRecord> = {};
  private selectionBySlot: Record<CharacterSlot, SlotCharacterSelection> = {
    default: { ...DEFAULT_SELECTION_BY_SLOT.default },
    player1: { ...DEFAULT_SELECTION_BY_SLOT.player1 },
    player2: { ...DEFAULT_SELECTION_BY_SLOT.player2 },
  };
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

  public isUnlocked(characterId: string): boolean {
    return Boolean(this.unlockedMap[characterId]);
  }

  public getUnlockTimestamp(characterId: string): number | null {
    return this.unlockedMap[characterId]?.unlockedAt ?? null;
  }

  public getUnlockedIds(): string[] {
    return CHARACTER_REGISTRY.map((c) => c.id).filter((id) => this.isUnlocked(id));
  }

  public getSelection(slot: CharacterSlot = 'default'): SlotCharacterSelection {
    const sel = this.selectionBySlot[slot] ?? DEFAULT_SELECTION_BY_SLOT[slot];
    const safeCharId = this.isUnlocked(sel.characterId) ? sel.characterId : 'classic_bird';
    return {
      mode: sel.mode,
      characterId: safeCharId,
    };
  }

  public selectGameCharacter(characterId: string, slot: CharacterSlot = 'default'): boolean {
    if (!CHARACTER_MAP.has(characterId) || !this.isUnlocked(characterId)) {
      return false;
    }
    this.selectionBySlot[slot] = {
      mode: 'character',
      characterId,
    };
    this.save();
    this.notify();
    return true;
  }

  public selectCustomFaceMode(slot: CharacterSlot = 'default'): void {
    const current = this.getSelection(slot);
    this.selectionBySlot[slot] = {
      mode: 'custom_face',
      characterId: current.characterId,
    };
    this.save();
    this.notify();
  }

  public getProgressForCharacter(
    def: CharacterDefinition,
    metrics: CharacterMetrics
  ): CharacterProgressInfo {
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
      case 'win_streak':
        current = Math.max(0, Math.floor(metrics.bestWinStreak));
        break;
      case 'all_achievements':
        current = Math.max(0, Math.floor(metrics.unlockedAchievements));
        break;
    }

    const effectiveTarget =
      type === 'all_achievements' ? Math.max(1, metrics.totalAchievements || target) : Math.max(1, target);
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
   * Evaluates all characters against gameplay metrics.
   * Returns ONLY newly unlocked CharacterDefinitions (never emits duplicates).
   */
  public evaluateProgress(metrics: CharacterMetrics): CharacterDefinition[] {
    const now = Date.now();
    const newlyUnlocked: CharacterDefinition[] = [];

    for (const def of CHARACTER_REGISTRY) {
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
        case 'win_streak':
          met = metrics.bestWinStreak >= target;
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
          playerProgressionManager.recordCharacterUnlockXP(def.id, def.name, 'gameplay');
        }
      }
    }

    const summary = this.getCollectionSummary();
    characterSkinManager.evaluateUnlocks({
      bestScore: metrics.bestScore,
      totalGamesPlayed: metrics.totalGamesPlayed,
      collectionPercent: summary.percent,
    });
    if (summary.hasLegendTitle) {
      playerProgressionManager.unlockTitle('legend_face', 'solo');
    }

    if (newlyUnlocked.length > 0) {
      this.save();
      this.notify();
    }

    return newlyUnlocked;
  }

  public unlockRewardCharacter(
    characterId: string,
    source: 'level_reward' | 'gameplay' = 'level_reward'
  ): boolean {
    const def = CHARACTER_MAP.get(characterId);
    if (!def || this.unlockedMap[characterId]) {
      return false;
    }
    this.unlockedMap[characterId] = { unlockedAt: Date.now() };
    this.save();
    this.notify();
    if (source === 'gameplay' && def.unlockCondition.type !== 'starter') {
      playerProgressionManager.recordCharacterUnlockXP(def.id, def.name, 'gameplay');
    }
    if (this.getCollectionSummary().hasLegendTitle) {
      playerProgressionManager.unlockTitle('legend_face', 'solo');
    }
    return true;
  }

  public unlockFirstLockedByRarity(
    rarity: CharacterRarity,
    source: 'level_reward' | 'gameplay' = 'level_reward'
  ): CharacterDefinition | null {
    const candidate = CHARACTER_REGISTRY.find(
      (c) => c.rarity === rarity && !this.unlockedMap[c.id]
    );
    if (!candidate) return null;
    const unlocked = this.unlockRewardCharacter(candidate.id, source);
    return unlocked ? candidate : null;
  }

  public getCollectionSummary(): CollectionSummary {
    const totalCount = CHARACTER_REGISTRY.length;
    let unlockedCount = 0;

    const byRarity = {} as Record<CharacterRarity, { unlocked: number; total: number }>;
    for (const r of RARITY_ORDER) {
      byRarity[r] = { unlocked: 0, total: 0 };
    }

    for (const def of CHARACTER_REGISTRY) {
      byRarity[def.rarity].total += 1;
      if (this.isUnlocked(def.id)) {
        unlockedCount += 1;
        byRarity[def.rarity].unlocked += 1;
      }
    }

    const percent = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    const milestones: CollectionMilestone[] = [
      {
        id: 'm25',
        percentRequired: 25,
        title: '25% COLLECTION',
        rewardLabel: 'Neon Trail & Skin',
        unlocked: percent >= 25,
      },
      {
        id: 'm50',
        percentRequired: 50,
        title: '50% COLLECTION',
        rewardLabel: 'Special Aurora Sky + Santa Skin',
        unlocked: percent >= 50,
      },
      {
        id: 'm75',
        percentRequired: 75,
        title: '75% COLLECTION',
        rewardLabel: 'Exclusive Galaxy Skin',
        unlocked: percent >= 75,
      },
      {
        id: 'm100',
        percentRequired: 100,
        title: '100% COLLECTION',
        rewardLabel: 'LEGEND FACE Title + Rainbow Aura',
        unlocked: percent >= 100,
      },
    ];

    return {
      unlockedCount,
      totalCount,
      percent,
      byRarity,
      milestones,
      hasSpecialBackground: percent >= 50,
      hasLegendTitle: percent >= 100,
    };
  }

  public reset(): void {
    this.unlockedMap = {};
    this.selectionBySlot = {
      default: { ...DEFAULT_SELECTION_BY_SLOT.default },
      player1: { ...DEFAULT_SELECTION_BY_SLOT.player1 },
      player2: { ...DEFAULT_SELECTION_BY_SLOT.player2 },
    };
    this.ensureStarterUnlocks(false);
    this.save();
    this.notify();
  }

  private ensureStarterUnlocks(saveIfChanged = true): void {
    let changed = false;
    const now = Date.now();
    for (const def of CHARACTER_REGISTRY) {
      if (def.unlockCondition.type === 'starter' && !this.unlockedMap[def.id]) {
        this.unlockedMap[def.id] = { unlockedAt: now };
        changed = true;
      }
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
      const raw = window.localStorage.getItem(COLLECTION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredCollectionPayload>;
      if (!parsed || typeof parsed !== 'object') return;

      const cleanUnlocks: Record<string, StoredUnlockRecord> = {};
      if (parsed.unlocks && typeof parsed.unlocks === 'object') {
        for (const [id, rec] of Object.entries(parsed.unlocks)) {
          if (!CHARACTER_MAP.has(id) || !rec || typeof rec !== 'object') continue;
          const ts =
            typeof rec.unlockedAt === 'number' && Number.isFinite(rec.unlockedAt)
              ? rec.unlockedAt
              : Date.now();
          cleanUnlocks[id] = { unlockedAt: ts };
        }
      }
      this.unlockedMap = cleanUnlocks;

      const slots: CharacterSlot[] = ['default', 'player1', 'player2'];
      for (const slot of slots) {
        const saved = parsed.selectionBySlot?.[slot];
        if (saved && typeof saved === 'object') {
          const mode: CharacterSelectionMode =
            saved.mode === 'custom_face' ? 'custom_face' : 'character';
          const charId =
            typeof saved.characterId === 'string' &&
            CHARACTER_MAP.has(saved.characterId) &&
            this.unlockedMap[saved.characterId]
              ? saved.characterId
              : DEFAULT_SELECTION_BY_SLOT[slot].characterId;
          this.selectionBySlot[slot] = { mode, characterId: charId };
        }
      }
    } catch {
      this.unlockedMap = {};
      this.selectionBySlot = {
        default: { ...DEFAULT_SELECTION_BY_SLOT.default },
        player1: { ...DEFAULT_SELECTION_BY_SLOT.player1 },
        player2: { ...DEFAULT_SELECTION_BY_SLOT.player2 },
      };
    }
  }

  private save(): void {
    try {
      const payload: StoredCollectionPayload = {
        version: COLLECTION_STORAGE_VERSION,
        unlocks: this.unlockedMap,
        selectionBySlot: this.selectionBySlot,
      };
      window.localStorage.setItem(COLLECTION_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage
    }
  }
}

export const characterUnlockManager = new CharacterUnlockManager();
