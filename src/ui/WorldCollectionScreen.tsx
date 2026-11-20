import React, { useState } from 'react';
import { ArrowLeft, Check, Compass, Crown, Lock, Sparkles } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CharacterMetrics } from '../game/character/CharacterUnlockManager';
import { WORLD_REGISTRY, WorldId } from '../game/worlds/WorldRegistry';
import { worldUnlockManager } from '../game/worlds/WorldUnlockManager';
import { WorldPreview } from './WorldPreview';

interface WorldCollectionScreenProps {
  selectedWorldId: WorldId;
  metrics: CharacterMetrics;
  onInspectWorld: (worldId: WorldId) => void;
  onBack: () => void;
}

type WorldFilter = 'ALL' | 'UNLOCKED' | 'LOCKED';

export const WorldCollectionScreen: React.FC<WorldCollectionScreenProps> = ({
  selectedWorldId,
  metrics,
  onInspectWorld,
  onBack,
}) => {
  const [filter, setFilter] = useState<WorldFilter>('ALL');
  const summary = worldUnlockManager.getCollectionSummary();

  const filteredWorlds = WORLD_REGISTRY.filter((w) => {
    const unlocked = worldUnlockManager.isUnlocked(w.id);
    if (filter === 'UNLOCKED') return unlocked;
    if (filter === 'LOCKED') return !unlocked;
    return true;
  });

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/30 px-3.5 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-1.5">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[38px] px-2.5 py-1 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <h2 className="font-display text-stroke-dark text-lg font-bold tracking-wide text-white">
          WORLD COLLECTION
        </h2>

        <div className="w-[64px]" aria-hidden="true" />
      </div>

      {/* Scrollable Body */}
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col gap-2.5 overflow-y-auto py-1 pb-3">
        {/* Progress & Explorer Badge Summary */}
        <div className="anim-panel-pop game-panel p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#3998F7]" />
              <div>
                <div className="text-[10px] font-black tracking-wider text-[#24415C]/65 uppercase">
                  WORLDS UNLOCKED
                </div>
                <div className="font-display text-lg leading-none font-bold text-[#24415C]">
                  {summary.unlockedCount} / {summary.totalCount}{' '}
                  <span className="text-sm text-[#3998F7]">({summary.percent}%)</span>
                </div>
              </div>
            </div>

            {summary.hasWorldExplorerBadge && (
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-2.5 py-0.5 text-[10px] font-black text-[#24415C]">
                <Crown className="h-3 w-3" />
                <span>WORLD EXPLORER</span>
              </span>
            )}
          </div>

          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/25 bg-[#EEF7FF]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#3998F7] via-[#61D66B] to-[#FFD84D] transition-all duration-300"
              style={{ width: `${summary.percent}%` }}
            />
          </div>

          {/* 2 / 4 / 6 / 8 Milestones */}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            {summary.milestones.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl border px-2 py-1.5 ${
                  m.unlocked
                    ? 'border-[#32B85C] bg-emerald-50 text-emerald-900'
                    : 'border-[#24415C]/15 bg-[#EEF7FF]/70 text-[#24415C]/65'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-black">
                  <span>{m.worldsRequired} WORLDS</span>
                  {m.unlocked ? (
                    <Check className="h-3 w-3 text-[#32B85C]" />
                  ) : (
                    <Lock className="h-2.5 w-2.5 opacity-60" />
                  )}
                </div>
                <div className="mt-0.5 line-clamp-1 text-[10px] font-extrabold">
                  {m.rewardLabel}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="grid grid-cols-3 gap-1.5">
          {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                audioManager.playButton();
                setFilter(tab);
              }}
              className={`rounded-xl border-2 py-1.5 text-[11px] font-black transition-all ${
                filter === tab
                  ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                  : 'border-[#24415C]/25 bg-white/90 text-[#24415C]/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* World Grid */}
        <div className="grid grid-cols-2 gap-2">
          {filteredWorlds.map((w) => {
            const unlocked = worldUnlockManager.isUnlocked(w.id);
            const selected = selectedWorldId === w.id;
            const prog = worldUnlockManager.getProgressForWorld(w, metrics);
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onInspectWorld(w.id);
                }}
                className={`game-panel flex flex-col p-2 text-left transition-transform active:scale-95 ${
                  selected ? 'ring-2 ring-[#3998F7]' : ''
                }`}
              >
                <WorldPreview
                  worldId={w.id}
                  weather={unlocked ? w.defaultWeather : null}
                  showSamplePipe={true}
                  locked={!unlocked}
                  animate={false}
                  className="h-24 w-full"
                />

                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[8px] font-black uppercase ${w.badgeBg} ${w.badgeText}`}
                  >
                    {w.rarity}
                  </span>
                  {selected ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-[#32B85C]">
                      <Check className="h-3 w-3" />
                      ACTIVE
                    </span>
                  ) : unlocked ? (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-[#3998F7]">
                      <Sparkles className="h-2.5 w-2.5" />
                      OPEN
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 line-clamp-1 font-display text-xs font-bold text-[#24415C]">
                  {w.name}
                </div>

                {!unlocked ? (
                  <div className="mt-1">
                    <div className="line-clamp-1 text-[9px] font-extrabold text-[#24415C]/65">
                      {w.unlockCondition.label}
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-[#3998F7]"
                        style={{ width: `${prog.percent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-0.5 line-clamp-2 text-[10px] font-bold text-[#24415C]/70">
                    {w.subtitle}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
