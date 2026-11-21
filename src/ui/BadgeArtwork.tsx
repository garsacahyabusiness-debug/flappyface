import React from 'react';
import { Lock } from 'lucide-react';
import { ACHIEVEMENT_RARITY_CONFIG } from '../game/achievements/AchievementPointsManager';
import {
  AchievementRarity,
  BadgeDefinition,
  BadgeRecord,
  BadgeShape,
} from '../game/achievements/AchievementTypes';

interface BadgeArtworkProps {
  badge: BadgeDefinition | BadgeRecord;
  size?: number;
  locked?: boolean;
  effectsEnabled?: boolean;
  reducedMotion?: boolean;
  className?: string;
}

const RARITY_RING: Record<AchievementRarity, { ring: string; bg: string; glow: string }> = {
  COMMON: { ring: '#94A3B8', bg: '#F1F5F9', glow: 'rgba(148, 163, 184, 0.35)' },
  UNCOMMON: { ring: '#22C55E', bg: '#ECFDF5', glow: 'rgba(34, 197, 94, 0.42)' },
  RARE: { ring: '#3B82F6', bg: '#EFF6FF', glow: 'rgba(59, 130, 246, 0.5)' },
  EPIC: { ring: '#9333EA', bg: '#FAF5FF', glow: 'rgba(147, 51, 234, 0.55)' },
  LEGENDARY: { ring: '#F59E0B', bg: '#FFFBEB', glow: 'rgba(245, 158, 11, 0.65)' },
};

function renderShapePath(
  shape: BadgeShape,
  primary: string,
  secondary: string,
  accent: string
): React.ReactNode {
  switch (shape) {
    case 'shield':
      return (
        <>
          <path
            d="M32 10 L50 17 V32 C50 43 42 50 32 54 C22 50 14 43 14 32 V17 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M32 15 L45 20 V31 C45 39 39 44.5 32 48 C25 44.5 19 39 19 31 V20 Z"
            fill={secondary}
            opacity="0.88"
          />
          <path d="M32 22 L35 28.5 L42 29.5 L37 34 L38 41 L32 37.5 L26 41 L27 34 L22 29.5 L29 28.5 Z" fill={accent} stroke="#24415C" strokeWidth="1.5" strokeLinejoin="round" />
        </>
      );
    case 'wings':
      return (
        <>
          <path
            d="M32 38 C22 39 11 33 8 20 C16 20 22 24 26 29 C23 22 26 15 32 12 C38 15 41 22 38 29 C42 24 48 20 56 20 C53 33 42 39 32 38 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <circle cx="32" cy="31" r="9.5" fill={secondary} stroke="#24415C" strokeWidth="2.4" />
          <circle cx="32" cy="31" r="4.5" fill={accent} />
        </>
      );
    case 'crown':
      return (
        <>
          <path
            d="M13 44 L11 22 L22 30 L32 15 L42 30 L53 22 L51 44 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <rect x="13" y="42" width="38" height="7" rx="3" fill={secondary} stroke="#24415C" strokeWidth="2.4" />
          <circle cx="11" cy="20" r="3" fill={accent} stroke="#24415C" strokeWidth="1.8" />
          <circle cx="32" cy="13.5" r="3.6" fill={accent} stroke="#24415C" strokeWidth="1.8" />
          <circle cx="53" cy="20" r="3" fill={accent} stroke="#24415C" strokeWidth="1.8" />
        </>
      );
    case 'star':
      return (
        <>
          <path
            d="M32 10 L38.6 23.4 L53.4 25.5 L42.7 36 L45.2 50.8 L32 43.8 L18.8 50.8 L21.3 36 L10.6 25.5 L25.4 23.4 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M32 17 L36 25.5 L45.5 26.8 L38.6 33.5 L40.2 43 L32 38.5 L23.8 43 L25.4 33.5 L18.5 26.8 L28 25.5 Z"
            fill={secondary}
            opacity="0.85"
          />
          <circle cx="32" cy="32" r="4.2" fill={accent} stroke="#24415C" strokeWidth="1.6" />
        </>
      );
    case 'gem':
      return (
        <>
          <polygon
            points="21,15 43,15 53,27 32,52 11,27"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <polygon points="21,15 43,15 38,27 26,27" fill={secondary} />
          <polygon points="26,27 38,27 32,52" fill={accent} opacity="0.85" />
          <line x1="11" y1="27" x2="53" y2="27" stroke="#24415C" strokeWidth="2" />
        </>
      );
    case 'flame':
      return (
        <>
          <path
            d="M33 10 C39 18 48 25 48 36 C48 45.5 41 52 32 52 C23 52 16 45.5 16 36 C16 28 21 23 25 19 C25 23 27 25 29 26 C28 19 30 14 33 10 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M32 25 C36 29 40 33 40 39 C40 44.5 36.5 48 32 48 C27.5 48 24 44.5 24 39 C24 34 27 31 29 29 C29.5 31 31 32 32 25 Z"
            fill={accent}
          />
          <circle cx="32" cy="40" r="3" fill={secondary} />
        </>
      );
    case 'planet':
      return (
        <>
          <circle cx="32" cy="32" r="14.5" fill={primary} stroke="#24415C" strokeWidth="2.8" />
          <path
            d="M20 26 C26 23 36 24 43 29"
            fill="none"
            stroke={secondary}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <ellipse
            cx="32"
            cy="33"
            rx="24"
            ry="7"
            transform="rotate(-18 32 33)"
            fill="none"
            stroke={accent}
            strokeWidth="3.2"
          />
          <ellipse
            cx="32"
            cy="33"
            rx="24"
            ry="7"
            transform="rotate(-18 32 33)"
            fill="none"
            stroke="#24415C"
            strokeWidth="1.4"
          />
        </>
      );
    case 'mask':
      return (
        <>
          <path
            d="M12 25 C17 19 25 21 32 25 C39 21 47 19 52 25 C53 34 48 41 40 41 C36 41 34 38 32 35 C30 38 28 41 24 41 C16 41 11 34 12 25 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <ellipse cx="22" cy="30" rx="5.5" ry="3.6" fill={secondary} stroke="#24415C" strokeWidth="1.8" />
          <ellipse cx="42" cy="30" rx="5.5" ry="3.6" fill={secondary} stroke="#24415C" strokeWidth="1.8" />
          <circle cx="32" cy="24" r="2.6" fill={accent} />
        </>
      );
    case 'trophy':
      return (
        <>
          <path
            d="M21 15 H43 V27 C43 34 38 39 32 39 C26 39 21 34 21 27 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path d="M21 18 H14 C14 26 17 29 21 29" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <path d="M43 18 H50 C50 26 47 29 43 29" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
          <rect x="29" y="39" width="6" height="6" fill={secondary} stroke="#24415C" strokeWidth="2" />
          <rect x="22" y="45" width="20" height="6" rx="2.5" fill={primary} stroke="#24415C" strokeWidth="2.4" />
        </>
      );
    case 'medal':
      return (
        <>
          <path d="M22 11 L28 24 H20 L15 11 Z" fill={secondary} stroke="#24415C" strokeWidth="2.2" />
          <path d="M42 11 L36 24 H44 L49 11 Z" fill={accent} stroke="#24415C" strokeWidth="2.2" />
          <circle cx="32" cy="35" r="14" fill={primary} stroke="#24415C" strokeWidth="2.8" />
          <circle cx="32" cy="35" r="9" fill={secondary} />
          <path d="M32 29 L34 33.5 L39 34 L35.5 37.5 L36.3 42 L32 39.8 L27.7 42 L28.5 37.5 L25 34 L30 33.5 Z" fill={accent} />
        </>
      );
    case 'ribbon':
      return (
        <>
          <path d="M23 36 L17 52 L25 48 L29 53 L32 38 Z" fill={secondary} stroke="#24415C" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M41 36 L47 52 L39 48 L35 53 L32 38 Z" fill={secondary} stroke="#24415C" strokeWidth="2.2" strokeLinejoin="round" />
          <circle cx="32" cy="27" r="14" fill={primary} stroke="#24415C" strokeWidth="2.8" />
          <circle cx="32" cy="27" r="7.5" fill={accent} stroke="#24415C" strokeWidth="1.8" />
        </>
      );
    case 'crest':
    default:
      return (
        <>
          <path
            d="M32 9 L49 18 L46 37 L32 53 L18 37 L15 18 Z"
            fill={primary}
            stroke="#24415C"
            strokeWidth="2.8"
            strokeLinejoin="round"
          />
          <path
            d="M32 15 L43 21 L41 34 L32 45 L23 34 L21 21 Z"
            fill={secondary}
            opacity="0.9"
          />
          <polygon points="32,20 38,30 32,40 26,30" fill={accent} stroke="#24415C" strokeWidth="1.6" />
        </>
      );
  }
}

export const BadgeArtwork: React.FC<BadgeArtworkProps> = ({
  badge,
  size = 56,
  locked = false,
  effectsEnabled = true,
  reducedMotion = false,
  className = '',
}) => {
  const rarityStyle = RARITY_RING[badge.rarity] ?? RARITY_RING.COMMON;
  const rarityConfig = ACHIEVEMENT_RARITY_CONFIG[badge.rarity];
  const animateSparkle =
    !locked &&
    effectsEnabled &&
    !reducedMotion &&
    (badge.rarity === 'EPIC' || badge.rarity === 'LEGENDARY' || badge.rarity === 'RARE');

  const primary = locked ? '#94A3B8' : badge.primaryColor;
  const secondary = locked ? '#CBD5E1' : badge.secondaryColor;
  const accent = locked ? '#E2E8F0' : badge.accentColor;

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${
        animateSparkle ? 'transition-transform duration-300' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        filter:
          !locked && effectsEnabled
            ? `drop-shadow(0 3px 8px ${rarityStyle.glow})`
            : undefined,
      }}
      title={locked ? `${badge.name} (Locked)` : `${badge.name} · ${rarityConfig.label}`}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        aria-hidden="true"
        className={locked ? 'opacity-65 grayscale' : ''}
      >
        <circle
          cx="32"
          cy="32"
          r="29"
          fill={locked ? '#E2E8F0' : rarityStyle.bg}
          stroke={locked ? '#64748B' : rarityStyle.ring}
          strokeWidth="3.5"
        />
        <circle
          cx="32"
          cy="32"
          r="25"
          fill="none"
          stroke={locked ? '#CBD5E1' : '#FFFFFF'}
          strokeWidth="1.8"
          opacity="0.7"
        />
        {renderShapePath(badge.shape, primary, secondary, accent)}
        {!locked && (
          <path
            d="M15 21 C20 12 31 9 41 11"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.55"
          />
        )}
      </svg>

      {animateSparkle && (
        <span
          aria-hidden="true"
          className="anim-sparkle pointer-events-none absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#24415C] bg-[#FFD84D]"
        />
      )}

      {locked && (
        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full border border-[#24415C] bg-slate-200 text-slate-600 shadow-sm"
        >
          <Lock className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  );
};
