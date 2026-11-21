import { characterSkinManager } from '../character/CharacterSkinManager';
import { missionManager } from '../missions/MissionManager';
import { AvatarFrameId } from '../missions/MissionTypes';
import { currencyManager } from '../powerups/CurrencyManager';
import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import { ShopItemDefinition } from './AchievementTypes';

const SHOP_STORAGE_KEY = 'flappy_face_shop_v1';

export const REWARD_SHOP_ITEMS: readonly ShopItemDefinition[] = [
  {
    id: 'badge_collector_token',
    name: 'Collector Token Badge',
    description: 'Lencana Collector Token eksklusif untuk kolektor sejati.',
    kind: 'badge',
    rarity: 'UNCOMMON',
    costCoins: 50,
    costGems: 0,
    targetId: 'shop_starter',
    previewColor: '#22C55E',
  },
  {
    id: 'frame_elite_azure',
    name: 'Elite Azure Frame',
    description: 'Bingkai profil biru safir berkilau untuk kartu pemainmu.',
    kind: 'frame',
    rarity: 'RARE',
    costCoins: 150,
    costGems: 2,
    targetId: 'elite_azure',
    previewColor: '#38BDF8',
  },
  {
    id: 'skin_emerald',
    name: 'Emerald Aura Skin',
    description: 'Skin burung bernuansa zamrud dengan percikan daun giok.',
    kind: 'skin',
    rarity: 'RARE',
    costCoins: 200,
    costGems: 3,
    targetId: 'emerald',
    previewColor: '#10B981',
  },
  {
    id: 'frame_cosmic_explorer',
    name: 'Cosmic Explorer Frame',
    description: 'Bingkai galaksi ungu dengan kilau bintang nebula.',
    kind: 'frame',
    rarity: 'EPIC',
    costCoins: 350,
    costGems: 5,
    targetId: 'cosmic_explorer',
    previewColor: '#A855F7',
  },
  {
    id: 'skin_crystal',
    name: 'Crystal Prism Skin',
    description: 'Skin kristal prisma bercahaya berlian di setiap kepakan.',
    kind: 'skin',
    rarity: 'EPIC',
    costCoins: 450,
    costGems: 6,
    targetId: 'crystal',
    previewColor: '#22D3EE',
  },
  {
    id: 'frame_gold_champion',
    name: 'Champion Gold Frame',
    description: 'Bingkai emas prestisius bagi sang kolektor tingkat atas.',
    kind: 'frame',
    rarity: 'LEGENDARY',
    costCoins: 750,
    costGems: 10,
    targetId: 'gold_champion',
    previewColor: '#F59E0B',
  },
];

export interface PurchaseResult {
  success: boolean;
  reason?: 'not_found' | 'already_owned' | 'insufficient_funds';
  item?: ShopItemDefinition;
  coinsSpent: number;
  gemsSpent: number;
  totalOwnedCount: number;
}

class RewardShopManager {
  private ownedIds = new Set<string>();
  private listeners = new Set<(owned: string[]) => void>();

  constructor() {
    this.load();
  }

  public getOwnedIds(): string[] {
    return Array.from(this.ownedIds);
  }

  public isOwned(itemId: string): boolean {
    return this.ownedIds.has(itemId);
  }

  public getOwnedCount(): number {
    return this.ownedIds.size;
  }

  public subscribe(listener: (owned: string[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getOwnedIds());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public purchase(itemId: string): PurchaseResult {
    const item = REWARD_SHOP_ITEMS.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, reason: 'not_found', coinsSpent: 0, gemsSpent: 0, totalOwnedCount: this.ownedIds.size };
    }
    if (this.ownedIds.has(item.id)) {
      return { success: false, reason: 'already_owned', item, coinsSpent: 0, gemsSpent: 0, totalOwnedCount: this.ownedIds.size };
    }
    const spent = currencyManager.spendCurrency(item.costCoins, item.costGems, true);
    if (!spent) {
      return { success: false, reason: 'insufficient_funds', item, coinsSpent: 0, gemsSpent: 0, totalOwnedCount: this.ownedIds.size };
    }

    this.ownedIds.add(item.id);

    if (item.kind === 'skin') {
      characterSkinManager.unlockMilestoneSkin(item.targetId as never, 'shop');
    } else if (item.kind === 'frame') {
      missionManager.grantFrameExternal(item.targetId as AvatarFrameId);
      playerProgressionManager.unlockFrame(item.targetId as AvatarFrameId, 'solo');
    }

    this.save();
    this.notify();

    return {
      success: true,
      item,
      coinsSpent: item.costCoins,
      gemsSpent: item.costGems,
      totalOwnedCount: this.ownedIds.size,
    };
  }

  public reset(): void {
    this.ownedIds.clear();
    this.save();
    this.notify();
  }

  private notify(): void {
    const snap = this.getOwnedIds();
    for (const l of this.listeners) l(snap);
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(SHOP_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ownedIds?: unknown };
      if (parsed && Array.isArray(parsed.ownedIds)) {
        for (const id of parsed.ownedIds) {
          if (typeof id === 'string' && REWARD_SHOP_ITEMS.some((i) => i.id === id)) {
            this.ownedIds.add(id);
          }
        }
      }
    } catch {
      this.ownedIds.clear();
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(
        SHOP_STORAGE_KEY,
        JSON.stringify({ version: 1, ownedIds: Array.from(this.ownedIds) })
      );
    } catch {
      // Ignore storage failures
    }
  }
}

export const rewardShopManager = new RewardShopManager();
