import { GAME_CONFIG } from './Config';
import { getWorldById, WorldId } from './worlds/WorldRegistry';

export class Ground {
  private scrollOffset = 0;
  private readonly tileWidth = 48;
  private worldId: WorldId = 'green_valley';
  private cachedCtx: CanvasRenderingContext2D | null = null;
  private cachedWorldId: WorldId = 'green_valley';
  private dirtGrad: CanvasGradient | null = null;
  private grassGrad: CanvasGradient | null = null;

  public setWorldTheme(worldId: WorldId): void {
    if (this.worldId === worldId) return;
    this.worldId = worldId;
    this.dirtGrad = null;
    this.grassGrad = null;
  }

  public reset(): void {
    this.scrollOffset = 0;
  }

  public update(dt: number, speedFactor: number): void {
    if (speedFactor <= 0) return;
    this.scrollOffset =
      (this.scrollOffset + GAME_CONFIG.pipes.speed * speedFactor * dt) % this.tileWidth;
  }

  private ensureGradients(ctx: CanvasRenderingContext2D, groundY: number, h: number): void {
    if (
      this.cachedCtx === ctx &&
      this.cachedWorldId === this.worldId &&
      this.dirtGrad &&
      this.grassGrad
    ) {
      return;
    }
    this.cachedCtx = ctx;
    this.cachedWorldId = this.worldId;
    const theme = getWorldById(this.worldId).ground;

    const dirtGrad = ctx.createLinearGradient(0, groundY + 22, 0, h);
    dirtGrad.addColorStop(0, theme.bodyTop);
    dirtGrad.addColorStop(0.55, theme.bodyMid);
    dirtGrad.addColorStop(1, theme.bodyBottom);
    this.dirtGrad = dirtGrad;

    const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 25);
    grassGrad.addColorStop(0, theme.topCapStart);
    grassGrad.addColorStop(1, theme.topCapEnd);
    this.grassGrad = grassGrad;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const w = GAME_CONFIG.worldWidth;
    const h = GAME_CONFIG.worldHeight;
    const groundH = GAME_CONFIG.groundHeight;
    const groundY = h - groundH;
    const theme = getWorldById(this.worldId).ground;
    this.ensureGradients(ctx, groundY, h);

    // Lower body soil/sand/stone/deck
    ctx.fillStyle = this.dirtGrad!;
    ctx.fillRect(0, groundY + 20, w, groundH - 20);

    ctx.fillStyle = theme.speckDark;
    ctx.fillRect(0, groundY + 54, w, 12);

    const startX = -this.scrollOffset;
    for (let x = startX; x < w + this.tileWidth; x += this.tileWidth) {
      ctx.fillStyle = theme.speckDark;
      ctx.beginPath();
      ctx.roundRect(x + 6, groundY + 38, 17, 9, 4.5);
      ctx.roundRect(x + 28, groundY + 60, 13, 8, 4);
      ctx.fill();

      ctx.fillStyle = theme.speckLight;
      ctx.beginPath();
      ctx.arc(x + 12, groundY + 41, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 33, groundY + 62.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top surface cap
    ctx.fillStyle = this.grassGrad!;
    ctx.fillRect(0, groundY, w, 24);

    // Seamless slanted stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, groundY, w, 24);
    ctx.clip();

    ctx.fillStyle = theme.topStripe;
    for (let x = startX - this.tileWidth; x < w + this.tileWidth * 2; x += this.tileWidth) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 24, groundY);
      ctx.lineTo(x + 12, groundY + 24);
      ctx.lineTo(x - 12, groundY + 24);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Bottom lip trim (waves/tufts/glow bar)
    ctx.fillStyle = theme.topLip;
    ctx.fillRect(0, groundY + 21, w, 5);
    for (let x = startX; x < w + this.tileWidth; x += 24) {
      ctx.beginPath();
      ctx.arc(x + 12, groundY + 24, 6, 0, Math.PI);
      ctx.fill();
    }

    // Crisp outline separating playable sky & ground
    ctx.fillStyle = theme.outline;
    ctx.fillRect(0, groundY, w, 3.2);
  }
}
