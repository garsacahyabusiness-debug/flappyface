import React, { useEffect, useState } from 'react';
import { Award, Crown, Feather, Flame, Sparkles, Trophy } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { AchievementIconName, AchievementRecord } from '../game/progression/AchievementManager';

interface AchievementPopupProps {
  queue: AchievementRecord[];
  onConsumeCurrent: () => void;
}

export function renderAchievementIcon(icon: AchievementIconName, className = 'h-6 w-6') {
  switch (icon) {
    case 'feather':
      return <Feather className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'crown':
      return <Crown className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
  }
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({
  queue,
  onConsumeCurrent,
}) => {
  const current = queue[0] ?? null;
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!current) return;
    setPhase('in');
    audioManager.playAchievement();

    const fadeTimer = window.setTimeout(() => {
      setPhase('out');
    }, 2350);

    const removeTimer = window.setTimeout(() => {
      onConsumeCurrent();
    }, 2750);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [current?.id, onConsumeCurrent]);

  if (!current) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute top-3 left-1/2 z-40 w-[90%] max-w-[332px] -translate-x-1/2 transition-all duration-300 ${
        phase === 'in'
          ? 'translate-y-0 scale-100 opacity-100'
          : '-translate-y-3 scale-95 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3 rounded-3xl border-[3px] border-[#24415C] bg-gradient-to-r from-[#FFFDF2] via-[#FFF6CE] to-[#FFE885] px-3.5 py-2.5 shadow-[0_6px_0_#24415C,0_0_24px_rgba(255,216,77,0.65)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]">
          {renderAchievementIcon(current.icon, 'h-6 w-6')}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1 text-[10px] font-black tracking-wider text-[#B45309] uppercase">
            <Trophy className="h-3 w-3 shrink-0" />
            <span>ACHIEVEMENT UNLOCKED</span>
          </div>
          <div className="truncate font-display text-base font-bold text-[#24415C]">
            {current.name}
          </div>
          <div className="truncate text-[11px] font-bold text-[#24415C]/75">
            {current.description}
          </div>
        </div>
      </div>
    </div>
  );
};
