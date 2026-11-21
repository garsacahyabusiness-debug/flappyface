import React, { useEffect, useRef, useState } from 'react';
import { Award, Check, Flame, Home, RotateCcw, Share2, Target, Trophy } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import { GameOverReaction } from '../game/GameOverReaction';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface GameOverOverlayProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  reaction?: GameOverReaction | null;
  characterId?: string;
  skinId?: SkinId;
  customFaceImg?: HTMLImageElement | null;
  runCoins?: number;
  runGems?: number;
  runXP?: number;
  previousRunScore?: number;
  rivalName?: string;
  rivalTargetScore?: number;
  activeChallengeTitle?: string | null;
  onOpenCompetitiveHub?: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  score,
  bestScore,
  isNewBest,
  reaction = null,
  characterId = 'classic_bird',
  skinId = 'default',
  customFaceImg = null,
  runCoins = 0,
  runGems = 0,
  runXP = 0,
  previousRunScore = 0,
  rivalName,
  rivalTargetScore,
  activeChallengeTitle = null,
  onOpenCompetitiveHub,
  onRetry,
  onHome,
}) => {
  const activeChar = getCharacterById(characterId);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const handleShare = async () => {
    const shareUrl =
      typeof window !== 'undefined' &&
      typeof window.location?.href === 'string' &&
      window.location.href.startsWith('http')
        ? `\n\n${window.location.href}`
        : '';

    const text = `🐤 I scored ${score} in FLAPPY FACE!\n\nMy best score is ${bestScore}.\n\nCan you beat me?${shareUrl}`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'FLAPPY FACE',
          text,
          ...(shareUrl ? { url: window.location.href } : {}),
        });
        return;
      } catch {
        // User canceled or Web Share unsupported; fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareToast('Score copied to clipboard!');
    } catch {
      setShareToast('Share text ready!');
    }

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setShareToast(null);
      toastTimerRef.current = null;
    }, 2400);
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/45 p-5 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel w-full max-w-[306px] p-5 text-center sm:p-6">
        <h2 className="font-display text-stroke-dark text-[2.1rem] leading-none font-bold tracking-wide text-[#FFD84D] sm:text-4xl">
          GAME OVER
        </h2>

        {isNewBest && (
          <div className="anim-sparkle mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-3.5 py-0.5 text-xs font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
            <Trophy className="h-3.5 w-3.5" />
            <span>NEW BEST!</span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] px-2 py-0.5">
            <CharacterShowcaseCanvas
              customFaceImg={customFaceImg}
              characterId={characterId}
              skinId={skinId}
              rarity={customFaceImg ? undefined : activeChar.rarity}
              size={54}
              animate={false}
            />
          </div>
          {reaction && (
            <p
              key={reaction.id}
              className="anim-reaction-in line-clamp-3 flex-1 rounded-2xl bg-[#F2F9FF] px-3 py-2 text-left text-[12px] leading-snug font-extrabold text-[#24415C]/90"
            >
              &ldquo;{reaction.text}&rdquo;
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 rounded-2xl border-2 border-[#24415C]/15 bg-[#E8F6FF] p-3 sm:mt-4 sm:p-3.5">
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-black tracking-wider text-[#24415C]/65 uppercase">
              Current Score
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-[#24415C]">
              {score}
            </span>
          </div>

          <div className="flex flex-col items-center border-l-2 border-[#24415C]/10">
            <span className="text-[11px] font-black tracking-wider text-[#24415C]/65 uppercase">
              Best Score
            </span>
            <span className="font-display text-3xl font-bold tabular-nums text-[#3998F7]">
              {bestScore}
            </span>
          </div>
        </div>

        {(rivalTargetScore !== undefined || activeChallengeTitle) && (
          <div className="mt-2 rounded-xl border-2 border-[#24415C]/15 bg-[#F8FBFF] px-3 py-1.5 text-[10px] font-black text-[#24415C]">
            {activeChallengeTitle && (
              <div className="mb-1 flex items-center justify-center gap-1 text-[#0369A1]">
                <Flame className="h-3 w-3 text-[#F59E0B]" />
                <span>Challenge: {activeChallengeTitle}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#24415C]/65 tabular-nums">
                Prev Run:{' '}
                <strong
                  className={
                    score >= previousRunScore ? 'text-emerald-700' : 'text-[#24415C]'
                  }
                >
                  {previousRunScore}
                </strong>
              </span>
              {rivalTargetScore !== undefined && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Target className="h-3 w-3 text-[#FF6B6B]" />
                  <span className="max-w-[95px] truncate">{rivalName ?? 'Rival'}:</span>
                  <strong
                    className={
                      score > rivalTargetScore ? 'text-emerald-600' : 'text-[#FF6B6B]'
                    }
                  >
                    {score > rivalTargetScore
                      ? `+${score - rivalTargetScore}`
                      : `${score}/${rivalTargetScore}`}
                  </strong>
                </span>
              )}
            </div>
          </div>
        )}

        {(runCoins > 0 || runGems > 0 || runXP > 0) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2.5 rounded-xl border-2 border-[#24415C]/15 bg-[#FFF9DB] px-3 py-1 text-xs font-black text-[#24415C]">
            <span className="text-[10px] tracking-wider text-[#24415C]/65 uppercase">Earned</span>
            {runXP > 0 && (
              <span className="inline-flex items-center gap-1 text-[#15803D] tabular-nums">
                <span aria-hidden="true">✨</span>+{runXP} XP
              </span>
            )}
            {runCoins > 0 && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <span aria-hidden="true">🪙</span>+{runCoins}
              </span>
            )}
            {runGems > 0 && (
              <span className="inline-flex items-center gap-1 text-[#0284C7] tabular-nums">
                <span aria-hidden="true">💎</span>+{runGems}
              </span>
            )}
          </div>
        )}

        {shareToast && (
          <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span>{shareToast}</span>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onRetry();
            }}
            className="btn-base btn-green min-h-[54px] w-full text-xl"
          >
            <RotateCcw className="h-5 w-5" />
            <span>RETRY</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onHome();
              }}
              className="btn-base btn-secondary min-h-[46px] text-sm"
            >
              <Home className="h-4 w-4 text-[#3998F7]" />
              <span>HOME</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                handleShare();
              }}
              className="btn-base btn-primary min-h-[46px] text-sm"
            >
              <Share2 className="h-4 w-4" />
              <span>SHARE</span>
            </button>
          </div>

          {onOpenCompetitiveHub && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onOpenCompetitiveHub();
              }}
              className="btn-base btn-secondary min-h-[40px] w-full text-xs"
            >
              <Award className="h-4 w-4 text-[#F59E0B]" />
              <span>COMPETITIVE HUB</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
