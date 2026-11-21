import { TitleDefinition, TitleRarity } from './PlayerProgressTypes';

export const TITLE_RARITY_STYLE: Record<
  TitleRarity,
  { badgeBg: string; badgeText: string; borderColor: string; pillBg: string }
> = {
  COMMON: {
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    borderColor: '#94A3B8',
    pillBg: 'from-slate-100 to-slate-200',
  },
  UNCOMMON: {
    badgeBg: 'bg-emerald-200',
    badgeText: 'text-emerald-900',
    borderColor: '#22C55E',
    pillBg: 'from-emerald-100 to-green-200',
  },
  RARE: {
    badgeBg: 'bg-sky-200',
    badgeText: 'text-sky-900',
    borderColor: '#3998F7',
    pillBg: 'from-sky-100 to-blue-200',
  },
  EPIC: {
    badgeBg: 'bg-purple-200',
    badgeText: 'text-purple-900',
    borderColor: '#9333EA',
    pillBg: 'from-purple-100 to-fuchsia-200',
  },
  LEGENDARY: {
    badgeBg: 'bg-amber-300',
    badgeText: 'text-amber-950',
    borderColor: '#F59E0B',
    pillBg: 'from-amber-200 via-yellow-200 to-orange-200',
  },
};

export const TITLE_REGISTRY: readonly TitleDefinition[] = [
  {
    id: 'newbie_flyer',
    name: 'Newbie Flyer',
    rarity: 'COMMON',
    description: 'Langkah pertama menaklukkan langit FLAPPY FACE.',
    unlockRequirementLabel: 'Tersedia sejak Level 1',
    sourceLabel: 'Starter',
    minLevel: 1,
  },
  {
    id: 'rookie_bird',
    name: 'Rookie Bird',
    rarity: 'COMMON',
    description: 'Penerbang pemula yang mulai konsisten menembus pipa.',
    unlockRequirementLabel: 'Reach Level 5',
    sourceLabel: 'Level 5',
    minLevel: 5,
  },
  {
    id: 'sky_explorer',
    name: 'Sky Explorer',
    rarity: 'UNCOMMON',
    description: 'Penjelajah langit penuh semangat lintas rintangan.',
    unlockRequirementLabel: 'Reach Level 15',
    sourceLabel: 'Level 15',
    minLevel: 15,
  },
  {
    id: 'coin_hunter',
    name: 'Coin Hunter',
    rarity: 'UNCOMMON',
    description: 'Kolektor koin lincah yang selalu mengincar kilau emas.',
    unlockRequirementLabel: 'Collect 100 Coins atau Special Coin Hunter',
    sourceLabel: 'Challenge / Coins',
  },
  {
    id: 'pipe_master',
    name: 'Pipe Master',
    rarity: 'RARE',
    description: 'Penguasa celah pipa dengan refleks akurat.',
    unlockRequirementLabel: 'Reach Level 25 atau 500 Total Pipes',
    sourceLabel: 'Level 25 / Pipes',
    minLevel: 25,
  },
  {
    id: 'sky_precision',
    name: 'Sky Precision',
    rarity: 'RARE',
    description: 'Terbang mulus tanpa cela di tengah pipa rapat.',
    unlockRequirementLabel: 'Complete Special Challenge: PERFECT FLYER',
    sourceLabel: 'Special Mission',
  },
  {
    id: 'power_user',
    name: 'Power User',
    rarity: 'RARE',
    description: 'Ahli memanfaatkan setiap Power-Up di udara.',
    unlockRequirementLabel: 'Unlock Power User Achievement / Power Master',
    sourceLabel: 'Achievement / Mission',
  },
  {
    id: 'world_traveler',
    name: 'World Traveler',
    rarity: 'RARE',
    description: 'Penjelajah multi-bioma dari lembah hingga luar angkasa.',
    unlockRequirementLabel: 'Unlock 4 Worlds atau Reach Level 40',
    sourceLabel: 'World Collection / Lv 40',
    minLevel: 40,
  },
  {
    id: 'tournament_champion',
    name: 'Tournament Champion',
    rarity: 'EPIC',
    description: 'Pemenang turnamen duel lokal melawan rival tangguh.',
    unlockRequirementLabel: 'Win a BO3 or BO5 Tournament',
    sourceLabel: 'Tournament',
  },
  {
    id: 'arena_champion',
    name: 'Arena Champion',
    rarity: 'EPIC',
    description: 'Juara sejati yang sudah berkali-kali menaklukkan arena.',
    unlockRequirementLabel: 'Complete Special Challenge: CHAMPION',
    sourceLabel: 'Special Mission',
  },
  {
    id: 'elite_flyer',
    name: 'Elite Flyer',
    rarity: 'EPIC',
    description: 'Penerbang elite dengan jam terbang tinggi dan skor gemilang.',
    unlockRequirementLabel: 'Reach Level 60',
    sourceLabel: 'Level 60',
    minLevel: 60,
  },
  {
    id: 'sky_legend',
    name: 'Sky Legend',
    rarity: 'LEGENDARY',
    description: 'Nama yang dikenal di setiap sudut langit FLAPPY FACE.',
    unlockRequirementLabel: 'Reach Level 90',
    sourceLabel: 'Level 90',
    minLevel: 90,
  },
  {
    id: 'eternal_flyer',
    name: 'Eternal Flyer',
    rarity: 'LEGENDARY',
    description: 'Dedikasi harian tanpa henti selama 30 hari beruntun.',
    unlockRequirementLabel: '30-Day Daily Mission Streak',
    sourceLabel: 'Mission Streak',
  },
  {
    id: 'legend_face',
    name: 'Legend Face',
    rarity: 'LEGENDARY',
    description: 'Pengumpul seluruh karakter unik di Character Collection.',
    unlockRequirementLabel: '100% Character Collection',
    sourceLabel: 'Collection',
  },
  {
    id: 'ultimate_legend',
    name: 'Ultimate Legend',
    rarity: 'LEGENDARY',
    description: 'Pencapaian tertinggi Level 100 di FLAPPY FACE.',
    unlockRequirementLabel: 'Reach Level 100',
    sourceLabel: 'Level 100',
    minLevel: 100,
  },
];

export const ACHIEVEMENT_BONUS_TITLES: readonly TitleDefinition[] = [
  {
    id: 'flappy_god',
    name: 'Flappy God',
    rarity: 'LEGENDARY',
    description: 'Penguasa tertinggi langit yang tak tergoyahkan.',
    unlockRequirementLabel: 'Achievement: FLAPPY GOD (Total 5.000 Pipa)',
    sourceLabel: 'Achievement',
  },
  {
    id: 'score_250_king',
    name: 'Sky Sovereign',
    rarity: 'LEGENDARY',
    description: 'Mencapai rekor luar biasa 250 poin dalam satu penerbangan.',
    unlockRequirementLabel: 'Achievement: 250 Poin Satu Run',
    sourceLabel: 'Achievement',
  },
  {
    id: 'full_flock_master',
    name: 'Flock Sovereign',
    rarity: 'LEGENDARY',
    description: 'Mengumpulkan seluruh burung & skin ikonik.',
    unlockRequirementLabel: 'Achievement: FULL FLOCK',
    sourceLabel: 'Achievement',
  },
  {
    id: 'secret_explorer',
    name: 'Secret Explorer',
    rarity: 'LEGENDARY',
    description: 'Pemburu rahasia sejati yang mengungkap tantangan tersembunyi.',
    unlockRequirementLabel: 'Achievement: SECRET EXPLORER',
    sourceLabel: 'Achievement',
  },
  {
    id: 'grand_achiever',
    name: 'Grand Achiever',
    rarity: 'LEGENDARY',
    description: 'Menyelesaikan hampir seluruh koleksi Achievement FLAPPY FACE.',
    unlockRequirementLabel: 'Achievement: GRAND MASTER',
    sourceLabel: 'Achievement',
  },
  {
    id: 'unstoppable_365',
    name: 'Immortal Streak',
    rarity: 'LEGENDARY',
    description: 'Dedikasi harian tanpa putus selama satu tahun penuh.',
    unlockRequirementLabel: 'Achievement: UNSTOPPABLE (Streak 365 Hari)',
    sourceLabel: 'Achievement',
  },
  {
    id: 'competitive_titan',
    name: 'Competitive Titan',
    rarity: 'LEGENDARY',
    description: 'Mencapai Competitive Rank Legend sebagai penantang terkuat.',
    unlockRequirementLabel: 'Achievement: ULTIMATE CHAMPION (Rank Legend)',
    sourceLabel: 'Competitive',
  },
];

export const ALL_TITLES_REGISTRY: readonly TitleDefinition[] = [
  ...TITLE_REGISTRY,
  ...ACHIEVEMENT_BONUS_TITLES,
];

export const TITLE_MAP: ReadonlyMap<string, TitleDefinition> = new Map(
  ALL_TITLES_REGISTRY.map((t) => [t.id, t])
);

export function getTitleById(id: string | null | undefined): TitleDefinition {
  if (id && TITLE_MAP.has(id)) {
    return TITLE_MAP.get(id)!;
  }
  return TITLE_REGISTRY[0];
}

export function findTitleByNameOrId(nameOrId: string | null | undefined): TitleDefinition | null {
  if (!nameOrId) return null;
  if (TITLE_MAP.has(nameOrId)) {
    return TITLE_MAP.get(nameOrId)!;
  }
  const normalized = nameOrId.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  for (const def of ALL_TITLES_REGISTRY) {
    if (
      def.name.toLowerCase() === normalized ||
      def.id.replace(/_/g, ' ') === normalized
    ) {
      return def;
    }
  }
  return null;
}
