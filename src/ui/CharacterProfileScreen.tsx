import React, { useState } from 'react';
import { Calendar, Check, Lock, Sparkles, Star, X } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import {
  CharacterDefinition,
  RARITY_META,
} from '../game/character/CharacterRegistry';
import {
  characterSkinManager,
  SKIN_REGISTRY,
  SkinId,
} from '../game/character/CharacterSkinManager';
import { CharacterSlot } from '../game/character/CharacterStorage';
import {
  CharacterMetrics,
  characterUnlockManager,
} from '../game/character/CharacterUnlockManager';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface CharacterProfileScreenProps {
  character: CharacterDefinition;
  slot: CharacterSlot;
  metrics: CharacterMetrics;
  isFavorite: boolean;
  isEquipped: boolean;
  selectedSkinId: SkinId;
  onToggleFavorite: (characterId: string) => void;
  onEquipCharacter: (characterId: string) => void;
  onSelectSkin: (skinId: SkinId) => void;
  onClose: () => void;
}

export const CharacterProfileScreen: React.FC<CharacterProfileScreenProps> = ({
  character,
  metrics,
  isFavorite,
  isEquipped,
  selectedSkinId,
  onToggleFavorite,
  onEquipCharacter,
  onSelectSkin,
  onClose,
}) => {
  const [previewSkinId, setPreviewSkinId] = useState<SkinId>(selectedSkinId);
  const progress = characterUnlockManager.getProgressForCharacter(character, metrics);
  const unlockedAt = characterUnlockManager.getUnlockTimestamp(character.id);
  const rarity = RARITY_META[character.rarity];

  const unlockedDateLabel =
    unlockedAt !== null
      ? new Date(unlockedAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

  const previewSkin =
    SKIN_REGISTRY.find((s) => s.id === previewSkinId) ?? SKIN_REGISTRY[0];
  const isPreviewSkinUnlocked = characterSkinManager.isUnlocked(previewSkin.id);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-3.5 backdrop-blur-sm"
    >
      <div className="anim-panel-pop game-panel flex max-h-full w-full max-w-[350px] flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between border-b-2 border-[#24415C]/10 bg-[#EEF7FF] px-4 py-2.5">
          <span
            className={`inline-flex items-center rounded-xl border border-[#24415C] px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase ${rarity.badgeBg} ${rarity.badgeText}`}
          >
            {rarity.label}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
              onClick={() => {
                audioManager.playButton();
                onToggleFavorite(character.id);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#24415C] transition-transform active:scale-95 ${
                isFavorite ? 'bg-[#FFD84D] text-[#24415C]' : 'bg-white text-[#24415C]/45'
              }`}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-[#24415C]' : ''}`} />
            </button>

            <button
              type="button"
              aria-label="Tutup profil"
              onClick={() => {
                audioManager.playButton();
                onClose();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#24415C] bg-white text-[#24415C] transition-transform active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {/* Artwork Showcase */}
          <div
            className={`flex flex-col items-center rounded-3xl border-2 bg-gradient-to-b py-2 ${rarity.cardBg}`}
            style={{ borderColor: rarity.borderColor }}
          >
            <CharacterShowcaseCanvas
              characterId={character.id}
              skinId={previewSkinId}
              lockedSilhouette={!progress.unlocked}
              rarity={character.rarity}
              size={126}
              animate={true}
            />
            <div className="mt-1 flex items-center gap-1.5">
              {progress.unlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#32B85C] px-2.5 py-0.5 text-[10px] font-black text-white">
                  <Check className="h-3 w-3" />
                  <span>{isEquipped ? 'EQUIPPED' : 'OWNED'}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                  <Lock className="h-3 w-3" />
                  <span>LOCKED</span>
                </span>
              )}
              {unlockedDateLabel && progress.unlocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-bold text-[#24415C]/75">
                  <Calendar className="h-3 w-3 text-[#3998F7]" />
                  <span>{unlockedDateLabel}</span>
                </span>
              )}
            </div>
          </div>

          {/* Name, Description & Personality */}
          <div className="text-center">
            <h3 className="font-display text-2xl leading-tight font-bold text-[#24415C]">
              {character.name}
            </h3>
            <p className="mt-1 text-xs font-bold leading-relaxed text-[#24415C]/80">
              {character.description}
            </p>
            <div className="mt-2 rounded-2xl border border-[#24415C]/15 bg-[#FFF9DB] px-3 py-2 text-xs font-extrabold italic text-[#24415C]">
              &ldquo;{character.personalityQuote}&rdquo;
            </div>
          </div>

          {/* Unlock Method & Real-time Progress */}
          <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-3">
            <div className="flex items-center justify-between text-[11px] font-black text-[#24415C]">
              <span>UNLOCK REQUIREMENT</span>
              <span className="tabular-nums text-[#3998F7]">
                {progress.current} / {progress.target} ({progress.percent}%)
              </span>
            </div>
            <div className="mt-0.5 text-xs font-extrabold text-[#24415C]/80">
              {character.unlockCondition.label}
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/25 bg-white">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  progress.unlocked ? 'bg-[#32B85C]' : 'bg-[#3998F7]'
                }`}
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>

          {/* Available Cosmetic Skins */}
          <div className="rounded-2xl border-2 border-[#24415C]/15 bg-white p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-[#24415C] uppercase">
                <Sparkles className="h-3.5 w-3.5 text-[#F59E0B]" />
                <span>COSMETIC SKINS</span>
              </div>
              <span className="text-[10px] font-extrabold text-[#24415C]/60">
                Active: {SKIN_REGISTRY.find((s) => s.id === selectedSkinId)?.name ?? 'DEFAULT'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {SKIN_REGISTRY.map((skin) => {
                const skinUnlocked = characterSkinManager.isUnlocked(skin.id);
                const isSelected = selectedSkinId === skin.id;
                const isPreviewing = previewSkinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => {
                      setPreviewSkinId(skin.id);
                      if (skinUnlocked) {
                        audioManager.playCharacterSelect();
                        onSelectSkin(skin.id);
                      } else {
                        audioManager.playButton();
                      }
                    }}
                    className={`flex flex-col items-center rounded-xl border-2 px-1.5 py-1.5 text-center transition-all ${
                      isSelected
                        ? 'border-[#24415C] bg-[#FFD84D] shadow-[0_2px_0_#24415C]'
                        : isPreviewing
                          ? 'border-[#3998F7] bg-[#EEF7FF]'
                          : skinUnlocked
                            ? 'border-[#24415C]/20 bg-[#F8FBFF]'
                            : 'border-slate-200 bg-slate-100 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="h-3 w-3 rounded-full border border-[#24415C]"
                        style={{ backgroundColor: skin.badgeColor }}
                      />
                      {!skinUnlocked && <Lock className="h-2.5 w-2.5 text-slate-500" />}
                    </div>
                    <span className="mt-1 line-clamp-1 text-[9px] font-black text-[#24415C]">
                      {skin.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 rounded-xl bg-[#EEF7FF] px-2.5 py-1.5 text-[10px] font-bold text-[#24415C]/80">
              <span className="font-black text-[#24415C]">{previewSkin.name}:</span>{' '}
              {previewSkin.description}{' '}
              {!isPreviewSkinUnlocked && (
                <span className="font-black text-[#FF6B6B]">
                  (Syarat: {previewSkin.unlockRequirementLabel})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer Action */}
        <div className="border-t-2 border-[#24415C]/10 bg-white px-4 py-3">
          {progress.unlocked ? (
            <button
              type="button"
              disabled={isEquipped}
              onClick={() => {
                audioManager.playCharacterSelect();
                onEquipCharacter(character.id);
              }}
              className={`btn-base min-h-[46px] w-full text-sm ${
                isEquipped ? 'btn-secondary' : 'btn-green'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{isEquipped ? 'EQUIPPED' : 'EQUIP CHARACTER'}</span>
            </button>
          ) : (
            <div className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-slate-300 bg-slate-100 px-3 text-xs font-black text-slate-600">
              <Lock className="h-4 w-4" />
              <span>LOCKED · {character.unlockCondition.label}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
