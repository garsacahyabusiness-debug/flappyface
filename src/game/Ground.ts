import { GAME_CONFIG } from './Config';

export class Ground {
  private scrollOffset = 0;
  private readonly tileWidth = 48;
  private cachedCtx: CanvasRenderingContext2D | null = null;
  private dirtGrad: CanvasGradient | null = null;
  private grassGrad: CanvasGradient | null = null;

  public reset(): void {
    this.scrollOffset = 0;
  }

  public update(dt: number, speedFactor: number): void {
    if (speedFactor <= 0) return;
    this.scrollOffset =
      (this.scrollOffset + GAME_CONFIG.pipes.speed * speedFactor * dt) % this.tileWidth;
  }

  private ensureGradients(ctx: CanvasRenderingContext2D, groundY: number, h: number): void {
    if (this.cachedCtx === ctx && this.dirtGrad && this.grassGrad) return;
    this.cachedCtx = ctx;
    const { grassTop, dirtTop, dirtBottom } = GAME_CONFIG.colors;

    const dirtGrad = ctx.createLinearGradient(0, groundY + 22, 0, h);
    dirtGrad.addColorStop(0, dirtTop);
    dirtGrad.addColorStop(0.55, '#CFA063');
    dirtGrad.addColorStop(1, dirtBottom);
    this.dirtGrad = dirtGrad;

    const grassGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 25);
    grassGrad.addColorStop(0, '#9BE678');
    grassGrad.addColorStop(1, grassTop);
    this.grassGrad = grassGrad;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const w = GAME_CONFIG.worldWidth;
    const h = GAME_CONFIG.worldHeight;
    const groundH = GAME_CONFIG.groundHeight;
    const groundY = h - groundH;
    const { grassStripe, grassBottom, darkOutline } = GAME_CONFIG.colors;
    this.ensureGradients(ctx, groundY, h);

    // Layer 5 Soil: Warm brown gradient + subtle deeper strata
    ctx.fillStyle = this.dirtGrad!;
    ctx.fillRect(0, groundY + 20, w, groundH - 20);

    // Subtle horizontal soil band
    ctx.fillStyle = 'rgba(138, 88, 38, 0.12)';
    ctx.fillRect(0, groundY + 54, w, 12);

    // Repeating decorative stones & soil texture
    const startX = -this.scrollOffset;
    for (let x = startX; x < w + this.tileWidth; x += this.tileWidth) {
      ctx.fillStyle = 'rgba(138, 88, 38, 0.24)';
      ctx.beginPath();
      ctx.roundRect(x + 6, groundY + 38, 17, 9, 4.5);
      ctx.roundRect(x + 28, groundY + 60, 13, 8, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 228, 185, 0.28)';
      ctx.beginPath();
      ctx.arc(x + 12, groundY + 41, 2.2, 0, Math.PI * 2);
      ctx.arc(x + 33, groundY + 62.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Layer 5 Grass: Bright green top strip
    ctx.fillStyle = this.grassGrad!;
    ctx.fillRect(0, groundY, w, 24);

    // Seamless slanted stripes
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, groundY, w, 24);
    ctx.clip();

    ctx.fillStyle = grassStripe;
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

    // Rounded grass tufts along bottom edge of grass strip
    ctx.fillStyle = grassBottom;
    ctx.fillRect(0, groundY + 21, w, 5);
    for (let x = startX; x < w + this.tileWidth; x += 24) {
      ctx.beginPath();
      ctx.arc(x + 12, groundY + 24, 6, 0, Math.PI);
      ctx.fill();
    }

    // Crisp cartoon border separating playable sky & ground
    ctx.fillStyle = darkOutline;
    ctx.fillRect(0, groundY, w, 3.2);
  }
}
