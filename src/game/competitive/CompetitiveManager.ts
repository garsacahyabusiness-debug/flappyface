import { audioManager } from '../audio/AudioManager';
import { getCharacterById } from '../character/CharacterRegistry';
import { characterUnlockManager } from '../character/CharacterUnlockManager';
import { getLocalDateKey, getLocalWeekKey } from '../missions/MissionDateUtils';
import { leaderboardManager } from '../progression/LeaderboardManager';
import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import { settingsManager } from '../settings/SettingsManager';
import { loadStoredPlayerNames } from '../TwoPlayerMatch';
import { getWorldById, WorldId } from '../worlds/WorldRegistry';
import { worldUnlockManager } from '../worlds/WorldUnlockManager';
import { ChallengeEligibilityContext, ChallengeManager } from './ChallengeManager';
import { CompetitiveRankManager } from './CompetitiveRankManager';
import {
  COMPETITIVE_STORAGE_VERSION,
  ChallengeDefinition,
  CompetitiveNotificationItem,
  CompetitiveSnapshot,
  CompetitiveStatistics,
  CompletedRunInput,
  LocalLeaderboardCategory,
  LocalLeaderboardRow,
  PersonalBestBreakEvent,
  RivalProfile,
  TwoPlayerHeadToHeadSummary,
  TwoPlayerMatchCompetitiveInput,
} from './CompetitiveTypes';
import { GhostRecordingManager, ghostRecordingManager } from './GhostRecordingManager';
import { RecordManager } from './RecordManager';
import { AI_RIVALS, RivalManager } from './RivalManager';
import { ScoreHistoryManager } from './ScoreHistoryManager';

const COMPETITIVE_STORAGE_KEY = 'flappy_face_competitive';
const MAX_NOTIFICATION_QUEUE = 20;

export interface CompetitiveAchievementMetricsPayload {
  rivalsDefeated: number;
  legendRivalDefeatedCount: number;
  personalBestBreaks: number;
  challengesCompleted: number;
  dailyChallengesCompleted: number;
  weeklyChallengesCompleted: number;
  perfectRunsCompleted: number;
  competitivePoints: number;
}

interface StoredCompetitivePayload {
  version: number;
  rankPoints: number;
  claimedPointEvents: string[];
  records: ReturnType<RecordManager['exportState']>;
  history: ReturnType<ScoreHistoryManager['exportState']>;
  rivals: ReturnType<RivalManager['exportState']>;
  challenges: ReturnType<ChallengeManager['exportState']>;
  stats: {
    totalCompetitiveRuns: number;
    totalChallengeRuns: number;
  };
  unlockedCompetitiveBadges: string[];
}

export class CompetitiveManager {
  public readonly records = new RecordManager();
  public readonly history = new ScoreHistoryManager();
  public readonly rivals = new RivalManager();
  public readonly challenges: ChallengeManager;
  public readonly rank = new CompetitiveRankManager();
  public readonly ghosts: GhostRecordingManager = ghostRecordingManager;

  private totalCompetitiveRuns = 0;
  private totalChallengeRuns = 0;
  private unlockedCompetitiveBadges: string[] = [];
  private lastPersonalBestBreak: PersonalBestBreakEvent | null = null;
  private notificationQueue: CompetitiveNotificationItem[] = [];

  private listeners = new Set<(snap: CompetitiveSnapshot) => void>();
  private notificationListeners = new Set<(items: CompetitiveNotificationItem[]) => void>();
  private externalAchievementHook: ((metrics: CompetitiveAchievementMetricsPayload) => void) | null = null;
  private nowProvider: () => number;

  constructor(nowProvider: () => number = () => Date.now()) {
    this.nowProvider = nowProvider;
    this.challenges = new ChallengeManager(nowProvider);
    this.load();
  }

  public setNowProviderForTesting(fn: () => number): void {
    this.nowProvider = fn;
    this.challenges.setNowProviderForTesting(fn);
  }

  public onExternalAchievementSync(
    fn: (metrics: CompetitiveAchievementMetricsPayload) => void
  ): void {
    this.externalAchievementHook = fn;
  }

  public subscribe(listener: (snap: CompetitiveSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeNotifications(
    listener: (items: CompetitiveNotificationItem[]) => void
  ): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  public getPendingNotifications(): CompetitiveNotificationItem[] {
    return [...this.notificationQueue];
  }

  public consumeNotification(id?: string): void {
    if (this.notificationQueue.length === 0) return;
    if (!id) {
      this.notificationQueue = this.notificationQueue.slice(1);
    } else {
      this.notificationQueue = this.notificationQueue.filter((n) => n.id !== id);
    }
    this.notifyQueueListeners();
  }

  public clearNotifications(): void {
    this.notificationQueue = [];
    this.notifyQueueListeners();
  }

  public reloadFromStorage(): void {
    this.load();
    this.ghosts.reloadFromStorage();
    this.notifyAll();
  }

  public reset(): void {
    this.records.reset();
    this.history.reset();
    this.rivals.reset();
    this.challenges.reset();
    this.rank.reset();
    this.ghosts.reset();
    this.totalCompetitiveRuns = 0;
    this.totalChallengeRuns = 0;
    this.unlockedCompetitiveBadges = [];
    this.lastPersonalBestBreak = null;
    this.notificationQueue = [];
    this.save();
    this.notifyAll();
    this.notifyQueueListeners();
  }

  private getEligibilityContext(): ChallengeEligibilityContext {
    try {
      const s = settingsManager.getSettings();
      return {
        powerUpsEnabled: s.powerUpsEnabled,
        collectiblesEnabled: s.collectiblesEnabled,
        unlockedWorldIds: worldUnlockManager.getUnlockedIds(),
        unlockedCharacterIds: characterUnlockManager.getUnlockedIds(),
      };
    } catch {
      return {
        powerUpsEnabled: true,
        collectiblesEnabled: true,
        unlockedWorldIds: ['green_valley'],
        unlockedCharacterIds: ['classic_bird', 'chicky'],
      };
    }
  }

  public ensureCurrentPeriods(nowMs = this.nowProvider()): boolean {
    const changed = this.challenges.ensureCurrentPeriods(nowMs, this.getEligibilityContext());
    if (changed) {
      this.save();
      this.notifyAll();
    }
    return changed;
  }

  public selectRival(rivalId: string): RivalProfile {
    const chosen = this.rivals.selectRival(rivalId, this.getEffectiveBestScore());
    this.save();
    this.notifyAll();
    return chosen;
  }

  public setActiveChallenge(challengeId: string | null): ChallengeDefinition | null {
    const def = this.challenges.setActiveChallenge(challengeId);
    this.save();
    this.notifyAll();
    return def;
  }

  public getActiveChallenge(): ChallengeDefinition | null {
    return this.challenges.getActiveChallenge();
  }

  public getEffectiveBestScore(): number {
    return this.records.getHighestScore();
  }

  public getAchievementMetricsPayload(): CompetitiveAchievementMetricsPayload {
    return {
      rivalsDefeated: this.rivals.getTotalDefeated(),
      legendRivalDefeatedCount: this.rivals.getLegendDefeatedCount(),
      personalBestBreaks: this.records.getPersonalBestBreaksCount(),
      challengesCompleted: this.challenges.getCompletedCount(),
      dailyChallengesCompleted: this.challenges.getDailyCompletedCount(),
      weeklyChallengesCompleted: this.challenges.getWeeklyCompletedCount(),
      perfectRunsCompleted: this.challenges.getPerfectRunsCount(),
      competitivePoints: this.rank.getPoints(),
    };
  }

  public getStats(): CompetitiveStatistics {
    const rHist = this.rivals.getRivalryHistory();
    const wins = rHist.filter((r) => r.result === 'win').length;
    const winRatePercent = rHist.length > 0 ? Math.round((wins / rHist.length) * 100) : 0;
    return {
      totalCompetitiveRuns: this.totalCompetitiveRuns,
      totalChallengeRuns: this.totalChallengeRuns,
      challengesCompleted: this.challenges.getCompletedCount(),
      challengesClaimed: this.challenges.getClaimedCount(),
      dailyChallengesCompleted: this.challenges.getDailyCompletedCount(),
      weeklyChallengesCompleted: this.challenges.getWeeklyCompletedCount(),
      perfectRunsCompleted: this.challenges.getPerfectRunsCount(),
      personalBestBreaks: this.records.getPersonalBestBreaksCount(),
      rivalsDefeated: this.rivals.getTotalDefeated(),
      legendRivalDefeatedCount: this.rivals.getLegendDefeatedCount(),
      totalCompetitivePoints: this.rank.getPoints(),
      winRatePercent,
    };
  }

  public getSnapshot(): CompetitiveSnapshot {
    const nowMs = this.nowProvider();
    const ctx = this.getEligibilityContext();
    const highestScore = this.getEffectiveBestScore();
    const selectedRival = this.rivals.getSelectedRival(highestScore);
    const pbGhost = this.ghosts.getPbGhost();
    const prevGhost = this.ghosts.getPrevGhost();

    return {
      version: COMPETITIVE_STORAGE_VERSION,
      rank: this.rank.getRankInfo(),
      highestScore,
      totalRecordsCount: this.records.getTotalRecordsCount(),
      records: this.records.getAllRecords(),
      recentRecords: this.records.getRecentRecords(10),
      scoreHistory: this.history.getHistory(),
      historyStats: this.history.getStats(),
      selectedRival,
      allRivals: this.rivals.getAvailableRivals(highestScore),
      selectedRivalStanding: this.rivals.getStanding(selectedRival.id),
      rivalryHistory: this.rivals.getRivalryHistory(),
      dailyChallenge: this.challenges.getDailyChallenge(nowMs, ctx),
      weeklyChallenge: this.challenges.getWeeklyChallenge(nowMs, ctx),
      challenges: this.challenges.getAllChallenges(ctx),
      stats: this.getStats(),
      hasPbGhost: this.ghosts.hasPbGhost(),
      hasPrevGhost: this.ghosts.hasPrevGhost(),
      pbGhostScore: pbGhost?.score ?? 0,
      prevGhostScore: prevGhost?.score ?? 0,
      unlockedCompetitiveBadges: [...this.unlockedCompetitiveBadges],
      lastPersonalBestBreak: this.lastPersonalBestBreak,
    };
  }

  /**
   * Processes a valid completed run across Personal Records, Score History, Challenges,
   * Rival evaluation, Competitive Rank points, and Notification Queue.
   */
  public recordCompletedRun(
    input: CompletedRunInput,
    options?: { knownGlobalBest?: number; isChallengeSession?: boolean }
  ): {
    pbEvent: PersonalBestBreakEvent | null;
    rivalResult: ReturnType<RivalManager['evaluateRunAgainstRival']> | null;
    challengeEvaluation: ReturnType<ChallengeManager['evaluateCompletedRun']>;
    notificationsEmitted: CompetitiveNotificationItem[];
  } {
    const nowMs = input.nowMs ?? this.nowProvider();
    const previousHighestBeforeRun = Math.max(
      this.records.getHighestScore(),
      Math.max(0, Math.floor(options?.knownGlobalBest ?? 0))
    );
    const isSoloOrChallenge = input.gameMode === 'solo' || input.gameMode === 'challenge';

    const ctx = this.getEligibilityContext();
    const challengeEvaluation = isSoloOrChallenge
      ? this.challenges.evaluateCompletedRun({ ...input, nowMs }, ctx)
      : {
          completedChallengeDefs: [],
          dailyCompletedNow: false,
          weeklyCompletedNow: false,
          activeChallengePassed: false,
        };

    const recordResult = this.records.recordCompletedRun(
      { ...input, nowMs },
      {
        challengeCompletedThisRun: challengeEvaluation.activeChallengePassed,
        knownGlobalBest: options?.knownGlobalBest,
      }
    );

    this.history.addCompletedRun({ ...input, nowMs });

    if (isSoloOrChallenge) {
      this.totalCompetitiveRuns += 1;
      if (options?.isChallengeSession || input.gameMode === 'challenge') {
        this.totalChallengeRuns += 1;
      }
    }

    const notifications: CompetitiveNotificationItem[] = [];
    const pushNote = (
      type: CompetitiveNotificationItem['type'],
      title: string,
      subtitle: string,
      accentHex: string,
      pbEvent?: PersonalBestBreakEvent
    ) => {
      notifications.push({
        id: `cnote_${type}_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        title,
        subtitle,
        accentHex,
        createdAt: nowMs,
        pbEvent,
      });
    };

    // 1. Personal Best & Record Broken notifications
    const pbEvent = recordResult.highestBestEvent;
    if (pbEvent) {
      this.lastPersonalBestBreak = pbEvent;
      pushNote(
        'NEW_PERSONAL_BEST',
        `NEW PERSONAL BEST: ${pbEvent.newScore}!`,
        pbEvent.previousScore > 0
          ? `+${pbEvent.delta} (${pbEvent.improvementPercent}% lebih tinggi dari ${pbEvent.previousScore})`
          : 'Rekor pribadi perdana tercatat!',
        '#F59E0B',
        pbEvent
      );

      // Anti-farming PB points: step milestone bonus per 5 score threshold + break bonus capped cleanly per unique best tier
      const stepTier = Math.floor(pbEvent.newScore / 5) * 5;
      if (stepTier >= 5) {
        const ptRes = this.rank.awardPointsOnce(`pb_tier_${stepTier}`, 20);
        if (ptRes.promoted) {
          pushNote(
            'NEW_RANK',
            `COMPETITIVE RANK: ${ptRes.newRank.label}!`,
            `${ptRes.newRank.points} Competitive Points`,
            ptRes.newRank.colorHex
          );
          audioManager.playRankPromotion();
        }
      }
    } else if (recordResult.brokenRecords.length > 0 && input.score >= 3) {
      const topBroken = recordResult.brokenRecords[0];
      pushNote(
        'RECORD_BROKEN',
        `RECORD BROKEN: ${topBroken.label}`,
        `Skor ${topBroken.score} · ${getWorldById(topBroken.worldId).name}`,
        '#3998F7'
      );
    }

    // 2. Evaluate against selected Rival (Solo / Challenge only — 2P has dedicated head-to-head)
    let rivalResult: ReturnType<RivalManager['evaluateRunAgainstRival']> | null = null;
    if (isSoloOrChallenge && (input.score > 0 || input.durationSec >= 1)) {
      rivalResult = this.rivals.evaluateRunAgainstRival({
        score: input.score,
        previousPersonalBest: previousHighestBeforeRun,
        worldId: input.worldId,
        gameMode: input.gameMode,
        nowMs,
      });

      if (rivalResult.defeated) {
        pushNote(
          'RIVAL_DEFEATED',
          `RIVAL DEFEATED: ${rivalResult.rival.name}!`,
          `Skormu ${input.score} unggul +${rivalResult.gap} dari target ${rivalResult.rival.targetScore}`,
          '#22C55E'
        );
        // Anti-farming: 1 rival-defeat point bonus per day per rival ID
        const dateKey = getLocalDateKey(nowMs);
        const aiScale =
          rivalResult.rival.aiDifficulty === 'LEGEND'
            ? 50
            : rivalResult.rival.aiDifficulty === 'EXPERT'
              ? 35
              : rivalResult.rival.aiDifficulty === 'SKILLED'
                ? 25
                : 15;
        const ptRes = this.rank.awardPointsOnce(
          `rival_daily_${rivalResult.rival.id}_${dateKey}`,
          aiScale
        );
        if (ptRes.promoted) {
          pushNote(
            'NEW_RANK',
            `COMPETITIVE RANK: ${ptRes.newRank.label}!`,
            `${ptRes.newRank.points} Competitive Points`,
            ptRes.newRank.colorHex
          );
          audioManager.playRankPromotion();
        }
      }
    }

    // 3. Challenge completions
    if (challengeEvaluation.weeklyCompletedNow) {
      const wDef = challengeEvaluation.completedChallengeDefs.find((d) =>
        d.id.startsWith('weekly_')
      );
      pushNote(
        'WEEKLY_CHALLENGE_COMPLETE',
        `WEEKLY COMPLETE: ${wDef?.title ?? 'Weekly Challenge'}!`,
        'Klaim hadiah di Competitive Hub!',
        '#9333EA'
      );
      audioManager.playChallengeComplete();
    } else if (challengeEvaluation.completedChallengeDefs.length > 0) {
      const firstDef = challengeEvaluation.completedChallengeDefs[0];
      pushNote(
        'CHALLENGE_COMPLETED',
        `CHALLENGE COMPLETE: ${firstDef.title}!`,
        `+${firstDef.reward.coins} Coins · +${firstDef.reward.xp} XP siap diklaim`,
        '#10B981'
      );
      audioManager.playChallengeComplete();
    }

    // Emit Legend Rank badge unlock automatically upon reaching LEGEND rank
    if (
      this.rank.getRankInfo().tier === 'LEGEND' &&
      !this.unlockedCompetitiveBadges.includes('competitive_legend')
    ) {
      this.unlockedCompetitiveBadges.push('competitive_legend');
    }

    if (notifications.length > 0) {
      this.enqueueNotifications(notifications);
    }

    this.save();
    this.notifyAll();
    this.externalAchievementHook?.(this.getAchievementMetricsPayload());

    return {
      pbEvent,
      rivalResult,
      challengeEvaluation,
      notificationsEmitted: notifications,
    };
  }

  public recordTwoPlayerMatch(match: TwoPlayerMatchCompetitiveInput): void {
    if (!match.matchId || !match.winner) return;

    const ptAmount = match.format === 'bo5' ? 40 : match.format === 'bo3' ? 25 : 10;
    const ptRes = this.rank.awardPointsOnce(`match_comp_${match.matchId}`, ptAmount);
    if (ptRes.promoted) {
      this.enqueueNotifications([
        {
          id: `cnote_rank_${Date.now()}`,
          type: 'NEW_RANK',
          title: `COMPETITIVE RANK: ${ptRes.newRank.label}!`,
          subtitle: `${ptRes.newRank.points} Competitive Points`,
          accentHex: ptRes.newRank.colorHex,
          createdAt: this.nowProvider(),
        },
      ]);
      audioManager.playRankPromotion();
    }

    this.save();
    this.notifyAll();
    this.externalAchievementHook?.(this.getAchievementMetricsPayload());
  }

  public claimChallengeReward(challengeId: string): ReturnType<ChallengeManager['claimChallenge']> & {
    rankPromoted: boolean;
  } {
    const res = this.challenges.claimChallenge(challengeId);
    if (!res.success || !res.definition || !res.claimEventKey) {
      return { ...res, rankPromoted: false };
    }

    const nowMs = this.nowProvider();
    let rankPromoted = false;
    if (res.competitivePoints > 0) {
      const ptRes = this.rank.awardPointsOnce(
        `${res.claimEventKey}_pts`,
        res.competitivePoints
      );
      if (ptRes.promoted) {
        rankPromoted = true;
        this.enqueueNotifications([
          {
            id: `cnote_rank_${nowMs}`,
            type: 'NEW_RANK',
            title: `COMPETITIVE RANK: ${ptRes.newRank.label}!`,
            subtitle: `${ptRes.newRank.points} Competitive Points`,
            accentHex: ptRes.newRank.colorHex,
            createdAt: nowMs,
          },
        ]);
        audioManager.playRankPromotion();
      }
    }

    if (
      res.definition.reward.badgeId &&
      !this.unlockedCompetitiveBadges.includes(res.definition.reward.badgeId)
    ) {
      this.unlockedCompetitiveBadges.push(res.definition.reward.badgeId);
    }

    audioManager.playMissionClaim();
    this.save();
    this.notifyAll();
    this.externalAchievementHook?.(this.getAchievementMetricsPayload());

    return { ...res, rankPromoted };
  }

  /**
   * Local Category Leaderboard built strictly from real player runs, 2P data,
   * and clearly marked AI Rivals ([AI]).
   */
  public getCategoryLeaderboard(
    category: LocalLeaderboardCategory,
    scopeId?: string
  ): LocalLeaderboardRow[] {
    const runs = this.history.getHistory();
    const nowMs = this.nowProvider();
    const todayKey = getLocalDateKey(nowMs);
    const weekKey = getLocalWeekKey(nowMs);
    const playerName = playerProgressionManager.getProfile('solo').playerName || 'YOU';

    const rows: LocalLeaderboardRow[] = [];

    if (category === 'overall') {
      const best = this.getEffectiveBestScore();
      if (best > 0) {
        const bestRec = this.records.getRecord('highest_score', 'global');
        rows.push({
          rank: 0,
          id: 'you_overall',
          name: `${playerName} (YOU)`,
          score: best,
          secondaryLabel: bestRec
            ? `${getCharacterById(bestRec.characterId).name} · ${getWorldById(bestRec.worldId).name}`
            : 'Personal Best',
          isAI: false,
          isPlayer: true,
          characterId: bestRec?.characterId,
          worldId: bestRec?.worldId,
          date: bestRec?.date,
        });
      }
      for (const ai of AI_RIVALS) {
        rows.push({
          rank: 0,
          id: ai.id,
          name: ai.name,
          score: ai.targetScore,
          secondaryLabel: `AI Target · ${ai.aiDifficulty}`,
          isAI: true,
          isPlayer: false,
          aiDifficulty: ai.aiDifficulty,
          characterId: ai.characterId,
        });
      }
    } else if (category === 'daily') {
      const dailyRuns = runs.filter((r) => getLocalDateKey(r.date) === todayKey);
      dailyRuns.forEach((r, idx) => {
        rows.push({
          rank: 0,
          id: `${r.id}_${idx}`,
          name: `${playerName} #${idx + 1}`,
          score: r.score,
          secondaryLabel: `${getWorldById(r.worldId).name} · ${r.pipesPassed} pipes`,
          isAI: false,
          isPlayer: true,
          characterId: r.characterId,
          worldId: r.worldId,
          date: r.date,
        });
      });
    } else if (category === 'weekly') {
      const weeklyRuns = runs.filter((r) => getLocalWeekKey(r.date) === weekKey);
      weeklyRuns.forEach((r, idx) => {
        rows.push({
          rank: 0,
          id: `${r.id}_${idx}`,
          name: `${playerName} #${idx + 1}`,
          score: r.score,
          secondaryLabel: `${getCharacterById(r.characterId).name} · ${getWorldById(r.worldId).name}`,
          isAI: false,
          isPlayer: true,
          characterId: r.characterId,
          worldId: r.worldId,
          date: r.date,
        });
      });
    } else if (category === 'world') {
      const worldRecords = this.records
        .getAllRecords()
        .filter((r) => r.recordType === 'world_best' && (!scopeId || r.worldId === scopeId));
      worldRecords.forEach((rec) => {
        rows.push({
          rank: 0,
          id: rec.id,
          name: getWorldById(rec.worldId).name,
          score: rec.score,
          secondaryLabel: `${getCharacterById(rec.characterId).name} · ${rec.pipesPassed} pipes`,
          isAI: false,
          isPlayer: true,
          worldId: rec.worldId,
          characterId: rec.characterId,
          date: rec.date,
        });
      });
    } else if (category === 'character') {
      const charRecords = this.records
        .getAllRecords()
        .filter(
          (r) => r.recordType === 'character_best' && (!scopeId || r.characterId === scopeId)
        );
      charRecords.forEach((rec) => {
        rows.push({
          rank: 0,
          id: rec.id,
          name: getCharacterById(rec.characterId).name,
          score: rec.score,
          secondaryLabel: `${getWorldById(rec.worldId).name}`,
          isAI: false,
          isPlayer: true,
          characterId: rec.characterId,
          worldId: rec.worldId,
          date: rec.date,
        });
      });
    } else if (category === 'challenge') {
      const chRuns = runs.filter((r) => r.gameMode === 'challenge' || Boolean(r.challengeId));
      chRuns.forEach((r, idx) => {
        rows.push({
          rank: 0,
          id: `${r.id}_${idx}`,
          name: `${playerName} · Challenge`,
          score: r.score,
          secondaryLabel: `${r.pipesPassed} pipes · ${r.durationSec.toFixed(1)}s`,
          isAI: false,
          isPlayer: true,
          characterId: r.characterId,
          worldId: r.worldId,
          date: r.date,
        });
      });
    } else if (category === 'tournament') {
      const players = leaderboardManager.getTopPlayers();
      players.forEach((p) => {
        rows.push({
          rank: 0,
          id: `t_${p.name}`,
          name: p.name,
          score: p.bestScore,
          secondaryLabel: `${p.wins}W-${p.losses}L-${p.draws}D · Streak ${p.bestWinStreak}`,
          isAI: false,
          isPlayer: false,
          date: p.lastPlayedAt,
        });
      });
    }

    rows.sort((a, b) => b.score - a.score || (b.date ?? 0) - (a.date ?? 0));
    return rows.map((row, idx) => ({ ...row, rank: idx + 1 }));
  }

  /**
   * Computes isolated Player 1 vs Player 2 local competitive head-to-head telemetry
   * directly from LeaderboardManager's persisted local match history.
   */
  public getTwoPlayerHeadToHead(): TwoPlayerHeadToHeadSummary {
    const names = loadStoredPlayerNames();
    const p1Name = names.player1Name || 'PLAYER 1';
    const p2Name = names.player2Name || 'PLAYER 2';
    const p1Lb = leaderboardManager.getPlayerStats(p1Name, 'PLAYER 1');
    const p2Lb = leaderboardManager.getPlayerStats(p2Name, 'PLAYER 2');
    const history = leaderboardManager.getMatchHistory();

    // Calculate real average scores & streaks across recorded matches
    const p1Scores: number[] = [];
    const p2Scores: number[] = [];
    let h2hP1Wins = 0;
    let h2hP2Wins = 0;
    let h2hDraws = 0;

    for (const m of history) {
      if (m.player1Name === p1Name && m.player2Name === p2Name) {
        p1Scores.push(m.player1BestScore);
        p2Scores.push(m.player2BestScore);
        if (m.winner === 'player1') h2hP1Wins += 1;
        else if (m.winner === 'player2') h2hP2Wins += 1;
        else h2hDraws += 1;
      } else if (m.player1Name === p2Name && m.player2Name === p1Name) {
        p1Scores.push(m.player2BestScore);
        p2Scores.push(m.player1BestScore);
        if (m.winner === 'player2') h2hP1Wins += 1;
        else if (m.winner === 'player1') h2hP2Wins += 1;
        else h2hDraws += 1;
      }
    }

    const avg = (arr: number[]) =>
      arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 0;

    const p1Wins = p1Lb?.wins ?? h2hP1Wins;
    const p1Losses = p1Lb?.losses ?? h2hP2Wins;
    const p1Draws = p1Lb?.draws ?? h2hDraws;
    const p1Played = p1Wins + p1Losses + p1Draws;

    const p2Wins = p2Lb?.wins ?? h2hP2Wins;
    const p2Losses = p2Lb?.losses ?? h2hP1Wins;
    const p2Draws = p2Lb?.draws ?? h2hDraws;
    const p2Played = p2Wins + p2Losses + p2Draws;

    const lastMatch = history[0] ?? null;
    const lastMatchSummary = lastMatch
      ? `${lastMatch.player1Name} (${lastMatch.player1BestScore}) vs ${lastMatch.player2Name} (${lastMatch.player2BestScore})`
      : null;

    const awards: TwoPlayerHeadToHeadSummary['awards'] = [];
    if ((p1Lb?.bestScore ?? 0) > 0 || (p2Lb?.bestScore ?? 0) > 0) {
      const p1Best = p1Lb?.bestScore ?? 0;
      const p2Best = p2Lb?.bestScore ?? 0;
      awards.push({
        id: 'high_scorer',
        label: 'Duel High Scorer',
        winnerName: p1Best >= p2Best ? p1Name : p2Name,
        valueLabel: `${Math.max(p1Best, p2Best)} pts`,
      });
    }
    if ((p1Lb?.bestWinStreak ?? 0) > 0 || (p2Lb?.bestWinStreak ?? 0) > 0) {
      const s1 = p1Lb?.bestWinStreak ?? 0;
      const s2 = p2Lb?.bestWinStreak ?? 0;
      awards.push({
        id: 'streak_king',
        label: 'Longest Win Streak',
        winnerName: s1 >= s2 ? p1Name : p2Name,
        valueLabel: `${Math.max(s1, s2)} wins`,
      });
    }
    if (p1Wins > 0 || p2Wins > 0) {
      awards.push({
        id: 'arena_leader',
        label: 'Arena Wins Leader',
        winnerName: p1Wins >= p2Wins ? p1Name : p2Name,
        valueLabel: `${Math.max(p1Wins, p2Wins)}W`,
      });
    }

    return {
      p1Name,
      p2Name,
      p1Wins,
      p1Losses,
      p1Draws,
      p1BestScore: p1Lb?.bestScore ?? 0,
      p1AvgScore: avg(p1Scores),
      p1HighestStreak: p1Lb?.bestWinStreak ?? 0,
      p1CurrentStreak: p1Lb?.currentWinStreak ?? 0,
      p1WinRatePercent: p1Played > 0 ? Math.round((p1Wins / p1Played) * 100) : 0,
      p2Wins,
      p2Losses,
      p2Draws,
      p2BestScore: p2Lb?.bestScore ?? 0,
      p2AvgScore: avg(p2Scores),
      p2HighestStreak: p2Lb?.bestWinStreak ?? 0,
      p2CurrentStreak: p2Lb?.currentWinStreak ?? 0,
      p2WinRatePercent: p2Played > 0 ? Math.round((p2Wins / p2Played) * 100) : 0,
      totalMatches: history.length,
      lastMatchSummary,
      lastMatchDate: lastMatch?.playedAt ?? null,
      awards,
    };
  }

  private enqueueNotifications(items: CompetitiveNotificationItem[]): void {
    if (items.length === 0) return;
    this.notificationQueue = [...this.notificationQueue, ...items].slice(-MAX_NOTIFICATION_QUEUE);
    this.notifyQueueListeners();
  }

  private notifyAll(): void {
    const snap = this.getSnapshot();
    for (const l of this.listeners) {
      l(snap);
    }
  }

  private notifyQueueListeners(): void {
    const list = this.getPendingNotifications();
    for (const l of this.notificationListeners) {
      l(list);
    }
  }

  private load(): void {
    this.records.reset();
    this.history.reset();
    this.rivals.reset();
    this.challenges.reset();
    this.rank.reset();
    this.totalCompetitiveRuns = 0;
    this.totalChallengeRuns = 0;
    this.unlockedCompetitiveBadges = [];
    this.lastPersonalBestBreak = null;

    try {
      const raw = window.localStorage.getItem(COMPETITIVE_STORAGE_KEY);
      if (!raw) {
        this.challenges.ensureCurrentPeriods(this.nowProvider());
        return;
      }
      const parsed = JSON.parse(raw) as Partial<StoredCompetitivePayload>;
      if (!parsed || typeof parsed !== 'object') {
        this.challenges.ensureCurrentPeriods(this.nowProvider());
        return;
      }

      this.rank.hydrate(parsed.rankPoints, parsed.claimedPointEvents);

      if (parsed.records && typeof parsed.records === 'object') {
        this.records.hydrate(
          parsed.records.records,
          parsed.records.recentRecords,
          parsed.records.totalBreaks
        );
      }

      this.history.hydrate(parsed.history);

      if (parsed.rivals && typeof parsed.rivals === 'object') {
        this.rivals.hydrate(
          parsed.rivals.selectedRivalId,
          parsed.rivals.standings,
          parsed.rivals.history,
          parsed.rivals.totalDefeated,
          parsed.rivals.legendDefeatedCount
        );
      }

      if (parsed.challenges && typeof parsed.challenges === 'object') {
        this.challenges.hydrate(parsed.challenges);
      } else {
        this.challenges.ensureCurrentPeriods(this.nowProvider());
      }

      if (parsed.stats && typeof parsed.stats === 'object') {
        this.totalCompetitiveRuns =
          typeof parsed.stats.totalCompetitiveRuns === 'number' &&
          parsed.stats.totalCompetitiveRuns >= 0
            ? Math.floor(parsed.stats.totalCompetitiveRuns)
            : 0;
        this.totalChallengeRuns =
          typeof parsed.stats.totalChallengeRuns === 'number' &&
          parsed.stats.totalChallengeRuns >= 0
            ? Math.floor(parsed.stats.totalChallengeRuns)
            : 0;
      }

      if (Array.isArray(parsed.unlockedCompetitiveBadges)) {
        this.unlockedCompetitiveBadges = parsed.unlockedCompetitiveBadges.filter(
          (b): b is string => typeof b === 'string' && b.length > 0
        );
      }
    } catch {
      this.records.reset();
      this.history.reset();
      this.rivals.reset();
      this.challenges.reset();
      this.rank.reset();
      this.totalCompetitiveRuns = 0;
      this.totalChallengeRuns = 0;
      this.unlockedCompetitiveBadges = [];
    }
  }

  private save(): void {
    try {
      const rankState = this.rank.exportState();
      const payload: StoredCompetitivePayload = {
        version: COMPETITIVE_STORAGE_VERSION,
        rankPoints: rankState.points,
        claimedPointEvents: rankState.claimedEvents,
        records: this.records.exportState(),
        history: this.history.exportState(),
        rivals: this.rivals.exportState(),
        challenges: this.challenges.exportState(),
        stats: {
          totalCompetitiveRuns: this.totalCompetitiveRuns,
          totalChallengeRuns: this.totalChallengeRuns,
        },
        unlockedCompetitiveBadges: [...this.unlockedCompetitiveBadges],
      };
      window.localStorage.setItem(COMPETITIVE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage errors in private mode
    }
  }
}

export const competitiveManager = new CompetitiveManager();
