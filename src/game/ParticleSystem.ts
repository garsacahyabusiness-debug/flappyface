import { GAME_CONFIG } from './Config';

export type ParticleKind = 'circle' | 'star' | 'feather' | 'confetti';

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
  kind: ParticleKind;
}

interface FloatingScoreText {
  x: number;
  y: number;
  vy: number;
  text: string;
  life: number;
  maxLife: number;
}

const POOL_SIZE = 72;

export class ParticleSystem {
  private pool: PooledParticle[] = [];
  private floatingTexts: FloatingScoreText[] = [];
  private ambientTimer = 0;
  private lowDetail = false;
  private reducedMotion = false;

  constructor() {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        gravity: 240,
        size: 4,
        color: '#FFFFFF',
        life: 0,
        maxLife: 0.5,
        rotation: 0,
        vRot: 0,
        kind: 'circle',
      });
    }
  }

  public setLowDetail(low: boolean): void {
    this.lowDetail = low;
  }

  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public reset(): void {
    for (const p of this.pool) {
      p.active = false;
    }
    this.floatingTexts = [];
    this.ambientTimer = 0;
  }

  private spawnOne(config: Omit<PooledParticle, 'active' | 'life'>): void {
    for (const p of this.pool) {
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.x = config.x;
        p.y = config.y;
        p.vx = config.vx;
        p.vy = config.vy;
        p.gravity = config.gravity;
        p.size = config.size;
        p.color = config.color;
        p.maxLife = config.maxLife;
        p.rotation = config.rotation;
        p.vRot = config.vRot;
        p.kind = config.kind;
        return;
      }
    }
  }

  public spawnFlapPuff(
    x: number,
    y: number,
    trailColors: readonly string[] = ['#FFFFFF', '#FFF199'],
    particleKind: ParticleKind = 'feather'
  ): void {
    const count = this.reducedMotion ? 1 : this.lowDetail ? 2 : 4;
    const palette = trailColors.length > 0 ? trailColors : ['#FFFFFF', '#FFF199'];
    for (let i = 0; i < count; i++) {
      this.spawnOne({
        x: x - 14 + (Math.random() - 0.5) * 8,
        y: y + 6 + (Math.random() - 0.5) * 8,
        vx: -48 - Math.random() * 55,
        vy: 20 + Math.random() * 50,
        gravity: 160,
        size: 3.5 + Math.random() * 2.5,
        color: palette[i % palette.length],
        maxLife: 0.34 + Math.random() * 0.14,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 6,
        kind: particleKind,
      });
    }
  }

  public spawnScoreBurst(x: number, y: number): void {
    this.floatingTexts.push({
      x,
      y: y - 34,
      vy: -58,
      text: '+1',
      life: 0,
      maxLife: 0.65,
    });

    if (this.reducedMotion) return;

    const colors = ['#FFD84D', '#FFFFFF', '#69C9FF', '#61D66B'];
    const count = this.lowDetail ? 4 : 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const speed = 65 + Math.random() * 85;
      this.spawnOne({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        gravity: 210,
        size: 4 + Math.random() * 2.5,
        color: colors[i % colors.length],
        maxLife: 0.45 + Math.random() * 0.18,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 8,
        kind: 'star',
      });
    }
  }

  public spawnCollisionBurst(x: number, y: number): void {
    const colors = ['#FFFFFF', '#FFD84D', '#FF7675', '#FF9429'];
    const count = this.reducedMotion ? 4 : this.lowDetail ? 8 : 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.25;
      const speed = 95 + Math.random() * 170;
      this.spawnOne({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 35,
        gravity: 280,
        size: 4 + Math.random() * 4.5,
        color: colors[i % colors.length],
        maxLife: 0.45 + Math.random() * 0.25,
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 10,
        kind: i % 3 === 0 ? 'feather' : 'circle',
      });
    }
  }

  public spawnNewBestCelebration(): void {
    if (this.reducedMotion) return;
    const colors = ['#FFD84D', '#61D66B', '#3998F7', '#FF7675', '#FFFFFF'];
    const count = this.lowDetail ? 10 : 24;
    for (let i = 0; i < count; i++) {
      const startX = 40 + Math.random() * (GAME_CONFIG.worldWidth - 80);
      this.spawnOne({
        x: startX,
        y: 120 + Math.random() * 60,
        vx: (Math.random() - 0.5) * 140,
        vy: -140 - Math.random() * 120,
        gravity: 340,
        size: 4.5 + Math.random() * 3.5,
        color: colors[i % colors.length],
        maxLife: 1.1 + Math.random() * 0.45,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 12,
        kind: i % 2 === 0 ? 'confetti' : 'star',
      });
    }
  }

  public updateAmbientMenuSparkles(dt: number): void {
    if (this.lowDetail || this.reducedMotion) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = 0.42;
      this.spawnOne({
        x: 24 + Math.random() * (GAME_CONFIG.worldWidth - 48),
        y: GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight - 30 - Math.random() * 260,
        vx: -12 + (Math.random() - 0.5) * 16,
        vy: -22 - Math.random() * 18,
        gravity: -4,
        size: 2.5 + Math.random() * 2.5,
        color: Math.random() > 0.35 ? '#FFFFFF' : '#FFE885',
        maxLife: 1.5 + Math.random() * 0.8,
        rotation: 0,
        vRot: 2,
        kind: 'star',
      });
    }
  }

  public update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.vRot * dt;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const t = p.life / p.maxLife;
      const alpha = p.kind === 'star' && t < 0.2 ? t / 0.2 : Math.max(0, 1 - t);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.kind === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.35, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'confetti') {
        ctx.fillRect(-p.size, -p.size * 0.55, p.size * 2, p.size * 1.1);
      } else if (p.kind === 'star') {
        this.drawFourPointStar(ctx, p.size);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Floating +1 popups
    for (const ft of this.floatingTexts) {
      const t = ft.life / ft.maxLife;
      const alpha = Math.max(0, 1 - Math.pow(t, 1.5));
      const scale = 1 + Math.sin(Math.min(1, t * 3.5) * Math.PI) * 0.22;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(scale, scale);
      ctx.font = '700 26px Fredoka, Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 5;
      ctx.strokeStyle = GAME_CONFIG.colors.darkOutline;
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = GAME_CONFIG.colors.accentYellow;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
  }

  private drawFourPointStar(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r * 1.25 : r * 0.48;
      const a = (i * Math.PI) / 4;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}
