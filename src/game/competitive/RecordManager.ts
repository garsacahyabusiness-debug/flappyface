import { getCharacterById } from '../character/CharacterRegistry';
import { getWorldById, WorldId } from '../worlds/WorldRegistry';
import {
  COMPETITIVE_STORAGE_VERSION,
  CompletedRunInput,
  PersonalBestBreakEvent,
  PersonalRecordEntry,
  PersonalRecordType,
} from './CompetitiveTypes';

const MAX_STORED_RECORDS = 120;

export class RecordManager {
  private records = new Map<string, PersonalRecordEntry>();
  private recentRecords: PersonalRecordEntry[] = [];
  private totalBreaks = 0;

  public hydrate(
    recordsRaw: unknown,
    recentRaw: unknown,
    totalBreaksRaw: unknown
  ): void {
    this.records.clear();
    this.recentRecords = [];
    this.totalBreaks =
      typeof totalBreaksRaw === 'number' && Number.isFinite(totalBreaksRaw) && totalBreaksRaw >= 0
        ? Math.floor(totalBreaksRaw)
        : 0;

    if (Array.isArray(recordsRaw)) {
      for (const item of recordsRaw) {
        const clean = this.sanitizeRecord(item);
        if (clean) {
          this.records.set(this.makeMapKey(clean.recordType, clean.scopeKey), clean);
        }
      }
    }

    if (Array.isArray(recentRaw)) {
      for (const item of recentRaw) {
        const clean = this.sanitizeRecord(item);
        if (clean) {
          this.recentRecords.push(clean);
        }
      }
      this.recentRecords = this.recentRecords.slice(0, 20);
    }
  }

  public exportState(): {
    records: PersonalRecordEntry[];
    recentRecords: PersonalRecordEntry[];
    totalBreaks: number;
  } {
    return {
      records: Array.from(this.records.values()).sort((a, b) => b.date - a.date),
      recentRecords: [...this.recentRecords],
      totalBreaks: this.totalBreaks,
    };
  }

  public reset(): void {
    this.records.clear();
    this.recentRecords = [];
    this.totalBreaks = 0;
  }

  public getAllRecords(): PersonalRecordEntry[] {
    return Array.from(this.records.values()).sort((a, b) => b.score - a.score || b.date - a.date);
  }

  public getRecentRecords(limit = 10): PersonalRecordEntry[] {
    return this.recentRecords.slice(0, limit);
  }

  public getRecord(recordType: PersonalRecordType, scopeKey = 'global'): PersonalRecordEntry | null {
    return this.records.get(this.makeMapKey(recordType, scopeKey)) ?? null;
  }

  public getHighestScore(): number {
    return this.getRecord('highest_score', 'global')?.score ?? 0;
  }

  public getTotalRecordsCount(): number {
    return this.records.size;
  }

  public getPersonalBestBreaksCount(): number {
    return this.totalBreaks;
  }

  /**
   * Evaluates a completed, valid gameplay run and updates all applicable personal records.
   */
  public recordCompletedRun(
    input: CompletedRunInput,
    options?: {
      challengeCompletedThisRun?: boolean;
      knownGlobalBest?: number;
      playerId?: string;
    }
  ): {
    brokenRecords: PersonalRecordEntry[];
    highestBestEvent: PersonalBestBreakEvent | null;
  } {
    const score = Math.max(0, Math.floor(input.score));
    const pipesPassed = Math.max(0, Math.floor(input.pipesPassed));
    const durationSec = Math.max(0, Number(input.durationSec.toFixed(2)));
    const date = input.nowMs ?? Date.now();
    const playerId = options?.playerId ?? 'local_player';

    // Reject completely invalid / zero-effort telemetry when evaluating records where score==0 && pipes==0 && duration<0.4
    if (score === 0 && pipesPassed === 0 && durationSec < 0.4) {
      return { brokenRecords: [], highestBestEvent: null };
    }

    const brokenRecords: PersonalRecordEntry[] = [];
    let highestBestEvent: PersonalBestBreakEvent | null = null;

    const worldName = getWorldById(input.worldId).name;
    const charName = getCharacterById(input.characterId).name;

    const tryUpdate = (
      recordType: PersonalRecordType,
      scopeKey: string,
      label: string,
      candidateValue: number,
      mode: 'max' | 'min' = 'max'
    ): { updated: boolean; prevValue: number; entry: PersonalRecordEntry | null } => {
      if (candidateValue <= 0) {
        return { updated: false, prevValue: 0, entry: null };
      }
      const key = this.makeMapKey(recordType, scopeKey);
      const existing = this.records.get(key);
      const prevValue = existing ? existing.value : 0;

      const isBetter = existing
        ? mode === 'max'
          ? candidateValue > existing.value
          : candidateValue < existing.value
        : true;

      if (!isBetter) {
        return { updated: false, prevValue, entry: null };
      }

      const entry: PersonalRecordEntry = {
        id: `rec_${recordType}_${scopeKey}_${date}`,
        version: COMPETITIVE_STORAGE_VERSION,
        playerId,
        recordType,
        scopeKey,
        label,
        score,
        value: candidateValue,
        date,
        worldId: input.worldId,
        characterId: input.characterId,
        gameMode: input.gameMode,
        powerUpCount: Math.max(0, Math.floor(input.powerUpCount)),
        usedPowerUp: Boolean(input.usedPowerUp),
        runDurationSec: durationSec,
        pipesPassed,
        challengeModifier: input.activeChallengeId,
      };
      this.records.set(key, entry);
      if (this.records.size > MAX_STORED_RECORDS) {
        // Keep highest_score + top records bounded cleanly
        const sorted = Array.from(this.records.entries()).sort((a, b) => b[1].date - a[1].date);
        const trimmed = sorted.slice(0, MAX_STORED_RECORDS);
        this.records = new Map(trimmed);
      }
      brokenRecords.push(entry);
      return { updated: true, prevValue, entry };
    };

    // 1. Highest Overall Score
    const prevKnownBest = Math.max(
      this.getRecord('highest_score', 'global')?.score ?? 0,
      Math.max(0, Math.floor(options?.knownGlobalBest ?? 0))
    );
    const highestUpdate = tryUpdate('highest_score', 'global', 'Highest Score', score, 'max');
    if (highestUpdate.updated && score > prevKnownBest) {
      if (prevKnownBest > 0) {
        this.totalBreaks += 1;
      }
      const delta = score - prevKnownBest;
      const improvementPercent =
        prevKnownBest > 0 ? Math.round((delta / prevKnownBest) * 100) : 100;
      highestBestEvent = {
        id: `pb_${date}_${score}`,
        recordType: 'highest_score',
        label: 'Highest Score',
        previousScore: prevKnownBest,
        newScore: score,
        delta,
        improvementPercent,
        date,
        characterId: input.characterId,
        worldId: input.worldId,
        gameMode: input.gameMode,
        pipesPassed,
        runDurationSec: durationSec,
        powerUpCount: Math.max(0, Math.floor(input.powerUpCount)),
      };
    }

    // 2. Green Valley Best
    if (input.worldId === 'green_valley') {
      tryUpdate('green_valley_best', 'green_valley', 'Green Valley Best', score, 'max');
    }

    // 3. Per-World Best
    tryUpdate('world_best', `world:${input.worldId}`, `${worldName} Best`, score, 'max');

    // 4. Per-Character Best
    tryUpdate('character_best', `char:${input.characterId}`, `${charName} Best`, score, 'max');

    // 5. No Power-Up Best
    if (!input.usedPowerUp && input.powerUpCount === 0) {
      tryUpdate('no_powerup_best', 'no_powerup', 'No Power-Up Best', score, 'max');
    }

    // 6. Mode Bests
    if (input.gameMode === 'solo') {
      tryUpdate('solo_best', 'solo', 'Solo Best', score, 'max');
    } else if (input.gameMode === 'challenge') {
      tryUpdate('challenge_best', 'challenge', 'Challenge Best', score, 'max');
    } else if (input.gameMode === 'bo3' || input.gameMode === 'bo5') {
      tryUpdate('tournament_best', 'tournament', 'Tournament Best', score, 'max');
    }

    // 7. Longest Survival
    if (durationSec >= 1) {
      tryUpdate('longest_survival', 'global', 'Longest Survival', durationSec, 'max');
    }

    // 8. Longest Pipe Streak
    if (pipesPassed > 0) {
      tryUpdate('longest_pipe_streak', 'global', 'Longest Pipe Streak', pipesPassed, 'max');
    }

    // 9. Best Perfect Run (no collision/shield save/revive before reaching score)
    if (!input.usedShield && !input.usedSecondChance && (!input.collided || score > 0)) {
      if (!input.usedShield && !input.usedSecondChance) {
        tryUpdate('best_perfect_run', 'global', 'Best Pure/Perfect Run', score, 'max');
      }
    }

    // 10. Fastest Challenge Completion (min seconds to complete a Challenge Mode run)
    if (
      input.gameMode === 'challenge' &&
      options?.challengeCompletedThisRun &&
      durationSec >= 0.5
    ) {
      tryUpdate(
        'fastest_challenge_completion',
        input.activeChallengeId ? `challenge:${input.activeChallengeId}` : 'global',
        'Fastest Challenge Win',
        durationSec,
        'min'
      );
    }

    if (brokenRecords.length > 0) {
      this.recentRecords = [...brokenRecords.slice(0, 6), ...this.recentRecords].slice(0, 20);
    }

    return {
      brokenRecords,
      highestBestEvent,
    };
  }

  private makeMapKey(recordType: PersonalRecordType, scopeKey: string): string {
    return `${recordType}::${scopeKey}`;
  }

  private sanitizeRecord(raw: unknown): PersonalRecordEntry | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Partial<PersonalRecordEntry>;
    if (
      typeof r.id !== 'string' ||
      typeof r.recordType !== 'string' ||
      typeof r.scopeKey !== 'string' ||
      typeof r.value !== 'number' ||
      !Number.isFinite(r.value)
    ) {
      return null;
    }
    return {
      id: r.id,
      version: typeof r.version === 'number' ? r.version : COMPETITIVE_STORAGE_VERSION,
      playerId: typeof r.playerId === 'string' ? r.playerId : 'local_player',
      recordType: r.recordType as PersonalRecordType,
      scopeKey: r.scopeKey,
      label: typeof r.label === 'string' ? r.label : r.recordType,
      score: typeof r.score === 'number' && Number.isFinite(r.score) ? Math.max(0, Math.floor(r.score)) : 0,
      value: Math.max(0, r.value),
      date: typeof r.date === 'number' && Number.isFinite(r.date) ? r.date : Date.now(),
      worldId: (typeof r.worldId === 'string' ? r.worldId : 'green_valley') as WorldId,
      characterId: typeof r.characterId === 'string' ? r.characterId : 'classic_bird',
      gameMode: (typeof r.gameMode === 'string' ? r.gameMode : 'solo') as PersonalRecordEntry['gameMode'],
      powerUpCount: typeof r.powerUpCount === 'number' && Number.isFinite(r.powerUpCount) ? Math.max(0, Math.floor(r.powerUpCount)) : 0,
      usedPowerUp: Boolean(r.usedPowerUp),
      runDurationSec: typeof r.runDurationSec === 'number' && Number.isFinite(r.runDurationSec) ? Math.max(0, r.runDurationSec) : 0,
      pipesPassed: typeof r.pipesPassed === 'number' && Number.isFinite(r.pipesPassed) ? Math.max(0, Math.floor(r.pipesPassed)) : 0,
      challengeModifier: typeof r.challengeModifier === 'string' ? r.challengeModifier : null,
    };
  }
}
