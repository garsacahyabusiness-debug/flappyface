import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Clock,
  Crown,
  Ghost,
  Lock,
  Medal,
  Play,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { getCharacterById } from '../game/character/CharacterRegistry';
import { competitiveManager } from '../game/competitive/CompetitiveManager';
import {
  ChallengeDifficulty,
  CompetitiveRankInfo,
  CompetitiveSnapshot,
  LocalLeaderboardCategory,
  PersonalRecordEntry,
  PersonalRecordType,
  ScoreHistoryEntry,
} from '../game/competitive/CompetitiveTypes';
import { formatCountdown } from '../game/missions/MissionDateUtils';
import { getWorldById } from '../game/worlds/WorldRegistry';

const CHALLENGE_DIFFICULTY_META: Record<
  ChallengeDifficulty,
  { label: string; bgHex: string; textHex: string }
> = {
  EASY: { label: 'EASY', bgHex: '#DCFCE7', textHex: '#15803D' },
  NORMAL: { label: 'NORMAL', bgHex: '#DBEAFE', textHex: '#1D4ED8' },
  HARD: { label: 'HARD', bgHex: '#FFEDD5', textHex: '#C2410C' },
  EXTREME: { label: 'EXTREME', bgHex: '#FCE7F3', textHex: '#BE185D' },
};

export type CompetitiveHubTab =
  | 'overview'
  | 'challenges'
  | 'rivals'
  | 'records'
  | 'ranking';

interface CompetitiveHubScreenProps {
  snapshot: CompetitiveSnapshot;
  singlePlayerBest: number;
  onStartChallenge: (challengeId: string) => void;
  onPlayQuickDuel: () => void;
  onBack: () => void;
}

const RECORD_TYPE_LABELS: Record<PersonalRecordType, string> = {
  highest_score: 'Highest Score',
  green_valley_best: 'Green Valley Best',
  world_best: 'World Best',
  character_best: 'Character Best',
  no_powerup_best: 'No Power-Up Best',
  solo_best: 'Solo Mode Best',
  challenge_best: 'Challenge Mode Best',
  tournament_best: 'Tournament Best',
  longest_survival: 'Longest Survival',
  longest_pipe_streak: 'Longest Pipe Streak',
  best_perfect_run: 'Best Perfect Run',
  fastest_challenge_completion: 'Fastest Challenge',
};

function formatDateShort(ts: number): string {
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

const ScoreTrendChart: React.FC<{ runs: ScoreHistoryEntry[] }> = ({ runs }) => {
  // Ordered oldest -> newest so trend flows left to right
  const chronological = useMemo(() => [...runs].slice(0, 20).reverse(), [runs]);

  if (chronological.length < 2) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#24415C]/20 bg-[#F8FBFF] px-4 py-6 text-center">
        <TrendingUp className="mx-auto h-7 w-7 text-[#3998F7]" />
        <p className="mt-1.5 text-xs font-black text-[#24415C]">
          Grafik Tren Skor Belum Tersedia
        </p>
        <p className="mt-0.5 text-[11px] font-bold text-[#24415C]/65">
          Selesaikan minimal 2 permainan untuk melihat grafik tren skor dan perbandingan rata-rata.
        </p>
      </div>
    );
  }

  const maxScore = Math.max(5, ...chronological.map((r) => r.score));
  const width = 280;
  const height = 88;
  const padX = 10;
  const padY = 10;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  const points = chronological.map((r, idx) => {
    const x =
      chronological.length === 1
        ? width / 2
        : padX + (idx / (chronological.length - 1)) * usableW;
    const y = padY + usableH - (r.score / maxScore) * usableH;
    return { x, y, score: r.score };
  });

  const polyPoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#F8FBFF] p-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-black text-[#24415C]/70 uppercase">
        <span>SCORE TREND (LAST {chronological.length} RUNS)</span>
        <span className="tabular-nums text-[#3998F7]">MAX {maxScore}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[88px] w-full overflow-visible"
        role="img"
        aria-label="Recent score history trend chart"
      >
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#CBD5E1"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <polyline
          fill="none"
          stroke="#3998F7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polyPoints}
        />
        {points.map((p, idx) => (
          <circle
            key={idx}
            cx={p.x}
            cy={p.y}
            r={idx === points.length - 1 ? 4.5 : 3}
            fill={idx === points.length - 1 ? '#FFD84D' : '#FFFFFF'}
            stroke="#24415C"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
};

export const CompetitiveHubScreen: React.FC<CompetitiveHubScreenProps> = ({
  snapshot,
  singlePlayerBest,
  onStartChallenge,
  onPlayQuickDuel,
  onBack,
}) => {
  const [tab, setTab] = useState<CompetitiveHubTab>('overview');
  const [challengeFilter, setChallengeFilter] = useState<
    'all' | 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME'
  >('all');
  const [lbCategory, setLbCategory] = useState<LocalLeaderboardCategory>('overall');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const effectiveBest = Math.max(snapshot.highestScore, singlePlayerBest);
  const rank: CompetitiveRankInfo = snapshot.rank;
  const selectedRival = snapshot.selectedRival;
  const scoreDiffVsRival = effectiveBest - selectedRival.targetScore;
  const h2h = useMemo(() => competitiveManager.getTwoPlayerHeadToHead(), [snapshot]);
  const lbRows = useMemo(
    () => competitiveManager.getCategoryLeaderboard(lbCategory),
    [lbCategory, snapshot]
  );

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => setToastMsg(null), 2600);
  };

  const handleClaim = (challengeId: string) => {
    const res = competitiveManager.claimChallengeReward(challengeId);
    if (res.success) {
      triggerToast(
        `+${res.coinsGranted} Coins · +${res.xpGranted} XP · +${res.competitivePoints} Comp Pts!`
      );
    } else if (res.error) {
      triggerToast(res.error);
    }
  };

  const handleSelectRival = (rivalId: string) => {
    audioManager.playButton();
    const chosen = competitiveManager.selectRival(rivalId);
    triggerToast(`Rival aktif: ${chosen.name} (Target ${chosen.targetScore})`);
  };

  const handlePlayChallenge = (challengeId: string, eligible: boolean, reason?: string) => {
    if (!eligible) {
      triggerToast(reason || 'Syarat Challenge belum terpenuhi.');
      return;
    }
    audioManager.playButton();
    onStartChallenge(challengeId);
  };

  const renderChallengeModifiers = (ch: CompetitiveSnapshot['challenges'][number]) => {
    const tags: string[] = [];
    if (ch.modifiers.disablePowerUps) tags.push('No Power-Up');
    if (typeof ch.modifiers.maxPowerUps === 'number')
      tags.push(`Max ${ch.modifiers.maxPowerUps} Power-Up`);
    if (ch.modifiers.requirePerfectRun) tags.push('Perfect Run');
    if (typeof ch.modifiers.timeLimitSec === 'number')
      tags.push(`<= ${ch.modifiers.timeLimitSec}s`);
    if (ch.modifiers.requiredWorldId)
      tags.push(getWorldById(ch.modifiers.requiredWorldId).name);
    if (ch.modifiers.requiredCharacterId)
      tags.push(getCharacterById(ch.modifiers.requiredCharacterId).name);
    return tags;
  };

  const renderChallengeCard = (
    ch: CompetitiveSnapshot['challenges'][number],
    featuredBadge?: { label: string; countdownMs?: number }
  ) => {
    const diffMeta = CHALLENGE_DIFFICULTY_META[ch.difficulty];
    const pct = Math.min(100, Math.round((ch.progress / Math.max(1, ch.targetValue)) * 100));
    const modTags = renderChallengeModifiers(ch);

    return (
      <div
        key={`${featuredBadge?.label ?? 'pool'}_${ch.id}`}
        className={`rounded-2xl border-2 border-[#24415C] p-3 shadow-[0_3px_0_#24415C] ${
          ch.status === 'completed'
            ? 'bg-gradient-to-br from-[#ECFDF5] to-[#D1FAE5]'
            : ch.status === 'claimed'
              ? 'bg-slate-100/90 opacity-85'
              : 'bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5">
            {featuredBadge && (
              <span className="rounded-lg border border-[#24415C] bg-[#FFD84D] px-2 py-0.5 text-[9px] font-black text-[#24415C] uppercase">
                {featuredBadge.label}
              </span>
            )}
            <span
              className="rounded-lg border border-[#24415C] px-2 py-0.5 text-[9px] font-black uppercase"
              style={{ backgroundColor: diffMeta.bgHex, color: diffMeta.textHex }}
            >
              {diffMeta.label}
            </span>
          </div>

          {featuredBadge?.countdownMs !== undefined && (
            <span className="inline-flex items-center gap-1 text-[10px] font-black tabular-nums text-[#3998F7]">
              <Clock className="h-3 w-3" />
              {formatCountdown(featuredBadge.countdownMs)}
            </span>
          )}
        </div>

        <div className="mt-1.5 text-sm font-black text-[#24415C]">{ch.title}</div>
        <p className="text-[11px] leading-snug font-bold text-[#24415C]/75">{ch.description}</p>

        {modTags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {modTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 rounded-md border border-[#24415C]/20 bg-[#EEF7FF] px-1.5 py-0.5 text-[9px] font-black text-[#24415C]"
              >
                <ShieldAlert className="h-2.5 w-2.5 text-[#3998F7]" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-2.5">
          <div className="mb-1 flex items-center justify-between text-[10px] font-black text-[#24415C]">
            <span>PROGRESS</span>
            <span className="tabular-nums">
              {ch.progress} / {ch.targetValue} ({pct}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full border border-[#24415C] bg-[#EEF7FF]">
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${pct}%`,
                backgroundColor:
                  ch.status === 'claimed'
                    ? '#94A3B8'
                    : ch.status === 'completed'
                      ? '#22C55E'
                      : '#3998F7',
              }}
            />
          </div>
        </div>

        {/* Reward Preview + Action */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black text-[#24415C]">
            <span className="rounded-md bg-[#FFF9DB] px-1.5 py-0.5 tabular-nums">
              🪙 +{ch.reward.coins}
            </span>
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 tabular-nums text-emerald-700">
              ✨ +{ch.reward.xp} XP
            </span>
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 tabular-nums text-[#0369A1]">
              🏆 +{ch.reward.competitivePoints} Pts
            </span>
            {ch.reward.badgeId && (
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-rose-700">
                🎖️ Badge
              </span>
            )}
          </div>

          {ch.status === 'completed' ? (
            <button
              type="button"
              onClick={() => handleClaim(ch.id)}
              className="btn-base btn-green min-h-[38px] px-3 text-xs"
            >
              <Check className="h-3.5 w-3.5" />
              <span>CLAIM</span>
            </button>
          ) : ch.status === 'claimed' ? (
            <span className="inline-flex min-h-[34px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 text-[10px] font-black text-slate-500 uppercase">
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              CLAIMED
            </span>
          ) : (
            <button
              type="button"
              onClick={() => handlePlayChallenge(ch.id, ch.eligible, ch.ineligibleReason)}
              className={`btn-base min-h-[38px] px-3 text-xs ${
                ch.eligible ? 'btn-primary' : 'btn-secondary opacity-70'
              }`}
            >
              {ch.eligible ? (
                <>
                  <Play className="h-3.5 w-3.5 fill-[#24415C] text-[#24415C]" />
                  <span>PLAY</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>LOCKED</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-3 pt-safe pb-safe backdrop-blur-sm sm:px-4">
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

        <h2 className="font-display text-stroke-dark text-lg font-bold tracking-wide text-white sm:text-xl">
          COMPETITIVE HUB
        </h2>

        <div
          className="inline-flex items-center gap-1 rounded-xl border-2 border-[#24415C] px-2.5 py-1 text-[10px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]"
          style={{ backgroundColor: rank.colorHex }}
        >
          <Crown className="h-3.5 w-3.5" />
          <span>{rank.label}</span>
        </div>
      </div>

      {toastMsg && (
        <div className="mx-auto mb-1.5 flex w-full max-w-[366px] items-center justify-center gap-1.5 rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-3 py-1.5 text-[11px] font-black text-[#24415C] shadow-[0_2px_0_#24415C]">
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{toastMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-[368px] flex-1 flex-col overflow-hidden pb-3">
        <div className="anim-panel-pop game-panel flex flex-1 flex-col overflow-hidden p-3">
          {/* Touch-friendly Horizontal Scrollable Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(
              [
                { id: 'overview', label: 'OVERVIEW' },
                { id: 'challenges', label: 'CHALLENGES' },
                { id: 'rivals', label: 'RIVALS' },
                { id: 'records', label: 'RECORDS' },
                { id: 'ranking', label: 'RANKING' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setTab(t.id);
                }}
                className={`min-h-[38px] shrink-0 rounded-xl border-2 px-3 text-[11px] font-black whitespace-nowrap transition-all ${
                  tab === t.id
                    ? 'border-[#24415C] bg-[#FFD84D] text-[#24415C] shadow-[0_2px_0_#24415C]'
                    : 'border-transparent bg-[#EEF7FF] text-[#24415C]/70'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Scrollable Tab Body */}
          <div className="mt-2 flex-1 space-y-3 overflow-y-auto pr-0.5">
            {tab === 'overview' && (
              <>
                {/* Rank & Personal Best Card */}
                <div className="rounded-2xl border-2 border-[#24415C] bg-gradient-to-br from-[#FFF9DB] via-white to-[#E0F2FE] p-3.5 shadow-[0_3px_0_#24415C]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black tracking-wider text-[#24415C]/65 uppercase">
                        COMPETITIVE RANK
                      </div>
                      <div className="font-display flex items-center gap-1.5 text-xl font-bold text-[#24415C]">
                        <span
                          className="inline-block h-3 w-3 rounded-full border border-[#24415C]"
                          style={{ backgroundColor: rank.colorHex }}
                        />
                        <span>{rank.label}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-bold tabular-nums text-[#3998F7]">
                        {rank.points} PTS
                      </div>
                      <div className="text-[10px] font-black text-[#24415C]/60">
                        {rank.nextTierLabel
                          ? `Next: ${rank.nextTierLabel} (${rank.nextTierPoints})`
                          : 'Max Tier Reached!'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[#24415C] bg-white">
                    <div
                      className="h-full transition-all duration-200"
                      style={{
                        width: `${rank.progressPercent}%`,
                        backgroundColor: rank.colorHex,
                      }}
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-[#24415C]/15 bg-white/90 px-2 py-1.5">
                      <div className="text-[9px] font-black text-[#24415C]/60 uppercase">
                        PERSONAL BEST
                      </div>
                      <div className="font-display text-lg font-bold tabular-nums text-[#24415C]">
                        {effectiveBest}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#24415C]/15 bg-white/90 px-2 py-1.5">
                      <div className="text-[9px] font-black text-[#24415C]/60 uppercase">
                        RECORDS SET
                      </div>
                      <div className="font-display text-lg font-bold tabular-nums text-[#3998F7]">
                        {snapshot.totalRecordsCount}
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#24415C]/15 bg-white/90 px-2 py-1.5">
                      <div className="text-[9px] font-black text-[#24415C]/60 uppercase">
                        WIN RATE
                      </div>
                      <div className="font-display text-lg font-bold tabular-nums text-emerald-600">
                        {snapshot.stats.winRatePercent}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Rival Summary */}
                <div className="rounded-2xl border-2 border-[#24415C] bg-[#EEF7FF] p-3 shadow-[0_2px_0_#24415C]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-[#FF6B6B]" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-[#24415C]">
                            {selectedRival.name}
                          </span>
                          {selectedRival.isAI && (
                            <span className="rounded bg-[#24415C] px-1.5 py-0.5 text-[8px] font-black text-white">
                              AI
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-bold text-[#24415C]/70">
                          {selectedRival.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] font-black text-[#24415C]/60 uppercase">
                        TARGET
                      </div>
                      <div className="font-display text-lg font-bold tabular-nums text-[#FF6B6B]">
                        {selectedRival.targetScore}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-black">
                    <span className="text-[#24415C]/70">Score Gap vs Best</span>
                    <span
                      className={`tabular-nums ${
                        scoreDiffVsRival >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {scoreDiffVsRival >= 0
                        ? `+${scoreDiffVsRival} Ahead`
                        : `${Math.abs(scoreDiffVsRival)} To Beat`}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[#24415C]/75">
                      <Ghost className="h-3.5 w-3.5 text-[#3998F7]" />
                      <span>
                        {snapshot.hasPbGhost
                          ? `PB Ghost Ready (${snapshot.pbGhostScore})`
                          : 'Complete a run to record Ghost'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setTab('rivals');
                      }}
                      className="rounded-lg border border-[#24415C] bg-white px-2.5 py-1 text-[10px] font-black text-[#24415C]"
                    >
                      CHANGE RIVAL
                    </button>
                  </div>
                </div>

                {/* Featured Challenge of the Day & Weekly Challenge */}
                <div className="space-y-2.5">
                  {renderChallengeCard(snapshot.dailyChallenge, {
                    label: 'DAILY CHALLENGE',
                    countdownMs: snapshot.dailyChallenge.msUntilReset,
                  })}
                  {renderChallengeCard(snapshot.weeklyChallenge, {
                    label: 'WEEKLY CHALLENGE',
                    countdownMs: snapshot.weeklyChallenge.msUntilReset,
                  })}
                </div>

                {/* Competitive Stats Box */}
                <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-3">
                  <div className="mb-2 text-[10px] font-black tracking-wider text-[#3998F7] uppercase">
                    COMPETITIVE STATISTICS
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-black text-[#24415C]">
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5">
                      <span className="text-[#24415C]/65">PB Breaks</span>
                      <span className="tabular-nums">{snapshot.stats.personalBestBreaks}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5">
                      <span className="text-[#24415C]/65">Rivals Beaten</span>
                      <span className="tabular-nums">{snapshot.stats.rivalsDefeated}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5">
                      <span className="text-[#24415C]/65">Challenges</span>
                      <span className="tabular-nums">{snapshot.stats.challengesCompleted}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5">
                      <span className="text-[#24415C]/65">Perfect Runs</span>
                      <span className="tabular-nums">{snapshot.stats.perfectRunsCompleted}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === 'challenges' && (
              <>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {(['all', 'EASY', 'NORMAL', 'HARD', 'EXTREME'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setChallengeFilter(f);
                      }}
                      className={`min-h-[34px] shrink-0 rounded-xl border-2 px-2.5 text-[10px] font-black whitespace-nowrap uppercase ${
                        challengeFilter === f
                          ? 'border-[#24415C] bg-[#3998F7] text-white'
                          : 'border-transparent bg-[#EEF7FF] text-[#24415C]/70'
                      }`}
                    >
                      {f === 'all' ? 'ALL CHALLENGES' : f}
                    </button>
                  ))}
                </div>

                {challengeFilter === 'all' && (
                  <div className="space-y-2.5">
                    {renderChallengeCard(snapshot.dailyChallenge, {
                      label: 'CHALLENGE OF THE DAY',
                      countdownMs: snapshot.dailyChallenge.msUntilReset,
                    })}
                    {renderChallengeCard(snapshot.weeklyChallenge, {
                      label: 'WEEKLY CHALLENGE',
                      countdownMs: snapshot.weeklyChallenge.msUntilReset,
                    })}
                  </div>
                )}

                <div className="space-y-2.5">
                  {snapshot.challenges
                    .filter((c) => challengeFilter === 'all' || c.difficulty === challengeFilter)
                    .map((ch) => renderChallengeCard(ch))}
                </div>
              </>
            )}

            {tab === 'rivals' && (
              <>
                <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-3 text-[11px] font-bold text-[#24415C]">
                  Pilih Rival kompetitif untuk dikejar. AI Rival murni target skor adil —{' '}
                  <span className="font-black text-[#3998F7]">tidak mengubah physics</span> atau
                  kesulitan pipa.
                </div>

                <div className="space-y-2">
                  {snapshot.allRivals.map((rival) => {
                    const isSelected = rival.id === selectedRival.id;
                    const standing = competitiveManager.rivals.getStanding(rival.id);
                    return (
                      <div
                        key={rival.id}
                        className={`rounded-2xl border-2 p-3 transition-all ${
                          isSelected
                            ? 'border-[#24415C] bg-[#FFF9DB] shadow-[0_3px_0_#24415C]'
                            : 'border-[#24415C]/15 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-black text-[#24415C]">
                                {rival.name}
                              </span>
                              {rival.isAI && (
                                <span className="rounded bg-[#24415C] px-1.5 py-0.5 text-[8px] font-black text-white">
                                  AI · {rival.aiDifficulty}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-bold text-[#24415C]/70">
                              {rival.description}
                            </div>
                            {standing && (
                              <div className="mt-1 text-[10px] font-black text-[#3998F7] tabular-nums">
                                {standing.wins}W - {standing.losses}L - {standing.draws}D · Streak{' '}
                                {standing.currentStreak}
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <div className="text-right">
                              <div className="text-[9px] font-black text-[#24415C]/55 uppercase">
                                TARGET
                              </div>
                              <div className="font-display text-lg font-bold tabular-nums text-[#FF6B6B]">
                                {rival.targetScore}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSelectRival(rival.id)}
                              className={`btn-base min-h-[38px] px-2.5 text-[10px] ${
                                isSelected ? 'btn-green' : 'btn-secondary'
                              }`}
                            >
                              {isSelected ? 'ACTIVE' : 'SELECT'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Rivalry Match History */}
                <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-3">
                  <div className="mb-2 text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
                    RECENT RIVALRY RESULTS
                  </div>
                  {snapshot.rivalryHistory.length === 0 ? (
                    <p className="text-[11px] font-bold text-[#24415C]/65">
                      Belum ada duel melawan Rival. Mulai 1 Player atau Challenge Run untuk mencatat rekor Rival!
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {snapshot.rivalryHistory.slice(0, 8).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-white px-2.5 py-1.5 text-[11px] font-bold"
                        >
                          <div className="min-w-0">
                            <span className="truncate font-black text-[#24415C]">
                              {item.rivalName}
                            </span>
                            <div className="text-[9px] text-[#24415C]/55">
                              {formatDateShort(item.date)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 tabular-nums">
                            <span className="font-black text-[#24415C]">
                              {item.playerScore} vs {item.rivalScore}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                item.result === 'win'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : item.result === 'draw'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {item.result}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {tab === 'records' && (
              <>
                <ScoreTrendChart runs={snapshot.scoreHistory} />

                {/* History Stats Summary */}
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="rounded-xl border border-[#24415C]/15 bg-[#EEF7FF] p-2">
                    <div className="text-[8px] font-black text-[#24415C]/60 uppercase">AVG</div>
                    <div className="font-display text-sm font-bold tabular-nums text-[#24415C]">
                      {snapshot.historyStats.averageScore}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#24415C]/15 bg-[#EEF7FF] p-2">
                    <div className="text-[8px] font-black text-[#24415C]/60 uppercase">MEDIAN</div>
                    <div className="font-display text-sm font-bold tabular-nums text-[#24415C]">
                      {snapshot.historyStats.medianScore}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#24415C]/15 bg-[#EEF7FF] p-2">
                    <div className="text-[8px] font-black text-[#24415C]/60 uppercase">BEST 20</div>
                    <div className="font-display text-sm font-bold tabular-nums text-[#3998F7]">
                      {snapshot.historyStats.bestRun}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#24415C]/15 bg-[#EEF7FF] p-2">
                    <div className="text-[8px] font-black text-[#24415C]/60 uppercase">TREND</div>
                    <div
                      className={`font-display text-sm font-bold tabular-nums ${
                        snapshot.historyStats.improvementRatePercent >= 0
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {snapshot.historyStats.improvementRatePercent >= 0 ? '+' : ''}
                      {snapshot.historyStats.improvementRatePercent}%
                    </div>
                  </div>
                </div>

                {/* All Personal Records */}
                <div className="space-y-2">
                  <div className="text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
                    PERSONAL RECORDS ({snapshot.records.length})
                  </div>
                  {snapshot.records.length === 0 ? (
                    <div className="rounded-2xl bg-[#EEF7FF] px-4 py-6 text-center text-xs font-bold text-[#24415C]/70">
                      Selesaikan permainan sah pertamamu untuk mencatat rekor pribadi!
                    </div>
                  ) : (
                    snapshot.records.map((rec: PersonalRecordEntry) => (
                      <div
                        key={rec.id}
                        className="flex items-center justify-between rounded-2xl border-2 border-[#24415C]/15 bg-white px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Medal className="h-3.5 w-3.5 shrink-0 text-[#F59E0B]" />
                            <span className="truncate text-xs font-black text-[#24415C]">
                              {rec.label || RECORD_TYPE_LABELS[rec.recordType]}
                            </span>
                          </div>
                          <div className="mt-0.5 truncate text-[10px] font-bold text-[#24415C]/65">
                            {getCharacterById(rec.characterId).name} ·{' '}
                            {getWorldById(rec.worldId).name} · {formatDateShort(rec.date)}
                          </div>
                        </div>

                        <div className="shrink-0 pl-2 text-right">
                          <div className="font-display text-lg font-bold tabular-nums text-[#3998F7]">
                            {rec.recordType === 'longest_survival' ||
                            rec.recordType === 'fastest_challenge_completion'
                              ? `${rec.score.toFixed(1)}s`
                              : rec.score}
                          </div>
                          <div className="text-[9px] font-black text-[#24415C]/55 uppercase">
                            {rec.gameMode}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Last 20 Score History */}
                {snapshot.scoreHistory.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-black tracking-wider text-[#24415C]/70 uppercase">
                      RECENT 20 RUNS
                    </div>
                    {snapshot.scoreHistory.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between rounded-xl border border-[#24415C]/10 bg-[#EEF7FF] px-2.5 py-1.5 text-[11px] font-bold text-[#24415C]"
                      >
                        <div className="min-w-0">
                          <span className="truncate font-black">
                            {getWorldById(run.worldId).name}
                          </span>{' '}
                          <span className="text-[10px] text-[#24415C]/65">
                            · {getCharacterById(run.characterId).name}
                          </span>
                        </div>
                        <div className="shrink-0 pl-2 font-black tabular-nums text-[#3998F7]">
                          {run.score} pts · {run.durationSec.toFixed(1)}s
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {tab === 'ranking' && (
              <>
                {/* Player 1 vs Player 2 Local Head-to-Head Card */}
                <div className="rounded-2xl border-2 border-[#24415C] bg-gradient-to-br from-[#EEF7FF] via-white to-[#FFF1F2] p-3 shadow-[0_3px_0_#24415C]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-[#24415C]">
                      <Users className="h-4 w-4 text-[#3998F7]" />
                      <span>LOCAL RANKING: P1 vs P2</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        onPlayQuickDuel();
                      }}
                      className="rounded-lg border border-[#24415C] bg-[#61D66B] px-2.5 py-1 text-[10px] font-black text-[#24415C]"
                    >
                      DUEL NOW
                    </button>
                  </div>

                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-[#3998F7]/40 bg-sky-50 p-2">
                      <div className="truncate text-[11px] font-black text-[#0369A1]">
                        {h2h.p1Name}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[#24415C] tabular-nums">
                        {h2h.p1Wins}W - {h2h.p1Losses}L - {h2h.p1Draws}D ({h2h.p1WinRatePercent}%)
                      </div>
                      <div className="text-[10px] font-bold text-[#24415C]/70 tabular-nums">
                        Best: {h2h.p1BestScore} · Streak: {h2h.p1HighestStreak}
                      </div>
                    </div>

                    <div className="rounded-xl border border-[#FF6B6B]/40 bg-rose-50 p-2 text-right">
                      <div className="truncate text-[11px] font-black text-[#BE123C]">
                        {h2h.p2Name}
                      </div>
                      <div className="mt-1 text-[10px] font-bold text-[#24415C] tabular-nums">
                        {h2h.p2Wins}W - {h2h.p2Losses}L - {h2h.p2Draws}D ({h2h.p2WinRatePercent}%)
                      </div>
                      <div className="text-[10px] font-bold text-[#24415C]/70 tabular-nums">
                        Best: {h2h.p2BestScore} · Streak: {h2h.p2HighestStreak}
                      </div>
                    </div>
                  </div>

                  {h2h.awards.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {h2h.awards.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#24415C]/20 bg-[#FFF9DB] px-2 py-0.5 text-[9px] font-black text-[#24415C]"
                        >
                          <Award className="h-3 w-3 text-[#F59E0B]" />
                          {a.label}: {a.winnerName} ({a.valueLabel})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {(
                    [
                      { id: 'overall', label: 'OVERALL' },
                      { id: 'daily', label: 'DAILY' },
                      { id: 'weekly', label: 'WEEKLY' },
                      { id: 'world', label: 'WORLD' },
                      { id: 'character', label: 'CHARACTER' },
                      { id: 'challenge', label: 'CHALLENGE' },
                      { id: 'tournament', label: 'TOURNAMENT' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        audioManager.playButton();
                        setLbCategory(c.id);
                      }}
                      className={`min-h-[34px] shrink-0 rounded-xl border-2 px-2.5 text-[10px] font-black whitespace-nowrap ${
                        lbCategory === c.id
                          ? 'border-[#24415C] bg-[#3998F7] text-white'
                          : 'border-transparent bg-[#EEF7FF] text-[#24415C]/70'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {lbRows.length === 0 ? (
                    <div className="rounded-2xl bg-[#EEF7FF] px-4 py-6 text-center">
                      <Trophy className="mx-auto h-7 w-7 text-[#3998F7]" />
                      <p className="mt-1.5 text-xs font-black text-[#24415C]">
                        Belum ada data di kategori ini
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-[#24415C]/65">
                        Mainkan lebih banyak run atau duel 2 Player untuk mengisi peringkat lokal!
                      </p>
                    </div>
                  ) : (
                    lbRows.map((row) => (
                      <div
                        key={row.id}
                        className={`flex items-center justify-between rounded-2xl border-2 px-3 py-2 ${
                          row.isPlayer
                            ? 'border-[#24415C] bg-[#FFF9DB]'
                            : 'border-[#24415C]/15 bg-white'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="font-display flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C] bg-[#EEF7FF] text-xs font-bold tabular-nums text-[#24415C]">
                            {row.rank}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-black text-[#24415C]">
                                {row.name}
                              </span>
                              {row.isAI && (
                                <span className="rounded bg-[#24415C] px-1.5 py-0.5 text-[8px] font-black text-white">
                                  AI
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[10px] font-bold text-[#24415C]/65">
                              {row.secondaryLabel}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 pl-2 font-display text-lg font-bold tabular-nums text-[#3998F7]">
                          {row.score}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
