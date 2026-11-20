import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Flame,
  History,
  Sparkles,
  Star,
  Sun,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import {
  formatCountdown,
  getMsUntilNextDailyReset,
  getMsUntilNextWeeklyReset,
} from '../game/missions/MissionDateUtils';
import { missionManager } from '../game/missions/MissionManager';
import { AVATAR_FRAME_META } from '../game/missions/MissionRegistry';
import { AvatarFrameId, MissionSnapshot } from '../game/missions/MissionTypes';
import { vibrationManager } from '../game/settings/VibrationManager';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';
import { CurrencyDisplay } from './CurrencyDisplay';
import { DailyStreakCard } from './DailyStreakCard';
import { MissionCard } from './MissionCard';
import { MissionHistoryList } from './MissionHistoryList';

export type MissionCenterTab = 'daily' | 'weekly' | 'special' | 'history';

interface MissionCenterScreenProps {
  snapshot: MissionSnapshot;
  coins: number;
  gems: number;
  customFaceImg: HTMLImageElement | null;
  activeCharacterId: string;
  activeSkinId: SkinId;
  isCustomFaceActive: boolean;
  rewardAnimationEnabled: boolean;
  reducedMotion: boolean;
  onBack: () => void;
}

export const MissionCenterScreen: React.FC<MissionCenterScreenProps> = ({
  snapshot,
  coins,
  gems,
  customFaceImg,
  activeCharacterId,
  activeSkinId,
  isCustomFaceActive,
  rewardAnimationEnabled,
  reducedMotion,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<MissionCenterTab>('daily');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [justClaimedId, setJustClaimedId] = useState<string | null>(null);
  const [claimBanner, setClaimBanner] = useState<string | null>(null);
  const claimTimerRef = useRef<number | null>(null);

  useEffect(() => {
    missionManager.ensureCurrentPeriods();
    const interval = window.setInterval(() => {
      const t = Date.now();
      setNowMs(t);
      missionManager.ensureCurrentPeriods(t, true);
    }, 1000);
    return () => {
      window.clearInterval(interval);
      if (claimTimerRef.current !== null) {
        window.clearTimeout(claimTimerRef.current);
      }
    };
  }, []);

  const activeChar = getCharacterById(activeCharacterId);
  const frameMeta = AVATAR_FRAME_META[snapshot.cosmetics.equippedFrame] ?? AVATAR_FRAME_META.default;
  const dailyCountdown = formatCountdown(getMsUntilNextDailyReset(nowMs));
  const weeklyCountdown = formatCountdown(getMsUntilNextWeeklyReset(nowMs));

  const handleClaim = (missionId: string) => {
    const res = missionManager.claimReward(missionId);
    if (!res.success || !res.rewardGranted) return;

    audioManager.playMissionClaim();
    vibrationManager.vibrateVictory();
    setJustClaimedId(missionId);

    const parts: string[] = [];
    if (res.rewardGranted.coins > 0) parts.push(`+${res.rewardGranted.coins} Coins`);
    if (res.rewardGranted.gems > 0) parts.push(`+${res.rewardGranted.gems} Gems`);
    if (res.unlockedCosmetics.skinId) parts.push(`Skin ${res.unlockedCosmetics.skinId.toUpperCase()}`);
    if (res.unlockedCosmetics.title) parts.push(`Title "${res.unlockedCosmetics.title}"`);
    if (res.unlockedCosmetics.badge) parts.push(`Badge ${res.unlockedCosmetics.badge}`);
    if (res.unlockedCosmetics.avatarFrame) parts.push(`New Frame!`);
    if (res.streakMilestonesUnlocked.length > 0) {
      const ms = res.streakMilestonesUnlocked[res.streakMilestonesUnlocked.length - 1];
      parts.push(`🔥 ${ms.days}d Streak Bonus!`);
    }

    setClaimBanner(parts.join(' · '));
    if (claimTimerRef.current !== null) {
      window.clearTimeout(claimTimerRef.current);
    }
    claimTimerRef.current = window.setTimeout(() => {
      setJustClaimedId(null);
      setClaimBanner(null);
    }, 2800);
  };

  const tabs: ReadonlyArray<{
    id: MissionCenterTab;
    label: string;
    badge: number;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'daily', label: 'DAILY', badge: snapshot.unclaimed.daily, Icon: Sun },
    { id: 'weekly', label: 'WEEKLY', badge: snapshot.unclaimed.weekly, Icon: CalendarDays },
    { id: 'special', label: 'SPECIAL', badge: snapshot.unclaimed.special, Icon: Star },
    { id: 'history', label: 'HISTORY', badge: 0, Icon: History },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-center-title"
      className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/30 px-3 pt-safe pb-safe backdrop-blur-sm"
    >
      {/* Top Bar */}
      <header className="flex shrink-0 items-center justify-between gap-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[44px] shrink-0 px-3 py-1.5 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <div className="min-w-0 flex-1 text-center">
          <h2
            id="mission-center-title"
            className="font-display text-stroke-dark truncate text-lg leading-tight font-bold tracking-wide text-white"
          >
            MISSION CENTER
          </h2>
          <p className="truncate text-[9px] font-black tracking-wide text-white/95 drop-shadow-[0_1px_0_#24415C]">
            Every flight brings you closer to a reward!
          </p>
        </div>

        <div className="shrink-0">
          <CurrencyDisplay coins={coins} gems={gems} compact />
        </div>
      </header>

      {/* Scrollable Body */}
      <div className="mx-auto flex w-full max-w-[366px] flex-1 flex-col gap-2.5 overflow-y-auto pt-1 pb-2">
        {/* Player Mission Profile & Summary */}
        <section className="game-panel p-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] bg-gradient-to-b from-[#E0F4FF] to-[#B5E7FF] ${frameMeta.ringClass}`}
              style={{ borderColor: frameMeta.borderColor }}
            >
              <CharacterShowcaseCanvas
                customFaceImg={isCustomFaceActive ? customFaceImg : null}
                characterId={activeCharacterId}
                skinId={activeSkinId}
                rarity={isCustomFaceActive ? undefined : activeChar.rarity}
                size={46}
                animate={!reducedMotion}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-display text-sm font-bold text-[#24415C]">
                  {isCustomFaceActive ? 'CUSTOM FLYER' : activeChar.name}
                </span>
                {snapshot.cosmetics.equippedTitle && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-[#24415C]/25 bg-gradient-to-r from-[#FFD84D] to-[#F472B6] px-1.5 py-0.5 text-[8px] font-black text-[#24415C]">
                    <Crown className="h-2.5 w-2.5" />
                    {snapshot.cosmetics.equippedTitle}
                  </span>
                )}
              </div>

              <div className="mt-1.5 grid grid-cols-4 gap-1 text-center">
                <div className="rounded-xl bg-[#EEF7FF] px-1 py-1">
                  <div className="font-display text-xs font-bold tabular-nums text-[#24415C]">
                    {snapshot.stats.totalCompleted}
                  </div>
                  <div className="text-[8px] font-black text-[#24415C]/65 uppercase">DONE</div>
                </div>
                <div className="rounded-xl bg-orange-50 px-1 py-1">
                  <div className="inline-flex items-center justify-center gap-0.5 font-display text-xs font-bold tabular-nums text-[#EA580C]">
                    <Flame className="h-3 w-3" />
                    {snapshot.streak.currentStreak}
                  </div>
                  <div className="text-[8px] font-black text-[#24415C]/65 uppercase">STREAK</div>
                </div>
                <div className="rounded-xl bg-amber-50 px-1 py-1">
                  <div className="font-display text-xs font-bold tabular-nums text-[#B45309]">
                    {snapshot.streak.bestStreak}d
                  </div>
                  <div className="text-[8px] font-black text-[#24415C]/65 uppercase">BEST</div>
                </div>
                <div className="rounded-xl bg-emerald-50 px-1 py-1">
                  <div className="inline-flex items-center justify-center gap-0.5 font-display text-xs font-bold tabular-nums text-[#15803D]">
                    <Coins className="h-3 w-3 text-[#F59E0B]" />
                    {snapshot.stats.totalCoinsEarned}
                  </div>
                  <div className="text-[8px] font-black text-[#24415C]/65 uppercase">EARNED</div>
                </div>
              </div>
            </div>
          </div>

          {claimBanner && (
            <div
              role="status"
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-900"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate">Claimed: {claimBanner}</span>
            </div>
          )}
        </section>

        {/* 4 Navigation Tabs */}
        <nav
          role="tablist"
          aria-label="Mission Categories"
          className="grid shrink-0 grid-cols-4 gap-1.5"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const TabIcon = tab.Icon;
            return (
              <button
                key={tab.id}
                id={`mission-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`mission-panel-${tab.id}`}
                onClick={() => {
                  audioManager.playButton();
                  setActiveTab(tab.id);
                }}
                className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-[#24415C] px-1 py-1 text-[9px] font-black tracking-wide transition-colors ${
                  active
                    ? 'bg-[#FFD84D] text-[#24415C] shadow-[0_3px_0_#24415C]'
                    : 'bg-white/95 text-[#24415C]/75 hover:bg-white'
                }`}
              >
                <TabIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    aria-label={`${tab.badge} unclaimed`}
                    className="absolute -top-1.5 -right-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#24415C] bg-[#FF6B6B] px-1 text-[9px] font-black tabular-nums text-white shadow-[0_1px_0_#24415C]"
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* TAB CONTENT */}
        {activeTab === 'daily' && (
          <div
            id="mission-panel-daily"
            role="tabpanel"
            aria-labelledby="mission-tab-daily"
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between rounded-xl border-2 border-[#24415C] bg-white/95 px-3 py-2 text-[11px] font-black text-[#24415C]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#3998F7]" />
                <span>DAILY RESET IN</span>
              </span>
              <span className="font-display tabular-nums text-[#3998F7]">{dailyCountdown}</span>
            </div>

            <DailyStreakCard
              streak={snapshot.streak}
              todayKey={snapshot.dailyPeriodKey}
              nowMs={nowMs}
            />

            <div className="space-y-2.5">
              {snapshot.dailyMissions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  justClaimed={justClaimedId === m.id}
                  rewardAnimationEnabled={rewardAnimationEnabled}
                  reducedMotion={reducedMotion}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div
            id="mission-panel-weekly"
            role="tabpanel"
            aria-labelledby="mission-tab-weekly"
            className="space-y-2.5"
          >
            <div className="flex items-center justify-between rounded-xl border-2 border-[#24415C] bg-white/95 px-3 py-2 text-[11px] font-black text-[#24415C]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#7C3AED]" />
                <span>WEEKLY RESET (MON 00:00)</span>
              </span>
              <span className="font-display tabular-nums text-[#7C3AED]">{weeklyCountdown}</span>
            </div>

            <div className="space-y-2.5">
              {snapshot.weeklyMissions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  justClaimed={justClaimedId === m.id}
                  rewardAnimationEnabled={rewardAnimationEnabled}
                  reducedMotion={reducedMotion}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'special' && (
          <div
            id="mission-panel-special"
            role="tabpanel"
            aria-labelledby="mission-tab-special"
            className="space-y-2.5"
          >
            {/* Cosmetics Wardrobe Strip (Unlocked Titles, Frames & Badges) */}
            {(snapshot.cosmetics.titles.length > 0 ||
              snapshot.cosmetics.frames.length > 1 ||
              snapshot.cosmetics.badges.length > 0) && (
              <section className="rounded-2xl border-2 border-[#24415C] bg-white/95 p-3 shadow-[0_3px_0_#24415C]">
                <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-[#9333EA] uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>UNLOCKED MISSION REWARDS</span>
                </div>

                {snapshot.cosmetics.titles.length > 0 && (
                  <div className="mt-2">
                    <div className="text-[9px] font-black text-[#24415C]/65 uppercase">
                      EQUIPPED TITLE
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {snapshot.cosmetics.titles.map((t) => {
                        const eq = snapshot.cosmetics.equippedTitle === t;
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              audioManager.playButton();
                              missionManager.equipTitle(eq ? null : t);
                            }}
                            className={`min-h-[36px] rounded-xl border-2 px-2.5 text-[10px] font-black ${
                              eq
                                ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                                : 'border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]/80'
                            }`}
                          >
                            {eq ? `✓ ${t}` : t}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {snapshot.cosmetics.frames.length > 1 && (
                  <div className="mt-2">
                    <div className="text-[9px] font-black text-[#24415C]/65 uppercase">
                      AVATAR FRAME
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {snapshot.cosmetics.frames.map((fid: AvatarFrameId) => {
                        const eq = snapshot.cosmetics.equippedFrame === fid;
                        const fMeta = AVATAR_FRAME_META[fid] ?? AVATAR_FRAME_META.default;
                        return (
                          <button
                            key={fid}
                            type="button"
                            onClick={() => {
                              audioManager.playButton();
                              missionManager.equipFrame(fid);
                            }}
                            className={`min-h-[36px] rounded-xl border-2 px-2.5 text-[10px] font-black ${
                              eq
                                ? 'border-[#24415C] bg-[#3998F7] text-white'
                                : 'border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]/80'
                            }`}
                          >
                            {eq ? `✓ ${fMeta.name}` : fMeta.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {snapshot.cosmetics.badges.length > 0 && (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {snapshot.cosmetics.badges.map((b) => (
                      <span
                        key={b}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-900"
                      >
                        <Award className="h-2.5 w-2.5" />
                        {b}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="space-y-2.5">
              {snapshot.specialMissions.map((m) => (
                <MissionCard
                  key={m.id}
                  mission={m}
                  justClaimed={justClaimedId === m.id}
                  rewardAnimationEnabled={rewardAnimationEnabled}
                  reducedMotion={reducedMotion}
                  onClaim={handleClaim}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div
            id="mission-panel-history"
            role="tabpanel"
            aria-labelledby="mission-tab-history"
          >
            <MissionHistoryList
              history={snapshot.history}
              totalCoinsEarned={snapshot.stats.totalCoinsEarned}
              totalGemsEarned={snapshot.stats.totalGemsEarned}
            />
          </div>
        )}
      </div>
    </div>
  );
};
