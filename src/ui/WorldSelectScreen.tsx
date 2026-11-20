import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Compass,
  Lock,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CharacterMetrics } from '../game/character/CharacterUnlockManager';
import {
  getWorldById,
  WEATHER_LABELS,
  WeatherType,
  WORLD_REGISTRY,
  WorldId,
} from '../game/worlds/WorldRegistry';
import { worldUnlockManager } from '../game/worlds/WorldUnlockManager';
import { WorldPreview } from './WorldPreview';

interface WorldSelectScreenProps {
  selectedWorldId: WorldId;
  focusWorldId?: WorldId | null;
  weatherEnabled: boolean;
  dynamicSkyEnabled: boolean;
  metrics: CharacterMetrics;
  onSelectWorld: (worldId: WorldId) => void;
  onSelectWeather: (worldId: WorldId, weather: WeatherType | 'auto') => void;
  onPlayNow: () => void;
  onOpenCollection: () => void;
  onOpenEnvSettings: () => void;
  onBack: () => void;
}

export const WorldSelectScreen: React.FC<WorldSelectScreenProps> = ({
  selectedWorldId,
  focusWorldId,
  weatherEnabled,
  dynamicSkyEnabled,
  metrics,
  onSelectWorld,
  onSelectWeather,
  onPlayNow,
  onOpenCollection,
  onOpenEnvSettings,
  onBack,
}) => {
  const [viewedId, setViewedId] = useState<WorldId>(focusWorldId ?? selectedWorldId);

  useEffect(() => {
    if (focusWorldId) {
      setViewedId(focusWorldId);
    }
  }, [focusWorldId]);

  const currentIdx = Math.max(
    0,
    WORLD_REGISTRY.findIndex((w) => w.id === viewedId)
  );
  const world = getWorldById(viewedId);
  const isUnlocked = worldUnlockManager.isUnlocked(world.id);
  const isSelected = selectedWorldId === world.id;
  const progress = worldUnlockManager.getProgressForWorld(world, metrics);
  const summary = worldUnlockManager.getCollectionSummary();

  const weatherChoice = worldUnlockManager.getWeatherChoice(world.id);
  const previewWeather = worldUnlockManager.getEffectiveWeather(world.id, weatherEnabled);

  const stepWorld = (delta: number) => {
    audioManager.playButton();
    const nextIdx = (currentIdx + delta + WORLD_REGISTRY.length) % WORLD_REGISTRY.length;
    setViewedId(WORLD_REGISTRY[nextIdx].id);
  };

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

        <div className="text-center">
          <h2 className="font-display text-stroke-dark text-lg leading-tight font-bold tracking-wide text-white">
            WORLD SELECT
          </h2>
        </div>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onOpenCollection();
          }}
          className="btn-base btn-secondary min-h-[38px] px-2.5 py-1 text-[11px]"
        >
          <Compass className="h-3.5 w-3.5 text-[#3998F7]" />
          <span>
            {summary.unlockedCount}/{summary.totalCount}
          </span>
        </button>
      </div>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-[360px] flex-1 flex-col gap-2 overflow-y-auto py-1">
        {/* Live World Preview & Info Card */}
        <div className="anim-panel-pop game-panel p-3">
          <div className="relative">
            <WorldPreview
              worldId={world.id}
              weather={previewWeather}
              dynamicSky={dynamicSkyEnabled}
              locked={!isUnlocked}
              animate={true}
              className="h-36 w-full"
            />

            <button
              type="button"
              aria-label="Previous World"
              onClick={() => stepWorld(-1)}
              className="btn-base btn-secondary absolute top-1/2 left-1.5 -translate-y-1/2 rounded-full p-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Next World"
              onClick={() => stepWorld(1)}
              className="btn-base btn-secondary absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full p-1.5"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span
              className={`absolute top-2 left-2 rounded-full border border-[#24415C] px-2 py-0.5 text-[9px] font-black tracking-wider uppercase ${world.badgeBg} ${world.badgeText}`}
            >
              {world.rarity}
            </span>
          </div>

          {/* World Name & Description */}
          <div className="mt-2.5 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-lg leading-tight font-bold text-[#24415C]">
                {world.name}
              </h3>
              <p className="text-[11px] font-extrabold text-[#3998F7]">{world.subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Environment Settings"
              onClick={() => {
                audioManager.playButton();
                onOpenEnvSettings();
              }}
              className="btn-base btn-secondary min-h-[32px] px-2 py-1 text-[10px]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>ENV</span>
            </button>
          </div>

          <p className="mt-1 text-xs font-bold text-[#24415C]/80">{world.description}</p>

          {/* Locked Requirement & Progress Bar OR Weather Selector */}
          {!isUnlocked ? (
            <div className="mt-2.5 rounded-xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-2.5">
              <div className="flex items-center justify-between text-[11px] font-black text-[#24415C]">
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-[#F59E0B]" />
                  <span>{world.unlockCondition.label}</span>
                </span>
                <span className="tabular-nums text-[#3998F7]">
                  {progress.current}/{progress.target}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C]/25 bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3998F7] to-[#61D66B] transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-2.5 rounded-xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-black tracking-wider text-[#24415C]/75 uppercase">
                  <CloudSun className="h-3.5 w-3.5 text-[#3998F7]" />
                  <span>WEATHER THEME</span>
                </span>
                {!weatherEnabled && (
                  <span className="text-[9px] font-black text-amber-600 uppercase">
                    OFF IN SETTINGS
                  </span>
                )}
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onSelectWeather(world.id, 'auto');
                  }}
                  className={`rounded-lg border px-2 py-1 text-[10px] font-black transition-all ${
                    weatherChoice === 'auto'
                      ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C]'
                      : 'border-[#24415C]/20 bg-white text-[#24415C]/70'
                  }`}
                >
                  AUTO
                </button>
                {world.compatibleWeathers.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      audioManager.playButton();
                      onSelectWeather(world.id, w);
                    }}
                    className={`rounded-lg border px-2 py-1 text-[10px] font-black transition-all ${
                      weatherChoice === w
                        ? 'border-[#24415C] bg-[#3998F7] text-white'
                        : 'border-[#24415C]/20 bg-white text-[#24415C]/70'
                    }`}
                  >
                    {WEATHER_LABELS[w].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Primary Actions */}
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            {isUnlocked ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playCharacterSelect();
                    onSelectWorld(world.id);
                  }}
                  className={`btn-base min-h-[42px] text-xs ${
                    isSelected ? 'btn-green' : 'btn-primary'
                  }`}
                >
                  {isSelected && <Check className="h-4 w-4" />}
                  <span>{isSelected ? 'SELECTED' : 'SELECT WORLD'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onSelectWorld(world.id);
                    onPlayNow();
                  }}
                  className="btn-base btn-blue min-h-[42px] text-xs"
                >
                  <Play className="h-4 w-4 fill-white text-white" />
                  <span>PLAY WORLD</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled
                className="btn-base col-span-2 min-h-[42px] cursor-not-allowed border-2 border-[#24415C]/30 bg-slate-200 text-xs font-black text-slate-500"
              >
                <Lock className="h-4 w-4" />
                <span>LOCKED · {world.unlockCondition.label.toUpperCase()}</span>
              </button>
            )}
          </div>
        </div>

        {/* World Selector Strip (All 8 Biomes) */}
        <div className="game-panel p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
            <span>ALL WORLDS ({summary.unlockedCount}/8)</span>
            <span>TAP TO PREVIEW</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {WORLD_REGISTRY.map((w) => {
              const unlocked = worldUnlockManager.isUnlocked(w.id);
              const active = viewedId === w.id;
              const equipped = selectedWorldId === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    setViewedId(w.id);
                  }}
                  className={`relative flex flex-col items-center rounded-xl border-2 p-1 transition-all ${
                    active
                      ? 'border-[#3998F7] bg-[#EEF7FF] shadow-[0_2px_0_#3998F7]'
                      : 'border-[#24415C]/20 bg-white hover:border-[#24415C]/50'
                  }`}
                >
                  <WorldPreview
                    worldId={w.id}
                    weather={null}
                    showSamplePipe={false}
                    locked={!unlocked}
                    animate={false}
                    className="h-10 w-full rounded-lg border"
                  />
                  <span className="mt-1 line-clamp-1 text-[8px] font-black text-[#24415C] uppercase">
                    {w.name.split(' ')[0]}
                  </span>
                  {equipped && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#24415C] bg-[#61D66B] text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
