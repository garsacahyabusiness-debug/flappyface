import { CompetitiveRankInfo, CompetitiveRankTier } from './CompetitiveTypes';

export interface CompetitiveRankTierDef {
  tier: CompetitiveRankTier;
  label: string;
  minPoints: number;
  colorHex: string;
}

export const COMPETITIVE_RANK_TIERS: readonly CompetitiveRankTierDef[] = [
  { tier: 'BRONZE', label: 'BRONZE', minPoints: 0, colorHex: '#B45309' },
  { tier: 'SILVER', label: 'SILVER', minPoints: 100, colorHex: '#64748B' },
  { tier: 'GOLD', label: 'GOLD', minPoints: 300, colorHex: '#D97706' },
  { tier: 'PLATINUM', label: 'PLATINUM', minPoints: 600, colorHex: '#0284C7' },
  { tier: 'DIAMOND', label: 'DIAMOND', minPoints: 1000, colorHex: '#2563EB' },
  { tier: 'MASTER', label: 'MASTER', minPoints: 1500, colorHex: '#7C3AED' },
  { tier: 'GRANDMASTER', label: 'GRANDMASTER', minPoints: 2500, colorHex: '#DB2777' },
  { tier: 'LEGEND', label: 'LEGEND', minPoints: 5000, colorHex: '#DC2626' },
];

export function computeCompetitiveRank(pointsInput: number): CompetitiveRankInfo {
  const points = Math.max(0, Math.floor(Number.isFinite(pointsInput) ? pointsInput : 0));
  let currentIdx = 0;
  for (let i = 0; i < COMPETITIVE_RANK_TIERS.length; i++) {
    if (points >= COMPETITIVE_RANK_TIERS[i].minPoints) {
      currentIdx = i;
    }
  }
  const current = COMPETITIVE_RANK_TIERS[currentIdx];
  const next = COMPETITIVE_RANK_TIERS[currentIdx + 1] ?? null;
  let progressPercent = 100;
  if (next) {
    const span = Math.max(1, next.minPoints - current.minPoints);
    progressPercent = Math.max(
      0,
      Math.min(100, Math.round(((points - current.minPoints) / span) * 100))
    );
  }
  return {
    tier: current.tier,
    label: current.label,
    points,
    minPoints: current.minPoints,
    nextTierLabel: next ? next.label : null,
    nextTierPoints: next ? next.minPoints : null,
    progressPercent,
    colorHex: current.colorHex,
  };
}

const MAX_CLAIMED_POINT_EVENTS = 1200;

export class CompetitiveRankManager {
  private points = 0;
  private claimedEvents: string[] = [];
  private claimedSet = new Set<string>();

  public hydrate(points: unknown, claimedEvents: unknown): void {
    this.points =
      typeof points === 'number' && Number.isFinite(points) && points >= 0 ? Math.floor(points) : 0;
    this.claimedEvents = [];
    this.claimedSet.clear();
    if (Array.isArray(claimedEvents)) {
      for (const id of claimedEvents) {
        if (typeof id === 'string' && id.length > 0 && !this.claimedSet.has(id)) {
          this.claimedSet.add(id);
          this.claimedEvents.push(id);
        }
      }
      if (this.claimedEvents.length > MAX_CLAIMED_POINT_EVENTS) {
        this.claimedEvents = this.claimedEvents.slice(-MAX_CLAIMED_POINT_EVENTS);
        this.claimedSet = new Set(this.claimedEvents);
      }
    }
  }

  public exportState(): { points: number; claimedEvents: string[] } {
    return {
      points: this.points,
      claimedEvents: [...this.claimedEvents],
    };
  }

  public getPoints(): number {
    return this.points;
  }

  public getRankInfo(): CompetitiveRankInfo {
    return computeCompetitiveRank(this.points);
  }

  /**
   * Anti-farming deduplicated competitive point grant.
   */
  public awardPointsOnce(
    eventId: string,
    amount: number
  ): {
    awarded: boolean;
    pointsAdded: number;
    previousRank: CompetitiveRankInfo;
    newRank: CompetitiveRankInfo;
    promoted: boolean;
  } {
    const previousRank = this.getRankInfo();
    const cleanAmount =
      typeof amount === 'number' && Number.isFinite(amount) ? Math.floor(amount) : 0;

    if (!eventId || cleanAmount <= 0 || this.claimedSet.has(eventId)) {
      return {
        awarded: false,
        pointsAdded: 0,
        previousRank,
        newRank: previousRank,
        promoted: false,
      };
    }

    this.claimedSet.add(eventId);
    this.claimedEvents.push(eventId);
    if (this.claimedEvents.length > MAX_CLAIMED_POINT_EVENTS) {
      const removed = this.claimedEvents.shift();
      if (removed) {
        this.claimedSet.delete(removed);
      }
    }

    this.points += cleanAmount;
    const newRank = this.getRankInfo();
    return {
      awarded: true,
      pointsAdded: cleanAmount,
      previousRank,
      newRank,
      promoted: previousRank.tier !== newRank.tier,
    };
  }

  public reset(): void {
    this.points = 0;
    this.claimedEvents = [];
    this.claimedSet.clear();
  }
}
