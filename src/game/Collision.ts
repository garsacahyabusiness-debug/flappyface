import { Pipe } from './Pipe';
import { Player } from './Player';

export interface CollisionResult {
  collided: boolean;
  reason: 'pipe' | 'ground' | 'ceiling' | null;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function circleIntersectsRect(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export class Collision {
  public check(player: Player, pipes: Pipe[], groundY: number): CollisionResult {
    const r = player.collisionRadius;

    // Ground collision
    if (player.y + r >= groundY) {
      return { collided: true, reason: 'ground' };
    }

    // Top sky boundary collision
    if (player.y - r <= 0) {
      return { collided: true, reason: 'ceiling' };
    }

    // Pipe collision (shaft + lip cap)
    for (const pipe of pipes) {
      const rects = pipe.getCollisionRects(groundY);
      for (const rect of rects) {
        if (circleIntersectsRect(player.x, player.y, r, rect.x, rect.y, rect.width, rect.height)) {
          return { collided: true, reason: 'pipe' };
        }
      }
    }

    return { collided: false, reason: null };
  }
}
