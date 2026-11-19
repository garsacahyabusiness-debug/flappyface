export type ReactionCategory =
  | 'FAIL'
  | 'SKILL_ISSUE'
  | 'EXCUSE'
  | 'ROAST'
  | 'MOTIVATION'
  | 'RANDOM'
  | 'DRAMATIC'
  | 'RELATABLE';

export type ScoreBand = 'zero' | 'low' | 'mid' | 'high' | 'pro';

export interface GameOverReaction {
  id: string;
  text: string;
  category: ReactionCategory;
  scoreBand?: ScoreBand;
}

export const GAME_OVER_REACTIONS: readonly GameOverReaction[] = [
  // Kategori A — Gagal dengan elegan
  { id: 'fail_01', text: 'Yah, baru pemanasan udah tumbang.', category: 'FAIL' },
  { id: 'fail_02', text: 'Pipa: 1, kamu: 0.', category: 'ROAST' },
  { id: 'fail_03', text: 'Katanya mau terbang, kok malah nyungsep?', category: 'FAIL' },
  { id: 'fail_04', text: 'Santai, pilot. Ini baru percobaan.', category: 'MOTIVATION' },
  { id: 'fail_05', text: 'Legenda belum lahir hari ini.', category: 'DRAMATIC' },

  // Kategori B — Skill issue
  { id: 'skill_01', text: 'Fokusnya mana, bang?', category: 'SKILL_ISSUE' },
  { id: 'skill_02', text: 'Wajah boleh ganteng, skill belum tentu.', category: 'ROAST' },
  { id: 'skill_03', text: 'Jempolnya lagi cuti, ya?', category: 'SKILL_ISSUE' },
  { id: 'skill_04', text: 'Burungnya terbang, skill-nya tertinggal.', category: 'SKILL_ISSUE' },
  { id: 'skill_05', text: 'Kayaknya yang perlu di-upgrade bukan karakternya.', category: 'ROAST' },

  // Kategori C — Nyalahin keadaan
  { id: 'excuse_01', text: 'Pipa terakhir tadi sebenarnya bisa dilewati.', category: 'RELATABLE' },
  { id: 'excuse_02', text: 'Tadi anginnya mencurigakan banget.', category: 'EXCUSE' },
  { id: 'excuse_03', text: 'Ini pipa sengaja nyari masalah apa gimana?', category: 'EXCUSE' },
  { id: 'excuse_04', text: 'Layar kecil, cobaan besar.', category: 'EXCUSE' },
  { id: 'excuse_05', text: 'Sepertinya gravitasi hari ini terlalu serius.', category: 'EXCUSE' },

  // Kategori D — Sindiran santai
  { id: 'roast_01', text: 'Terbang 2 detik, istirahat 20 menit.', category: 'ROAST' },
  { id: 'roast_02', text: 'Karier penerbangan berakhir sebelum kontrak.', category: 'DRAMATIC' },
  { id: 'roast_03', text: 'Pilotnya penuh harapan, hasilnya penuh tabrakan.', category: 'FAIL' },
  { id: 'roast_04', text: 'Belum sempat jadi legenda, udah jadi kenangan.', category: 'DRAMATIC' },
  { id: 'roast_05', text: 'Misi terbang gagal. Misi rebahan berhasil.', category: 'RELATABLE' },

  // Tambahan reaksi random & relatable
  { id: 'rand_01', text: 'Burungnya belum siap menghadapi dunia.', category: 'RANDOM' },
  { id: 'rand_02', text: 'Take off berhasil, landing-nya tidak direncanakan.', category: 'FAIL' },
  { id: 'rand_03', text: 'Tadi yakin banget bakal lolos.', category: 'RELATABLE' },
  { id: 'rand_04', text: 'Satu tap lagi... tapi malah tamat.', category: 'DRAMATIC' },
  { id: 'rand_05', text: 'Skill sedang dalam proses pengiriman.', category: 'RANDOM' },
  { id: 'rand_06', text: 'Pilot meminta waktu untuk introspeksi.', category: 'RANDOM' },
  { id: 'rand_07', text: 'Pipa ini punya dendam pribadi.', category: 'EXCUSE' },
  { id: 'rand_08', text: 'Terbang bebas, jatuh tanpa aba-aba.', category: 'DRAMATIC' },
  { id: 'rand_09', text: 'High score masih jauh, tapi jatuhnya dekat.', category: 'RELATABLE' },
  { id: 'rand_10', text: 'Coba lagi, tadi cuma simulasi kegagalan.', category: 'MOTIVATION' },
  { id: 'rand_11', text: 'Niatnya pecahin rekor, malah nyium pipa.', category: 'ROAST' },
  { id: 'rand_12', text: 'Refleks bagus, cuma telat setengah detik.', category: 'SKILL_ISSUE' },
  { id: 'rand_13', text: 'Gas terus, yang penting berani tap.', category: 'MOTIVATION' },
  { id: 'rand_14', text: 'Tadi hampir masuk highlight, hampir doang.', category: 'RELATABLE' },

  // Score-based reactions: Score 0
  { id: 's0_01', text: 'Belum sempat terbang, udah pulang.', category: 'FAIL', scoreBand: 'zero' },
  { id: 's0_02', text: 'Pipa pertama langsung jadi musuh.', category: 'EXCUSE', scoreBand: 'zero' },
  { id: 's0_03', text: 'Tutorial kehidupan belum selesai.', category: 'RANDOM', scoreBand: 'zero' },

  // Score-based reactions: Score 1–4
  { id: 's1_01', text: 'Lumayan, setidaknya udah keluar kandang.', category: 'MOTIVATION', scoreBand: 'low' },
  { id: 's1_02', text: 'Ada kemajuan, walau tipis.', category: 'RELATABLE', scoreBand: 'low' },
  { id: 's1_03', text: 'Sedikit lagi jadi pilot.', category: 'MOTIVATION', scoreBand: 'low' },

  // Score-based reactions: Score 5–9
  { id: 's5_01', text: 'Nah, mulai kelihatan bakatnya.', category: 'MOTIVATION', scoreBand: 'mid' },
  { id: 's5_02', text: 'Lumayan jauh, jangan langsung sombong.', category: 'ROAST', scoreBand: 'mid' },
  { id: 's5_03', text: 'Pilot junior naik pangkat.', category: 'MOTIVATION', scoreBand: 'mid' },

  // Score-based reactions: Score 10–24
  { id: 's10_01', text: 'Oke, ini bukan pemain sembarangan.', category: 'MOTIVATION', scoreBand: 'high' },
  { id: 's10_02', text: 'Udah mulai bikin pipa ketar-ketir.', category: 'DRAMATIC', scoreBand: 'high' },
  { id: 's10_03', text: 'Tinggal sedikit lagi menuju legenda.', category: 'MOTIVATION', scoreBand: 'high' },

  // Score-based reactions: Score 25+
  { id: 's25_01', text: 'Gagalnya aja udah level profesional.', category: 'ROAST', scoreBand: 'pro' },
  { id: 's25_02', text: 'Pipa-pipa mulai mengenali nama kamu.', category: 'DRAMATIC', scoreBand: 'pro' },
  { id: 's25_03', text: 'Respect. Jatuhnya tetap penuh pengalaman.', category: 'MOTIVATION', scoreBand: 'pro' },
];

const RECENT_HISTORY_LIMIT = 3;

export function getScoreBand(score: number): ScoreBand {
  const safe = Math.max(0, Math.floor(score));
  if (safe === 0) return 'zero';
  if (safe <= 4) return 'low';
  if (safe <= 9) return 'mid';
  if (safe <= 24) return 'high';
  return 'pro';
}

export class GameOverReactionSystem {
  private lastMessageId: string | null = null;
  private recentMessageIds: string[] = [];
  private usedIdsInCycle = new Set<string>();
  private lastCategory: ReactionCategory | null = null;
  private rng: () => number;

  constructor(rng: () => number = Math.random) {
    this.rng = rng;
  }

  public resetHistory(): void {
    this.lastMessageId = null;
    this.recentMessageIds = [];
    this.usedIdsInCycle.clear();
    this.lastCategory = null;
  }

  public getAllMessages(): readonly GameOverReaction[] {
    return GAME_OVER_REACTIONS;
  }

  public getLastMessageId(): string | null {
    return this.lastMessageId;
  }

  public getRecentMessageIds(): readonly string[] {
    return [...this.recentMessageIds];
  }

  public pickReaction(score: number): GameOverReaction {
    const band = getScoreBand(score);

    const bandPool = GAME_OVER_REACTIONS.filter((m) => m.scoreBand === band);
    const generalPool = GAME_OVER_REACTIONS.filter((m) => !m.scoreBand);

    // Filter out recently shown messages (strictly avoid last 3 and immediate duplicate)
    const eligibleBand = this.filterNonRecent(bandPool);
    const eligibleGeneral = this.filterNonRecent(generalPool);

    // Prefer score-based messages ~55% of the time when a fresh one in this band is available
    const useScoreBand = eligibleBand.length > 0 && (eligibleGeneral.length === 0 || this.rng() < 0.55);

    let chosen: GameOverReaction;
    if (useScoreBand) {
      chosen = this.pickFromPool(eligibleBand);
    } else if (eligibleGeneral.length > 0) {
      chosen = this.pickFromPool(eligibleGeneral);
    } else {
      // Fallback across all messages while still blocking immediate repeat
      const nonImmediate = GAME_OVER_REACTIONS.filter((m) => m.id !== this.lastMessageId);
      chosen = this.pickFromPool(nonImmediate.length > 0 ? nonImmediate : GAME_OVER_REACTIONS);
    }

    this.recordChoice(chosen);
    return chosen;
  }

  private filterNonRecent(pool: readonly GameOverReaction[]): GameOverReaction[] {
    const freshInCycle = pool.filter(
      (m) =>
        m.id !== this.lastMessageId &&
        !this.recentMessageIds.includes(m.id) &&
        !this.usedIdsInCycle.has(m.id)
    );
    if (freshInCycle.length > 0) {
      return freshInCycle;
    }

    // If all items in this pool were used in the current cycle, reset only this pool's cycle IDs
    for (const item of pool) {
      this.usedIdsInCycle.delete(item.id);
    }

    return pool.filter(
      (m) => m.id !== this.lastMessageId && !this.recentMessageIds.includes(m.id)
    );
  }

  private pickFromPool(pool: readonly GameOverReaction[]): GameOverReaction {
    // Prefer a different category from the immediately preceding Game Over
    const variedCategoryPool =
      this.lastCategory !== null ? pool.filter((m) => m.category !== this.lastCategory) : pool;
    const candidates = variedCategoryPool.length > 0 ? variedCategoryPool : pool;

    const index = Math.min(
      candidates.length - 1,
      Math.max(0, Math.floor(this.rng() * candidates.length))
    );
    return candidates[index];
  }

  private recordChoice(reaction: GameOverReaction): void {
    this.lastMessageId = reaction.id;
    this.lastCategory = reaction.category;
    this.usedIdsInCycle.add(reaction.id);
    this.recentMessageIds.push(reaction.id);
    if (this.recentMessageIds.length > RECENT_HISTORY_LIMIT) {
      this.recentMessageIds.shift();
    }

    if (this.usedIdsInCycle.size >= GAME_OVER_REACTIONS.length) {
      this.usedIdsInCycle.clear();
    }
  }
}

export interface MatchOutcomeReactions {
  winnerLine: string;
  loserLine: string;
  drawLine: string;
}

const WINNER_LINES: readonly string[] = [
  'Terbang paling stabil, layak jadi pilot utama!',
  'Refleks jempol anti-kalah, GG!',
  'Pipa aja sungkan ngadepin kamu hari ini.',
  'Gelar juara aman di tangan!',
];

const LOSER_LINES: readonly string[] = [
  'Santai, masih ada rematch buat bales dendam!',
  'Hampir menang, cuma pipanya lagi rese aja.',
  'Pemanasan selesai, ronde berikutnya pasti gacor!',
  'Jangan mau kalah, tantang balik sekarang!',
];

const DRAW_LINES: readonly string[] = [
  'Sama-sama kuat! Harus buktiin lewat rematch nih.',
  'Skor kembar identik, skill kalian seimbang banget!',
  'Seri! Pipa bingung mau milih siapa yang menang.',
  'Belum ada yang mau ngalah, gas tanding ulang!',
];

export function pickMatchOutcomeReaction(
  p1Score: number,
  p2Score: number,
  roundCount = 1
): MatchOutcomeReactions {
  const seed = Math.abs(p1Score * 7 + p2Score * 13 + roundCount * 5);
  return {
    winnerLine: WINNER_LINES[seed % WINNER_LINES.length],
    loserLine: LOSER_LINES[(seed + 1) % LOSER_LINES.length],
    drawLine: DRAW_LINES[(seed + 2) % DRAW_LINES.length],
  };
}

export const gameOverReactionSystem = new GameOverReactionSystem();
