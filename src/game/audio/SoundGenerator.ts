export class SoundGenerator {
  private noiseBuffer: AudioBuffer | null = null;

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public playButton(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(460, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.05);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  public playFlap(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.19, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playScore(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    this.playTone(ctx, output, 987.77, 'triangle', now, 0.085, 0.18); // B5
    this.playTone(ctx, output, 1318.51, 'triangle', now + 0.07, 0.16, 0.2); // E6
  }

  public playCollision(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;

    // Soft cartoon thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.17);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    osc.connect(gain);
    gain.connect(output);
    osc.start(now);
    osc.stop(now + 0.2);

    // Filtered light impact puff
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(850, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.16, now);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(output);
    noise.start(now);
  }

  public playGameOver(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    this.playTone(ctx, output, 493.88, 'triangle', now, 0.14, 0.16);
    this.playTone(ctx, output, 415.3, 'triangle', now + 0.11, 0.14, 0.16);
    this.playTone(ctx, output, 329.63, 'triangle', now + 0.22, 0.24, 0.18);
  }

  public playNewBest(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      this.playTone(ctx, output, freq, 'triangle', now + idx * 0.065, 0.18, 0.18);
    });
  }

  public playAchievement(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((freq, idx) => {
      this.playTone(ctx, output, freq, 'sine', now + idx * 0.07, 0.2, 0.17);
    });
  }

  public playCountdownTick(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    this.playTone(ctx, output, 523.25, 'sine', now, 0.11, 0.17);
  }

  public playCountdownGo(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    this.playTone(ctx, output, 659.25, 'triangle', now, 0.11, 0.18);
    this.playTone(ctx, output, 1046.5, 'triangle', now + 0.06, 0.22, 0.21);
  }

  public playVictory(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      this.playTone(ctx, output, freq, 'triangle', now + idx * 0.075, 0.22, 0.19);
    });
  }

  public playDraw(ctx: AudioContext, output: GainNode): void {
    const now = ctx.currentTime;
    this.playTone(ctx, output, 587.33, 'sine', now, 0.13, 0.16);
    this.playTone(ctx, output, 659.25, 'sine', now + 0.11, 0.13, 0.16);
    this.playTone(ctx, output, 587.33, 'sine', now + 0.22, 0.22, 0.17);
  }

  private playTone(
    ctx: AudioContext,
    output: GainNode,
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(output);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.01);
  }
}
