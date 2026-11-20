import React, { useEffect } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CharacterDefinition, RARITY_META } from '../game/character/CharacterRegistry';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface CharacterUnlockPopupProps {
  queue: CharacterDefinition[];
  onEquipNow: (characterId: string) => void;
  onLater: () => void;
}

export const CharacterUnlockPopup: React.FC<CharacterUnlockPopupProps> = ({
  queue,
  onEquipNow,
  onLater,
}) => {
  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const tier =
      current.rarity === 'MYTHIC' || current.rarity === 'LEGENDARY'
        ? 'mythic'
        : current.rarity === 'EPIC' || current.rarity === 'RARE'
          ? 'rare'
          : 'standard';
    audioManager.playCharacterUnlock(tier);
  }, [current]);

  if (!current) return null;

  const rarity = RARITY_META[current.rarity];

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-50 flex items-center justify-center bg-[#182B3D]/70 p-5 backdrop-blur-sm"
    >
      <div className="anim-unlock-reveal game-panel relative w-full max-w-[318px] overflow-hidden p-5 text-center">
        {/* Rarity Glow Backdrop */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full opacity-55 blur-2xl"
          style={{ background: rarity.glowColor }}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-3 py-0.5 text-[11px] font-black tracking-wider text-[#24415C] uppercase shadow-[0_2px_0_#24415C]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>NEW CHARACTER UNLOCKED!</span>
          </div>

          {/* Animated Character Showcase with spinning aura ring */}
          <div className="relative my-3 flex items-center justify-center">
            <div
              aria-hidden="true"
              className="anim-spin-slow absolute h-36 w-36 rounded-full border-4 border-dashed opacity-65"
              style={{ borderColor: rarity.borderColor }}
            />
            <div
              className={`relative rounded-full border-3 bg-gradient-to-b p-1 shadow-inner ${rarity.cardBg}`}
              style={{ borderColor: rarity.borderColor }}
            >
              <CharacterShowcaseCanvas
                characterId={current.id}
                rarity={current.rarity}
                size={128}
                animate={true}
              />
            </div>
          </div>

          <span
            className={`inline-flex items-center rounded-xl border border-[#24415C] px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${rarity.badgeBg} ${rarity.badgeText}`}
          >
            {rarity.unlockHeadline}
          </span>

          <h3 className="font-display text-stroke-dark mt-1.5 text-2xl font-bold tracking-wide text-[#FFD84D]">
            ✨ {current.name} ✨
          </h3>

          <p className="mt-1.5 rounded-2xl bg-[#EEF7FF] px-3 py-2 text-xs font-extrabold leading-snug text-[#24415C]/85">
            &ldquo;{current.unlockQuote}&rdquo;
          </p>

          <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onLater();
              }}
              className="btn-base btn-secondary min-h-[46px] text-sm"
            >
              LATER
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playCharacterSelect();
                onEquipNow(current.id);
              }}
              className="btn-base btn-green min-h-[46px] text-sm"
            >
              <Check className="h-4 w-4" />
              <span>EQUIP NOW</span>
            </button>
          </div>

          {queue.length > 1 && (
            <div className="mt-2 text-[10px] font-black tracking-wider text-[#24415C]/55 uppercase">
              +{queue.length - 1} karakter lainnya menunggu
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
