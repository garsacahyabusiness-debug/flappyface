import { characterSkinManager } from '../character/CharacterSkinManager';
import {
  deterministicPick,
  getLocalDateKey,
  getLocalWeekKey,
  getMsUntilNextDailyReset,
  getMsUntilNextWeeklyReset,
} from '../missions/MissionDateUtils';
import { currencyManager } from '../powerups/CurrencyManager';
import { playerProgressionManager } from '../progression/PlayerProgressionManager';
import {
  ALL_CHALLENGE_MAP,
  CHALLENGE_POOL,
  DAILY_COMPETITIVE_POOL,
  WEEKLY_COMPETITIVE_POOL,
} from './ChallengeRegistry';
import {
  ChallengeDefinition,
  ChallengeProgressItem,
  ChallengeStatus,
  CompletedRunInput,
  DailyChallengeState,
  WeeklyChallengeState,
} from './CompetitiveTypes';

interface StoredChallengeProgress {
  progress: number;
  status: ChallengeStatus;
  bestAttemptValue: number;
  completedAt: number | null;
  claimedAt: number | null;
  fastestCompletionSec: number | null;
}

export interface ChallengeEligibilityContext {
  powerUpsEnabled: boolean;
  collectiblesEnabled: boolean;
  unlockedWorldIds: readonly string[];
  unlockedCharacterIds: readonly string[];
}

export class ChallengeManager {
  private states = new Map<string, StoredChallengeProgress>();
  private dailyState: DailyChallengeState | null = null;
  private weeklyState: WeeklyChallengeState | null = null;
  private activeChallengeId: string | null = null;
  private challengesCompletedCount = 0;
  private challengesClaimedCount = 0;
  private dailyCompletedCount = 0;
  private weeklyCompletedCount = 0;
  private perfectRunsCount = 0;
  private nowProvider: () => number;

  constructor(nowProvider: () => number = () => Date.now()) {
    this.nowProvider = nowProvider;
  }

  public setNowProviderForTesting(fn: () => number): void {
    this.nowProvider = fn;
  }

  public hydrate(raw: {
    states?: unknown;
    dailyState?: unknown;
    weeklyState?: unknown;
    activeChallengeId?: unknown;
    challengesCompletedCount?: unknown;
    challengesClaimedCount?: unknown;
    dailyCompletedCount?: unknown;
    weeklyCompletedCount?: unknown;
    perfectRunsCount?: unknown;
  }): void {
    this.states.clear();
    if (raw.states && typeof raw.states === 'object') {
      for (const [id, item] of Object.entries(raw.states as Record<string, unknown>)) {
        if (!ALL_CHALLENGE_MAP.has(id) || !item || typeof item !== 'object') continue;
        const s = item as Partial<StoredChallengeProgress>;
        this.states.set(id, {
          progress: typeof s.progress === 'number' && s.progress >= 0 ? Math.floor(s.progress) : 0,
          status:
            s.status === 'completed' || s.status === 'claimed' ? s.status : 'active',
          bestAttemptValue:
            typeof s.bestAttemptValue === 'number' && s.bestAttemptValue >= 0
              ? Math.floor(s.bestAttemptValue)
              : 0,
          completedAt: typeof s.completedAt === 'number' ? s.completedAt : null,
          claimedAt: typeof s.claimedAt === 'number' ? s.claimedAt : null,
          fastestCompletionSec:
            typeof s.fastestCompletionSec === 'number' && s.fastestCompletionSec > 0
              ? s.fastestCompletionSec
              : null,
        });
      }
    }

    this.dailyState = null;
    if (raw.dailyState && typeof raw.dailyState === 'object') {
      const d = raw.dailyState as Partial<DailyChallengeState>;
      if (typeof d.dateKey === 'string' && typeof d.challengeId === 'string' && ALL_CHALLENGE_MAP.has(d.challengeId)) {
        this.dailyState = {
          dateKey: d.dateKey,
          challengeId: d.challengeId,
          progress: typeof d.progress === 'number' && d.progress >= 0 ? Math.floor(d.progress) : 0,
          status: d.status === 'completed' || d.status === 'claimed' ? d.status : 'active',
          completedAt: typeof d.completedAt === 'number' ? d.completedAt : null,
          claimedAt: typeof d.claimedAt === 'number' ? d.claimedAt : null,
        };
      }
    }

    this.weeklyState = null;
    if (raw.weeklyState && typeof raw.weeklyState === 'object') {
      const w = raw.weeklyState as Partial<WeeklyChallengeState>;
      if (typeof w.weekKey === 'string' && typeof w.challengeId === 'string' && ALL_CHALLENGE_MAP.has(w.challengeId)) {
        this.weeklyState = {
          weekKey: w.weekKey,
          challengeId: w.challengeId,
          progress: typeof w.progress === 'number' && w.progress >= 0 ? Math.floor(w.progress) : 0,
          status: w.status === 'completed' || w.status === 'claimed' ? w.status : 'active',
          completedAt: typeof w.completedAt === 'number' ? w.completedAt : null,
          claimedAt: typeof w.claimedAt === 'number' ? w.claimedAt : null,
        };
      }
    }

    this.activeChallengeId =
      typeof raw.activeChallengeId === 'string' && ALL_CHALLENGE_MAP.has(raw.activeChallengeId)
        ? raw.activeChallengeId
        : null;
    this.challengesCompletedCount =
      typeof raw.challengesCompletedCount === 'number' && raw.challengesCompletedCount >= 0
        ? Math.floor(raw.challengesCompletedCount)
        : 0;
    this.challengesClaimedCount =
      typeof raw.challengesClaimedCount === 'number' && raw.challengesClaimedCount >= 0
        ? Math.floor(raw.challengesClaimedCount)
        : 0;
    this.dailyCompletedCount =
      typeof raw.dailyCompletedCount === 'number' && raw.dailyCompletedCount >= 0
        ? Math.floor(raw.dailyCompletedCount)
        : 0;
    this.weeklyCompletedCount =
      typeof raw.weeklyCompletedCount === 'number' && raw.weeklyCompletedCount >= 0
        ? Math.floor(raw.weeklyCompletedCount)
        : 0;
    this.perfectRunsCount =
      typeof raw.perfectRunsCount === 'number' && raw.perfectRunsCount >= 0
        ? Math.floor(raw.perfectRunsCount)
        : 0;

    this.ensureCurrentPeriods(this.nowProvider());
  }

  public exportState() {
    const states: Record<string, StoredChallengeProgress> = {};
    for (const [id, st] of this.states.entries()) {
      states[id] = { ...st };
    }
    return {
      states,
      dailyState: this.dailyState ? { ...this.dailyState } : null,
      weeklyState: this.weeklyState ? { ...this.weeklyState } : null,
      activeChallengeId: this.activeChallengeId,
      challengesCompletedCount: this.challengesCompletedCount,
      challengesClaimedCount: this.challengesClaimedCount,
      dailyCompletedCount: this.dailyCompletedCount,
      weeklyCompletedCount: this.weeklyCompletedCount,
      perfectRunsCount: this.perfectRunsCount,
    };
  }

  public reset(): void {
    this.states.clear();
    this.dailyState = null;
    this.weeklyState = null;
    this.activeChallengeId = null;
    this.challengesCompletedCount = 0;
    this.challengesClaimedCount = 0;
    this.dailyCompletedCount = 0;
    this.weeklyCompletedCount = 0;
    this.perfectRunsCount = 0;
    this.ensureCurrentPeriods(this.nowProvider());
  }

  public ensureCurrentPeriods(
    nowMs = this.nowProvider(),
    eligibility?: ChallengeEligibilityContext
  ): boolean {
    const dateKey = getLocalDateKey(nowMs);
    const weekKey = getLocalWeekKey(nowMs);
    let changed = false;

    if (!this.dailyState || this.dailyState.dateKey !== dateKey) {
      const eligiblePool = DAILY_COMPETITIVE_POOL.filter((def) => {
        if (!eligibility) return true;
        if (def.metric === 'coins' && !eligibility.collectiblesEnabled) return false;
        return true;
      });
      const pick =
        deterministicPick(
          eligiblePool.length > 0 ? eligiblePool : DAILY_COMPETITIVE_POOL,
          `daily_comp:${dateKey}`
        ) ?? DAILY_COMPETITIVE_POOL[0];
      this.dailyState = {
        dateKey,
        challengeId: pick.id,
        progress: 0,
        status: 'active',
        completedAt: null,
        claimedAt: null,
      };
      changed = true;
    }

    if (!this.weeklyState || this.weeklyState.weekKey !== weekKey) {
      const pick =
        deterministicPick(WEEKLY_COMPETITIVE_POOL, `weekly_comp:${weekKey}`) ??
        WEEKLY_COMPETITIVE_POOL[0];
      this.weeklyState = {
        weekKey,
        challengeId: pick.id,
        progress: 0,
        status: 'active',
        completedAt: null,
        claimedAt: null,
      };
      changed = true;
    }

    return changed;
  }

  public setActiveChallenge(challengeId: string | null): ChallengeDefinition | null {
    if (!challengeId) {
      this.activeChallengeId = null;
      return null;
    }
    const def = ALL_CHALLENGE_MAP.get(challengeId) ?? null;
    this.activeChallengeId = def ? def.id : null;
    return def;
  }

  public getActiveChallenge(): ChallengeDefinition | null {
    return this.activeChallengeId ? ALL_CHALLENGE_MAP.get(this.activeChallengeId) ?? null : null;
  }

  public getChallengeDefinition(id: string | null | undefined): ChallengeDefinition | null {
    if (!id) return null;
    return ALL_CHALLENGE_MAP.get(id) ?? null;
  }

  private checkEligibility(
    def: ChallengeDefinition,
    ctx?: ChallengeEligibilityContext
  ): { eligible: boolean; reason?: string } {
    if (!ctx) return { eligible: true };
    if (def.metric === 'coins' && !ctx.collectiblesEnabled) {
      return { eligible: false, reason: 'Aktifkan Collectibles di Settings' };
    }
    if (
      def.modifiers.requiredWorldId &&
      !ctx.unlockedWorldIds.includes(def.modifiers.requiredWorldId)
    ) {
      return { eligible: false, reason: 'World belum terbuka' };
    }
    if (
      def.modifiers.requiredCharacterId &&
      !ctx.unlockedCharacterIds.includes(def.modifiers.requiredCharacterId)
    ) {
      return { eligible: false, reason: 'Karakter belum terbuka' };
    }
    return { eligible: true };
  }

  public getAllChallenges(ctx?: ChallengeEligibilityContext): ChallengeProgressItem[] {
    return CHALLENGE_POOL.map((def) => {
      const st = this.states.get(def.id);
      const elig = this.checkEligibility(def, ctx);
      return {
        ...def,
        progress: st ? Math.min(def.targetValue, st.progress) : 0,
        status: st?.status ?? 'active',
        bestAttemptValue: st?.bestAttemptValue ?? 0,
        completedAt: st?.completedAt ?? null,
        claimedAt: st?.claimedAt ?? null,
        fastestCompletionSec: st?.fastestCompletionSec ?? null,
        eligible: elig.eligible,
        ineligibleReason: elig.reason,
      };
    });
  }

  public getDailyChallenge(
    nowMs = this.nowProvider(),
    ctx?: ChallengeEligibilityContext
  ): ChallengeProgressItem & { dateKey: string; msUntilReset: number } {
    this.ensureCurrentPeriods(nowMs, ctx);
    const dState = this.dailyState!;
    const def = ALL_CHALLENGE_MAP.get(dState.challengeId) ?? DAILY_COMPETITIVE_POOL[0];
    const elig = this.checkEligibility(def, ctx);
    return {
      ...def,
      progress: Math.min(def.targetValue, dState.progress),
      status: dState.status,
      bestAttemptValue: dState.progress,
      completedAt: dState.completedAt,
      claimedAt: dState.claimedAt,
      fastestCompletionSec: null,
      eligible: elig.eligible,
      ineligibleReason: elig.reason,
      dateKey: dState.dateKey,
      msUntilReset: getMsUntilNextDailyReset(nowMs),
    };
  }

  public getWeeklyChallenge(
    nowMs = this.nowProvider(),
    ctx?: ChallengeEligibilityContext
  ): ChallengeProgressItem & { weekKey: string; msUntilReset: number } {
    this.ensureCurrentPeriods(nowMs, ctx);
    const wState = this.weeklyState!;
    const def = ALL_CHALLENGE_MAP.get(wState.challengeId) ?? WEEKLY_COMPETITIVE_POOL[0];
    const elig = this.checkEligibility(def, ctx);
    return {
      ...def,
      progress: Math.min(def.targetValue, wState.progress),
      status: wState.status,
      bestAttemptValue: wState.progress,
      completedAt: wState.completedAt,
      claimedAt: wState.claimedAt,
      fastestCompletionSec: null,
      eligible: elig.eligible,
      ineligibleReason: elig.reason,
      weekKey: wState.weekKey,
      msUntilReset: getMsUntilNextWeeklyReset(nowMs),
    };
  }

  private getMetricValue(def: ChallengeDefinition, input: CompletedRunInput): number {
    switch (def.metric) {
      case 'score':
        return Math.max(0, Math.floor(input.score));
      case 'pipes':
        return Math.max(0, Math.floor(input.pipesPassed));
      case 'duration_sec':
        return Math.max(0, Math.floor(input.durationSec));
      case 'coins':
        return Math.max(0, Math.floor(input.coinsCollected));
    }
  }

  private satisfiesRunModifiers(def: ChallengeDefinition, input: CompletedRunInput): boolean {
    const mod = def.modifiers;
    if (mod.disablePowerUps && (input.usedPowerUp || input.powerUpCount > 0)) {
      return false;
    }
    if (typeof mod.maxPowerUps === 'number' && input.powerUpCount > mod.maxPowerUps) {
      return false;
    }
    if (mod.requirePerfectRun && (input.usedShield || input.usedSecondChance)) {
      return false;
    }
    if (mod.requiredWorldId && input.worldId !== mod.requiredWorldId) {
      return false;
    }
    if (mod.requiredCharacterId && input.characterId !== mod.requiredCharacterId) {
      return false;
    }
    if (typeof mod.timeLimitSec === 'number' && input.durationSec > mod.timeLimitSec) {
      return false;
    }
    return true;
  }

  public evaluateCompletedRun(
    input: CompletedRunInput,
    ctx?: ChallengeEligibilityContext
  ): {
    completedChallengeDefs: ChallengeDefinition[];
    dailyCompletedNow: boolean;
    weeklyCompletedNow: boolean;
    activeChallengePassed: boolean;
  } {
    const nowMs = input.nowMs ?? this.nowProvider();
    this.ensureCurrentPeriods(nowMs, ctx);

    const completedChallengeDefs: ChallengeDefinition[] = [];
    let dailyCompletedNow = false;
    let weeklyCompletedNow = false;
    let activeChallengePassed = false;

    const isPerfect = !input.usedShield && !input.usedSecondChance && input.score >= 5;
    if (isPerfect) {
      this.perfectRunsCount += 1;
    }

    // 1. Evaluate standard challenges (activeChallenge matches directly, OR non-explicit Solo runs can complete non-exclusive eligible ones if launched in Challenge or Solo cleanly — wait: Solo & Challenge both test skill, and activeChallengeId gets priority!)
    for (const def of CHALLENGE_POOL) {
      const prev = this.states.get(def.id) ?? {
        progress: 0,
        status: 'active' as ChallengeStatus,
        bestAttemptValue: 0,
        completedAt: null,
        claimedAt: null,
        fastestCompletionSec: null,
      };

      // If this challenge has a time limit or is a dedicated challenge trial, evaluate when activeChallengeId matches OR rules are met cleanly
      if (!this.satisfiesRunModifiers(def, input)) {
        this.states.set(def.id, prev);
        continue;
      }

      const value = this.getMetricValue(def, input);
      const nextBest = Math.max(prev.bestAttemptValue, value);
      const nextProgress = Math.max(prev.progress, Math.min(def.targetValue, value));

      if (prev.status === 'active' && value >= def.targetValue) {
        const nextFastest =
          prev.fastestCompletionSec === null
            ? input.durationSec
            : Math.min(prev.fastestCompletionSec, input.durationSec);
        this.states.set(def.id, {
          progress: def.targetValue,
          status: 'completed',
          bestAttemptValue: nextBest,
          completedAt: nowMs,
          claimedAt: null,
          fastestCompletionSec: Number(nextFastest.toFixed(2)),
        });
        this.challengesCompletedCount += 1;
        completedChallengeDefs.push(def);
        if (input.activeChallengeId === def.id) {
          activeChallengePassed = true;
        }
      } else {
        if (prev.status !== 'active' && input.activeChallengeId === def.id && value >= def.targetValue) {
          activeChallengePassed = true;
        }
        const nextFastest =
          prev.status !== 'active' && value >= def.targetValue
            ? prev.fastestCompletionSec === null
              ? Number(input.durationSec.toFixed(2))
              : Math.min(prev.fastestCompletionSec, Number(input.durationSec.toFixed(2)))
            : prev.fastestCompletionSec;
        this.states.set(def.id, {
          ...prev,
          progress: prev.status === 'active' ? nextProgress : def.targetValue,
          bestAttemptValue: nextBest,
          fastestCompletionSec: nextFastest,
        });
      }
    }

    // 2. Daily Competitive Challenge
    if (this.dailyState) {
      const dDef = ALL_CHALLENGE_MAP.get(this.dailyState.challengeId);
      if (dDef && this.dailyState.status === 'active' && this.satisfiesRunModifiers(dDef, input)) {
        const val = this.getMetricValue(dDef, input);
        const nextProg = Math.min(
          dDef.targetValue,
          dDef.isCumulative
            ? this.dailyState.progress + val
            : Math.max(this.dailyState.progress, val)
        );
        this.dailyState.progress = nextProg;
        if (nextProg >= dDef.targetValue) {
          this.dailyState.status = 'completed';
          this.dailyState.completedAt = nowMs;
          this.dailyCompletedCount += 1;
          this.challengesCompletedCount += 1;
          dailyCompletedNow = true;
          completedChallengeDefs.push(dDef);
          if (input.activeChallengeId === dDef.id) {
            activeChallengePassed = true;
          }
        }
      } else if (dDef && input.activeChallengeId === dDef.id && this.satisfiesRunModifiers(dDef, input)) {
        if (this.getMetricValue(dDef, input) >= dDef.targetValue) {
          activeChallengePassed = true;
        }
      }
    }

    // 3. Weekly Competitive Challenge
    if (this.weeklyState) {
      const wDef = ALL_CHALLENGE_MAP.get(this.weeklyState.challengeId);
      if (wDef && this.weeklyState.status === 'active' && this.satisfiesRunModifiers(wDef, input)) {
        const val = this.getMetricValue(wDef, input);
        const nextProg = Math.min(
          wDef.targetValue,
          wDef.isCumulative
            ? this.weeklyState.progress + val
            : Math.max(this.weeklyState.progress, val)
        );
        this.weeklyState.progress = nextProg;
        if (nextProg >= wDef.targetValue) {
          this.weeklyState.status = 'completed';
          this.weeklyState.completedAt = nowMs;
          this.weeklyCompletedCount += 1;
          this.challengesCompletedCount += 1;
          weeklyCompletedNow = true;
          completedChallengeDefs.push(wDef);
          if (input.activeChallengeId === wDef.id) {
            activeChallengePassed = true;
          }
        }
      } else if (wDef && input.activeChallengeId === wDef.id && this.satisfiesRunModifiers(wDef, input)) {
        if (this.getMetricValue(wDef, input) >= wDef.targetValue) {
          activeChallengePassed = true;
        }
      }
    }

    return {
      completedChallengeDefs,
      dailyCompletedNow,
      weeklyCompletedNow,
      activeChallengePassed,
    };
  }

  public claimChallenge(challengeId: string): {
    success: boolean;
    definition: ChallengeDefinition | null;
    coinsGranted: number;
    gemsGranted: number;
    xpGranted: number;
    competitivePoints: number;
    claimEventKey: string | null;
    error?: string;
  } {
    const nowMs = this.nowProvider();
    this.ensureCurrentPeriods(nowMs);
    const def = ALL_CHALLENGE_MAP.get(challengeId) ?? null;
    if (!def) {
      return {
        success: false,
        definition: null,
        coinsGranted: 0,
        gemsGranted: 0,
        xpGranted: 0,
        competitivePoints: 0,
        claimEventKey: null,
        error: 'Challenge tidak ditemukan.',
      };
    }

    let claimEventKey = '';
    if (this.dailyState && this.dailyState.challengeId === challengeId) {
      if (this.dailyState.status !== 'completed') {
        return {
          success: false,
          definition: def,
          coinsGranted: 0,
          gemsGranted: 0,
          xpGranted: 0,
          competitivePoints: 0,
          claimEventKey: null,
          error:
            this.dailyState.status === 'claimed'
              ? 'Hadiah Daily Challenge sudah diklaim.'
              : 'Challenge belum selesai.',
        };
      }
      this.dailyState.status = 'claimed';
      this.dailyState.claimedAt = nowMs;
      claimEventKey = `comp_daily_${this.dailyState.dateKey}_${def.id}`;
    } else if (this.weeklyState && this.weeklyState.challengeId === challengeId) {
      if (this.weeklyState.status !== 'completed') {
        return {
          success: false,
          definition: def,
          coinsGranted: 0,
          gemsGranted: 0,
          xpGranted: 0,
          competitivePoints: 0,
          claimEventKey: null,
          error:
            this.weeklyState.status === 'claimed'
              ? 'Hadiah Weekly Challenge sudah diklaim.'
              : 'Challenge belum selesai.',
        };
      }
      this.weeklyState.status = 'claimed';
      this.weeklyState.claimedAt = nowMs;
      claimEventKey = `comp_weekly_${this.weeklyState.weekKey}_${def.id}`;
    } else {
      const st = this.states.get(challengeId);
      if (!st || st.status !== 'completed') {
        return {
          success: false,
          definition: def,
          coinsGranted: 0,
          gemsGranted: 0,
          xpGranted: 0,
          competitivePoints: 0,
          claimEventKey: null,
          error:
            st?.status === 'claimed'
              ? 'Hadiah Challenge sudah diklaim.'
              : 'Challenge belum selesai.',
        };
      }
      this.states.set(challengeId, {
        ...st,
        status: 'claimed',
        claimedAt: nowMs,
      });
      claimEventKey = `comp_ch_${def.id}`;
    }

    this.challengesClaimedCount += 1;

    // Atomic payouts via CurrencyManager & PlayerProgressionManager
    currencyManager.awardEventOnce(claimEventKey, def.reward.coins, def.reward.gems);
    playerProgressionManager.awardXP({
      profileId: 'solo',
      eventId: `${claimEventKey}_xp`,
      amount: def.reward.xp,
      label: `CHALLENGE: ${def.title.toUpperCase()}`,
      category: 'mission',
      timestamp: nowMs,
    });

    if (def.reward.titleId) {
      playerProgressionManager.unlockTitle(def.reward.titleId, 'solo');
    }
    if (def.reward.skinId) {
      characterSkinManager.unlockMilestoneSkin(def.reward.skinId, 'milestone');
    }

    return {
      success: true,
      definition: def,
      coinsGranted: def.reward.coins,
      gemsGranted: def.reward.gems,
      xpGranted: def.reward.xp,
      competitivePoints: def.reward.competitivePoints,
      claimEventKey,
    };
  }

  public getCompletedCount(): number {
    return this.challengesCompletedCount;
  }

  public getClaimedCount(): number {
    return this.challengesClaimedCount;
  }

  public getDailyCompletedCount(): number {
    return this.dailyCompletedCount;
  }

  public getWeeklyCompletedCount(): number {
    return this.weeklyCompletedCount;
  }

  public getPerfectRunsCount(): number {
    return this.perfectRunsCount;
  }

  public getUnclaimedCount(nowMs = this.nowProvider()): number {
    this.ensureCurrentPeriods(nowMs);
    let count = 0;
    for (const st of this.states.values()) {
      if (st.status === 'completed') count += 1;
    }
    if (this.dailyState?.status === 'completed') count += 1;
    if (this.weeklyState?.status === 'completed') count += 1;
    return count;
  }
}
