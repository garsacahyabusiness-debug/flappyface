/**
 * Standalone ES Module singleton implementation at js/missions/MissionManager.js.
 * Handles daily/weekly device-date mission resets, progression tracking events,
 * completion notification queue management, localStorage persistence, and reward wallet integration.
 */

const MISSIONS_STORAGE_KEY = 'flappy_face_missions';
const CURRENCY_STORAGE_KEY = 'flappy_face_currency';
const MISSIONS_STORAGE_VERSION = 1;
const CURRENCY_STORAGE_VERSION = 1;
const MAX_HISTORY_ENTRIES = 120;

const VALID_FRAMES = new Set([
  'default',
  'gold_champion',
  'perfect_wings',
  'cosmic_explorer',
  'streak_flame',
]);

export const DAILY_EASY_POOL = Object.freeze([
  {
    id: 'daily_easy_play_3',
    category: 'daily',
    difficulty: 'easy',
    title: 'Warm-Up Flight',
    description: 'Mainkan 3 game hari ini',
    icon: '🎮',
    target: 3,
    condition: { kind: 'play_games' },
    reward: { coins: 60, gems: 0, xp: 30 },
    exclusiveGroup: 'games',
  },
  {
    id: 'daily_easy_pipes_15',
    category: 'daily',
    difficulty: 'easy',
    title: 'Pipe Hopper',
    description: 'Lewati 15 pipa hari ini',
    icon: '🚧',
    target: 15,
    condition: { kind: 'pass_pipes' },
    reward: { coins: 75, gems: 1, xp: 35 },
    exclusiveGroup: 'pipes',
  },
  {
    id: 'daily_easy_score_5',
    category: 'daily',
    difficulty: 'easy',
    title: 'Quick Five',
    description: 'Capai skor 5 dalam 1 game solo',
    icon: '🎯',
    target: 5,
    condition: { kind: 'single_run_score', soloOnly: true },
    reward: { coins: 70, gems: 1, xp: 35 },
    exclusiveGroup: 'score',
  },
  {
    id: 'daily_easy_coins_10',
    category: 'daily',
    difficulty: 'easy',
    title: 'Pocket Change',
    description: 'Kumpulkan 10 Coin saat terbang',
    icon: '🪙',
    target: 10,
    condition: { kind: 'collect_coins' },
    reward: { coins: 85, gems: 1, xp: 40 },
    exclusiveGroup: 'coins',
    isEligible: (ctx) => ctx.collectiblesEnabled !== false,
  },
  {
    id: 'daily_easy_powerup_2',
    category: 'daily',
    difficulty: 'easy',
    title: 'Spark Picker',
    description: 'Gunakan 2 Power-Up hari ini',
    icon: '⚡',
    target: 2,
    condition: { kind: 'use_powerups' },
    reward: { coins: 80, gems: 1, xp: 40 },
    exclusiveGroup: 'powerups',
    isEligible: (ctx) => ctx.powerUpsEnabled !== false,
  },
  {
    id: 'daily_easy_valley_12',
    category: 'daily',
    difficulty: 'easy',
    title: 'Valley Breeze',
    description: 'Lewati 12 pipa di Green Valley',
    icon: '🌿',
    target: 12,
    condition: { kind: 'pass_pipes', worldId: 'green_valley' },
    reward: { coins: 80, gems: 1, xp: 40 },
    exclusiveGroup: 'world',
    isEligible: (ctx) => !ctx.unlockedWorldIds || ctx.unlockedWorldIds.includes('green_valley'),
  },
  {
    id: 'daily_easy_classic_2',
    category: 'daily',
    difficulty: 'easy',
    title: 'Classic Wings',
    description: 'Mainkan 2 game dengan Classic Bird',
    icon: '🐤',
    target: 2,
    condition: { kind: 'play_games', characterId: 'classic_bird' },
    reward: { coins: 70, gems: 1, xp: 35 },
    exclusiveGroup: 'character',
    isEligible: (ctx) => !ctx.unlockedCharacterIds || ctx.unlockedCharacterIds.includes('classic_bird'),
  },
  {
    id: 'daily_easy_quick_match',
    category: 'daily',
    difficulty: 'easy',
    title: 'Friendly Duel',
    description: 'Selesaikan 1 Quick Match 2 Player',
    icon: '🤝',
    target: 1,
    condition: { kind: 'play_multiplayer', matchFormat: 'quick' },
    reward: { coins: 95, gems: 2, xp: 45 },
    exclusiveGroup: 'multiplayer',
  },
]);

export const DAILY_MEDIUM_POOL = Object.freeze([
  {
    id: 'daily_med_play_5',
    category: 'daily',
    difficulty: 'medium',
    title: 'Sky Regular',
    description: 'Mainkan 5 game hari ini',
    icon: '🕹️',
    target: 5,
    condition: { kind: 'play_games' },
    reward: { coins: 140, gems: 2, xp: 65 },
    exclusiveGroup: 'games',
  },
  {
    id: 'daily_med_pipes_40',
    category: 'daily',
    difficulty: 'medium',
    title: 'Pipe Sprinter',
    description: 'Lewati 40 pipa hari ini',
    icon: '🚀',
    target: 40,
    condition: { kind: 'pass_pipes' },
    reward: { coins: 165, gems: 3, xp: 75 },
    exclusiveGroup: 'pipes',
  },
  {
    id: 'daily_med_score_12',
    category: 'daily',
    difficulty: 'medium',
    title: 'Steady Pilot',
    description: 'Capai skor 12 dalam 1 game solo',
    icon: '🏅',
    target: 12,
    condition: { kind: 'single_run_score', soloOnly: true },
    reward: { coins: 185, gems: 3, xp: 80 },
    exclusiveGroup: 'score',
  },
  {
    id: 'daily_med_coins_30',
    category: 'daily',
    difficulty: 'medium',
    title: 'Gold Sweeper',
    description: 'Kumpulkan 30 Coin hari ini',
    icon: '💰',
    target: 30,
    condition: { kind: 'collect_coins' },
    reward: { coins: 175, gems: 3, xp: 80 },
    exclusiveGroup: 'coins',
    isEligible: (ctx) => ctx.collectiblesEnabled !== false,
  },
  {
    id: 'daily_med_powerup_5',
    category: 'daily',
    difficulty: 'medium',
    title: 'Boost Collector',
    description: 'Gunakan 5 Power-Up hari ini',
    icon: '🔋',
    target: 5,
    condition: { kind: 'use_powerups' },
    reward: { coins: 190, gems: 4, xp: 85 },
    exclusiveGroup: 'powerups',
    isEligible: (ctx) => ctx.powerUpsEnabled !== false,
  },
  {
    id: 'daily_med_stars_2',
    category: 'daily',
    difficulty: 'medium',
    title: 'Star Catcher',
    description: 'Kumpulkan 2 Star saat terbang',
    icon: '⭐',
    target: 2,
    condition: { kind: 'collect_stars' },
    reward: { coins: 210, gems: 4, xp: 90 },
    exclusiveGroup: 'coins',
    isEligible: (ctx) => ctx.collectiblesEnabled !== false,
  },
  {
    id: 'daily_med_bonus_world',
    category: 'daily',
    difficulty: 'medium',
    title: 'World Traveler',
    description: 'Mainkan 3 game di World selain Green Valley',
    icon: '🗺️',
    target: 3,
    condition: { kind: 'play_games', nonStarterWorld: true },
    reward: { coins: 200, gems: 4, xp: 90 },
    exclusiveGroup: 'world',
    isEligible: (ctx) =>
      Array.isArray(ctx.unlockedWorldIds) && ctx.unlockedWorldIds.some((id) => id !== 'green_valley'),
  },
  {
    id: 'daily_med_rare_char',
    category: 'daily',
    difficulty: 'medium',
    title: 'Rare Flyer',
    description: 'Lewati 25 pipa pakai karakter Rare+',
    icon: '✨',
    target: 25,
    condition: { kind: 'pass_pipes', minRarity: 'RARE' },
    reward: { coins: 220, gems: 4, xp: 95 },
    exclusiveGroup: 'character',
    isEligible: (ctx) => Boolean(ctx.hasRareOrHigherCharacter),
  },
  {
    id: 'daily_med_no_shield_10',
    category: 'daily',
    difficulty: 'medium',
    title: 'Bare Wings',
    description: 'Capai skor 10 solo tanpa menggunakan Shield',
    icon: '🪽',
    target: 10,
    condition: { kind: 'single_run_score', soloOnly: true, noShield: true },
    reward: { coins: 230, gems: 5, xp: 100 },
    exclusiveGroup: 'score',
  },
]);

export const DAILY_HARD_POOL = Object.freeze([
  {
    id: 'daily_hard_score_20',
    category: 'daily',
    difficulty: 'hard',
    title: 'Ace Pilot',
    description: 'Capai skor 20 dalam 1 game solo',
    icon: '🏆',
    target: 20,
    condition: { kind: 'single_run_score', soloOnly: true },
    reward: { coins: 320, gems: 6, xp: 140 },
    exclusiveGroup: 'score',
  },
  {
    id: 'daily_hard_pipes_80',
    category: 'daily',
    difficulty: 'hard',
    title: 'Pipe Marathon',
    description: 'Lewati 80 pipa hari ini',
    icon: '🔥',
    target: 80,
    condition: { kind: 'pass_pipes' },
    reward: { coins: 340, gems: 6, xp: 150 },
    exclusiveGroup: 'pipes',
  },
  {
    id: 'daily_hard_coins_60',
    category: 'daily',
    difficulty: 'hard',
    title: 'Treasure Dash',
    description: 'Kumpulkan 60 Coin hari ini',
    icon: '💎',
    target: 60,
    condition: { kind: 'collect_coins' },
    reward: { coins: 360, gems: 7, xp: 155 },
    exclusiveGroup: 'coins',
    isEligible: (ctx) => ctx.collectiblesEnabled !== false,
  },
  {
    id: 'daily_hard_play_10',
    category: 'daily',
    difficulty: 'hard',
    title: 'Endurance Flyer',
    description: 'Selesaikan 10 game hari ini',
    icon: '🛫',
    target: 10,
    condition: { kind: 'play_games' },
    reward: { coins: 290, gems: 5, xp: 130 },
    exclusiveGroup: 'games',
  },
  {
    id: 'daily_hard_gems_2',
    category: 'daily',
    difficulty: 'hard',
    title: 'Gem Seeker',
    description: 'Kumpulkan 2 Gem saat terbang',
    icon: '💠',
    target: 2,
    condition: { kind: 'collect_gems' },
    reward: { coins: 380, gems: 8, xp: 165 },
    exclusiveGroup: 'coins',
    isEligible: (ctx) => ctx.collectiblesEnabled !== false,
  },
  {
    id: 'daily_hard_win_tournament',
    category: 'daily',
    difficulty: 'hard',
    title: 'Tournament Victor',
    description: 'Menangkan 1 Tournament BO3 / BO5',
    icon: '👑',
    target: 1,
    condition: { kind: 'win_matches', matchFormat: 'tournament' },
    reward: { coins: 420, gems: 9, xp: 180 },
    exclusiveGroup: 'multiplayer',
  },
  {
    id: 'daily_hard_no_revive_18',
    category: 'daily',
    difficulty: 'hard',
    title: 'One Life Hero',
    description: 'Capai skor 18 solo tanpa Second Chance',
    icon: '🛡️',
    target: 18,
    condition: { kind: 'single_run_score', soloOnly: true, noSecondChance: true },
    reward: { coins: 400, gems: 8, xp: 170 },
    exclusiveGroup: 'score',
  },
  {
    id: 'daily_hard_meta_2',
    category: 'daily',
    difficulty: 'hard',
    title: 'Daily Finisher',
    description: 'Selesaikan 2 Daily Mission lainnya hari ini',
    icon: '📋',
    target: 2,
    condition: { kind: 'complete_daily_missions' },
    reward: { coins: 450, gems: 10, xp: 190 },
    exclusiveGroup: 'meta',
  },
]);

export const WEEKLY_MISSIONS = Object.freeze([
  {
    id: 'weekly_play_25',
    category: 'weekly',
    difficulty: 'weekly',
    title: 'Sky Veteran',
    description: 'Mainkan 25 game minggu ini',
    icon: '🛫',
    target: 25,
    condition: { kind: 'play_games' },
    reward: { coins: 350, gems: 10, xp: 250 },
  },
  {
    id: 'weekly_pipes_200',
    category: 'weekly',
    difficulty: 'weekly',
    title: 'Pipe Conqueror',
    description: 'Lewati 200 pipa minggu ini',
    icon: '🌪️',
    target: 200,
    condition: { kind: 'pass_pipes' },
    reward: { coins: 500, gems: 14, xp: 320 },
  },
  {
    id: 'weekly_wins_5',
    category: 'weekly',
    difficulty: 'weekly',
    title: 'Arena Striker',
    description: 'Menangkan 5 match (2P / Tournament)',
    icon: '⚔️',
    target: 5,
    condition: { kind: 'win_matches', matchFormat: 'any' },
    reward: { coins: 650, gems: 18, xp: 400 },
  },
  {
    id: 'weekly_coins_250',
    category: 'weekly',
    difficulty: 'weekly',
    title: 'Golden Vault',
    description: 'Kumpulkan 250 Coin minggu ini',
    icon: '🏦',
    target: 250,
    condition: { kind: 'collect_coins' },
    reward: { coins: 600, gems: 15, xp: 360 },
  },
  {
    id: 'weekly_score_300',
    category: 'weekly',
    difficulty: 'weekly',
    title: 'Legend Points',
    description: 'Kumpulkan total akumulasi skor 300',
    icon: '🌟',
    target: 300,
    condition: { kind: 'cumulative_score' },
    reward: { coins: 900, gems: 25, xp: 500, skinId: 'neon', badge: 'WEEKLY ACE' },
  },
]);

export const SPECIAL_CHALLENGES = Object.freeze([
  {
    id: 'special_perfect_flyer',
    category: 'special',
    difficulty: 'special',
    title: 'PERFECT FLYER',
    description: 'Lewati 15 pipa beruntun dalam 1 run tanpa tabrakan',
    icon: '🕊️',
    target: 15,
    condition: { kind: 'single_run_score', soloOnly: true, noCollision: true },
    reward: {
      coins: 500,
      gems: 12,
      xp: 350,
      avatarFrame: 'perfect_wings',
      title: 'SKY PRECISION',
    },
  },
  {
    id: 'special_coin_hunter',
    category: 'special',
    difficulty: 'special',
    title: 'COIN HUNTER',
    description: 'Kumpulkan 100 Coin dari penerbanganmu',
    icon: '🪙',
    target: 100,
    condition: { kind: 'collect_coins' },
    reward: {
      coins: 400,
      gems: 10,
      xp: 300,
      badge: 'COIN HUNTER',
    },
  },
  {
    id: 'special_power_master',
    category: 'special',
    difficulty: 'special',
    title: 'POWER MASTER',
    description: 'Gunakan keenam jenis Power-Up berbeda (Shield, Revive, Slow-Mo, Magnet, Boost, Feather)',
    icon: '⚡',
    target: 6,
    condition: { kind: 'distinct_powerups' },
    reward: {
      coins: 600,
      gems: 15,
      xp: 450,
      skinId: 'retro_pixel',
      title: 'POWER MASTER',
    },
  },
  {
    id: 'special_world_explorer',
    category: 'special',
    difficulty: 'special',
    title: 'WORLD EXPLORER',
    description: 'Terbang di 5 World yang berbeda',
    icon: '🌍',
    target: 5,
    condition: { kind: 'distinct_worlds' },
    reward: {
      coins: 700,
      gems: 18,
      xp: 500,
      avatarFrame: 'cosmic_explorer',
      badge: 'GLOBAL FLYER',
    },
  },
  {
    id: 'special_champion',
    category: 'special',
    difficulty: 'special',
    title: 'CHAMPION',
    description: 'Menangkan 3 Tournament (Best of 3 / Best of 5)',
    icon: '🏆',
    target: 3,
    condition: { kind: 'win_matches', matchFormat: 'tournament' },
    reward: {
      coins: 800,
      gems: 22,
      xp: 600,
      avatarFrame: 'gold_champion',
      title: 'ARENA CHAMPION',
    },
  },
  {
    id: 'special_survivor',
    category: 'special',
    difficulty: 'special',
    title: 'SURVIVOR',
    description: 'Capai skor 20 solo tanpa menggunakan Second Chance',
    icon: '❤️‍🔥',
    target: 20,
    condition: { kind: 'single_run_score', soloOnly: true, noSecondChance: true },
    reward: {
      coins: 450,
      gems: 12,
      xp: 350,
      badge: 'IRON WINGS',
    },
  },
]);

export const STREAK_MILESTONES = Object.freeze([
  { days: 3, label: '3-Day Spark', reward: { coins: 100, gems: 2, xp: 100 } },
  { days: 5, label: '5-Day Rising Flyer', reward: { coins: 250, gems: 5, xp: 200 } },
  {
    days: 7,
    label: '7-Day Sky Habit',
    reward: { coins: 500, gems: 10, xp: 350, avatarFrame: 'streak_flame', badge: '7D STREAK' },
  },
  { days: 14, label: '14-Day Galactic Streak', reward: { coins: 750, gems: 20, xp: 600, skinId: 'galaxy' } },
  {
    days: 30,
    label: '30-Day Eternal Legend',
    reward: { coins: 1500, gems: 40, xp: 1200, skinId: 'rainbow', title: 'ETERNAL FLYER' },
  },
]);

const ALL_DEFINITIONS_MAP = new Map([
  ...DAILY_EASY_POOL.map((d) => [d.id, d]),
  ...DAILY_MEDIUM_POOL.map((d) => [d.id, d]),
  ...DAILY_HARD_POOL.map((d) => [d.id, d]),
  ...WEEKLY_MISSIONS.map((d) => [d.id, d]),
  ...SPECIAL_CHALLENGES.map((d) => [d.id, d]),
]);

const pad2 = (n) => String(n).padStart(2, '0');

export function getLocalDateKey(nowMs = Date.now()) {
  const d = new Date(nowMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getLocalWeekStartDate(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diffToMonday, 0, 0, 0, 0);
}

export function getLocalWeekKey(nowMs = Date.now()) {
  const monday = getLocalWeekStartDate(nowMs);
  return `W:${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;
}

export function getMsUntilNextDailyReset(nowMs = Date.now()) {
  const d = new Date(nowMs);
  const nextMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, nextMidnight.getTime() - nowMs);
}

export function getMsUntilNextWeeklyReset(nowMs = Date.now()) {
  const currentMonday = getLocalWeekStartDate(nowMs);
  const nextMonday = new Date(
    currentMonday.getFullYear(),
    currentMonday.getMonth(),
    currentMonday.getDate() + 7,
    0,
    0,
    0,
    0
  );
  return Math.max(0, nextMonday.getTime() - nowMs);
}

export function diffCalendarDays(prevDateKey, currDateKey) {
  const parse = (k) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(k));
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const ms = Date.UTC(year, month, day);
    const verify = new Date(ms);
    if (
      verify.getUTCFullYear() !== year ||
      verify.getUTCMonth() !== month ||
      verify.getUTCDate() !== day
    ) {
      return null;
    }
    return ms;
  };
  const a = parse(prevDateKey);
  const b = parse(currDateKey);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86_400_000);
}

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicPick(items, seedKey) {
  if (!items || items.length === 0) return null;
  const rng = mulberry32(hashString(seedKey));
  const idx = Math.floor(rng() * items.length);
  return items[idx] ?? items[0];
}

function rarityRank(rarity) {
  switch (rarity) {
    case 'COMMON':
      return 1;
    case 'UNCOMMON':
      return 2;
    case 'RARE':
      return 3;
    case 'EPIC':
      return 4;
    case 'LEGENDARY':
      return 5;
    case 'MYTHIC':
      return 6;
    default:
      return 0;
  }
}

function getStorage() {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Restricted environment
  }
  return null;
}

function cloneMission(m) {
  return {
    ...m,
    reward: { ...m.reward },
    metaProgress: m.metaProgress ? [...m.metaProgress] : undefined,
  };
}

function createInstanceFromDef(def, periodKey) {
  return {
    id: def.id,
    category: def.category,
    difficulty: def.difficulty,
    title: def.title,
    description: def.description,
    icon: def.icon,
    target: def.target,
    progress: 0,
    completed: false,
    claimed: false,
    completedAt: null,
    claimedAt: null,
    periodKey,
    reward: { ...def.reward },
    metaProgress:
      def.condition.kind === 'distinct_powerups' || def.condition.kind === 'distinct_worlds'
        ? []
        : undefined,
  };
}

function defaultStreakState() {
  return {
    currentStreak: 0,
    bestStreak: 0,
    lastClaimDateKey: null,
    claimedMilestones: [],
    recentClaimDates: [],
  };
}

function defaultStatsSummary() {
  return {
    totalCompleted: 0,
    totalClaimed: 0,
    totalCoinsEarned: 0,
    totalGemsEarned: 0,
  };
}

function defaultCosmeticsState() {
  return {
    titles: [],
    badges: [],
    frames: ['default'],
    equippedTitle: null,
    equippedFrame: 'default',
  };
}

function defaultWalletAwardEventOnce(eventId, coins, gems) {
  const storage = getStorage();
  if (!storage || !eventId) return false;

  let wallet = {
    version: CURRENCY_STORAGE_VERSION,
    coins: 0,
    gems: 0,
    stats: {
      totalCoinsCollected: 0,
      totalGemsCollected: 0,
      totalStarsCollected: 0,
      totalPowerUpsCollected: 0,
      shieldSaves: 0,
      revivesUsed: 0,
    },
    claimedEvents: [],
  };

  try {
    const raw = storage.getItem(CURRENCY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        wallet = {
          version: CURRENCY_STORAGE_VERSION,
          coins: typeof parsed.coins === 'number' && Number.isFinite(parsed.coins) ? Math.max(0, Math.floor(parsed.coins)) : 0,
          gems: typeof parsed.gems === 'number' && Number.isFinite(parsed.gems) ? Math.max(0, Math.floor(parsed.gems)) : 0,
          stats:
            parsed.stats && typeof parsed.stats === 'object'
              ? { ...wallet.stats, ...parsed.stats }
              : wallet.stats,
          claimedEvents: Array.isArray(parsed.claimedEvents)
            ? parsed.claimedEvents.filter((id) => typeof id === 'string')
            : [],
        };
      }
    }
  } catch {
    // Recover from corrupt wallet storage
  }

  if (wallet.claimedEvents.includes(eventId)) {
    return false;
  }

  wallet.claimedEvents = [...wallet.claimedEvents, eventId].slice(-500);
  wallet.coins += Math.max(0, Math.floor(coins || 0));
  wallet.gems += Math.max(0, Math.floor(gems || 0));

  try {
    storage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(wallet));
  } catch {
    return false;
  }
  return true;
}

function readWalletBalances() {
  const storage = getStorage();
  if (!storage) return { coins: 0, gems: 0 };
  try {
    const raw = storage.getItem(CURRENCY_STORAGE_KEY);
    if (!raw) return { coins: 0, gems: 0 };
    const parsed = JSON.parse(raw);
    return {
      coins: typeof parsed?.coins === 'number' && Number.isFinite(parsed.coins) ? Math.max(0, Math.floor(parsed.coins)) : 0,
      gems: typeof parsed?.gems === 'number' && Number.isFinite(parsed.gems) ? Math.max(0, Math.floor(parsed.gems)) : 0,
    };
  } catch {
    return { coins: 0, gems: 0 };
  }
}

class MissionManager {
  /** @type {MissionManager | null} */
  static #instance = null;

  #nowProvider = () => Date.now();
  #eligibilityProvider = () => ({
    unlockedWorldIds: ['green_valley'],
    unlockedCharacterIds: ['classic_bird', 'chicky'],
    hasRareOrHigherCharacter: false,
    powerUpsEnabled: true,
    collectiblesEnabled: true,
  });
  #walletAdapter = {
    awardEventOnce: defaultWalletAwardEventOnce,
    getBalance: readWalletBalances,
  };

  dailyPeriodKey = getLocalDateKey();
  weeklyPeriodKey = getLocalWeekKey();
  dailyMissions = [];
  weeklyMissions = [];
  specialMissions = [];
  history = [];
  streak = defaultStreakState();
  stats = defaultStatsSummary();
  cosmetics = defaultCosmeticsState();
  claimedRewardKeys = new Set();
  completionQueue = [];

  #listeners = new Set();
  #notificationListeners = new Set();

  static getInstance() {
    if (!MissionManager.#instance) {
      MissionManager.#instance = new MissionManager();
    }
    return MissionManager.#instance;
  }

  constructor() {
    if (MissionManager.#instance) {
      return MissionManager.#instance;
    }
    MissionManager.#instance = this;
    this.reloadFromStorage();
  }

  configure(options = {}) {
    if (typeof options.nowProvider === 'function') {
      this.#nowProvider = options.nowProvider;
    }
    if (typeof options.eligibilityProvider === 'function') {
      this.#eligibilityProvider = options.eligibilityProvider;
    }
    if (options.walletAdapter && typeof options.walletAdapter.awardEventOnce === 'function') {
      this.#walletAdapter = {
        awardEventOnce: options.walletAdapter.awardEventOnce,
        getBalance:
          typeof options.walletAdapter.getBalance === 'function'
            ? options.walletAdapter.getBalance
            : readWalletBalances,
      };
    }
  }

  reloadFromStorage() {
    this.dailyMissions = [];
    this.weeklyMissions = [];
    this.specialMissions = [];
    this.history = [];
    this.streak = defaultStreakState();
    this.stats = defaultStatsSummary();
    this.cosmetics = defaultCosmeticsState();
    this.claimedRewardKeys.clear();
    this.completionQueue = [];

    const now = this.#nowProvider();
    this.dailyPeriodKey = getLocalDateKey(now);
    this.weeklyPeriodKey = getLocalWeekKey(now);

    this.#load();
    this.ensureCurrentPeriods(now, true);
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.#listeners.delete(listener);
    };
  }

  subscribeNotifications(listener) {
    this.#notificationListeners.add(listener);
    return () => {
      this.#notificationListeners.delete(listener);
    };
  }

  getWalletBalance() {
    return this.#walletAdapter.getBalance();
  }

  getCompletionQueue() {
    return this.completionQueue.map((item) => ({ ...item, reward: { ...item.reward } }));
  }

  peekNextCompletion() {
    const first = this.completionQueue[0];
    return first ? { ...first, reward: { ...first.reward } } : null;
  }

  consumeCompletionNotification(notificationId) {
    if (this.completionQueue.length === 0) return null;
    if (!notificationId) {
      const shifted = this.completionQueue.shift();
      this.#notify();
      return shifted ?? null;
    }
    const idx = this.completionQueue.findIndex((n) => n.id === notificationId);
    if (idx === -1) return null;
    const [removed] = this.completionQueue.splice(idx, 1);
    this.#notify();
    return removed ?? null;
  }

  clearCompletionQueue() {
    this.completionQueue = [];
    this.#notify();
  }

  getSnapshot() {
    this.ensureCurrentPeriods(this.#nowProvider(), true);
    const unclaimedDaily = this.dailyMissions.filter((m) => m.completed && !m.claimed).length;
    const unclaimedWeekly = this.weeklyMissions.filter((m) => m.completed && !m.claimed).length;
    const unclaimedSpecial = this.specialMissions.filter((m) => m.completed && !m.claimed).length;

    return {
      dailyPeriodKey: this.dailyPeriodKey,
      weeklyPeriodKey: this.weeklyPeriodKey,
      dailyMissions: this.dailyMissions.map(cloneMission),
      weeklyMissions: this.weeklyMissions.map(cloneMission),
      specialMissions: this.specialMissions.map(cloneMission),
      history: this.history.map((h) => ({ ...h, reward: { ...h.reward } })),
      streak: {
        ...this.streak,
        claimedMilestones: [...this.streak.claimedMilestones],
        recentClaimDates: [...this.streak.recentClaimDates],
      },
      stats: { ...this.stats },
      cosmetics: {
        titles: [...this.cosmetics.titles],
        badges: [...this.cosmetics.badges],
        frames: [...this.cosmetics.frames],
        equippedTitle: this.cosmetics.equippedTitle,
        equippedFrame: this.cosmetics.equippedFrame,
      },
      unclaimed: {
        daily: unclaimedDaily,
        weekly: unclaimedWeekly,
        special: unclaimedSpecial,
        total: unclaimedDaily + unclaimedWeekly + unclaimedSpecial,
      },
      completionQueueCount: this.completionQueue.length,
      nowMs: this.#nowProvider(),
    };
  }

  ensureCurrentPeriods(nowMs = this.#nowProvider(), saveIfChanged = true) {
    const expectedDailyKey = getLocalDateKey(nowMs);
    const expectedWeeklyKey = getLocalWeekKey(nowMs);
    let changed = false;

    if (this.dailyPeriodKey !== expectedDailyKey || this.dailyMissions.length === 0) {
      this.dailyPeriodKey = expectedDailyKey;
      this.dailyMissions = this.#generateDailyMissions(expectedDailyKey);
      changed = true;
    }

    if (this.weeklyPeriodKey !== expectedWeeklyKey || this.weeklyMissions.length === 0) {
      this.weeklyPeriodKey = expectedWeeklyKey;
      this.weeklyMissions = WEEKLY_MISSIONS.map((def) =>
        createInstanceFromDef(def, expectedWeeklyKey)
      );
      changed = true;
    }

    if (this.specialMissions.length === 0) {
      this.specialMissions = SPECIAL_CHALLENGES.map((def) =>
        createInstanceFromDef(def, 'permanent')
      );
      changed = true;
    }

    if (this.streak.lastClaimDateKey && this.streak.currentStreak > 0) {
      const gap = diffCalendarDays(this.streak.lastClaimDateKey, expectedDailyKey);
      if (gap !== null && gap >= 2) {
        this.streak.currentStreak = 0;
        changed = true;
      }
    }

    if (changed && saveIfChanged) {
      this.#save();
    }
    return changed;
  }

  #generateDailyMissions(dateKey) {
    const ctx = this.#eligibilityProvider();
    const usedGroups = new Set();

    const pickFromPool = (pool, tierKey) => {
      const eligible = pool.filter(
        (d) =>
          (!d.isEligible || d.isEligible(ctx)) &&
          (!d.exclusiveGroup || !usedGroups.has(d.exclusiveGroup))
      );
      const fallbackEligible = pool.filter((d) => !d.isEligible || d.isEligible(ctx));
      const candidates =
        eligible.length > 0 ? eligible : fallbackEligible.length > 0 ? fallbackEligible : pool;
      const chosen = deterministicPick(candidates, `${dateKey}:${tierKey}`) ?? pool[0];
      if (chosen.exclusiveGroup) {
        usedGroups.add(chosen.exclusiveGroup);
      }
      return chosen;
    };

    return [
      createInstanceFromDef(pickFromPool(DAILY_EASY_POOL, 'easy'), dateKey),
      createInstanceFromDef(pickFromPool(DAILY_MEDIUM_POOL, 'medium'), dateKey),
      createInstanceFromDef(pickFromPool(DAILY_HARD_POOL, 'hard'), dateKey),
    ];
  }

  trackEvent(event) {
    return this.emitEvent(event);
  }

  emitEvent(event) {
    if (!event || typeof event.type !== 'string') return [];
    const now = typeof event.timestamp === 'number' ? event.timestamp : this.#nowProvider();
    this.ensureCurrentPeriods(now, false);

    const allLists = [this.dailyMissions, this.weeklyMissions, this.specialMissions];
    const newlyCompleted = [];
    let dirty = false;

    for (const list of allLists) {
      for (const mission of list) {
        if (mission.completed) continue;
        const def = ALL_DEFINITIONS_MAP.get(mission.id);
        if (!def) continue;

        const prevProgress = mission.progress;
        const nextProgress = this.#evaluateMissionProgress(mission, def, event);

        if (nextProgress > prevProgress) {
          mission.progress = Math.min(mission.target, nextProgress);
          dirty = true;
          if (mission.progress >= mission.target && !mission.completed) {
            this.#markMissionCompleted(mission, now);
            newlyCompleted.push(cloneMission(mission));
          }
        }
      }
    }

    if (newlyCompleted.some((m) => m.category === 'daily')) {
      const dailyMetaDone = this.#recalculateDailyMetaMissions(now);
      newlyCompleted.push(...dailyMetaDone);
    }

    if (dirty || newlyCompleted.length > 0) {
      this.#save();
      this.#notify();
    }

    for (const done of newlyCompleted) {
      this.#enqueueNotification(done);
    }

    return newlyCompleted;
  }

  #evaluateMissionProgress(mission, def, event) {
    const cond = def.condition;
    const isSolo = !event.mode || event.mode === 'solo';

    switch (cond.kind) {
      case 'play_games': {
        if (event.type !== 'game_finished') return mission.progress;
        if (cond.soloOnly && !isSolo) return mission.progress;
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        if (cond.nonStarterWorld && (!event.worldId || event.worldId === 'green_valley')) {
          return mission.progress;
        }
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;
        if (cond.minRarity && rarityRank(event.characterRarity) < rarityRank(cond.minRarity)) {
          return mission.progress;
        }
        return mission.progress + 1;
      }

      case 'pass_pipes': {
        if (event.type !== 'pipe_passed') return mission.progress;
        if (cond.soloOnly && !isSolo) return mission.progress;
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        if (cond.nonStarterWorld && (!event.worldId || event.worldId === 'green_valley')) {
          return mission.progress;
        }
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;
        if (cond.minRarity && rarityRank(event.characterRarity) < rarityRank(cond.minRarity)) {
          return mission.progress;
        }
        const inc = Math.max(1, Math.floor(event.amount ?? 1));
        return mission.progress + inc;
      }

      case 'single_run_score': {
        if (event.type !== 'score_reached' && event.type !== 'game_finished') {
          return mission.progress;
        }
        if (cond.soloOnly && !isSolo) return mission.progress;
        if (cond.noCollision && event.collidedThisRun) return mission.progress;
        if (cond.noShield && event.usedShieldThisRun) return mission.progress;
        if (cond.noSecondChance && event.usedSecondChanceThisRun) return mission.progress;
        if (cond.worldId && event.worldId !== cond.worldId) return mission.progress;
        if (cond.characterId && event.characterId !== cond.characterId) return mission.progress;
        const score = Math.max(0, Math.floor(event.score ?? 0));
        return Math.max(mission.progress, Math.min(mission.target, score));
      }

      case 'cumulative_score': {
        if (event.type !== 'game_finished') return mission.progress;
        if (cond.soloOnly && !isSolo) return mission.progress;
        const score = Math.max(0, Math.floor(event.score ?? 0));
        return mission.progress + score;
      }

      case 'collect_coins': {
        if (event.type !== 'coin_collected') return mission.progress;
        const amount = Math.max(0, Math.floor(event.amount ?? 0));
        return mission.progress + amount;
      }

      case 'collect_stars': {
        if (event.type !== 'star_collected') return mission.progress;
        const amount = Math.max(1, Math.floor(event.amount ?? 1));
        return mission.progress + amount;
      }

      case 'collect_gems': {
        if (event.type !== 'gem_collected') return mission.progress;
        const amount = Math.max(0, Math.floor(event.amount ?? 0));
        return mission.progress + amount;
      }

      case 'use_powerups': {
        if (event.type !== 'powerup_used') return mission.progress;
        const amount = Math.max(1, Math.floor(event.amount ?? 1));
        return mission.progress + amount;
      }

      case 'distinct_powerups': {
        if (event.type !== 'powerup_used' || !event.powerUpId) return mission.progress;
        if (!mission.metaProgress) mission.metaProgress = [];
        if (!mission.metaProgress.includes(event.powerUpId)) {
          mission.metaProgress.push(event.powerUpId);
        }
        return mission.metaProgress.length;
      }

      case 'distinct_worlds': {
        if (
          (event.type !== 'world_played' && event.type !== 'game_finished') ||
          !event.worldId
        ) {
          return mission.progress;
        }
        if (!mission.metaProgress) mission.metaProgress = [];
        if (!mission.metaProgress.includes(event.worldId)) {
          mission.metaProgress.push(event.worldId);
        }
        return mission.metaProgress.length;
      }

      case 'play_multiplayer': {
        if (event.type !== 'multiplayer_played') return mission.progress;
        if (cond.matchFormat === 'quick' && event.mode !== 'quick') return mission.progress;
        if (cond.matchFormat === 'tournament' && event.mode !== 'bo3' && event.mode !== 'bo5') {
          return mission.progress;
        }
        return mission.progress + 1;
      }

      case 'win_matches': {
        if (event.type !== 'match_won' && event.type !== 'tournament_won') {
          return mission.progress;
        }
        if (event.winner === 'draw') return mission.progress;
        const isTournament =
          event.type === 'tournament_won' || event.mode === 'bo3' || event.mode === 'bo5';
        if (cond.matchFormat === 'tournament' && !isTournament) return mission.progress;
        if (cond.matchFormat === 'quick' && isTournament) return mission.progress;
        return mission.progress + 1;
      }

      case 'complete_daily_missions':
      default:
        return mission.progress;
    }
  }

  #recalculateDailyMetaMissions(now) {
    const newlyCompleted = [];
    for (const mission of this.dailyMissions) {
      if (mission.completed) continue;
      const def = ALL_DEFINITIONS_MAP.get(mission.id);
      if (!def || def.condition.kind !== 'complete_daily_missions') continue;

      const otherCompletedCount = this.dailyMissions.filter(
        (m) => m.id !== mission.id && m.completed
      ).length;
      if (otherCompletedCount > mission.progress) {
        mission.progress = Math.min(mission.target, otherCompletedCount);
        if (mission.progress >= mission.target) {
          this.#markMissionCompleted(mission, now);
          newlyCompleted.push(cloneMission(mission));
        }
      }
    }
    return newlyCompleted;
  }

  #markMissionCompleted(mission, now) {
    mission.completed = true;
    mission.completedAt = now;
    this.stats.totalCompleted += 1;

    const historyId = `${mission.periodKey}:${mission.id}`;
    if (!this.history.some((h) => h.id === historyId)) {
      this.history = [
        {
          id: historyId,
          missionId: mission.id,
          title: mission.title,
          category: mission.category,
          difficulty: mission.difficulty,
          icon: mission.icon,
          periodKey: mission.periodKey,
          completedAt: now,
          claimedAt: null,
          reward: { ...mission.reward },
          status: 'completed',
        },
        ...this.history,
      ].slice(0, MAX_HISTORY_ENTRIES);
    }
  }

  #enqueueNotification(mission) {
    const note = {
      id: `${mission.periodKey}:${mission.id}:${mission.completedAt ?? Date.now()}`,
      missionId: mission.id,
      category: mission.category,
      difficulty: mission.difficulty,
      title: mission.title,
      icon: mission.icon,
      reward: { ...mission.reward },
    };
    if (!this.completionQueue.some((item) => item.id === note.id)) {
      this.completionQueue.push(note);
    }
    for (const listener of this.#notificationListeners) {
      listener(note);
    }
  }

  claimReward(missionId) {
    const now = this.#nowProvider();
    this.ensureCurrentPeriods(now, false);

    const mission =
      this.dailyMissions.find((m) => m.id === missionId) ??
      this.weeklyMissions.find((m) => m.id === missionId) ??
      this.specialMissions.find((m) => m.id === missionId);

    if (!mission || !mission.completed || mission.claimed) {
      return { success: false, streakMilestonesUnlocked: [], unlockedCosmetics: {} };
    }

    const claimKey = `mission_claim:${mission.periodKey}:${mission.id}`;
    if (this.claimedRewardKeys.has(claimKey)) {
      mission.claimed = true;
      mission.claimedAt = mission.claimedAt ?? now;
      this.#save();
      this.#notify();
      return { success: false, streakMilestonesUnlocked: [], unlockedCosmetics: {} };
    }

    this.claimedRewardKeys.add(claimKey);
    mission.claimed = true;
    mission.claimedAt = now;

    const granted = {};
    if (mission.reward.skinId) {
      granted.skinId = mission.reward.skinId;
    }
    if (mission.reward.badge && !this.cosmetics.badges.includes(mission.reward.badge)) {
      this.cosmetics.badges.push(mission.reward.badge);
      granted.badge = mission.reward.badge;
    }
    if (mission.reward.title && !this.cosmetics.titles.includes(mission.reward.title)) {
      this.cosmetics.titles.push(mission.reward.title);
      if (!this.cosmetics.equippedTitle) {
        this.cosmetics.equippedTitle = mission.reward.title;
      }
      granted.title = mission.reward.title;
    }
    if (
      mission.reward.avatarFrame &&
      VALID_FRAMES.has(mission.reward.avatarFrame) &&
      !this.cosmetics.frames.includes(mission.reward.avatarFrame)
    ) {
      this.cosmetics.frames.push(mission.reward.avatarFrame);
      if (this.cosmetics.equippedFrame === 'default') {
        this.cosmetics.equippedFrame = mission.reward.avatarFrame;
      }
      granted.avatarFrame = mission.reward.avatarFrame;
    }

    const coins = Math.max(0, Math.floor(mission.reward.coins || 0));
    const gems = Math.max(0, Math.floor(mission.reward.gems || 0));

    this.#walletAdapter.awardEventOnce(claimKey, coins, gems);
    this.stats.totalClaimed += 1;
    this.stats.totalCoinsEarned += coins;
    this.stats.totalGemsEarned += gems;

    const historyId = `${mission.periodKey}:${mission.id}`;
    const existingIdx = this.history.findIndex((h) => h.id === historyId);
    const updatedEntry = {
      id: historyId,
      missionId: mission.id,
      title: mission.title,
      category: mission.category,
      difficulty: mission.difficulty,
      icon: mission.icon,
      periodKey: mission.periodKey,
      completedAt: mission.completedAt ?? now,
      claimedAt: now,
      reward: { ...mission.reward, coins, gems },
      status: 'claimed',
    };
    if (existingIdx >= 0) {
      this.history[existingIdx] = updatedEntry;
    } else {
      this.history = [updatedEntry, ...this.history].slice(0, MAX_HISTORY_ENTRIES);
    }

    let streakUpdated = false;
    const unlockedStreakMilestones = [];
    if (mission.category === 'daily') {
      const todayKey = mission.periodKey;
      if (this.streak.lastClaimDateKey !== todayKey) {
        const dayDiff = this.streak.lastClaimDateKey
          ? diffCalendarDays(this.streak.lastClaimDateKey, todayKey)
          : null;
        if (dayDiff === null || dayDiff >= 1) {
          this.streak.currentStreak = dayDiff === 1 ? this.streak.currentStreak + 1 : 1;
          this.streak.bestStreak = Math.max(this.streak.bestStreak, this.streak.currentStreak);
          this.streak.lastClaimDateKey = todayKey;
          if (!this.streak.recentClaimDates.includes(todayKey)) {
            this.streak.recentClaimDates = [...this.streak.recentClaimDates, todayKey].slice(-30);
          }
          streakUpdated = true;

          for (const milestone of STREAK_MILESTONES) {
            if (
              this.streak.currentStreak >= milestone.days &&
              !this.streak.claimedMilestones.includes(milestone.days)
            ) {
              this.streak.claimedMilestones.push(milestone.days);
              const mKey = `streak_milestone:${milestone.days}`;
              const mCoins = Math.max(0, Math.floor(milestone.reward.coins || 0));
              const mGems = Math.max(0, Math.floor(milestone.reward.gems || 0));
              this.#walletAdapter.awardEventOnce(mKey, mCoins, mGems);
              this.stats.totalCoinsEarned += mCoins;
              this.stats.totalGemsEarned += mGems;
              if (milestone.reward.skinId) granted.skinId = milestone.reward.skinId;
              if (
                milestone.reward.avatarFrame &&
                VALID_FRAMES.has(milestone.reward.avatarFrame) &&
                !this.cosmetics.frames.includes(milestone.reward.avatarFrame)
              ) {
                this.cosmetics.frames.push(milestone.reward.avatarFrame);
                granted.avatarFrame = milestone.reward.avatarFrame;
              }
              if (milestone.reward.badge && !this.cosmetics.badges.includes(milestone.reward.badge)) {
                this.cosmetics.badges.push(milestone.reward.badge);
                granted.badge = milestone.reward.badge;
              }
              if (milestone.reward.title && !this.cosmetics.titles.includes(milestone.reward.title)) {
                this.cosmetics.titles.push(milestone.reward.title);
                granted.title = milestone.reward.title;
              }
              unlockedStreakMilestones.push(milestone);
            }
          }
        }
      }
    }

    // Consume matching queued toast automatically when player claims the mission directly
    const queueIdx = this.completionQueue.findIndex((q) => q.missionId === mission.id);
    if (queueIdx >= 0) {
      this.completionQueue.splice(queueIdx, 1);
    }

    this.#save();
    this.#notify();

    return {
      success: true,
      mission: cloneMission(mission),
      rewardGranted: { ...mission.reward, coins, gems },
      streakUpdated,
      newStreak: this.streak.currentStreak,
      streakMilestonesUnlocked: unlockedStreakMilestones,
      unlockedCosmetics: granted,
      walletBalance: this.getWalletBalance(),
    };
  }

  reset() {
    const now = this.#nowProvider();
    this.dailyPeriodKey = getLocalDateKey(now);
    this.weeklyPeriodKey = getLocalWeekKey(now);
    this.dailyMissions = this.#generateDailyMissions(this.dailyPeriodKey);
    this.weeklyMissions = WEEKLY_MISSIONS.map((d) =>
      createInstanceFromDef(d, this.weeklyPeriodKey)
    );
    this.specialMissions = SPECIAL_CHALLENGES.map((d) =>
      createInstanceFromDef(d, 'permanent')
    );
    this.history = [];
    this.streak = defaultStreakState();
    this.stats = defaultStatsSummary();
    this.cosmetics = defaultCosmeticsState();
    this.claimedRewardKeys.clear();
    this.completionQueue = [];
    this.#save();
    this.#notify();
  }

  #notify() {
    const snap = this.getSnapshot();
    for (const listener of this.#listeners) {
      listener(snap);
    }
  }

  #sanitizeMissionArray(raw, expectedPeriodKey, allowedIds) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = new Set();

    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      if (typeof item.id !== 'string' || seen.has(item.id)) continue;
      if (allowedIds && !allowedIds.has(item.id)) continue;

      const def = ALL_DEFINITIONS_MAP.get(item.id);
      if (!def) continue;
      if (expectedPeriodKey !== null && item.periodKey !== expectedPeriodKey) continue;

      seen.add(item.id);
      const target = def.target;
      const progress =
        typeof item.progress === 'number' && Number.isFinite(item.progress) && item.progress >= 0
          ? Math.min(target, Math.floor(item.progress))
          : 0;
      const completed = Boolean(item.completed) || progress >= target;
      const claimed = completed && Boolean(item.claimed);
      const metaProgress = Array.isArray(item.metaProgress)
        ? item.metaProgress.filter((s) => typeof s === 'string' && s.length > 0)
        : def.condition.kind === 'distinct_powerups' || def.condition.kind === 'distinct_worlds'
          ? []
          : undefined;

      out.push({
        id: def.id,
        category: def.category,
        difficulty: def.difficulty,
        title: def.title,
        description: def.description,
        icon: def.icon,
        target,
        progress: completed ? target : metaProgress ? Math.min(target, metaProgress.length) : progress,
        completed,
        claimed,
        completedAt:
          completed && typeof item.completedAt === 'number' && Number.isFinite(item.completedAt)
            ? item.completedAt
            : completed
              ? Date.now()
              : null,
        claimedAt:
          claimed && typeof item.claimedAt === 'number' && Number.isFinite(item.claimedAt)
            ? item.claimedAt
            : null,
        periodKey: expectedPeriodKey ?? 'permanent',
        reward: { ...def.reward },
        metaProgress,
      });
    }
    return out;
  }

  #load() {
    const storage = getStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(MISSIONS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      const now = this.#nowProvider();
      const currentDailyKey = getLocalDateKey(now);
      const currentWeeklyKey = getLocalWeekKey(now);

      if (parsed.dailyPeriodKey === currentDailyKey) {
        this.dailyPeriodKey = currentDailyKey;
        this.dailyMissions = this.#sanitizeMissionArray(parsed.dailyMissions, currentDailyKey);
      }

      if (parsed.weeklyPeriodKey === currentWeeklyKey) {
        this.weeklyPeriodKey = currentWeeklyKey;
        this.weeklyMissions = this.#sanitizeMissionArray(
          parsed.weeklyMissions,
          currentWeeklyKey,
          new Set(WEEKLY_MISSIONS.map((w) => w.id))
        );
      }

      const loadedSpecials = this.#sanitizeMissionArray(
        parsed.specialMissions,
        'permanent',
        new Set(SPECIAL_CHALLENGES.map((s) => s.id))
      );
      const specialById = new Map(loadedSpecials.map((s) => [s.id, s]));
      this.specialMissions = SPECIAL_CHALLENGES.map(
        (def) => specialById.get(def.id) ?? createInstanceFromDef(def, 'permanent')
      );

      if (Array.isArray(parsed.history)) {
        this.history = parsed.history
          .filter((h) => h && typeof h === 'object' && typeof h.id === 'string' && typeof h.missionId === 'string')
          .slice(0, MAX_HISTORY_ENTRIES);
      }

      if (parsed.streak && typeof parsed.streak === 'object') {
        const s = parsed.streak;
        this.streak = {
          currentStreak:
            typeof s.currentStreak === 'number' && Number.isFinite(s.currentStreak) && s.currentStreak >= 0
              ? Math.floor(s.currentStreak)
              : 0,
          bestStreak:
            typeof s.bestStreak === 'number' && Number.isFinite(s.bestStreak) && s.bestStreak >= 0
              ? Math.floor(s.bestStreak)
              : 0,
          lastClaimDateKey:
            typeof s.lastClaimDateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.lastClaimDateKey)
              ? s.lastClaimDateKey
              : null,
          claimedMilestones: Array.isArray(s.claimedMilestones)
            ? s.claimedMilestones.filter((n) => typeof n === 'number' && Number.isFinite(n))
            : [],
          recentClaimDates: Array.isArray(s.recentClaimDates)
            ? s.recentClaimDates.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
            : [],
        };
      }

      if (parsed.stats && typeof parsed.stats === 'object') {
        const cleanInt = (v) =>
          typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
        this.stats = {
          totalCompleted: cleanInt(parsed.stats.totalCompleted),
          totalClaimed: cleanInt(parsed.stats.totalClaimed),
          totalCoinsEarned: cleanInt(parsed.stats.totalCoinsEarned),
          totalGemsEarned: cleanInt(parsed.stats.totalGemsEarned),
        };
      }

      if (parsed.cosmetics && typeof parsed.cosmetics === 'object') {
        const c = parsed.cosmetics;
        const frames = new Set(['default']);
        if (Array.isArray(c.frames)) {
          for (const f of c.frames) {
            if (typeof f === 'string' && VALID_FRAMES.has(f)) frames.add(f);
          }
        }
        const titles = Array.isArray(c.titles) ? c.titles.filter((t) => typeof t === 'string' && t.length > 0) : [];
        const badges = Array.isArray(c.badges) ? c.badges.filter((b) => typeof b === 'string' && b.length > 0) : [];
        this.cosmetics = {
          titles,
          badges,
          frames: Array.from(frames),
          equippedTitle:
            typeof c.equippedTitle === 'string' && titles.includes(c.equippedTitle)
              ? c.equippedTitle
              : null,
          equippedFrame:
            typeof c.equippedFrame === 'string' && frames.has(c.equippedFrame)
              ? c.equippedFrame
              : 'default',
        };
      }

      if (Array.isArray(parsed.claimedRewardKeys)) {
        for (const key of parsed.claimedRewardKeys) {
          if (typeof key === 'string' && key.length > 0) {
            this.claimedRewardKeys.add(key);
          }
        }
      }
    } catch {
      this.dailyMissions = [];
      this.weeklyMissions = [];
      this.specialMissions = [];
      this.history = [];
      this.streak = defaultStreakState();
      this.stats = defaultStatsSummary();
      this.cosmetics = defaultCosmeticsState();
      this.claimedRewardKeys.clear();
    }
  }

  #save() {
    const storage = getStorage();
    if (!storage) return;
    try {
      const payload = {
        version: MISSIONS_STORAGE_VERSION,
        dailyPeriodKey: this.dailyPeriodKey,
        weeklyPeriodKey: this.weeklyPeriodKey,
        dailyMissions: this.dailyMissions,
        weeklyMissions: this.weeklyMissions,
        specialMissions: this.specialMissions,
        history: this.history.slice(0, MAX_HISTORY_ENTRIES),
        streak: this.streak,
        stats: this.stats,
        cosmetics: this.cosmetics,
        claimedRewardKeys: Array.from(this.claimedRewardKeys).slice(-400),
      };
      storage.setItem(MISSIONS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore restricted storage errors
    }
  }
}

export const missionManager = MissionManager.getInstance();
export default MissionManager;
