import { MatchFormat, MatchWinner, sanitizePlayerName, TwoPlayerMatchData } from '../TwoPlayerMatch';

export interface LeaderboardPlayerEntry {
  name: string;
  wins: number;
  losses: number;
  draws: number;
  championships: number;
  bestScore: number;
  currentWinStreak: number;
  bestWinStreak: number;
  matchesPlayed: number;
  lastPlayedAt: number;
}

export interface MatchHistoryEntry {
  id: string;
  playedAt: number;
  format: MatchFormat;
  player1Name: string;
  player2Name: string;
  player1Wins: number;
  player2Wins: number;
  player1BestScore: number;
  player2BestScore: number;
  draws: number;
  roundsPlayed: number;
  winner: MatchWinner;
}

interface StoredLeaderboardPayload {
  version: number;
  players: Record<string, LeaderboardPlayerEntry>;
  history: MatchHistoryEntry[];
}

const LEADERBOARD_STORAGE_KEY = 'flappy_face_leaderboard';
const STORAGE_VERSION = 1;
const MAX_HISTORY_ITEMS = 25;

function createEmptyPlayer(name: string, timestamp: number): LeaderboardPlayerEntry {
  return {
    name,
    wins: 0,
    losses: 0,
    draws: 0,
    championships: 0,
    bestScore: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    matchesPlayed: 0,
    lastPlayedAt: timestamp,
  };
}

function sanitizePositiveInt(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0) return 0;
  return Math.floor(val);
}

export class LeaderboardManager {
  private players: Record<string, LeaderboardPlayerEntry> = {};
  private history: MatchHistoryEntry[] = [];
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getTopPlayers(): LeaderboardPlayerEntry[] {
    return Object.values(this.players)
      .map((entry) => ({ ...entry }))
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.championships !== a.championships) return b.championships - a.championships;
        if (b.bestWinStreak !== a.bestWinStreak) return b.bestWinStreak - a.bestWinStreak;
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        return b.lastPlayedAt - a.lastPlayedAt;
      });
  }

  public getMatchHistory(): MatchHistoryEntry[] {
    return this.history.map((item) => ({ ...item }));
  }

  public getPlayerStats(rawName: string, fallback: 'PLAYER 1' | 'PLAYER 2' = 'PLAYER 1'): LeaderboardPlayerEntry | null {
    const clean = sanitizePlayerName(rawName, fallback);
    const entry = this.players[clean];
    return entry ? { ...entry } : null;
  }

  public recordCompletedMatch(match: TwoPlayerMatchData): void {
    if (match.status !== 'completed' || !match.winner) return;

    const now = match.completedAt ?? Date.now();
    const p1Name = sanitizePlayerName(match.player1Name, 'PLAYER 1');
    const p2Name = sanitizePlayerName(match.player2Name, 'PLAYER 2');
    const isTournament = match.format === 'bo3' || match.format === 'bo5';

    const p1 = this.players[p1Name] ?? createEmptyPlayer(p1Name, now);
    const p2 = this.players[p2Name] ?? createEmptyPlayer(p2Name, now);

    // Handle edge case where both players typed the same name
    const sameName = p1Name === p2Name;

    if (sameName) {
      p1.matchesPlayed += 1;
      p1.bestScore = Math.max(p1.bestScore, match.player1BestRoundScore, match.player2BestRoundScore);
      p1.lastPlayedAt = now;
      if (match.winner === 'draw') {
        p1.draws += 1;
      } else {
        p1.wins += 1;
        p1.currentWinStreak += 1;
        p1.bestWinStreak = Math.max(p1.bestWinStreak, p1.currentWinStreak);
        if (isTournament) p1.championships += 1;
      }
      this.players[p1Name] = p1;
    } else {
      p1.matchesPlayed += 1;
      p2.matchesPlayed += 1;
      p1.bestScore = Math.max(p1.bestScore, match.player1BestRoundScore);
      p2.bestScore = Math.max(p2.bestScore, match.player2BestRoundScore);
      p1.lastPlayedAt = now;
      p2.lastPlayedAt = now;

      if (match.winner === 'player1') {
        p1.wins += 1;
        p1.currentWinStreak += 1;
        p1.bestWinStreak = Math.max(p1.bestWinStreak, p1.currentWinStreak);
        if (isTournament) p1.championships += 1;

        p2.losses += 1;
        p2.currentWinStreak = 0;
      } else if (match.winner === 'player2') {
        p2.wins += 1;
        p2.currentWinStreak += 1;
        p2.bestWinStreak = Math.max(p2.bestWinStreak, p2.currentWinStreak);
        if (isTournament) p2.championships += 1;

        p1.losses += 1;
        p1.currentWinStreak = 0;
      } else {
        // Draw: neither grants a win nor breaks existing streak
        p1.draws += 1;
        p2.draws += 1;
      }

      this.players[p1Name] = p1;
      this.players[p2Name] = p2;
    }

    const historyItem: MatchHistoryEntry = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      playedAt: now,
      format: match.format,
      player1Name: p1Name,
      player2Name: p2Name,
      player1Wins: match.player1Wins,
      player2Wins: match.player2Wins,
      player1BestScore: match.player1BestRoundScore,
      player2BestScore: match.player2BestRoundScore,
      draws: match.draws,
      roundsPlayed: match.rounds.length,
      winner: match.winner,
    };

    this.history = [historyItem, ...this.history].slice(0, MAX_HISTORY_ITEMS);
    this.save();
    this.notify();
  }

  public reset(): void {
    this.players = {};
    this.history = [];
    this.save();
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private load(): void {
    try {
      const raw = window.localStorage.getItem(LEADERBOARD_STORAGE_KEY);
      if (!raw) {
        this.players = {};
        this.history = [];
        return;
      }
      const parsed = JSON.parse(raw) as Partial<StoredLeaderboardPayload>;
      if (!parsed || typeof parsed !== 'object') {
        this.players = {};
        this.history = [];
        return;
      }

      const cleanPlayers: Record<string, LeaderboardPlayerEntry> = {};
      if (parsed.players && typeof parsed.players === 'object') {
        for (const [key, val] of Object.entries(parsed.players)) {
          if (!val || typeof val !== 'object') continue;
          const cleanName = sanitizePlayerName(val.name ?? key, 'PLAYER 1');
          cleanPlayers[cleanName] = {
            name: cleanName,
            wins: sanitizePositiveInt(val.wins),
            losses: sanitizePositiveInt(val.losses),
            draws: sanitizePositiveInt(val.draws),
            championships: sanitizePositiveInt(val.championships),
            bestScore: sanitizePositiveInt(val.bestScore),
            currentWinStreak: sanitizePositiveInt(val.currentWinStreak),
            bestWinStreak: sanitizePositiveInt(val.bestWinStreak),
            matchesPlayed: sanitizePositiveInt(val.matchesPlayed),
            lastPlayedAt: sanitizePositiveInt(val.lastPlayedAt),
          };
        }
      }

      const cleanHistory: MatchHistoryEntry[] = [];
      if (Array.isArray(parsed.history)) {
        for (const item of parsed.history.slice(0, MAX_HISTORY_ITEMS)) {
          if (!item || typeof item !== 'object') continue;
          const fmt: MatchFormat =
            item.format === 'quick' || item.format === 'bo3' || item.format === 'bo5'
              ? item.format
              : 'quick';
          const win: MatchWinner =
            item.winner === 'player1' || item.winner === 'player2' || item.winner === 'draw'
              ? item.winner
              : 'draw';
          cleanHistory.push({
            id: typeof item.id === 'string' && item.id ? item.id : String(Math.random()),
            playedAt: sanitizePositiveInt(item.playedAt),
            format: fmt,
            player1Name: sanitizePlayerName(item.player1Name ?? '', 'PLAYER 1'),
            player2Name: sanitizePlayerName(item.player2Name ?? '', 'PLAYER 2'),
            player1Wins: sanitizePositiveInt(item.player1Wins),
            player2Wins: sanitizePositiveInt(item.player2Wins),
            player1BestScore: sanitizePositiveInt(item.player1BestScore),
            player2BestScore: sanitizePositiveInt(item.player2BestScore),
            draws: sanitizePositiveInt(item.draws),
            roundsPlayed: Math.max(1, sanitizePositiveInt(item.roundsPlayed)),
            winner: win,
          });
        }
      }

      this.players = cleanPlayers;
      this.history = cleanHistory;
    } catch {
      this.players = {};
      this.history = [];
    }
  }

  private save(): void {
    try {
      const payload: StoredLeaderboardPayload = {
        version: STORAGE_VERSION,
        players: this.players,
        history: this.history,
      };
      window.localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage failures in restricted mode
    }
  }
}

export const leaderboardManager = new LeaderboardManager();
