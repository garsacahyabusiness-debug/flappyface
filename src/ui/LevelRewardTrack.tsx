import React, { useState } from 'react';
import { Check, Gift, Lock, Sparkles } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { LEVEL_REWARD_TRACK } from '../game/progression/LevelRewardRegistry';
import { claimLevelRewardWithGrant } from '../game/progression/LevelRewardService';
import {
  LevelRewardGrantOutcome,
  ProgressionProfileId,
} from '../game/progression/PlayerProgressTypes';

interface LevelRewardTrackProps {
  currentLevel: number;
  claimedLevels: readonly number[];
  profileId?: ProgressionProfileId;
  onClaimOutcome?: (outcome: LevelRewardGrantOutcome) => void;
}

type TrackFilter = 'all' | 'milestones' | 'claimable';

export const LevelRewardTrack: React.FC<LevelRewardTrackProps> = ({
  currentLevel,
  claimedLevels,
  profileId = 'solo',
  onClaimOutcome,
}) => {
  const [filter, setFilter] = useState<TrackFilter>('all');

  const items = LEVEL_REWARD_TRACK.filter((item) => {
    if (filter === 'milestones') return item.isMilestone;
    if (filter === 'claimable') {
      return item.level <= currentLevel && !claimedLevels.includes(item.level);
    }
    return true;
  });

  const handleClaim = (level: number) => {
    const res = claimLevelRewardWithGrant(level, profileId);
    if (res.success) {
      audioManager.playRewardUnlocked();
    } else {
      audioManager.playButton();
    }
    onClaimOutcome?.(res);
  };

  return (
    <div className="space-y-2.5">
      {/* Filter Controls */}
      <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            { id: 'all', label: 'ALL (1-100)' },
            { id: 'milestones', label: 'MILESTONES' },
            { id: 'claimable', label: 'CLAIMABLE' },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                audioManager.playButton();
                setFilter(tab.id);
              }}
              className={`min-h-[38px] rounded-xl border-2 px-2 text-[10px] font-black uppercase transition-colors ${
                active
                  ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                  : 'border-[#24415C]/20 bg-white text-[#24415C]/70'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-5 text-center text-xs font-bold text-[#24415C]/65">
          Belum ada hadiah yang siap diklaim pada filter ini. Terus terbang untuk kumpulkan XP!
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((reward) => {
            const unlocked = currentLevel >= reward.level;
            const claimed = claimedLevels.includes(reward.level);
            const claimable = unlocked && !claimed;

            return (
              <div
                key={reward.level}
                className={`flex items-center gap-2.5 rounded-2xl border-2 p-2.5 transition-all ${
                  claimable
                    ? 'border-[#24415C] bg-gradient-to-r from-[#FFFDF2] to-[#FEF08A] shadow-[0_3px_0_#24415C]'
                    : claimed
                      ? 'border-emerald-300 bg-emerald-50/90'
                      : 'border-[#24415C]/15 bg-[#F4F9FF] opacity-85'
                }`}
              >
                {/* Level Badge */}
                <div
                  className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl border-2 ${
                    claimable
                      ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                      : claimed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-[#24415C]/25 bg-white text-[#24415C]/75'
                  }`}
                >
                  <span className="text-[8px] font-black uppercase">LV</span>
                  <span className="font-display text-base leading-none font-bold tabular-nums">
                    {reward.level}
                  </span>
                </div>

                {/* Description */}
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm" aria-hidden="true">
                      {reward.icon}
                    </span>
                    <span className="truncate font-display text-sm font-bold text-[#24415C]">
                      {reward.title}
                    </span>
                    {reward.isMilestone && (
                      <Sparkles className="h-3 w-3 shrink-0 text-[#F59E0B]" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug font-bold text-[#24415C]/70">
                    {reward.subtitle}
                  </p>
                </div>

                {/* Action / Status */}
                <div className="shrink-0">
                  {claimed ? (
                    <span className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-emerald-400 bg-emerald-100 px-2.5 text-[10px] font-black text-emerald-800">
                      <Check className="h-3 w-3" />
                      <span>CLAIMED</span>
                    </span>
                  ) : claimable ? (
                    <button
                      type="button"
                      onClick={() => handleClaim(reward.level)}
                      className="btn-base btn-green min-h-[40px] px-3 py-1 text-xs"
                    >
                      <Gift className="h-3.5 w-3.5" />
                      <span>CLAIM</span>
                    </button>
                  ) : (
                    <span className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-2.5 text-[10px] font-black text-slate-500">
                      <Lock className="h-3 w-3" />
                      <span>LOCKED</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
