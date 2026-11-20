import React, { useEffect, useState } from 'react';
import { ClipboardCheck, ExternalLink } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { MissionCompletionNotification } from '../game/missions/MissionTypes';

interface MissionNotificationToastProps {
  queue: MissionCompletionNotification[];
  enabled: boolean;
  suppressed?: boolean;
  isPlaying: boolean;
  onConsumeCurrent: () => void;
  onOpenMissionCenter: () => void;
}

export const MissionNotificationToast: React.FC<MissionNotificationToastProps> = ({
  queue,
  enabled,
  suppressed = false,
  isPlaying,
  onConsumeCurrent,
  onOpenMissionCenter,
}) => {
  const current = enabled && !suppressed ? (queue[0] ?? null) : null;
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!enabled && queue.length > 0) {
      onConsumeCurrent();
      return;
    }
    if (suppressed || !current) return;

    setPhase('in');
    audioManager.playMissionComplete();

    const fadeTimer = window.setTimeout(() => {
      setPhase('out');
    }, 2600);

    const removeTimer = window.setTimeout(() => {
      onConsumeCurrent();
    }, 3000);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [current?.id, enabled, suppressed, queue.length, onConsumeCurrent]);

  if (!current || !enabled || suppressed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute top-14 left-1/2 z-40 w-[90%] max-w-[332px] -translate-x-1/2 transition-all duration-300 ${
        isPlaying ? 'pointer-events-none' : 'pointer-events-auto'
      } ${
        phase === 'in'
          ? 'translate-y-0 scale-100 opacity-100'
          : '-translate-y-3 scale-95 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2.5 rounded-3xl border-[3px] border-[#24415C] bg-gradient-to-r from-[#EEF7FF] via-[#FFFFFF] to-[#DCFCE7] px-3 py-2 shadow-[0_6px_0_#24415C,0_10px_22px_rgba(36,65,92,0.28)]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#24415C] bg-[#61D66B] text-xl shadow-[0_2px_0_#24415C]">
          <span aria-hidden="true">{current.icon}</span>
        </div>

        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-[#15803D] uppercase">
            <ClipboardCheck className="h-3 w-3 shrink-0" />
            <span>MISSION COMPLETED!</span>
          </div>
          <div className="truncate font-display text-sm font-bold text-[#24415C]">
            {current.title}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black tabular-nums text-[#24415C]/80">
            {current.reward.coins > 0 && <span>+{current.reward.coins}🪙</span>}
            {current.reward.gems > 0 && <span>+{current.reward.gems}💎</span>}
            <span className="uppercase opacity-75">· {current.category}</span>
          </div>
        </div>

        {!isPlaying && (
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onConsumeCurrent();
              onOpenMissionCenter();
            }}
            className="btn-base btn-primary min-h-[38px] shrink-0 px-2.5 py-1 text-[10px]"
          >
            <span>CLAIM</span>
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
};
