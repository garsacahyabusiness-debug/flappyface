import { AmbientSoundType } from './WorldRegistry';

interface AmbientToneConfig {
  filterFreq: number;
  filterQ: number;
  noiseLevel: number;
  droneFreq: number;
  droneType: OscillatorType;
  droneLevel: number;
}

const AMBIENT_PRESETS: Record<AmbientSoundType, AmbientToneConfig> = {
  breeze: {
    filterFreq: 520,
    filterQ: 0.7,
    noiseLevel: 0.16,
    droneFreq: 196,
    droneType: 'sine',
    droneLevel: 0.04,
  },
  candy: {
    filterFreq: 780,
    filterQ: 0.8,
    noiseLevel: 0.09,
    droneFreq: 261.63,
    droneType: 'triangle',
    droneLevel: 0.045,
  },
  snow_wind: {
    filterFreq: 680,
    filterQ: 1.6,
    noiseLevel: 0.22,
    droneFreq: 146.83,
    droneType: 'sine',
    droneLevel: 0.035,
  },
  ocean: {
    filterFreq: 420,
    filterQ: 0.9,
    noiseLevel: 0.24,
    droneFreq: 130.81,
    droneType: 'sine',
    droneLevel: 0.04,
  },
  lava: {
    filterFreq: 210,
    filterQ: 1.1,
    noiseLevel: 0.25,
    droneFreq: 82.41,
    droneType: 'triangle',
    droneLevel: 0.055,
  },
  cyber: {
    filterFreq: 640,
    filterQ: 1.2,
    noiseLevel: 0.1,
    droneFreq: 110,
    droneType: 'triangle',
    droneLevel: 0.055,
  },
  heavenly: {
    filterFreq: 900,
    filterQ: 0.6,
    noiseLevel: 0.08,
    droneFreq: 293.66,
    droneType: 'sine',
    droneLevel: 0.05,
  },
  space: {
    filterFreq: 320,
    filterQ: 1.4,
    noiseLevel: 0.12,
    droneFreq: 98,
    droneType: 'sine',
    droneLevel: 0.06,
  },
};

export class AmbientAudioManager {
  private ctx: AudioContext | null = null;
  private outGain: GainNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private running = false;
  private activeType: AmbientSoundType = 'breeze';

  public setType(type: AmbientSoundType): void {
    if (this.activeType === type) return;
    this.activeType = type;
    if (this.running && this.ctx) {
      this.applyTone(this.ctx);
    }
  }

  public start(ctx: AudioContext, destination: GainNode, type: AmbientSoundType): void {
    this.activeType = type;
    this.ctx = ctx;
    this.outGain = destination;

    if (this.running) {
      this.applyTone(ctx);
      return;
    }

    try {
      const sampleRate = ctx.sampleRate || 44100;
      const length = sampleRate * 2;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        // Soft pink/brownish filtered noise so it never sounds harsh
        lastOut = (lastOut + 0.04 * white) / 1.04;
        data[i] = lastOut * 2.4;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';

      const noiseGain = ctx.createGain();

      const droneOsc = ctx.createOscillator();
      const droneGain = ctx.createGain();

      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(destination);

      droneOsc.connect(droneGain);
      droneGain.connect(destination);

      this.noiseSource = noiseSource;
      this.filterNode = filter;
      this.noiseGain = noiseGain;
      this.droneOsc = droneOsc;
      this.droneGain = droneGain;

      this.applyTone(ctx);

      noiseSource.start();
      droneOsc.start();
      this.running = true;
    } catch {
      this.stop();
    }
  }

  private applyTone(ctx: AudioContext): void {
    if (!this.filterNode || !this.noiseGain || !this.droneOsc || !this.droneGain) return;
    const preset = AMBIENT_PRESETS[this.activeType];
    const now = ctx.currentTime;
    this.filterNode.frequency.setTargetAtTime(preset.filterFreq, now, 0.15);
    this.filterNode.Q.setTargetAtTime(preset.filterQ, now, 0.15);
    this.noiseGain.gain.setTargetAtTime(preset.noiseLevel, now, 0.15);
    this.droneOsc.type = preset.droneType;
    this.droneOsc.frequency.setTargetAtTime(preset.droneFreq, now, 0.15);
    this.droneGain.gain.setTargetAtTime(preset.droneLevel, now, 0.15);
  }

  public stop(): void {
    this.running = false;
    try {
      this.noiseSource?.stop();
      this.noiseSource?.disconnect();
    } catch {
      // Ignore already stopped nodes
    }
    try {
      this.droneOsc?.stop();
      this.droneOsc?.disconnect();
    } catch {
      // Ignore already stopped nodes
    }
    this.filterNode?.disconnect();
    this.noiseGain?.disconnect();
    this.droneGain?.disconnect();

    this.noiseSource = null;
    this.filterNode = null;
    this.noiseGain = null;
    this.droneOsc = null;
    this.droneGain = null;
    this.ctx = null;
    this.outGain = null;
  }
}
