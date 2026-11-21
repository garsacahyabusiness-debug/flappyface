import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Clock,
  Compass,
  Crown,
  Edit3,
  Gamepad2,
  Gift,
  Sparkles,
  Star,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { achievementManager } from '../game/achievements/AchievementManager';
import { ACHIEVEMENT_RARITY_CONFIG } from '../game/achievements/AchievementPointsManager';
import { AchievementRecord, AchievementSnapshot } from '../game/achievements/AchievementTypes';
import { getBadgeById } from '../game/achievements/BadgeRegistry';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import { CharacterSelectionMode } from '../game/character/CharacterUnlockManager';
import { AVATAR_FRAME_META } from '../game/missions/MissionRegistry';
import { MissionStatsSummary } from '../game/missions/MissionTypes';
import { playerProgressionManager } from '../game/progression/PlayerProgressionManager';
import {
  PlayerProgressProfile,
  ProgressionProfileId,
} from '../game/progression/PlayerProgressTypes';
import { GameStats } from '../game/progression/StatsManager';
import { getTitleById } from '../game/progression/TitleRegistry';
import { getWorldById } from '../game/worlds/WorldRegistry';
import { renderAchievementIcon } from './AchievementPopup';
import { AchievementShowcaseStrip } from './AchievementShowcaseStrip';
import { BadgeArtwork } from './BadgeArtwork';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';
import { ProgressionTab } from './PlayerProgressionScreen';

interface PlayerProfileScreenProps {
  soloProfile: PlayerProgressProfile;
  p1Profile: PlayerProgressProfile;
  p2Profile: PlayerProgressProfile;
  stats: GameStats;
  bestScore: number;
  missionStats: MissionStatsSummary;
  achievementsUnlocked: number;
  achievementsTotal: number;
  charsUnlocked: number;
  charsTotal: number;
  worldsUnlocked: number;
  worldsTotal: number;
  customFaceImg: HTMLImageElement | null;
  p1FaceImg: HTMLImageElement | null;
  p2FaceImg: HTMLImageElement | null;
  activeCharacterId: string;
  activeSkinId: SkinId;
  isCustomFaceActive: boolean;
  p1Selection: { mode: CharacterSelectionMode; characterId: string };
  p2Selection: { mode: CharacterSelectionMode; characterId: string };
  p1SkinId: SkinId;
  p2SkinId: SkinId;
  achievementSnapshot?: AchievementSnapshot;
  badgeEffectsEnabled?: boolean;
  reducedMotion?: boolean;
  onUpdateShowcase?: (ids: string[]) => void;
  onRenameSlot?: (slot: ProgressionProfileId, newName: string) => void;
  onOpenProgression: (tab?: ProgressionTab) => void;
  onBack: () => void;
}

function formatPlayTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({
  soloProfile,
  p1Profile,
  p2Profile,
  stats,
  bestScore,
  missionStats,
  achievementsUnlocked,
  achievementsTotal,
  charsUnlocked,
  charsTotal,
  worldsUnlocked,
  worldsTotal,
  customFaceImg,
  p1FaceImg,
  p2FaceImg,
  activeCharacterId,
  activeSkinId,
  isCustomFaceActive,
  p1Selection,
  p2Selection,
  p1SkinId,
  p2SkinId,
  achievementSnapshot,
  badgeEffectsEnabled = true,
  reducedMotion = false,
  onUpdateShowcase,
  onRenameSlot,
  onOpenProgression,
  onBack,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<ProgressionProfileId>('solo');
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(soloProfile.playerName);
  const [showShowcasePicker, setShowShowcasePicker] = useState(false);

  const unlockedRecords: AchievementRecord[] = (achievementSnapshot?.records ?? []).filter(
    (r) => r.unlocked
  );
  const showcaseIds = achievementSnapshot?.showcaseIds ?? [];
  const showcaseRecords: AchievementRecord[] = showcaseIds
    .map((id) => unlockedRecords.find((r) => r.id === id))
    .filter((r): r is AchievementRecord => Boolean(r));

  const profile =
    selectedSlot === 'player1' ? p1Profile : selectedSlot === 'player2' ? p2Profile : soloProfile;

  useEffect(() => {
    setDraftName(profile.playerName);
    setIsEditingName(false);
  }, [selectedSlot, profile.playerName]);

  const frameMeta = AVATAR_FRAME_META[profile.equippedFrameId] ?? AVATAR_FRAME_META.default;
  const equippedTitle = getTitleById(profile.equippedTitleId);

  const avatarProps =
    selectedSlot === 'player1'
      ? {
          customFaceImg: p1Selection.mode === 'custom_face' && p1FaceImg ? p1FaceImg : null,
          characterId: p1Selection.characterId,
          skinId: p1SkinId,
        }
      : selectedSlot === 'player2'
        ? {
            customFaceImg: p2Selection.mode === 'custom_face' && p2FaceImg ? p2FaceImg : null,
            characterId: p2Selection.characterId,
            skinId: p2SkinId,
          }
        : {
            customFaceImg: isCustomFaceActive ? customFaceImg : null,
            characterId: activeCharacterId,
            skinId: activeSkinId,
          };

  const favoriteCharId = playerProgressionManager.getFavoriteCharacterId(selectedSlot);
  const favoriteWorldId = playerProgressionManager.getFavoriteWorldId(selectedSlot);
  const favoriteChar = getCharacterById(favoriteCharId ?? avatarProps.characterId);
  const favoriteWorld = getWorldById(favoriteWorldId ?? 'green_valley');
  const unclaimedCount = playerProgressionManager.getUnclaimedRewardLevels(selectedSlot).length;

  const displayBestScore =
    selectedSlot === 'solo'
      ? Math.max(bestScore, stats.bestScore, profile.stats.bestScore)
      : profile.stats.bestScore;
  const displayGames =
    selectedSlot === 'solo'
      ? Math.max(stats.totalGamesPlayed, profile.stats.totalGamesPlayed)
      : profile.stats.totalGamesPlayed;
  const displayPipes =
    selectedSlot === 'solo'
      ? Math.max(stats.totalPipesPassed, profile.stats.totalPipesPassed)
      : profile.stats.totalPipesPassed;

  const handleSaveName = () => {
    audioManager.playButton();
    const cleaned = playerProgressionManager.setPlayerName(draftName, selectedSlot);
    onRenameSlot?.(selectedSlot, cleaned);
    setDraftName(cleaned);
    setIsEditingName(false);
  };

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
          PLAYER PROFILE
        </h2>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onOpenProgression('rewards');
          }}
          className="btn-base btn-primary min-h-[44px] px-3 py-2 text-xs"
        >
          <Gift className="h-4 w-4" />
          <span>LEVELS</span>
        </button>
      </div>

      {/* Scrollable Profile Content */}
      <div className="mx-auto w-full max-w-[356px] flex-1 space-y-2.5 overflow-y-auto pb-3">
        {/* Profile Slot Switcher */}
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { id: 'solo', label: 'SOLO' },
              { id: 'player1', label: 'PLAYER 1' },
              { id: 'player2', label: 'PLAYER 2' },
            ] as const
          ).map((slot) => {
            const active = selectedSlot === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setSelectedSlot(slot.id);
                }}
                className={`min-h-[40px] rounded-2xl border-2 px-2 text-[11px] font-black uppercase transition-colors ${
                  active
                    ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_3px_0_#24415C]'
                    : 'border-[#24415C]/25 bg-white/90 text-[#24415C]/75'
                }`}
              >
                {slot.label}
              </button>
            );
          })}
        </div>

        {/* Hero Identity Card */}
        <div className="anim-panel-pop game-panel p-4 text-center">
          <div className="flex flex-col items-center">
            <div
              className={`rounded-full bg-[#EEF7FF] p-1 ${
                profile.equippedFrameId !== 'default' ? frameMeta.ringClass : 'ring-2 ring-[#24415C]/15'
              }`}
            >
              <CharacterShowcaseCanvas
                customFaceImg={avatarProps.customFaceImg}
                characterId={avatarProps.characterId}
                skinId={avatarProps.skinId}
                size={88}
                animate={true}
              />
            </div>

            {/* Editable Player Name */}
            <div className="mt-2 flex w-full items-center justify-center gap-1.5">
              {isEditingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveName();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    maxLength={18}
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Player Name"
                    className="w-40 rounded-xl border-2 border-[#24415C] bg-[#EEF7FF] px-2.5 py-1 text-center font-display text-sm font-bold text-[#24415C] uppercase focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    aria-label="Save Name"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#24415C] bg-[#61D66B] text-[#24415C]"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h3 className="font-display text-xl font-bold text-[#24415C]">
                    {profile.playerName}
                  </h3>
                  <button
                    type="button"
                    aria-label="Edit Player Name"
                    onClick={() => {
                      audioManager.playButton();
                      setIsEditingName(true);
                    }}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Level, Rank & Title */}
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
              <span className="rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-2.5 py-0.5 font-display text-xs font-bold tabular-nums text-[#24415C]">
                LEVEL {profile.currentLevel}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-xl border-2 border-[#24415C] bg-gradient-to-r ${profile.rank.gradientClass} px-2.5 py-0.5 text-[10px] font-black text-[#24415C]`}
              >
                <span aria-hidden="true">{profile.rank.icon}</span>
                <span>{profile.rank.name}</span>
              </span>
            </div>

            <div className="mt-1.5 flex items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#24415C]/30 bg-[#FFF9DB] px-2.5 py-0.5 text-[10px] font-black text-[#24415C]">
                <Crown className="h-3 w-3 text-[#F59E0B]" />
                <span>{equippedTitle.name}</span>
              </span>
              {selectedSlot === 'solo' && (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onOpenProgression('titles');
                  }}
                  className="rounded-full border border-[#24415C]/30 bg-[#EEF7FF] px-2 py-0.5 text-[10px] font-black text-[#3998F7]"
                >
                  CHANGE TITLE
                </button>
              )}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="mt-3 rounded-2xl border border-[#24415C]/15 bg-[#EEF7FF] p-2.5 text-left">
            <div className="flex items-center justify-between text-[10px] font-black text-[#24415C]">
              <span>XP PROGRESS</span>
              <span className="tabular-nums text-[#3998F7]">
                {profile.isMaxLevel
                  ? 'MAX LEVEL 100'
                  : `${profile.currentLevelXP} / ${profile.nextLevelXP} XP (${profile.progressPercent}%)`}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/30 bg-white">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#61D66B] to-[#3998F7]"
                style={{ width: `${profile.isMaxLevel ? 100 : profile.progressPercent}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-[#24415C]/65">
              <span className="tabular-nums">Total XP: {profile.totalXP.toLocaleString()}</span>
              <span className="tabular-nums">Level Ups: {profile.totalLevelUps}</span>
            </div>
          </div>

          {/* 3-Slot Achievement Showcase (Solo Profile) */}
          {selectedSlot === 'solo' && achievementSnapshot && (
            <div className="mt-3 rounded-2xl border border-[#24415C]/15 bg-[#FFFDF2] p-2.5 text-center">
              <div className="flex items-center justify-between text-[9px] font-black tracking-wider text-[#B45309] uppercase">
                <span>ACHIEVEMENT SHOWCASE</span>
                <span className="tabular-nums text-[#24415C]">
                  {achievementSnapshot.stats.earnedAchievementPoints} PTS ·{' '}
                  {achievementSnapshot.stats.rank.label}
                </span>
              </div>
              <AchievementShowcaseStrip
                records={showcaseRecords}
                showEmptySlots={true}
                effectsEnabled={badgeEffectsEnabled}
                reducedMotion={reducedMotion}
                onManageClick={() => setShowShowcasePicker(true)}
                className="mt-2"
              />
            </div>
          )}

          {selectedSlot === 'solo' && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onOpenProgression('rewards');
              }}
              className="btn-base btn-green mt-3 min-h-[44px] w-full text-sm"
            >
              <Gift className="h-4 w-4" />
              <span>VIEW LEVEL REWARDS</span>
              {unclaimedCount > 0 && (
                <span className="rounded-full border border-[#24415C] bg-[#FFD84D] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#24415C]">
                  {unclaimedCount} READY
                </span>
              )}
            </button>
          )}
        </div>

        {/* Favorites Strip */}
        <div className="grid grid-cols-2 gap-2">
          <div className="game-panel p-3 text-left">
            <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-[#9333EA] uppercase">
              <Sparkles className="h-3 w-3" />
              <span>FAVORITE HERO</span>
            </div>
            <div className="mt-1 truncate font-display text-sm font-bold text-[#24415C]">
              {favoriteChar.name}
            </div>
            <div className="text-[10px] font-bold text-[#24415C]/60">
              {favoriteCharId
                ? `${profile.stats.characterUsage[favoriteCharId]} runs`
                : 'Active starter'}
            </div>
          </div>

          <div className="game-panel p-3 text-left">
            <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-[#3998F7] uppercase">
              <Compass className="h-3 w-3" />
              <span>FAVORITE WORLD</span>
            </div>
            <div className="mt-1 truncate font-display text-sm font-bold text-[#24415C]">
              {favoriteWorld.name}
            </div>
            <div className="text-[10px] font-bold text-[#24415C]/60">
              {favoriteWorldId
                ? `${profile.stats.worldUsage[favoriteWorldId]} runs`
                : 'Active starter'}
            </div>
          </div>
        </div>

        {/* Progression & Career Statistics */}
        <div className="game-panel p-3.5">
          <h4 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
            CAREER STATISTICS
          </h4>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[#EEF7FF] p-2.5 text-left">
              <div className="flex items-center gap-1 text-[9px] font-black text-[#24415C]/65 uppercase">
                <Trophy className="h-3 w-3 text-[#F59E0B]" />
                <span>BEST SCORE</span>
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                {displayBestScore}
              </div>
            </div>

            <div className="rounded-2xl bg-[#EEF7FF] p-2.5 text-left">
              <div className="flex items-center gap-1 text-[9px] font-black text-[#24415C]/65 uppercase">
                <Gamepad2 className="h-3 w-3 text-[#3998F7]" />
                <span>GAMES PLAYED</span>
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                {displayGames}
              </div>
            </div>

            <div className="rounded-2xl bg-[#EEF7FF] p-2.5 text-left">
              <div className="text-[9px] font-black text-[#24415C]/65 uppercase">PIPES PASSED</div>
              <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#32B85C]">
                {displayPipes}
              </div>
            </div>

            <div className="rounded-2xl bg-[#EEF7FF] p-2.5 text-left">
              <div className="flex items-center gap-1 text-[9px] font-black text-[#24415C]/65 uppercase">
                <Clock className="h-3 w-3 text-[#9333EA]" />
                <span>PLAY TIME</span>
              </div>
              <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                {formatPlayTime(profile.stats.playTimeSeconds)}
              </div>
            </div>

            {selectedSlot === 'solo' ? (
              <>
                <div className="rounded-2xl bg-[#FFF9DB] p-2.5 text-left">
                  <div className="text-[9px] font-black text-[#24415C]/65 uppercase">
                    MISSIONS DONE
                  </div>
                  <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                    {missionStats.totalCompleted}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FFF9DB] p-2.5 text-left">
                  <div className="flex items-center gap-1 text-[9px] font-black text-[#24415C]/65 uppercase">
                    <Award className="h-3 w-3 text-[#F59E0B]" />
                    <span>ACHIEVEMENTS</span>
                  </div>
                  <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                    {achievementsUnlocked}/{achievementsTotal}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F3E8FF] p-2.5 text-left">
                  <div className="text-[9px] font-black text-[#24415C]/65 uppercase">
                    CHARACTERS
                  </div>
                  <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#7C3AED]">
                    {charsUnlocked}/{charsTotal}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#E0F2FE] p-2.5 text-left">
                  <div className="text-[9px] font-black text-[#24415C]/65 uppercase">WORLDS</div>
                  <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#0284C7]">
                    {worldsUnlocked}/{worldsTotal}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-2xl bg-[#FFF9DB] p-2.5 text-left">
                  <div className="flex items-center gap-1 text-[9px] font-black text-[#24415C]/65 uppercase">
                    <Swords className="h-3 w-3 text-[#3998F7]" />
                    <span>QUICK WINS</span>
                  </div>
                  <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                    {profile.stats.quickMatchWins}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FFF9DB] p-2.5 text-left">
                  <div className="flex items-center gap-1 text-[9px] font-black text-[#24415C]/65 uppercase">
                    <Crown className="h-3 w-3 text-[#F59E0B]" />
                    <span>TOURNEY WINS</span>
                  </div>
                  <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-[#24415C]">
                    {profile.stats.tournamentWins} / {profile.stats.tournamentCompletions}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3-SLOT ACHIEVEMENT SHOWCASE PICKER MODAL */}
      {showShowcasePicker && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-[2px]"
        >
          <div className="anim-panel-pop game-panel flex max-h-[82vh] w-full max-w-[336px] flex-col p-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-[#24415C]">
                  ACHIEVEMENT SHOWCASE
                </h3>
                <p className="text-[10px] font-bold text-[#24415C]/65">
                  Pilih hingga 3 achievement terbuka untuk dipajang ({showcaseIds.length}/3).
                </p>
              </div>
              <button
                type="button"
                aria-label="Close Showcase Picker"
                onClick={() => {
                  audioManager.playButton();
                  setShowShowcasePicker(false);
                }}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C]/25 bg-white text-[#24415C]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {unlockedRecords.length === 0 ? (
                <div className="rounded-2xl bg-[#EEF7FF] py-6 text-center text-xs font-bold text-[#24415C]/70">
                  Buka achievement terlebih dahulu untuk dipajang di Showcase!
                </div>
              ) : (
                unlockedRecords.map((rec) => {
                  const pinned = showcaseIds.includes(rec.id);
                  const badge = rec.badgeId ? getBadgeById(rec.badgeId) : null;
                  const cfg = ACHIEVEMENT_RARITY_CONFIG[rec.rarity];
                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        const res = achievementManager.toggleShowcaseAchievement(rec.id);
                        onUpdateShowcase?.(res.updated);
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-colors ${
                        pinned
                          ? 'border-[#24415C] bg-[#FFF9DB] shadow-[0_2px_0_#24415C]'
                          : 'border-[#24415C]/20 bg-white'
                      }`}
                    >
                      {badge ? (
                        <BadgeArtwork
                          badge={badge}
                          size={38}
                          effectsEnabled={badgeEffectsEnabled}
                          reducedMotion={reducedMotion}
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#24415C] bg-[#EEF7FF] text-[#24415C]">
                          {renderAchievementIcon(rec.icon, 'h-4 w-4')}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-sm font-bold text-[#24415C]">
                          {rec.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] font-black">
                          <span className={`rounded px-1.5 py-0.5 ${cfg.badgeBg} ${cfg.badgeText}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[#24415C]/65">+{rec.points} PTS</span>
                        </div>
                      </div>
                      <span
                        className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 text-[10px] font-black ${
                          pinned
                            ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                            : 'border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]/75'
                        }`}
                      >
                        <Star className={`h-3 w-3 ${pinned ? 'fill-[#24415C]' : ''}`} />
                        <span>{pinned ? 'PINNED' : 'PIN'}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                setShowShowcasePicker(false);
              }}
              className="btn-base btn-primary mt-3 min-h-[44px] w-full text-sm"
            >
              DONE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
