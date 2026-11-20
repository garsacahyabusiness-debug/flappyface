import { WorldDefinition } from './WorldRegistry';

export type SkyCyclePhase = 'MORNING' | 'DAY' | 'SUNSET' | 'NIGHT';

export interface EffectiveSkyState {
  top: string;
  mid: string;
  bottom: string;
  celestialColor: string;
  celestialGlow: string;
  cloudTint: string;
  starOpacity: number;
  nightFactor: number;
  phase: SkyCyclePhase;
}

interface CycleStop {
  t: number;
  phase: SkyCyclePhase;
  top: string;
  mid: string;
  bottom: string;
  celestial: string;
  glow: string;
  starOpacity: number;
  nightFactor: number;
}

const CYCLE_DURATION_SECONDS = 96;

const CYCLE_STOPS: readonly CycleStop[] = [
  {
    t: 0,
    phase: 'MORNING',
    top: '#4DA6FF',
    mid: '#8EDBFF',
    bottom: '#FFE8C7',
    celestial: '#FFF3B0',
    glow: 'rgba(255, 224, 150, 0.78)',
    starOpacity: 0.05,
    nightFactor: 0.12,
  },
  {
    t: 0.25,
    phase: 'DAY',
    top: '#4EB6FF',
    mid: '#76D4FF',
    bottom: '#B8EFFF',
    celestial: '#FFF59E',
    glow: 'rgba(255, 245, 170, 0.75)',
    starOpacity: 0,
    nightFactor: 0,
  },
  {
    t: 0.52,
    phase: 'SUNSET',
    top: '#4C3575',
    mid: '#E06C9F',
    bottom: '#FFD6A5',
    celestial: '#FFE0B2',
    glow: 'rgba(255, 138, 128, 0.55)',
    starOpacity: 0.22,
    nightFactor: 0.38,
  },
  {
    t: 0.78,
    phase: 'NIGHT',
    top: '#0D1333',
    mid: '#1E2A5E',
    bottom: '#384B8C',
    celestial: '#F1F5F9',
    glow: 'rgba(226, 232, 240, 0.42)',
    starOpacity: 0.85,
    nightFactor: 0.88,
  },
  {
    t: 1,
    phase: 'MORNING',
    top: '#4DA6FF',
    mid: '#8EDBFF',
    bottom: '#FFE8C7',
    celestial: '#FFF3B0',
    glow: 'rgba(255, 224, 150, 0.78)',
    starOpacity: 0.05,
    nightFactor: 0.12,
  },
];

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return [r, g, b];
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return [105, 201, 255];
  }
  return [r, g, b];
}

export function lerpHex(hexA: string, hexB: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parseHex(hexA);
  const [r2, g2, b2] = parseHex(hexB);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export class SkySystem {
  private cycleTime = 24; // Start comfortably in bright Day phase

  public reset(): void {
    this.cycleTime = 24;
  }

  public setCycleTime(seconds: number): void {
    this.cycleTime = ((seconds % CYCLE_DURATION_SECONDS) + CYCLE_DURATION_SECONDS) % CYCLE_DURATION_SECONDS;
  }

  public update(dt: number, active: boolean): void {
    if (!active || dt <= 0) return;
    this.cycleTime = (this.cycleTime + dt) % CYCLE_DURATION_SECONDS;
  }

  public getEffectiveSky(
    world: WorldDefinition,
    dynamicSkyEnabled: boolean,
    specialAuroraOverride = false
  ): EffectiveSkyState {
    if (!dynamicSkyEnabled) {
      if (specialAuroraOverride && world.id === 'green_valley') {
        return {
          top: '#4C3575',
          mid: '#E06C9F',
          bottom: '#FFD6A5',
          celestialColor: '#FFE0B2',
          celestialGlow: 'rgba(255, 138, 128, 0.42)',
          cloudTint: '#FFE9EE',
          starOpacity: 0.25,
          nightFactor: 0.25,
          phase: 'SUNSET',
        };
      }
      return {
        top: world.skyTop,
        mid: world.skyMid,
        bottom: world.skyBottom,
        celestialColor: world.celestialColor,
        celestialGlow: world.celestialGlow,
        cloudTint: world.cloudColor,
        starOpacity: world.isDarkWorld ? 0.65 : 0,
        nightFactor: world.isDarkWorld ? 0.72 : 0,
        phase: world.isDarkWorld ? 'NIGHT' : 'DAY',
      };
    }

    const progress = this.cycleTime / CYCLE_DURATION_SECONDS;
    let stopA = CYCLE_STOPS[0];
    let stopB = CYCLE_STOPS[1];
    for (let i = 0; i < CYCLE_STOPS.length - 1; i++) {
      if (progress >= CYCLE_STOPS[i].t && progress <= CYCLE_STOPS[i + 1].t) {
        stopA = CYCLE_STOPS[i];
        stopB = CYCLE_STOPS[i + 1];
        break;
      }
    }

    const span = Math.max(0.0001, stopB.t - stopA.t);
    const localT = (progress - stopA.t) / span;
    const cycleTop = lerpHex(stopA.top, stopB.top, localT);
    const cycleMid = lerpHex(stopA.mid, stopB.mid, localT);
    const cycleBottom = lerpHex(stopA.bottom, stopB.bottom, localT);
    const cycleCelestial = lerpHex(stopA.celestial, stopB.celestial, localT);
    const starOpacity = stopA.starOpacity + (stopB.starOpacity - stopA.starOpacity) * localT;
    const nightFactor = stopA.nightFactor + (stopB.nightFactor - stopA.nightFactor) * localT;

    // Preserve biome identity by blending world's native sky with time-of-day cycle
    const worldBias = world.isDarkWorld ? 0.62 : 0.4;
    return {
      top: lerpHex(cycleTop, world.skyTop, worldBias),
      mid: lerpHex(cycleMid, world.skyMid, worldBias),
      bottom: lerpHex(cycleBottom, world.skyBottom, worldBias),
      celestialColor: lerpHex(cycleCelestial, world.celestialColor, 0.35),
      celestialGlow: localT < 0.5 ? stopA.glow : stopB.glow,
      cloudTint: lerpHex(world.cloudColor, '#64748B', nightFactor * 0.45),
      starOpacity: Math.max(world.isDarkWorld ? 0.45 : 0, starOpacity),
      nightFactor: world.isDarkWorld ? Math.max(0.55, nightFactor) : nightFactor,
      phase: localT < 0.5 ? stopA.phase : stopB.phase,
    };
  }
}
