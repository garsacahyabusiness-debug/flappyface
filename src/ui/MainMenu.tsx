import React from 'react';
import {
  Award,
  BarChart3,
  Camera,
  Crown,
  Info,
  Play,
  Settings,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';
import { PWAInstallButton } from './PWAInstallButton';

interface MainMenuProps {
  bestScore: number;
  unlockedCount: number;
  totalAchievements: number;
  customFaceImg: HTMLImageElement | null;
  onPlay: () => void;
  onTwoPlayer: () => void;
  onTournament: () => void;
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
  onPlay,
  onTwoPlayer,
  onTournament,
  onLeaderboard,
  onChangeFace,
  onAchievements,
  onStats,
  onSettings,
  onAbout,
}) => {
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

          <h1 className="font-display text-stroke-logo text-[2.15rem] leading-[0.94] font-bold tracking-wide text-white sm:text-[2.65rem]">
            FLAPPY
            <span className="mt-0.5 block text-[#FFD84D]">FACE</span>
          </h1>
        </div>

        <p className="mt-1 text-[10px] font-black tracking-widest text-white/95 uppercase drop-shadow-[0_1px_0_#24415C]">
          One tap. Endless chaos.
        </p>

        <div className="mt-1.5 inline-flex items-center gap-2 rounded-2xl border-2 border-[#24415C] bg-white/92 px-3.5 py-0.5 shadow-[0_3px_0_#24415C]">
          <Trophy className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
          <span className="text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
            Best
          </span>
          <span className="font-display text-base font-bold tabular-nums text-[#24415C]">
            {bestScore}
          </span>
        </div>
      </header>

      {/* Center: Animated Character Showcase (Custom Face or Default Bird) */}
      <div className="flex min-h-[76px] flex-1 items-center justify-center overflow-hidden py-0.5">
        <CharacterShowcaseCanvas customFaceImg={customFaceImg} size={118} />
      </div>

      {/* Bottom: Mode Selection & Secondary Arcade Buttons */}
      <footer className="mx-auto flex w-full max-w-[330px] shrink-0 flex-col gap-1.5 pb-1">
        {/* Primary Play Modes */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onPlay();
            }}
            className="btn-base btn-primary min-h-[48px] px-2.5 py-1.5 text-sm tracking-wide sm:min-h-[52px] sm:text-base"
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
            className="btn-base btn-blue min-h-[48px] px-2.5 py-1.5 text-sm tracking-wide sm:min-h-[52px] sm:text-base"
          >
            <Users className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
            <span>2 PLAYER</span>
          </button>
        </div>

        {/* Tournament & Custom Face */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onTournament();
            }}
            className="btn-base btn-green min-h-[42px] px-2.5 py-1.5 text-xs tracking-wide sm:min-h-[44px] sm:text-sm"
          >
            <Swords className="h-4 w-4 shrink-0" />
            <span>TOURNAMENT</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onChangeFace();
            }}
            className="btn-base btn-secondary min-h-[42px] px-2.5 py-1.5 text-xs sm:min-h-[44px] sm:text-sm"
          >
            <Camera className="h-4 w-4 shrink-0 text-[#3998F7]" />
            <span>CUSTOM FACE</span>
          </button>
        </div>

        {/* Leaderboard & Achievements */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onLeaderboard();
            }}
            className="btn-base btn-secondary min-h-[40px] px-2 py-1 text-[11px] sm:text-xs"
          >
            <Crown className="h-3.5 w-3.5 shrink-0 text-[#F59E0B] sm:h-4 sm:w-4" />
            <span className="truncate">LEADERBOARD</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onAchievements();
            }}
            className="btn-base btn-secondary min-h-[40px] px-1.5 py-1 text-[11px] sm:px-2 sm:text-xs"
          >
            <Award className="h-3.5 w-3.5 shrink-0 text-[#F59E0B] sm:h-4 sm:w-4" />
            <span className="truncate">ACHIEVEMENTS</span>
            <span className="shrink-0 rounded-lg bg-[#FFD84D] px-1 py-0.5 text-[10px] font-black text-[#24415C]">
              {unlockedCount}/{totalAchievements}
            </span>
          </button>
        </div>

        {/* Statistics, Settings, About */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
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
