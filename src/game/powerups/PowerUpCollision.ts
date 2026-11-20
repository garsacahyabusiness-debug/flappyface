export class PowerUpCollision {
  public static circlesOverlap(
    ax: number,
    ay: number,
    ar: number,
    bx: number,
    by: number,
    br: number
  ): boolean {
    const dx = ax - bx;
    const dy = ay - by;
    const maxDist = ar + br;
    return dx * dx + dy * dy <= maxDist * maxDist;
  }
}
