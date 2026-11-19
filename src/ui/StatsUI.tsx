import React from 'react';
import {
  ArrowLeft,
  Award,
  BarChart3,
  Crown,
  Flame,
  Gamepad2,
  Trophy,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { GameStats } from '../game/progression/StatsManager';

interface StatsUIProps {
  stats: GameStats;
  bestScore: number;
  unlockedAchievements: number;
  totalAchievements: number;
  personalRecordTitle: string;
  onBack: () => void;
}

export const StatsUI: React.FC<StatsUIProps> = ({
  stats,
  bestScore,
  unlockedAchievements,
  totalAchievements,
  personalRecordTitle,
  onBack,
}) => {
  const effectiveBest = Math.max(bestScore, stats.bestScore);
  const maxRecent = Math.max(1, ...stats.recentScores);

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-4 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[44px] px-3.5 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <h2 className="font-display text-stroke-dark text-2xl font-bold tracking-wide text-white">
          STATS
        </h2>

        <div className="w-[78px]" aria-hidden="true" />
      </div>

      {/* Scrollable Stats Panel */}
      <div className="mx-auto mt-1 w-full max-w-[350px] flex-1 overflow-y-auto pb-3">
        <div className="anim-panel-pop game-panel space-y-3.5 p-4">
          {/* Personal Record Banner */}
          <div className="flex items-center justify-between rounded-2xl border-2 border-[#24415C] bg-gradient-to-r from-[#FFF6CE] to-[#FFD84D] p-3.5 shadow-[0_3px_0_#24415C]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-[#24415C] bg-white text-[#F59E0B]">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
                  PERSONAL RECORD
                </div>
                <div className="font-display text-lg font-bold text-[#24415C]">
                  {personalRecordTitle}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-[#24415C]/65 uppercase">MILESTONE</div>
              <div className="font-display text-xl font-bold tabular-nums text-[#24415C]">
                {stats.highestScoreMilestone}
              </div>
            </div>
          </div>

          {/* Primary 2x2 Stat Cards */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-[#EEF7FF] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                <Trophy className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>BEST SCORE</span>
              </div>
              <div className="mt-1 font-display text-3xl font-bold tabular-nums text-[#24415C]">
                {effectiveBest}
              </div>
            </div>

            <div className="rounded-2xl bg-[#EEF7FF] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>TOTAL GAMES</span>
              </div>
              <div className="mt-1 font-display text-3xl font-bold tabular-nums text-[#24415C]">
                {stats.totalGamesPlayed}
              </div>
            </div>

            <div className="rounded-2xl bg-[#EEF7FF] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                <Flame className="h-3.5 w-3.5 text-[#32B85C]" />
                <span>TOTAL PIPES</span>
              </div>
              <div className="mt-1 font-display text-3xl font-bold tabular-nums text-[#24415C]">
                {stats.totalPipesPassed}
              </div>
            </div>

            <div className="rounded-2xl bg-[#EEF7FF] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                <Award className="h-3.5 w-3.5 text-[#8A63F2]" />
                <span>ACHIEVEMENTS</span>
              </div>
              <div className="mt-1 font-display text-3xl font-bold tabular-nums text-[#24415C]">
                {unlockedAchievements}
                <span className="text-lg text-[#24415C]/50">/{totalAchievements}</span>
              </div>
            </div>
          </div>

          {/* Simple Recent Flights Chart */}
          <div className="rounded-2xl bg-[#EEF7FF] p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
                <BarChart3 className="h-3.5 w-3.5" />
                <span>RECENT FLIGHTS</span>
              </div>
              <span className="text-[11px] font-bold text-[#24415C]/60">
                Last {stats.recentScores.length} runs
              </span>
            </div>

            {stats.recentScores.length === 0 ? (
              <div className="mt-3 rounded-xl bg-white/75 py-4 text-center text-xs font-bold text-[#24415C]/60">
                Play a game to track your flight history!
              </div>
            ) : (
              <div className="mt-3 flex h-24 items-end gap-1.5 rounded-xl bg-white/80 px-2.5 pt-4 pb-2">
                {stats.recentScores.map((runScore, idx) => {
                  const barHeightPct = Math.max(12, Math.round((runScore / maxRecent) * 100));
                  const isRecordRun = runScore > 0 && runScore === effectiveBest;
                  return (
                    <div
                      key={`${idx}-${runScore}`}
                      className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    >
                      <span className="text-[10px] font-black tabular-nums text-[#24415C]/70">
                        {runScore}
                      </span>
                      <div
                        className={`w-full rounded-t-lg border border-[#24415C]/25 transition-all ${
                          isRecordRun ? 'bg-[#FFD84D]' : 'bg-[#3998F7]'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
