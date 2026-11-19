import React from 'react';
import { ArrowRight, Swords } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { MATCH_FORMAT_CONFIG, TwoPlayerMatchData } from '../game/TwoPlayerMatch';

interface RoundResultOverlayProps {
  match: TwoPlayerMatchData;
  onNextRound: () => void;
}

export const RoundResultOverlay: React.FC<RoundResultOverlayProps> = ({
  match,
  onNextRound,
}) => {
  const latestRound = match.rounds[match.rounds.length - 1];
  const p1Score = latestRound?.player1Score ?? match.player1Score ?? 0;
  const p2Score = latestRound?.player2Score ?? match.player2Score ?? 0;
  const roundWinner = latestRound?.winner ?? match.lastRoundWinner ?? 'draw';
  const formatMeta = MATCH_FORMAT_CONFIG[match.format];

  const isP1Win = roundWinner === 'player1';
  const isP2Win = roundWinner === 'player2';
  const isDraw = roundWinner === 'draw';

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/45 p-5 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel w-full max-w-[324px] p-5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#24415C] bg-[#3998F7] px-3 py-0.5 text-[11px] font-black tracking-wider text-white uppercase shadow-[0_2px_0_#24415C]">
          <Swords className="h-3.5 w-3.5" />
          <span>
            {formatMeta.label} · ROUND {match.currentRound}/{match.maxRounds}
          </span>
        </div>

        <h2 className="font-display text-stroke-dark mt-2.5 text-2xl leading-tight font-bold tracking-wide text-[#FFD84D]">
          {isDraw
            ? 'RONDE SERI! TIDAK ADA POIN!'
            : `${isP1Win ? match.player1Name : match.player2Name} MENANG RONDE ${match.currentRound}!`}
        </h2>

        {/* Round Score Breakdown */}
        <div className="relative mt-3 grid grid-cols-2 gap-2.5">
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="font-display inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#24415C] bg-[#FFD84D] text-[10px] font-bold text-[#24415C] shadow-[0_2px_0_#24415C]">
              VS
            </span>
          </div>

          <div
            className={`rounded-2xl border-2 p-2.5 ${
              isP1Win
                ? 'border-[#F59E0B] bg-[#FFF9DB]'
                : 'border-[#3998F7]/40 bg-[#EEF7FF]'
            }`}
          >
            <div className="truncate text-[10px] font-black text-[#3998F7] uppercase">
              {match.player1Name}
            </div>
            <div className="font-display mt-0.5 text-3xl font-bold tabular-nums text-[#24415C]">
              {p1Score}
            </div>
          </div>

          <div
            className={`rounded-2xl border-2 p-2.5 ${
              isP2Win
                ? 'border-[#F59E0B] bg-[#FFF9DB]'
                : 'border-[#FF6B6B]/40 bg-[#FFF2F2]'
            }`}
          >
            <div className="truncate text-[10px] font-black text-[#FF6B6B] uppercase">
              {match.player2Name}
            </div>
            <div className="font-display mt-0.5 text-3xl font-bold tabular-nums text-[#24415C]">
              {p2Score}
            </div>
          </div>
        </div>

        {/* Tournament Standings */}
        <div className="mt-3 rounded-2xl border-2 border-[#24415C]/15 bg-[#F2F9FF] px-3 py-2.5">
          <div className="text-[10px] font-black tracking-wider text-[#24415C]/60 uppercase">
            SKOR TURNAMEN (TARGET {match.targetWins} MENANG)
          </div>
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="truncate text-xs font-black text-[#3998F7]">
              {match.player1Name}
            </span>
            <span className="font-display rounded-xl border-2 border-[#24415C] bg-white px-3 py-0.5 text-xl font-bold tabular-nums text-[#24415C]">
              {match.player1Wins} - {match.player2Wins}
            </span>
            <span className="truncate text-xs font-black text-[#FF6B6B]">
              {match.player2Name}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onNextRound();
          }}
          className="btn-base btn-green mt-4 min-h-[52px] w-full text-lg tracking-wide"
        >
          <span>NEXT ROUND ({match.currentRound + 1})</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
