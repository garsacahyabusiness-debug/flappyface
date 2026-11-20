import { getPowerUpById, PowerUpId } from './PowerUpRegistry';

export interface ActivePowerUpStatus {
  id: PowerUpId;
  name: string;
  icon: string;
  remainingSec: number;
  totalSec: number;
  isCharge: boolean;
  label: string;
}

const EASE_OUT_WINDOW = 0.45;
const POST_HIT_INVULNERABILITY_SEC = 1.35;
const POST_REVIVE_INVULNERABILITY_SEC = 2.0;

export class PowerUpEffectManager {
  public hasShield = false;
  public hasReviveCharge = false;
  public revivedThisRun = false;

  public slowMotionRemaining = 0;
  public magnetRemaining = 0;
  public scoreBoostRemaining = 0;
  public featherRemaining = 0;
  public invulnerableRemaining = 0;

  public runPowerUpsCollected = 0;
  public runCoinsCollected = 0;
  public runGemsCollected = 0;

  public reset(): void {
    this.clearActiveEffects();
    this.runPowerUpsCollected = 0;
    this.runCoinsCollected = 0;
    this.runGemsCollected = 0;
  }

  public clearActiveEffects(): void {
    this.hasShield = false;
    this.hasReviveCharge = false;
    this.revivedThisRun = false;
    this.slowMotionRemaining = 0;
    this.magnetRemaining = 0;
    this.scoreBoostRemaining = 0;
    this.featherRemaining = 0;
    this.invulnerableRemaining = 0;
  }

  public activate(id: PowerUpId): { activated: boolean; refreshed: boolean } {
    const def = getPowerUpById(id);
    this.runPowerUpsCollected += 1;

    switch (id) {
      case 'shield': {
        if (this.hasShield) {
          // Do not stack shields
          return { activated: false, refreshed: false };
        }
        this.hasShield = true;
        return { activated: true, refreshed: false };
      }

      case 'second_chance': {
        if (this.hasReviveCharge || this.revivedThisRun) {
          // Only one revive charge per run
          return { activated: false, refreshed: false };
        }
        this.hasReviveCharge = true;
        return { activated: true, refreshed: false };
      }

      case 'slow_motion': {
        const refreshed = this.slowMotionRemaining > 0;
        this.slowMotionRemaining = def.durationSec;
        return { activated: true, refreshed };
      }

      case 'magnet': {
        const refreshed = this.magnetRemaining > 0;
        this.magnetRemaining = def.durationSec;
        return { activated: true, refreshed };
      }

      case 'score_boost': {
        // Refresh duration only; never stack multipliers beyond x2
        const refreshed = this.scoreBoostRemaining > 0;
        this.scoreBoostRemaining = def.durationSec;
        return { activated: true, refreshed };
      }

      case 'feather': {
        const refreshed = this.featherRemaining > 0;
        this.featherRemaining = def.durationSec;
        return { activated: true, refreshed };
      }
    }
  }

  public update(dt: number): void {
    if (dt <= 0) return;
    if (this.slowMotionRemaining > 0) {
      this.slowMotionRemaining = Math.max(0, this.slowMotionRemaining - dt);
    }
    if (this.magnetRemaining > 0) {
      this.magnetRemaining = Math.max(0, this.magnetRemaining - dt);
    }
    if (this.scoreBoostRemaining > 0) {
      this.scoreBoostRemaining = Math.max(0, this.scoreBoostRemaining - dt);
    }
    if (this.featherRemaining > 0) {
      this.featherRemaining = Math.max(0, this.featherRemaining - dt);
    }
    if (this.invulnerableRemaining > 0) {
      this.invulnerableRemaining = Math.max(0, this.invulnerableRemaining - dt);
    }
  }

  public consumeShield(): boolean {
    if (!this.hasShield) return false;
    this.hasShield = false;
    this.invulnerableRemaining = Math.max(
      this.invulnerableRemaining,
      POST_HIT_INVULNERABILITY_SEC
    );
    return true;
  }

  public canOfferRevive(): boolean {
    return this.hasReviveCharge && !this.revivedThisRun;
  }

  public consumeRevive(): boolean {
    if (!this.canOfferRevive()) return false;
    this.hasReviveCharge = false;
    this.revivedThisRun = true;
    this.invulnerableRemaining = POST_REVIVE_INVULNERABILITY_SEC;
    return true;
  }

  public isInvulnerable(): boolean {
    return this.invulnerableRemaining > 0;
  }

  public getEnvironmentSpeedMultiplier(): number {
    if (this.slowMotionRemaining <= 0) return 1;
    if (this.slowMotionRemaining < EASE_OUT_WINDOW) {
      const t = 1 - this.slowMotionRemaining / EASE_OUT_WINDOW;
      return 0.56 + 0.44 * t;
    }
    return 0.56;
  }

  public getGravityScale(): number {
    if (this.featherRemaining <= 0) return 1;
    if (this.featherRemaining < EASE_OUT_WINDOW) {
      const t = 1 - this.featherRemaining / EASE_OUT_WINDOW;
      return 0.72 + 0.28 * t;
    }
    return 0.72;
  }

  public getMaxFallVelocityScale(): number {
    if (this.featherRemaining <= 0) return 1;
    if (this.featherRemaining < EASE_OUT_WINDOW) {
      const t = 1 - this.featherRemaining / EASE_OUT_WINDOW;
      return 0.76 + 0.24 * t;
    }
    return 0.76;
  }

  public getScoreMultiplier(): number {
    return this.scoreBoostRemaining > 0 ? 2 : 1;
  }

  public isMagnetActive(): boolean {
    return this.magnetRemaining > 0;
  }

  public getActiveHUDList(): ActivePowerUpStatus[] {
    const list: ActivePowerUpStatus[] = [];

    if (this.hasShield) {
      const d = getPowerUpById('shield');
      list.push({
        id: d.id,
        name: d.name,
        icon: d.icon,
        remainingSec: 1,
        totalSec: 1,
        isCharge: true,
        label: 'READY',
      });
    }

    if (this.hasReviveCharge) {
      const d = getPowerUpById('second_chance');
      list.push({
        id: d.id,
        name: d.name,
        icon: d.icon,
        remainingSec: 1,
        totalSec: 1,
        isCharge: true,
        label: '1x REVIVE',
      });
    }

    if (this.scoreBoostRemaining > 0) {
      const d = getPowerUpById('score_boost');
      list.push({
        id: d.id,
        name: d.name,
        icon: d.icon,
        remainingSec: this.scoreBoostRemaining,
        totalSec: d.durationSec,
        isCharge: false,
        label: `x2 · ${this.scoreBoostRemaining.toFixed(1)}s`,
      });
    }

    if (this.slowMotionRemaining > 0) {
      const d = getPowerUpById('slow_motion');
      list.push({
        id: d.id,
        name: d.name,
        icon: d.icon,
        remainingSec: this.slowMotionRemaining,
        totalSec: d.durationSec,
        isCharge: false,
        label: `${this.slowMotionRemaining.toFixed(1)}s`,
      });
    }

    if (this.magnetRemaining > 0) {
      const d = getPowerUpById('magnet');
      list.push({
        id: d.id,
        name: d.name,
        icon: d.icon,
        remainingSec: this.magnetRemaining,
        totalSec: d.durationSec,
        isCharge: false,
        label: `${this.magnetRemaining.toFixed(1)}s`,
      });
    }

    if (this.featherRemaining > 0) {
      const d = getPowerUpById('feather');
      list.push({
        id: d.id,
        name: d.name,
        icon: d.icon,
        remainingSec: this.featherRemaining,
        totalSec: d.durationSec,
        isCharge: false,
        label: `${this.featherRemaining.toFixed(1)}s`,
      });
    }

    return list;
  }
}
