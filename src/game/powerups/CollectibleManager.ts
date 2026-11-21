import { GAME_CONFIG } from '../Config';
import { PowerUpCollision } from './PowerUpCollision';
import {
  CollectibleDefinition,
  CollectibleType,
  getCollectibleDef,
} from './PowerUpRegistry';

export interface ActiveCollectible {
  id: number;
  active: boolean;
  type: CollectibleType;
  x: number;
  y: number;
  baseY: number;
  phase: number;
  attracted: boolean;
}

export interface CollectedItemEvent {
  type: CollectibleType;
  x: number;
  y: number;
  def: CollectibleDefinition;
  attractedByMagnet: boolean;
}

const MAX_COLLECTIBLE_POOL = 12;
const MAGNET_RADIUS = 160;
const MAGNET_PULL_SPEED = 295;

export class CollectibleManager {
  private pool: ActiveCollectible[] = [];
  private nextId = 1;
  private animTime = 0;

  constructor() {
    for (let i = 0; i < MAX_COLLECTIBLE_POOL; i++) {
      this.pool.push({
        id: 0,
        active: false,
        type: 'coin',
        x: 0,
        y: 0,
        baseY: 0,
        phase: 0,
        attracted: false,
      });
    }
  }

  public reset(): void {
    this.animTime = 0;
    for (const item of this.pool) {
      item.active = false;
      item.attracted = false;
    }
  }

  public getActiveCount(): number {
    let count = 0;
    for (const c of this.pool) {
      if (c.active) count += 1;
    }
    return count;
  }

  public getActiveItems(): readonly ActiveCollectible[] {
    return this.pool;
  }

  public spawn(type: CollectibleType, x: number, y: number): ActiveCollectible | null {
    // Limit simultaneous active collectibles for visual clarity & mobile performance
    if (this.getActiveCount() >= 8) return null;

    for (const slot of this.pool) {
      if (!slot.active) {
        slot.id = this.nextId++;
        slot.active = true;
        slot.type = type;
        slot.x = x;
        slot.y = y;
        slot.baseY = y;
        slot.phase = Math.random() * Math.PI * 2;
        slot.attracted = false;
        return slot;
      }
    }
    return null;
  }

  public update(
    dt: number,
    scrollSpeed: number,
    playerX: number,
    playerY: number,
    playerRadius: number,
    magnetActive: boolean
  ): CollectedItemEvent[] {
    this.animTime += dt;
    const pickedUp: CollectedItemEvent[] = [];

    for (const c of this.pool) {
      if (!c.active) continue;

      c.x -= scrollSpeed * dt;
      c.phase += dt * 4.2;

      if (magnetActive) {
        const dx = playerX - c.x;
        const dy = playerY - c.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= MAGNET_RADIUS * MAGNET_RADIUS && distSq > 1) {
          c.attracted = true;
          const dist = Math.sqrt(distSq);
          const pull = MAGNET_PULL_SPEED * (1.28 - (dist / MAGNET_RADIUS) * 0.45);
          c.x += (dx / dist) * pull * dt;
          c.baseY += (dy / dist) * pull * dt;
          c.y = c.baseY;
        } else {
          c.attracted = false;
          c.y = c.baseY + Math.sin(c.phase) * 6;
        }
      } else {
        c.attracted = false;
        c.y = c.baseY + Math.sin(c.phase) * 6;
      }

      const def = getCollectibleDef(c.type);
      if (
        PowerUpCollision.circlesOverlap(
          playerX,
          playerY,
          playerRadius + 4,
          c.x,
          c.y,
          def.radius
        )
      ) {
        c.active = false;
        const wasAttracted = c.attracted || magnetActive;
        pickedUp.push({
          type: c.type,
          x: c.x,
          y: c.y,
          def,
          attractedByMagnet: wasAttracted,
        });
        continue;
      }

      if (c.x < -36) {
        c.active = false;
      }
    }

    return pickedUp;
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    playerX: number,
    playerY: number,
    magnetActive: boolean,
    lowFx: boolean
  ): void {
    const outline = GAME_CONFIG.colors.darkOutline;

    for (const c of this.pool) {
      if (!c.active) continue;
      const def = getCollectibleDef(c.type);

      // Magnet attraction visual line
      if (magnetActive && c.attracted && !lowFx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(playerX, playerY);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(c.x, c.y);

      // Gentle outer glow aura
      if (!lowFx) {
        ctx.fillStyle =
          c.type === 'gem'
            ? 'rgba(56, 189, 248, 0.28)'
            : c.type === 'star'
              ? 'rgba(253, 224, 71, 0.34)'
              : 'rgba(255, 216, 77, 0.28)';
        ctx.beginPath();
        ctx.arc(0, 0, def.radius + 5 + Math.sin(c.phase * 1.5) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (c.type === 'coin') {
        const spinWidth = 0.72 + Math.abs(Math.cos(c.phase * 0.7)) * 0.28;
        ctx.scale(spinWidth, 1);
        ctx.fillStyle = '#FFD84D';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, 0, def.radius * 0.62, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFF9C4';
        ctx.fillRect(-2, -6, 4, 12);
      } else if (c.type === 'star') {
        ctx.rotate(Math.sin(c.phase * 0.6) * 0.18);
        this.drawFivePointStar(ctx, def.radius + 1, def.radius * 0.48, '#FDE047', outline);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(-3, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Gem diamond shape
        ctx.rotate(Math.sin(c.phase * 0.6) * 0.12);
        const r = def.radius;
        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(r * 0.9, -r * 0.2);
        ctx.lineTo(0, r);
        ctx.lineTo(-r * 0.9, -r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#BAE6FD';
        ctx.beginPath();
        ctx.moveTo(0, -r + 3);
        ctx.lineTo(r * 0.45, -r * 0.2);
        ctx.lineTo(0, r * 0.35);
        ctx.lineTo(-r * 0.45, -r * 0.2);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawFivePointStar(
    ctx: CanvasRenderingContext2D,
    outerR: number,
    innerR: number,
    fill: string,
    stroke: string
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
}
