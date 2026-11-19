export interface GameStats {
  totalGamesPlayed: number;
  totalPipesPassed: number;
  bestScore: number;
  highestScoreMilestone: number;
  recentScores: number[];
}

const STATS_STORAGE_KEY = 'flappy_face_stats';

const DEFAULT_STATS: GameStats = {
  totalGamesPlayed: 0,
  totalPipesPassed: 0,
  bestScore: 0,
  highestScoreMilestone: 0,
  recentScores: [],
};

const MILESTONES = [1, 5, 10, 25, 50, 100];

function computeMilestone(score: number): number {
  let highest = 0;
  for (const m of MILESTONES) {
    if (score >= m) highest = m;
  }
  return highest;
}

export class StatsManager {
  private stats: GameStats;
  private listeners = new Set<(stats: GameStats) => void>();

  constructor() {
    this.stats = this.load();
  }

  public getStats(): GameStats {
    return {
      ...this.stats,
      recentScores: [...this.stats.recentScores],
    };
  }

  public subscribe(listener: (stats: GameStats) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public recordPipePassed(currentRunScore: number): void {
    this.stats.totalPipesPassed += 1;
    if (currentRunScore > this.stats.bestScore) {
      this.stats.bestScore = currentRunScore;
    }
    const milestone = computeMilestone(this.stats.bestScore);
    if (milestone > this.stats.highestScoreMilestone) {
      this.stats.highestScoreMilestone = milestone;
    }
    this.save();
    this.notify();
  }

  public recordGameCompleted(finalScore: number): void {
    const safeScore = Math.max(0, Math.floor(finalScore));
    this.stats.totalGamesPlayed += 1;
    if (safeScore > this.stats.bestScore) {
      this.stats.bestScore = safeScore;
    }
    const milestone = computeMilestone(this.stats.bestScore);
    if (milestone > this.stats.highestScoreMilestone) {
      this.stats.highestScoreMilestone = milestone;
    }
    this.stats.recentScores = [...this.stats.recentScores, safeScore].slice(-8);
    this.save();
    this.notify();
  }

  public syncBestScore(bestScore: number): void {
    const safeBest = Math.max(0, Math.floor(bestScore));
    if (safeBest > this.stats.bestScore) {
      this.stats.bestScore = safeBest;
      this.stats.highestScoreMilestone = Math.max(
        this.stats.highestScoreMilestone,
        computeMilestone(safeBest)
      );
      this.save();
      this.notify();
    }
  }

  public reset(): void {
    this.stats = {
      ...DEFAULT_STATS,
      recentScores: [],
    };
    this.save();
    this.notify();
  }

  private notify(): void {
    const snap = this.getStats();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private load(): GameStats {
    try {
      const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATS, recentScores: [] };
      const parsed = JSON.parse(raw) as Partial<GameStats> & { version?: number };
      if (!parsed || typeof parsed !== 'object') {
        return { ...DEFAULT_STATS, recentScores: [] };
      }
      const recent = Array.isArray(parsed.recentScores)
        ? parsed.recentScores
            .filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0)
            .slice(-8)
        : [];
      return {
        totalGamesPlayed:
          typeof parsed.totalGamesPlayed === 'number' && parsed.totalGamesPlayed >= 0
            ? Math.floor(parsed.totalGamesPlayed)
            : 0,
        totalPipesPassed:
          typeof parsed.totalPipesPassed === 'number' && parsed.totalPipesPassed >= 0
            ? Math.floor(parsed.totalPipesPassed)
            : 0,
        bestScore:
          typeof parsed.bestScore === 'number' && parsed.bestScore >= 0
            ? Math.floor(parsed.bestScore)
            : 0,
        highestScoreMilestone:
          typeof parsed.highestScoreMilestone === 'number' && parsed.highestScoreMilestone >= 0
            ? Math.floor(parsed.highestScoreMilestone)
            : 0,
        recentScores: recent,
      };
    } catch {
      return { ...DEFAULT_STATS, recentScores: [] };
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(
        STATS_STORAGE_KEY,
        JSON.stringify({ version: 1, ...this.stats })
      );
    } catch {
      // Ignore restricted storage
    }
  }
}

export const statsManager = new StatsManager();
