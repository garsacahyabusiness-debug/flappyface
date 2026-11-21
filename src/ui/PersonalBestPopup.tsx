import React from 'react';
import { Award, CheckCircle2, Sparkles, TrendingUp, Trophy } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { PersonalBestBreakEvent } from '../game/competitive/CompetitiveTypes';
import { getWorldById } from '../game/worlds/WorldRegistry';

interface PersonalBestPopupProps {
  event: PersonalBestBreakEvent | null;
  suppressed?: boolean;
  reducedMotion?: boolean;
  onDismiss: () => void;
  onOpenHub?: () => void;
}

function formatRunDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Baru saja';
  }
}

export const PersonalBestPopup: React.FC<PersonalBestPopupProps> = ({
  event,
  suppressed = false,
  reducedMotion = false,
  onDismiss,
  onOpenHub,
}) => {
  if (!event || suppressed) return null;

  const charDef = getCharacterById(event.characterId);
  const worldDef = getWorldById(event.worldId);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="New Personal Best"
    >
      <div
        className={`game-panel w-full max-w-[318px] p-5 text-center ${
          reducedMotion ? '' : 'anim-panel-pop'
        }`}
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-[#24415C] bg-gradient-to-br from-[#FFF3A1] via-[#FFD84D] to-[#F59E0B] shadow-[0_4px_0_#24415C]">
          <Trophy className="h-7 w-7 text-[#24415C]" />
        </div>

        <div className="mt-2.5 inline-flex items-center gap-1 rounded-full border-2 border-[#24415C] bg-[#FFD84D] px-3 py-0.5 text-[10px] font-black tracking-wider text-[#24415C] uppercase shadow-[0_2px_0_#24415C]">
          <Sparkles className="h-3 w-3" />
          <span>PERSONAL RECORD BROKEN</span>
        </div>

        <h2 className="font-display text-stroke-dark mt-2 text-2xl leading-tight font-bold tracking-wide text-[#FFD84D]">
          NEW PERSONAL BEST!
        </h2>

        {/* Previous -> New Comparison */}
        <div className="mt-3 grid grid-cols-3 items-center gap-2 rounded-2xl border-2 border-[#24415C] bg-[#EEF7FF] p-3 shadow-[0_3px_0_#24415C]">
          <div className="text-center">
            <div className="text-[9px] font-black text-[#24415C]/60 uppercase">PREVIOUS</div>
            <div className="font-display text-xl font-bold tabular-nums text-[#24415C]/65">
              {event.previousScore}
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <span className="inline-flex items-center gap-0.5 rounded-lg border border-[#24415C] bg-[#61D66B] px-2 py-0.5 text-[11px] font-black tabular-nums text-[#24415C]">
              <TrendingUp className="h-3 w-3" />+{event.delta}
            </span>
            {event.previousScore > 0 && (
              <span className="mt-0.5 text-[9px] font-black tabular-nums text-emerald-700">
                +{event.improvementPercent}%
              </span>
            )}
          </div>

          <div className="text-center">
            <div className="text-[9px] font-black text-[#3998F7] uppercase">NEW BEST</div>
            <div className="font-display text-2xl font-bold tabular-nums text-[#24415C]">
              {event.newScore}
            </div>
          </div>
        </div>

        {/* Run Summary Metadata */}
        <div className="mt-3 space-y-1.5 rounded-2xl border-2 border-[#24415C]/15 bg-[#F8FBFF] px-3 py-2.5 text-left text-[11px] font-bold text-[#24415C]">
          <div className="flex items-center justify-between">
            <span className="text-[#24415C]/60">Character</span>
            <span className="font-black">{charDef.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#24415C]/60">World</span>
            <span className="font-black">{worldDef.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#24415C]/60">Run Summary</span>
            <span className="font-black tabular-nums">
              {event.pipesPassed} pipes · {event.runDurationSec.toFixed(1)}s
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#24415C]/60">Recorded</span>
            <span className="font-black text-[#3998F7]">{formatRunDate(event.date)}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onDismiss();
            }}
            className="btn-base btn-green min-h-[46px] w-full text-sm"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>AWESOME!</span>
          </button>

          {onOpenHub && (
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onDismiss();
                onOpenHub();
              }}
              className="btn-base btn-secondary min-h-[44px] w-full text-xs"
            >
              <Award className="h-4 w-4 text-[#F59E0B]" />
              <span>VIEW IN COMPETITIVE HUB</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
