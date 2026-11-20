import { AUDIO_CONFIG } from '../audio/AudioConfig';
import { audioManager } from '../audio/AudioManager';
import { GraphicsPreset } from '../worlds/EnvironmentRenderer';
import { ParticleLevel } from '../worlds/WeatherSystem';
import { PowerUpFrequencySetting } from '../powerups/PowerUpSpawnManager';
import { VisualEffectsQuality } from '../powerups/PowerUpManager';
import { vibrationManager } from './VibrationManager';

export type PerformanceMode = 'high' | 'eco';
export type SkyThemeSetting = 'classic' | 'special';

export interface GameSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  ambientSoundEnabled: boolean;
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  vibrationEnabled: boolean;
  performanceMode: PerformanceMode;
  skyTheme: SkyThemeSetting;
  weatherEnabled: boolean;
  dynamicSkyEnabled: boolean;
  parallaxEnabled: boolean;
  particleLevel: ParticleLevel;
  graphicsPreset: GraphicsPreset;
  powerUpsEnabled: boolean;
  collectiblesEnabled: boolean;
  powerUpFrequency: PowerUpFrequencySetting;
  visualEffectsQuality: VisualEffectsQuality;
}

const SETTINGS_STORAGE_KEY = 'flappy_face_settings';

function detectDefaultPreset(): GraphicsPreset {
  if (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number') {
    if (navigator.hardwareConcurrency <= 4) return 'medium';
  }
  return 'high';
}

const INITIAL_PRESET = detectDefaultPreset();

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  ambientSoundEnabled: true,
  masterVolume: AUDIO_CONFIG.defaults.masterVolume,
  musicVolume: AUDIO_CONFIG.defaults.musicVolume,
  sfxVolume: AUDIO_CONFIG.defaults.sfxVolume,
  vibrationEnabled: true,
  performanceMode: INITIAL_PRESET === 'low' ? 'eco' : 'high',
  skyTheme: 'classic',
  weatherEnabled: true,
  dynamicSkyEnabled: false,
  parallaxEnabled: true,
  particleLevel: INITIAL_PRESET === 'high' ? 'high' : 'medium',
  graphicsPreset: INITIAL_PRESET,
  powerUpsEnabled: true,
  collectiblesEnabled: true,
  powerUpFrequency: 'normal',
  visualEffectsQuality: INITIAL_PRESET === 'low' ? 'low' : INITIAL_PRESET,
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
    const nextPreset: GraphicsPreset =
      partial.graphicsPreset ??
      (partial.performanceMode === 'eco'
        ? 'low'
        : partial.performanceMode === 'high' && this.settings.graphicsPreset === 'low'
          ? 'high'
          : this.settings.graphicsPreset);

    const nextPerformance: PerformanceMode =
      partial.performanceMode ??
      (partial.graphicsPreset === 'low'
        ? 'eco'
        : partial.graphicsPreset
          ? 'high'
          : this.settings.performanceMode);

    this.settings = {
      ...this.settings,
      ...partial,
      graphicsPreset: nextPreset,
      performanceMode: nextPerformance,
      masterVolume: clamp01(
        partial.masterVolume ?? this.settings.masterVolume,
        DEFAULT_GAME_SETTINGS.masterVolume
      ),
      musicVolume: clamp01(
        partial.musicVolume ?? this.settings.musicVolume,
        DEFAULT_GAME_SETTINGS.musicVolume
      ),
      sfxVolume: clamp01(
        partial.sfxVolume ?? this.settings.sfxVolume,
        DEFAULT_GAME_SETTINGS.sfxVolume
      ),
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
      ambientEnabled: this.settings.ambientSoundEnabled,
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
      const performanceMode: PerformanceMode =
        parsed.performanceMode === 'eco' || parsed.performanceMode === 'high'
          ? parsed.performanceMode
          : DEFAULT_GAME_SETTINGS.performanceMode;
      const graphicsPreset: GraphicsPreset =
        parsed.graphicsPreset === 'low' ||
        parsed.graphicsPreset === 'medium' ||
        parsed.graphicsPreset === 'high'
          ? parsed.graphicsPreset
          : performanceMode === 'eco'
            ? 'low'
            : DEFAULT_GAME_SETTINGS.graphicsPreset;

      return {
        musicEnabled:
          typeof parsed.musicEnabled === 'boolean'
            ? parsed.musicEnabled
            : DEFAULT_GAME_SETTINGS.musicEnabled,
        sfxEnabled:
          typeof parsed.sfxEnabled === 'boolean'
            ? parsed.sfxEnabled
            : DEFAULT_GAME_SETTINGS.sfxEnabled,
        ambientSoundEnabled:
          typeof parsed.ambientSoundEnabled === 'boolean'
            ? parsed.ambientSoundEnabled
            : DEFAULT_GAME_SETTINGS.ambientSoundEnabled,
        masterVolume: clamp01(parsed.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
        musicVolume: clamp01(parsed.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
        sfxVolume: clamp01(parsed.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
        vibrationEnabled:
          typeof parsed.vibrationEnabled === 'boolean'
            ? parsed.vibrationEnabled
            : DEFAULT_GAME_SETTINGS.vibrationEnabled,
        performanceMode,
        skyTheme:
          parsed.skyTheme === 'special' || parsed.skyTheme === 'classic'
            ? parsed.skyTheme
            : DEFAULT_GAME_SETTINGS.skyTheme,
        weatherEnabled:
          typeof parsed.weatherEnabled === 'boolean'
            ? parsed.weatherEnabled
            : DEFAULT_GAME_SETTINGS.weatherEnabled,
        dynamicSkyEnabled:
          typeof parsed.dynamicSkyEnabled === 'boolean'
            ? parsed.dynamicSkyEnabled
            : DEFAULT_GAME_SETTINGS.dynamicSkyEnabled,
        parallaxEnabled:
          typeof parsed.parallaxEnabled === 'boolean'
            ? parsed.parallaxEnabled
            : DEFAULT_GAME_SETTINGS.parallaxEnabled,
        particleLevel:
          parsed.particleLevel === 'low' ||
          parsed.particleLevel === 'medium' ||
          parsed.particleLevel === 'high'
            ? parsed.particleLevel
            : DEFAULT_GAME_SETTINGS.particleLevel,
        graphicsPreset,
        powerUpsEnabled:
          typeof parsed.powerUpsEnabled === 'boolean'
            ? parsed.powerUpsEnabled
            : DEFAULT_GAME_SETTINGS.powerUpsEnabled,
        collectiblesEnabled:
          typeof parsed.collectiblesEnabled === 'boolean'
            ? parsed.collectiblesEnabled
            : DEFAULT_GAME_SETTINGS.collectiblesEnabled,
        powerUpFrequency:
          parsed.powerUpFrequency === 'low' ||
          parsed.powerUpFrequency === 'normal' ||
          parsed.powerUpFrequency === 'high'
            ? parsed.powerUpFrequency
            : DEFAULT_GAME_SETTINGS.powerUpFrequency,
        visualEffectsQuality:
          parsed.visualEffectsQuality === 'low' ||
          parsed.visualEffectsQuality === 'medium' ||
          parsed.visualEffectsQuality === 'high'
            ? parsed.visualEffectsQuality
            : DEFAULT_GAME_SETTINGS.visualEffectsQuality,
      };
    } catch {
      return { ...DEFAULT_GAME_SETTINGS };
    }
  }

  private save(): void {
    try {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({ version: 2, ...this.settings })
      );
    } catch {
      // Ignore storage errors in private mode
    }
  }
}

export const settingsManager = new SettingsManager();
