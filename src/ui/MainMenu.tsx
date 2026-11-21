import React from 'react';
import {
  Award,
  BarChart3,
  Camera,
  ClipboardCheck,
  Compass,
  Crown,
  Gift,
  Info,
  Play,
  Settings,
  Sparkles,
  Swords,
  Target,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { AchievementRecord } from '../game/achievements/AchievementTypes';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById, RARITY_META } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import { AVATAR_FRAME_META } from '../game/missions/MissionRegistry';
import { AvatarFrameId } from '../game/missions/MissionTypes';
import { getWorldById, WorldId } from '../game/worlds/WorldRegistry';
import { AchievementShowcaseStrip } from './AchievementShowcaseStrip';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';
import { CurrencyDisplay } from './CurrencyDisplay';
import { PWAInstallButton } from './PWAInstallButton';

interface MainMenuProps {
  bestScore: number;
  unlockedCount: number;
  totalAchievements: number;
  customFaceImg: HTMLImageElement | null;
  activeCharacterId: string;
  activeSkinId: SkinId;
  isCustomFaceActive: boolean;
  collectionUnlockedCount: number;
  collectionTotalCount: number;
  hasLegendTitle: boolean;
  activeWorldId: WorldId;
  worldUnlockedCount: number;
  worldTotalCount: number;
  hasWorldExplorerBadge: boolean;
  coins: number;
  gems: number;
  unclaimedMissions: number;
  missionReminderEnabled: boolean;
  equippedMissionTitle: string | null;
  equippedMissionFrame: AvatarFrameId;
  playerLevel: number;
  playerRankName: string;
  playerRankIcon: string;
  playerTitleName: string;
  unclaimedLevelRewards: number;
  showcaseRecords?: AchievementRecord[];
  achievementPoints?: number;
  achievementRankLabel?: string;
  badgeEffectsEnabled?: boolean;
  reducedMotion?: boolean;
  competitiveRankLabel?: string;
  competitiveRankColor?: string;
  competitivePoints?: number;
  unclaimedChallenges?: number;
  onCompetitiveHub?: () => void;
  onPlay: () => void;
  onTwoPlayer: () => void;
  onTournament: () => void;
  onWorlds: () => void;
  onMissions: () => void;
  onProfile: () => void;
  onProgression: () => void;
  onCharacters: () => void;
  onLeaderboard: () => void;
  onChangeFace: () => void;
  onAchievements: () => void;
  onStats: () => void;
  onSettings: () => void;
  onAbout: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  bestScore,
  unlockedCount,
  totalAchievements,
  customFaceImg,
  activeCharacterId,
  activeSkinId,
  isCustomFaceActive,
  collectionUnlockedCount,
  collectionTotalCount,
  hasLegendTitle,
  activeWorldId,
  worldUnlockedCount,
  worldTotalCount,
  hasWorldExplorerBadge,
  coins,
  gems,
  unclaimedMissions,
  missionReminderEnabled,
  equippedMissionTitle,
  equippedMissionFrame,
  playerLevel,
  playerRankName,
  playerRankIcon,
  playerTitleName,
  unclaimedLevelRewards,
  showcaseRecords = [],
  achievementPoints = 0,
  achievementRankLabel,
  badgeEffectsEnabled = true,
  reducedMotion = false,
  competitiveRankLabel,
  competitiveRankColor = '#FFD84D',
  competitivePoints = 0,
  unclaimedChallenges = 0,
  onCompetitiveHub,
  onPlay,
  onTwoPlayer,
  onTournament,
  onWorlds,
  onMissions,
  onProfile,
  onProgression,
  onCharacters,
  onLeaderboard,
  onChangeFace,
  onAchievements,
  onStats,
  onSettings,
  onAbout,
}) => {
  const activeChar = getCharacterById(activeCharacterId);
  const rarity = RARITY_META[activeChar.rarity];
  const activeWorld = getWorldById(activeWorldId);
  const frameMeta = AVATAR_FRAME_META[equippedMissionFrame] ?? AVATAR_FRAME_META.default;
  const displayTitle = equippedMissionTitle ?? playerTitleName;

  return (
    <div className="anim-fade-in relative z-20 flex h-full w-full flex-col justify-between overflow-y-auto px-4 pt-safe pb-safe sm:px-5">
      {/* Top: Decorated Playful Logo & Best Score */}
      <header className="relative flex shrink-0 flex-col items-center pt-1 text-center sm:pt-1.5">
        <div className="anim-float relative inline-flex flex-col items-center">
          <svg
            aria-hidden="true"
            viewBox="0 0 40 28"
            className="absolute -top-2 -left-8 h-7 w-9 -rotate-12 drop-shadow-sm"
          >
            <path
              d="M36 22C20 26 8 20 3 9c7-4 17 0 22 6-1-6 3-11 9-12 4 6 4 13 2 19z"
              fill="#FFFFFF"
              stroke="#24415C"
              strokeWidth="2.6"
              strokeLinejoin="round"
            />
          </svg>
          <Sparkles
            aria-hidden="true"
            className="anim-sparkle absolute -top-2 -right-7 h-6 w-6 text-[#FFD84D] drop-shadow-[0_2px_0_#24415C]"
          />

          <h1 className="font-display text-stroke-logo text-[2.1rem] leading-[0.94] font-bold tracking-wide text-white sm:text-[2.45rem]">
            FLAPPY
            <span className="mt-0.5 block text-[#FFD84D]">FACE</span>
          </h1>
        </div>

        <p className="mt-1 text-[10px] font-black tracking-widest text-white/95 uppercase drop-shadow-[0_1px_0_#24415C]">
          One tap. Endless chaos.
        </p>

        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
          <div className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#24415C] bg-white/92 px-3.5 py-0.5 shadow-[0_3px_0_#24415C]">
            <Trophy className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <span className="text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
              Best
            </span>
            <span className="font-display text-base font-bold tabular-nums text-[#24415C]">
              {bestScore}
            </span>
          </div>

          <CurrencyDisplay coins={coins} gems={gems} compact />

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onProfile();
            }}
            className="inline-flex items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-gradient-to-r from-[#FFF9DB] to-[#FDE047] px-2.5 py-0.5 text-[10px] font-black text-[#24415C] shadow-[0_3px_0_#24415C] active:translate-y-0.5"
          >
            <span aria-hidden="true">{playerRankIcon}</span>
            <span className="tabular-nums">LV.{playerLevel}</span>
            <span>·</span>
            <span>{playerRankName}</span>
            <span>·</span>
            <span className="max-w-[92px] truncate text-[#0369A1]">{displayTitle}</span>
          </button>

          {hasLegendTitle && (
            <div className="inline-flex items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-gradient-to-r from-[#FFD84D] to-[#F472B6] px-2.5 py-0.5 text-[10px] font-black text-[#24415C] shadow-[0_3px_0_#24415C]">
              <Crown className="h-3 w-3" />
              <span>LEGEND FACE</span>
            </div>
          )}

          {hasWorldExplorerBadge && (
            <div className="inline-flex items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-gradient-to-r from-[#38BDF8] to-[#61D66B] px-2.5 py-0.5 text-[10px] font-black text-[#24415C] shadow-[0_3px_0_#24415C]">
              <Compass className="h-3 w-3" />
              <span>WORLD EXPLORER</span>
            </div>
          )}

          {achievementRankLabel && achievementPoints > 0 && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onAchievements();
              }}
              className="inline-flex items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-white/95 px-2.5 py-0.5 text-[10px] font-black text-[#24415C] shadow-[0_3px_0_#24415C]"
            >
              <Award className="h-3 w-3 text-[#F59E0B]" />
              <span>{achievementRankLabel}</span>
              <span className="tabular-nums text-[#3998F7]">{achievementPoints}P</span>
            </button>
          )}

          {onCompetitiveHub && competitiveRankLabel && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onCompetitiveHub();
              }}
              className="inline-flex items-center gap-1 rounded-2xl border-2 border-[#24415C] bg-white/95 px-2.5 py-0.5 text-[10px] font-black text-[#24415C] shadow-[0_3px_0_#24415C]"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full border border-[#24415C]"
                style={{ backgroundColor: competitiveRankColor }}
              />
              <span>{competitiveRankLabel}</span>
              {competitivePoints > 0 && (
                <span className="tabular-nums text-[#0369A1]">{competitivePoints}</span>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Center: Animated Character Showcase & Active World / Mission / Progression Bar */}
      <div className="flex min-h-[76px] flex-1 flex-col items-center justify-center overflow-hidden py-0.5">
        <div
          className={`rounded-full p-0.5 ${
            equippedMissionFrame !== 'default' ? frameMeta.ringClass : ''
          }`}
        >
          <CharacterShowcaseCanvas
            customFaceImg={isCustomFaceActive ? customFaceImg : null}
            characterId={activeCharacterId}
            skinId={activeSkinId}
            rarity={isCustomFaceActive ? undefined : activeChar.rarity}
            size={84}
            animate={true}
          />
        </div>
        <span
          className={`mt-0.5 inline-flex items-center rounded-full border border-[#24415C] px-2 py-0.5 text-[9px] font-black tracking-wider uppercase shadow-[0_1px_0_#24415C] ${
            isCustomFaceActive
              ? 'bg-[#3998F7] text-white'
              : `${rarity.badgeBg} ${rarity.badgeText}`
          }`}
        >
          {isCustomFaceActive ? 'CUSTOM FACE' : activeChar.name}
        </span>

        {showcaseRecords.length > 0 && (
          <AchievementShowcaseStrip
            records={showcaseRecords}
            compact={true}
            effectsEnabled={badgeEffectsEnabled}
            reducedMotion={reducedMotion}
            className="mt-1"
          />
        )}

        <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onWorlds();
            }}
            className="btn-base btn-secondary min-h-[34px] rounded-full px-2.5 py-0.5 text-[10px]"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-[#3998F7]" />
            <span>{activeWorld.name}</span>
            <span className="rounded-md bg-[#FFD84D] px-1 py-0.5 text-[9px] font-black text-[#24415C]">
              {worldUnlockedCount}/{worldTotalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onMissions();
            }}
            className="btn-base btn-secondary min-h-[34px] rounded-full px-2.5 py-0.5 text-[10px]"
          >
            <ClipboardCheck className="h-3.5 w-3.5 shrink-0 text-[#32B85C]" />
            <span>MISSIONS</span>
            {missionReminderEnabled && unclaimedMissions > 0 && (
              <span
                aria-label={`${unclaimedMissions} rewards ready`}
                className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#24415C] bg-[#FF6B6B] px-1 text-[9px] font-black tabular-nums text-white"
              >
                {unclaimedMissions}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onProfile();
            }}
            className="btn-base btn-secondary min-h-[34px] rounded-full px-2.5 py-0.5 text-[10px]"
          >
            <User className="h-3.5 w-3.5 shrink-0 text-[#3998F7]" />
            <span>PROFILE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onProgression();
            }}
            className="btn-base btn-secondary min-h-[34px] rounded-full px-2.5 py-0.5 text-[10px]"
          >
            <Gift className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <span>LEVELS</span>
            {unclaimedLevelRewards > 0 && (
              <span
                aria-label={`${unclaimedLevelRewards} level rewards ready`}
                className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#24415C] bg-[#61D66B] px-1 text-[9px] font-black tabular-nums text-[#24415C]"
              >
                {unclaimedLevelRewards}
              </span>
            )}
          </button>

          {onCompetitiveHub && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onCompetitiveHub();
              }}
              className="btn-base btn-secondary min-h-[34px] rounded-full px-2.5 py-0.5 text-[10px]"
            >
              <Target className="h-3.5 w-3.5 shrink-0 text-[#FF6B6B]" />
              <span>COMPETITIVE</span>
              {unclaimedChallenges > 0 && (
                <span
                  aria-label={`${unclaimedChallenges} challenge rewards ready`}
                  className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full border border-[#24415C] bg-[#FF6B6B] px-1 text-[9px] font-black tabular-nums text-white"
                >
                  {unclaimedChallenges}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Bottom: Mode Selection & Secondary Arcade Buttons */}
      <footer className="mx-auto flex w-full max-w-[334px] shrink-0 flex-col gap-1.5 pb-1">
        {/* Primary Play Modes */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onPlay();
            }}
            className="btn-base btn-primary min-h-[46px] px-2.5 py-1.5 text-sm tracking-wide sm:min-h-[50px] sm:text-base"
          >
            <Play className="h-4 w-4 shrink-0 fill-[#24415C] text-[#24415C] sm:h-5 sm:w-5" />
            <span>1 PLAYER</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onTwoPlayer();
            }}
            className="btn-base btn-blue min-h-[46px] px-2.5 py-1.5 text-sm tracking-wide sm:min-h-[50px] sm:text-base"
          >
            <Users className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span>2 PLAYER</span>
          </button>
        </div>

        {/* Tournament & Character Collection */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onTournament();
            }}
            className="btn-base btn-green min-h-[42px] px-2 py-1.5 text-xs tracking-wide sm:min-h-[44px] sm:text-sm"
          >
            <Swords className="h-4 w-4 shrink-0" />
            <span>TOURNAMENT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onCharacters();
            }}
            className="btn-base btn-secondary min-h-[42px] px-2 py-1.5 text-xs sm:min-h-[44px] sm:text-sm"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-[#9333EA]" />
            <span className="truncate">CHARACTERS</span>
            <span className="shrink-0 rounded-lg bg-[#FFD84D] px-1 py-0.5 text-[10px] font-black text-[#24415C]">
              {collectionUnlockedCount}/{collectionTotalCount}
            </span>
          </button>
        </div>

        {/* Custom Face, Leaderboard & Achievements */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onChangeFace();
            }}
            className="btn-base btn-secondary min-h-[38px] px-1.5 py-1 text-[10px] sm:text-[11px]"
          >
            <Camera className="h-3.5 w-3.5 shrink-0 text-[#3998F7]" />
            <span className="truncate">FACE</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onLeaderboard();
            }}
            className="btn-base btn-secondary min-h-[38px] px-1.5 py-1 text-[10px] sm:text-[11px]"
          >
            <Crown className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <span className="truncate">RANK</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onAchievements();
            }}
            className="btn-base btn-secondary min-h-[38px] px-1.5 py-1 text-[10px] sm:text-[11px]"
          >
            <Award className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
            <span className="rounded bg-[#FFD84D] px-1 text-[9px] font-black text-[#24415C]">
              {unlockedCount}/{totalAchievements}
            </span>
          </button>
        </div>

        {/* Statistics, Settings, About */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onStats();
            }}
            className="btn-base btn-secondary min-h-[38px] px-1.5 py-1 text-[11px] sm:text-xs"
          >
            <BarChart3 className="h-3.5 w-3.5 shrink-0 text-[#32B85C]" />
            <span className="truncate">STATS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onSettings();
            }}
            className="btn-base btn-secondary min-h-[38px] px-1.5 py-1 text-[11px] sm:text-xs"
          >
            <Settings className="h-3.5 w-3.5 shrink-0 text-[#3998F7]" />
            <span className="truncate">SETTINGS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onAbout();
            }}
            className="btn-base btn-secondary min-h-[38px] px-1.5 py-1 text-[11px] sm:text-xs"
          >
            <Info className="h-3.5 w-3.5 shrink-0 text-[#3998F7]" />
            <span className="truncate">ABOUT</span>
          </button>
        </div>

        <PWAInstallButton compact />
      </footer>
    </div>
  );
};
