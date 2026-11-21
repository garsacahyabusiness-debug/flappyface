import { leaderboardManager } from '../progression/LeaderboardManager';
import { loadStoredPlayerNames } from '../TwoPlayerMatch';
import { WorldId } from '../worlds/WorldRegistry';
import {
  AIRivalDifficulty,
  CompetitiveGameMode,
  RivalProfile,
  RivalStanding,
  RivalryHistoryEntry,
} from './CompetitiveTypes';

export const AI_RIVALS: readonly RivalProfile[] = [
  {
    id: 'ai_rookie',
    name: 'ROOKIE BOT',
    sourceType: 'ai',
    isAI: true,
    aiDifficulty: 'ROOKIE',
    targetScore: 8,
    description: 'AI pemula dengan ritme santai. Target skor 8.',
    avatarEmoji: '🤖',
    characterId: 'chicky',
  },
  {
    id: 'ai_casual',
    name: 'CASUAL FLYER',
    sourceType: 'ai',
    isAI: true,
    aiDifficulty: 'CASUAL',
    targetScore: 16,
    description: 'AI stabil di awal permainan. Target skor 16.',
    avatarEmoji: '🐣',
    characterId: 'sunny',
  },
  {
    id: 'ai_skilled',
    name: 'SKILLED ACE',
    sourceType: 'ai',
    isAI: true,
    aiDifficulty: 'SKILLED',
    targetScore: 28,
    description: 'AI terlatih dengan kontrol celah konsisten. Target skor 28.',
    avatarEmoji: '⚡',
    characterId: 'cyber_duck',
  },
  {
    id: 'ai_expert',
    name: 'EXPERT WING',
    sourceType: 'ai',
    isAI: true,
    aiDifficulty: 'EXPERT',
    targetScore: 45,
    description: 'AI berpresisi tinggi di kecepatan menengah. Target skor 45.',
    avatarEmoji: '🔥',
    characterId: 'dragon_bird',
  },
  {
    id: 'ai_legend',
    name: 'LEGEND TITAN',
    sourceType: 'ai',
    isAI: true,
    aiDifficulty: 'LEGEND',
    targetScore: 70,
    description: 'AI puncak penguji skill kompetitif murni. Target skor 70.',
    avatarEmoji: '👑',
    characterId: 'king_bird',
  },
];

const MAX_RIVALRY_HISTORY = 20;

export class RivalManager {
  private selectedRivalId = 'ai_rookie';
  private standings = new Map<string, RivalStanding>();
  private history: RivalryHistoryEntry[] = [];
  private totalDefeated = 0;
  private legendDefeatedCount = 0;

  public hydrate(
    selectedIdRaw: unknown,
    standingsRaw: unknown,
    historyRaw: unknown,
    totalDefeatedRaw: unknown,
    legendDefeatedRaw: unknown
  ): void {
    this.selectedRivalId =
      typeof selectedIdRaw === 'string' && selectedIdRaw.length > 0 ? selectedIdRaw : 'ai_rookie';

    this.standings.clear();
    if (standingsRaw && typeof standingsRaw === 'object') {
      for (const [id, stRaw] of Object.entries(standingsRaw as Record<string, unknown>)) {
        if (!id || !stRaw || typeof stRaw !== 'object') continue;
        const s = stRaw as Partial<RivalStanding>;
        this.standings.set(id, {
          wins: typeof s.wins === 'number' && s.wins >= 0 ? Math.floor(s.wins) : 0,
          losses: typeof s.losses === 'number' && s.losses >= 0 ? Math.floor(s.losses) : 0,
          draws: typeof s.draws === 'number' && s.draws >= 0 ? Math.floor(s.draws) : 0,
          currentStreak:
            typeof s.currentStreak === 'number' && s.currentStreak >= 0
              ? Math.floor(s.currentStreak)
              : 0,
          bestStreak:
            typeof s.bestStreak === 'number' && s.bestStreak >= 0 ? Math.floor(s.bestStreak) : 0,
          bestGap: typeof s.bestGap === 'number' && Number.isFinite(s.bestGap) ? Math.floor(s.bestGap) : 0,
          lastPlayerScore:
            typeof s.lastPlayerScore === 'number' && Number.isFinite(s.lastPlayerScore)
              ? Math.floor(s.lastPlayerScore)
              : null,
          lastGap:
            typeof s.lastGap === 'number' && Number.isFinite(s.lastGap) ? Math.floor(s.lastGap) : null,
        });
      }
    }

    this.history = [];
    if (Array.isArray(historyRaw)) {
      for (const item of historyRaw) {
        if (!item || typeof item !== 'object') continue;
        const h = item as Partial<RivalryHistoryEntry>;
        if (typeof h.rivalId !== 'string' || typeof h.playerScore !== 'number') continue;
        this.history.push({
          id: typeof h.id === 'string' ? h.id : `riv_${Date.now()}_${this.history.length}`,
          rivalId: h.rivalId,
          rivalName: typeof h.rivalName === 'string' ? h.rivalName : h.rivalId,
          isAI: Boolean(h.isAI),
          playerScore: Math.max(0, Math.floor(h.playerScore)),
          rivalScore:
            typeof h.rivalScore === 'number' && Number.isFinite(h.rivalScore)
              ? Math.max(0, Math.floor(h.rivalScore))
              : 0,
          gap: typeof h.gap === 'number' && Number.isFinite(h.gap) ? Math.floor(h.gap) : 0,
          result: h.result === 'win' || h.result === 'loss' || h.result === 'draw' ? h.result : 'loss',
          date: typeof h.date === 'number' && Number.isFinite(h.date) ? h.date : Date.now(),
          worldId: (typeof h.worldId === 'string' ? h.worldId : 'green_valley') as WorldId,
          gameMode: (typeof h.gameMode === 'string' ? h.gameMode : 'solo') as CompetitiveGameMode,
        });
      }
      this.history = this.history.slice(0, MAX_RIVALRY_HISTORY);
    }

    this.totalDefeated =
      typeof totalDefeatedRaw === 'number' && totalDefeatedRaw >= 0 ? Math.floor(totalDefeatedRaw) : 0;
    this.legendDefeatedCount =
      typeof legendDefeatedRaw === 'number' && legendDefeatedRaw >= 0
        ? Math.floor(legendDefeatedRaw)
        : 0;
  }

  public exportState(): {
    selectedRivalId: string;
    standings: Record<string, RivalStanding>;
    history: RivalryHistoryEntry[];
    totalDefeated: number;
    legendDefeatedCount: number;
  } {
    const standings: Record<string, RivalStanding> = {};
    for (const [id, st] of this.standings.entries()) {
      standings[id] = { ...st };
    }
    return {
      selectedRivalId: this.selectedRivalId,
      standings,
      history: [...this.history],
      totalDefeated: this.totalDefeated,
      legendDefeatedCount: this.legendDefeatedCount,
    };
  }

  public reset(): void {
    this.selectedRivalId = 'ai_rookie';
    this.standings.clear();
    this.history = [];
    this.totalDefeated = 0;
    this.legendDefeatedCount = 0;
  }

  public getAvailableRivals(personalBestScore: number): RivalProfile[] {
    const list: RivalProfile[] = [...AI_RIVALS];

    // Add real Player 2 Local target if P2 exists or draft configured
    let p2Best = 0;
    let p2Name = 'PLAYER 2';
    try {
      const names = loadStoredPlayerNames();
      p2Name = names.player2Name || 'PLAYER 2';
      const p2Entry = leaderboardManager.getPlayerStats(p2Name, 'PLAYER 2');
      p2Best = p2Entry?.bestScore ?? 0;

      // Also expose top local 2P profiles (up to 3) if distinct from default P2 name
      const topLocal = leaderboardManager.getTopPlayers();
      for (const entry of topLocal) {
        if (entry.bestScore > 0 && entry.name !== p2Name) {
          list.push({
            id: `local_${entry.name}`,
            name: `${entry.name} (LOCAL)`,
            sourceType: 'local_profile',
            isAI: false,
            targetScore: entry.bestScore,
            description: `Rekor terbaik lokal ${entry.name}: ${entry.bestScore} poin.`,
            avatarEmoji: '👤',
            characterId: 'classic_bird',
          });
        }
        if (list.length >= AI_RIVALS.length + 3) break;
      }
    } catch {
      // Safe fallback in isolated tests
    }

    list.unshift({
      id: 'player2_local',
      name: `${p2Name} (2P LOCAL)`,
      sourceType: 'player2',
      isAI: false,
      targetScore: Math.max(5, p2Best),
      description:
        p2Best > 0
          ? `Kejar skor terbaik ${p2Name} di mode 2 Player (${p2Best}).`
          : `Lawan target awal ${p2Name} (min. 5 atau skor 2P terbaru).`,
      avatarEmoji: '⚔️',
      characterId: 'rocket_bird',
    });

    list.unshift({
      id: 'personal_best',
      name: 'PERSONAL BEST',
      sourceType: 'personal_best',
      isAI: false,
      targetScore: Math.max(1, Math.floor(personalBestScore)),
      description:
        personalBestScore > 0
          ? `Pecahkan rekor pribadimu sendiri (${personalBestScore} poin)!`
          : 'Tetapkan target Personal Best pertamamu!',
      avatarEmoji: '🏆',
      characterId: 'golden_eagle',
    });

    return list;
  }

  public getSelectedRival(personalBestScore: number): RivalProfile {
    const available = this.getAvailableRivals(personalBestScore);
    return available.find((r) => r.id === this.selectedRivalId) ?? AI_RIVALS[0];
  }

  public selectRival(rivalId: string, personalBestScore: number): RivalProfile {
    const available = this.getAvailableRivals(personalBestScore);
    const match = available.find((r) => r.id === rivalId);
    if (match) {
      this.selectedRivalId = match.id;
      return match;
    }
    return this.getSelectedRival(personalBestScore);
  }

  public getStanding(rivalId: string): RivalStanding {
    return (
      this.standings.get(rivalId) ?? {
        wins: 0,
        losses: 0,
        draws: 0,
        currentStreak: 0,
        bestStreak: 0,
        bestGap: 0,
        lastPlayerScore: null,
        lastGap: null,
      }
    );
  }

  public getRivalryHistory(): RivalryHistoryEntry[] {
    return [...this.history];
  }

  public getTotalDefeated(): number {
    return this.totalDefeated;
  }

  public getLegendDefeatedCount(): number {
    return this.legendDefeatedCount;
  }

  public getRecommendedAIDifficulty(personalBestScore: number): AIRivalDifficulty {
    if (personalBestScore >= 60) return 'LEGEND';
    if (personalBestScore >= 40) return 'EXPERT';
    if (personalBestScore >= 22) return 'SKILLED';
    if (personalBestScore >= 12) return 'CASUAL';
    return 'ROOKIE';
  }

  /**
   * Evaluates a completed Solo/Challenge run against the currently active Rival.
   * Pure fair score comparison — zero gameplay/physics side effects.
   */
  public evaluateRunAgainstRival(params: {
    score: number;
    previousPersonalBest: number;
    worldId: WorldId;
    gameMode: CompetitiveGameMode;
    nowMs: number;
  }): {
    rival: RivalProfile;
    defeated: boolean;
    result: 'win' | 'loss' | 'draw';
    gap: number;
    defeatedLegendAI: boolean;
  } {
    const rival = this.getSelectedRival(params.previousPersonalBest);
    const score = Math.max(0, Math.floor(params.score));
    const target = rival.targetScore;
    const gap = score - target;

    const result: 'win' | 'loss' | 'draw' =
      score > target ? 'win' : score === target ? 'draw' : 'loss';

    const prev = this.getStanding(rival.id);
    const next: RivalStanding = { ...prev };
    next.lastPlayerScore = score;
    next.lastGap = gap;

    if (result === 'win') {
      next.wins += 1;
      next.currentStreak += 1;
      next.bestStreak = Math.max(next.bestStreak, next.currentStreak);
      next.bestGap = Math.max(next.bestGap, gap);
      this.totalDefeated += 1;
    } else if (result === 'loss') {
      next.losses += 1;
      next.currentStreak = 0;
    } else {
      next.draws += 1;
    }

    const defeatedLegendAI = result === 'win' && rival.id === 'ai_legend';
    if (defeatedLegendAI) {
      this.legendDefeatedCount += 1;
    }

    this.standings.set(rival.id, next);

    const histEntry: RivalryHistoryEntry = {
      id: `riv_${params.nowMs}_${rival.id}`,
      rivalId: rival.id,
      rivalName: rival.isAI ? `${rival.name} [AI]` : rival.name,
      isAI: rival.isAI,
      playerScore: score,
      rivalScore: target,
      gap,
      result,
      date: params.nowMs,
      worldId: params.worldId,
      gameMode: params.gameMode,
    };
    this.history = [histEntry, ...this.history].slice(0, MAX_RIVALRY_HISTORY);

    return {
      rival,
      defeated: result === 'win',
      result,
      gap,
      defeatedLegendAI,
    };
  }
}
