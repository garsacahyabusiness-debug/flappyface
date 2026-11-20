export const AUDIO_CONFIG = {
  defaults: {
    masterVolume: 0.75,
    musicVolume: 0.65,
    sfxVolume: 0.85,
  },
  // Prevent digital clipping by keeping combined gain comfortably below 1.0
  maxSfxGain: 0.7,
  maxMusicGain: 0.42,
  maxAmbientGain: 0.16,
  fadeSeconds: 0.14,
  musicStepMs: 240,
  // Cheerful, relaxing original arcade melody (frequencies in Hz, 0 = rest)
  melodyNotes: [
    523.25, // C5
    659.25, // E5
    783.99, // G5
    659.25, // E5
    587.33, // D5
    698.46, // F5
    880.0,  // A5
    783.99, // G5
    523.25, // C5
    659.25, // E5
    783.99, // G5
    1046.5, // C6
    880.0,  // A5
    783.99, // G5
    659.25, // E5
    587.33, // D5
  ],
  bassNotes: [
    261.63, 0, 196.0, 0,
    220.0, 0, 174.61, 0,
    261.63, 0, 196.0, 0,
    174.61, 0, 196.0, 0,
  ],
} as const;
