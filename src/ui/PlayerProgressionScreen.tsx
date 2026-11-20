import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Check,
  Crown,
  Gift,
  History,
  Lock,
  Sparkles,
  User,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { AVATAR_FRAME_META } from '../game/missions/MissionRegistry';
import { AvatarFrameId } from '../game/missions/MissionTypes';
import { getNextLevelReward } from '../game/progression/LevelRewardRegistry';
import { playerProgressionManager } from '../game/progression/PlayerProgressionManager';
import {
  LevelRewardGrantOutcome,
  PlayerProgressProfile,
} from '../game/progression/PlayerProgressTypes';
import { PLAYER_RANK_TIERS } from '../game/progression/RankManager';
import { getTitleById, TITLE_RARITY_STYLE, TITLE_REGISTRY } from '../game/progression/TitleRegistry';
import { LevelRewardTrack } from './LevelRewardTrack';
import { XPHistoryList } from './XPHistoryList';

export type ProgressionTab = 'rewards' | 'titles' | 'history' | 'stats';

interface PlayerProgressionScreenProps {
  profile: PlayerProgressProfile;
  initialTab?: ProgressionTab;
  onOpenProfile: () => void;
  onBack: () => void;
  onRewardClaimed?: () => void;
}

const FRAME_IDS: readonly AvatarFrameId[] = [
  'default',
  'perfect_wings',
  'gold_champion',
  'cosmic_explorer',
  'streak_flame',
  'elite_azure',
  'ultimate_legend',
];

export const PlayerProgressionScreen: React.FC<PlayerProgressionScreenProps> = ({
  profile,
  initialTab = 'rewards',
  onOpenProfile,
  onBack,
  onRewardClaimed,
}) => {
  const [activeTab, setActiveTab] = useState<ProgressionTab>(initialTab);
  const [banner, setBanner] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const flashBanner = (msg: string) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setBanner(msg);
    timerRef.current = window.setTimeout(() => {
      setBanner(null);
      timerRef.current = null;
    }, 2600);
  };

  const nextReward = getNextLevelReward(profile.currentLevel, profile.claimedLevelRewards);
  const unclaimedCount = playerProgressionManager.getUnclaimedRewardLevels(profile.profileId).length;
  const equippedTitle = getTitleById(profile.equippedTitleId);

  const handleClaimOutcome = (outcome: LevelRewardGrantOutcome) => {
    if (outcome.success) {
      flashBanner(`Lv.${outcome.level} Reward: ${outcome.summaryLabel}`);
      onRewardClaimed?.();
    } else {
      flashBanner(outcome.summaryLabel);
    }
  };

  const totalCategoryXP = Math.max(
    1,
    profile.stats.totalGameplayXP +
      profile.stats.totalMissionXP +
      profile.stats.totalTournamentXP +
      profile.stats.totalAchievementXP +
      profile.stats.totalCollectionXP
  );

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-3.5 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 py-2">
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

        <h2 className="font-display text-stroke-dark text-xl font-bold tracking-wide text-white">
          PROGRESSION
        </h2>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onOpenProfile();
          }}
          className="btn-base btn-primary min-h-[44px] px-3 py-2 text-xs"
        >
          <User className="h-4 w-4" />
          <span>PROFILE</span>
        </button>
      </div>

      {/* Scrollable Body */}
      <div className="mx-auto flex w-full max-w-[356px] flex-1 flex-col overflow-hidden pb-2">
        {/* Top Level Summary Card */}
        <div className="game-panel shrink-0 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-[#24415C] bg-gradient-to-b from-[#FFF9DB] to-[#FFD84D] shadow-[0_3px_0_#24415C]"
              >
                <span className="text-[8px] font-black text-[#24415C]/70 uppercase">LV</span>
                <span className="font-display text-xl leading-none font-bold tabular-nums text-[#24415C]">
                  {profile.currentLevel}
                </span>
              </div>

              <div className="min-w-0">
                <div
                  className={`inline-flex items-center gap-1 rounded-full border border-[#24415C] bg-gradient-to-r ${profile.rank.gradientClass} px-2 py-0.5 text-[10px] font-black text-[#24415C]`}
                >
                  <span aria-hidden="true">{profile.rank.icon}</span>
                  <span>{profile.rank.name}</span>
                </div>
                <div className="mt-1 truncate text-xs font-extrabold text-[#24415C]">
                  {equippedTitle.name}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9px] font-black text-[#24415C]/60 uppercase">TOTAL XP</div>
              <div className="font-display text-lg leading-tight font-bold tabular-nums text-[#3998F7]">
                {profile.totalXP.toLocaleString()}
              </div>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[10px] font-black text-[#24415C]/75">
              <span>
                {profile.isMaxLevel
                  ? 'MAX LEVEL REACHED'
                  : `NEXT: LV.${profile.currentLevel + 1}`}
              </span>
              <span className="tabular-nums">
                {profile.isMaxLevel
                  ? '100 / 100'
                  : `${profile.currentLevelXP} / ${profile.nextLevelXP} XP (${profile.progressPercent}%)`}
              </span>
            </div>
            <div className="mt-1 h-3 w-full overflow-hidden rounded-full border-2 border-[#24415C] bg-[#EEF7FF]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#61D66B] via-[#38BDF8] to-[#3998F7] transition-all duration-300"
                style={{ width: `${profile.isMaxLevel ? 100 : profile.progressPercent}%` }}
              />
            </div>
          </div>

          {/* Next Reward Spotlight */}
          {nextReward && (
            <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#24415C]/20 bg-[#FFFDF2] px-2.5 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-base" aria-hidden="true">
                  {nextReward.icon}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[10px] font-black text-[#24415C]">
                    {nextReward.level <= profile.currentLevel
                      ? `READY TO CLAIM · Lv.${nextReward.level}`
                      : `NEXT REWARD · Lv.${nextReward.level}`}
                  </div>
                  <div className="truncate text-[11px] font-bold text-[#24415C]/75">
                    {nextReward.title}
                  </div>
                </div>
              </div>
              {nextReward.level <= profile.currentLevel && (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    setActiveTab('rewards');
                  }}
                  className="shrink-0 rounded-lg border-2 border-[#24415C] bg-[#61D66B] px-2 py-1 text-[10px] font-black text-[#24415C]"
                >
                  CLAIM
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div
          role="tablist"
          aria-label="Progression Sections"
          className="mt-2 grid shrink-0 grid-cols-4 gap-1.5"
        >
          {(
            [
              { id: 'rewards', label: 'REWARDS', icon: Gift, badge: unclaimedCount },
              { id: 'titles', label: 'TITLES', icon: Award, badge: 0 },
              { id: 'history', label: 'XP LOG', icon: History, badge: 0 },
              { id: 'stats', label: 'RANKS', icon: BarChart3, badge: 0 },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  audioManager.playButton();
                  setActiveTab(tab.id);
                }}
                className={`relative flex min-h-[42px] items-center justify-center gap-1 rounded-2xl border-2 px-1.5 text-[10px] font-black transition-colors ${
                  active
                    ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_3px_0_#24415C]'
                    : 'border-[#24415C]/25 bg-white/90 text-[#24415C]/75'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#24415C] bg-[#FF6B6B] px-1 text-[9px] font-black tabular-nums text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {banner && (
          <div className="mt-2 flex shrink-0 items-center gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-900">
            <Check className="h-4 w-4 shrink-0" />
            <span className="truncate">{banner}</span>
          </div>
        )}

        {/* Tab Panel Scrollable Content */}
        <div className="mt-2 flex-1 overflow-y-auto rounded-3xl border-2 border-[#24415C] bg-white/95 p-3 shadow-[0_5px_0_#24415C]">
          {activeTab === 'rewards' && (
            <LevelRewardTrack
              currentLevel={profile.currentLevel}
              claimedLevels={profile.claimedLevelRewards}
              profileId={profile.profileId}
              onClaimOutcome={handleClaimOutcome}
            />
          )}

          {activeTab === 'titles' && (
            <div className="space-y-4">
              {/* Avatar Frames */}
              <section>
                <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AVATAR FRAMES</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FRAME_IDS.map((fid) => {
                    const fMeta = AVATAR_FRAME_META[fid] ?? AVATAR_FRAME_META.default;
                    const unlocked = profile.unlockedFrameIds.includes(fid);
                    const equipped = profile.equippedFrameId === fid;
                    return (
                      <button
                        key={fid}
                        type="button"
                        disabled={!unlocked}
                        onClick={() => {
                          if (!unlocked) return;
                          audioManager.playButton();
                          playerProgressionManager.equipFrame(fid, profile.profileId);
                          flashBanner(`Frame aktif: ${fMeta.name}`);
                        }}
                        className={`min-h-[38px] rounded-xl border-2 px-2.5 text-[10px] font-black transition-colors ${
                          equipped
                            ? 'border-[#24415C] bg-[#3998F7] text-white shadow-[0_2px_0_#24415C]'
                            : unlocked
                              ? 'border-[#24415C]/30 bg-[#EEF7FF] text-[#24415C]'
                              : 'border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                      >
                        {equipped ? `✓ ${fMeta.name}` : unlocked ? fMeta.name : `🔒 ${fMeta.name}`}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Player Titles */}
              <section>
                <div className="flex items-center justify-between text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
                  <span className="inline-flex items-center gap-1.5">
                    <Crown className="h-3.5 w-3.5 text-[#F59E0B]" />
                    <span>PLAYER TITLES</span>
                  </span>
                  <span className="tabular-nums text-[#24415C]/65">
                    {profile.unlockedTitleIds.length}/{TITLE_REGISTRY.length}
                  </span>
                </div>

                <div className="mt-2 space-y-2">
                  {TITLE_REGISTRY.map((titleDef) => {
                    const unlocked = profile.unlockedTitleIds.includes(titleDef.id);
                    const equipped = profile.equippedTitleId === titleDef.id;
                    const style = TITLE_RARITY_STYLE[titleDef.rarity];

                    return (
                      <div
                        key={titleDef.id}
                        className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 ${
                          equipped
                            ? 'border-[#24415C] bg-gradient-to-r from-[#FFF9DB] to-[#FEF08A] shadow-[0_3px_0_#24415C]'
                            : unlocked
                              ? 'border-[#24415C]/25 bg-[#F8FBFF]'
                              : 'border-slate-200 bg-slate-50 opacity-80'
                        }`}
                      >
                        <div className="min-w-0 flex-1 text-left">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-display text-sm font-bold text-[#24415C]">
                              {titleDef.name}
                            </span>
                            <span
                              className={`rounded-md border border-[#24415C]/20 px-1.5 py-0.5 text-[8px] font-black ${style.badgeBg} ${style.badgeText}`}
                            >
                              {titleDef.rarity}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-snug font-bold text-[#24415C]/70">
                            {titleDef.description}
                          </p>
                          <div className="mt-0.5 text-[9px] font-black text-[#3998F7] uppercase">
                            {unlocked ? titleDef.sourceLabel : `Unlock: ${titleDef.unlockRequirementLabel}`}
                          </div>
                        </div>

                        <div className="shrink-0">
                          {equipped ? (
                            <span className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border-2 border-[#24415C] bg-[#61D66B] px-2.5 text-[10px] font-black text-[#24415C]">
                              <Check className="h-3.5 w-3.5" />
                              <span>EQUIPPED</span>
                            </span>
                          ) : unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                audioManager.playTitleUnlocked();
                                playerProgressionManager.equipTitle(titleDef.id, profile.profileId);
                                flashBanner(`Title aktif: ${titleDef.name}`);
                              }}
                              className="btn-base btn-primary min-h-[38px] px-3 py-1 text-[10px]"
                            >
                              EQUIP
                            </button>
                          ) : (
                            <span className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-2.5 text-[10px] font-black text-slate-500">
                              <Lock className="h-3 w-3" />
                              <span>LOCKED</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'history' && <XPHistoryList entries={profile.xpHistory} />}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              {/* XP Breakdown */}
              <section className="rounded-2xl bg-[#EEF7FF] p-3">
                <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
                  XP SOURCE BREAKDOWN
                </h3>
                <div className="mt-2 space-y-2">
                  {(
                    [
                      { label: 'Gameplay & Milestones', val: profile.stats.totalGameplayXP, color: 'bg-[#3998F7]' },
                      { label: 'Daily & Weekly Missions', val: profile.stats.totalMissionXP, color: 'bg-[#61D66B]' },
                      { label: '2P & Tournament', val: profile.stats.totalTournamentXP, color: 'bg-[#F97316]' },
                      { label: 'Achievements', val: profile.stats.totalAchievementXP, color: 'bg-[#F59E0B]' },
                      { label: 'Collection & Worlds', val: profile.stats.totalCollectionXP, color: 'bg-[#9333EA]' },
                    ] as const
                  ).map((row) => {
                    const pct = Math.min(100, Math.round((row.val / totalCategoryXP) * 100));
                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between text-[10px] font-extrabold text-[#24415C]">
                          <span>{row.label}</span>
                          <span className="tabular-nums">{row.val.toLocaleString()} XP</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white">
                          <div
                            className={`h-full rounded-full ${row.color}`}
                            style={{ width: `${row.val > 0 ? Math.max(4, pct) : 0}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Rank Tier Ladder */}
              <section>
                <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
                  PLAYER RANK TIERS (LV 1 – 100)
                </h3>
                <div className="mt-2 space-y-1.5">
                  {PLAYER_RANK_TIERS.map((tier) => {
                    const isCurrent = profile.rank.id === tier.id;
                    const reached = profile.currentLevel >= tier.minLevel;
                    return (
                      <div
                        key={tier.id}
                        className={`flex items-center justify-between rounded-xl border-2 px-3 py-2 ${
                          isCurrent
                            ? `border-[#24415C] bg-gradient-to-r ${tier.gradientClass} shadow-[0_2px_0_#24415C]`
                            : reached
                              ? 'border-[#24415C]/20 bg-[#F8FBFF]'
                              : 'border-slate-200 bg-slate-50 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base" aria-hidden="true">
                            {tier.icon}
                          </span>
                          <span className="text-xs font-black text-[#24415C]">{tier.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs font-bold tabular-nums text-[#24415C]/80">
                            {tier.minLevel === tier.maxLevel
                              ? `LV.${tier.minLevel}`
                              : `LV.${tier.minLevel}–${tier.maxLevel}`}
                          </span>
                          {isCurrent && (
                            <span className="rounded-md border border-[#24415C] bg-white px-1.5 py-0.5 text-[9px] font-black text-[#24415C]">
                              CURRENT
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
