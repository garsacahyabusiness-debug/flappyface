import { CharacterMetadata, StoredCharacterRecord } from './types';

export type CharacterSlot = 'default' | 'player1' | 'player2';

const DB_NAME = 'flappy_face_db';
const DB_VERSION = 1;
const STORE_NAME = 'characters';

const SLOT_RECORD_KEYS: Record<CharacterSlot, StoredCharacterRecord['id']> = {
  default: 'current',
  player1: 'player1',
  player2: 'player2',
};

const SLOT_META_KEYS: Record<CharacterSlot, string> = {
  default: 'flappy_face_character_meta',
  player1: 'flappy_face_p1_meta',
  player2: 'flappy_face_p2_meta',
};

const memoryFallbackRecords = new Map<CharacterSlot, StoredCharacterRecord>();

export class CharacterStorage {
  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB tidak tersedia pada browser ini.'));
        return;
      }

      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Gagal membuka IndexedDB.'));
    });
  }

  public static saveMetadata(meta: CharacterMetadata, slot: CharacterSlot = 'default'): void {
    try {
      window.localStorage.setItem(SLOT_META_KEYS[slot], JSON.stringify(meta));
    } catch {
      // Ignore restricted storage
    }
  }

  public static loadMetadata(slot: CharacterSlot = 'default'): CharacterMetadata {
    try {
      const raw = window.localStorage.getItem(SLOT_META_KEYS[slot]);
      if (!raw) return { hasCustomFace: false, updatedAt: null };
      const parsed = JSON.parse(raw) as Partial<CharacterMetadata>;
      return {
        hasCustomFace: Boolean(parsed.hasCustomFace),
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
      };
    } catch {
      return { hasCustomFace: false, updatedAt: null };
    }
  }

  public static async saveCharacter(
    imageDataUrl: string,
    sourceType: 'camera' | 'gallery',
    slot: CharacterSlot = 'default'
  ): Promise<StoredCharacterRecord> {
    const recordKey = SLOT_RECORD_KEYS[slot];
    const record: StoredCharacterRecord = {
      id: recordKey,
      imageDataUrl,
      updatedAt: Date.now(),
      sourceType,
    };

    memoryFallbackRecords.set(slot, record);
    this.saveMetadata({ hasCustomFace: true, updatedAt: record.updatedAt }, slot);

    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
        const closeDb = () => db.close();
        tx.oncomplete = closeDb;
        tx.onabort = closeDb;
        tx.onerror = closeDb;
      });
    } catch {
      // Keep memory fallback active if IndexedDB is blocked
    }

    return record;
  }

  public static async loadCharacter(
    slot: CharacterSlot = 'default'
  ): Promise<StoredCharacterRecord | null> {
    const recordKey = SLOT_RECORD_KEYS[slot];
    try {
      const db = await this.openDB();
      const record = await new Promise<StoredCharacterRecord | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(recordKey);
        getReq.onsuccess = () =>
          resolve((getReq.result as StoredCharacterRecord | undefined) ?? null);
        getReq.onerror = () => reject(getReq.error);
        const closeDb = () => db.close();
        tx.oncomplete = closeDb;
        tx.onabort = closeDb;
        tx.onerror = closeDb;
      });
      if (record) {
        memoryFallbackRecords.set(slot, record);
      }
      return record ?? memoryFallbackRecords.get(slot) ?? null;
    } catch {
      return memoryFallbackRecords.get(slot) ?? null;
    }
  }

  public static async removeCharacter(slot: CharacterSlot = 'default'): Promise<void> {
    const recordKey = SLOT_RECORD_KEYS[slot];
    memoryFallbackRecords.delete(slot);
    this.saveMetadata({ hasCustomFace: false, updatedAt: null }, slot);

    try {
      const db = await this.openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const delReq = store.delete(recordKey);
        delReq.onsuccess = () => resolve();
        delReq.onerror = () => reject(delReq.error);
        const closeDb = () => db.close();
        tx.oncomplete = closeDb;
        tx.onabort = closeDb;
        tx.onerror = closeDb;
      });
    } catch {
      // Ignore restricted IndexedDB
    }
  }
}
