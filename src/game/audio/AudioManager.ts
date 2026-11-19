import { AUDIO_CONFIG } from './AudioConfig';
import { MusicController } from './MusicController';
import { SoundGenerator } from './SoundGenerator';

export interface AudioVolumes {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private soundGen = new SoundGenerator();
  private musicCtrl = new MusicController();

  private config: AudioVolumes = {
    masterVolume: AUDIO_CONFIG.defaults.masterVolume,
    musicVolume: AUDIO_CONFIG.defaults.musicVolume,
    sfxVolume: AUDIO_CONFIG.defaults.sfxVolume,
    musicEnabled: true,
    sfxEnabled: true,
  };

  private unlocked = false;
  private musicDesired = false;
  private gameplayPaused = false;
  private pageHidden = false;

  private handleVisibilityChange = (): void => {
    this.pageHidden = typeof document !== 'undefined' ? document.hidden : false;
    if (this.pageHidden) {
      this.fadeOutMusic();
      this.musicCtrl.pause();
    } else if (this.musicDesired && !this.gameplayPaused && this.config.musicEnabled) {
      this.ensureMusicRunning();
    }
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public destroy(): void {
    this.stopMusic();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.unlocked = false;
    }
  }

  public isAudioSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    );
  }

  public unlock(): void {
    if (!this.isAudioSupported()) return;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);

        this.applyGainValues(true);
      } catch {
        this.ctx = null;
        return;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.unlocked = true;
    if (this.musicDesired && !this.gameplayPaused && this.config.musicEnabled && !this.pageHidden) {
      this.ensureMusicRunning();
    }
  }

  public applySettings(next: AudioVolumes): void {
    this.config = {
      masterVolume: clamp01(next.masterVolume),
      musicVolume: clamp01(next.musicVolume),
      sfxVolume: clamp01(next.sfxVolume),
      musicEnabled: Boolean(next.musicEnabled),
      sfxEnabled: Boolean(next.sfxEnabled),
    };

    this.applyGainValues(false);

    if (!this.config.musicEnabled) {
      this.musicCtrl.stop();
    } else if (this.unlocked && this.musicDesired && !this.gameplayPaused && !this.pageHidden) {
      this.ensureMusicRunning();
    }
  }

  private applyGainValues(immediate: boolean): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const masterTarget = clamp01(this.config.masterVolume);
    const musicTarget =
      this.config.musicEnabled && !this.gameplayPaused && !this.pageHidden
        ? clamp01(this.config.musicVolume) * AUDIO_CONFIG.maxMusicGain
        : 0;
    const sfxTarget = this.config.sfxEnabled
      ? clamp01(this.config.sfxVolume) * AUDIO_CONFIG.maxSfxGain
      : 0;

    if (immediate) {
      this.masterGain.gain.setValueAtTime(masterTarget, now);
      this.musicGain.gain.setValueAtTime(musicTarget, now);
      this.sfxGain.gain.setValueAtTime(sfxTarget, now);
    } else {
      this.masterGain.gain.setTargetAtTime(masterTarget, now, 0.025);
      this.musicGain.gain.setTargetAtTime(musicTarget, now, 0.035);
      this.sfxGain.gain.setTargetAtTime(sfxTarget, now, 0.025);
    }
  }

  private ensureMusicRunning(): void {
    if (!this.unlocked || !this.ctx || !this.musicGain) return;
    if (!this.config.musicEnabled || this.gameplayPaused || this.pageHidden) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.applyGainValues(false);
    this.musicCtrl.start(this.ctx, this.musicGain);
  }

  private fadeOutMusic(): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    this.musicGain.gain.setTargetAtTime(0.0001, now, 0.04);
  }

  public startMusic(): void {
    this.musicDesired = true;
    this.gameplayPaused = false;
    this.ensureMusicRunning();
  }

  public stopMusic(): void {
    this.musicDesired = false;
    this.fadeOutMusic();
    this.musicCtrl.stop();
  }

  public pauseGameplayAudio(): void {
    this.gameplayPaused = true;
    this.fadeOutMusic();
    this.musicCtrl.pause();
  }

  public resumeGameplayAudio(): void {
    this.gameplayPaused = false;
    if (this.musicDesired && this.config.musicEnabled && !this.pageHidden) {
      if (this.ctx && this.musicGain) {
        this.applyGainValues(false);
        this.musicCtrl.resume(this.ctx, this.musicGain);
      }
    }
  }

  private canPlaySfx(allowWhilePaused = false): { ctx: AudioContext; out: GainNode } | null {
    if (!this.config.sfxEnabled) return null;
    if (!allowWhilePaused && this.gameplayPaused) return null;
    if (!this.unlocked || !this.ctx || !this.sfxGain) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return { ctx: this.ctx, out: this.sfxGain };
  }

  public playButton(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playButton(ready.ctx, ready.out);
  }

  public playFlap(): void {
    this.unlock();
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playFlap(ready.ctx, ready.out);
  }

  public playScore(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playScore(ready.ctx, ready.out);
  }

  public playCollision(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playCollision(ready.ctx, ready.out);
  }

  public playGameOver(): void {
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playGameOver(ready.ctx, ready.out);
  }

  public playNewBest(): void {
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playNewBest(ready.ctx, ready.out);
  }

  public playAchievement(): void {
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playAchievement(ready.ctx, ready.out);
  }

  public playCountdownTick(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playCountdownTick(ready.ctx, ready.out);
  }

  public playCountdownGo(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playCountdownGo(ready.ctx, ready.out);
  }

  public playVictory(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playVictory(ready.ctx, ready.out);
  }

  public playDraw(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playDraw(ready.ctx, ready.out);
  }
}

export const audioManager = new AudioManager();
