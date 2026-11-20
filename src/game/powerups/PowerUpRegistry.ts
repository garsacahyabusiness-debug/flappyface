export type PowerUpId =
  | 'shield'
  | 'second_chance'
  | 'slow_motion'
  | 'magnet'
  | 'score_boost'
  | 'feather';

export type PowerUpRarity = 'COMMON' | 'RARE' | 'EPIC';

export interface PowerUpDefinition {
  id: PowerUpId;
  name: string;
  icon: string;
  rarity: PowerUpRarity;
  description: string;
  spawnWeight: number;
  durationSec: number; // 0 = charge/until consumed
  bannerText: string;
  colorHex: string;
  glowRgba: string;
  badgeBg: string;
  badgeText: string;
}

export type CollectibleType = 'coin' | 'star' | 'gem';

export interface CollectibleDefinition {
  type: CollectibleType;
  name: string;
  icon: string;
  coinValue: number;
  gemValue: number;
  bonusScore: number;
  spawnWeight: number;
  radius: number;
  colorHex: string;
  accentHex: string;
}

export const POWER_UP_REGISTRY: readonly PowerUpDefinition[] = [
  {
    id: 'shield',
    name: 'SHIELD',
    icon: '🛡️',
    rarity: 'COMMON',
    description: 'Melindungi dari 1 kali tabrakan pipa atau batas arena.',
    spawnWeight: 26,
    durationSec: 0,
    bannerText: 'SHIELD ACTIVATED!',
    colorHex: '#38BDF8',
    glowRgba: 'rgba(56, 189, 248, 0.45)',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-800',
  },
  {
    id: 'second_chance',
    name: 'SECOND CHANCE',
    icon: '❤️',
    rarity: 'EPIC',
    description: 'Beri 1 kesempatan bangkit saat mengalami tabrakan fatal.',
    spawnWeight: 10,
    durationSec: 0,
    bannerText: 'SECOND CHANCE READY!',
    colorHex: '#FB7185',
    glowRgba: 'rgba(251, 113, 133, 0.48)',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
  },
  {
    id: 'slow_motion',
    name: 'SLOW MOTION',
    icon: '⏱️',
    rarity: 'RARE',
    description: 'Memperlambat laju pipa & dunia selama 5 detik.',
    spawnWeight: 18,
    durationSec: 5,
    bannerText: 'SLOW MOTION!',
    colorHex: '#A855F7',
    glowRgba: 'rgba(168, 85, 247, 0.42)',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
  },
  {
    id: 'magnet',
    name: 'MAGNET',
    icon: '🧲',
    rarity: 'RARE',
    description: 'Menarik Coin, Star, dan Gem di sekitar pemain selama 8 detik.',
    spawnWeight: 18,
    durationSec: 8,
    bannerText: 'MAGNET ACTIVE!',
    colorHex: '#F97316',
    glowRgba: 'rgba(249, 115, 22, 0.44)',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-800',
  },
  {
    id: 'score_boost',
    name: 'SCORE BOOST',
    icon: '⚡',
    rarity: 'EPIC',
    description: 'Gandakan hadiah collectible & bonus skor (x2) selama 10 detik.',
    spawnWeight: 13,
    durationSec: 10,
    bannerText: 'SCORE BOOST x2!',
    colorHex: '#FACC15',
    glowRgba: 'rgba(250, 204, 21, 0.48)',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
  },
  {
    id: 'feather',
    name: 'FEATHER',
    icon: '🪶',
    rarity: 'COMMON',
    description: 'Gravitasi lebih lembut dan kontrol jatuh stabil selama 6 detik.',
    spawnWeight: 22,
    durationSec: 6,
    bannerText: 'FEATHER MODE!',
    colorHex: '#34D399',
    glowRgba: 'rgba(52, 211, 153, 0.44)',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
  },
];

export const POWER_UP_MAP: ReadonlyMap<PowerUpId, PowerUpDefinition> = new Map(
  POWER_UP_REGISTRY.map((p) => [p.id, p])
);

export function getPowerUpById(id: PowerUpId): PowerUpDefinition {
  return POWER_UP_MAP.get(id) ?? POWER_UP_REGISTRY[0];
}

export const COLLECTIBLE_REGISTRY: readonly CollectibleDefinition[] = [
  {
    type: 'coin',
    name: 'COIN',
    icon: '🪙',
    coinValue: 1,
    gemValue: 0,
    bonusScore: 0,
    spawnWeight: 74,
    radius: 13,
    colorHex: '#FFD84D',
    accentHex: '#F59E0B',
  },
  {
    type: 'star',
    name: 'STAR',
    icon: '⭐',
    coinValue: 3,
    gemValue: 0,
    bonusScore: 2,
    spawnWeight: 19,
    radius: 14.5,
    colorHex: '#FDE047',
    accentHex: '#38BDF8',
  },
  {
    type: 'gem',
    name: 'GEM',
    icon: '💎',
    coinValue: 5,
    gemValue: 1,
    bonusScore: 3,
    spawnWeight: 7,
    radius: 14.5,
    colorHex: '#38BDF8',
    accentHex: '#EC4899',
  },
];

export const COLLECTIBLE_MAP: ReadonlyMap<CollectibleType, CollectibleDefinition> = new Map(
  COLLECTIBLE_REGISTRY.map((c) => [c.type, c])
);

export function getCollectibleDef(type: CollectibleType): CollectibleDefinition {
  return COLLECTIBLE_MAP.get(type) ?? COLLECTIBLE_REGISTRY[0];
}
