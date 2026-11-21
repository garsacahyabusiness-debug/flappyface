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

  /**
   * Read-only proximity check for Near-Miss skill tracking.
   * Never alters collision hitboxes or physics.
   */
  public findNearMissPipeIds(
    player: Player,
    pipes: Pipe[],
    groundY: number,
    thresholdPx = 7.5
  ): number[] {
    const r = player.collisionRadius;
    const hitIds: number[] = [];

    for (const pipe of pipes) {
      if (player.x + r < pipe.x || player.x - r > pipe.x + pipe.width) {
        continue;
      }
      const gapTop = pipe.gapY - pipe.gapHeight / 2;
      const gapBottom = pipe.gapY + pipe.gapHeight / 2;
      if (gapBottom >= groundY) continue;

      const distToTop = player.y - r - gapTop;
      const distToBottom = gapBottom - (player.y + r);
      const minClearance = Math.min(distToTop, distToBottom);
      if (minClearance >= 0 && minClearance <= thresholdPx) {
        hitIds.push(pipe.id);
      }
    }

    return hitIds;
  }
}
