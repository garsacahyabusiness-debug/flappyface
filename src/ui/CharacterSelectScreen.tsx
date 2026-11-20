import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  Shuffle,
  Sparkles,
  Star,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CharacterRandomizer } from '../game/character/CharacterRandomizer';
import {
  CHARACTER_REGISTRY,
  CharacterDefinition,
  getCharacterById,
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
  SlotCharacterSelection,
} from '../game/character/CharacterUnlockManager';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface CharacterSelectScreenProps {
  slot: CharacterSlot;
  slotBadge?: { label: string; tone: 'blue' | 'rose' } | null;
  selection: SlotCharacterSelection;
  selectedSkinId: SkinId;
  customFaceImg: HTMLImageElement | null;
  favorites: string[];
  randomEveryRun: boolean;
  metrics: CharacterMetrics;
  initialFocusId?: string | null;
  onSelectGameCharacter: (characterId: string) => void;
  onSelectCustomFaceMode: () => void;
  onOpenCustomFaceEditor: () => void;
  onSelectSkin: (skinId: SkinId) => void;
  onToggleFavorite: (characterId: string) => void;
  onToggleRandomEveryRun: () => void;
  onOpenProfile: (character: CharacterDefinition) => void;
  onBack: () => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  slot,
  slotBadge = null,
  selection,
  selectedSkinId,
  customFaceImg,
  favorites,
  randomEveryRun,
  metrics,
  initialFocusId = null,
  onSelectGameCharacter,
  onSelectCustomFaceMode,
  onOpenCustomFaceEditor,
  onSelectSkin,
  onToggleFavorite,
  onToggleRandomEveryRun,
  onOpenProfile,
  onBack,
}) => {
  const [focusedId, setFocusedId] = useState<string>(() => {
    if (initialFocusId && CHARACTER_REGISTRY.some((c) => c.id === initialFocusId)) {
      return initialFocusId;
    }
    return selection.characterId;
  });
  const [selectFlashId, setSelectFlashId] = useState<string | null>(null);

  const focusedIndex = useMemo(() => {
    const idx = CHARACTER_REGISTRY.findIndex((c) => c.id === focusedId);
    return idx >= 0 ? idx : 0;
  }, [focusedId]);

  const focusedChar = CHARACTER_REGISTRY[focusedIndex] ?? getCharacterById(selection.characterId);
  const progress = characterUnlockManager.getProgressForCharacter(focusedChar, metrics);
  const rarity = RARITY_META[focusedChar.rarity];
  const isCustomFaceActive = selection.mode === 'custom_face' && Boolean(customFaceImg);
  const isEquipped =
    selection.mode === 'character' && selection.characterId === focusedChar.id;
  const isFavorite = favorites.includes(focusedChar.id);
  const summary = characterUnlockManager.getCollectionSummary();

  const handleStep = (delta: number) => {
    audioManager.playButton();
    const len = CHARACTER_REGISTRY.length;
    const nextIdx = (focusedIndex + delta + len) % len;
    setFocusedId(CHARACTER_REGISTRY[nextIdx].id);
  };

  const triggerSelectFeedback = (id: string) => {
    setSelectFlashId(id);
    window.setTimeout(() => {
      setSelectFlashId((prev) => (prev === id ? null : prev));
    }, 360);
  };

  const handleEquipFocused = () => {
    if (!progress.unlocked) return;
    audioManager.playCharacterSelect();
    onSelectGameCharacter(focusedChar.id);
    triggerSelectFeedback(focusedChar.id);
  };

  const handleRandomPick = () => {
    const pick = CharacterRandomizer.pickRandom({
      unlockedCharacterIds: characterUnlockManager.getUnlockedIds(),
      currentCharacterId: selection.characterId,
      currentIsCustomFace: isCustomFaceActive,
      hasCustomFace: Boolean(customFaceImg),
      includeCustomFace: slot === 'default' && Boolean(customFaceImg),
    });
    audioManager.playCharacterSelect();
    if (pick.kind === 'custom_face' && customFaceImg) {
      onSelectCustomFaceMode();
    } else if (pick.kind === 'character') {
      setFocusedId(pick.characterId);
      onSelectGameCharacter(pick.characterId);
      triggerSelectFeedback(pick.characterId);
    }
  };

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-3.5 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-1.5">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[40px] px-3 py-1.5 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <div className="flex flex-col items-center">
          <h2 className="font-display text-stroke-dark text-lg font-bold tracking-wide text-white">
            CHARACTER SELECT
          </h2>
          {slotBadge && (
            <span
              className={`mt-0.5 rounded-lg border border-[#24415C] px-2 py-0.5 text-[9px] font-black text-white uppercase ${
                slotBadge.tone === 'blue' ? 'bg-[#3998F7]' : 'bg-[#FF6B6B]'
              }`}
            >
              {slotBadge.label}
            </span>
          )}
        </div>

        <div className="rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-2.5 py-1 text-xs font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
          {summary.unlockedCount}/{summary.totalCount}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="mx-auto flex w-full max-w-[358px] flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
        {/* Category Switch: GAME CHARACTERS vs CUSTOM FACE */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border-2 border-[#24415C] bg-white p-1 shadow-[0_3px_0_#24415C]">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              if (progress.unlocked) {
                onSelectGameCharacter(focusedChar.id);
              } else {
                onSelectGameCharacter(selection.characterId);
              }
            }}
            className={`min-h-[34px] rounded-xl text-[11px] font-black transition-all ${
              !isCustomFaceActive
                ? 'border-2 border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                : 'text-[#24415C]/65'
            }`}
          >
            GAME CHARACTERS
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              if (customFaceImg) {
                onSelectCustomFaceMode();
              } else {
                onOpenCustomFaceEditor();
              }
            }}
            className={`flex min-h-[34px] items-center justify-center gap-1 rounded-xl text-[11px] font-black transition-all ${
              isCustomFaceActive
                ? 'border-2 border-[#24415C] bg-[#3998F7] text-white'
                : 'text-[#24415C]/65'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>CUSTOM FACE</span>
          </button>
        </div>

        {/* Center Hero Preview Panel */}
        <div className="game-panel p-3.5">
          {isCustomFaceActive && customFaceImg ? (
            <div className="flex flex-col items-center text-center">
              <span className="rounded-xl border border-[#24415C] bg-[#3998F7] px-2.5 py-0.5 text-[10px] font-black text-white uppercase">
                CUSTOM FACE ACTIVE
              </span>
              <div className="my-2 rounded-3xl border-2 border-[#3998F7] bg-[#E8F6FF] px-6 py-1">
                <CharacterShowcaseCanvas
                  customFaceImg={customFaceImg}
                  characterId={selection.characterId}
                  skinId={selectedSkinId}
                  size={128}
                  animate={true}
                />
              </div>
              <p className="text-xs font-bold text-[#24415C]/75">
                Foto wajahmu tersimpan aman. Kamu bisa memakai Skin kosmetik atau pilih karakter game kapan saja!
              </p>
              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onOpenCustomFaceEditor();
                }}
                className="btn-base btn-secondary mt-2.5 min-h-[40px] w-full text-xs"
              >
                <Camera className="h-4 w-4 text-[#3998F7]" />
                <span>EDIT / GANTI FOTO</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* Top Badges */}
              <div className="flex w-full items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-xl border border-[#24415C] px-2.5 py-0.5 text-[10px] font-black uppercase ${rarity.badgeBg} ${rarity.badgeText}`}
                >
                  {rarity.label}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Detail profil karakter"
                    onClick={() => {
                      audioManager.playButton();
                      onOpenProfile(focusedChar);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]"
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    aria-label={isFavorite ? 'Hapus favorit' : 'Tandai favorit'}
                    onClick={() => {
                      audioManager.playButton();
                      onToggleFavorite(focusedChar.id);
                    }}
                    className={`flex h-8 w-8 items-center justify-center rounded-xl border-2 border-[#24415C] ${
                      isFavorite ? 'bg-[#FFD84D] text-[#24415C]' : 'bg-white text-[#24415C]/40'
                    }`}
                  >
                    <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-[#24415C]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Prev / Preview / Next */}
              <div className="mt-1.5 flex w-full items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="PREVIOUS"
                  onClick={() => handleStep(-1)}
                  className="btn-base btn-secondary h-11 w-11 shrink-0 rounded-2xl p-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div
                  className={`flex flex-1 items-center justify-center rounded-3xl border-2 bg-gradient-to-b py-1 transition-transform ${rarity.cardBg} ${
                    selectFlashId === focusedChar.id ? 'scale-105' : ''
                  }`}
                  style={{ borderColor: rarity.borderColor }}
                >
                  <CharacterShowcaseCanvas
                    characterId={focusedChar.id}
                    skinId={selectedSkinId}
                    lockedSilhouette={!progress.unlocked}
                    rarity={focusedChar.rarity}
                    size={128}
                    animate={true}
                  />
                </div>

                <button
                  type="button"
                  aria-label="NEXT"
                  onClick={() => handleStep(1)}
                  className="btn-base btn-secondary h-11 w-11 shrink-0 rounded-2xl p-0"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <h3 className="font-display mt-2 text-2xl leading-none font-bold text-[#24415C]">
                {focusedChar.name}
              </h3>

              <p className="mt-1 text-xs font-bold leading-snug text-[#24415C]/75">
                {focusedChar.description}
              </p>

              {/* Progress / Unlock Status */}
              {!progress.unlocked ? (
                <div className="mt-2.5 w-full rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-2.5 text-left">
                  <div className="flex items-center justify-between text-[10px] font-black text-[#24415C]">
                    <span className="inline-flex items-center gap-1 text-[#FF6B6B]">
                      <Lock className="h-3 w-3" />
                      {focusedChar.unlockCondition.label}
                    </span>
                    <span className="tabular-nums text-[#3998F7]">
                      {progress.current} / {progress.target} ({progress.percent}%)
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/20 bg-white">
                    <div
                      className="h-full rounded-full bg-[#3998F7] transition-all duration-300"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 text-[11px] font-extrabold italic text-[#3998F7]">
                  &ldquo;{focusedChar.personalityQuote}&rdquo;
                </div>
              )}

              {/* Primary Action Row */}
              <div className="mt-2.5 grid w-full grid-cols-[1.4fr_1fr] gap-2">
                {progress.unlocked ? (
                  <button
                    type="button"
                    disabled={isEquipped}
                    onClick={handleEquipFocused}
                    className={`btn-base min-h-[44px] text-sm ${
                      isEquipped ? 'btn-secondary' : 'btn-green'
                    }`}
                  >
                    <Check className="h-4 w-4" />
                    <span>{isEquipped ? 'EQUIPPED' : 'SELECT'}</span>
                  </button>
                ) : (
                  <div className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl border-2 border-slate-300 bg-slate-100 text-xs font-black text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    <span>LOCKED</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRandomPick}
                  className="btn-base btn-primary min-h-[44px] px-2 text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  <span>RANDOM</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Skin Strip (Works for both Game Character & Custom Face!) */}
          <div className="mt-2.5 border-t-2 border-[#24415C]/10 pt-2">
            <div className="flex items-center justify-between text-[10px] font-black text-[#24415C]/70 uppercase">
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                SKIN: {SKIN_REGISTRY.find((s) => s.id === selectedSkinId)?.name}
              </span>
              <span>{characterSkinManager.getUnlockedSkins().length}/{SKIN_REGISTRY.length}</span>
            </div>
            <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
              {SKIN_REGISTRY.map((skin) => {
                const unlocked = characterSkinManager.isUnlocked(skin.id);
                const active = selectedSkinId === skin.id;
                return (
                  <button
                    key={skin.id}
                    type="button"
                    disabled={!unlocked}
                    title={
                      unlocked
                        ? skin.name
                        : `${skin.name} — ${skin.unlockRequirementLabel}`
                    }
                    onClick={() => {
                      if (!unlocked) return;
                      audioManager.playCharacterSelect();
                      onSelectSkin(skin.id);
                    }}
                    className={`flex shrink-0 items-center gap-1 rounded-xl border-2 px-2 py-1 text-[10px] font-black transition-all ${
                      active
                        ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                        : unlocked
                          ? 'border-[#24415C]/20 bg-[#EEF7FF] text-[#24415C]'
                          : 'border-slate-200 bg-slate-100 text-slate-400 opacity-65'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-[#24415C]"
                      style={{ backgroundColor: skin.badgeColor }}
                    />
                    <span>{skin.name}</span>
                    {!unlocked && <Lock className="h-2.5 w-2.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Random Every Run Toggle */}
          <div className="mt-2 flex items-center justify-between rounded-xl bg-[#EEF7FF] px-3 py-1.5">
            <div>
              <div className="text-[11px] font-black text-[#24415C]">RANDOM EVERY RUN</div>
              <div className="text-[9px] font-bold text-[#24415C]/65">
                Acak karakter unlocked tiap mulai game
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={randomEveryRun}
              aria-label="Random Every Run"
              onClick={() => {
                audioManager.playButton();
                onToggleRandomEveryRun();
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-[#24415C] p-0.5 transition-colors ${
                randomEveryRun ? 'bg-[#61D66B]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full border border-[#24415C] bg-white transition-transform ${
                  randomEveryRun ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Collection Grid Below Preview */}
        <div className="game-panel p-3">
          <div className="mb-2 flex items-center justify-between text-[11px] font-black text-[#24415C]/75 uppercase">
            <span>COLLECTION GRID</span>
            <span>TAP TO INSPECT</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CHARACTER_REGISTRY.map((char) => {
              const unlocked = characterUnlockManager.isUnlocked(char.id);
              const r = RARITY_META[char.rarity];
              const isFocused = focusedChar.id === char.id && !isCustomFaceActive;
              const isCardEquipped =
                selection.mode === 'character' && selection.characterId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    setFocusedId(char.id);
                  }}
                  className={`relative flex flex-col items-center rounded-2xl border-2 bg-gradient-to-b p-1.5 text-center transition-transform active:scale-95 ${r.cardBg} ${
                    isFocused ? 'ring-2 ring-[#24415C] ring-offset-1' : ''
                  }`}
                  style={{ borderColor: r.borderColor }}
                >
                  {isCardEquipped && (
                    <span className="absolute top-1 left-1 rounded bg-[#32B85C] px-1 text-[8px] font-black text-white">
                      USED
                    </span>
                  )}
                  {!unlocked && (
                    <Lock className="absolute top-1 right-1 h-3 w-3 text-slate-600" />
                  )}
                  <CharacterShowcaseCanvas
                    characterId={char.id}
                    skinId={isCardEquipped ? selectedSkinId : 'default'}
                    lockedSilhouette={!unlocked}
                    rarity={char.rarity}
                    size={54}
                    animate={false}
                  />
                  <span className="mt-0.5 line-clamp-1 text-[9px] font-black text-[#24415C]">
                    {char.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
