export interface PowerUpCurrencyStats {
  totalCoinsCollected: number;
  totalGemsCollected: number;
  totalStarsCollected: number;
  totalPowerUpsCollected: number;
  shieldSaves: number;
  revivesUsed: number;
  totalCoinsEarned?: number;
  totalGemsEarned?: number;
  totalCoinsSpent?: number;
  totalGemsSpent?: number;
  shopPurchases?: number;
}

export interface CurrencySnapshot {
  coins: number;
  gems: number;
  stats: PowerUpCurrencyStats;
}

interface StoredCurrencyPayload {
  version: number;
  coins: number;
  gems: number;
  claimedEvents: string[];
  stats: PowerUpCurrencyStats;
}

const CURRENCY_STORAGE_KEY = 'flappy_face_currency';
const CURRENCY_STORAGE_VERSION = 2;

const DEFAULT_STATS: PowerUpCurrencyStats = {
  totalCoinsCollected: 0,
  totalGemsCollected: 0,
  totalStarsCollected: 0,
  totalPowerUpsCollected: 0,
  shieldSaves: 0,
  revivesUsed: 0,
  totalCoinsEarned: 0,
  totalGemsEarned: 0,
  totalCoinsSpent: 0,
  totalGemsSpent: 0,
  shopPurchases: 0,
};

export class CurrencyManager {
  private coins = 0;
  private gems = 0;
  private claimedEvents = new Set<string>();
  private stats: PowerUpCurrencyStats = { ...DEFAULT_STATS };
  private listeners = new Set<(snap: CurrencySnapshot) => void>();

  constructor() {
    this.load();
  }

  public getSnapshot(): CurrencySnapshot {
    return {
      coins: this.coins,
      gems: this.gems,
      stats: {
        totalCoinsCollected: this.stats.totalCoinsCollected,
        totalGemsCollected: this.stats.totalGemsCollected,
        totalStarsCollected: this.stats.totalStarsCollected,
        totalPowerUpsCollected: this.stats.totalPowerUpsCollected,
        shieldSaves: this.stats.shieldSaves,
        revivesUsed: this.stats.revivesUsed,
        totalCoinsEarned: this.stats.totalCoinsEarned ?? 0,
        totalGemsEarned: this.stats.totalGemsEarned ?? 0,
        totalCoinsSpent: this.stats.totalCoinsSpent ?? 0,
        totalGemsSpent: this.stats.totalGemsSpent ?? 0,
        shopPurchases: this.stats.shopPurchases ?? 0,
      },
    };
  }

  public subscribe(listener: (snap: CurrencySnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public addGameplayRewards(coinsEarned: number, gemsEarned: number, isStar = false): void {
    const safeCoins = Math.max(0, Math.floor(coinsEarned));
    const safeGems = Math.max(0, Math.floor(gemsEarned));
    if (safeCoins === 0 && safeGems === 0 && !isStar) return;

    this.coins += safeCoins;
    this.gems += safeGems;
    this.stats.totalCoinsCollected += safeCoins;
    this.stats.totalGemsCollected += safeGems;
    this.stats.totalCoinsEarned = (this.stats.totalCoinsEarned ?? 0) + safeCoins;
    this.stats.totalGemsEarned = (this.stats.totalGemsEarned ?? 0) + safeGems;
    if (isStar) {
      this.stats.totalStarsCollected += 1;
    }

    this.save();
    this.notify();
  }

  public recordPowerUpCollected(): void {
    this.stats.totalPowerUpsCollected += 1;
    this.save();
    this.notify();
  }

  public recordShieldSave(): void {
    this.stats.shieldSaves += 1;
    this.save();
    this.notify();
  }

  public recordReviveUsed(): void {
    this.stats.revivesUsed += 1;
    this.save();
    this.notify();
  }

  /**
   * Awards bonus Coins/Gems for milestones or achievements at most once per unique eventId.
   */
  public awardEventOnce(eventId: string, coins: number, gems: number): boolean {
    if (!eventId || this.claimedEvents.has(eventId)) {
      return false;
    }
    this.claimedEvents.add(eventId);
    const safeCoins = Math.max(0, Math.floor(coins));
    const safeGems = Math.max(0, Math.floor(gems));
    this.coins += safeCoins;
    this.gems += safeGems;
    this.stats.totalCoinsEarned = (this.stats.totalCoinsEarned ?? 0) + safeCoins;
    this.stats.totalGemsEarned = (this.stats.totalGemsEarned ?? 0) + safeGems;
    this.save();
    this.notify();
    return true;
  }

  public spendCurrency(coinsToSpend: number, gemsToSpend: number, isShopPurchase = true): boolean {
    const safeCoins = Math.max(0, Math.floor(coinsToSpend));
    const safeGems = Math.max(0, Math.floor(gemsToSpend));
    if (safeCoins === 0 && safeGems === 0) return false;
    if (this.coins < safeCoins || this.gems < safeGems) {
      return false;
    }

    this.coins -= safeCoins;
    this.gems -= safeGems;
    this.stats.totalCoinsSpent = (this.stats.totalCoinsSpent ?? 0) + safeCoins;
    this.stats.totalGemsSpent = (this.stats.totalGemsSpent ?? 0) + safeGems;
    if (isShopPurchase) {
      this.stats.shopPurchases = (this.stats.shopPurchases ?? 0) + 1;
    }
    this.save();
    this.notify();
    return true;
  }

  public reset(): void {
    this.coins = 0;
    this.gems = 0;
    this.claimedEvents.clear();
    this.stats = { ...DEFAULT_STATS };
    this.save();
    this.notify();
  }

  private notify(): void {
    const snap = this.getSnapshot();
    for (const l of this.listeners) {
      l(snap);
    }
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredCurrencyPayload>;
      if (!parsed || typeof parsed !== 'object') return;

      this.coins =
        typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) && parsed.coins >= 0
          ? Math.floor(parsed.coins)
          : 0;
      this.gems =
        typeof parsed.gems === 'number' && Number.isFinite(parsed.gems) && parsed.gems >= 0
          ? Math.floor(parsed.gems)
          : 0;

      if (Array.isArray(parsed.claimedEvents)) {
        for (const ev of parsed.claimedEvents) {
          if (typeof ev === 'string' && ev.length > 0) {
            this.claimedEvents.add(ev);
          }
        }
      }

      if (parsed.stats && typeof parsed.stats === 'object') {
        const s = parsed.stats;
        const cleanInt = (v: unknown) =>
          typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
        const collectedCoins = cleanInt(s.totalCoinsCollected);
        const collectedGems = cleanInt(s.totalGemsCollected);
        this.stats = {
          totalCoinsCollected: collectedCoins,
          totalGemsCollected: collectedGems,
          totalStarsCollected: cleanInt(s.totalStarsCollected),
          totalPowerUpsCollected: cleanInt(s.totalPowerUpsCollected),
          shieldSaves: cleanInt(s.shieldSaves),
          revivesUsed: cleanInt(s.revivesUsed),
          totalCoinsEarned: Math.max(collectedCoins, cleanInt(s.totalCoinsEarned), this.coins),
          totalGemsEarned: Math.max(collectedGems, cleanInt(s.totalGemsEarned), this.gems),
          totalCoinsSpent: cleanInt(s.totalCoinsSpent),
          totalGemsSpent: cleanInt(s.totalGemsSpent),
          shopPurchases: cleanInt(s.shopPurchases),
        };
      }
    } catch {
      this.coins = 0;
      this.gems = 0;
      this.claimedEvents.clear();
      this.stats = { ...DEFAULT_STATS };
    }
  }

  private save(): void {
    try {
      const payload: StoredCurrencyPayload = {
        version: CURRENCY_STORAGE_VERSION,
        coins: this.coins,
        gems: this.gems,
        claimedEvents: Array.from(this.claimedEvents),
        stats: { ...this.stats },
      };
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors in restricted mode
    }
  }
}

export const currencyManager = new CurrencyManager();
