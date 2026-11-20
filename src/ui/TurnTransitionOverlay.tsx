import React from 'react';
import { Play } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import { pickTurnChallengeMessage } from '../game/TwoPlayerMatch';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface TurnTransitionOverlayProps {
  player1Name: string;
  player1Score: number;
  player2Name: string;
  player2FaceImg: HTMLImageElement | null;
  player2CharacterId?: string;
  player2SkinId?: SkinId;
  currentRound: number;
  maxRounds: number;
  player1Wins: number;
  player2Wins: number;
  onStartTurn: () => void;
}

export const TurnTransitionOverlay: React.FC<TurnTransitionOverlayProps> = ({
  player1Name,
  player1Score,
  player2Name,
  player2FaceImg,
  player2CharacterId = 'chicky',
  player2SkinId = 'default',
  currentRound,
  maxRounds,
  player1Wins,
  player2Wins,
  onStartTurn,
}) => {
  const challengeText = pickTurnChallengeMessage(player1Score);
  const p2Char = getCharacterById(player2CharacterId);

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/45 p-5 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel w-full max-w-[318px] p-5 text-center">
        <span className="inline-flex items-center rounded-xl border-2 border-[#24415C] bg-[#FF6B6B] px-3 py-0.5 text-[11px] font-black tracking-wider text-white uppercase shadow-[0_2px_0_#24415C]">
          {maxRounds > 1
            ? `ROUND ${currentRound}/${maxRounds} · PLAYER 2`
            : 'ROUND 1 · PLAYER 2'}
        </span>

        <h2 className="font-display text-stroke-dark mt-2.5 text-3xl leading-tight font-bold tracking-wide text-[#FFD84D]">
          GILIRAN PLAYER 2!
        </h2>

        <div className="mt-1.5 text-lg font-black tracking-wide text-[#24415C]">
          {player2Name}
        </div>

        {/* Player 2 Character Showcase */}
        <div className="mx-auto mt-2 inline-flex flex-col items-center rounded-3xl bg-[#FFF2F2] px-5 py-1">
          <CharacterShowcaseCanvas
            customFaceImg={player2FaceImg}
            characterId={player2CharacterId}
            skinId={player2SkinId}
            rarity={player2FaceImg ? undefined : p2Char.rarity}
            size={92}
          />
        </div>

        <p className="mt-2.5 text-xs font-extrabold text-[#24415C]/85">{challengeText}</p>

        {/* Subtle Target Reference from Player 1 + Tournament Score */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#24415C]/15 bg-[#EEF7FF] px-3 py-1 text-[11px] font-bold text-[#24415C]/75">
            <span>Skor {player1Name}:</span>
            <span className="font-display text-sm font-bold tabular-nums text-[#3998F7]">
              {player1Score}
            </span>
          </div>
          {maxRounds > 1 && (
            <div className="inline-flex items-center gap-1 rounded-xl border border-[#24415C]/15 bg-[#FFF9DB] px-2.5 py-1 text-[11px] font-black text-[#24415C]">
              <span>Wins:</span>
              <span className="tabular-nums">
                {player1Wins} - {player2Wins}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onStartTurn();
          }}
          className="btn-base btn-green mt-4 min-h-[54px] w-full text-xl tracking-wide"
        >
          <Play className="h-6 w-6 fill-white text-white" />
          <span>START TURN</span>
        </button>
      </div>
    </div>
  );
};
