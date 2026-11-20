import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  CloudRain,
  Compass,
  Gauge,
  Info,
  Layers,
  Lock,
  Music,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  SunMoon,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { characterUnlockManager } from '../game/character/CharacterUnlockManager';
import { VisualEffectsQuality } from '../game/powerups/PowerUpManager';
import { PowerUpFrequencySetting } from '../game/powerups/PowerUpSpawnManager';
import { GameSettings, settingsManager } from '../game/settings/SettingsManager';
import { vibrationManager } from '../game/settings/VibrationManager';
import { GraphicsPreset } from '../game/worlds/EnvironmentRenderer';
import { ParticleLevel } from '../game/worlds/WeatherSystem';
import { getWorldById } from '../game/worlds/WorldRegistry';
import { worldUnlockManager } from '../game/worlds/WorldUnlockManager';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsUIProps {
  settings: GameSettings;
  onChangeFace: () => void;
  onOpenWorldSelect: () => void;
  onEnvironmentChange?: () => void;
  onSkyThemeChange?: () => void;
  onResetProgression: () => void;
  onResetAllData: () => Promise<void>;
  onOpenPrivacy: () => void;
  onOpenAbout: () => void;
  onBack: () => void;
}

interface ToggleSwitchProps {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  disabled = false,
  label,
  onToggle,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={onToggle}
    className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-[#24415C] p-0.5 transition-colors duration-150 disabled:opacity-45 ${
      checked ? 'bg-[#61D66B]' : 'bg-slate-300'
    }`}
  >
    <span
      className={`inline-block h-6 w-6 rounded-full border-2 border-[#24415C] bg-white shadow-sm transition-transform duration-150 ${
        checked ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

export const SettingsUI: React.FC<SettingsUIProps> = ({
  settings,
  onChangeFace,
  onOpenWorldSelect,
  onEnvironmentChange,
  onSkyThemeChange,
  onResetProgression,
  onResetAllData,
  onOpenPrivacy,
  onOpenAbout,
  onBack,
}) => {
  const [showResetProgressionModal, setShowResetProgressionModal] = useState(false);
  const [showResetSettingsModal, setShowResetSettingsModal] = useState(false);
  const [showResetAllModal, setShowResetAllModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const vibrationSupported = vibrationManager.isSupported();
  const audioSupported = audioManager.isAudioSupported();
  const collectionSummary = characterUnlockManager.getCollectionSummary();
  const activeWorld = getWorldById(worldUnlockManager.getSelectedWorldId());

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const flashToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastMsg(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
      toastTimerRef.current = null;
    }, 2200);
  };

  const handleToggleMusic = () => {
    audioManager.unlock();
    const next = !settings.musicEnabled;
    settingsManager.update({ musicEnabled: next });
    audioManager.playButton();
    if (next) {
      audioManager.startMusic();
    }
  };

  const handleToggleSfx = () => {
    audioManager.unlock();
    const next = !settings.sfxEnabled;
    settingsManager.update({ sfxEnabled: next });
    if (next) {
      audioManager.playButton();
    }
  };

  const handleToggleVibration = () => {
    audioManager.playButton();
    const next = !settings.vibrationEnabled;
    settingsManager.update({ vibrationEnabled: next });
    if (next) {
      vibrationManager.vibrateFlap();
    }
  };

  const handleTogglePerformance = () => {
    audioManager.playButton();
    const nextMode = settings.performanceMode === 'high' ? 'eco' : 'high';
    settingsManager.update({
      performanceMode: nextMode,
      graphicsPreset: nextMode === 'eco' ? 'low' : 'high',
    });
    onEnvironmentChange?.();
  };

  const handleToggleSkyTheme = () => {
    if (!collectionSummary.hasSpecialBackground) return;
    audioManager.playButton();
    settingsManager.update({
      skyTheme: settings.skyTheme === 'special' ? 'classic' : 'special',
    });
    onSkyThemeChange?.();
  };

  const cycleParticles = () => {
    audioManager.playButton();
    const order: ParticleLevel[] = ['low', 'medium', 'high'];
    const next = order[(order.indexOf(settings.particleLevel) + 1) % order.length];
    settingsManager.update({ particleLevel: next });
    onEnvironmentChange?.();
  };

  const cycleGraphics = () => {
    audioManager.playButton();
    const order: GraphicsPreset[] = ['low', 'medium', 'high'];
    const next = order[(order.indexOf(settings.graphicsPreset) + 1) % order.length];
    settingsManager.update({ graphicsPreset: next });
    onEnvironmentChange?.();
  };

  const cyclePowerUpFrequency = () => {
    audioManager.playButton();
    const order: PowerUpFrequencySetting[] = ['low', 'normal', 'high'];
    const next = order[(order.indexOf(settings.powerUpFrequency) + 1) % order.length];
    settingsManager.update({ powerUpFrequency: next });
    onEnvironmentChange?.();
  };

  const cycleVisualFxQuality = () => {
    audioManager.playButton();
    const order: VisualEffectsQuality[] = ['low', 'medium', 'high'];
    const next = order[(order.indexOf(settings.visualEffectsQuality) + 1) % order.length];
    settingsManager.update({ visualEffectsQuality: next });
    onEnvironmentChange?.();
  };

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-4 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onBack();
          }}
          className="btn-base btn-secondary min-h-[44px] px-3.5 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>BACK</span>
        </button>

        <h2 className="font-display text-stroke-dark text-2xl font-bold tracking-wide text-white">
          SETTINGS
        </h2>

        <div className="w-[78px]" aria-hidden="true" />
      </div>

      {/* Scrollable Settings Container */}
      <div className="mx-auto mt-1 w-full max-w-[350px] flex-1 overflow-y-auto pb-3">
        <div className="anim-panel-pop game-panel space-y-4 p-4">
          {toastMsg && (
            <div className="flex items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              <span>{toastMsg}</span>
            </div>
          )}

          {!audioSupported && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              Web Audio API tidak tersedia di browser ini. Audio dinonaktifkan secara aman.
            </div>
          )}

          {/* AUDIO SECTION */}
          <section className="rounded-2xl bg-[#EEF7FF] p-3.5">
            <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
              AUDIO
            </h3>

            <div className="mt-2.5 space-y-3">
              {/* Music Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Music className="h-4 w-4 text-[#3998F7]" />
                  <span className="text-sm font-extrabold text-[#24415C]">MUSIC</span>
                </div>
                <ToggleSwitch
                  checked={settings.musicEnabled}
                  disabled={!audioSupported}
                  label="Toggle Music"
                  onToggle={handleToggleMusic}
                />
              </div>

              {/* SFX Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {settings.sfxEnabled ? (
                    <Volume2 className="h-4 w-4 text-[#3998F7]" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="text-sm font-extrabold text-[#24415C]">SOUND EFFECTS</span>
                </div>
                <ToggleSwitch
                  checked={settings.sfxEnabled}
                  disabled={!audioSupported}
                  label="Toggle Sound Effects"
                  onToggle={handleToggleSfx}
                />
              </div>

              {/* Master Volume */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs font-extrabold text-[#24415C]">
                  <span>MASTER VOLUME</span>
                  <span className="font-display tabular-nums text-[#3998F7]">
                    {Math.round(settings.masterVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!audioSupported}
                  value={Math.round(settings.masterVolume * 100)}
                  aria-label="Master Volume"
                  onChange={(e) => {
                    audioManager.unlock();
                    settingsManager.update({ masterVolume: parseInt(e.target.value, 10) / 100 });
                  }}
                  className="mt-1.5 h-2 w-full accent-[#3998F7]"
                />
              </div>

              {/* Music Volume */}
              <div>
                <div className="flex items-center justify-between text-xs font-extrabold text-[#24415C]/85">
                  <span>MUSIC VOLUME</span>
                  <span className="font-display tabular-nums text-[#3998F7]">
                    {Math.round(settings.musicVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!audioSupported || !settings.musicEnabled}
                  value={Math.round(settings.musicVolume * 100)}
                  aria-label="Music Volume"
                  onChange={(e) => {
                    audioManager.unlock();
                    settingsManager.update({ musicVolume: parseInt(e.target.value, 10) / 100 });
                  }}
                  className="mt-1.5 h-2 w-full accent-[#61D66B] disabled:opacity-45"
                />
              </div>

              {/* SFX Volume */}
              <div>
                <div className="flex items-center justify-between text-xs font-extrabold text-[#24415C]/85">
                  <span>SFX VOLUME</span>
                  <span className="font-display tabular-nums text-[#3998F7]">
                    {Math.round(settings.sfxVolume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  disabled={!audioSupported || !settings.sfxEnabled}
                  value={Math.round(settings.sfxVolume * 100)}
                  aria-label="SFX Volume"
                  onChange={(e) => {
                    audioManager.unlock();
                    settingsManager.update({ sfxVolume: parseInt(e.target.value, 10) / 100 });
                  }}
                  onPointerUp={() => audioManager.playButton()}
                  className="mt-1.5 h-2 w-full accent-[#FFD84D] disabled:opacity-45"
                />
              </div>
            </div>
          </section>

          {/* GAMEPLAY SECTION */}
          <section className="rounded-2xl bg-[#EEF7FF] p-3.5">
            <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
              GAMEPLAY
            </h3>

            <div className="mt-2.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-4 w-4 text-[#3998F7]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">HAPTIC FEEDBACK</div>
                    {!vibrationSupported && (
                      <div className="text-[10px] font-bold text-[#24415C]/55">
                        Not supported on this device
                      </div>
                    )}
                  </div>
                </div>
                <ToggleSwitch
                  checked={vibrationSupported ? settings.vibrationEnabled : false}
                  disabled={!vibrationSupported}
                  label="Toggle Vibration"
                  onToggle={handleToggleVibration}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-[#3998F7]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">PERFORMANCE</div>
                    <div className="text-[10px] font-bold text-[#24415C]/60">
                      {settings.performanceMode === 'high'
                        ? 'High Quality (HD Retina)'
                        : 'Eco Mode (Battery Saver)'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTogglePerformance}
                  className="min-h-[34px] rounded-xl border-2 border-[#24415C] bg-white px-3 text-xs font-black text-[#24415C]"
                >
                  {settings.performanceMode === 'high' ? 'HIGH' : 'ECO'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-[#F59E0B]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">AURORA SKY</div>
                    <div className="text-[10px] font-bold text-[#24415C]/60">
                      {collectionSummary.hasSpecialBackground
                        ? settings.skyTheme === 'special'
                          ? 'Special Sunset Sky Active'
                          : 'Classic Blue Sky Active'
                        : `Unlock at 50% Collection (${collectionSummary.percent}%)`}
                    </div>
                  </div>
                </div>
                {collectionSummary.hasSpecialBackground ? (
                  <ToggleSwitch
                    checked={settings.skyTheme === 'special'}
                    label="Toggle Special Aurora Sky"
                    onToggle={handleToggleSkyTheme}
                  />
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">
                    <Lock className="h-3 w-3" />
                    <span>50%</span>
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* ENVIRONMENT SECTION */}
          <section className="rounded-2xl bg-[#EEF7FF] p-3.5">
            <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
              ENVIRONMENT
            </h3>

            <div className="mt-2.5 space-y-3">
              {/* Active World Shortcut */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-[#3998F7]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">WORLD</div>
                    <div className="text-[10px] font-bold text-[#24415C]/65">
                      {activeWorld.name}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onOpenWorldSelect();
                  }}
                  className="min-h-[34px] rounded-xl border-2 border-[#24415C] bg-[#FFD84D] px-3 text-xs font-black text-[#24415C]"
                >
                  CHANGE
                </button>
              </div>

              {/* Weather Effects Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CloudRain className="h-4 w-4 text-[#3998F7]" />
                  <span className="text-sm font-extrabold text-[#24415C]">WEATHER</span>
                </div>
                <ToggleSwitch
                  checked={settings.weatherEnabled}
                  label="Toggle Weather Effects"
                  onToggle={() => {
                    audioManager.playButton();
                    settingsManager.update({ weatherEnabled: !settings.weatherEnabled });
                    onEnvironmentChange?.();
                  }}
                />
              </div>

              {/* Dynamic Day/Night Sky Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <SunMoon className="h-4 w-4 text-[#F59E0B]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">DYNAMIC SKY</div>
                    <div className="text-[10px] font-bold text-[#24415C]/60">
                      Morning · Day · Sunset · Night
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.dynamicSkyEnabled}
                  label="Toggle Dynamic Sky"
                  onToggle={() => {
                    audioManager.playButton();
                    settingsManager.update({ dynamicSkyEnabled: !settings.dynamicSkyEnabled });
                    onEnvironmentChange?.();
                  }}
                />
              </div>

              {/* Parallax Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Layers className="h-4 w-4 text-[#32B85C]" />
                  <span className="text-sm font-extrabold text-[#24415C]">PARALLAX</span>
                </div>
                <ToggleSwitch
                  checked={settings.parallaxEnabled}
                  label="Toggle Parallax Depth"
                  onToggle={() => {
                    audioManager.playButton();
                    settingsManager.update({ parallaxEnabled: !settings.parallaxEnabled });
                    onEnvironmentChange?.();
                  }}
                />
              </div>

              {/* Ambient Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wind className="h-4 w-4 text-[#3998F7]" />
                  <span className="text-sm font-extrabold text-[#24415C]">AMBIENT SOUND</span>
                </div>
                <ToggleSwitch
                  checked={settings.ambientSoundEnabled}
                  disabled={!audioSupported}
                  label="Toggle Ambient Sound"
                  onToggle={() => {
                    audioManager.unlock();
                    audioManager.playButton();
                    settingsManager.update({
                      ambientSoundEnabled: !settings.ambientSoundEnabled,
                    });
                    onEnvironmentChange?.();
                  }}
                />
              </div>

              {/* Particle Level */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-[#9333EA]" />
                  <span className="text-sm font-extrabold text-[#24415C]">PARTICLES</span>
                </div>
                <button
                  type="button"
                  onClick={cycleParticles}
                  className="min-h-[34px] rounded-xl border-2 border-[#24415C] bg-white px-3 text-xs font-black text-[#24415C] uppercase"
                >
                  {settings.particleLevel}
                </button>
              </div>

              {/* Graphics Preset */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-[#3998F7]" />
                  <span className="text-sm font-extrabold text-[#24415C]">GRAPHICS</span>
                </div>
                <button
                  type="button"
                  onClick={cycleGraphics}
                  className="min-h-[34px] rounded-xl border-2 border-[#24415C] bg-white px-3 text-xs font-black text-[#24415C] uppercase"
                >
                  {settings.graphicsPreset}
                </button>
              </div>
            </div>
          </section>

          {/* POWER-UPS & EFFECTS SECTION */}
          <section className="rounded-2xl bg-[#EEF7FF] p-3.5">
            <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
              POWER-UPS &amp; EFFECTS
            </h3>

            <div className="mt-2.5 space-y-3">
              {/* Power-Ups Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-[#F59E0B]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">POWER-UPS</div>
                    <div className="text-[10px] font-bold text-[#24415C]/60">
                      Shield · Revive · Slow-Mo · Magnet · Boost · Feather
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.powerUpsEnabled}
                  label="Toggle Power-Ups"
                  onToggle={() => {
                    audioManager.playButton();
                    settingsManager.update({ powerUpsEnabled: !settings.powerUpsEnabled });
                    onEnvironmentChange?.();
                  }}
                />
              </div>

              {/* Collectibles Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-[#38BDF8]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">COLLECTIBLES</div>
                    <div className="text-[10px] font-bold text-[#24415C]/60">
                      Coins · Stars · Gems
                    </div>
                  </div>
                </div>
                <ToggleSwitch
                  checked={settings.collectiblesEnabled}
                  label="Toggle Collectibles"
                  onToggle={() => {
                    audioManager.playButton();
                    settingsManager.update({ collectiblesEnabled: !settings.collectiblesEnabled });
                    onEnvironmentChange?.();
                  }}
                />
              </div>

              {/* Power-Up Frequency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Gauge className="h-4 w-4 text-[#9333EA]" />
                  <div>
                    <div className="text-sm font-extrabold text-[#24415C]">POWER-UP FREQUENCY</div>
                    <div className="text-[10px] font-bold text-[#24415C]/60">
                      Tournament matches always use NORMAL
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!settings.powerUpsEnabled}
                  onClick={cyclePowerUpFrequency}
                  className="min-h-[34px] rounded-xl border-2 border-[#24415C] bg-white px-3 text-xs font-black text-[#24415C] uppercase disabled:opacity-45"
                >
                  {settings.powerUpFrequency}
                </button>
              </div>

              {/* Visual Effects Quality */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-[#32B85C]" />
                  <span className="text-sm font-extrabold text-[#24415C]">VISUAL EFFECTS</span>
                </div>
                <button
                  type="button"
                  onClick={cycleVisualFxQuality}
                  className="min-h-[34px] rounded-xl border-2 border-[#24415C] bg-white px-3 text-xs font-black text-[#24415C] uppercase"
                >
                  {settings.visualEffectsQuality}
                </button>
              </div>
            </div>
          </section>

          {/* OTHER SECTION */}
          <section className="rounded-2xl bg-[#EEF7FF] p-3.5">
            <h3 className="text-[11px] font-black tracking-wider text-[#3998F7] uppercase">
              OTHER
            </h3>

            <div className="mt-2.5 flex flex-col gap-2">
              <PWAInstallButton />

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onChangeFace();
                }}
                className="btn-base btn-primary min-h-[44px] w-full text-sm"
              >
                <Camera className="h-4 w-4" />
                <span>CHANGE FACE</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setShowResetProgressionModal(true);
                }}
                className="btn-base btn-secondary min-h-[42px] w-full text-xs"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#FF6B6B]" />
                <span>RESET PROGRESSION</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onOpenPrivacy();
                  }}
                  className="btn-base btn-secondary min-h-[42px] text-xs"
                >
                  <ShieldCheck className="h-4 w-4 text-[#32B85C]" />
                  <span>PRIVACY</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    onOpenAbout();
                  }}
                  className="btn-base btn-secondary min-h-[42px] text-xs"
                >
                  <Info className="h-4 w-4 text-[#3998F7]" />
                  <span>ABOUT</span>
                </button>
              </div>
            </div>
          </section>

          {/* RESET ACTIONS */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                setShowResetSettingsModal(true);
              }}
              className="btn-base btn-secondary min-h-[44px] px-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5 text-[#3998F7]" />
              <span>RESET SETTINGS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                audioManager.playButton();
                setShowResetAllModal(true);
              }}
              className="btn-base btn-danger min-h-[44px] px-2 text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>RESET ALL DATA</span>
            </button>
          </div>
        </div>
      </div>

      {/* RESET PROGRESSION CONFIRMATION MODAL */}
      {showResetProgressionModal && (
        <div className="anim-fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-5 backdrop-blur-sm">
          <div className="anim-panel-pop game-panel w-full max-w-[295px] p-5 text-center">
            <h3 className="font-display text-xl font-bold text-[#24415C]">
              Reset Progression?
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#24415C]/80">
              Reset high score, achievements, and game statistics? Your custom face and audio settings will be kept.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setShowResetProgressionModal(false);
                }}
                className="btn-base btn-secondary min-h-[44px] text-sm"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  onResetProgression();
                  setShowResetProgressionModal(false);
                  flashToast('Progression berhasil di-reset.');
                }}
                className="btn-base btn-danger min-h-[44px] text-sm"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET SETTINGS CONFIRMATION MODAL */}
      {showResetSettingsModal && (
        <div className="anim-fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-5 backdrop-blur-sm">
          <div className="anim-panel-pop game-panel w-full max-w-[290px] p-5 text-center">
            <h3 className="font-display text-xl font-bold text-[#24415C]">
              Reset Settings?
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#24415C]/80">
              Reset all game settings to default?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setShowResetSettingsModal(false);
                }}
                className="btn-base btn-secondary min-h-[44px] text-sm"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => {
                  settingsManager.resetToDefaults();
                  audioManager.playButton();
                  setShowResetSettingsModal(false);
                  flashToast('Settings reset to default.');
                }}
                className="btn-base btn-danger min-h-[44px] text-sm"
              >
                RESET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL DATA CONFIRMATION MODAL */}
      {showResetAllModal && (
        <div className="anim-fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-5 backdrop-blur-sm">
          <div className="anim-panel-pop game-panel w-full max-w-[295px] p-5 text-center">
            <h3 className="font-display text-xl font-bold text-[#FF6B6B]">
              Reset All Data?
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#24415C]/80">
              This will delete your high score, achievements, stats, character collection, skins, 2P leaderboard, match history, settings, AND all saved custom face photos.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  audioManager.playButton();
                  setShowResetAllModal(false);
                }}
                className="btn-base btn-secondary min-h-[44px] text-sm"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={async () => {
                  audioManager.playButton();
                  await onResetAllData();
                  setShowResetAllModal(false);
                  flashToast('All data reset.');
                }}
                className="btn-base btn-danger min-h-[44px] text-sm"
              >
                RESET ALL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
