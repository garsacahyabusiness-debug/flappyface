import { AmbientAudioManager } from '../worlds/AmbientAudioManager';
import { AmbientSoundType } from '../worlds/WorldRegistry';
import { AUDIO_CONFIG } from './AudioConfig';
import { MusicController } from './MusicController';
import { SoundGenerator } from './SoundGenerator';

export interface AudioVolumes {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  ambientEnabled?: boolean;
  missionSoundsEnabled?: boolean;
  progressionSoundsEnabled?: boolean;
  achievementSoundsEnabled?: boolean;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;

  private soundGen = new SoundGenerator();
  private musicCtrl = new MusicController();
  private ambientCtrl = new AmbientAudioManager();

  private config: AudioVolumes = {
    masterVolume: AUDIO_CONFIG.defaults.masterVolume,
    musicVolume: AUDIO_CONFIG.defaults.musicVolume,
    sfxVolume: AUDIO_CONFIG.defaults.sfxVolume,
    musicEnabled: true,
    sfxEnabled: true,
    ambientEnabled: true,
    missionSoundsEnabled: true,
    progressionSoundsEnabled: true,
    achievementSoundsEnabled: true,
  };

  private unlocked = false;
  private musicDesired = false;
  private ambientType: AmbientSoundType = 'breeze';
  private gameplayPaused = false;
  private pageHidden = false;

  private handleVisibilityChange = (): void => {
    this.pageHidden = typeof document !== 'undefined' ? document.hidden : false;
    if (this.pageHidden) {
      this.fadeOutMusic();
      this.musicCtrl.pause();
      this.ambientCtrl.stop();
    } else if (!this.gameplayPaused) {
      if (this.musicDesired && this.config.musicEnabled) {
        this.ensureMusicRunning();
      }
      if (this.config.ambientEnabled) {
        this.ensureAmbientRunning();
      }
    }
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public destroy(): void {
    this.stopMusic();
    this.ambientCtrl.stop();
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
        this.ambientGain = this.ctx.createGain();

        this.musicGain.connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.ambientGain.connect(this.masterGain);
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
    if (this.config.ambientEnabled && !this.gameplayPaused && !this.pageHidden) {
      this.ensureAmbientRunning();
    }
  }

  public setAmbientType(type: AmbientSoundType): void {
    this.ambientType = type;
    this.ambientCtrl.setType(type);
    if (this.unlocked && this.config.ambientEnabled && !this.gameplayPaused && !this.pageHidden) {
      this.ensureAmbientRunning();
    }
  }

  public applySettings(next: AudioVolumes): void {
    this.config = {
      masterVolume: clamp01(next.masterVolume),
      musicVolume: clamp01(next.musicVolume),
      sfxVolume: clamp01(next.sfxVolume),
      musicEnabled: Boolean(next.musicEnabled),
      sfxEnabled: Boolean(next.sfxEnabled),
      ambientEnabled:
        typeof next.ambientEnabled === 'boolean'
          ? next.ambientEnabled
          : this.config.ambientEnabled,
      missionSoundsEnabled:
        typeof next.missionSoundsEnabled === 'boolean'
          ? next.missionSoundsEnabled
          : this.config.missionSoundsEnabled,
      progressionSoundsEnabled:
        typeof next.progressionSoundsEnabled === 'boolean'
          ? next.progressionSoundsEnabled
          : this.config.progressionSoundsEnabled,
      achievementSoundsEnabled:
        typeof next.achievementSoundsEnabled === 'boolean'
          ? next.achievementSoundsEnabled
          : this.config.achievementSoundsEnabled,
    };

    this.applyGainValues(false);

    if (!this.config.musicEnabled) {
      this.musicCtrl.stop();
    } else if (this.unlocked && this.musicDesired && !this.gameplayPaused && !this.pageHidden) {
      this.ensureMusicRunning();
    }

    if (!this.config.ambientEnabled) {
      this.ambientCtrl.stop();
    } else if (this.unlocked && !this.gameplayPaused && !this.pageHidden) {
      this.ensureAmbientRunning();
    }
  }

  private applyGainValues(immediate: boolean): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    const masterTarget = clamp01(this.config.masterVolume);
    const musicTarget =
      this.config.musicEnabled && !this.gameplayPaused && !this.pageHidden
        ? clamp01(this.config.musicVolume) * AUDIO_CONFIG.maxMusicGain
        : 0;
    const sfxTarget = this.config.sfxEnabled
      ? clamp01(this.config.sfxVolume) * AUDIO_CONFIG.maxSfxGain
      : 0;
    const ambientTarget =
      this.config.ambientEnabled && !this.gameplayPaused && !this.pageHidden
        ? AUDIO_CONFIG.maxAmbientGain
        : 0;

    if (immediate) {
      this.masterGain.gain.setValueAtTime(masterTarget, now);
      this.musicGain.gain.setValueAtTime(musicTarget, now);
      this.sfxGain.gain.setValueAtTime(sfxTarget, now);
      this.ambientGain.gain.setValueAtTime(ambientTarget, now);
    } else {
      this.masterGain.gain.setTargetAtTime(masterTarget, now, 0.025);
      this.musicGain.gain.setTargetAtTime(musicTarget, now, 0.035);
      this.sfxGain.gain.setTargetAtTime(sfxTarget, now, 0.025);
      this.ambientGain.gain.setTargetAtTime(ambientTarget, now, 0.05);
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

  private ensureAmbientRunning(): void {
    if (!this.unlocked || !this.ctx || !this.ambientGain) return;
    if (!this.config.ambientEnabled || this.gameplayPaused || this.pageHidden) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.applyGainValues(false);
    this.ambientCtrl.start(this.ctx, this.ambientGain, this.ambientType);
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
    if (this.config.ambientEnabled) {
      this.ensureAmbientRunning();
    }
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
    this.ambientCtrl.stop();
  }

  public resumeGameplayAudio(): void {
    this.gameplayPaused = false;
    if (this.musicDesired && this.config.musicEnabled && !this.pageHidden) {
      if (this.ctx && this.musicGain) {
        this.applyGainValues(false);
        this.musicCtrl.resume(this.ctx, this.musicGain);
      }
    }
    if (this.config.ambientEnabled && !this.pageHidden) {
      this.ensureAmbientRunning();
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
    if (this.config.achievementSoundsEnabled === false) return;
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playAchievement(ready.ctx, ready.out);
  }

  public playAchievementUnlock(
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' = 'COMMON'
  ): void {
    if (this.config.achievementSoundsEnabled === false) return;
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playAchievementUnlock(ready.ctx, ready.out, rarity);
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

  public playCharacterSelect(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playCharacterSelect(ready.ctx, ready.out);
  }

  public playCharacterUnlock(tier: 'standard' | 'rare' | 'mythic' = 'standard'): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playCharacterUnlock(ready.ctx, ready.out, tier);
  }

  public playPowerUpSpawn(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playPowerUpSpawn(ready.ctx, ready.out);
  }

  public playPowerUpCollect(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playPowerUpCollect(ready.ctx, ready.out);
  }

  public playShieldActivate(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playShieldActivate(ready.ctx, ready.out);
  }

  public playShieldBreak(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playShieldBreak(ready.ctx, ready.out);
  }

  public playRevive(): void {
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playRevive(ready.ctx, ready.out);
  }

  public playMagnet(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playMagnet(ready.ctx, ready.out);
  }

  public playScoreBoost(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playScoreBoost(ready.ctx, ready.out);
  }

  public playSlowMotion(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playSlowMotion(ready.ctx, ready.out);
  }

  public playFeather(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playFeather(ready.ctx, ready.out);
  }

  public playCoinCollect(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playCoinCollect(ready.ctx, ready.out);
  }

  public playStarCollect(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playStarCollect(ready.ctx, ready.out);
  }

  public playGemCollect(): void {
    const ready = this.canPlaySfx(false);
    if (ready) this.soundGen.playGemCollect(ready.ctx, ready.out);
  }

  public playMissionComplete(): void {
    if (this.config.missionSoundsEnabled === false) return;
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playMissionComplete(ready.ctx, ready.out);
  }

  public playMissionClaim(): void {
    if (this.config.missionSoundsEnabled === false) return;
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playMissionClaim(ready.ctx, ready.out);
  }

  public playXPReceived(): void {
    if (this.config.progressionSoundsEnabled === false) return;
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playXPReceived(ready.ctx, ready.out);
  }

  public playLevelUp(): void {
    if (this.config.progressionSoundsEnabled === false) return;
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playLevelUp(ready.ctx, ready.out);
  }

  public playRewardUnlocked(): void {
    if (this.config.progressionSoundsEnabled === false) return;
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playRewardUnlocked(ready.ctx, ready.out);
  }

  public playRankPromotion(): void {
    if (this.config.progressionSoundsEnabled === false) return;
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playRankPromotion(ready.ctx, ready.out);
  }

  public playTitleUnlocked(): void {
    if (this.config.progressionSoundsEnabled === false) return;
    this.unlock();
    const ready = this.canPlaySfx(true);
    if (ready) this.soundGen.playTitleUnlocked(ready.ctx, ready.out);
  }
}

export const audioManager = new AudioManager();
