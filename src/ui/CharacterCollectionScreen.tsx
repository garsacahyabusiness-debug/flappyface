import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Camera,
  Check,
  Lock,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CharacterRandomizer } from '../game/character/CharacterRandomizer';
import {
  CHARACTER_REGISTRY,
  CharacterDefinition,
  CharacterRarity,
  RARITY_META,
  RARITY_ORDER,
} from '../game/character/CharacterRegistry';
import {
  characterSkinManager,
  SKIN_REGISTRY,
  SkinId,
} from '../game/character/CharacterSkinManager';
import {
  CharacterMetrics,
  characterUnlockManager,
  SlotCharacterSelection,
} from '../game/character/CharacterUnlockManager';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

type CollectionCategory = 'GAME_CHARACTERS' | 'CUSTOM_FACE';
type StatusFilter = 'ALL' | 'UNLOCKED' | 'LOCKED' | 'FAVORITES';

interface CharacterCollectionScreenProps {
  selection: SlotCharacterSelection;
  selectedSkinId: SkinId;
  customFaceImg: HTMLImageElement | null;
  favorites: string[];
  randomEveryRun: boolean;
  metrics: CharacterMetrics;
  onSelectGameCharacter: (characterId: string) => void;
  onSelectCustomFaceMode: () => void;
  onOpenCustomFaceEditor: () => void;
  onSelectSkin: (skinId: SkinId) => void;
  onToggleFavorite: (characterId: string) => void;
  onToggleRandomEveryRun: () => void;
  onOpenProfile: (character: CharacterDefinition) => void;
  onOpenSelectScreen: (focusId?: string) => void;
  onBack: () => void;
}

export const CharacterCollectionScreen: React.FC<CharacterCollectionScreenProps> = ({
  selection,
  selectedSkinId,
  customFaceImg,
  favorites,
  randomEveryRun,
  metrics,
  onSelectGameCharacter,
  onSelectCustomFaceMode,
  onOpenCustomFaceEditor,
  onSelectSkin,
  onToggleFavorite,
  onToggleRandomEveryRun,
  onOpenProfile,
  onOpenSelectScreen,
  onBack,
}) => {
  const [category, setCategory] = useState<CollectionCategory>(
    selection.mode === 'custom_face' && customFaceImg ? 'CUSTOM_FACE' : 'GAME_CHARACTERS'
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [rarityFilter, setRarityFilter] = useState<CharacterRarity | 'ALL'>('ALL');

  const summary = characterUnlockManager.getCollectionSummary();

  const filteredCharacters = useMemo(() => {
    return CHARACTER_REGISTRY.filter((char) => {
      const unlocked = characterUnlockManager.isUnlocked(char.id);
      if (statusFilter === 'UNLOCKED' && !unlocked) return false;
      if (statusFilter === 'LOCKED' && unlocked) return false;
      if (statusFilter === 'FAVORITES' && !favorites.includes(char.id)) return false;
      if (rarityFilter !== 'ALL' && char.rarity !== rarityFilter) return false;
      return true;
    });
  }, [statusFilter, rarityFilter, favorites]);

  const handleRandomCharacter = () => {
    const pick = CharacterRandomizer.pickRandom({
      unlockedCharacterIds: characterUnlockManager.getUnlockedIds(),
      currentCharacterId: selection.characterId,
      currentIsCustomFace: selection.mode === 'custom_face' && Boolean(customFaceImg),
      hasCustomFace: Boolean(customFaceImg),
      includeCustomFace: Boolean(customFaceImg),
    });
    audioManager.playCharacterSelect();
    if (pick.kind === 'custom_face' && customFaceImg) {
      setCategory('CUSTOM_FACE');
      onSelectCustomFaceMode();
    } else if (pick.kind === 'character') {
      setCategory('GAME_CHARACTERS');
      onSelectGameCharacter(pick.characterId);
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

        <h2 className="font-display text-stroke-dark text-center text-base font-bold tracking-wide text-white sm:text-lg">
          CHARACTER COLLECTION
        </h2>

        <div className="rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-2.5 py-1 text-xs font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
          {summary.unlockedCount}/{summary.totalCount}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="mx-auto flex w-full max-w-[358px] flex-1 flex-col gap-2.5 overflow-y-auto pb-2">
        {/* Progress & Rarity Summary Card */}
        <div className="game-panel p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] font-black tracking-wider text-[#24415C]/65 uppercase">
                COLLECTION PROGRESS
              </div>
              <div className="font-display text-xl font-bold text-[#24415C]">
                {summary.unlockedCount} / {summary.totalCount} UNLOCKED{' '}
                <span className="text-sm text-[#3998F7]">({summary.percent}%)</span>
              </div>
            </div>

            {summary.hasLegendTitle && (
              <span className="inline-flex items-center gap-1 rounded-xl border-2 border-[#24415C] bg-gradient-to-r from-[#FFD84D] to-[#F472B6] px-2 py-1 text-[9px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
                <Award className="h-3 w-3" />
                <span>LEGEND FACE</span>
              </span>
            )}
          </div>

          <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full border-2 border-[#24415C] bg-[#EEF7FF]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3998F7] via-[#61D66B] to-[#FFD84D] transition-all duration-300"
              style={{ width: `${summary.percent}%` }}
            />
          </div>

          {/* Per-Rarity Counts */}
          <div className="mt-2.5 grid grid-cols-3 gap-1.5">
            {RARITY_ORDER.map((rKey) => {
              const rMeta = RARITY_META[rKey];
              const counts = summary.byRarity[rKey];
              return (
                <div
                  key={rKey}
                  className={`flex items-center justify-between rounded-xl border px-2 py-1 text-[9px] font-black ${rMeta.badgeBg} ${rMeta.badgeText}`}
                  style={{ borderColor: rMeta.borderColor }}
                >
                  <span>{rMeta.label}</span>
                  <span className="tabular-nums">
                    {counts.unlocked}/{counts.total}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Collection Milestones (25 / 50 / 75 / 100%) */}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {summary.milestones.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[9px] font-extrabold ${
                  m.unlocked
                    ? 'border-[#32B85C] bg-emerald-50 text-emerald-900'
                    : 'border-[#24415C]/15 bg-[#EEF7FF] text-[#24415C]/65'
                }`}
              >
                {m.unlocked ? (
                  <Check className="h-3 w-3 shrink-0 text-[#32B85C]" />
                ) : (
                  <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                )}
                <div className="min-w-0">
                  <div className="font-black">{m.percentRequired}%</div>
                  <div className="truncate">{m.rewardLabel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Tabs: GAME CHARACTERS | CUSTOM FACE */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border-2 border-[#24415C] bg-white p-1 shadow-[0_3px_0_#24415C]">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              setCategory('GAME_CHARACTERS');
            }}
            className={`min-h-[36px] rounded-xl text-xs font-black transition-all ${
              category === 'GAME_CHARACTERS'
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
              setCategory('CUSTOM_FACE');
            }}
            className={`flex min-h-[36px] items-center justify-center gap-1 rounded-xl text-xs font-black transition-all ${
              category === 'CUSTOM_FACE'
                ? 'border-2 border-[#24415C] bg-[#3998F7] text-white'
                : 'text-[#24415C]/65'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>CUSTOM FACE</span>
          </button>
        </div>

        {/* Randomizer Controls + Quick Open Select */}
        <div className="game-panel flex items-center justify-between gap-2 p-2.5">
          <button
            type="button"
            onClick={handleRandomCharacter}
            className="btn-base btn-primary min-h-[38px] px-3 text-xs"
          >
            <Shuffle className="h-3.5 w-3.5" />
            <span>RANDOM CHARACTER</span>
          </button>

          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onToggleRandomEveryRun();
            }}
            className={`flex min-h-[38px] items-center gap-1.5 rounded-2xl border-2 px-2.5 text-[10px] font-black transition-all ${
              randomEveryRun
                ? 'border-[#24415C] bg-[#61D66B] text-[#24415C]'
                : 'border-[#24415C]/25 bg-[#EEF7FF] text-[#24415C]/75'
            }`}
          >
            <span>EVERY RUN: {randomEveryRun ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {category === 'CUSTOM_FACE' ? (
          <div className="game-panel flex flex-col items-center p-4 text-center">
            <div className="rounded-3xl border-2 border-[#3998F7] bg-[#E8F6FF] px-6 py-1">
              <CharacterShowcaseCanvas
                customFaceImg={customFaceImg}
                characterId={selection.characterId}
                skinId={selectedSkinId}
                size={132}
                animate={true}
              />
            </div>

            <div className="mt-2 font-display text-lg font-bold text-[#24415C]">
              {customFaceImg ? 'CUSTOM FACE READY' : 'BELUM ADA CUSTOM FACE'}
            </div>
            <p className="mt-0.5 text-xs font-bold text-[#24415C]/70">
              {customFaceImg
                ? 'Foto kamu aman tersimpan meski berganti ke karakter game. Skin kosmetik juga bisa dipasang!'
                : 'Ambil foto selfie atau pilih dari galeri untuk terbang memakai wajahmu sendiri.'}
            </p>

            <div className="mt-3 grid w-full grid-cols-2 gap-2">
              {customFaceImg && (
                <button
                  type="button"
                  disabled={selection.mode === 'custom_face'}
                  onClick={() => {
                    audioManager.playCharacterSelect();
                    onSelectCustomFaceMode();
                  }}
                  className={`btn-base min-h-[42px] text-xs ${
                    selection.mode === 'custom_face' ? 'btn-secondary' : 'btn-green'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{selection.mode === 'custom_face' ? 'EQUIPPED' : 'USE CUSTOM FACE'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onOpenCustomFaceEditor();
                }}
                className={`btn-base btn-primary min-h-[42px] text-xs ${
                  customFaceImg ? '' : 'col-span-2'
                }`}
              >
                <Camera className="h-4 w-4" />
                <span>{customFaceImg ? 'EDIT PHOTO' : 'CREATE CUSTOM FACE'}</span>
              </button>
            </div>

            {/* Compatible Skin Selector for Custom Face */}
            <div className="mt-3 w-full border-t-2 border-[#24415C]/10 pt-2.5 text-left">
              <div className="flex items-center gap-1 text-[10px] font-black text-[#24415C] uppercase">
                <Sparkles className="h-3 w-3 text-[#F59E0B]" />
                <span>SKIN FOR CUSTOM FACE</span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {SKIN_REGISTRY.map((skin) => {
                  const unlocked = characterSkinManager.isUnlocked(skin.id);
                  const active = selectedSkinId === skin.id;
                  return (
                    <button
                      key={skin.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => {
                        if (!unlocked) return;
                        audioManager.playCharacterSelect();
                        onSelectSkin(skin.id);
                      }}
                      className={`flex items-center justify-center gap-1 rounded-xl border-2 px-1.5 py-1.5 text-[9px] font-black ${
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
                      <span className="truncate">{skin.name}</span>
                      {!unlocked && <Lock className="h-2.5 w-2.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="game-panel space-y-2 p-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-black text-[#24415C]/70 uppercase">
                  <SlidersHorizontal className="h-3 w-3" />
                  <span>FILTERS</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onOpenSelectScreen(selection.characterId);
                  }}
                  className="text-[10px] font-black text-[#3998F7] underline"
                >
                  SELECT VIEW &rarr;
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1">
                {(['ALL', 'UNLOCKED', 'LOCKED', 'FAVORITES'] as StatusFilter[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      audioManager.playButton();
                      setStatusFilter(st);
                    }}
                    className={`min-h-[28px] rounded-xl border text-[9px] font-black ${
                      statusFilter === st
                        ? 'border-[#24415C] bg-[#3998F7] text-white'
                        : 'border-[#24415C]/15 bg-[#EEF7FF] text-[#24415C]'
                    }`}
                  >
                    {st === 'FAVORITES' ? `★ ${favorites.length}` : st}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    setRarityFilter('ALL');
                  }}
                  className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-black ${
                    rarityFilter === 'ALL'
                      ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                      : 'border-[#24415C]/15 bg-white text-[#24415C]/70'
                  }`}
                >
                  ALL RARITY
                </button>
                {RARITY_ORDER.map((rKey) => {
                  const rMeta = RARITY_META[rKey];
                  const active = rarityFilter === rKey;
                  return (
                    <button
                      key={rKey}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setRarityFilter(rKey);
                      }}
                      className={`shrink-0 rounded-lg border px-2 py-0.5 text-[9px] font-black ${
                        active
                          ? 'border-[#24415C] ring-1 ring-[#24415C]'
                          : 'border-[#24415C]/20 opacity-80'
                      } ${rMeta.badgeBg} ${rMeta.badgeText}`}
                    >
                      {rMeta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Character Cards Grid */}
            {filteredCharacters.length === 0 ? (
              <div className="game-panel p-5 text-center text-xs font-bold text-[#24415C]/70">
                Tidak ada karakter pada filter ini.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {filteredCharacters.map((char) => {
                  const progress = characterUnlockManager.getProgressForCharacter(char, metrics);
                  const rMeta = RARITY_META[char.rarity];
                  const isEquipped =
                    selection.mode === 'character' && selection.characterId === char.id;
                  const isFav = favorites.includes(char.id);

                  return (
                    <div
                      key={char.id}
                      onClick={() => {
                        audioManager.playButton();
                        onOpenProfile(char);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenProfile(char);
                        }
                      }}
                      className={`relative flex cursor-pointer flex-col items-center rounded-2xl border-2 bg-gradient-to-b p-2 text-center shadow-[0_3px_0_rgba(36,65,92,0.18)] transition-transform active:scale-95 ${rMeta.cardBg}`}
                      style={{ borderColor: rMeta.borderColor }}
                    >
                      {/* Top-left: Equipped or Rarity dot */}
                      {isEquipped ? (
                        <span className="absolute top-1.5 left-1.5 rounded bg-[#32B85C] px-1 py-0.5 text-[8px] font-black text-white">
                          ACTIVE
                        </span>
                      ) : (
                        <span
                          className={`absolute top-1.5 left-1.5 rounded px-1 py-0.5 text-[7px] font-black ${rMeta.badgeBg} ${rMeta.badgeText}`}
                        >
                          {rMeta.label.slice(0, 4)}
                        </span>
                      )}

                      {/* Top-right: Favorite toggle */}
                      <button
                        type="button"
                        aria-label={`Favorite ${char.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          audioManager.playButton();
                          onToggleFavorite(char.id);
                        }}
                        className="absolute top-1 right-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/85 shadow-sm"
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${
                            isFav ? 'fill-[#FFD84D] text-[#24415C]' : 'text-slate-400'
                          }`}
                        />
                      </button>

                      <div className="mt-3">
                        <CharacterShowcaseCanvas
                          characterId={char.id}
                          skinId={isEquipped ? selectedSkinId : 'default'}
                          lockedSilhouette={!progress.unlocked}
                          rarity={char.rarity}
                          size={60}
                          animate={false}
                        />
                      </div>

                      <div className="mt-1 line-clamp-1 text-[10px] font-black text-[#24415C]">
                        {char.name}
                      </div>

                      {progress.unlocked ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            audioManager.playCharacterSelect();
                            onSelectGameCharacter(char.id);
                          }}
                          className={`mt-1 w-full rounded-lg border border-[#24415C] py-0.5 text-[9px] font-black ${
                            isEquipped
                              ? 'bg-[#32B85C] text-white'
                              : 'bg-white text-[#24415C]'
                          }`}
                        >
                          {isEquipped ? 'EQUIPPED' : 'SELECT'}
                        </button>
                      ) : (
                        <div className="mt-1 w-full">
                          <div className="flex items-center justify-center gap-0.5 text-[8px] font-black text-slate-600">
                            <Lock className="h-2.5 w-2.5" />
                            <span>{progress.percent}%</span>
                          </div>
                          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-white/90">
                            <div
                              className="h-full rounded-full bg-[#3998F7]"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
