import React from 'react';
import { Check, CheckCircle2, Clock, Coins, Frame, Gem, Gift, Sparkles } from 'lucide-react';
import { getSkinById } from '../game/character/CharacterSkinManager';
import { AVATAR_FRAME_META } from '../game/missions/MissionRegistry';
import { MissionDifficulty, MissionInstance } from '../game/missions/MissionTypes';
import { POWER_UP_REGISTRY } from '../game/powerups/PowerUpRegistry';

interface MissionCardProps {
  mission: MissionInstance;
  justClaimed?: boolean;
  rewardAnimationEnabled: boolean;
  reducedMotion: boolean;
  onClaim: (missionId: string) => void;
}

const DIFFICULTY_STYLES: Record<
  MissionDifficulty,
  { label: string; badgeBg: string; badgeText: string; barGradient: string; accentBorder: string }
> = {
  easy: {
    label: 'EASY',
    badgeBg: 'bg-emerald-200',
    badgeText: 'text-emerald-900',
    barGradient: 'from-[#61D66B] to-[#32B85C]',
    accentBorder: 'border-emerald-300',
  },
  medium: {
    label: 'MEDIUM',
    badgeBg: 'bg-sky-200',
    badgeText: 'text-sky-900',
    barGradient: 'from-[#38BDF8] to-[#3998F7]',
    accentBorder: 'border-sky-300',
  },
  hard: {
    label: 'HARD',
    badgeBg: 'bg-amber-200',
    badgeText: 'text-amber-950',
    barGradient: 'from-[#F97316] to-[#EA580C]',
    accentBorder: 'border-amber-300',
  },
  weekly: {
    label: 'WEEKLY',
    badgeBg: 'bg-purple-200',
    badgeText: 'text-purple-900',
    barGradient: 'from-[#A855F7] to-[#7C3AED]',
    accentBorder: 'border-purple-300',
  },
  special: {
    label: 'SPECIAL',
    badgeBg: 'bg-gradient-to-r from-[#FFD84D] to-[#F472B6]',
    badgeText: 'text-[#24415C]',
    barGradient: 'from-[#F59E0B] to-[#EC4899]',
    accentBorder: 'border-pink-300',
  },
};

export const MissionCard: React.FC<MissionCardProps> = ({
  mission,
  justClaimed = false,
  rewardAnimationEnabled,
  reducedMotion,
  onClaim,
}) => {
  const style = DIFFICULTY_STYLES[mission.difficulty];
  const pct =
    mission.target > 0
      ? Math.min(100, Math.round((mission.progress / mission.target) * 100))
      : 100;

  const canClaim = mission.completed && !mission.claimed;
  const skinLabel = mission.reward.skinId ? getSkinById(mission.reward.skinId).name : null;
  const frameLabel = mission.reward.avatarFrame
    ? (AVATAR_FRAME_META[mission.reward.avatarFrame]?.name ?? mission.reward.avatarFrame)
    : null;
  const shouldAnimateClaim = justClaimed && rewardAnimationEnabled && !reducedMotion;

  const statusMeta = mission.claimed
    ? {
        label: 'CLAIMED',
        className: 'border-emerald-600/40 bg-emerald-100 text-emerald-800',
        Icon: Check,
      }
    : mission.completed
      ? {
          label: 'COMPLETED',
          className: 'border-[#24415C] bg-[#61D66B] text-[#24415C]',
          Icon: CheckCircle2,
        }
      : {
          label: 'IN PROGRESS',
          className: 'border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]/75',
          Icon: Clock,
        };

  return (
    <article
      className={`relative rounded-2xl border-2 border-[#24415C] bg-white p-3 shadow-[0_4px_0_#24415C] transition-colors ${
        canClaim
          ? 'bg-gradient-to-br from-[#FFFDF2] via-[#FFF8D6] to-[#EEF7FF]'
          : mission.claimed
            ? 'bg-slate-50/90 opacity-90'
            : ''
      } ${shouldAnimateClaim ? 'anim-mission-claim' : ''}`}
    >
      {/* Top Row: Icon, Title, Difficulty & Status Indicator */}
      <div className="flex items-start gap-2.5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C] text-xl shadow-[0_2px_0_#24415C] ${
            mission.claimed
              ? 'bg-emerald-100'
              : canClaim
                ? 'bg-[#FFD84D]'
                : 'bg-[#EEF7FF]'
          }`}
        >
          <span aria-hidden="true">{mission.icon}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <h4 className="min-w-0 truncate font-display text-sm font-bold text-[#24415C]">
              {mission.title}
            </h4>
            <div className="flex shrink-0 items-center gap-1">
              <span
                className={`rounded-lg border border-[#24415C] px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase ${style.badgeBg} ${style.badgeText}`}
              >
                {style.label}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] font-black tracking-wide uppercase ${statusMeta.className}`}
              >
                <statusMeta.Icon className="h-2.5 w-2.5 shrink-0" />
                <span>{statusMeta.label}</span>
              </span>
            </div>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug font-bold text-[#24415C]/75">
            {mission.description}
          </p>
        </div>
      </div>

      {/* Special Sub-Progress (e.g., Power Master distinct Power-Up checklist) */}
      {mission.id === 'special_power_master' && (
        <div className="mt-2 flex flex-wrap gap-1">
          {POWER_UP_REGISTRY.map((p) => {
            const done = mission.metaProgress?.includes(p.id) ?? false;
            return (
              <span
                key={p.id}
                className={`inline-flex items-center gap-0.5 rounded-lg border px-1.5 py-0.5 text-[9px] font-black ${
                  done
                    ? 'border-[#24415C] bg-emerald-100 text-emerald-900'
                    : 'border-slate-200 bg-slate-100 text-slate-400'
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.name.split(' ')[0]}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-2.5">
        <div className="mb-1 flex items-center justify-between text-[10px] font-black text-[#24415C]/80">
          <span>PROGRESS</span>
          <span className="tabular-nums text-[#24415C]">
            {mission.progress}/{mission.target} ({pct}%)
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/35 bg-[#EEF7FF]">
          <div
            className={`h-full rounded-full bg-gradient-to-r transition-all duration-300 ${style.barGradient}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Bottom Row: Reward Previews + Action / Status */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {mission.reward.coins > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-[#FFF7D6] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#B45309]">
              <Coins className="h-3 w-3 shrink-0 text-[#F59E0B]" />
              +{mission.reward.coins}
            </span>
          )}
          {mission.reward.gems > 0 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-[#E0F2FE] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#0369A1]">
              <Gem className="h-3 w-3 shrink-0 text-[#38BDF8]" />
              +{mission.reward.gems}
            </span>
          )}
          {skinLabel && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-purple-100 px-2 py-0.5 text-[9px] font-black text-purple-900">
              <Sparkles className="h-2.5 w-2.5 shrink-0" />
              {skinLabel} SKIN
            </span>
          )}
          {frameLabel && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-sky-100 px-2 py-0.5 text-[9px] font-black text-sky-900">
              <Frame className="h-2.5 w-2.5 shrink-0" />
              FRAME: {frameLabel}
            </span>
          )}
          {mission.reward.title && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-pink-100 px-2 py-0.5 text-[9px] font-black text-pink-900">
              TITLE: {mission.reward.title}
            </span>
          )}
          {mission.reward.badge && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/25 bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-900">
              BADGE: {mission.reward.badge}
            </span>
          )}
        </div>

        {canClaim ? (
          <button
            type="button"
            onClick={() => onClaim(mission.id)}
            className="btn-base btn-green min-h-[44px] px-3.5 py-1.5 text-xs whitespace-nowrap"
          >
            <Gift className="h-4 w-4 shrink-0" />
            <span>CLAIM REWARD</span>
          </button>
        ) : mission.claimed ? (
          <span className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border-2 border-emerald-600/35 bg-emerald-100 px-3 py-1 text-[11px] font-black whitespace-nowrap text-emerald-800">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>CLAIMED</span>
          </span>
        ) : (
          <span className="inline-flex min-h-[36px] items-center gap-1 rounded-xl border border-[#24415C]/20 bg-[#EEF7FF] px-3 py-1 text-[10px] font-black tracking-wide whitespace-nowrap text-[#24415C]/70">
            <Clock className="h-3 w-3 shrink-0" />
            <span>IN PROGRESS</span>
          </span>
        )}
      </div>
    </article>
  );
};
