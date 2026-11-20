export type WorldId =
  | 'green_valley'
  | 'candy_world'
  | 'snow_land'
  | 'tropical_island'
  | 'lava_world'
  | 'neon_city'
  | 'sky_kingdom'
  | 'space_odyssey';

export type WorldPipeSkin =
  | 'classic_green'
  | 'candy_cane'
  | 'ice_snow'
  | 'bamboo'
  | 'lava_stone'
  | 'cyber_neon'
  | 'sky_gold'
  | 'space_metal';

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'fog'
  | 'wind'
  | 'starry_night'
  | 'ash'
  | 'nebula';

export type AmbientSoundType =
  | 'breeze'
  | 'candy'
  | 'snow_wind'
  | 'ocean'
  | 'lava'
  | 'cyber'
  | 'heavenly'
  | 'space';

export type WorldRarity = 'STARTER' | 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export type WorldUnlockConditionType =
  | 'starter'
  | 'best_score'
  | 'games_played'
  | 'tournaments_won'
  | 'all_achievements';

export interface WorldUnlockCondition {
  type: WorldUnlockConditionType;
  target: number;
  label: string;
}

export interface WorldGroundTheme {
  topCapStart: string;
  topCapEnd: string;
  topStripe: string;
  topLip: string;
  bodyTop: string;
  bodyMid: string;
  bodyBottom: string;
  speckDark: string;
  speckLight: string;
  outline: string;
  accentGlow?: string;
}

export interface WorldDefinition {
  id: WorldId;
  order: number;
  name: string;
  subtitle: string;
  description: string;
  unlockQuote: string;
  rarity: WorldRarity;
  unlockCondition: WorldUnlockCondition;
  pipeSkin: WorldPipeSkin;
  defaultWeather: WeatherType;
  compatibleWeathers: readonly WeatherType[];
  ambientSound: AmbientSoundType;
  isDarkWorld: boolean;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  celestialColor: string;
  celestialGlow: string;
  cloudColor: string;
  cloudShade: string;
  farLayerColor: string;
  midLayerColor: string;
  accentHex: string;
  badgeBg: string;
  badgeText: string;
  ground: WorldGroundTheme;
}

export const WEATHER_LABELS: Record<WeatherType, { label: string; short: string }> = {
  sunny: { label: 'CERAH', short: 'SUN' },
  cloudy: { label: 'BERAWAN', short: 'CLOUD' },
  rain: { label: 'HUJAN', short: 'RAIN' },
  snow: { label: 'SALJU', short: 'SNOW' },
  fog: { label: 'KABUT', short: 'FOG' },
  wind: { label: 'ANGIN', short: 'WIND' },
  starry_night: { label: 'BINTANG', short: 'STAR' },
  ash: { label: 'ABU BARA', short: 'ASH' },
  nebula: { label: 'NEBULA', short: 'COSMIC' },
};

export const WORLD_REGISTRY: readonly WorldDefinition[] = [
  {
    id: 'green_valley',
    order: 1,
    name: 'GREEN VALLEY',
    subtitle: 'Lembah Cerah Klasik',
    description: 'Mulai petualanganmu di lembah yang tenang.',
    unlockQuote: 'Langit biru terbuka lebar menunggu sayapmu!',
    rarity: 'STARTER',
    unlockCondition: {
      type: 'starter',
      target: 0,
      label: 'Tersedia sejak awal',
    },
    pipeSkin: 'classic_green',
    defaultWeather: 'sunny',
    compatibleWeathers: ['sunny', 'cloudy', 'rain', 'wind'],
    ambientSound: 'breeze',
    isDarkWorld: false,
    skyTop: '#56BCFF',
    skyMid: '#76D4FF',
    skyBottom: '#B5EEFF',
    celestialColor: '#FFF59E',
    celestialGlow: 'rgba(255, 244, 175, 0.72)',
    cloudColor: '#FFFFFF',
    cloudShade: 'rgba(186, 228, 255, 0.58)',
    farLayerColor: '#89D3C4',
    midLayerColor: '#5EC486',
    accentHex: '#61D66B',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    ground: {
      topCapStart: '#9BE678',
      topCapEnd: '#8BD66A',
      topStripe: '#79C957',
      topLip: '#58A83E',
      bodyTop: '#D9A96D',
      bodyMid: '#CFA063',
      bodyBottom: '#C08A4B',
      speckDark: 'rgba(138, 88, 38, 0.24)',
      speckLight: 'rgba(255, 228, 185, 0.28)',
      outline: '#24415C',
    },
  },
  {
    id: 'candy_world',
    order: 2,
    name: 'CANDY WORLD',
    subtitle: 'Kerajaan Permen Manis',
    description: 'Terbang di dunia penuh gula dan warna.',
    unlockQuote: 'Manisnya kemenangan menunggumu di antara lolipop raksasa!',
    rarity: 'COMMON',
    unlockCondition: {
      type: 'best_score',
      target: 10,
      label: 'Reach Best Score 10',
    },
    pipeSkin: 'candy_cane',
    defaultWeather: 'sunny',
    compatibleWeathers: ['sunny', 'cloudy', 'wind'],
    ambientSound: 'candy',
    isDarkWorld: false,
    skyTop: '#FF9CE3',
    skyMid: '#FFC8EC',
    skyBottom: '#FFF0FA',
    celestialColor: '#FFF5D6',
    celestialGlow: 'rgba(255, 226, 248, 0.85)',
    cloudColor: '#FFF7FC',
    cloudShade: 'rgba(255, 178, 224, 0.45)',
    farLayerColor: '#F7A8D8',
    midLayerColor: '#FF7EC5',
    accentHex: '#EC4899',
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-800',
    ground: {
      topCapStart: '#FF92C8',
      topCapEnd: '#FF6FB7',
      topStripe: '#FFFFFF',
      topLip: '#E84A98',
      bodyTop: '#F7D2A8',
      bodyMid: '#E9BC8C',
      bodyBottom: '#D69D66',
      speckDark: 'rgba(180, 92, 130, 0.22)',
      speckLight: 'rgba(255, 245, 252, 0.42)',
      outline: '#4A1D42',
    },
  },
  {
    id: 'snow_land',
    order: 3,
    name: 'SNOW LAND',
    subtitle: 'Puncak Es Beku',
    description: 'Jangan sampai membeku di tengah penerbangan.',
    unlockQuote: 'Kepingan salju menari mengiringi setiap kepakanmu!',
    rarity: 'RARE',
    unlockCondition: {
      type: 'games_played',
      target: 20,
      label: 'Play 20 Games',
    },
    pipeSkin: 'ice_snow',
    defaultWeather: 'snow',
    compatibleWeathers: ['snow', 'fog', 'wind'],
    ambientSound: 'snow_wind',
    isDarkWorld: false,
    skyTop: '#6CA8EB',
    skyMid: '#B8DDFB',
    skyBottom: '#ECF7FF',
    celestialColor: '#F8FDFF',
    celestialGlow: 'rgba(220, 245, 255, 0.82)',
    cloudColor: '#F3FAFF',
    cloudShade: 'rgba(164, 206, 240, 0.5)',
    farLayerColor: '#98C1E8',
    midLayerColor: '#75A7D8',
    accentHex: '#38BDF8',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
    ground: {
      topCapStart: '#FFFFFF',
      topCapEnd: '#DDF2FF',
      topStripe: '#B8E3FF',
      topLip: '#82C7F2',
      bodyTop: '#8FBCD9',
      bodyMid: '#76A4C4',
      bodyBottom: '#5D8AA8',
      speckDark: 'rgba(36, 75, 110, 0.22)',
      speckLight: 'rgba(240, 250, 255, 0.35)',
      outline: '#1E3A5F',
    },
  },
  {
    id: 'tropical_island',
    order: 4,
    name: 'TROPICAL ISLAND',
    subtitle: 'Pantai & Ombak Biru',
    description: 'Liburan tropis, tapi pipa tetap menghalangi.',
    unlockQuote: 'Angin laut tropis membawa semangat juara!',
    rarity: 'RARE',
    unlockCondition: {
      type: 'best_score',
      target: 25,
      label: 'Reach Best Score 25',
    },
    pipeSkin: 'bamboo',
    defaultWeather: 'sunny',
    compatibleWeathers: ['sunny', 'rain', 'cloudy'],
    ambientSound: 'ocean',
    isDarkWorld: false,
    skyTop: '#1EA7FF',
    skyMid: '#5AE0FF',
    skyBottom: '#CFFBFF',
    celestialColor: '#FFE566',
    celestialGlow: 'rgba(255, 232, 112, 0.82)',
    cloudColor: '#FFFFFF',
    cloudShade: 'rgba(155, 234, 255, 0.52)',
    farLayerColor: '#2EC4C8',
    midLayerColor: '#36B37E',
    accentHex: '#14B8A6',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    ground: {
      topCapStart: '#FDE68A',
      topCapEnd: '#FCD34D',
      topStripe: '#FBBF24',
      topLip: '#D97706',
      bodyTop: '#F3C677',
      bodyMid: '#E2AC5B',
      bodyBottom: '#C98E40',
      speckDark: 'rgba(146, 86, 24, 0.2)',
      speckLight: 'rgba(255, 246, 204, 0.42)',
      outline: '#24415C',
    },
  },
  {
    id: 'lava_world',
    order: 5,
    name: 'LAVA WORLD',
    subtitle: 'Kawah Magma Membara',
    description: 'Berani terbang di dunia paling panas?',
    unlockQuote: 'Hanya penerbang bermental baja yang sanggup menembus kawah!',
    rarity: 'EPIC',
    unlockCondition: {
      type: 'best_score',
      target: 50,
      label: 'Reach Best Score 50',
    },
    pipeSkin: 'lava_stone',
    defaultWeather: 'ash',
    compatibleWeathers: ['ash', 'fog'],
    ambientSound: 'lava',
    isDarkWorld: true,
    skyTop: '#260B18',
    skyMid: '#7A1C1C',
    skyBottom: '#EA580C',
    celestialColor: '#FDBA74',
    celestialGlow: 'rgba(251, 146, 60, 0.68)',
    cloudColor: '#5B2333',
    cloudShade: 'rgba(30, 10, 20, 0.65)',
    farLayerColor: '#45151E',
    midLayerColor: '#2A0E16',
    accentHex: '#F97316',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
    ground: {
      topCapStart: '#4B282B',
      topCapEnd: '#2F191C',
      topStripe: '#F97316',
      topLip: '#DC2626',
      bodyTop: '#29171B',
      bodyMid: '#1D0F12',
      bodyBottom: '#14090B',
      speckDark: 'rgba(10, 4, 6, 0.5)',
      speckLight: 'rgba(251, 146, 60, 0.5)',
      outline: '#12070A',
      accentGlow: '#FB923C',
    },
  },
  {
    id: 'neon_city',
    order: 6,
    name: 'NEON CITY',
    subtitle: 'Metropolis Masa Depan',
    description: 'Terbang di kota masa depan.',
    unlockQuote: 'Lampu neon berpendar menyambut sang juara arena!',
    rarity: 'EPIC',
    unlockCondition: {
      type: 'tournaments_won',
      target: 3,
      label: 'Win 3 Tournaments',
    },
    pipeSkin: 'cyber_neon',
    defaultWeather: 'rain',
    compatibleWeathers: ['rain', 'fog', 'starry_night'],
    ambientSound: 'cyber',
    isDarkWorld: true,
    skyTop: '#0F0B2E',
    skyMid: '#2D1458',
    skyBottom: '#7E22CE',
    celestialColor: '#F472B6',
    celestialGlow: 'rgba(244, 114, 182, 0.55)',
    cloudColor: '#3B1E6D',
    cloudShade: 'rgba(22, 10, 48, 0.65)',
    farLayerColor: '#1E1445',
    midLayerColor: '#120C30',
    accentHex: '#22D3EE',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-800',
    ground: {
      topCapStart: '#1E293B',
      topCapEnd: '#0F172A',
      topStripe: '#22D3EE',
      topLip: '#EC4899',
      bodyTop: '#161B33',
      bodyMid: '#101326',
      bodyBottom: '#090B17',
      speckDark: 'rgba(5, 8, 22, 0.6)',
      speckLight: 'rgba(34, 211, 238, 0.45)',
      outline: '#090B17',
      accentGlow: '#22D3EE',
    },
  },
  {
    id: 'sky_kingdom',
    order: 7,
    name: 'SKY KINGDOM',
    subtitle: 'Istana Di Atas Awan',
    description: 'Langit tertinggi hanya untuk para legenda.',
    unlockQuote: 'Gerbang emas kerajaan langit resmi terbuka untukmu!',
    rarity: 'LEGENDARY',
    unlockCondition: {
      type: 'best_score',
      target: 100,
      label: 'Reach Best Score 100',
    },
    pipeSkin: 'sky_gold',
    defaultWeather: 'cloudy',
    compatibleWeathers: ['cloudy', 'sunny', 'wind'],
    ambientSound: 'heavenly',
    isDarkWorld: false,
    skyTop: '#2E8BFF',
    skyMid: '#7DD3FC',
    skyBottom: '#FEF3C7',
    celestialColor: '#FFFBEB',
    celestialGlow: 'rgba(253, 224, 71, 0.85)',
    cloudColor: '#FFFFFF',
    cloudShade: 'rgba(253, 230, 138, 0.52)',
    farLayerColor: '#BAE6FD',
    midLayerColor: '#E0F2FE',
    accentHex: '#F59E0B',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    ground: {
      topCapStart: '#FFFFFF',
      topCapEnd: '#FEF3C7',
      topStripe: '#FCD34D',
      topLip: '#F59E0B',
      bodyTop: '#F1F5F9',
      bodyMid: '#E2E8F0',
      bodyBottom: '#CBD5E1',
      speckDark: 'rgba(148, 163, 184, 0.28)',
      speckLight: 'rgba(255, 251, 235, 0.65)',
      outline: '#334155',
      accentGlow: '#FBBF24',
    },
  },
  {
    id: 'space_odyssey',
    order: 8,
    name: 'SPACE ODYSSEY',
    subtitle: 'Galaksi Tanpa Batas',
    description: 'Perjalanan terakhirmu menembus galaksi.',
    unlockQuote: 'Selamat datang di kosmos sejati, penjelajah legendaris!',
    rarity: 'MYTHIC',
    unlockCondition: {
      type: 'all_achievements',
      target: 6,
      label: 'Unlock All Achievements',
    },
    pipeSkin: 'space_metal',
    defaultWeather: 'nebula',
    compatibleWeathers: ['nebula', 'starry_night'],
    ambientSound: 'space',
    isDarkWorld: true,
    skyTop: '#06081A',
    skyMid: '#181342',
    skyBottom: '#311D6B',
    celestialColor: '#C4B5FD',
    celestialGlow: 'rgba(167, 139, 250, 0.58)',
    cloudColor: '#4C1D95',
    cloudShade: 'rgba(30, 27, 75, 0.6)',
    farLayerColor: '#251D59',
    midLayerColor: '#19143D',
    accentHex: '#A855F7',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    ground: {
      topCapStart: '#94A3B8',
      topCapEnd: '#64748B',
      topStripe: '#A855F7',
      topLip: '#38BDF8',
      bodyTop: '#334155',
      bodyMid: '#1E293B',
      bodyBottom: '#0F172A',
      speckDark: 'rgba(15, 23, 42, 0.5)',
      speckLight: 'rgba(192, 132, 252, 0.42)',
      outline: '#0B1120',
      accentGlow: '#38BDF8',
    },
  },
];

export const WORLD_MAP: ReadonlyMap<WorldId, WorldDefinition> = new Map(
  WORLD_REGISTRY.map((w) => [w.id, w])
);

export function getWorldById(id: string | null | undefined): WorldDefinition {
  if (id && WORLD_MAP.has(id as WorldId)) {
    return WORLD_MAP.get(id as WorldId)!;
  }
  return WORLD_REGISTRY[0];
}
