import React from 'react';
import { Edit3, Plus, Sparkles } from 'lucide-react';
import { ACHIEVEMENT_RARITY_CONFIG } from '../game/achievements/AchievementPointsManager';
import { AchievementRecord } from '../game/achievements/AchievementTypes';
import { getBadgeById } from '../game/achievements/BadgeRegistry';
import { audioManager } from '../game/audio/AudioManager';
import { renderAchievementIcon } from './AchievementPopup';
import { BadgeArtwork } from './BadgeArtwork';

interface AchievementShowcaseStripProps {
  records: AchievementRecord[];
  compact?: boolean;
  showEmptySlots?: boolean;
  effectsEnabled?: boolean;
  reducedMotion?: boolean;
  onManageClick?: () => void;
  className?: string;
}

export const AchievementShowcaseStrip: React.FC<AchievementShowcaseStripProps> = ({
  records,
  compact = false,
  showEmptySlots = false,
  effectsEnabled = true,
  reducedMotion = false,
  onManageClick,
  className = '',
}) => {
  const slots: (AchievementRecord | null)[] = showEmptySlots
    ? [records[0] ?? null, records[1] ?? null, records[2] ?? null]
    : records.slice(0, 3);

  if (!showEmptySlots && slots.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {slots.map((rec, idx) => {
        if (!rec) {
          return (
            <button
              key={`empty-${idx}`}
              type="button"
              onClick={() => {
                if (!onManageClick) return;
                audioManager.playButton();
                onManageClick();
              }}
              disabled={!onManageClick}
              aria-label={`Empty Showcase Slot ${idx + 1}`}
              className={`flex items-center justify-center rounded-2xl border-2 border-dashed border-[#24415C]/25 bg-[#EEF7FF]/70 text-[#24415C]/45 transition-colors hover:border-[#3998F7] hover:text-[#3998F7] ${
                compact ? 'h-8 w-8' : 'h-12 w-12'
              }`}
            >
              <Plus className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
            </button>
          );
        }

        const badge = rec.badgeId ? getBadgeById(rec.badgeId) : null;
        const rarityStyle = ACHIEVEMENT_RARITY_CONFIG[rec.rarity];

        if (badge) {
          return (
            <button
              key={rec.id}
              type="button"
              onClick={() => {
                if (!onManageClick) return;
                audioManager.playButton();
                onManageClick();
              }}
              disabled={!onManageClick}
              title={`${rec.name} (${rarityStyle.label})`}
              className="inline-flex items-center justify-center rounded-full focus:outline-none"
            >
              <BadgeArtwork
                badge={badge}
                size={compact ? 30 : 44}
                effectsEnabled={effectsEnabled}
                reducedMotion={reducedMotion}
              />
            </button>
          );
        }

        return (
          <button
            key={rec.id}
            type="button"
            onClick={() => {
              if (!onManageClick) return;
              audioManager.playButton();
              onManageClick();
            }}
            disabled={!onManageClick}
            title={`${rec.name} (${rarityStyle.label})`}
            className={`relative inline-flex items-center justify-center rounded-full border-2 border-[#24415C] bg-gradient-to-br ${rarityStyle.cardGradient} text-[#24415C] shadow-[0_2px_0_#24415C] ${
              compact ? 'h-8 w-8' : 'h-11 w-11'
            }`}
          >
            {renderAchievementIcon(rec.icon, compact ? 'h-4 w-4' : 'h-5 w-5')}
            {rec.rarity === 'LEGENDARY' && effectsEnabled && !reducedMotion && (
              <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-[#F59E0B]" />
            )}
          </button>
        );
      })}

      {onManageClick && (
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onManageClick();
          }}
          aria-label="Edit Achievement Showcase"
          className={`inline-flex items-center justify-center gap-1 rounded-xl border-2 border-[#24415C]/25 bg-white font-black text-[#24415C] transition-colors hover:border-[#24415C] ${
            compact ? 'h-7 px-2 text-[9px]' : 'min-h-[36px] px-2.5 text-[10px]'
          }`}
        >
          <Edit3 className="h-3 w-3 text-[#3998F7]" />
          <span>PIN</span>
        </button>
      )}
    </div>
  );
};
