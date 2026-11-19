import { DIFFICULTY_CONFIG, DifficultyTierId } from './DifficultyConfig';

export interface DifficultySnapshot {
  tier: DifficultyTierId;
  tierLabel: string;
  speed: number;
  gap: number;
  spawnInterval: number;
  maxStepDelta: number;
  difficultyMultiplier: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export class DifficultyManager {
  public getTierForScore(score: number): { id: DifficultyTierId; label: string } {
    const safeScore = Math.max(0, Math.floor(score));
    for (let i = DIFFICULTY_CONFIG.tiers.length - 1; i >= 0; i--) {
      const tier = DIFFICULTY_CONFIG.tiers[i];
      if (safeScore >= tier.minScore) {
        return { id: tier.id, label: tier.label };
      }
    }
    return { id: 'easy', label: 'EASY' };
  }

  public getForScore(score: number): DifficultySnapshot {
    const safeScore = Math.max(0, Math.floor(score));
    const tierInfo = this.getTierForScore(safeScore);

    // Smooth ease-out curve so difficulty rises gently early and stabilizes fairly in Expert
    const linearT = clamp(safeScore / DIFFICULTY_CONFIG.fullProgressionScore, 0, 1);
    const smoothT = 1 - Math.pow(1 - linearT, 1.45);

    const speed = lerp(
      DIFFICULTY_CONFIG.basePipeSpeed,
      DIFFICULTY_CONFIG.maxPipeSpeed,
      smoothT
    );

    const gap = lerp(DIFFICULTY_CONFIG.baseGap, DIFFICULTY_CONFIG.minGap, smoothT);

    // Keep horizontal distance roughly consistent as speed rises, bounded cleanly
    const spacingBasedInterval = DIFFICULTY_CONFIG.targetPipeSpacing / speed;
    const spawnInterval = clamp(
      spacingBasedInterval,
      DIFFICULTY_CONFIG.minSpawnInterval,
      DIFFICULTY_CONFIG.baseSpawnInterval
    );

    const maxStepDelta = lerp(
      DIFFICULTY_CONFIG.baseMaxStepDelta,
      DIFFICULTY_CONFIG.maxStepDelta,
      smoothT
    );

    return {
      tier: tierInfo.id,
      tierLabel: tierInfo.label,
      speed: Number(speed.toFixed(2)),
      gap: Number(gap.toFixed(2)),
      spawnInterval: Number(spawnInterval.toFixed(3)),
      maxStepDelta: Number(maxStepDelta.toFixed(2)),
      difficultyMultiplier: Number((speed / DIFFICULTY_CONFIG.basePipeSpeed).toFixed(2)),
    };
  }
}

export const difficultyManager = new DifficultyManager();
