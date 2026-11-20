import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { WorldDefinition, WorldId } from '../game/worlds/WorldRegistry';
import { WorldPreview } from './WorldPreview';

interface WorldUnlockPopupProps {
  queue: WorldDefinition[];
  onExploreNow: (worldId: WorldId) => void;
  onLater: () => void;
}

export const WorldUnlockPopup: React.FC<WorldUnlockPopupProps> = ({
  queue,
  onExploreNow,
  onLater,
}) => {
  if (queue.length === 0) return null;
  const world = queue[0];

  return (
    <div className="anim-fade-in absolute inset-0 z-50 flex items-center justify-center bg-[#24415C]/60 p-4 backdrop-blur-sm">
      <div className="anim-panel-pop game-panel w-full max-w-[310px] p-4 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-3 py-1 text-[10px] font-black tracking-wider text-[#24415C] uppercase shadow-[0_2px_0_#24415C]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>NEW WORLD UNLOCKED!</span>
        </div>

        <div className="mt-3">
          <WorldPreview
            worldId={world.id}
            weather={world.defaultWeather}
            animate={true}
            className="h-32 w-full"
          />
        </div>

        <div className="mt-2.5 flex items-center justify-center gap-1.5">
          <span
            className={`rounded-full border border-[#24415C] px-2 py-0.5 text-[9px] font-black uppercase ${world.badgeBg} ${world.badgeText}`}
          >
            {world.rarity}
          </span>
          <h3 className="font-display text-xl font-bold text-[#24415C]">{world.name}</h3>
        </div>

        <p className="mt-1 text-xs font-extrabold text-[#3998F7]">{world.subtitle}</p>
        <p className="mt-1.5 rounded-xl bg-[#EEF7FF] px-3 py-2 text-[11px] font-bold text-[#24415C]/80">
          "{world.unlockQuote}"
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onLater();
            }}
            className="btn-base btn-secondary min-h-[42px] text-xs"
          >
            LATER
          </button>
          <button
            type="button"
            onClick={() => {
              audioManager.playCharacterSelect();
              onExploreNow(world.id);
            }}
            className="btn-base btn-green min-h-[42px] text-xs"
          >
            <Compass className="h-4 w-4" />
            <span>EXPLORE NOW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
