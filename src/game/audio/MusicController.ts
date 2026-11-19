import { AUDIO_CONFIG } from './AudioConfig';

export class MusicController {
  private timerId: number | null = null;
  private step = 0;
  private isPlaying = false;
  private isPaused = false;

  public start(ctx: AudioContext, musicGain: GainNode): void {
    this.isPaused = false;
    if (this.isPlaying && this.timerId !== null) {
      return; // Never spawn duplicate music loops
    }
    this.isPlaying = true;
    this.scheduleNextTick(ctx, musicGain);
    this.timerId = window.setInterval(() => {
      this.scheduleNextTick(ctx, musicGain);
    }, AUDIO_CONFIG.musicStepMs);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(ctx: AudioContext, musicGain: GainNode): void {
    this.isPaused = false;
    if (this.isPlaying && this.timerId === null) {
      this.start(ctx, musicGain);
    }
  }

  public stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public resetStep(): void {
    this.step = 0;
  }

  private scheduleNextTick(ctx: AudioContext, musicGain: GainNode): void {
    if (!this.isPlaying || this.isPaused) return;
    if (ctx.state !== 'running') return;
    if (typeof document !== 'undefined' && document.hidden) return;

    const now = ctx.currentTime;
    const len = AUDIO_CONFIG.melodyNotes.length;
    const idx = this.step % len;
    const leadFreq = AUDIO_CONFIG.melodyNotes[idx];
    const bassFreq = AUDIO_CONFIG.bassNotes[idx];

    if (leadFreq > 0) {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(leadFreq, now);
      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.085, now + 0.015);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
      osc.connect(noteGain);
      noteGain.connect(musicGain);
      osc.start(now);
      osc.stop(now + 0.2);
    }

    if (bassFreq > 0) {
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = 'sine';
      bOsc.frequency.setValueAtTime(bassFreq, now);
      bGain.gain.setValueAtTime(0.0001, now);
      bGain.gain.linearRampToValueAtTime(0.07, now + 0.02);
      bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
      bOsc.connect(bGain);
      bGain.connect(musicGain);
      bOsc.start(now);
      bOsc.stop(now + 0.36);
    }

    this.step = (this.step + 1) % len;
  }
}
