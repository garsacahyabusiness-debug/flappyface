import { CHARACTER_MAP } from './CharacterRegistry';
import { CharacterSlot } from './CharacterStorage';

const FAVORITES_STORAGE_KEY = 'flappy_face_favorites';
const FAVORITES_STORAGE_VERSION = 1;

interface StoredFavoritesPayload {
  version: number;
  bySlot: Record<CharacterSlot, string[]>;
}

export class CharacterFavorites {
  private bySlot: Record<CharacterSlot, Set<string>> = {
    default: new Set(),
    player1: new Set(),
    player2: new Set(),
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

  public getFavorites(slot: CharacterSlot = 'default'): string[] {
    return Array.from(this.bySlot[slot] ?? []);
  }

  public isFavorite(characterId: string, slot: CharacterSlot = 'default'): boolean {
    return Boolean(this.bySlot[slot]?.has(characterId));
  }

  public toggleFavorite(characterId: string, slot: CharacterSlot = 'default'): boolean {
    if (!CHARACTER_MAP.has(characterId)) return false;
    const set = this.bySlot[slot];
    let added = false;
    if (set.has(characterId)) {
      set.delete(characterId);
    } else {
      set.add(characterId);
      added = true;
    }
    this.save();
    this.notify();
    return added;
  }

  public reset(): void {
    this.bySlot = {
      default: new Set(),
      player1: new Set(),
      player2: new Set(),
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
      const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredFavoritesPayload>;
      if (!parsed || typeof parsed !== 'object') return;
      const slots: CharacterSlot[] = ['default', 'player1', 'player2'];
      for (const slot of slots) {
        const list = parsed.bySlot?.[slot];
        if (Array.isArray(list)) {
          this.bySlot[slot] = new Set(
            list.filter((id): id is string => typeof id === 'string' && CHARACTER_MAP.has(id))
          );
        }
      }
    } catch {
      this.bySlot = {
        default: new Set(),
        player1: new Set(),
        player2: new Set(),
      };
    }
  }

  private save(): void {
    try {
      const payload: StoredFavoritesPayload = {
        version: FAVORITES_STORAGE_VERSION,
        bySlot: {
          default: Array.from(this.bySlot.default),
          player1: Array.from(this.bySlot.player1),
          player2: Array.from(this.bySlot.player2),
        },
      };
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage
    }
  }
}

export const characterFavorites = new CharacterFavorites();
