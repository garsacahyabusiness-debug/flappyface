import { GAME_CONFIG } from './Config';
import { Pipe } from './Pipe';

const BEST_SCORE_STORAGE_KEY = 'flappy_face_best_score';
const BEST_SCORE_STORAGE_VERSION = 1;

export interface ScoreCheckResult {
  scored: boolean;
  newBestTriggered: boolean;
}

export class Score {
  public current = 0;
  public best = 0;
  public isNewBest = false;
  private popTimer = 0;
  private bestAtRunStart = 0;
  private hasTriggeredNewBestThisRun = false;
  private persistBest = true;
  private scoredPipeIds = new Set<number>();

  constructor() {
    this.best = this.loadBestScore();
    this.bestAtRunStart = this.best;
  }

  private loadBestScore(): number {
    try {
      const raw = window.localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (!raw) return 0;
      const trimmed = raw.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed) as { best?: unknown };
        return typeof parsed.best === 'number' && Number.isFinite(parsed.best) && parsed.best >= 0
          ? Math.floor(parsed.best)
          : 0;
      }
      const parsed = parseInt(trimmed, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    } catch {
      return 0;
    }
  }

  private saveBestScore(score: number): void {
    try {
      const safe = Math.max(0, Math.floor(score));
      window.localStorage.setItem(
        BEST_SCORE_STORAGE_KEY,
        JSON.stringify({ version: BEST_SCORE_STORAGE_VERSION, best: safe })
      );
    } catch {
      // Ignore restricted storage environments
    }
  }

  public reset(persistBest = true): void {
    this.current = 0;
    this.isNewBest = false;
    this.hasTriggeredNewBestThisRun = false;
    this.persistBest = persistBest;
    this.bestAtRunStart = this.best;
    this.scoredPipeIds.clear();
    this.popTimer = 0;
  }

  public resetBest(): void {
    this.best = 0;
    this.isNewBest = false;
    this.bestAtRunStart = 0;
    this.hasTriggeredNewBestThisRun = false;
    this.saveBestScore(0);
  }

  public checkPipes(pipes: Pipe[], playerX: number, isGameOver = false): ScoreCheckResult {
    if (isGameOver) {
      return { scored: false, newBestTriggered: false };
    }

    let scored = false;
    let newBestTriggered = false;

    for (const pipe of pipes) {
      if (!pipe.passed && !this.scoredPipeIds.has(pipe.id) && pipe.x + pipe.width / 2 < playerX) {
        pipe.passed = true;
        this.scoredPipeIds.add(pipe.id);
        this.current += 1;
        this.popTimer = GAME_CONFIG.effects.scorePopDuration;
        scored = true;

        if (this.persistBest && this.current > this.best) {
          this.best = this.current;
          this.isNewBest = true;
          this.saveBestScore(this.best);

          if (!this.hasTriggeredNewBestThisRun && this.current > this.bestAtRunStart) {
            this.hasTriggeredNewBestThisRun = true;
            newBestTriggered = true;
          }
        }
      }
    }

    return { scored, newBestTriggered };
  }

  public update(dt: number): void {
    if (this.popTimer > 0) {
      this.popTimer = Math.max(0, this.popTimer - dt);
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const progress =
      this.popTimer > 0 ? this.popTimer / GAME_CONFIG.effects.scorePopDuration : 0;
    const bounce = Math.sin(progress * Math.PI);
    const scale = 1 + bounce * 0.28;

    ctx.save();
    ctx.translate(GAME_CONFIG.worldWidth / 2, 62);
    ctx.scale(scale, scale);

    ctx.font = '700 54px Fredoka, Nunito, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Drop shadow
    ctx.fillStyle = 'rgba(36, 65, 92, 0.34)';
    ctx.fillText(String(this.current), 0, 5);

    // Dark outline
    ctx.lineWidth = 8.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = GAME_CONFIG.colors.darkOutline;
    ctx.strokeText(String(this.current), 0, 0);

    // Crisp white fill
    ctx.fillStyle = GAME_CONFIG.colors.white;
    ctx.fillText(String(this.current), 0, 0);

    ctx.restore();
  }
}
