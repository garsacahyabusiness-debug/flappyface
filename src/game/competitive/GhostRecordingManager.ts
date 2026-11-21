import { SkinId } from '../character/CharacterSkinManager';
import { GAME_CONFIG } from '../Config';
import { WorldId } from '../worlds/WorldRegistry';
import {
  COMPETITIVE_STORAGE_VERSION,
  GhostFrame,
  GhostReplaySample,
  GhostRunRecording,
} from './CompetitiveTypes';

const GHOST_STORAGE_KEY = 'flappy_face_ghost_runs';
const SAMPLE_INTERVAL_SEC = 0.066; // ~15Hz smooth & lightweight
const MAX_GHOST_FRAMES = 900; // <= 60s at 15Hz or downsampled stride if longer

export class GhostRecordingManager {
  private pbGhost: GhostRunRecording | null = null;
  private prevGhost: GhostRunRecording | null = null;

  private activeFrames: GhostFrame[] = [];
  private activeElapsedSec = 0;
  private lastSampleAtSec = -1;
  private isRecording = false;

  constructor() {
    this.load();
  }

  public reloadFromStorage(): void {
    this.load();
  }

  public reset(): void {
    this.pbGhost = null;
    this.prevGhost = null;
    this.cancelRecording();
    this.save();
  }

  public startRecording(): void {
    this.activeFrames = [];
    this.activeElapsedSec = 0;
    this.lastSampleAtSec = -1;
    this.isRecording = true;
  }

  public cancelRecording(): void {
    this.activeFrames = [];
    this.activeElapsedSec = 0;
    this.lastSampleAtSec = -1;
    this.isRecording = false;
  }

  public recordFrame(dt: number, y: number, rotation: number): void {
    if (!this.isRecording) return;
    this.activeElapsedSec += Math.max(0, dt);

    if (
      this.lastSampleAtSec < 0 ||
      this.activeElapsedSec - this.lastSampleAtSec >= SAMPLE_INTERVAL_SEC
    ) {
      this.lastSampleAtSec = this.activeElapsedSec;
      this.activeFrames.push({
        t: Number(this.activeElapsedSec.toFixed(3)),
        y: Number(y.toFixed(1)),
        rot: Number(rotation.toFixed(3)),
      });

      // Keep memory & storage capped without losing trajectory coverage
      if (this.activeFrames.length > MAX_GHOST_FRAMES) {
        const decimated: GhostFrame[] = [];
        for (let i = 0; i < this.activeFrames.length; i += 2) {
          decimated.push(this.activeFrames[i]);
        }
        const last = this.activeFrames[this.activeFrames.length - 1];
        if (decimated[decimated.length - 1] !== last) {
          decimated.push(last);
        }
        this.activeFrames = decimated;
      }
    }
  }

  public finalizeRecording(meta: {
    score: number;
    characterId: string;
    skinId: SkinId;
    worldId: WorldId;
    nowMs?: number;
  }): GhostFrame[] {
    const captured = [...this.activeFrames];
    this.isRecording = false;
    this.activeFrames = [];

    const score = Math.max(0, Math.floor(meta.score));
    const durationSec = Number(this.activeElapsedSec.toFixed(2));
    this.activeElapsedSec = 0;
    this.lastSampleAtSec = -1;

    if (captured.length < 3 || score < 1) {
      return captured;
    }

    const nowMs = meta.nowMs ?? Date.now();
    const prevRec: GhostRunRecording = {
      id: `ghost_prev_${nowMs}`,
      version: COMPETITIVE_STORAGE_VERSION,
      label: 'PREV RUN',
      characterId: meta.characterId,
      skinId: meta.skinId,
      worldId: meta.worldId,
      score,
      durationSec,
      recordedAt: nowMs,
      frames: captured,
    };
    this.prevGhost = prevRec;

    if (!this.pbGhost || score >= this.pbGhost.score) {
      this.pbGhost = {
        ...prevRec,
        id: `ghost_pb_${nowMs}`,
        label: 'PB GHOST',
      };
    }

    this.save();
    return captured;
  }

  public hasPbGhost(): boolean {
    return Boolean(this.pbGhost && this.pbGhost.frames.length >= 3);
  }

  public hasPrevGhost(): boolean {
    return Boolean(this.prevGhost && this.prevGhost.frames.length >= 3);
  }

  public getPbGhost(): GhostRunRecording | null {
    return this.pbGhost;
  }

  public getPrevGhost(): GhostRunRecording | null {
    return this.prevGhost;
  }

  /**
   * Pure read-only playback sampling with linear interpolation. Never affects collision or physics.
   */
  public sampleGhostAtTime(
    source: 'pb' | 'prev',
    elapsedSec: number
  ): GhostReplaySample | null {
    const rec = source === 'pb' ? this.pbGhost : this.prevGhost;
    if (!rec || rec.frames.length < 2) return null;

    const frames = rec.frames;
    const t = Math.max(0, elapsedSec);
    const lastFrame = frames[frames.length - 1];

    if (t >= lastFrame.t) {
      return {
        x: GAME_CONFIG.player.startX,
        y: lastFrame.y,
        rot: lastFrame.rot,
        characterId: rec.characterId,
        skinId: rec.skinId,
        label: rec.label,
        score: rec.score,
        finished: true,
      };
    }

    // Binary search for bracketing frames
    let lo = 0;
    let hi = frames.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (frames[mid].t <= t) {
        lo = mid;
      } else {
        hi = mid;
      }
    }

    const a = frames[lo];
    const b = frames[hi];
    const span = Math.max(0.0001, b.t - a.t);
    const alpha = Math.max(0, Math.min(1, (t - a.t) / span));

    return {
      x: GAME_CONFIG.player.startX,
      y: a.y + (b.y - a.y) * alpha,
      rot: a.rot + (b.rot - a.rot) * alpha,
      characterId: rec.characterId,
      skinId: rec.skinId,
      label: rec.label,
      score: rec.score,
      finished: false,
    };
  }

  private sanitizeRecording(raw: unknown, fallbackLabel: string): GhostRunRecording | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Partial<GhostRunRecording>;
    if (!Array.isArray(r.frames) || r.frames.length < 2) return null;
    const frames: GhostFrame[] = [];
    for (const f of r.frames.slice(0, MAX_GHOST_FRAMES)) {
      if (
        f &&
        typeof f.t === 'number' &&
        Number.isFinite(f.t) &&
        typeof f.y === 'number' &&
        Number.isFinite(f.y) &&
        typeof f.rot === 'number' &&
        Number.isFinite(f.rot)
      ) {
        frames.push({ t: f.t, y: f.y, rot: f.rot });
      }
    }
    if (frames.length < 2) return null;
    return {
      id: typeof r.id === 'string' ? r.id : `ghost_${Date.now()}`,
      version: typeof r.version === 'number' ? r.version : COMPETITIVE_STORAGE_VERSION,
      label: typeof r.label === 'string' ? r.label : fallbackLabel,
      characterId: typeof r.characterId === 'string' ? r.characterId : 'classic_bird',
      skinId: (typeof r.skinId === 'string' ? r.skinId : 'default') as SkinId,
      worldId: (typeof r.worldId === 'string' ? r.worldId : 'green_valley') as WorldId,
      score: typeof r.score === 'number' && Number.isFinite(r.score) ? Math.max(0, Math.floor(r.score)) : 0,
      durationSec: typeof r.durationSec === 'number' && Number.isFinite(r.durationSec) ? Math.max(0, r.durationSec) : 0,
      recordedAt: typeof r.recordedAt === 'number' && Number.isFinite(r.recordedAt) ? r.recordedAt : Date.now(),
      frames,
    };
  }

  private load(): void {
    this.pbGhost = null;
    this.prevGhost = null;
    try {
      const raw = window.localStorage.getItem(GHOST_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { pbGhost?: unknown; prevGhost?: unknown };
      if (!parsed || typeof parsed !== 'object') return;
      this.pbGhost = this.sanitizeRecording(parsed.pbGhost, 'PB GHOST');
      this.prevGhost = this.sanitizeRecording(parsed.prevGhost, 'PREV RUN');
    } catch {
      this.pbGhost = null;
      this.prevGhost = null;
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(
        GHOST_STORAGE_KEY,
        JSON.stringify({
          version: COMPETITIVE_STORAGE_VERSION,
          pbGhost: this.pbGhost,
          prevGhost: this.prevGhost,
        })
      );
    } catch {
      // Ignore quota errors cleanly
    }
  }
}

export const ghostRecordingManager = new GhostRecordingManager();
