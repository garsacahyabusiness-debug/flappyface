import React, { useEffect } from 'react';
import { Award, Crown, Flame, Swords, Trophy } from 'lucide-react';
import { CompetitiveNotificationItem } from '../game/competitive/CompetitiveTypes';

interface CompetitiveNotificationToastProps {
  queue: CompetitiveNotificationItem[];
  enabled: boolean;
  suppressed?: boolean;
  isPlaying?: boolean;
  reducedMotion?: boolean;
  onConsumeCurrent: (id: string) => void;
  onOpenHub?: () => void;
}

export const CompetitiveNotificationToast: React.FC<CompetitiveNotificationToastProps> = ({
  queue,
  enabled,
  suppressed = false,
  isPlaying = false,
  reducedMotion = false,
  onConsumeCurrent,
  onOpenHub,
}) => {
  // Skip NEW_PERSONAL_BEST here when PersonalBestPopup renders it, OR handle non-PB competitive alerts cleanly
  const activeItem = queue.find((item) => item.type !== 'NEW_PERSONAL_BEST') ?? null;

  useEffect(() => {
    if (!activeItem || !enabled || suppressed || isPlaying) return;
    const timer = window.setTimeout(() => {
      onConsumeCurrent(activeItem.id);
    }, 3400);
    return () => window.clearTimeout(timer);
  }, [activeItem, enabled, suppressed, isPlaying, onConsumeCurrent]);

  if (!activeItem || !enabled || suppressed || isPlaying) {
    return null;
  }

  const renderIcon = () => {
    switch (activeItem.type) {
      case 'RIVAL_DEFEATED':
        return <Swords className="h-4 w-4 text-[#24415C]" />;
      case 'NEW_RANK':
        return <Crown className="h-4 w-4 text-[#24415C]" />;
      case 'WEEKLY_CHALLENGE_COMPLETE':
      case 'CHALLENGE_COMPLETED':
        return <Flame className="h-4 w-4 text-[#24415C]" />;
      case 'RECORD_BROKEN':
        return <Trophy className="h-4 w-4 text-[#24415C]" />;
      default:
        return <Award className="h-4 w-4 text-[#24415C]" />;
    }
  };

  return (
    <div className="pointer-events-none absolute top-3 right-3 left-3 z-40 flex justify-center">
      <button
        type="button"
        onClick={() => {
          onConsumeCurrent(activeItem.id);
          onOpenHub?.();
        }}
        className={`pointer-events-auto flex w-full max-w-[332px] items-center gap-2.5 rounded-2xl border-2 border-[#24415C] bg-white px-3 py-2 text-left shadow-[0_4px_0_#24415C] ${
          reducedMotion ? '' : 'anim-panel-pop'
        }`}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C]"
          style={{ backgroundColor: activeItem.accentHex || '#FFD84D' }}
        >
          {renderIcon()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-black tracking-wide text-[#24415C] uppercase">
            {activeItem.title}
          </div>
          <div className="truncate text-[10px] font-bold text-[#24415C]/75">
            {activeItem.subtitle}
          </div>
        </div>

        <span className="shrink-0 rounded-lg border border-[#24415C]/20 bg-[#EEF7FF] px-2 py-0.5 text-[9px] font-black text-[#3998F7] uppercase">
          HUB
        </span>
      </button>
    </div>
  );
};
