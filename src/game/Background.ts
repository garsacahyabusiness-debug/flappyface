import { GAME_CONFIG } from './Config';

interface CloudItem {
  x: number;
  y: number;
  scale: number;
  speed: number;
  layer: 0 | 1;
  opacity: number;
}

export class Background {
  private clouds: CloudItem[] = [];
  private mountainScroll = 0;
  private hillScroll = 0;
  private lowDetail = false;
  private cachedCtx: CanvasRenderingContext2D | null = null;
  private skyGrad: CanvasGradient | null = null;
  private sunGlow: CanvasGradient | null = null;

  constructor() {
    this.initClouds();
  }

  public setLowDetail(low: boolean): void {
    this.lowDetail = low;
  }

  private initClouds(): void {
    const w = GAME_CONFIG.worldWidth;
    this.clouds = [
      // Layer 2: Far slower clouds
      { x: 40, y: 82, scale: 0.62, speed: 12, layer: 0, opacity: 0.62 },
      { x: 185, y: 146, scale: 0.56, speed: 10, layer: 0, opacity: 0.55 },
      { x: 330, y: 98, scale: 0.7, speed: 14, layer: 0, opacity: 0.65 },
      // Layer 3: Near brighter clouds
      { x: 90, y: 188, scale: 0.96, speed: 24, layer: 1, opacity: 0.92 },
      { x: 255, y: 74, scale: 0.88, speed: 21, layer: 1, opacity: 0.88 },
      { x: w + 30, y: 222, scale: 1.06, speed: 26, layer: 1, opacity: 0.94 },
    ];
  }

  public reset(): void {
    this.mountainScroll = 0;
    this.hillScroll = 0;
    this.initClouds();
  }

  public update(dt: number, speedFactor: number): void {
    if (speedFactor <= 0) return;

    const baseScroll = GAME_CONFIG.pipes.speed * speedFactor;

    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * speedFactor * dt;
      if (cloud.x < -140) {
        cloud.x = GAME_CONFIG.worldWidth + 100 + Math.random() * 50;
        cloud.y = 60 + Math.random() * 195;
      }
    }

    // Layer 4: Mountain & distant hill silhouettes
    this.mountainScroll = (this.mountainScroll + baseScroll * 0.1 * dt) % 240;
    this.hillScroll = (this.hillScroll + baseScroll * 0.22 * dt) % 160;
  }

  private ensureGradients(ctx: CanvasRenderingContext2D, w: number, skyH: number): void {
    if (this.cachedCtx === ctx && this.skyGrad && this.sunGlow) return;
    this.cachedCtx = ctx;

    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    skyGrad.addColorStop(0, GAME_CONFIG.colors.skyTop);
    skyGrad.addColorStop(0.55, GAME_CONFIG.colors.skyMid);
    skyGrad.addColorStop(1, GAME_CONFIG.colors.skyBottom);
    this.skyGrad = skyGrad;

    const sunX = w * 0.8;
    const sunY = 104;
    const sunGlow = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, 76);
    sunGlow.addColorStop(0, 'rgba(255, 248, 188, 0.82)');
    sunGlow.addColorStop(0.5, 'rgba(255, 232, 130, 0.28)');
    sunGlow.addColorStop(1, 'rgba(255, 232, 130, 0)');
    this.sunGlow = sunGlow;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const w = GAME_CONFIG.worldWidth;
    const skyH = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    this.ensureGradients(ctx, w, skyH);

    // Layer 1: Multi-stop Sky Gradient
    ctx.fillStyle = this.skyGrad!;
    ctx.fillRect(0, 0, w, skyH + 2);

    // Sun with warm atmospheric glow (glow skipped in low-detail mode)
    const sunX = w * 0.8;
    const sunY = 104;
    if (!this.lowDetail && this.sunGlow) {
      ctx.fillStyle = this.sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 76, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFF59E';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 27, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Far Clouds
    for (const cloud of this.clouds) {
      if (cloud.layer === 0) {
        this.drawCloud(ctx, cloud);
      }
    }

    // Layer 4a: Distant Mountain Silhouettes
    this.drawMountains(ctx, skyH);

    // Layer 3: Near Clouds
    for (const cloud of this.clouds) {
      if (cloud.layer === 1) {
        this.drawCloud(ctx, cloud);
      }
    }

    // Layer 4b: Closer Soft Green Hills
    this.drawHills(ctx, skyH);
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: CloudItem): void {
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    ctx.scale(cloud.scale, cloud.scale);
    ctx.globalAlpha = cloud.opacity;

    ctx.fillStyle = 'rgba(186, 228, 255, 0.58)';
    ctx.beginPath();
    ctx.roundRect(-46, 5, 92, 20, 10);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-22, 6, 18, 0, Math.PI * 2);
    ctx.arc(0, -5, 24, 0, Math.PI * 2);
    ctx.arc(22, 6, 17, 0, Math.PI * 2);
    ctx.roundRect(-40, 4, 80, 19, 9.5);
    ctx.fill();

    ctx.restore();
  }

  private drawMountains(ctx: CanvasRenderingContext2D, skyH: number): void {
    const step = 240;
    ctx.save();
    ctx.fillStyle = '#89D3C4';
    ctx.beginPath();
    ctx.moveTo(-step, skyH + 2);
    for (let x = -step - this.mountainScroll; x <= GAME_CONFIG.worldWidth + step; x += step) {
      ctx.quadraticCurveTo(x + step * 0.25, skyH - 84, x + step * 0.5, skyH - 34);
      ctx.quadraticCurveTo(x + step * 0.78, skyH - 68, x + step, skyH - 18);
    }
    ctx.lineTo(GAME_CONFIG.worldWidth + step, skyH + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawHills(ctx: CanvasRenderingContext2D, skyH: number): void {
    const wavelength = 160;
    ctx.save();
    ctx.fillStyle = '#5EC486';
    ctx.beginPath();
    ctx.moveTo(-wavelength, skyH + 2);
    for (let x = -wavelength - this.hillScroll; x <= GAME_CONFIG.worldWidth + wavelength; x += wavelength) {
      ctx.quadraticCurveTo(x + wavelength * 0.5, skyH - 44, x + wavelength, skyH - 8);
    }
    ctx.lineTo(GAME_CONFIG.worldWidth + wavelength, skyH + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
