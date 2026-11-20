import React from 'react';
import { Coins, Flame, Gem, Trophy } from 'lucide-react';
import { getShortDayLabel, getTrailingDateKeys } from '../game/missions/MissionDateUtils';
import { STREAK_MILESTONES } from '../game/missions/MissionRegistry';
import { StreakState } from '../game/missions/MissionTypes';

interface DailyStreakCardProps {
  streak: StreakState;
  todayKey: string;
  nowMs: number;
}

export const DailyStreakCard: React.FC<DailyStreakCardProps> = ({ streak, todayKey, nowMs }) => {
  const claimedToday = streak.lastClaimDateKey === todayKey;
  const nextMilestone =
    STREAK_MILESTONES.find((m) => !streak.claimedMilestones.includes(m.days)) ??
    STREAK_MILESTONES[STREAK_MILESTONES.length - 1];

  const milestonePct = Math.min(
    100,
    Math.round((streak.currentStreak / Math.max(1, nextMilestone.days)) * 100)
  );

  // Build 7-day rolling calendar ending today (or extending forward if streak starts fresh)
  const dayKeys = getTrailingDateKeys(7, nowMs);
  const claimSet = new Set(streak.recentClaimDates);

  return (
    <section className="rounded-2xl border-2 border-[#24415C] bg-gradient-to-br from-[#FFF9E6] via-[#FFF3C4] to-[#FFE29A] p-3 shadow-[0_4px_0_#24415C]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#24415C] bg-gradient-to-b from-[#FF8A3D] to-[#EA580C] text-white shadow-[0_2px_0_#24415C]">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-black tracking-wider text-[#B45309] uppercase">
              DAILY STREAK
            </div>
            <div className="font-display text-lg leading-tight font-bold tabular-nums text-[#24415C]">
              {streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-white/85 px-2 py-0.5 text-[10px] font-black text-[#24415C]">
            <Trophy className="h-3 w-3 text-[#F59E0B]" />
            <span>BEST: {streak.bestStreak}d</span>
          </div>
          <div className="mt-1 text-[9px] font-extrabold text-[#24415C]/75">
            {claimedToday ? '✓ Streak tercatat hari ini' : 'Klaim 1 Daily Mission hari ini!'}
          </div>
        </div>
      </div>

      {/* 7-Day Streak Calendar */}
      <div className="mt-2.5 grid grid-cols-7 gap-1">
        {dayKeys.map((dk, idx) => {
          const isClaimed = claimSet.has(dk);
          const isToday = dk === todayKey;
          return (
            <div
              key={dk}
              className={`flex flex-col items-center rounded-xl border py-1 text-center ${
                isClaimed
                  ? 'border-[#24415C] bg-[#61D66B] text-white'
                  : isToday
                    ? 'border-[#EA580C] bg-white text-[#EA580C]'
                    : 'border-[#24415C]/15 bg-white/65 text-[#24415C]/55'
              }`}
            >
              <span className="text-[8px] font-black uppercase">{getShortDayLabel(dk)}</span>
              <span className="mt-0.5 text-xs leading-none">
                {isClaimed ? '🔥' : isToday ? '⭐' : idx + 1}
              </span>
            </div>
          );
        })}
      </div>

      {/* Next Streak Milestone */}
      <div className="mt-2.5 rounded-xl border border-[#24415C]/20 bg-white/85 p-2">
        <div className="flex items-center justify-between gap-2 text-[10px] font-black text-[#24415C]">
          <span>NEXT MILESTONE: {nextMilestone.days} DAYS</span>
          <span className="flex items-center gap-1.5 tabular-nums">
            <span className="inline-flex items-center gap-0.5 text-[#B45309]">
              <Coins className="h-3 w-3 text-[#F59E0B]" />+{nextMilestone.reward.coins}
            </span>
            <span className="inline-flex items-center gap-0.5 text-[#0369A1]">
              <Gem className="h-3 w-3 text-[#38BDF8]" />+{nextMilestone.reward.gems}
            </span>
            {nextMilestone.reward.skinId && (
              <span className="rounded bg-purple-100 px-1 text-[8px] text-purple-900">
                +SKIN
              </span>
            )}
          </span>
        </div>
        <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-[#24415C]/25 bg-[#EEF7FF]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#FF8A3D] to-[#F59E0B] transition-all duration-300"
            style={{ width: `${milestonePct}%` }}
          />
        </div>
      </div>
    </section>
  );
};
