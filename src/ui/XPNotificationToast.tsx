import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { XPNotificationItem } from '../game/progression/PlayerProgressTypes';

interface XPNotificationToastProps {
  queue: XPNotificationItem[];
  enabled: boolean;
  suppressed?: boolean;
  isPlaying: boolean;
  onConsumeCurrent: (id?: string) => void;
}

export const XPNotificationToast: React.FC<XPNotificationToastProps> = ({
  queue,
  enabled,
  suppressed = false,
  isPlaying,
  onConsumeCurrent,
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
    audioManager.playXPReceived();

    const fadeTimer = window.setTimeout(() => {
      setPhase('out');
    }, 1750);

    const removeTimer = window.setTimeout(() => {
      onConsumeCurrent(current.id);
    }, 2100);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [current?.id, current?.amount, enabled, suppressed, queue.length, onConsumeCurrent]);

  if (!current || !enabled || suppressed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none absolute top-14 left-1/2 z-30 -translate-x-1/2 transition-all duration-250 ${
        phase === 'in'
          ? 'translate-y-0 scale-100 opacity-100'
          : '-translate-y-2 scale-95 opacity-0'
      }`}
    >
      <div className="inline-flex items-center gap-2 rounded-full border-2 border-[#24415C] bg-gradient-to-r from-[#EEF7FF] via-[#FFFFFF] to-[#FEF9C3] px-3.5 py-1 shadow-[0_4px_0_#24415C,0_8px_16px_rgba(36,65,92,0.22)]">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
        <span className="font-display text-xs font-bold tabular-nums text-[#24415C]">
          +{current.amount} XP
        </span>
        <span className="max-w-[170px] truncate text-[10px] font-black tracking-wide text-[#3998F7] uppercase">
          {current.count > 1 ? `${current.count} REWARDS` : current.label}
        </span>
      </div>
    </div>
  );
};
