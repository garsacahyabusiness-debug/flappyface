import React, { useEffect, useRef, useState } from 'react';
import { Check, Home, RotateCcw, Share2, Trophy } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { GameOverReaction } from '../game/GameOverReaction';

interface GameOverOverlayProps {
  score: number;
  bestScore: number;
  isNewBest: boolean;
  reaction?: GameOverReaction | null;
  onRetry: () => void;
  onHome: () => void;
}

export const GameOverOverlay: React.FC<GameOverOverlayProps> = ({
  score,
  bestScore,
  isNewBest,
  reaction = null,
  onRetry,
  onHome,
}) => {
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

        {reaction && (
          <p
            key={reaction.id}
            className="anim-reaction-in mx-auto mt-2.5 line-clamp-2 rounded-2xl bg-[#F2F9FF] px-3 py-2 text-[13px] leading-snug font-extrabold text-[#24415C]/90 sm:text-sm"
          >
            &ldquo;{reaction.text}&rdquo;
          </p>
        )}

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
        </div>
      </div>
    </div>
  );
};
