export type DifficultyTierId = 'easy' | 'medium' | 'hard' | 'expert';

export interface DifficultyTierThreshold {
  id: DifficultyTierId;
  label: string;
  minScore: number;
  maxScore: number | null;
}

export const DIFFICULTY_CONFIG = {
  basePipeSpeed: 168,
  maxPipeSpeed: 242,

  baseGap: 176,
  minGap: 144,

  baseSpawnInterval: 1.58,
  minSpawnInterval: 1.2,

  baseMaxStepDelta: 165,
  maxStepDelta: 205,

  // Target horizontal distance between pipes keeps reaction windows consistent
  targetPipeSpacing: 274,

  // Score at which progression reaches peak expert difficulty smoothly
  fullProgressionScore: 40,

  tiers: [
    { id: 'easy', label: 'EASY', minScore: 0, maxScore: 4 },
    { id: 'medium', label: 'MEDIUM', minScore: 5, maxScore: 9 },
    { id: 'hard', label: 'HARD', minScore: 10, maxScore: 19 },
    { id: 'expert', label: 'EXPERT', minScore: 20, maxScore: null },
  ] as DifficultyTierThreshold[],
} as const;
