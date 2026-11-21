import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Check,
  CheckCircle2,
  Coins,
  Crown,
  Filter,
  Gem,
  HelpCircle,
  Layers,
  Lock,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { achievementManager } from '../game/achievements/AchievementManager';
import {
  ACHIEVEMENT_RANK_THRESHOLDS,
  ACHIEVEMENT_RARITY_CONFIG,
} from '../game/achievements/AchievementPointsManager';
import {
  AchievementCategory,
  AchievementRarity,
  AchievementRecord,
  AchievementSnapshot,
  BadgeCategory,
  BadgeRecord,
} from '../game/achievements/AchievementTypes';
import { getBadgeById } from '../game/achievements/BadgeRegistry';
import { REWARD_SHOP_ITEMS, rewardShopManager } from '../game/achievements/RewardShopManager';
import { audioManager } from '../game/audio/AudioManager';
import { getTitleById } from '../game/progression/TitleRegistry';
import { renderAchievementIcon } from './AchievementPopup';
import { BadgeArtwork } from './BadgeArtwork';

interface AchievementCollectionUIProps {
  snapshot: AchievementSnapshot;
  coins: number;
  gems: number;
  badgeEffectsEnabled?: boolean;
  reducedMotion?: boolean;
  onShopPurchased?: (unlocked: AchievementRecord[], kind: 'skin' | 'frame' | 'badge') => void;
  onBack: () => void;
}

type CenterViewTab = 'achievements' | 'chains' | 'badges' | 'stats' | 'shop';
type StatusFilter = 'all' | 'unlocked' | 'locked' | 'hidden';
type SortMode = 'progress' | 'rarity' | 'alphabetical' | 'points' | 'recent';

const CATEGORY_TABS: readonly { id: 'all' | AchievementCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'score', label: 'Score' },
  { id: 'skill', label: 'Skill' },
  { id: 'collection', label: 'Collection' },
  { id: 'characters', label: 'Characters' },
  { id: 'worlds', label: 'Worlds' },
  { id: 'powerups', label: 'Power-Ups' },
  { id: 'missions', label: 'Missions' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'multiplayer', label: 'Multiplayer' },
  { id: 'hidden', label: 'Hidden' },
];

const BADGE_TABS: readonly { id: 'all' | BadgeCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gameplay', label: 'Gameplay' },
  { id: 'skill', label: 'Skill' },
  { id: 'collection', label: 'Collection' },
  { id: 'tournament', label: 'Tournament' },
  { id: 'world', label: 'World' },
  { id: 'hidden', label: 'Hidden' },
  { id: 'seasonal', label: 'Seasonal' },
];

const RARITY_ORDER: Record<AchievementRarity, number> = {
  LEGENDARY: 5,
  EPIC: 4,
  RARE: 3,
  UNCOMMON: 2,
  COMMON: 1,
};

const ALL_RARITIES: readonly AchievementRarity[] = [
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
];

function formatShortDate(ts: number | null): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export const AchievementCollectionUI: React.FC<AchievementCollectionUIProps> = ({
  snapshot,
  coins,
  gems,
  badgeEffectsEnabled = true,
  reducedMotion = false,
  onShopPurchased,
  onBack,
}) => {
  const [viewTab, setViewTab] = useState<CenterViewTab>('achievements');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AchievementCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<'all' | AchievementRarity>('all');
  const [sortMode, setSortMode] = useState<SortMode>('progress');
  const [badgeCategory, setBadgeCategory] = useState<'all' | BadgeCategory>('all');
  const [inspectedBadge, setInspectedBadge] = useState<BadgeRecord | null>(null);
  const [shopToast, setShopToast] = useState<string | null>(null);
  const [, setShopTick] = useState(0);

  const { stats, records, badges, chains, recentUnlocks, featuredAchievement, showcaseIds } =
    snapshot;

  const filteredRecords = useMemo(() => {
    const list = records.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (rarityFilter !== 'all' && item.rarity !== rarityFilter) return false;
      if (statusFilter === 'unlocked' && !item.unlocked) return false;
      if (statusFilter === 'locked' && item.unlocked) return false;
      if (statusFilter === 'hidden' && !item.hidden) return false;
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortMode === 'recent') {
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        return (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0);
      }
      if (sortMode === 'rarity') {
        const rd = RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity];
        if (rd !== 0) return rd;
        return Number(b.unlocked) - Number(a.unlocked);
      }
      if (sortMode === 'points') {
        return b.points - a.points || Number(b.unlocked) - Number(a.unlocked);
      }
      if (sortMode === 'alphabetical') {
        const aName = a.hidden && !a.unlocked ? 'ZZZ' : a.name;
        const bName = b.hidden && !b.unlocked ? 'ZZZ' : b.name;
        return aName.localeCompare(bName);
      }
      // Default: 'progress' — unlocked or closest to completion first, keeping hidden mysteries cleanly below active tracks
      if (a.unlocked !== b.unlocked) return Number(b.unlocked) - Number(a.unlocked);
      const ratioA = a.requirement > 0 ? a.progress / a.requirement : 0;
      const ratioB = b.requirement > 0 ? b.progress / b.requirement : 0;
      if (ratioB !== ratioA) return ratioB - ratioA;
      return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
    });
    return sorted;
  }, [records, categoryFilter, rarityFilter, statusFilter, sortMode]);

  const filteredBadges = useMemo(() => {
    if (badgeCategory === 'all') return badges;
    return badges.filter((b) => b.category === badgeCategory);
  }, [badges, badgeCategory]);

  const unlockedBadgesCount = useMemo(
    () => badges.filter((b) => b.unlocked).length,
    [badges]
  );

  const handleBuyShopItem = (itemId: string) => {
    audioManager.playButton();
    const res = rewardShopManager.purchase(itemId);
    if (!res.success) {
      setShopToast(
        res.reason === 'already_owned'
          ? 'Item sudah dimiliki!'
          : 'Coins atau Gems belum cukup!'
      );
      window.setTimeout(() => setShopToast(null), 2200);
      return;
    }

    const newlyUnlocked = achievementManager.recordEvent({
      type: 'shop_purchase',
      coinsSpent: res.coinsSpent,
      gemsSpent: res.gemsSpent,
      totalOwnedCount: res.totalOwnedCount,
    });
    setShopTick((v) => v + 1);
    setShopToast(`Berhasil membeli ${res.item?.name}!`);
    window.setTimeout(() => setShopToast(null), 2400);
    if (res.item) {
      onShopPurchased?.(newlyUnlocked, res.item.kind);
    }
  };

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-3 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-1.5 py-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[44px] px-3 py-2 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <h2 className="font-display text-stroke-dark truncate text-lg font-bold tracking-wide text-white sm:text-xl">
          ACHIEVEMENT CENTER
        </h2>

        <div className="inline-flex min-h-[38px] shrink-0 items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-[#FFD84D] px-2.5 text-[11px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
          <Trophy className="h-3.5 w-3.5 shrink-0" />
          <span className="tabular-nums">{stats.earnedAchievementPoints}</span>
        </div>
      </div>

      {/* Main Scroll Container */}
      <div className="mx-auto flex w-full max-w-[366px] flex-1 flex-col overflow-hidden pb-2">
        {/* Top Overview KPI Card */}
        <div className="game-panel shrink-0 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-[#24415C] px-2 py-0.5 text-[10px] font-black text-white"
                  style={{ backgroundColor: stats.rank.colorHex }}
                >
                  <Crown className="h-3 w-3" />
                  <span>{stats.rank.label}</span>
                </span>
                <span className="text-[11px] font-black tabular-nums text-[#24415C]">
                  {stats.unlockedAchievements}/{stats.totalAchievements} ({stats.completionPercent}%)
                </span>
              </div>

              <div className="mt-1 text-[10px] font-bold text-[#24415C]/70">
                {stats.rank.nextTierLabel
                  ? `${stats.earnedAchievementPoints} / ${stats.rank.nextTierPoints} PTS to ${stats.rank.nextTierLabel}`
                  : `${stats.earnedAchievementPoints} PTS · MAX RANK REACHED`}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-black">
              <span className="inline-flex items-center gap-0.5 rounded-xl border border-[#24415C]/25 bg-[#FFF9DB] px-2 py-1 text-[#B45309]">
                <Coins className="h-3 w-3" />
                <span className="tabular-nums">{stats.totalCoinsEarned}</span>
              </span>
              <span className="inline-flex items-center gap-0.5 rounded-xl border border-[#24415C]/25 bg-[#E0F2FE] px-2 py-1 text-[#0369A1]">
                <Gem className="h-3 w-3" />
                <span className="tabular-nums">{stats.totalGemsEarned}</span>
              </span>
            </div>
          </div>

          {/* Completion Progress Bar */}
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/40 bg-[#EEF7FF]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#32B85C] via-[#38BDF8] to-[#F59E0B] transition-all duration-300"
              style={{ width: `${stats.completionPercent}%` }}
            />
          </div>

          {/* 5-Rarity Strip */}
          <div className="mt-2 grid grid-cols-5 gap-1">
            {ALL_RARITIES.map((r) => {
              const cfg = ACHIEVEMENT_RARITY_CONFIG[r];
              const counts = stats.byRarity[r];
              return (
                <div
                  key={r}
                  className={`rounded-xl border border-[#24415C]/15 px-1 py-1 text-center ${cfg.badgeBg}`}
                >
                  <div className={`truncate text-[8px] font-black ${cfg.badgeText}`}>
                    {r.slice(0, 4)}
                  </div>
                  <div className={`text-[10px] font-black tabular-nums ${cfg.badgeText}`}>
                    {counts.unlocked}/{counts.total}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Featured / Recent Highlight Strip */}
          {(featuredAchievement || recentUnlocks.length > 0) && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-[#24415C]/15 bg-[#EEF7FF] px-2.5 py-1.5 text-left">
              {featuredAchievement ? (
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black tracking-wider text-[#3998F7] uppercase">
                    NEXT FEATURED GOAL
                  </div>
                  <div className="truncate text-[11px] font-extrabold text-[#24415C]">
                    {featuredAchievement.hidden && !featuredAchievement.unlocked
                      ? '??? Secret Achievement'
                      : `${featuredAchievement.name} (${featuredAchievement.progress}/${featuredAchievement.requirement})`}
                  </div>
                </div>
              ) : null}

              {recentUnlocks.length > 0 && (
                <div className="shrink-0 text-right">
                  <div className="text-[9px] font-black text-[#32B85C] uppercase">RECENT</div>
                  <div className="max-w-[115px] truncate text-[10px] font-black text-[#24415C]">
                    {recentUnlocks[0].name}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Center Inner Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Achievement Center Sections"
          className="mt-2 grid shrink-0 grid-cols-5 gap-1"
        >
          {(
            [
              { id: 'achievements', label: 'LIST', icon: Trophy },
              { id: 'chains', label: 'CHAINS', icon: Layers },
              { id: 'badges', label: 'BADGES', icon: Award },
              { id: 'stats', label: 'STATS', icon: BarChart3 },
              { id: 'shop', label: 'SHOP', icon: ShoppingBag },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = viewTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  audioManager.playButton();
                  setViewTab(t.id);
                }}
                className={`flex min-h-[40px] flex-col items-center justify-center rounded-2xl border-2 px-1 py-1 text-[9px] font-black transition-colors ${
                  active
                    ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                    : 'border-[#24415C]/25 bg-white/90 text-[#24415C]/75'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="mt-0.5">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="mt-2 flex-1 overflow-y-auto rounded-3xl border-2 border-[#24415C] bg-white/95 p-3 shadow-[0_5px_0_#24415C]">
          {/* 1. ACHIEVEMENTS LIST */}
          {viewTab === 'achievements' && (
            <div className="space-y-2.5">
              {/* Category Horizontal Scroller */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {CATEGORY_TABS.map((cat) => {
                  const active = categoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setCategoryFilter(cat.id);
                      }}
                      className={`min-h-[34px] shrink-0 rounded-xl border-2 px-2.5 text-[10px] font-black transition-colors ${
                        active
                          ? 'border-[#24415C] bg-[#3998F7] text-white'
                          : 'border-[#24415C]/20 bg-[#EEF7FF] text-[#24415C]/80'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Status Pills + Rarity + Sort Row */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 rounded-2xl bg-[#EEF7FF] p-2">
                <div className="flex flex-wrap gap-1">
                  {(['all', 'unlocked', 'locked', 'hidden'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setStatusFilter(st);
                      }}
                      className={`min-h-[28px] rounded-lg border px-2 text-[9px] font-black uppercase ${
                        statusFilter === st
                          ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                          : 'border-[#24415C]/20 bg-white text-[#24415C]/70'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <Filter className="h-3 w-3 text-[#3998F7]" />
                  <select
                    aria-label="Filter Rarity"
                    value={rarityFilter}
                    onChange={(e) => setRarityFilter(e.target.value as 'all' | AchievementRarity)}
                    className="min-h-[28px] rounded-lg border border-[#24415C]/30 bg-white px-1.5 text-[9px] font-black text-[#24415C]"
                  >
                    <option value="all">ALL RARITIES</option>
                    {ALL_RARITIES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Sort Achievements"
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="min-h-[28px] rounded-lg border border-[#24415C]/30 bg-white px-1.5 text-[9px] font-black text-[#24415C]"
                  >
                    <option value="progress">Progress</option>
                    <option value="rarity">Rarity</option>
                    <option value="points">Points</option>
                    <option value="recent">Recent</option>
                    <option value="alphabetical">A-Z</option>
                  </select>
                </div>
              </div>

              {/* Cards */}
              {filteredRecords.length === 0 ? (
                <div className="rounded-2xl bg-[#EEF7FF] py-6 text-center text-xs font-bold text-[#24415C]/65">
                  Tidak ada achievement yang cocok dengan filter ini.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredRecords.map((item) => {
                    const isMaskedSecret = item.hidden && !item.unlocked;
                    const cfg = ACHIEVEMENT_RARITY_CONFIG[item.rarity];
                    const pct = isMaskedSecret
                      ? 0
                      : Math.min(100, Math.round((item.progress / Math.max(1, item.requirement)) * 100));
                    const isPinned = showcaseIds.includes(item.id);
                    const linkedBadge = item.badgeId ? getBadgeById(item.badgeId) : null;
                    const linkedTitle = item.titleId ? getTitleById(item.titleId) : null;

                    return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border-2 p-3 transition-all ${
                          item.unlocked
                            ? `border-[#24415C] bg-gradient-to-r ${cfg.cardGradient} shadow-[0_3px_0_#24415C]`
                            : isMaskedSecret
                              ? 'border-slate-300 bg-slate-100/95'
                              : 'border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 ${
                              item.unlocked
                                ? 'border-[#24415C] bg-white text-[#24415C]'
                                : isMaskedSecret
                                  ? 'border-slate-400 bg-slate-200 text-slate-500'
                                  : 'border-slate-300 bg-slate-100 text-slate-400'
                            }`}
                          >
                            {isMaskedSecret ? (
                              <HelpCircle className="h-5 w-5" />
                            ) : item.unlocked ? (
                              linkedBadge ? (
                                <BadgeArtwork
                                  badge={linkedBadge}
                                  size={40}
                                  effectsEnabled={badgeEffectsEnabled}
                                  reducedMotion={reducedMotion}
                                />
                              ) : (
                                renderAchievementIcon(item.icon, 'h-5 w-5')
                              )
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center justify-between gap-1.5">
                              <h3 className="truncate font-display text-sm font-bold text-[#24415C]">
                                {isMaskedSecret ? '??? SECRET ACHIEVEMENT ???' : item.name}
                              </h3>
                              <span
                                className={`shrink-0 rounded-md border border-[#24415C]/20 px-1.5 py-0.5 text-[8px] font-black ${cfg.badgeBg} ${cfg.badgeText}`}
                              >
                                {isMaskedSecret ? 'HIDDEN' : cfg.label}
                              </span>
                            </div>

                            <p className="mt-0.5 text-[11px] leading-snug font-bold text-[#24415C]/75">
                              {isMaskedSecret
                                ? item.secretHint ??
                                  'Temukan rahasia tersembunyi melalui gameplay atau eksplorasi!'
                                : item.description}
                            </p>

                            {/* Progress Bar */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#24415C]/15">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    item.unlocked ? 'bg-[#32B85C]' : 'bg-[#3998F7]'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="shrink-0 font-display text-[10px] font-bold tabular-nums text-[#24415C]/70">
                                {isMaskedSecret
                                  ? '???'
                                  : item.unlocked
                                    ? 'DONE'
                                    : `${item.progress}/${item.requirement}`}
                              </span>
                            </div>

                            {/* Rewards + Showcase Toggle */}
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                              <div className="flex flex-wrap items-center gap-1 text-[9px] font-black">
                                {isMaskedSecret ? (
                                  <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-slate-600">
                                    REWARD: ???
                                  </span>
                                ) : (
                                  <>
                                    <span className="rounded-md bg-[#EEF7FF] px-1.5 py-0.5 text-[#0369A1]">
                                      +{item.rewardXP} XP
                                    </span>
                                    <span className="rounded-md bg-[#FFF9DB] px-1.5 py-0.5 text-[#B45309]">
                                      +{item.rewardCoins} Coins
                                    </span>
                                    {item.rewardGems > 0 && (
                                      <span className="rounded-md bg-[#E0F2FE] px-1.5 py-0.5 text-[#0284C7]">
                                        +{item.rewardGems} Gems
                                      </span>
                                    )}
                                    <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[#24415C]/75">
                                      +{item.points} PTS
                                    </span>
                                    {linkedTitle && (
                                      <span className="rounded-md bg-[#FEF08A] px-1.5 py-0.5 text-[#854D0E]">
                                        Title: {linkedTitle.name}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>

                              {item.unlocked && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    audioManager.playButton();
                                    achievementManager.toggleShowcaseAchievement(item.id);
                                  }}
                                  className={`inline-flex min-h-[26px] items-center gap-1 rounded-lg border px-2 text-[9px] font-black ${
                                    isPinned
                                      ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                                      : 'border-[#24415C]/25 bg-white text-[#24415C]/75'
                                  }`}
                                >
                                  <Star
                                    className={`h-2.5 w-2.5 ${
                                      isPinned ? 'fill-[#24415C]' : ''
                                    }`}
                                  />
                                  <span>{isPinned ? 'SHOWCASED' : 'PIN'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. ACHIEVEMENT CHAINS */}
          {viewTab === 'chains' && (
            <div className="space-y-3">
              {chains.map((chainState) => {
                const { chain, completedCount, totalCount, nextAchievement, steps } = chainState;
                const pct = Math.round((completedCount / Math.max(1, totalCount)) * 100);
                return (
                  <div
                    key={chain.id}
                    className="rounded-2xl border-2 border-[#24415C]/25 bg-[#F8FBFF] p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-[#24415C]">
                        {chain.name}
                      </h3>
                      <span className="rounded-xl border border-[#24415C] bg-[#FFD84D] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#24415C]">
                        {completedCount}/{totalCount}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] font-bold text-[#24415C]/70">
                      {chain.description}
                    </p>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#24415C]/15">
                      <div
                        className="h-full rounded-full bg-[#32B85C] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {steps.map((step, i) => (
                        <span
                          key={step.id}
                          className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[9px] font-black ${
                            step.unlocked
                              ? 'border-emerald-600 bg-emerald-100 text-emerald-900'
                              : nextAchievement?.id === step.id
                                ? 'border-[#3998F7] bg-[#E0F2FE] text-[#0369A1]'
                                : 'border-slate-300 bg-slate-100 text-slate-500'
                          }`}
                        >
                          {step.unlocked ? (
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                          ) : (
                            <span className="tabular-nums">{i + 1}.</span>
                          )}
                          <span>{step.name}</span>
                        </span>
                      ))}
                    </div>

                    {nextAchievement && (
                      <div className="mt-2 rounded-xl bg-white px-2.5 py-1.5 text-[10px] font-extrabold text-[#24415C]">
                        Active Step: {nextAchievement.name} ({nextAchievement.progress}/
                        {nextAchievement.requirement})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 3. BADGE COLLECTION */}
          {viewTab === 'badges' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-[#EEF7FF] px-3 py-2">
                <span className="text-xs font-black text-[#24415C]">BADGE COLLECTION</span>
                <span className="rounded-xl border border-[#24415C] bg-[#FFD84D] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#24415C]">
                  {unlockedBadgesCount} / {badges.length}
                </span>
              </div>

              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {BADGE_TABS.map((tab) => {
                  const active = badgeCategory === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setBadgeCategory(tab.id);
                      }}
                      className={`min-h-[34px] shrink-0 rounded-xl border-2 px-2.5 text-[10px] font-black ${
                        active
                          ? 'border-[#24415C] bg-[#3998F7] text-white'
                          : 'border-[#24415C]/20 bg-[#EEF7FF] text-[#24415C]/80'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {filteredBadges.map((badge) => {
                  const cfg = ACHIEVEMENT_RARITY_CONFIG[badge.rarity];
                  return (
                    <button
                      key={badge.id}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setInspectedBadge(badge);
                      }}
                      className={`flex flex-col items-center rounded-2xl border-2 p-2 text-center transition-transform active:scale-95 ${
                        badge.unlocked
                          ? `border-[#24415C] bg-gradient-to-b ${cfg.cardGradient} shadow-[0_3px_0_#24415C]`
                          : 'border-slate-300 bg-slate-100/90'
                      }`}
                    >
                      <BadgeArtwork
                        badge={badge}
                        size={52}
                        locked={!badge.unlocked}
                        effectsEnabled={badgeEffectsEnabled}
                        reducedMotion={reducedMotion}
                      />
                      <div className="mt-1.5 line-clamp-2 text-[10px] leading-tight font-black text-[#24415C]">
                        {badge.name}
                      </div>
                      <span
                        className={`mt-1 rounded px-1.5 py-0.5 text-[8px] font-black ${cfg.badgeBg} ${cfg.badgeText}`}
                      >
                        {badge.rarity}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. STATS & RANK LADDER */}
          {viewTab === 'stats' && (
            <div className="space-y-3.5 text-left">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-[#EEF7FF] p-2.5">
                  <div className="text-[9px] font-black text-[#3998F7] uppercase">
                    ACHIEVEMENT POINTS
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-[#24415C]">
                    {stats.earnedAchievementPoints}
                    <span className="text-xs text-[#24415C]/50">/{stats.totalAchievementPoints}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FFF9DB] p-2.5">
                  <div className="text-[9px] font-black text-[#B45309] uppercase">
                    SECRET DISCOVERED
                  </div>
                  <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-[#24415C]">
                    {stats.unlockedHiddenCount}
                    <span className="text-xs text-[#24415C]/50">/{stats.totalHiddenCount}</span>
                  </div>
                </div>
              </div>

              {/* Category Progress */}
              <section className="rounded-2xl bg-[#EEF7FF] p-3">
                <h3 className="text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                  CATEGORY PROGRESS
                </h3>
                <div className="mt-2 space-y-2">
                  {CATEGORY_TABS.filter((c) => c.id !== 'all').map((cat) => {
                    const entry = stats.byCategory[cat.id as AchievementCategory];
                    const pct = Math.round((entry.unlocked / Math.max(1, entry.total)) * 100);
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-[#24415C]">
                          <span>{cat.label}</span>
                          <span className="tabular-nums">
                            {entry.unlocked}/{entry.total} ({pct}%)
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
                          <div
                            className="h-full rounded-full bg-[#3998F7]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Rank Ladder */}
              <section>
                <h3 className="text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                  ACHIEVEMENT RANK TIERS
                </h3>
                <div className="mt-1.5 space-y-1.5">
                  {ACHIEVEMENT_RANK_THRESHOLDS.map((tier) => {
                    const isCurrent = stats.rank.tier === tier.tier;
                    const reached = stats.earnedAchievementPoints >= tier.minPoints;
                    return (
                      <div
                        key={tier.tier}
                        className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 ${
                          isCurrent
                            ? 'border-[#24415C] bg-[#FFF9DB] shadow-[0_2px_0_#24415C]'
                            : reached
                              ? 'border-[#24415C]/20 bg-[#F8FBFF]'
                              : 'border-slate-200 bg-slate-50 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-[#24415C]"
                            style={{ backgroundColor: tier.colorHex }}
                          />
                          <span className="text-xs font-black text-[#24415C]">{tier.label}</span>
                        </div>
                        <span className="text-[10px] font-black tabular-nums text-[#24415C]/75">
                          {tier.minPoints}+ PTS
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {/* 5. REWARD SHOP */}
          {viewTab === 'shop' && (
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between rounded-2xl bg-[#EEF7FF] px-3 py-2">
                <div>
                  <div className="text-[10px] font-black text-[#3998F7] uppercase">REWARD SHOP</div>
                  <div className="text-[10px] font-bold text-[#24415C]/70">
                    Buka Skin, Frame &amp; Badge dengan Coins/Gems!
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-black">
                  <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#FFD84D] px-2 py-0.5 text-[#24415C]">
                    <Coins className="h-3 w-3 text-[#B45309]" />
                    <span className="tabular-nums">{coins}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#E0F2FE] px-2 py-0.5 text-[#0369A1]">
                    <Gem className="h-3 w-3 text-[#0EA5E9]" />
                    <span className="tabular-nums">{gems}</span>
                  </span>
                </div>
              </div>

              {shopToast && (
                <div className="flex items-center gap-1.5 rounded-2xl border-2 border-[#24415C] bg-[#FFF9DB] px-3 py-2 text-xs font-black text-[#24415C]">
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                  <span>{shopToast}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {REWARD_SHOP_ITEMS.map((item) => {
                  const owned = rewardShopManager.isOwned(item.id);
                  const canAfford = coins >= item.costCoins && gems >= item.costGems;
                  const cfg = ACHIEVEMENT_RARITY_CONFIG[item.rarity];
                  const linkedBadge = item.kind === 'badge' ? getBadgeById(item.targetId) : null;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                        owned
                          ? 'border-emerald-500 bg-emerald-50/70'
                          : 'border-[#24415C]/25 bg-white'
                      }`}
                    >
                      {linkedBadge ? (
                        <BadgeArtwork
                          badge={linkedBadge}
                          size={48}
                          effectsEnabled={badgeEffectsEnabled}
                          reducedMotion={reducedMotion}
                        />
                      ) : (
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[#24415C] text-white shadow-[0_2px_0_#24415C]"
                          style={{ backgroundColor: item.previewColor }}
                        >
                          {item.kind === 'skin' ? (
                            <Sparkles className="h-5 w-5" />
                          ) : (
                            <Crown className="h-5 w-5" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="truncate font-display text-sm font-bold text-[#24415C]">
                            {item.name}
                          </h4>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[8px] font-black ${cfg.badgeBg} ${cfg.badgeText}`}
                          >
                            {item.kind.toUpperCase()}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug font-bold text-[#24415C]/70">
                          {item.description}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-black">
                          {item.costCoins > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-[#FFF9DB] px-1.5 py-0.5 text-[#B45309]">
                              <Coins className="h-3 w-3" />
                              <span>{item.costCoins}</span>
                            </span>
                          )}
                          {item.costGems > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-[#E0F2FE] px-1.5 py-0.5 text-[#0369A1]">
                              <Gem className="h-3 w-3" />
                              <span>{item.costGems}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {owned ? (
                          <span className="inline-flex min-h-[38px] items-center gap-1 rounded-xl border-2 border-emerald-600 bg-emerald-100 px-2.5 text-[10px] font-black text-emerald-900">
                            <Check className="h-3.5 w-3.5" />
                            <span>OWNED</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={!canAfford}
                            onClick={() => handleBuyShopItem(item.id)}
                            className={`btn-base min-h-[40px] px-3 text-xs ${
                              canAfford ? 'btn-primary' : 'border-slate-300 bg-slate-200 text-slate-400'
                            }`}
                          >
                            <Zap className="h-3.5 w-3.5" />
                            <span>BUY</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BADGE INSPECT MODAL */}
      {inspectedBadge && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-[2px]"
        >
          <div className="anim-panel-pop game-panel relative w-full max-w-[310px] p-5 text-center">
            <button
              type="button"
              aria-label="Close Badge Details"
              onClick={() => {
                audioManager.playButton();
                setInspectedBadge(null);
              }}
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#24415C]/25 bg-white text-[#24415C]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center">
              <BadgeArtwork
                badge={inspectedBadge}
                size={92}
                locked={!inspectedBadge.unlocked}
                effectsEnabled={badgeEffectsEnabled}
                reducedMotion={reducedMotion}
              />

              <span
                className={`mt-2.5 rounded-full border border-[#24415C] px-2.5 py-0.5 text-[10px] font-black uppercase ${
                  ACHIEVEMENT_RARITY_CONFIG[inspectedBadge.rarity].badgeBg
                } ${ACHIEVEMENT_RARITY_CONFIG[inspectedBadge.rarity].badgeText}`}
              >
                {inspectedBadge.rarity} · {inspectedBadge.category.toUpperCase()} · +
                {inspectedBadge.points} PTS
              </span>

              <h3 className="mt-2 font-display text-xl font-bold text-[#24415C]">
                {inspectedBadge.name}
              </h3>

              <p className="mt-1 text-xs leading-snug font-bold text-[#24415C]/75">
                {inspectedBadge.description}
              </p>

              <div className="mt-3 w-full rounded-2xl border border-[#24415C]/15 bg-[#EEF7FF] p-2.5 text-xs font-extrabold text-[#24415C]">
                {inspectedBadge.unlocked ? (
                  <span className="text-emerald-700">
                    Unlocked {formatShortDate(inspectedBadge.unlockedAt)}
                  </span>
                ) : (
                  <span>Unlock: {inspectedBadge.unlockConditionLabel}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setInspectedBadge(null);
                }}
                className="btn-base btn-primary mt-4 min-h-[44px] w-full text-sm"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
