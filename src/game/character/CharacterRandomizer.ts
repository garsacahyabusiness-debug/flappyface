import { CharacterSlot } from './CharacterStorage';

const RANDOMIZER_STORAGE_KEY = 'flappy_face_randomizer';
const RANDOMIZER_STORAGE_VERSION = 1;

export type RandomPickResult =
  | { kind: 'character'; characterId: string }
  | { kind: 'custom_face' };

export interface RandomizerOptions {
  unlockedCharacterIds: readonly string[];
  currentCharacterId: string | null;
  currentIsCustomFace?: boolean;
  hasCustomFace?: boolean;
  includeCustomFace?: boolean;
  rng?: () => number;
}

interface StoredRandomizerPayload {
  version: number;
  randomEveryRunBySlot: Record<CharacterSlot, boolean>;
}

export class CharacterRandomizer {
  private randomEveryRunBySlot: Record<CharacterSlot, boolean> = {
    default: false,
    player1: false,
    player2: false,
  };
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public isRandomEveryRun(slot: CharacterSlot = 'default'): boolean {
    return Boolean(this.randomEveryRunBySlot[slot]);
  }

  public setRandomEveryRun(enabled: boolean, slot: CharacterSlot = 'default'): void {
    this.randomEveryRunBySlot[slot] = Boolean(enabled);
    this.save();
    this.notify();
  }

  public toggleRandomEveryRun(slot: CharacterSlot = 'default'): boolean {
    const next = !this.isRandomEveryRun(slot);
    this.setRandomEveryRun(next, slot);
    return next;
  }

  public static pickRandom(options: RandomizerOptions): RandomPickResult {
    const rng = options.rng ?? Math.random;
    const pool: RandomPickResult[] = options.unlockedCharacterIds.map((id) => ({
      kind: 'character',
      characterId: id,
    }));

    if (options.includeCustomFace && options.hasCustomFace) {
      pool.push({ kind: 'custom_face' });
    }

    if (pool.length === 0) {
      return { kind: 'character', characterId: 'classic_bird' };
    }

    const filtered =
      pool.length > 1
        ? pool.filter((item) => {
            if (options.currentIsCustomFace) {
              return item.kind !== 'custom_face';
            }
            return item.kind !== 'character' || item.characterId !== options.currentCharacterId;
          })
        : pool;

    const candidates = filtered.length > 0 ? filtered : pool;
    const idx = Math.min(candidates.length - 1, Math.max(0, Math.floor(rng() * candidates.length)));
    return candidates[idx];
  }

  public reset(): void {
    this.randomEveryRunBySlot = {
      default: false,
      player1: false,
      player2: false,
    };
    this.save();
    this.notify();
  }

  private notify(): void {
    for (const l of this.listeners) {
      l();
    }
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(RANDOMIZER_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredRandomizerPayload>;
      if (!parsed || typeof parsed !== 'object') return;
      const slots: CharacterSlot[] = ['default', 'player1', 'player2'];
      for (const slot of slots) {
        this.randomEveryRunBySlot[slot] = Boolean(parsed.randomEveryRunBySlot?.[slot]);
      }
    } catch {
      this.randomEveryRunBySlot = { default: false, player1: false, player2: false };
    }
  }

  private save(): void {
    try {
      const payload: StoredRandomizerPayload = {
        version: RANDOMIZER_STORAGE_VERSION,
        randomEveryRunBySlot: { ...this.randomEveryRunBySlot },
      };
      window.localStorage.setItem(RANDOMIZER_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage
    }
  }
}

export const characterRandomizer = new CharacterRandomizer();
