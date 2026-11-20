import { GAME_CONFIG } from '../Config';
import { SkySystem } from './SkySystem';
import { ParticleLevel, WeatherSystem } from './WeatherSystem';
import { getWorldById, WeatherType, WorldDefinition, WorldId } from './WorldRegistry';

interface CloudItem {
  x: number;
  y: number;
  scale: number;
  speed: number;
  layer: 0 | 1;
  opacity: number;
}

const STATIC_STARS: ReadonlyArray<{ x: number; y: number; r: number; phase: number }> = [
  { x: 34, y: 42, r: 1.5, phase: 0.2 },
  { x: 78, y: 94, r: 1.1, phase: 1.1 },
  { x: 112, y: 36, r: 1.8, phase: 2.3 },
  { x: 158, y: 74, r: 1.2, phase: 0.9 },
  { x: 196, y: 28, r: 1.6, phase: 1.7 },
  { x: 238, y: 88, r: 1.3, phase: 2.9 },
  { x: 274, y: 52, r: 1.9, phase: 0.5 },
  { x: 316, y: 118, r: 1.2, phase: 1.4 },
  { x: 356, y: 44, r: 1.7, phase: 2.6 },
  { x: 52, y: 162, r: 1.1, phase: 2.1 },
  { x: 142, y: 144, r: 1.4, phase: 0.4 },
  { x: 218, y: 168, r: 1.2, phase: 1.9 },
  { x: 294, y: 154, r: 1.5, phase: 2.8 },
  { x: 374, y: 140, r: 1.2, phase: 0.8 },
];

export type GraphicsPreset = 'low' | 'medium' | 'high';

export class EnvironmentRenderer {
  public readonly skySystem = new SkySystem();
  public readonly weatherSystem = new WeatherSystem();

  private world: WorldDefinition = getWorldById('green_valley');
  private clouds: CloudItem[] = [];
  private farScroll = 0;
  private midScroll = 0;
  private propScroll = 0;
  private animTime = 0;

  private lowDetail = false;
  private reducedMotion = false;
  private parallaxEnabled = true;
  private dynamicSkyEnabled = false;
  private specialAuroraOverride = false;
  private hasEnhancedEnvGlow = false;
  private graphicsPreset: GraphicsPreset = 'high';

  private cachedCtx: CanvasRenderingContext2D | null = null;
  private cachedSkyKey = '';
  private cachedSkyGrad: CanvasGradient | null = null;

  constructor() {
    this.initClouds();
  }

  public setWorld(worldId: WorldId): void {
    const next = getWorldById(worldId);
    if (this.world.id !== next.id) {
      this.world = next;
      this.cachedSkyKey = '';
    }
  }

  public getWorld(): WorldDefinition {
    return this.world;
  }

  public setWeather(weather: WeatherType | null): void {
    this.weatherSystem.setWeather(weather);
  }

  public setParallaxEnabled(enabled: boolean): void {
    this.parallaxEnabled = enabled;
  }

  public setDynamicSkyEnabled(enabled: boolean): void {
    if (this.dynamicSkyEnabled !== enabled) {
      this.dynamicSkyEnabled = enabled;
      this.cachedSkyKey = '';
    }
  }

  public setSpecialAuroraOverride(active: boolean): void {
    if (this.specialAuroraOverride !== active) {
      this.specialAuroraOverride = active;
      this.cachedSkyKey = '';
    }
  }

  public setEnhancedEnvGlow(active: boolean): void {
    this.hasEnhancedEnvGlow = active;
  }

  public setParticleLevel(level: ParticleLevel): void {
    this.weatherSystem.setParticleLevel(level);
  }

  public setGraphicsPreset(preset: GraphicsPreset): void {
    this.graphicsPreset = preset;
    this.lowDetail = preset === 'low';
  }

  public setLowDetail(low: boolean): void {
    this.lowDetail = low || this.graphicsPreset === 'low';
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.weatherSystem.setReducedMotion(reduced);
  }

  private initClouds(): void {
    const w = GAME_CONFIG.worldWidth;
    this.clouds = [
      { x: 40, y: 82, scale: 0.62, speed: 12, layer: 0, opacity: 0.62 },
      { x: 185, y: 146, scale: 0.56, speed: 10, layer: 0, opacity: 0.55 },
      { x: 330, y: 98, scale: 0.7, speed: 14, layer: 0, opacity: 0.65 },
      { x: 90, y: 188, scale: 0.96, speed: 24, layer: 1, opacity: 0.92 },
      { x: 255, y: 74, scale: 0.88, speed: 21, layer: 1, opacity: 0.88 },
      { x: w + 30, y: 222, scale: 1.06, speed: 26, layer: 1, opacity: 0.94 },
    ];
  }

  public reset(): void {
    this.farScroll = 0;
    this.midScroll = 0;
    this.propScroll = 0;
    this.skySystem.reset();
    this.weatherSystem.reseed();
    this.initClouds();
  }

  public update(dt: number, speedFactor: number, advanceSkyCycle = true): void {
    if (dt <= 0) return;
    this.animTime += dt;
    this.skySystem.update(dt, this.dynamicSkyEnabled && advanceSkyCycle);
    this.weatherSystem.update(dt);

    if (speedFactor <= 0 || !this.parallaxEnabled || this.reducedMotion) return;

    const baseScroll = GAME_CONFIG.pipes.speed * speedFactor;
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed * speedFactor * dt;
      if (cloud.x < -140) {
        cloud.x = GAME_CONFIG.worldWidth + 100 + Math.random() * 50;
        cloud.y = 58 + Math.random() * 190;
      }
    }

    this.farScroll = (this.farScroll + baseScroll * 0.08 * dt) % 240;
    this.midScroll = (this.midScroll + baseScroll * 0.22 * dt) % 160;
    this.propScroll = (this.propScroll + baseScroll * 0.3 * dt) % 200;
  }

  public drawBackgroundLayers(ctx: CanvasRenderingContext2D): void {
    const w = GAME_CONFIG.worldWidth;
    const skyH = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const sky = this.skySystem.getEffectiveSky(
      this.world,
      this.dynamicSkyEnabled,
      this.specialAuroraOverride
    );

    const skyKey = `${this.world.id}|${sky.top}|${sky.mid}|${sky.bottom}`;
    if (this.cachedCtx !== ctx || this.cachedSkyKey !== skyKey || !this.cachedSkyGrad) {
      this.cachedCtx = ctx;
      this.cachedSkyKey = skyKey;
      const g = ctx.createLinearGradient(0, 0, 0, skyH);
      g.addColorStop(0, sky.top);
      g.addColorStop(0.55, sky.mid);
      g.addColorStop(1, sky.bottom);
      this.cachedSkyGrad = g;
    }

    // 1. Sky backdrop
    ctx.fillStyle = this.cachedSkyGrad;
    ctx.fillRect(0, 0, w, skyH + 2);

    // 2. Stars (night phase / dark biomes)
    if (sky.starOpacity > 0.03) {
      this.drawStars(ctx, sky.starOpacity);
    }

    // 3. Optional 4-World Milestone Aurora / Atmosphere Glow Ribbon
    if (this.hasEnhancedEnvGlow && !this.lowDetail) {
      this.drawEnhancedAuroraGlow(ctx, w, skyH);
    }

    // 4. Celestial body (Sun / Moon / Ringed Planet)
    this.drawCelestial(ctx, w, sky.celestialColor, sky.celestialGlow);

    // 5. Far clouds / Cosmic nebula clouds
    if (this.world.id !== 'space_odyssey') {
      for (const cloud of this.clouds) {
        if (cloud.layer === 0) {
          this.drawCloud(ctx, cloud, sky.cloudTint, this.world.cloudShade);
        }
      }
    } else {
      this.drawSpaceNebulaWash(ctx, w, skyH);
    }

    // 6. Far biome silhouette layer
    this.drawFarBiomeLayer(ctx, w, skyH);

    // 7. Near clouds
    if (this.world.id !== 'space_odyssey' && this.world.id !== 'lava_world') {
      for (const cloud of this.clouds) {
        if (cloud.layer === 1) {
          this.drawCloud(ctx, cloud, sky.cloudTint, this.world.cloudShade);
        }
      }
    }

    // 8. Midground hills + signature biome props
    this.drawMidBiomeLayer(ctx, w, skyH);
  }

  public drawWeatherOverlay(ctx: CanvasRenderingContext2D): void {
    this.weatherSystem.draw(ctx);
  }

  private drawStars(ctx: CanvasRenderingContext2D, baseOpacity: number): void {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    for (const s of STATIC_STARS) {
      const twinkle = 0.65 + 0.35 * Math.sin(this.animTime * 2.2 + s.phase);
      ctx.globalAlpha = baseOpacity * twinkle;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawEnhancedAuroraGlow(ctx: CanvasRenderingContext2D, w: number, skyH: number): void {
    ctx.save();
    const grad = ctx.createLinearGradient(0, 48, w, 190);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
    grad.addColorStop(0.5, 'rgba(244, 114, 182, 0.14)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0.12)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.quadraticCurveTo(w * 0.35, 45 + Math.sin(this.animTime) * 8, w * 0.7, 115);
    ctx.quadraticCurveTo(w * 0.85, 136, w, 88);
    ctx.lineTo(w, 165);
    ctx.quadraticCurveTo(w * 0.55, Math.min(skyH - 40, 195), 0, 155);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawCelestial(
    ctx: CanvasRenderingContext2D,
    w: number,
    color: string,
    glow: string
  ): void {
    const cx = w * 0.78;
    const cy = 104;

    if (!this.lowDetail) {
      const halo = ctx.createRadialGradient(cx, cy, 12, cx, cy, 78);
      halo.addColorStop(0, glow);
      halo.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, 78, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.world.id === 'space_odyssey') {
      ctx.save();
      ctx.translate(cx, cy);
      // Planet body
      ctx.fillStyle = '#A78BFA';
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(236, 72, 153, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-6, -4, 18, 8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      // Saturn ring
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.ellipse(0, 2, 46, 11, -0.25, 0, Math.PI * 2);
      ctx.stroke();
      // Small moon
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(-58, 28, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (this.world.id === 'sky_kingdom' && !this.lowDetail) {
      // Soft sun rays
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(this.animTime * 0.08);
      ctx.fillStyle = 'rgba(255, 251, 214, 0.18)';
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -82);
        ctx.lineTo(10, -82);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCloud(
    ctx: CanvasRenderingContext2D,
    cloud: CloudItem,
    fillColor: string,
    shadeColor: string
  ): void {
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    ctx.scale(cloud.scale, cloud.scale);
    ctx.globalAlpha = cloud.opacity;

    ctx.fillStyle = shadeColor;
    ctx.beginPath();
    ctx.roundRect(-46, 5, 92, 20, 10);
    ctx.fill();

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(-22, 6, 18, 0, Math.PI * 2);
    ctx.arc(0, -5, 24, 0, Math.PI * 2);
    ctx.arc(22, 6, 17, 0, Math.PI * 2);
    ctx.roundRect(-40, 4, 80, 19, 9.5);
    ctx.fill();

    ctx.restore();
  }

  private drawSpaceNebulaWash(ctx: CanvasRenderingContext2D, w: number, skyH: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(192, 132, 252, 0.14)';
    ctx.beginPath();
    ctx.ellipse(w * 0.3, skyH * 0.35, 135, 58, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.11)';
    ctx.beginPath();
    ctx.ellipse(w * 0.72, skyH * 0.56, 120, 46, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFarBiomeLayer(ctx: CanvasRenderingContext2D, w: number, skyH: number): void {
    const step = 240;
    ctx.save();

    if (this.world.id === 'neon_city') {
      // Distant cyberpunk skyline
      ctx.fillStyle = this.world.farLayerColor;
      const bw = 48;
      for (let x = -bw - (this.farScroll % bw); x < w + bw; x += bw) {
        const idx = Math.abs(Math.round((x + this.farScroll) / bw));
        const bh = 78 + ((idx * 37) % 68);
        ctx.fillRect(x, skyH - bh, bw - 4, bh + 2);
        // Subtle window strip
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(34, 211, 238, 0.25)' : 'rgba(244, 114, 182, 0.25)';
        ctx.fillRect(x + 8, skyH - bh + 12, 6, 10);
        ctx.fillRect(x + 24, skyH - bh + 26, 6, 10);
        ctx.fillStyle = this.world.farLayerColor;
      }
      ctx.restore();
      return;
    }

    if (this.world.id === 'tropical_island') {
      // Shimmering ocean band + distant island volcano cone
      ctx.fillStyle = '#1FB6D8';
      ctx.fillRect(0, skyH - 54, w, 56);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
      for (let x = -60 - (this.farScroll % 60); x < w + 60; x += 60) {
        ctx.fillRect(x + 8, skyH - 44, 24, 3);
        ctx.fillRect(x + 32, skyH - 32, 18, 2.5);
      }
      ctx.fillStyle = this.world.farLayerColor;
      ctx.beginPath();
      ctx.moveTo(-step, skyH - 50);
      for (let x = -step - this.farScroll; x <= w + step; x += step) {
        ctx.quadraticCurveTo(x + step * 0.28, skyH - 115, x + step * 0.52, skyH - 52);
        ctx.lineTo(x + step, skyH - 50);
      }
      ctx.lineTo(w + step, skyH - 48);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    if (this.world.id === 'sky_kingdom') {
      // Floating sky islands + tiny golden castle spires
      const span = 200;
      for (let x = -span - (this.farScroll % span); x < w + span; x += span) {
        const iy = skyH - 135;
        ctx.fillStyle = '#BAE6FD';
        ctx.beginPath();
        ctx.ellipse(x + 90, iy, 48, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 76, iy - 32, 28, 24);
        ctx.fillStyle = '#FCD34D';
        ctx.beginPath();
        ctx.moveTo(x + 73, iy - 32);
        ctx.lineTo(x + 90, iy - 52);
        ctx.lineTo(x + 107, iy - 32);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (this.world.id === 'space_odyssey') {
      // Asteroid belt & far floating station silhouette
      const span = 220;
      ctx.fillStyle = this.world.farLayerColor;
      for (let x = -span - (this.farScroll % span); x < w + span; x += span) {
        ctx.beginPath();
        ctx.ellipse(x + 60, skyH - 86, 18, 12, 0.3, 0, Math.PI * 2);
        ctx.ellipse(x + 150, skyH - 112, 11, 8, -0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // Mountain / caldera / frosting peaks for Valley, Candy, Snow, Lava
    ctx.fillStyle = this.world.farLayerColor;
    ctx.beginPath();
    ctx.moveTo(-step, skyH + 2);
    for (let x = -step - this.farScroll; x <= w + step; x += step) {
      if (this.world.id === 'snow_land' || this.world.id === 'lava_world') {
        ctx.lineTo(x + step * 0.25, skyH - 96);
        ctx.lineTo(x + step * 0.5, skyH - 42);
        ctx.lineTo(x + step * 0.78, skyH - 82);
        ctx.lineTo(x + step, skyH - 22);
      } else {
        ctx.quadraticCurveTo(x + step * 0.25, skyH - 84, x + step * 0.5, skyH - 34);
        ctx.quadraticCurveTo(x + step * 0.78, skyH - 68, x + step, skyH - 18);
      }
    }
    ctx.lineTo(w + step, skyH + 2);
    ctx.closePath();
    ctx.fill();

    // Snow caps or glowing caldera cracks
    if (this.world.id === 'snow_land') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (let x = -step - this.farScroll; x <= w + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + step * 0.25, skyH - 96);
        ctx.lineTo(x + step * 0.16, skyH - 70);
        ctx.lineTo(x + step * 0.34, skyH - 74);
        ctx.closePath();
        ctx.fill();
      }
    } else if (this.world.id === 'lava_world') {
      ctx.fillStyle = 'rgba(251, 146, 60, 0.75)';
      for (let x = -step - this.farScroll; x <= w + step; x += step) {
        ctx.beginPath();
        ctx.arc(x + step * 0.25, skyH - 96, 6, 0, Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private drawMidBiomeLayer(ctx: CanvasRenderingContext2D, w: number, skyH: number): void {
    ctx.save();

    if (this.world.id === 'neon_city') {
      // Midground synth skyline with bright neon roof accents
      const bw = 56;
      const offset = this.midScroll % bw;
      for (let x = -bw - offset; x < w + bw; x += bw) {
        const idx = Math.abs(Math.round((x + this.midScroll) / bw));
        const bh = 44 + ((idx * 29) % 42);
        ctx.fillStyle = this.world.midLayerColor;
        ctx.fillRect(x, skyH - bh, bw - 6, bh + 2);
        ctx.fillStyle = idx % 2 === 0 ? '#22D3EE' : '#EC4899';
        ctx.fillRect(x + 2, skyH - bh, bw - 10, 3);
      }
      ctx.restore();
      return;
    }

    if (this.world.id === 'space_odyssey') {
      // Low alien horizon ridge
      const wavelength = 160;
      ctx.fillStyle = this.world.midLayerColor;
      ctx.beginPath();
      ctx.moveTo(-wavelength, skyH + 2);
      for (let x = -wavelength - this.midScroll; x <= w + wavelength; x += wavelength) {
        ctx.quadraticCurveTo(x + wavelength * 0.5, skyH - 36, x + wavelength, skyH - 10);
      }
      ctx.lineTo(w + wavelength, skyH + 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      return;
    }

    // Rolling midground hills
    const wavelength = 160;
    ctx.fillStyle = this.world.midLayerColor;
    ctx.beginPath();
    ctx.moveTo(-wavelength, skyH + 2);
    for (let x = -wavelength - this.midScroll; x <= w + wavelength; x += wavelength) {
      ctx.quadraticCurveTo(x + wavelength * 0.5, skyH - 44, x + wavelength, skyH - 8);
    }
    ctx.lineTo(w + wavelength, skyH + 2);
    ctx.closePath();
    ctx.fill();

    // Signature biome props along midground horizon
    if (!this.lowDetail) {
      const propSpan = 200;
      const offset = this.propScroll % propSpan;
      for (let x = -propSpan - offset; x < w + propSpan; x += propSpan) {
        if (this.world.id === 'green_valley') {
          this.drawBushTree(ctx, x + 52, skyH - 22, '#34A853', '#68D374');
          this.drawBushTree(ctx, x + 148, skyH - 18, '#2E9448', '#5EC486');
        } else if (this.world.id === 'candy_world') {
          this.drawLollipopTree(ctx, x + 60, skyH - 24, '#FF5AA5', '#FFFFFF');
          this.drawLollipopTree(ctx, x + 152, skyH - 20, '#38BDF8', '#FEF08A');
        } else if (this.world.id === 'snow_land') {
          this.drawPineTree(ctx, x + 56, skyH - 20);
          this.drawPineTree(ctx, x + 146, skyH - 18);
        } else if (this.world.id === 'tropical_island') {
          this.drawPalmTree(ctx, x + 76, skyH - 18);
        } else if (this.world.id === 'lava_world') {
          ctx.fillStyle = '#FB923C';
          ctx.beginPath();
          ctx.ellipse(x + 95, skyH - 10, 26, 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  private drawBushTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dark: string,
    light: string
  ): void {
    ctx.fillStyle = '#7C4D2B';
    ctx.fillRect(x - 3, y - 16, 6, 18);
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(x, y - 24, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x - 4, y - 27, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLollipopTree(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    candyColor: string,
    swirlColor: string
  ): void {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x - 2.5, y - 24, 5, 26);
    ctx.fillStyle = candyColor;
    ctx.beginPath();
    ctx.arc(x, y - 30, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = swirlColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y - 30, 8, 0, Math.PI * 1.4);
    ctx.stroke();
  }

  private drawPineTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#33658A';
    ctx.beginPath();
    ctx.moveTo(x, y - 42);
    ctx.lineTo(x - 14, y - 4);
    ctx.lineTo(x + 14, y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x, y - 42);
    ctx.lineTo(x - 6, y - 24);
    ctx.lineTo(x + 6, y - 24);
    ctx.closePath();
    ctx.fill();
  }

  private drawPalmTree(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 6, y - 24, x + 4, y - 44);
    ctx.stroke();

    ctx.fillStyle = '#22C55E';
    const topX = x + 4;
    const topY = y - 44;
    for (const angle of [-2.4, -0.7, 0.2, 2.2]) {
      ctx.save();
      ctx.translate(topX, topY);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(12, 0, 13, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
