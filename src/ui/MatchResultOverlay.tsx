import React from 'react';
import { Crown, Flame, Home, RotateCcw, Trophy, Users } from 'lucide-react';
import { AchievementRecord } from '../game/achievements/AchievementTypes';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { SkinId } from '../game/character/CharacterSkinManager';
import { pickMatchOutcomeReaction } from '../game/GameOverReaction';
import { MATCH_FORMAT_CONFIG, TwoPlayerMatchData } from '../game/TwoPlayerMatch';
import { AchievementShowcaseStrip } from './AchievementShowcaseStrip';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface MatchResultOverlayProps {
  match: TwoPlayerMatchData;
  player1FaceImg: HTMLImageElement | null;
  player2FaceImg: HTMLImageElement | null;
  player1CharacterId?: string;
  player1SkinId?: SkinId;
  player2CharacterId?: string;
  player2SkinId?: SkinId;
  player1Level?: number;
  player1Title?: string;
  player2Level?: number;
  player2Title?: string;
  winnerWinStreak?: number;
  showcaseRecords?: AchievementRecord[];
  onRematch: () => void;
  onChangePlayer: () => void;
  onMainMenu: () => void;
}

export const MatchResultOverlay: React.FC<MatchResultOverlayProps> = ({
  match,
  player1FaceImg,
  player2FaceImg,
  player1CharacterId = 'classic_bird',
  player1SkinId = 'default',
  player2CharacterId = 'chicky',
  player2SkinId = 'default',
  player1Level = 1,
  player1Title = 'Newbie Flyer',
  player2Level = 1,
  player2Title = 'Newbie Flyer',
  winnerWinStreak = 0,
  showcaseRecords = [],
  onRematch,
  onChangePlayer,
  onMainMenu,
}) => {
  const p1Char = getCharacterById(player1CharacterId);
  const p2Char = getCharacterById(player2CharacterId);
  const isTournament = match.format !== 'quick';
  const formatMeta = MATCH_FORMAT_CONFIG[match.format];
  const p1DisplayValue = isTournament ? match.player1Wins : (match.player1Score ?? 0);
  const p2DisplayValue = isTournament ? match.player2Wins : (match.player2Score ?? 0);

  const winner = match.winner ?? 'draw';
  const isP1Win = winner === 'player1';
  const isP2Win = winner === 'player2';
  const isDraw = winner === 'draw';
  const winnerName = isP1Win ? match.player1Name : match.player2Name;
  const loserName = isP1Win ? match.player2Name : match.player1Name;

  const outcomeReactions = pickMatchOutcomeReaction(
    match.player1TotalScore,
    match.player2TotalScore,
    match.rounds.length
  );

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="anim-fade-in absolute inset-0 z-30 flex items-center justify-center bg-[#24415C]/45 p-3.5 backdrop-blur-[2px]"
    >
      <div className="anim-panel-pop game-panel max-h-full w-full max-w-[342px] overflow-y-auto p-4 text-center sm:p-5">
        <div className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-3 py-0.5 text-[11px] font-black tracking-wider text-[#24415C] uppercase shadow-[0_2px_0_#24415C]">
          <Trophy className="h-3.5 w-3.5" />
          <span>{isTournament ? `CHAMPION · ${formatMeta.label}` : 'MATCH RESULT'}</span>
        </div>

        {/* Verdict Headline */}
        <div className="mt-2">
          {isDraw ? (
            <h2 className="font-display text-stroke-dark text-2xl leading-tight font-bold tracking-wide text-[#FFD84D]">
              DRAW! KALIAN SAMA-SAMA JAGO!
            </h2>
          ) : (
            <>
              <div className="inline-flex items-center gap-1 text-xs font-black tracking-wider text-[#F59E0B] uppercase">
                <Crown className="h-4 w-4 fill-[#FFD84D] text-[#24415C]" />
                <span>{isTournament ? 'TOURNAMENT CHAMPION' : 'WINNER'}</span>
              </div>
              <h2 className="font-display text-stroke-dark text-2xl leading-tight font-bold tracking-wide text-[#FFD84D] sm:text-3xl">
                {winnerName} {isTournament ? 'JUARA!' : 'MENANG!'}
              </h2>
              {winnerWinStreak >= 2 && (
                <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#24415C] bg-[#FF6B6B] px-2.5 py-0.5 text-[10px] font-black text-white shadow-[0_2px_0_#24415C]">
                  <Flame className="h-3 w-3" />
                  <span>{winnerWinStreak} WIN STREAK!</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Winner / Loser / Draw Reaction Box */}
        <div className="mt-2 rounded-2xl bg-[#F2F9FF] px-3 py-2 text-[11px] leading-snug font-extrabold text-[#24415C]/85">
          {isDraw ? (
            <p>&ldquo;{outcomeReactions.drawLine}&rdquo;</p>
          ) : (
            <div className="space-y-1">
              <p>
                <span className="font-black text-[#32B85C]">{winnerName}:</span> &ldquo;
                {outcomeReactions.winnerLine}&rdquo;
              </p>
              <p className="text-[#24415C]/65">
                <span className="font-black text-[#FF6B6B]">{loserName}:</span> &ldquo;
                {outcomeReactions.loserLine}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Competitive VS Scoreboard */}
        <div className="relative mt-2.5 grid grid-cols-2 gap-2.5">
          <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <span className="font-display inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#24415C] bg-[#FFD84D] text-xs font-bold text-[#24415C] shadow-[0_2px_0_#24415C]">
              VS
            </span>
          </div>

          {/* Player 1 Card */}
          <div
            className={`relative flex flex-col items-center rounded-2xl border-2 p-2 transition-transform ${
              isP1Win
                ? 'border-[#F59E0B] bg-gradient-to-b from-[#FFF9DB] to-[#E8F6FF] shadow-[0_0_16px_rgba(255,216,77,0.55)]'
                : isP2Win
                  ? 'border-[#24415C]/20 bg-slate-50 opacity-85'
                  : 'border-[#3998F7] bg-[#E8F6FF]'
            }`}
          >
            {isP1Win && (
              <Crown className="anim-float absolute -top-3 right-2 h-6 w-6 fill-[#FFD84D] text-[#24415C]" />
            )}
            <span className="rounded-lg border border-[#24415C] bg-[#3998F7] px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
              PLAYER 1
            </span>
            <div className="mt-1 max-w-full truncate text-xs font-black text-[#24415C]">
              {match.player1Name}
            </div>
            <div className="mt-0.5 max-w-full truncate rounded-full border border-[#24415C]/20 bg-white/90 px-2 py-0.5 text-[9px] font-black text-[#24415C]/80 tabular-nums">
              Lv.{player1Level} · {player1Title}
            </div>
            <div className="my-0.5">
              <CharacterShowcaseCanvas
                customFaceImg={player1FaceImg}
                characterId={player1CharacterId}
                skinId={player1SkinId}
                rarity={player1FaceImg ? undefined : p1Char.rarity}
                size={56}
              />
            </div>
            <div className="font-display text-3xl leading-none font-bold tabular-nums text-[#3998F7]">
              {p1DisplayValue}
            </div>
            <div className="mt-0.5 text-[9px] font-black text-[#24415C]/55 uppercase">
              {isTournament ? `WINS · BEST ${match.player1BestRoundScore}` : 'SCORE'}
            </div>
          </div>

          {/* Player 2 Card */}
          <div
            className={`relative flex flex-col items-center rounded-2xl border-2 p-2 transition-transform ${
              isP2Win
                ? 'border-[#F59E0B] bg-gradient-to-b from-[#FFF9DB] to-[#FFF0F0] shadow-[0_0_16px_rgba(255,216,77,0.55)]'
                : isP1Win
                  ? 'border-[#24415C]/20 bg-slate-50 opacity-85'
                  : 'border-[#FF6B6B] bg-[#FFF0F0]'
            }`}
          >
            {isP2Win && (
              <Crown className="anim-float absolute -top-3 right-2 h-6 w-6 fill-[#FFD84D] text-[#24415C]" />
            )}
            <span className="rounded-lg border border-[#24415C] bg-[#FF6B6B] px-2 py-0.5 text-[10px] font-black tracking-wider text-white uppercase">
              PLAYER 2
            </span>
            <div className="mt-1 max-w-full truncate text-xs font-black text-[#24415C]">
              {match.player2Name}
            </div>
            <div className="mt-0.5 max-w-full truncate rounded-full border border-[#24415C]/20 bg-white/90 px-2 py-0.5 text-[9px] font-black text-[#24415C]/80 tabular-nums">
              Lv.{player2Level} · {player2Title}
            </div>
            <div className="my-0.5">
              <CharacterShowcaseCanvas
                customFaceImg={player2FaceImg}
                characterId={player2CharacterId}
                skinId={player2SkinId}
                rarity={player2FaceImg ? undefined : p2Char.rarity}
                size={56}
              />
            </div>
            <div className="font-display text-3xl leading-none font-bold tabular-nums text-[#FF6B6B]">
              {p2DisplayValue}
            </div>
            <div className="mt-0.5 text-[9px] font-black text-[#24415C]/55 uppercase">
              {isTournament ? `WINS · BEST ${match.player2BestRoundScore}` : 'SCORE'}
            </div>
          </div>
        </div>

        {/* Round-by-round breakdown in tournament mode */}
        {isTournament && match.rounds.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
            {match.rounds.map((r) => (
              <span
                key={r.roundNumber}
                className="rounded-lg border border-[#24415C]/20 bg-[#EEF7FF] px-2 py-0.5 text-[10px] font-black tabular-nums text-[#24415C]"
              >
                R{r.roundNumber}: {r.player1Score}-{r.player2Score}
              </span>
            ))}
          </div>
        )}

        {showcaseRecords.length > 0 && (
          <AchievementShowcaseStrip
            records={showcaseRecords}
            compact={true}
            className="mt-2"
          />
        )}

        {/* Actions: REMATCH / CHANGE PLAYER / MAIN MENU */}
        <div className="mt-3.5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              audioManager.playButton();
              onRematch();
            }}
            className="btn-base btn-green min-h-[48px] w-full text-base tracking-wide"
          >
            <RotateCcw className="h-5 w-5" />
            <span>REMATCH</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onChangePlayer();
              }}
              className="btn-base btn-secondary min-h-[40px] px-2 text-xs"
            >
              <Users className="h-4 w-4 shrink-0 text-[#3998F7]" />
              <span className="truncate">CHANGE PLAYER</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                onMainMenu();
              }}
              className="btn-base btn-secondary min-h-[40px] px-2 text-xs"
            >
              <Home className="h-4 w-4 shrink-0 text-[#3998F7]" />
              <span>MAIN MENU</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
