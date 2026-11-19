import { GAME_CONFIG, PipeTheme } from './Config';
import { Pipe } from './Pipe';
import { difficultyManager, DifficultySnapshot } from './progression/DifficultyManager';

const PIPE_THEMES: PipeTheme[] = ['green', 'mint', 'blue', 'purple'];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class PipeManager {
  private pipes: Pipe[] = [];
  private spawnTimer = 0;
  private lastGapY: number | null = null;
  private spawnedCount = 0;
  private currentDifficulty: DifficultySnapshot = difficultyManager.getForScore(0);

  public reset(): void {
    this.pipes = [];
    this.currentDifficulty = difficultyManager.getForScore(0);
    this.spawnTimer = this.currentDifficulty.spawnInterval * 0.45;
    this.lastGapY = null;
    this.spawnedCount = 0;
  }

  public getPipes(): Pipe[] {
    return this.pipes;
  }

  public getCurrentDifficulty(): DifficultySnapshot {
    return this.currentDifficulty;
  }

  public update(dt: number, currentScore = 0): void {
    this.currentDifficulty = difficultyManager.getForScore(currentScore);
    const { speed, spawnInterval } = this.currentDifficulty;

    for (const pipe of this.pipes) {
      pipe.update(dt, speed);
    }

    while (this.pipes.length > 0 && this.pipes[0].isOffScreen()) {
      this.pipes.shift();
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnPipe(this.currentDifficulty);
      this.spawnTimer += spawnInterval;
    }
  }

  private spawnPipe(difficulty: DifficultySnapshot): void {
    const { worldWidth, worldHeight, groundHeight, pipes } = GAME_CONFIG;
    const playableHeight = worldHeight - groundHeight;
    const gap = difficulty.gap;
    const minY = pipes.minEdgeMargin + gap / 2;
    const maxY = playableHeight - pipes.minEdgeMargin - gap / 2;

    let gapY: number;
    if (this.lastGapY === null) {
      gapY = playableHeight * 0.48 + (Math.random() - 0.5) * 84;
    } else {
      const low = Math.max(minY, this.lastGapY - difficulty.maxStepDelta);
      const high = Math.min(maxY, this.lastGapY + difficulty.maxStepDelta);
      gapY = low + Math.random() * Math.max(10, high - low);
    }

    gapY = clamp(gapY, minY, maxY);
    this.lastGapY = gapY;

    // Cosmetic color rotation every 4 pipes (does not alter hitbox or difficulty)
    const theme = PIPE_THEMES[Math.floor(this.spawnedCount / 4) % PIPE_THEMES.length];
    this.spawnedCount += 1;

    this.pipes.push(new Pipe(worldWidth + 24, gapY, gap, theme));
  }

  public draw(ctx: CanvasRenderingContext2D, groundY: number): void {
    for (const pipe of this.pipes) {
      pipe.draw(ctx, groundY);
    }
  }
}
