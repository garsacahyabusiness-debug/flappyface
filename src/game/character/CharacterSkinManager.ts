import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import { CharacterSlot } from './CharacterStorage';

export type SkinId =
  | 'default'
  | 'neon'
  | 'golden'
  | 'shadow'
  | 'christmas'
  | 'halloween'
  | 'retro_pixel'
  | 'galaxy'
  | 'rainbow'
  | 'emerald'
  | 'crystal';

export type SkinAccessoryOverlay =
  | 'none'
  | 'santa_hat'
  | 'witch_hat'
  | 'pixel_visor'
  | 'halo_star';

export interface SkinDefinition {
  id: SkinId;
  name: string;
  description: string;
  unlockRequirementLabel: string;
  badgeColor: string;
  rimColor: string | null;
  glowColor: string | null;
  trailColors: readonly string[] | null;
  particleKind: 'default' | 'star' | 'circle' | 'confetti';
  accessoryOverlay: SkinAccessoryOverlay;
  tintOverlay: string | null;
}

export interface SkinUnlockContext {
  bestScore: number;
  totalGamesPlayed: number;
  collectionPercent: number;
}

export const SKIN_REGISTRY: readonly SkinDefinition[] = [
  {
    id: 'default',
    name: 'DEFAULT',
    description: 'Tampilan asli karakter tanpa efek tambahan.',
    unlockRequirementLabel: 'Tersedia sejak awal',
    badgeColor: '#94A3B8',
    rimColor: null,
    glowColor: null,
    trailColors: null,
    particleKind: 'default',
    accessoryOverlay: 'none',
    tintOverlay: null,
  },
  {
    id: 'neon',
    name: 'NEON',
    description: 'Garis tepi neon elektrik & jejak cahaya cyan-magenta.',
    unlockRequirementLabel: 'Score 5 atau 25% Collection',
    badgeColor: '#22D3EE',
    rimColor: '#22D3EE',
    glowColor: 'rgba(34, 211, 238, 0.58)',
    trailColors: ['#22D3EE', '#F472B6', '#FFFFFF'],
    particleKind: 'star',
    accessoryOverlay: 'none',
    tintOverlay: null,
  },
  {
    id: 'retro_pixel',
    name: 'RETRO PIXEL',
    description: 'Gaya arcade 8-bit klasik dengan efek kilap kotak retro.',
    unlockRequirementLabel: 'Unlock at Score 20',
    badgeColor: '#3B82F6',
    rimColor: '#1D4ED8',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    trailColors: ['#60A5FA', '#FDE047', '#4ADE80'],
    particleKind: 'confetti',
    accessoryOverlay: 'pixel_visor',
    tintOverlay: null,
  },
  {
    id: 'shadow',
    name: 'SHADOW',
    description: 'Aura gelap misterius dengan kepulan asap bayangan.',
    unlockRequirementLabel: 'Play 15 Games',
    badgeColor: '#475569',
    rimColor: '#0F172A',
    glowColor: 'rgba(30, 41, 59, 0.65)',
    trailColors: ['#334155', '#64748B', '#0F172A'],
    particleKind: 'circle',
    accessoryOverlay: 'none',
    tintOverlay: 'rgba(15, 23, 42, 0.16)',
  },
  {
    id: 'halloween',
    name: 'HALLOWEEN',
    description: 'Topi penyihir mungil & percikan labu mistis!',
    unlockRequirementLabel: 'Play 20 Games',
    badgeColor: '#F97316',
    rimColor: '#EA580C',
    glowColor: 'rgba(249, 115, 22, 0.55)',
    trailColors: ['#F97316', '#A855F7', '#FDE047'],
    particleKind: 'star',
    accessoryOverlay: 'witch_hat',
    tintOverlay: null,
  },
  {
    id: 'golden',
    name: 'GOLDEN',
    description: 'Bingkai emas berkilau & jejak debu bintang mewah.',
    unlockRequirementLabel: 'Unlock at Score 35',
    badgeColor: '#F59E0B',
    rimColor: '#F59E0B',
    glowColor: 'rgba(255, 216, 77, 0.65)',
    trailColors: ['#FFD84D', '#FEF08A', '#F59E0B'],
    particleKind: 'star',
    accessoryOverlay: 'none',
    tintOverlay: 'rgba(255, 215, 0, 0.12)',
  },
  {
    id: 'christmas',
    name: 'CHRISTMAS',
    description: 'Topi Santa lucu & jejak keping salju musim dingin.',
    unlockRequirementLabel: '50% Collection Milestone',
    badgeColor: '#EF4444',
    rimColor: '#DC2626',
    glowColor: 'rgba(239, 68, 68, 0.48)',
    trailColors: ['#FFFFFF', '#BAE6FD', '#EF4444'],
    particleKind: 'circle',
    accessoryOverlay: 'santa_hat',
    tintOverlay: null,
  },
  {
    id: 'galaxy',
    name: 'GALAXY',
    description: 'Aura nebula kosmik eksklusif dengan bintang berkilau.',
    unlockRequirementLabel: '75% Collection Milestone',
    badgeColor: '#7C3AED',
    rimColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.62)',
    trailColors: ['#A78BFA', '#38BDF8', '#F472B6'],
    particleKind: 'star',
    accessoryOverlay: 'halo_star',
    tintOverlay: 'rgba(79, 70, 229, 0.12)',
  },
  {
    id: 'rainbow',
    name: 'RAINBOW',
    description: 'Spektrum pelangi berputar & jejak confetti penuh warna!',
    unlockRequirementLabel: '100% Collection atau Score 80',
    badgeColor: '#EC4899',
    rimColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.65)',
    trailColors: ['#EF4444', '#F59E0B', '#4ADE80', '#38BDF8', '#C084FC'],
    particleKind: 'confetti',
    accessoryOverlay: 'halo_star',
    tintOverlay: null,
  },
  {
    id: 'emerald',
    name: 'EMERALD WING',
    description: 'Kilau zamrud hutan tropis yang sejuk dan elegan.',
    unlockRequirementLabel: 'Reward Shop atau Achievement',
    badgeColor: '#10B981',
    rimColor: '#059669',
    glowColor: 'rgba(16, 185, 129, 0.52)',
    trailColors: ['#34D399', '#A7F3D0', '#FFFFFF'],
    particleKind: 'star',
    accessoryOverlay: 'none',
    tintOverlay: 'rgba(16, 185, 129, 0.12)',
  },
  {
    id: 'crystal',
    name: 'CRYSTAL ICE',
    description: 'Lapisan kristal biru berkilau dengan percikan es murni.',
    unlockRequirementLabel: 'Reward Shop atau Achievement',
    badgeColor: '#06B6D4',
    rimColor: '#0284C7',
    glowColor: 'rgba(6, 182, 212, 0.56)',
    trailColors: ['#BAE6FD', '#22D3EE', '#FFFFFF'],
    particleKind: 'star',
    accessoryOverlay: 'halo_star',
    tintOverlay: 'rgba(14, 165, 233, 0.14)',
  },
];

export const SKIN_MAP: ReadonlyMap<SkinId, SkinDefinition> = new Map(
  SKIN_REGISTRY.map((s) => [s.id, s])
);

export function getSkinById(id: string | null | undefined): SkinDefinition {
  if (id && SKIN_MAP.has(id as SkinId)) {
    return SKIN_MAP.get(id as SkinId)!;
  }
  return SKIN_REGISTRY[0];
}

const SKINS_STORAGE_KEY = 'flappy_face_skins';
const SKINS_STORAGE_VERSION = 1;

interface StoredSkinState {
  version: number;
  unlockedSkins: SkinId[];
  selectedBySlot: Record<CharacterSlot, SkinId>;
}

const DEFAULT_SKIN_STATE: StoredSkinState = {
  version: SKINS_STORAGE_VERSION,
  unlockedSkins: ['default'],
  selectedBySlot: {
    default: 'default',
    player1: 'default',
    player2: 'default',
  },
};

export class CharacterSkinManager {
  private unlockedSkins = new Set<SkinId>(['default']);
  private selectedBySlot: Record<CharacterSlot, SkinId> = {
    default: 'default',
    player1: 'default',
    player2: 'default',
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

  public getAllSkins(): readonly SkinDefinition[] {
    return SKIN_REGISTRY;
  }

  public isUnlocked(skinId: SkinId): boolean {
    return this.unlockedSkins.has(skinId);
  }

  public getUnlockedSkins(): SkinId[] {
    return SKIN_REGISTRY.map((s) => s.id).filter((id) => this.unlockedSkins.has(id));
  }

  public getSelectedSkin(slot: CharacterSlot = 'default'): SkinId {
    const picked = this.selectedBySlot[slot] ?? 'default';
    return this.unlockedSkins.has(picked) ? picked : 'default';
  }

  public selectSkin(skinId: SkinId, slot: CharacterSlot = 'default'): boolean {
    if (!this.unlockedSkins.has(skinId)) return false;
    this.selectedBySlot[slot] = skinId;
    this.save();
    this.notify();
    return true;
  }

  public evaluateUnlocks(ctx: SkinUnlockContext): SkinId[] {
    const newlyUnlocked: SkinId[] = [];
    const checks: Array<{ id: SkinId; met: boolean }> = [
      { id: 'default', met: true },
      { id: 'neon', met: ctx.bestScore >= 5 || ctx.collectionPercent >= 25 },
      { id: 'retro_pixel', met: ctx.bestScore >= 20 },
      { id: 'shadow', met: ctx.totalGamesPlayed >= 15 },
      { id: 'halloween', met: ctx.totalGamesPlayed >= 20 },
      { id: 'golden', met: ctx.bestScore >= 35 },
      { id: 'christmas', met: ctx.collectionPercent >= 50 },
      { id: 'galaxy', met: ctx.collectionPercent >= 75 },
      { id: 'rainbow', met: ctx.collectionPercent >= 100 || ctx.bestScore >= 80 },
    ];

    for (const item of checks) {
      if (item.met && !this.unlockedSkins.has(item.id)) {
        this.unlockedSkins.add(item.id);
        newlyUnlocked.push(item.id);
        const def = getSkinById(item.id);
        playerProgressionManager.recordSkinUnlockXP(def.id, def.name, 'gameplay');
      }
    }

    if (newlyUnlocked.length > 0) {
      this.save();
      this.notify();
    }
    return newlyUnlocked;
  }

  public unlockMilestoneSkin(
    skinId: SkinId,
    source: 'milestone' | 'level_reward' | 'shop' | 'achievement' = 'milestone'
  ): boolean {
    if (!SKIN_MAP.has(skinId) || this.unlockedSkins.has(skinId)) {
      return false;
    }
    this.unlockedSkins.add(skinId);
    this.save();
    this.notify();
    if (source !== 'level_reward') {
      const def = getSkinById(skinId);
      playerProgressionManager.recordSkinUnlockXP(
        def.id,
        def.name,
        source === 'shop' || source === 'achievement' ? 'milestone' : source
      );
    }
    return true;
  }

  public reset(): void {
    this.unlockedSkins = new Set(['default']);
    this.selectedBySlot = {
      default: 'default',
      player1: 'default',
      player2: 'default',
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
      const raw = window.localStorage.getItem(SKINS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<StoredSkinState>;
      if (!parsed || typeof parsed !== 'object') return;

      const nextSet = new Set<SkinId>(['default']);
      if (Array.isArray(parsed.unlockedSkins)) {
        for (const id of parsed.unlockedSkins) {
          if (typeof id === 'string' && SKIN_MAP.has(id as SkinId)) {
            nextSet.add(id as SkinId);
          }
        }
      }
      this.unlockedSkins = nextSet;

      const slots: CharacterSlot[] = ['default', 'player1', 'player2'];
      for (const slot of slots) {
        const val = parsed.selectedBySlot?.[slot];
        this.selectedBySlot[slot] =
          typeof val === 'string' && nextSet.has(val as SkinId) ? (val as SkinId) : 'default';
      }
    } catch {
      this.unlockedSkins = new Set(DEFAULT_SKIN_STATE.unlockedSkins);
      this.selectedBySlot = { ...DEFAULT_SKIN_STATE.selectedBySlot };
    }
  }

  private save(): void {
    try {
      const payload: StoredSkinState = {
        version: SKINS_STORAGE_VERSION,
        unlockedSkins: Array.from(this.unlockedSkins),
        selectedBySlot: { ...this.selectedBySlot },
      };
      window.localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage
    }
  }
}

export const characterSkinManager = new CharacterSkinManager();
