export type CharacterRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
  | 'MYTHIC';

export type UnlockConditionType =
  | 'starter'
  | 'best_score'
  | 'games_played'
  | 'tournaments_won'
  | 'win_streak'
  | 'all_achievements';

export interface UnlockCondition {
  type: UnlockConditionType;
  target: number;
  label: string;
}

export type CharacterAccessory =
  | 'none'
  | 'egg_tuft'
  | 'slime_bubbles'
  | 'pink_bow'
  | 'panda_ears'
  | 'space_helmet'
  | 'ninja_band'
  | 'ghost_tail'
  | 'gold_crown_small'
  | 'cyber_visor'
  | 'royal_crown'
  | 'dragon_horns'
  | 'galaxy_ring'
  | 'demon_horns'
  | 'legend_laurel';

export interface CharacterVisualTheme {
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  bellyColor: string;
  wingTop: string;
  wingBottom: string;
  beakTop: string;
  beakBottom: string;
  tailColor: string;
  cheekColor: string;
  eyeAccent?: string;
  accessory: CharacterAccessory;
  trailColors: readonly string[];
  auraColor: string | null;
  translucent?: boolean;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  rarity: CharacterRarity;
  description: string;
  personalityQuote: string;
  unlockQuote: string;
  unlockCondition: UnlockCondition;
  visual: CharacterVisualTheme;
}

export interface RarityMeta {
  id: CharacterRarity;
  label: string;
  rank: number;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  cardBg: string;
  glowColor: string;
  unlockHeadline: string;
}

export const RARITY_ORDER: readonly CharacterRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'MYTHIC',
];

export const RARITY_META: Record<CharacterRarity, RarityMeta> = {
  COMMON: {
    id: 'COMMON',
    label: 'COMMON',
    rank: 1,
    badgeBg: 'bg-slate-200',
    badgeText: 'text-slate-700',
    borderColor: '#94A3B8',
    cardBg: 'from-white to-slate-100',
    glowColor: 'rgba(148, 163, 184, 0.35)',
    unlockHeadline: 'COMMON CHARACTER',
  },
  UNCOMMON: {
    id: 'UNCOMMON',
    label: 'UNCOMMON',
    rank: 2,
    badgeBg: 'bg-emerald-200',
    badgeText: 'text-emerald-900',
    borderColor: '#22C55E',
    cardBg: 'from-emerald-50 to-green-100',
    glowColor: 'rgba(34, 197, 94, 0.42)',
    unlockHeadline: 'UNCOMMON CHARACTER',
  },
  RARE: {
    id: 'RARE',
    label: 'RARE',
    rank: 3,
    badgeBg: 'bg-sky-200',
    badgeText: 'text-sky-900',
    borderColor: '#3998F7',
    cardBg: 'from-sky-50 to-blue-100',
    glowColor: 'rgba(57, 152, 247, 0.45)',
    unlockHeadline: 'RARE CHARACTER',
  },
  EPIC: {
    id: 'EPIC',
    label: 'EPIC',
    rank: 4,
    badgeBg: 'bg-purple-200',
    badgeText: 'text-purple-900',
    borderColor: '#9333EA',
    cardBg: 'from-purple-50 to-fuchsia-100',
    glowColor: 'rgba(147, 51, 234, 0.5)',
    unlockHeadline: 'EPIC CHARACTER',
  },
  LEGENDARY: {
    id: 'LEGENDARY',
    label: 'LEGENDARY',
    rank: 5,
    badgeBg: 'bg-amber-300',
    badgeText: 'text-amber-950',
    borderColor: '#F59E0B',
    cardBg: 'from-amber-50 to-yellow-200',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    unlockHeadline: 'LEGENDARY CHARACTER',
  },
  MYTHIC: {
    id: 'MYTHIC',
    label: 'MYTHIC',
    rank: 6,
    badgeBg: 'bg-gradient-to-r from-rose-500 to-fuchsia-600',
    badgeText: 'text-white',
    borderColor: '#EC4899',
    cardBg: 'from-rose-50 via-pink-100 to-fuchsia-100',
    glowColor: 'rgba(236, 72, 153, 0.68)',
    unlockHeadline: 'MYTHIC CHARACTER',
  },
};

export const CHARACTER_REGISTRY: readonly CharacterDefinition[] = [
  {
    id: 'classic_bird',
    name: 'CLASSIC BIRD',
    rarity: 'COMMON',
    description: 'Burung kuning ikonik FLAPPY FACE yang siap menembus pipa tanpa rasa takut.',
    personalityQuote: 'Si kuning legendaris. Kecil-kecil hobi nabrak pipa.',
    unlockQuote: 'Siap terbang dari awal!',
    unlockCondition: {
      type: 'starter',
      target: 1,
      label: 'Tersedia sejak awal',
    },
    visual: {
      bodyTop: '#FFF199',
      bodyMid: '#FFD84D',
      bodyBottom: '#F2A322',
      bellyColor: '#FFF7C2',
      wingTop: '#FFFFFF',
      wingBottom: '#FFEFA6',
      beakTop: '#FF9429',
      beakBottom: '#EB681B',
      tailColor: '#F5B82E',
      cheekColor: 'rgba(255, 118, 128, 0.55)',
      accessory: 'none',
      trailColors: ['#FFFFFF', '#FFF199'],
      auraColor: null,
    },
  },
  {
    id: 'chicky',
    name: 'CHICKY',
    rarity: 'COMMON',
    description: 'Anak burung imut yang baru menetas dan langsung ikut balapan pipa.',
    personalityQuote: 'Baru keluar cangkang, eh udah disuruh ngehindarin pipa.',
    unlockQuote: 'Ciap-ciap! Teman baru siap terbang!',
    unlockCondition: {
      type: 'starter',
      target: 1,
      label: 'Tersedia sejak awal',
    },
    visual: {
      bodyTop: '#FFF8B8',
      bodyMid: '#FFE66D',
      bodyBottom: '#F7C948',
      bellyColor: '#FFFFFF',
      wingTop: '#FFFBE6',
      wingBottom: '#FFE999',
      beakTop: '#FFA94D',
      beakBottom: '#F76707',
      tailColor: '#FFE066',
      cheekColor: 'rgba(255, 135, 155, 0.72)',
      accessory: 'egg_tuft',
      trailColors: ['#FFF8B8', '#FFFFFF'],
      auraColor: null,
    },
  },
  {
    id: 'toxic_bird',
    name: 'TOXIC BIRD',
    rarity: 'UNCOMMON',
    description: 'Burung neon hijau menyala penuh energi eksperimen laboratorium rahasia.',
    personalityQuote: 'Bercahaya di gelap, tetap aja nyangkut kalau telat tap.',
    unlockQuote: 'Energi radioaktif siap meluncur!',
    unlockCondition: {
      type: 'best_score',
      target: 10,
      label: 'UNLOCK AT SCORE 10',
    },
    visual: {
      bodyTop: '#D9FF80',
      bodyMid: '#7AE548',
      bodyBottom: '#2B9348',
      bellyColor: '#ECFFB8',
      wingTop: '#C7FF8C',
      wingBottom: '#55B848',
      beakTop: '#FFD43B',
      beakBottom: '#E67700',
      tailColor: '#52B788',
      cheekColor: 'rgba(130, 255, 120, 0.55)',
      eyeAccent: '#A3FF12',
      accessory: 'slime_bubbles',
      trailColors: ['#A3FF12', '#52B788', '#D9FF80'],
      auraColor: 'rgba(122, 229, 72, 0.35)',
    },
  },
  {
    id: 'pinky',
    name: 'PINKY',
    rarity: 'UNCOMMON',
    description: 'Burung pink menggemaskan dengan pita manis yang sangat percaya diri.',
    personalityQuote: 'Tampil manis tiap ronde, walau jatuhnya tetap penuh drama.',
    unlockQuote: 'Terbang penuh gaya dan pita manis!',
    unlockCondition: {
      type: 'best_score',
      target: 15,
      label: 'UNLOCK AT SCORE 15',
    },
    visual: {
      bodyTop: '#FFD6EA',
      bodyMid: '#FF7EB6',
      bodyBottom: '#E64980',
      bellyColor: '#FFF0F6',
      wingTop: '#FFFFFF',
      wingBottom: '#FFC2DF',
      beakTop: '#FFB703',
      beakBottom: '#FB8500',
      tailColor: '#F06595',
      cheekColor: 'rgba(255, 77, 136, 0.55)',
      accessory: 'pink_bow',
      trailColors: ['#FF7EB6', '#FFD6EA', '#FFFFFF'],
      auraColor: 'rgba(255, 126, 182, 0.32)',
    },
  },
  {
    id: 'panda_fly',
    name: 'PANDA FLY',
    rarity: 'RARE',
    description: 'Panda bulat yang nekat belajar terbang demi mengejar stok bambu di langit.',
    personalityQuote: 'Bukan burung sih, tapi nekat aja ikut kompetisi terbang.',
    unlockQuote: 'Gemoy dan siap menaklukkan udara!',
    unlockCondition: {
      type: 'games_played',
      target: 10,
      label: 'PLAY 10 GAMES',
    },
    visual: {
      bodyTop: '#FFFFFF',
      bodyMid: '#F1F5F9',
      bodyBottom: '#CBD5E1',
      bellyColor: '#FFFFFF',
      wingTop: '#334155',
      wingBottom: '#0F172A',
      beakTop: '#FFB703',
      beakBottom: '#E07A00',
      tailColor: '#1E293B',
      cheekColor: 'rgba(255, 138, 150, 0.55)',
      accessory: 'panda_ears',
      trailColors: ['#FFFFFF', '#94A3B8', '#4ADE80'],
      auraColor: 'rgba(57, 152, 247, 0.28)',
    },
  },
  {
    id: 'space_duck',
    name: 'SPACE DUCK',
    rarity: 'RARE',
    description: 'Astronot bebek dengan helm kaca anti-gravitasi dari orbit luar angkasa.',
    personalityQuote: 'Punya helm luar angkasa, tapi lupa pasang radar pipa.',
    unlockQuote: 'Houston, bebek siap meluncur!',
    unlockCondition: {
      type: 'best_score',
      target: 25,
      label: 'UNLOCK AT SCORE 25',
    },
    visual: {
      bodyTop: '#BAE6FD',
      bodyMid: '#38BDF8',
      bodyBottom: '#0284C7',
      bellyColor: '#E0F2FE',
      wingTop: '#FFFFFF',
      wingBottom: '#7DD3FC',
      beakTop: '#FDBA74',
      beakBottom: '#EA580C',
      tailColor: '#0EA5E9',
      cheekColor: 'rgba(125, 211, 252, 0.65)',
      accessory: 'space_helmet',
      trailColors: ['#38BDF8', '#E0F2FE', '#FFD84D'],
      auraColor: 'rgba(56, 189, 248, 0.35)',
    },
  },
  {
    id: 'ninja_bird',
    name: 'NINJA BIRD',
    rarity: 'RARE',
    description: 'Shinobi langit gesit dengan ikat kepala merah dan jurus kepak sunyi.',
    personalityQuote: 'Diam-diam terbang, diam-diam menabrak.',
    unlockQuote: 'Jurus bayangan siap mendominasi!',
    unlockCondition: {
      type: 'tournaments_won',
      target: 3,
      label: 'WIN 3 MATCHES (2P / TOURNAMENT)',
    },
    visual: {
      bodyTop: '#64748B',
      bodyMid: '#334155',
      bodyBottom: '#0F172A',
      bellyColor: '#94A3B8',
      wingTop: '#475569',
      wingBottom: '#1E293B',
      beakTop: '#FB923C',
      beakBottom: '#C2410C',
      tailColor: '#EF4444',
      cheekColor: 'rgba(239, 68, 68, 0.45)',
      accessory: 'ninja_band',
      trailColors: ['#EF4444', '#334155', '#CBD5E1'],
      auraColor: 'rgba(239, 68, 68, 0.28)',
    },
  },
  {
    id: 'ghosty',
    name: 'GHOSTY',
    rarity: 'EPIC',
    description: 'Arwah burung lucu yang tembus pandang dan suka mengagetkan lawan.',
    personalityQuote: 'Sudah meninggal? Belum. Cuma sering Game Over.',
    unlockQuote: 'Boo! Terbang menembus malam!',
    unlockCondition: {
      type: 'games_played',
      target: 30,
      label: 'PLAY 30 GAMES',
    },
    visual: {
      bodyTop: '#FFFFFF',
      bodyMid: '#E9D5FF',
      bodyBottom: '#C084FC',
      bellyColor: '#FAF5FF',
      wingTop: '#FFFFFF',
      wingBottom: '#D8B4FE',
      beakTop: '#F472B6',
      beakBottom: '#BE185D',
      tailColor: '#D8B4FE',
      cheekColor: 'rgba(192, 132, 252, 0.5)',
      eyeAccent: '#A855F7',
      accessory: 'ghost_tail',
      trailColors: ['#E9D5FF', '#C084FC', '#FFFFFF'],
      auraColor: 'rgba(168, 85, 247, 0.42)',
      translucent: true,
    },
  },
  {
    id: 'golden_bird',
    name: 'GOLDEN BIRD',
    rarity: 'EPIC',
    description: 'Burung berlapis emas 24 karat yang berkilau terang di setiap kepakan.',
    personalityQuote: 'Kilau emasnya mahal. Skill terbangnya tetap harus latihan.',
    unlockQuote: 'Terbang dengan gaya emas!',
    unlockCondition: {
      type: 'best_score',
      target: 50,
      label: 'UNLOCK AT SCORE 50',
    },
    visual: {
      bodyTop: '#FFF9C4',
      bodyMid: '#FFD700',
      bodyBottom: '#D97706',
      bellyColor: '#FEF08A',
      wingTop: '#FFFBEB',
      wingBottom: '#FBBF24',
      beakTop: '#FF9F1C',
      beakBottom: '#B45309',
      tailColor: '#F59E0B',
      cheekColor: 'rgba(255, 235, 130, 0.75)',
      accessory: 'gold_crown_small',
      trailColors: ['#FFD84D', '#FFF9C4', '#F59E0B'],
      auraColor: 'rgba(255, 215, 0, 0.48)',
    },
  },
  {
    id: 'cyber_bird',
    name: 'CYBER BIRD',
    rarity: 'EPIC',
    description: 'Drone burung futuristik dengan visor laser dan sirkuit berkecepatan tinggi.',
    personalityQuote: 'Prosesor 120Hz, tapi jempol pilotnya kadang masih lag.',
    unlockQuote: 'Sistem terbang masa depan aktif!',
    unlockCondition: {
      type: 'best_score',
      target: 75,
      label: 'UNLOCK AT SCORE 75',
    },
    visual: {
      bodyTop: '#67E8F9',
      bodyMid: '#06B6D4',
      bodyBottom: '#312E81',
      bellyColor: '#A5F3FC',
      wingTop: '#22D3EE',
      wingBottom: '#4338CA',
      beakTop: '#F472B6',
      beakBottom: '#9D174D',
      tailColor: '#22D3EE',
      cheekColor: 'rgba(34, 211, 238, 0.6)',
      eyeAccent: '#22D3EE',
      accessory: 'cyber_visor',
      trailColors: ['#22D3EE', '#E879F9', '#67E8F9'],
      auraColor: 'rgba(34, 211, 238, 0.45)',
    },
  },
  {
    id: 'king_bird',
    name: 'KING BIRD',
    rarity: 'LEGENDARY',
    description: 'Penguasa arena turnamen dengan mahkota permata dan jubah raja yang megah.',
    personalityQuote: 'Raja sejati tak pernah panik... kecuali pas pipa mepet.',
    unlockQuote: 'Hormat kepada Sang Juara!',
    unlockCondition: {
      type: 'tournaments_won',
      target: 10,
      label: 'WIN 10 MATCHES (2P / TOURNAMENT)',
    },
    visual: {
      bodyTop: '#FEF08A',
      bodyMid: '#F59E0B',
      bodyBottom: '#B91C1C',
      bellyColor: '#FEF9C3',
      wingTop: '#FFFFFF',
      wingBottom: '#FDE047',
      beakTop: '#FB923C',
      beakBottom: '#C2410C',
      tailColor: '#DC2626',
      cheekColor: 'rgba(248, 113, 113, 0.55)',
      accessory: 'royal_crown',
      trailColors: ['#FFD84D', '#EF4444', '#FFFFFF'],
      auraColor: 'rgba(245, 158, 11, 0.52)',
    },
  },
  {
    id: 'dragon_bird',
    name: 'DRAGON BIRD',
    rarity: 'LEGENDARY',
    description: 'Naga bersayap tangguh yang menyemburkan percikan api di langit tinggi.',
    personalityQuote: 'Napasnya api membara, tapi tetap kalah sama pipa hijau.',
    unlockQuote: 'Kekuatan naga langit bangkit!',
    unlockCondition: {
      type: 'best_score',
      target: 100,
      label: 'UNLOCK AT SCORE 100',
    },
    visual: {
      bodyTop: '#FCA5A5',
      bodyMid: '#EF4444',
      bodyBottom: '#991B1B',
      bellyColor: '#FDE68A',
      wingTop: '#F97316',
      wingBottom: '#7C2D12',
      beakTop: '#FBBF24',
      beakBottom: '#D97706',
      tailColor: '#DC2626',
      cheekColor: 'rgba(249, 115, 22, 0.6)',
      eyeAccent: '#FACC15',
      accessory: 'dragon_horns',
      trailColors: ['#F97316', '#FACC15', '#EF4444'],
      auraColor: 'rgba(239, 68, 68, 0.5)',
    },
  },
  {
    id: 'galaxy_bird',
    name: 'GALAXY BIRD',
    rarity: 'MYTHIC',
    description: 'Entitas kosmik dengan nebula galaksi dan cincin bintang yang berputar.',
    personalityQuote: 'Menguasai jutaan bintang, tapi masih bingung cari celah pipa.',
    unlockQuote: 'Kosmos menyambut penerbanganmu!',
    unlockCondition: {
      type: 'best_score',
      target: 150,
      label: 'UNLOCK AT SCORE 150',
    },
    visual: {
      bodyTop: '#C084FC',
      bodyMid: '#4F46E5',
      bodyBottom: '#0F172A',
      bellyColor: '#E0E7FF',
      wingTop: '#818CF8',
      wingBottom: '#312E81',
      beakTop: '#38BDF8',
      beakBottom: '#0284C7',
      tailColor: '#EC4899',
      cheekColor: 'rgba(236, 72, 153, 0.55)',
      eyeAccent: '#FDE047',
      accessory: 'galaxy_ring',
      trailColors: ['#C084FC', '#38BDF8', '#F472B6', '#FDE047'],
      auraColor: 'rgba(129, 140, 248, 0.6)',
    },
  },
  {
    id: 'demon_bird',
    name: 'DEMON BIRD',
    rarity: 'MYTHIC',
    description: 'Penantang terkuat pemegang Win Streak berapi dengan tanduk obsidian.',
    personalityQuote: 'Aura boleh seram, asal jangan kepeleset di skor 0.',
    unlockQuote: 'Api Win Streak tak terhentikan!',
    unlockCondition: {
      type: 'win_streak',
      target: 5,
      label: 'ACHIEVE 5 WIN STREAK',
    },
    visual: {
      bodyTop: '#FB7185',
      bodyMid: '#DC2626',
      bodyBottom: '#450A0A',
      bellyColor: '#991B1B',
      wingTop: '#7F1D1D',
      wingBottom: '#18181B',
      beakTop: '#F59E0B',
      beakBottom: '#B45309',
      tailColor: '#991B1B',
      cheekColor: 'rgba(244, 63, 94, 0.65)',
      eyeAccent: '#FACC15',
      accessory: 'demon_horns',
      trailColors: ['#F43F5E', '#FB923C', '#18181B'],
      auraColor: 'rgba(244, 63, 94, 0.58)',
    },
  },
  {
    id: 'legend_face',
    name: 'LEGEND FACE',
    rarity: 'MYTHIC',
    description: 'Bentuk tertinggi sang master FLAPPY FACE dengan mahkota laurel abadi.',
    personalityQuote: 'Semua achievement kelar. Tinggal pamer ke teman satu tongkrongan.',
    unlockQuote: 'LEGEND FACE TELAH TERBANGUN!',
    unlockCondition: {
      type: 'all_achievements',
      target: 6,
      label: 'COMPLETE ALL ACHIEVEMENTS',
    },
    visual: {
      bodyTop: '#FEF9C3',
      bodyMid: '#F472B6',
      bodyBottom: '#7C3AED',
      bellyColor: '#FFFFFF',
      wingTop: '#FDE047',
      wingBottom: '#EC4899',
      beakTop: '#FBBF24',
      beakBottom: '#EA580C',
      tailColor: '#FDE047',
      cheekColor: 'rgba(253, 224, 71, 0.72)',
      eyeAccent: '#FDE047',
      accessory: 'legend_laurel',
      trailColors: ['#FFD84D', '#EC4899', '#38BDF8', '#4ADE80'],
      auraColor: 'rgba(253, 224, 71, 0.65)',
    },
  },
];

export const CHARACTER_MAP: ReadonlyMap<string, CharacterDefinition> = new Map(
  CHARACTER_REGISTRY.map((c) => [c.id, c])
);

export function getCharacterById(id: string | null | undefined): CharacterDefinition {
  if (id && CHARACTER_MAP.has(id)) {
    return CHARACTER_MAP.get(id)!;
  }
  return CHARACTER_REGISTRY[0];
}
