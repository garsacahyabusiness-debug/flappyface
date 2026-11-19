import { AUDIO_CONFIG } from '../audio/AudioConfig';
import { audioManager } from '../audio/AudioManager';
import { vibrationManager } from './VibrationManager';

export type PerformanceMode = 'high' | 'eco';

export interface GameSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  vibrationEnabled: boolean;
  performanceMode: PerformanceMode;
}

const SETTINGS_STORAGE_KEY = 'flappy_face_settings';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  masterVolume: AUDIO_CONFIG.defaults.masterVolume,
  musicVolume: AUDIO_CONFIG.defaults.musicVolume,
  sfxVolume: AUDIO_CONFIG.defaults.sfxVolume,
  vibrationEnabled: true,
  performanceMode: 'high',
};

function clamp01(val: unknown, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(0, Math.min(1, val));
}

export class SettingsManager {
  private settings: GameSettings;
  private listeners = new Set<(settings: GameSettings) => void>();

  constructor() {
    this.settings = this.load();
    this.syncEngines();
  }

  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  public subscribe(listener: (settings: GameSettings) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public update(partial: Partial<GameSettings>): GameSettings {
    this.settings = {
      ...this.settings,
      ...partial,
      masterVolume: clamp01(partial.masterVolume ?? this.settings.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
      musicVolume: clamp01(partial.musicVolume ?? this.settings.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
      sfxVolume: clamp01(partial.sfxVolume ?? this.settings.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    };
    this.save();
    this.syncEngines();
    this.notify();
    return this.getSettings();
  }

  public resetToDefaults(): GameSettings {
    this.settings = {
      ...DEFAULT_GAME_SETTINGS,
      vibrationEnabled: vibrationManager.isSupported() ? true : false,
    };
    this.save();
    this.syncEngines();
    this.notify();
    return this.getSettings();
  }

  private syncEngines(): void {
    audioManager.applySettings({
      masterVolume: this.settings.masterVolume,
      musicVolume: this.settings.musicVolume,
      sfxVolume: this.settings.sfxVolume,
      musicEnabled: this.settings.musicEnabled,
      sfxEnabled: this.settings.sfxEnabled,
    });
    vibrationManager.setEnabled(this.settings.vibrationEnabled);
  }

  private notify(): void {
    const snap = this.getSettings();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  private load(): GameSettings {
    try {
      const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return { ...DEFAULT_GAME_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        musicEnabled:
          typeof parsed.musicEnabled === 'boolean'
            ? parsed.musicEnabled
            : DEFAULT_GAME_SETTINGS.musicEnabled,
        sfxEnabled:
          typeof parsed.sfxEnabled === 'boolean'
            ? parsed.sfxEnabled
            : DEFAULT_GAME_SETTINGS.sfxEnabled,
        masterVolume: clamp01(parsed.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
        musicVolume: clamp01(parsed.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
        sfxVolume: clamp01(parsed.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
        vibrationEnabled:
          typeof parsed.vibrationEnabled === 'boolean'
            ? parsed.vibrationEnabled
            : DEFAULT_GAME_SETTINGS.vibrationEnabled,
        performanceMode:
          parsed.performanceMode === 'eco' || parsed.performanceMode === 'high'
            ? parsed.performanceMode
            : DEFAULT_GAME_SETTINGS.performanceMode,
      };
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ version: 1, ...this.settings })
      );
    } catch {
      // Ignore storage errors in private mode
    }
  }
}

export const settingsManager = new SettingsManager();
