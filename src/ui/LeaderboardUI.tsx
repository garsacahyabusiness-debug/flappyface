import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Crown,
  Flame,
  History,
  Minus,
  Swords,
  Trophy,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import {
  LeaderboardPlayerEntry,
  MatchHistoryEntry,
} from '../game/progression/LeaderboardManager';
import { MATCH_FORMAT_CONFIG } from '../game/TwoPlayerMatch';

interface LeaderboardUIProps {
  players: LeaderboardPlayerEntry[];
  history: MatchHistoryEntry[];
  singlePlayerBest: number;
  onOpenCompetitiveHub?: () => void;
  onBack: () => void;
}

type LeaderboardTab = 'ranking' | 'history';

function formatMatchDate(ts: number): string {
  if (!ts) return 'Baru saja';
  try {
    return new Date(ts).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Selesai';
  }
}

export const LeaderboardUI: React.FC<LeaderboardUIProps> = ({
  players,
  history,
  singlePlayerBest,
  onOpenCompetitiveHub,
  onBack,
}) => {
  const [tab, setTab] = useState<LeaderboardTab>('ranking');

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-4 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[44px] px-3.5 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <h2 className="font-display text-stroke-dark text-xl font-bold tracking-wide text-white sm:text-2xl">
          LEADERBOARD
        </h2>

        <div className="w-[74px]" aria-hidden="true" />
      </div>

      {/* Content Panel */}
      <div className="mx-auto mt-1 flex w-full max-w-[356px] flex-1 flex-col overflow-hidden pb-3">
        <div className="anim-panel-pop game-panel flex flex-1 flex-col overflow-hidden p-3.5">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-1">
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                setTab('ranking');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all ${
                tab === 'ranking'
                  ? 'border-2 border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                  : 'border-2 border-transparent text-[#24415C]/65'
              }`}
            >
              <Crown className="h-3.5 w-3.5" />
              <span>TOP PLAYERS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                setTab('history');
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all ${
                tab === 'history'
                  ? 'border-2 border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                  : 'border-2 border-transparent text-[#24415C]/65'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>MATCH HISTORY</span>
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
            {tab === 'ranking' ? (
              <>
                {/* Single Player High Score Highlight */}
                <div className="flex items-center justify-between rounded-2xl border-2 border-[#24415C] bg-gradient-to-r from-[#FFF6CE] to-[#FFD84D] px-3.5 py-2.5 shadow-[0_3px_0_#24415C]">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="h-5 w-5 text-[#24415C]" />
                    <div>
                      <div className="text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
                        SINGLE PLAYER RECORD
                      </div>
                      <div className="text-xs font-black text-[#24415C]">
                        SOLO HIGH SCORE
                      </div>
                    </div>
                  </div>
                  <div className="font-display text-2xl font-bold tabular-nums text-[#24415C]">
                    {singlePlayerBest}
                  </div>
                </div>

                {onOpenCompetitiveHub && (
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playButton();
                      onOpenCompetitiveHub();
                    }}
                    className="flex min-h-[42px] w-full items-center justify-between rounded-2xl border-2 border-[#24415C] bg-[#EEF7FF] px-3.5 py-2 text-xs font-black text-[#24415C] shadow-[0_2px_0_#24415C]"
                  >
                    <span className="flex items-center gap-2">
                      <Swords className="h-4 w-4 text-[#3998F7]" />
                      <span>COMPETITIVE HUB · RANKING &amp; CHALLENGES</span>
                    </span>
                    <span className="rounded-lg bg-[#FFD84D] px-2 py-0.5 text-[10px]">OPEN</span>
                  </button>
                )}

                {players.length === 0 ? (
                  <div className="rounded-2xl bg-[#EEF7FF] px-4 py-8 text-center">
                    <Swords className="mx-auto h-8 w-8 text-[#3998F7]" />
                    <p className="mt-2 text-xs font-black text-[#24415C]">
                      Belum ada skor duel 2 Player!
                    </p>
                    <p className="mt-1 text-[11px] font-bold text-[#24415C]/65">
                      Mainkan mode 2 Player atau Tournament untuk mencatat kemenangan dan Win Streak.
                    </p>
                  </div>
                ) : (
                  players.map((player, idx) => {
                    const delta = player.rankDelta ?? null;
                    const isNew = Boolean(player.isNewRank);
                    return (
                      <div
                        key={player.name}
                        className="flex items-center justify-between rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] px-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={`font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C] text-xs font-bold ${
                              idx === 0
                                ? 'bg-[#FFD84D] text-[#24415C]'
                                : idx === 1
                                  ? 'bg-slate-200 text-[#24415C]'
                                  : idx === 2
                                    ? 'bg-amber-200 text-[#24415C]'
                                    : 'bg-white text-[#24415C]/70'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-black text-[#24415C]">
                                {player.name}
                              </span>
                              {player.currentWinStreak >= 2 && (
                                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-[#FF6B6B] px-1.5 py-0.5 text-[9px] font-black text-white">
                                  <Flame className="h-2.5 w-2.5" />
                                  {player.currentWinStreak}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-[#24415C]/65">
                              {player.wins}W - {player.losses}L - {player.draws}D · Best:{' '}
                              {player.bestScore}
                              {player.bestWinStreak > 0 && ` · Max Streak: ${player.bestWinStreak}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2 pl-2">
                          {isNew ? (
                            <span
                              title="New on leaderboard since last session"
                              aria-label="New on leaderboard since last session"
                              className="inline-flex items-center rounded-lg border border-sky-300 bg-sky-100 px-1.5 py-0.5 text-[9px] font-black tracking-wide text-sky-700 uppercase"
                            >
                              NEW
                            </span>
                          ) : delta !== null && delta > 0 ? (
                            <span
                              title={`Climbed ${delta} rank${delta > 1 ? 's' : ''} since last session`}
                              aria-label={`Climbed ${delta} rank${delta > 1 ? 's' : ''} since last session`}
                              className="inline-flex items-center gap-0.5 rounded-lg border border-emerald-300 bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-emerald-700"
                            >
                              <ArrowUp className="h-3 w-3 stroke-[2.75]" />
                              <span>{delta}</span>
                            </span>
                          ) : delta !== null && delta < 0 ? (
                            <span
                              title={`Dropped ${Math.abs(delta)} rank${Math.abs(delta) > 1 ? 's' : ''} since last session`}
                              aria-label={`Dropped ${Math.abs(delta)} rank${Math.abs(delta) > 1 ? 's' : ''} since last session`}
                              className="inline-flex items-center gap-0.5 rounded-lg border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-rose-700"
                            >
                              <ArrowDown className="h-3 w-3 stroke-[2.75]" />
                              <span>{Math.abs(delta)}</span>
                            </span>
                          ) : (
                            <span
                              title="Rank unchanged since last session"
                              aria-label="Rank unchanged since last session"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-300/80 bg-white/80 px-1.5 py-0.5 text-[10px] font-black text-slate-400"
                            >
                              <Minus className="h-3 w-3" />
                            </span>
                          )}

                          <div className="text-right">
                            <div className="font-display text-lg leading-none font-bold tabular-nums text-[#3998F7]">
                              {player.wins}
                            </div>
                            <div className="text-[9px] font-black text-[#24415C]/55 uppercase">
                              WINS
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            ) : history.length === 0 ? (
              <div className="rounded-2xl bg-[#EEF7FF] px-4 py-8 text-center">
                <History className="mx-auto h-8 w-8 text-[#3998F7]" />
                <p className="mt-2 text-xs font-black text-[#24415C]">
                  Match History masih kosong
                </p>
                <p className="mt-1 text-[11px] font-bold text-[#24415C]/65">
                  Semua pertandingan Quick Match, Best of 3, dan Best of 5 akan tercatat di sini.
                </p>
              </div>
            ) : (
              history.map((item) => {
                const formatMeta = MATCH_FORMAT_CONFIG[item.format];
                const isDraw = item.winner === 'draw';
                const winnerName =
                  item.winner === 'player1' ? item.player1Name : item.player2Name;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-3"
                  >
                    <div className="flex items-center justify-between text-[10px] font-black">
                      <span className="rounded-lg border border-[#24415C]/25 bg-white px-2 py-0.5 text-[#3998F7] uppercase">
                        {formatMeta.label}
                      </span>
                      <span className="text-[#24415C]/55">
                        {formatMatchDate(item.playedAt)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-xs font-black text-[#24415C]">
                      <span className="min-w-0 flex-1 truncate text-[#3998F7]">
                        {item.player1Name}
                      </span>
                      <span className="font-display shrink-0 rounded-xl border border-[#24415C]/25 bg-white px-2.5 py-0.5 text-sm font-bold tabular-nums">
                        {item.format === 'quick'
                          ? `${item.player1BestScore} - ${item.player2BestScore}`
                          : `${item.player1Wins} - ${item.player2Wins}`}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-right text-[#FF6B6B]">
                        {item.player2Name}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-[#24415C]/70">
                      <span>
                        {isDraw ? 'Hasil: SERI' : `Juara: ${winnerName}`}
                      </span>
                      <span>
                        Best: {item.player1BestScore} vs {item.player2BestScore}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
