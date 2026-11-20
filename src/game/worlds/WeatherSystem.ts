import { GAME_CONFIG } from '../Config';
import { WeatherType } from './WorldRegistry';

export type ParticleLevel = 'low' | 'medium' | 'high';

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  length: number;
}

const MAX_WEATHER_PARTICLES = 60;

export class WeatherSystem {
  private pool: WeatherParticle[] = [];
  private activeCount = 0;
  private activeWeather: WeatherType | null = 'sunny';
  private particleLevel: ParticleLevel = 'high';
  private reducedMotion = false;
  private elapsed = 0;

  constructor() {
    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      this.pool.push({
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 2,
        alpha: 0.5,
        phase: 0,
        length: 8,
      });
    }
    this.reseed();
  }

  public setWeather(weather: WeatherType | null): void {
    if (this.activeWeather === weather) return;
    this.activeWeather = weather;
    this.reseed();
  }

  public setParticleLevel(level: ParticleLevel): void {
    if (this.particleLevel === level) return;
    this.particleLevel = level;
    this.updateActiveCap();
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.updateActiveCap();
  }

  public getMaxParticlesForLevel(level: ParticleLevel = this.particleLevel): number {
    if (!this.activeWeather || level === 'low' || this.reducedMotion) return 0;
    const baseCap = level === 'medium' ? 24 : 52;
    switch (this.activeWeather) {
      case 'rain':
        return baseCap;
      case 'snow':
      case 'ash':
      case 'starry_night':
      case 'nebula':
        return Math.min(baseCap, level === 'medium' ? 22 : 44);
      case 'wind':
        return Math.min(baseCap, level === 'medium' ? 14 : 26);
      case 'sunny':
      case 'cloudy':
        return Math.min(baseCap, level === 'medium' ? 12 : 20);
      case 'fog':
        return Math.min(baseCap, level === 'medium' ? 8 : 14);
    }
  }

  public getActiveCount(): number {
    return this.activeCount;
  }

  private updateActiveCap(): void {
    this.activeCount = this.getMaxParticlesForLevel(this.particleLevel);
  }

  public reseed(): void {
    this.updateActiveCap();
    const w = GAME_CONFIG.worldWidth;
    const skyH = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
      this.configureParticle(this.pool[i], i, w, skyH, true);
    }
  }

  private configureParticle(
    p: WeatherParticle,
    index: number,
    w: number,
    skyH: number,
    initialSpread: boolean
  ): void {
    const weather = this.activeWeather ?? 'sunny';
    const r1 = Math.random();
    const r2 = Math.random();
    p.phase = r1 * Math.PI * 2 + index * 0.37;

    switch (weather) {
      case 'rain':
        p.x = r1 * (w + 60) - 20;
        p.y = initialSpread ? r2 * skyH : -16 - r2 * 40;
        p.vx = -65 - r1 * 30;
        p.vy = 430 + r2 * 140;
        p.size = 1.4 + (index % 2) * 0.4;
        p.length = 11 + (index % 3) * 4;
        p.alpha = 0.28 + (index % 3) * 0.1;
        break;
      case 'snow':
        p.x = r1 * w;
        p.y = initialSpread ? r2 * skyH : -12;
        p.vx = -16 + (r2 - 0.5) * 18;
        p.vy = 48 + r1 * 45;
        p.size = 2 + (index % 4) * 1.1;
        p.length = 0;
        p.alpha = 0.45 + (index % 3) * 0.18;
        break;
      case 'ash':
        p.x = r1 * w;
        p.y = initialSpread ? r2 * skyH : skyH + 10;
        p.vx = -18 + (r2 - 0.5) * 28;
        p.vy = -(38 + r1 * 48);
        p.size = 1.8 + (index % 3) * 1.1;
        p.length = 0;
        p.alpha = 0.45 + (index % 3) * 0.18;
        break;
      case 'wind':
        p.x = initialSpread ? r1 * w : w + 30;
        p.y = 40 + r2 * (skyH - 70);
        p.vx = -(190 + r1 * 120);
        p.vy = 10 + Math.sin(p.phase) * 14;
        p.size = 1.6;
        p.length = 22 + (index % 4) * 10;
        p.alpha = 0.24 + (index % 3) * 0.09;
        break;
      case 'starry_night':
        p.x = r1 * w;
        p.y = 18 + r2 * (skyH * 0.72);
        p.vx = -4;
        p.vy = 0;
        p.size = 1.2 + (index % 3) * 0.9;
        p.length = 0;
        p.alpha = 0.4 + (index % 4) * 0.14;
        break;
      case 'nebula':
        p.x = r1 * w;
        p.y = 20 + r2 * (skyH - 40);
        p.vx = -(8 + (index % 4) * 4);
        p.vy = (r2 - 0.5) * 6;
        p.size = 1.6 + (index % 4) * 1.1;
        p.length = 0;
        p.alpha = 0.35 + (index % 4) * 0.15;
        break;
      case 'fog':
        p.x = r1 * w;
        p.y = skyH * 0.35 + r2 * (skyH * 0.6);
        p.vx = -(18 + (index % 3) * 8);
        p.vy = 0;
        p.size = 24 + (index % 3) * 10;
        p.length = 80 + (index % 3) * 35;
        p.alpha = 0.14 + (index % 2) * 0.05;
        break;
      case 'sunny':
      case 'cloudy':
      default:
        p.x = r1 * w;
        p.y = 30 + r2 * (skyH - 70);
        p.vx = -(12 + (index % 3) * 5);
        p.vy = -6 + Math.sin(p.phase) * 6;
        p.size = 2 + (index % 3) * 0.9;
        p.length = 0;
        p.alpha = weather === 'sunny' ? 0.34 : 0.22;
        break;
    }
  }

  public update(dt: number): void {
    this.elapsed += dt;
    if (this.activeCount <= 0 || dt <= 0) return;

    const w = GAME_CONFIG.worldWidth;
    const skyH = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const weather = this.activeWeather ?? 'sunny';

    for (let i = 0; i < this.activeCount; i++) {
      const p = this.pool[i];
      p.phase += dt * 2.4;

      if (weather === 'snow' || weather === 'sunny' || weather === 'cloudy') {
        p.x += (p.vx + Math.sin(p.phase) * 16) * dt;
      } else {
        p.x += p.vx * dt;
      }
      p.y += p.vy * dt;

      if (weather === 'rain' && p.y > skyH + 12) {
        this.configureParticle(p, i, w, skyH, false);
      } else if (weather === 'snow' && (p.y > skyH + 10 || p.x < -16)) {
        this.configureParticle(p, i, w, skyH, false);
      } else if (weather === 'ash' && (p.y < -12 || p.x < -16)) {
        this.configureParticle(p, i, w, skyH, false);
      } else if (weather === 'wind' && p.x < -45) {
        this.configureParticle(p, i, w, skyH, false);
      } else if (weather === 'fog' && p.x < -p.length) {
        p.x = w + p.length * 0.5;
      } else if (p.x < -20) {
        p.x = w + 16;
      } else if (p.x > w + 32) {
        p.x = -12;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (!this.activeWeather) return;
    const w = GAME_CONFIG.worldWidth;
    const skyH = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;

    // Gentle fog atmospheric ribbon even in medium mode
    if (this.activeWeather === 'fog' && this.particleLevel !== 'low' && !this.reducedMotion) {
      ctx.save();
      const grad = ctx.createLinearGradient(0, skyH * 0.45, 0, skyH);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      grad.addColorStop(0.55, 'rgba(226, 232, 240, 0.14)');
      grad.addColorStop(1, 'rgba(241, 245, 249, 0.24)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, skyH * 0.45, w, skyH * 0.55);
      ctx.restore();
    }

    if (this.activeCount <= 0) return;

    ctx.save();
    switch (this.activeWeather) {
      case 'rain':
        ctx.strokeStyle = 'rgba(219, 242, 255, 0.65)';
        ctx.lineCap = 'round';
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          ctx.globalAlpha = p.alpha;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 3, p.y + p.length);
          ctx.stroke();
        }
        break;

      case 'snow':
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'ash':
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = i % 3 === 0 ? '#FDBA74' : i % 3 === 1 ? '#FB923C' : '#E5E7EB';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'wind':
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
        ctx.lineCap = 'round';
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          ctx.globalAlpha = p.alpha;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(
            p.x + p.length * 0.5,
            p.y + Math.sin(p.phase) * 3.5,
            p.x + p.length,
            p.y
          );
          ctx.stroke();
        }
        break;

      case 'fog':
        ctx.fillStyle = 'rgba(241, 245, 249, 0.35)';
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.roundRect(p.x, p.y, p.length, p.size, p.size * 0.5);
          ctx.fill();
        }
        break;

      case 'starry_night':
        ctx.fillStyle = '#FFFDF0';
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          const twinkle = 0.55 + 0.45 * Math.sin(this.elapsed * 2.5 + p.phase);
          ctx.globalAlpha = p.alpha * twinkle;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'nebula':
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          const twinkle = 0.55 + 0.45 * Math.sin(this.elapsed * 2 + p.phase);
          ctx.globalAlpha = p.alpha * twinkle;
          ctx.fillStyle = i % 3 === 0 ? '#E879F9' : i % 3 === 1 ? '#38BDF8' : '#FDE68A';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case 'sunny':
      case 'cloudy':
      default:
        ctx.fillStyle = this.activeWeather === 'sunny' ? '#FFF9C4' : '#FFFFFF';
        for (let i = 0; i < this.activeCount; i++) {
          const p = this.pool[i];
          ctx.globalAlpha = p.alpha * (0.65 + 0.35 * Math.sin(p.phase));
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
    }
    ctx.restore();
  }
}
