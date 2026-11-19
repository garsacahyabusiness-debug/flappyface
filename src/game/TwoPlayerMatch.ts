export type PlayerSlot = 1 | 2;
export type MatchWinner = 'player1' | 'player2' | 'draw';
export type MatchFormat = 'quick' | 'bo3' | 'bo5';

export type MatchStatus =
  | 'setup'
  | 'round_1'
  | 'player_1_done'
  | 'turn_transition'
  | 'round_2'
  | 'round_result'
  | 'completed';

export interface RoundResultRecord {
  roundNumber: number;
  player1Score: number;
  player2Score: number;
  winner: MatchWinner;
}

export interface TwoPlayerMatchData {
  format: MatchFormat;
  targetWins: number;
  maxRounds: number;
  currentRound: number;
  player1Name: string;
  player2Name: string;
  player1Wins: number;
  player2Wins: number;
  draws: number;
  player1TotalScore: number;
  player2TotalScore: number;
  player1BestRoundScore: number;
  player2BestRoundScore: number;
  player1Score: number | null;
  player2Score: number | null;
  rounds: RoundResultRecord[];
  lastRoundWinner: MatchWinner | null;
  startedAt: number | null;
  completedAt: number | null;
  status: MatchStatus;
  winner: MatchWinner | null;
  recordedToHistory: boolean;
}

export interface TwoPlayerStoredNames {
  version?: number;
  player1Name: string;
  player2Name: string;
  preferredFormat?: MatchFormat;
}

export interface MatchFormatMeta {
  id: MatchFormat;
  label: string;
  shortLabel: string;
  targetWins: number;
  maxRounds: number;
  subtitle: string;
}

export const MATCH_FORMAT_CONFIG: Record<MatchFormat, MatchFormatMeta> = {
  quick: {
    id: 'quick',
    label: 'QUICK MATCH',
    shortLabel: '1 ROUND',
    targetWins: 1,
    maxRounds: 1,
    subtitle: '1 Ronde · Skor tertinggi menang',
  },
  bo3: {
    id: 'bo3',
    label: 'BEST OF 3',
    shortLabel: 'BO3',
    targetWins: 2,
    maxRounds: 3,
    subtitle: 'Target 2 Kemenangan · Maks 3 Ronde',
  },
  bo5: {
    id: 'bo5',
    label: 'BEST OF 5',
    shortLabel: 'BO5',
    targetWins: 3,
    maxRounds: 5,
    subtitle: 'Target 3 Kemenangan · Maks 5 Ronde',
  },
};

const NAMES_STORAGE_KEY = 'flappy_face_2p_names';
const NAMES_STORAGE_VERSION = 2;

const TURN_MESSAGES: readonly string[] = [
  'Sekarang giliran kamu!',
  'Bisa ngalahin skor lawan?',
  'Jangan kasih kemenangan gratis!',
];

export function sanitizePlayerName(raw: string, fallback: 'PLAYER 1' | 'PLAYER 2'): string {
  // Strip control characters and angle/quote symbols to keep stored/rendered names plain text
  const stripped = String(raw ?? '').replace(/[<>"'&\x00-\x1F\x7F]/g, '');
  const cleaned = stripped.trim().replace(/\s+/g, ' ').slice(0, 14);
  return cleaned.length > 0 ? cleaned.toUpperCase() : fallback;
}

export function isMatchFormat(val: unknown): val is MatchFormat {
  return val === 'quick' || val === 'bo3' || val === 'bo5';
}

export function resolveMatchWinner(player1Score: number, player2Score: number): MatchWinner {
  if (player1Score > player2Score) return 'player1';
  if (player2Score > player1Score) return 'player2';
  return 'draw';
}

export function pickTurnChallengeMessage(player1Score: number): string {
  if (player1Score === 0) {
    return 'Lawan baru score 0, jangan kepleset ya!';
  }
  const index = Math.abs(player1Score) % TURN_MESSAGES.length;
  return TURN_MESSAGES[index];
}

export function loadStoredPlayerNames(): {
  player1Name: string;
  player2Name: string;
  preferredFormat: MatchFormat;
} {
  try {
    const raw = window.localStorage.getItem(NAMES_STORAGE_KEY);
    if (!raw) {
      return { player1Name: 'PLAYER 1', player2Name: 'PLAYER 2', preferredFormat: 'quick' };
    }
    const parsed = JSON.parse(raw) as Partial<TwoPlayerStoredNames>;
    return {
      player1Name: sanitizePlayerName(parsed.player1Name ?? '', 'PLAYER 1'),
      player2Name: sanitizePlayerName(parsed.player2Name ?? '', 'PLAYER 2'),
      preferredFormat: isMatchFormat(parsed.preferredFormat) ? parsed.preferredFormat : 'quick',
    };
  } catch {
    return { player1Name: 'PLAYER 1', player2Name: 'PLAYER 2', preferredFormat: 'quick' };
  }
}

export function saveStoredPlayerNames(
  player1Name: string,
  player2Name: string,
  preferredFormat?: MatchFormat
): { player1Name: string; player2Name: string; preferredFormat: MatchFormat } {
  const existing = loadStoredPlayerNames();
  const resolvedFormat = preferredFormat ?? existing.preferredFormat;
  const normalized = {
    version: NAMES_STORAGE_VERSION,
    player1Name: sanitizePlayerName(player1Name, 'PLAYER 1'),
    player2Name: sanitizePlayerName(player2Name, 'PLAYER 2'),
    preferredFormat: resolvedFormat,
  };
  try {
    window.localStorage.setItem(NAMES_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage failures in restricted mode
  }
  return {
    player1Name: normalized.player1Name,
    player2Name: normalized.player2Name,
    preferredFormat: normalized.preferredFormat,
  };
}

export function resetStoredPlayerNames(): void {
  try {
    window.localStorage.removeItem(NAMES_STORAGE_KEY);
  } catch {
    // Ignore restricted storage
  }
}

export function createInitialMatchData(
  player1Name: string,
  player2Name: string,
  format: MatchFormat = 'quick'
): TwoPlayerMatchData {
  const meta = MATCH_FORMAT_CONFIG[format];
  return {
    format,
    targetWins: meta.targetWins,
    maxRounds: meta.maxRounds,
    currentRound: 1,
    player1Name: sanitizePlayerName(player1Name, 'PLAYER 1'),
    player2Name: sanitizePlayerName(player2Name, 'PLAYER 2'),
    player1Wins: 0,
    player2Wins: 0,
    draws: 0,
    player1TotalScore: 0,
    player2TotalScore: 0,
    player1BestRoundScore: 0,
    player2BestRoundScore: 0,
    player1Score: null,
    player2Score: null,
    rounds: [],
    lastRoundWinner: null,
    startedAt: null,
    completedAt: null,
    status: 'setup',
    winner: null,
    recordedToHistory: false,
  };
}

/**
 * Evaluates a completed round (after both Player 1 and Player 2 finish).
 * - Draw NEVER grants a win to either player.
 * - Tournament ends immediately when targetWins is clinched OR maxRounds is reached.
 */
export function finalizeRoundInMatch(
  match: TwoPlayerMatchData,
  p1RoundScore: number,
  p2RoundScore: number
): { updatedMatch: TwoPlayerMatchData; isMatchComplete: boolean } {
  const safeP1 = Math.max(0, Math.floor(p1RoundScore));
  const safeP2 = Math.max(0, Math.floor(p2RoundScore));
  const roundWinner = resolveMatchWinner(safeP1, safeP2);

  const nextP1Wins = match.player1Wins + (roundWinner === 'player1' ? 1 : 0);
  const nextP2Wins = match.player2Wins + (roundWinner === 'player2' ? 1 : 0);
  const nextDraws = match.draws + (roundWinner === 'draw' ? 1 : 0);

  const roundRecord: RoundResultRecord = {
    roundNumber: match.currentRound,
    player1Score: safeP1,
    player2Score: safeP2,
    winner: roundWinner,
  };

  const clinchedByWins =
    nextP1Wins >= match.targetWins || nextP2Wins >= match.targetWins;
  const reachedMaxRounds = match.currentRound >= match.maxRounds;
  const isMatchComplete = match.format === 'quick' || clinchedByWins || reachedMaxRounds;

  const overallWinner: MatchWinner | null = isMatchComplete
    ? match.format === 'quick'
      ? roundWinner
      : resolveMatchWinner(nextP1Wins, nextP2Wins)
    : null;

  const updatedMatch: TwoPlayerMatchData = {
    ...match,
    player1Wins: nextP1Wins,
    player2Wins: nextP2Wins,
    draws: nextDraws,
    player1TotalScore: match.player1TotalScore + safeP1,
    player2TotalScore: match.player2TotalScore + safeP2,
    player1BestRoundScore: Math.max(match.player1BestRoundScore, safeP1),
    player2BestRoundScore: Math.max(match.player2BestRoundScore, safeP2),
    player1Score: safeP1,
    player2Score: safeP2,
    rounds: [...match.rounds, roundRecord],
    lastRoundWinner: roundWinner,
    completedAt: isMatchComplete ? Date.now() : null,
    status: isMatchComplete ? 'completed' : 'round_result',
    winner: overallWinner,
  };

  return { updatedMatch, isMatchComplete };
}
