import { SkinId } from '../character/CharacterSkinManager';
import { MatchFormat } from '../TwoPlayerMatch';
import { WorldId } from '../worlds/WorldRegistry';

export const COMPETITIVE_STORAGE_VERSION = 1;

export type CompetitiveGameMode = 'solo' | 'challenge' | 'quick' | 'bo3' | 'bo5';

export type PersonalRecordType =
  | 'highest_score'
  | 'green_valley_best'
  | 'world_best'
  | 'character_best'
  | 'no_powerup_best'
  | 'solo_best'
  | 'challenge_best'
  | 'tournament_best'
  | 'longest_survival'
  | 'longest_pipe_streak'
  | 'best_perfect_run'
  | 'fastest_challenge_completion';

export interface PersonalRecordEntry {
  id: string;
  version: number;
  playerId: string;
  recordType: PersonalRecordType;
  scopeKey: string;
  label: string;
  score: number;
  value: number;
  date: number;
  worldId: WorldId;
  characterId: string;
  gameMode: CompetitiveGameMode;
  powerUpCount: number;
  usedPowerUp: boolean;
  runDurationSec: number;
  pipesPassed: number;
  challengeModifier: string | null;
}

export interface PersonalBestBreakEvent {
  id: string;
  recordType: PersonalRecordType;
  label: string;
  previousScore: number;
  newScore: number;
  delta: number;
  improvementPercent: number;
  date: number;
  characterId: string;
  worldId: WorldId;
  gameMode: CompetitiveGameMode;
  pipesPassed: number;
  runDurationSec: number;
  powerUpCount: number;
}

export interface ScoreHistoryEntry {
  id: string;
  version: number;
  playerId: string;
  score: number;
  date: number;
  characterId: string;
  worldId: WorldId;
  gameMode: CompetitiveGameMode;
  pipesPassed: number;
  powerUpCount: number;
  usedPowerUp: boolean;
  durationSec: number;
  isPerfectRun: boolean;
  challengeId: string | null;
  challengeModifier: string | null;
}

export interface ScoreHistoryStats {
  totalRecordedRuns: number;
  bestRun: number;
  averageScore: number;
  medianScore: number;
  recentTrend: 'up' | 'down' | 'flat' | 'insufficient';
  trendDelta: number;
  improvementRatePercent: number;
}

export type LocalLeaderboardCategory =
  | 'overall'
  | 'daily'
  | 'weekly'
  | 'world'
  | 'character'
  | 'challenge'
  | 'tournament';

export interface LocalLeaderboardRow {
  rank: number;
  id: string;
  name: string;
  score: number;
  secondaryLabel: string;
  isAI: boolean;
  isPlayer: boolean;
  aiDifficulty?: AIRivalDifficulty;
  characterId?: string;
  worldId?: WorldId;
  date?: number;
}

export type AIRivalDifficulty = 'ROOKIE' | 'CASUAL' | 'SKILLED' | 'EXPERT' | 'LEGEND';
export type RivalSourceType = 'ai' | 'player2' | 'local_profile' | 'personal_best';

export interface RivalProfile {
  id: string;
  name: string;
  sourceType: RivalSourceType;
  isAI: boolean;
  aiDifficulty?: AIRivalDifficulty;
  targetScore: number;
  description: string;
  avatarEmoji: string;
  characterId: string;
}

export interface RivalryHistoryEntry {
  id: string;
  rivalId: string;
  rivalName: string;
  isAI: boolean;
  playerScore: number;
  rivalScore: number;
  gap: number;
  result: 'win' | 'loss' | 'draw';
  date: number;
  worldId: WorldId;
  gameMode: CompetitiveGameMode;
}

export interface RivalStanding {
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  bestGap: number;
  lastPlayerScore: number | null;
  lastGap: number | null;
}

export type ChallengeType =
  | 'score_target'
  | 'survival'
  | 'pipe_challenge'
  | 'no_powerup'
  | 'limited_power'
  | 'coin_collector'
  | 'perfect_run'
  | 'world_challenge'
  | 'character_challenge'
  | 'speed_challenge';

export type ChallengeDifficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXTREME';

export interface ChallengeRuleModifier {
  disablePowerUps?: boolean;
  maxPowerUps?: number;
  requirePerfectRun?: boolean;
  requiredWorldId?: WorldId;
  requiredCharacterId?: string;
  timeLimitSec?: number;
}

export interface ChallengeReward {
  coins: number;
  gems: number;
  xp: number;
  competitivePoints: number;
  badgeId?: string;
  titleId?: string;
  skinId?: SkinId;
}

export interface ChallengeDefinition {
  id: string;
  type: ChallengeType;
  difficulty: ChallengeDifficulty;
  title: string;
  description: string;
  ruleSummary: string;
  metric: 'score' | 'duration_sec' | 'pipes' | 'coins';
  targetValue: number;
  modifiers: ChallengeRuleModifier;
  reward: ChallengeReward;
  isCumulative?: boolean;
}

export type ChallengeStatus = 'active' | 'completed' | 'claimed';

export interface ChallengeProgressItem extends ChallengeDefinition {
  progress: number;
  status: ChallengeStatus;
  bestAttemptValue: number;
  completedAt: number | null;
  claimedAt: number | null;
  fastestCompletionSec: number | null;
  eligible: boolean;
  ineligibleReason?: string;
}

export interface DailyChallengeState {
  dateKey: string;
  challengeId: string;
  progress: number;
  status: ChallengeStatus;
  completedAt: number | null;
  claimedAt: number | null;
}

export interface WeeklyChallengeState {
  weekKey: string;
  challengeId: string;
  progress: number;
  status: ChallengeStatus;
  completedAt: number | null;
  claimedAt: number | null;
}

export interface GhostFrame {
  t: number; // seconds elapsed since run start
  y: number;
  rot: number;
}

export interface GhostRunRecording {
  id: string;
  version: number;
  label: string;
  characterId: string;
  skinId: SkinId;
  worldId: WorldId;
  score: number;
  durationSec: number;
  recordedAt: number;
  frames: GhostFrame[];
}

export interface GhostReplaySample {
  x: number;
  y: number;
  rot: number;
  characterId: string;
  skinId: SkinId;
  label: string;
  score: number;
  finished: boolean;
}

export type CompetitiveRankTier =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'LEGEND';

export interface CompetitiveRankInfo {
  tier: CompetitiveRankTier;
  label: string;
  points: number;
  minPoints: number;
  nextTierLabel: string | null;
  nextTierPoints: number | null;
  progressPercent: number;
  colorHex: string;
}

export type CompetitiveNotificationType =
  | 'NEW_PERSONAL_BEST'
  | 'RIVAL_DEFEATED'
  | 'CHALLENGE_COMPLETED'
  | 'NEW_RANK'
  | 'RECORD_BROKEN'
  | 'WEEKLY_CHALLENGE_COMPLETE';

export interface CompetitiveNotificationItem {
  id: string;
  type: CompetitiveNotificationType;
  title: string;
  subtitle: string;
  accentHex: string;
  createdAt: number;
  pbEvent?: PersonalBestBreakEvent;
}

export interface CompetitiveStatistics {
  totalCompetitiveRuns: number;
  totalChallengeRuns: number;
  challengesCompleted: number;
  challengesClaimed: number;
  dailyChallengesCompleted: number;
  weeklyChallengesCompleted: number;
  perfectRunsCompleted: number;
  personalBestBreaks: number;
  rivalsDefeated: number;
  legendRivalDefeatedCount: number;
  totalCompetitivePoints: number;
  winRatePercent: number;
}

export interface CompletedRunInput {
  runId: string;
  score: number;
  pipesPassed: number;
  durationSec: number;
  worldId: WorldId;
  characterId: string;
  skinId: SkinId;
  gameMode: CompetitiveGameMode;
  powerUpCount: number;
  usedPowerUp: boolean;
  usedShield: boolean;
  usedSecondChance: boolean;
  collided: boolean;
  coinsCollected: number;
  activeChallengeId: string | null;
  ghostFrames?: GhostFrame[];
  nowMs?: number;
}

export interface TwoPlayerHeadToHeadSummary {
  p1Name: string;
  p2Name: string;
  p1Wins: number;
  p1Losses: number;
  p1Draws: number;
  p1BestScore: number;
  p1AvgScore: number;
  p1HighestStreak: number;
  p1CurrentStreak: number;
  p1WinRatePercent: number;
  p2Wins: number;
  p2Losses: number;
  p2Draws: number;
  p2BestScore: number;
  p2AvgScore: number;
  p2HighestStreak: number;
  p2CurrentStreak: number;
  p2WinRatePercent: number;
  totalMatches: number;
  lastMatchSummary: string | null;
  lastMatchDate: number | null;
  awards: Array<{ id: string; label: string; winnerName: string; valueLabel: string }>;
}

export interface TwoPlayerMatchCompetitiveInput {
  matchId: string;
  format: MatchFormat;
  winner: 'player1' | 'player2' | 'draw' | null;
  player1Name: string;
  player2Name: string;
  player1Best: number;
  player2Best: number;
  worldId: WorldId;
}

export interface CompetitiveSnapshot {
  version: number;
  rank: CompetitiveRankInfo;
  highestScore: number;
  totalRecordsCount: number;
  records: PersonalRecordEntry[];
  recentRecords: PersonalRecordEntry[];
  scoreHistory: ScoreHistoryEntry[];
  historyStats: ScoreHistoryStats;
  selectedRival: RivalProfile;
  allRivals: RivalProfile[];
  selectedRivalStanding: RivalStanding;
  rivalryHistory: RivalryHistoryEntry[];
  dailyChallenge: ChallengeProgressItem & { dateKey: string; msUntilReset: number };
  weeklyChallenge: ChallengeProgressItem & { weekKey: string; msUntilReset: number };
  challenges: ChallengeProgressItem[];
  stats: CompetitiveStatistics;
  hasPbGhost: boolean;
  hasPrevGhost: boolean;
  pbGhostScore: number;
  prevGhostScore: number;
  unlockedCompetitiveBadges: string[];
  lastPersonalBestBreak: PersonalBestBreakEvent | null;
}
