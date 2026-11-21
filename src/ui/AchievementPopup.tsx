import React, { useEffect, useRef } from 'react';
import {
  ArrowRight,
  Award,
  Coins,
  Compass,
  Crown,
  Eye,
  Feather,
  Flame,
  Gem,
  Heart,
  Medal,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { ACHIEVEMENT_RARITY_CONFIG } from '../game/achievements/AchievementPointsManager';
import { AchievementIconName, AchievementRecord } from '../game/achievements/AchievementTypes';
import { getBadgeById } from '../game/achievements/BadgeRegistry';
import { audioManager } from '../game/audio/AudioManager';
import { AVATAR_FRAME_META } from '../game/missions/MissionRegistry';
import { getTitleById } from '../game/progression/TitleRegistry';
import { vibrationManager } from '../game/settings/VibrationManager';
import { BadgeArtwork } from './BadgeArtwork';

interface AchievementPopupProps {
  queue: AchievementRecord[];
  onConsumeCurrent: () => void;
  suppressed?: boolean;
  enabled?: boolean;
  animationEnabled?: boolean;
  badgeEffectsEnabled?: boolean;
  reducedMotion?: boolean;
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
    case 'shield':
      return <Shield className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'coins':
      return <Coins className={className} />;
    case 'gem':
      return <Gem className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'star':
      return <Star className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'target':
      return <Target className={className} />;
    case 'eye':
      return <Eye className={className} />;
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'medal':
      return <Medal className={className} />;
    default:
      return <Trophy className={className} />;
  }
}

export const AchievementPopup: React.FC<AchievementPopupProps> = ({
  queue,
  onConsumeCurrent,
  suppressed = false,
  enabled = true,
  animationEnabled = true,
  badgeEffectsEnabled = true,
  reducedMotion = false,
}) => {
  const current = queue[0] ?? null;
  const lastSoundIdRef = useRef<string | null>(null);

  // If achievement popups are disabled in Settings, consume queued items silently
  useEffect(() => {
    if (!current) {
      lastSoundIdRef.current = null;
      return;
    }
    if (!enabled) {
      onConsumeCurrent();
    }
  }, [current, enabled, onConsumeCurrent]);

  // Play rarity unlock sound & haptic feedback once per revealed modal
  useEffect(() => {
    if (!current || suppressed || !enabled) return;
    if (lastSoundIdRef.current === current.id) return;
    lastSoundIdRef.current = current.id;
    audioManager.playAchievementUnlock(current.rarity);
    if (current.rarity === 'EPIC' || current.rarity === 'LEGENDARY') {
      vibrationManager.vibrateVictory();
    } else {
      vibrationManager.vibrateScore();
    }
  }, [current, suppressed, enabled]);

  if (!current || suppressed || !enabled) return null;

  const rarityStyle = ACHIEVEMENT_RARITY_CONFIG[current.rarity];
  const badge = current.badgeId ? getBadgeById(current.badgeId) : null;
  const titleDef = current.titleId ? getTitleById(current.titleId) : null;
  const frameMeta = current.frameId ? AVATAR_FRAME_META[current.frameId] : null;
  const useAnim = animationEnabled && !reducedMotion;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Achievement Unlocked: ${current.name}`}
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in fixed inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-[2px]"
    >
      <div
        className={`game-panel relative w-full max-w-[330px] overflow-hidden border-[3px] border-[#24415C] bg-gradient-to-b from-white via-[#FFFDF2] to-[#FFF6CE] p-5 text-center ${
          useAnim ? 'anim-panel-pop' : ''
        }`}
        style={{
          boxShadow: `0 8px 0 #24415C, 0 0 30px ${rarityStyle.glowRgba}`,
        }}
      >
        {/* Top Tag & Queue Counter */}
        <div className="flex items-center justify-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border-2 border-[#24415C] px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${rarityStyle.badgeBg} ${rarityStyle.badgeText}`}
          >
            <Trophy className="h-3 w-3 shrink-0" />
            <span>
              {current.hidden ? 'SECRET ACHIEVEMENT' : 'ACHIEVEMENT UNLOCKED'}
            </span>
          </span>
          {queue.length > 1 && (
            <span className="rounded-full border border-[#24415C] bg-white px-2 py-0.5 text-[10px] font-black tabular-nums text-[#24415C]">
              1/{queue.length}
            </span>
          )}
        </div>

        {/* Badge / Crest Reveal */}
        <div className="mt-3 flex flex-col items-center">
          {badge ? (
            <BadgeArtwork
              badge={badge}
              size={84}
              effectsEnabled={badgeEffectsEnabled}
              reducedMotion={reducedMotion}
              className={useAnim ? 'anim-float' : ''}
            />
          ) : (
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-3xl border-[3px] border-[#24415C] bg-gradient-to-br ${rarityStyle.cardGradient} text-[#24415C] shadow-[0_4px_0_#24415C] ${
                useAnim ? 'anim-float' : ''
              }`}
            >
              {renderAchievementIcon(current.icon, 'h-10 w-10')}
            </div>
          )}

          <span
            className={`mt-2.5 inline-flex items-center rounded-full border border-[#24415C] px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${rarityStyle.badgeBg} ${rarityStyle.badgeText}`}
          >
            {rarityStyle.label} · +{current.points} PTS
          </span>

          <h2 className="mt-1.5 font-display text-2xl leading-tight font-bold text-[#24415C]">
            {current.name}
          </h2>

          <p className="mt-1 text-xs leading-snug font-bold text-[#24415C]/80">
            {current.description}
          </p>
        </div>

        {/* Rewards Breakdown */}
        <div className="mt-3.5 rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-2.5">
          <div className="text-[9px] font-black tracking-wider text-[#3998F7] uppercase">
            REWARDS EARNED
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
            {current.rewardXP > 0 && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#3998F7] px-2 py-0.5 text-[11px] font-black text-white">
                <Zap className="h-3 w-3" />
                <span>+{current.rewardXP} XP</span>
              </span>
            )}
            {current.rewardCoins > 0 && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#FFD84D] px-2 py-0.5 text-[11px] font-black text-[#24415C]">
                <Coins className="h-3 w-3 text-[#B45309]" />
                <span>+{current.rewardCoins}</span>
              </span>
            )}
            {current.rewardGems > 0 && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#E0F2FE] px-2 py-0.5 text-[11px] font-black text-[#0369A1]">
                <Gem className="h-3 w-3 text-[#0EA5E9]" />
                <span>+{current.rewardGems}</span>
              </span>
            )}
            {badge && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-white px-2 py-0.5 text-[10px] font-black text-[#24415C]">
                <Award className="h-3 w-3 text-[#9333EA]" />
                <span>Badge: {badge.name}</span>
              </span>
            )}
            {titleDef && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#FEF08A] px-2 py-0.5 text-[10px] font-black text-[#24415C]">
                <Crown className="h-3 w-3 text-[#B45309]" />
                <span>Title: {titleDef.name}</span>
              </span>
            )}
            {frameMeta && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#F3E8FF] px-2 py-0.5 text-[10px] font-black text-[#6B21A8]">
                <Sparkles className="h-3 w-3" />
                <span>Frame: {frameMeta.name}</span>
              </span>
            )}
            {current.skinId && (
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#24415C] bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-black text-[#047857]">
                <Sparkles className="h-3 w-3" />
                <span>Skin: {current.skinId.toUpperCase()}</span>
              </span>
            )}
          </div>
        </div>

        {/* Continue Button */}
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onConsumeCurrent();
          }}
          className="btn-base btn-green mt-4 min-h-[48px] w-full text-base tracking-wide"
        >
          <span>{queue.length > 1 ? 'NEXT REWARD' : 'AWESOME!'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
