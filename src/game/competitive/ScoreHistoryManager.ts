import { WorldId } from '../worlds/WorldRegistry';
import {
  COMPETITIVE_STORAGE_VERSION,
  CompletedRunInput,
  ScoreHistoryEntry,
  ScoreHistoryStats,
} from './CompetitiveTypes';

export const MAX_SCORE_HISTORY_RUNS = 20;

export class ScoreHistoryManager {
  private entries: ScoreHistoryEntry[] = [];

  public hydrate(raw: unknown): void {
    this.entries = [];
    if (!Array.isArray(raw)) return;
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const e = item as Partial<ScoreHistoryEntry>;
      if (typeof e.score !== 'number' || !Number.isFinite(e.score)) continue;
      this.entries.push({
        id: typeof e.id === 'string' ? e.id : `run_${Date.now()}_${this.entries.length}`,
        version: typeof e.version === 'number' ? e.version : COMPETITIVE_STORAGE_VERSION,
        playerId: typeof e.playerId === 'string' ? e.playerId : 'local_player',
        score: Math.max(0, Math.floor(e.score)),
        date: typeof e.date === 'number' && Number.isFinite(e.date) ? e.date : Date.now(),
        characterId: typeof e.characterId === 'string' ? e.characterId : 'classic_bird',
        worldId: (typeof e.worldId === 'string' ? e.worldId : 'green_valley') as WorldId,
        gameMode: (typeof e.gameMode === 'string' ? e.gameMode : 'solo') as ScoreHistoryEntry['gameMode'],
        pipesPassed: typeof e.pipesPassed === 'number' && Number.isFinite(e.pipesPassed) ? Math.max(0, Math.floor(e.pipesPassed)) : 0,
        powerUpCount: typeof e.powerUpCount === 'number' && Number.isFinite(e.powerUpCount) ? Math.max(0, Math.floor(e.powerUpCount)) : 0,
        usedPowerUp: Boolean(e.usedPowerUp),
        durationSec: typeof e.durationSec === 'number' && Number.isFinite(e.durationSec) ? Math.max(0, e.durationSec) : 0,
        isPerfectRun: Boolean(e.isPerfectRun),
        challengeId: typeof e.challengeId === 'string' ? e.challengeId : null,
        challengeModifier: typeof e.challengeModifier === 'string' ? e.challengeModifier : null,
      });
    }
    this.entries = this.entries.slice(0, MAX_SCORE_HISTORY_RUNS);
  }

  public exportState(): ScoreHistoryEntry[] {
    return [...this.entries];
  }

  public reset(): void {
    this.entries = [];
  }

  public addCompletedRun(input: CompletedRunInput, playerId = 'local_player'): ScoreHistoryEntry {
    const entry: ScoreHistoryEntry = {
      id: input.runId || `run_${Date.now()}`,
      version: COMPETITIVE_STORAGE_VERSION,
      playerId,
      score: Math.max(0, Math.floor(input.score)),
      date: input.nowMs ?? Date.now(),
      characterId: input.characterId,
      worldId: input.worldId,
      gameMode: input.gameMode,
      pipesPassed: Math.max(0, Math.floor(input.pipesPassed)),
      powerUpCount: Math.max(0, Math.floor(input.powerUpCount)),
      usedPowerUp: Boolean(input.usedPowerUp),
      durationSec: Math.max(0, Number(input.durationSec.toFixed(2))),
      isPerfectRun: !input.usedShield && !input.usedSecondChance && input.score > 0,
      challengeId: input.activeChallengeId,
      challengeModifier: input.activeChallengeId,
    };

    // Deduplicate identical runId if emitted twice
    this.entries = [entry, ...this.entries.filter((e) => e.id !== entry.id)].slice(
      0,
      MAX_SCORE_HISTORY_RUNS
    );
    return entry;
  }

  public getHistory(): ScoreHistoryEntry[] {
    return [...this.entries];
  }

  public getPreviousRunScore(): number | null {
    return this.entries.length > 0 ? this.entries[0].score : null;
  }

  public getStats(): ScoreHistoryStats {
    const count = this.entries.length;
    if (count === 0) {
      return {
        totalRecordedRuns: 0,
        bestRun: 0,
        averageScore: 0,
        medianScore: 0,
        recentTrend: 'insufficient',
        trendDelta: 0,
        improvementRatePercent: 0,
      };
    }

    const scores = this.entries.map((e) => e.score);
    const bestRun = Math.max(...scores);
    const sum = scores.reduce((acc, v) => acc + v, 0);
    const averageScore = Number((sum / count).toFixed(1));

    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const medianScore =
      sorted.length % 2 === 1
        ? sorted[mid]
        : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1));

    if (count < 4) {
      return {
        totalRecordedRuns: count,
        bestRun,
        averageScore,
        medianScore,
        recentTrend: 'insufficient',
        trendDelta: 0,
        improvementRatePercent: 0,
      };
    }

    // entries[0] is newest -> compare newest half vs older half
    const split = Math.floor(count / 2);
    const recentHalf = scores.slice(0, split);
    const olderHalf = scores.slice(split);
    const recentAvg = recentHalf.reduce((a, b) => a + b, 0) / recentHalf.length;
    const olderAvg = olderHalf.reduce((a, b) => a + b, 0) / olderHalf.length;
    const trendDelta = Number((recentAvg - olderAvg).toFixed(1));
    const recentTrend: ScoreHistoryStats['recentTrend'] =
      trendDelta >= 0.75 ? 'up' : trendDelta <= -0.75 ? 'down' : 'flat';
    const improvementRatePercent =
      olderAvg > 0
        ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100)
        : recentAvg > 0
          ? 100
          : 0;

    return {
      totalRecordedRuns: count,
      bestRun,
      averageScore,
      medianScore,
      recentTrend,
      trendDelta,
      improvementRatePercent,
    };
  }
}
