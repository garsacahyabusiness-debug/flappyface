import { GAME_CONFIG } from '../Config';
import { Pipe } from '../Pipe';
import { ActiveCollectible } from './CollectibleManager';
import {
  COLLECTIBLE_REGISTRY,
  CollectibleType,
  POWER_UP_REGISTRY,
  PowerUpId,
} from './PowerUpRegistry';

export type PowerUpFrequencySetting = 'low' | 'normal' | 'high';

export interface ActivePowerUpOrb {
  id: number;
  active: boolean;
  powerUpId: PowerUpId;
  x: number;
  y: number;
  baseY: number;
  phase: number;
  radius: number;
}

const MAX_POWERUP_ORBS = 4;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class PowerUpSpawnManager {
  private orbs: ActivePowerUpOrb[] = [];
  private nextId = 1;
  private rng: () => number = Math.random;

  private powerUpTimer = 4.2;
  private collectibleTimer = 1.6;
  private frequency: PowerUpFrequencySetting = 'normal';

  constructor() {
    for (let i = 0; i < MAX_POWERUP_ORBS; i++) {
      this.orbs.push({
        id: 0,
        active: false,
        powerUpId: 'shield',
        x: 0,
        y: 0,
        baseY: 0,
        phase: 0,
        radius: 17,
      });
    }
  }

  public setFrequency(freq: PowerUpFrequencySetting): void {
    this.frequency = freq;
  }

  public reset(deterministicSeed?: number): void {
    this.rng =
      typeof deterministicSeed === 'number' && Number.isFinite(deterministicSeed)
        ? mulberry32(deterministicSeed)
        : Math.random;
    for (const o of this.orbs) {
      o.active = false;
    }
    this.powerUpTimer = this.getInitialPowerUpCooldown();
    this.collectibleTimer = 1.5;
  }

  private getInitialPowerUpCooldown(): number {
    switch (this.frequency) {
      case 'low':
        return 7.5 + this.rng() * 3.5;
      case 'high':
        return 3.4 + this.rng() * 2.0;
      case 'normal':
      default:
        return 5.0 + this.rng() * 2.5;
    }
  }

  private getNextPowerUpCooldown(difficultyMultiplier: number): number {
    // Slightly more generous intervals at higher speed while respecting fair cooldowns
    const speedAdj = Math.max(0.75, 1 - (difficultyMultiplier - 1) * 0.25);
    switch (this.frequency) {
      case 'low':
        return (10.5 + this.rng() * 4.5) * speedAdj;
      case 'high':
        return (4.8 + this.rng() * 2.4) * speedAdj;
      case 'normal':
      default:
        return (7.2 + this.rng() * 3.3) * speedAdj;
    }
  }

  public getActivePowerUpOrbs(): ActivePowerUpOrb[] {
    return this.orbs;
  }

  public countActivePowerUps(): number {
    let count = 0;
    for (const o of this.orbs) {
      if (o.active) count += 1;
    }
    return count;
  }

  public update(
    dt: number,
    options: {
      powerUpsEnabled: boolean;
      collectiblesEnabled: boolean;
      pipes: Pipe[];
      activeCollectibles: readonly ActiveCollectible[];
      difficultyMultiplier: number;
      hasShield: boolean;
      hasReviveOrUsed: boolean;
      onSpawnCollectible: (type: CollectibleType, x: number, y: number) => void;
      onPowerUpSpawned?: () => void;
    }
  ): void {
    if (dt <= 0) return;

    if (options.collectiblesEnabled) {
      this.collectibleTimer -= dt;
      if (this.collectibleTimer <= 0) {
        const spawnX = GAME_CONFIG.worldWidth + 28;
        const safeY = this.findSafeSpawnY(
          spawnX,
          options.pipes,
          options.activeCollectibles
        );
        if (safeY !== null) {
          const type = this.pickCollectibleType();
          options.onSpawnCollectible(type, spawnX, safeY);
        }
        this.collectibleTimer = 1.65 + this.rng() * 1.15;
      }
    }

    if (options.powerUpsEnabled) {
      this.powerUpTimer -= dt;
      if (this.powerUpTimer <= 0) {
        if (this.countActivePowerUps() === 0) {
          const spawnX = GAME_CONFIG.worldWidth + 32;
          const safeY = this.findSafeSpawnY(
            spawnX,
            options.pipes,
            options.activeCollectibles
          );
          if (safeY !== null) {
            const id = this.pickPowerUpId(options.hasShield, options.hasReviveOrUsed);
            if (this.activateOrb(id, spawnX, safeY)) {
              options.onPowerUpSpawned?.();
            }
          }
        }
        this.powerUpTimer = this.getNextPowerUpCooldown(options.difficultyMultiplier);
      }
    }
  }

  public updateOrbsMotion(dt: number, scrollSpeed: number): void {
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      orb.x -= scrollSpeed * dt;
      orb.phase += dt * 3.8;
      orb.y = orb.baseY + Math.sin(orb.phase) * 7;
      if (orb.x < -40) {
        orb.active = false;
      }
    }
  }

  public spawnOrbManual(powerUpId: PowerUpId, x: number, y: number): boolean {
    return this.activateOrb(powerUpId, x, y);
  }

  private activateOrb(powerUpId: PowerUpId, x: number, y: number): boolean {
    for (const orb of this.orbs) {
      if (!orb.active) {
        orb.id = this.nextId++;
        orb.active = true;
        orb.powerUpId = powerUpId;
        orb.x = x;
        orb.y = y;
        orb.baseY = y;
        orb.phase = this.rng() * Math.PI * 2;
        return true;
      }
    }
    return false;
  }

  /**
   * Finds a guaranteed safe Y coordinate outside all pipes and well inside playable bounds.
   */
  public findSafeSpawnY(
    spawnX: number,
    pipes: Pipe[],
    activeCollectibles: readonly ActiveCollectible[]
  ): number | null {
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;
    const minY = 82;
    const maxY = groundY - 82;

    // Check if any pipe is near spawnX
    let candidateMin = minY;
    let candidateMax = maxY;
    for (const pipe of pipes) {
      const margin = 62;
      if (spawnX >= pipe.x - margin && spawnX <= pipe.x + pipe.width + margin) {
        const safeBand = Math.max(24, pipe.gapHeight * 0.25);
        candidateMin = Math.max(candidateMin, pipe.gapY - safeBand);
        candidateMax = Math.min(candidateMax, pipe.gapY + safeBand);
      }
    }

    if (candidateMin > candidateMax) {
      return null;
    }

    const chosenY = candidateMin + this.rng() * Math.max(4, candidateMax - candidateMin);

    // Ensure adequate distance from nearby power-ups / collectibles
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      const dx = spawnX - orb.x;
      const dy = chosenY - orb.y;
      if (dx * dx + dy * dy < 72 * 72) {
        return null;
      }
    }
    for (const c of activeCollectibles) {
      if (!c.active) continue;
      const dx = spawnX - c.x;
      const dy = chosenY - c.y;
      if (dx * dx + dy * dy < 64 * 64) {
        return null;
      }
    }

    return chosenY;
  }

  private pickCollectibleType(): CollectibleType {
    let total = 0;
    for (const c of COLLECTIBLE_REGISTRY) {
      total += c.spawnWeight;
    }
    let roll = this.rng() * total;
    for (const c of COLLECTIBLE_REGISTRY) {
      roll -= c.spawnWeight;
      if (roll <= 0) return c.type;
    }
    return 'coin';
  }

  private pickPowerUpId(hasShield: boolean, hasReviveOrUsed: boolean): PowerUpId {
    const eligible = POWER_UP_REGISTRY.filter((p) => {
      if (p.id === 'shield' && hasShield) return false;
      if (p.id === 'second_chance' && hasReviveOrUsed) return false;
      return true;
    });
    const pool = eligible.length > 0 ? eligible : POWER_UP_REGISTRY;
    let total = 0;
    for (const p of pool) {
      total += p.spawnWeight;
    }
    let roll = this.rng() * total;
    for (const p of pool) {
      roll -= p.spawnWeight;
      if (roll <= 0) return p.id;
    }
    return pool[0].id;
  }
}
