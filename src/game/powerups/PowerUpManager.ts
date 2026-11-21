import { audioManager } from '../audio/AudioManager';
import { GAME_CONFIG } from '../Config';
import { ParticleSystem } from '../ParticleSystem';
import { Pipe } from '../Pipe';
import { Player } from '../Player';
import { vibrationManager } from '../settings/VibrationManager';
import { CollectibleManager } from './CollectibleManager';
import { currencyManager } from './CurrencyManager';
import { PowerUpCollision } from './PowerUpCollision';
import { ActivePowerUpStatus, PowerUpEffectManager } from './PowerUpEffectManager';
import { getPowerUpById, PowerUpId } from './PowerUpRegistry';
import {
  ActivePowerUpOrb,
  PowerUpFrequencySetting,
  PowerUpSpawnManager,
} from './PowerUpSpawnManager';

export type VisualEffectsQuality = 'low' | 'medium' | 'high';

export interface PowerUpBannerEvent {
  id: number;
  powerUpId: PowerUpId;
  icon: string;
  text: string;
  colorHex: string;
}

export interface PowerUpRunSummary {
  powerUpsCollectedThisRun: number;
  shieldSavesDelta: number;
  revivesUsedDelta: number;
  coinsCollectedThisRun: number;
  gemsCollectedThisRun: number;
}

export interface PowerUpUpdateOutput {
  bonusScoreEarned: number;
  banner: PowerUpBannerEvent | null;
  currencyChanged: boolean;
  coinsEarned: number;
  gemsEarned: number;
  starsCollected: number;
  magnetCollectCount: number;
  collectedPowerUpIds: PowerUpId[];
}

interface FloatingPickupText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export class PowerUpManager {
  private static instance: PowerUpManager | null = null;

  public static getInstance(): PowerUpManager {
    if (!PowerUpManager.instance) {
      PowerUpManager.instance = new PowerUpManager();
    }
    return PowerUpManager.instance;
  }

  public readonly effects = new PowerUpEffectManager();
  public readonly spawner = new PowerUpSpawnManager();
  public readonly collectibles = new CollectibleManager();

  private powerUpsEnabled = true;
  private collectiblesEnabled = true;
  private visualFxQuality: VisualEffectsQuality = 'high';
  private nextBannerId = 1;
  private elapsed = 0;
  private floatingTexts: FloatingPickupText[] = [];
  private trailTimer = 0;

  public configure(opts: {
    powerUpsEnabled: boolean;
    collectiblesEnabled: boolean;
    frequency: PowerUpFrequencySetting;
    visualFxQuality: VisualEffectsQuality;
  }): void {
    this.powerUpsEnabled = opts.powerUpsEnabled;
    this.collectiblesEnabled = opts.collectiblesEnabled;
    this.spawner.setFrequency(opts.frequency);
    this.visualFxQuality = opts.visualFxQuality;
  }

  public resetRun(deterministicSeed?: number): void {
    this.effects.reset();
    this.spawner.reset(deterministicSeed);
    this.collectibles.reset();
    this.floatingTexts = [];
    this.trailTimer = 0;
    this.elapsed = 0;
  }

  public cleanupOnGameEnd(): void {
    this.effects.clearActiveEffects();
    this.spawner.reset();
    this.collectibles.reset();
    this.floatingTexts = [];
    this.trailTimer = 0;
  }

  public update(
    dt: number,
    options: {
      player: Player;
      pipes: Pipe[];
      basePipeSpeed: number;
      difficultyMultiplier: number;
      particles: ParticleSystem;
      emitPickupSounds: boolean;
    }
  ): PowerUpUpdateOutput {
    this.elapsed += dt;
    this.effects.update(dt);

    // Move items cleanly at effective pipe speed (respects Slow Motion smoothly!)
    const effectiveSpeed = options.basePipeSpeed * this.effects.getEnvironmentSpeedMultiplier();
    this.spawner.updateOrbsMotion(dt, effectiveSpeed);

    // Spawn new items safely ahead of player
    this.spawner.update(dt, {
      powerUpsEnabled: this.powerUpsEnabled,
      collectiblesEnabled: this.collectiblesEnabled,
      pipes: options.pipes,
      activeCollectibles: this.collectibles.getActiveItems(),
      difficultyMultiplier: options.difficultyMultiplier,
      hasShield: this.effects.hasShield,
      hasReviveOrUsed: this.effects.hasReviveCharge || this.effects.revivedThisRun,
      onSpawnCollectible: (type, x, y) => {
        this.collectibles.spawn(type, x, y);
      },
      onPowerUpSpawned: () => {
        if (options.emitPickupSounds) {
          audioManager.playPowerUpSpawn();
        }
      },
    });

    // Update collectibles + smooth Magnet attraction
    const pickedCollectibles = this.collectibles.update(
      dt,
      effectiveSpeed,
      options.player.x,
      options.player.y,
      options.player.collisionRadius,
      this.effects.isMagnetActive()
    );

    let bonusScoreEarned = 0;
    let currencyChanged = false;
    let totalCoinsEarned = 0;
    let totalGemsEarned = 0;
    let starsCollected = 0;
    let magnetCollectCount = 0;
    const collectedPowerUpIds: PowerUpId[] = [];
    const mult = this.effects.getScoreMultiplier();

    for (const item of pickedCollectibles) {
      const coinsEarned = item.def.coinValue * mult;
      const gemsEarned = item.def.gemValue;
      const bonusScore = item.def.bonusScore * mult;

      this.effects.runCoinsCollected += coinsEarned;
      this.effects.runGemsCollected += gemsEarned;
      totalCoinsEarned += coinsEarned;
      totalGemsEarned += gemsEarned;
      if (item.type === 'star') starsCollected += 1;
      if (item.attractedByMagnet) magnetCollectCount += 1;
      bonusScoreEarned += bonusScore;
      currencyChanged = true;

      currencyManager.addGameplayRewards(coinsEarned, gemsEarned, item.type === 'star');

      const labelParts: string[] = [];
      if (gemsEarned > 0) labelParts.push(`+${gemsEarned} GEM`);
      if (coinsEarned > 0) labelParts.push(`+${coinsEarned}`);
      if (bonusScore > 0) labelParts.push(`+${bonusScore} PTS`);

      this.addFloatingText(
        item.x,
        item.y - 16,
        labelParts.join(' · '),
        item.type === 'gem' ? '#38BDF8' : '#FFD84D'
      );

      if (options.emitPickupSounds) {
        if (item.type === 'gem') audioManager.playGemCollect();
        else if (item.type === 'star') audioManager.playStarCollect();
        else audioManager.playCoinCollect();
      }
      vibrationManager.vibrateScore();
    }

    // Check Power-Up Orb pickups
    let banner: PowerUpBannerEvent | null = null;
    for (const orb of this.spawner.getActivePowerUpOrbs()) {
      if (!orb.active) continue;
      if (
        PowerUpCollision.circlesOverlap(
          options.player.x,
          options.player.y,
          options.player.collisionRadius + 4,
          orb.x,
          orb.y,
          orb.radius
        )
      ) {
        orb.active = false;
        const result = this.collectPowerUp(
          orb.powerUpId,
          orb.x,
          orb.y,
          options.particles,
          options.emitPickupSounds
        );
        if (result) {
          banner = result;
          collectedPowerUpIds.push(orb.powerUpId);
        }
      }
    }

    // Spawn subtle active buff trail particles without flooding mobile GPU
    this.updateActiveFxParticles(dt, options.player, options.particles);

    // Update pickup floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += dt;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
    }

    return {
      bonusScoreEarned,
      banner,
      currencyChanged,
      coinsEarned: totalCoinsEarned,
      gemsEarned: totalGemsEarned,
      starsCollected,
      magnetCollectCount,
      collectedPowerUpIds,
    };
  }

  public collectPowerUp(
    powerUpId: PowerUpId,
    x: number,
    y: number,
    particles?: ParticleSystem,
    emitSound = true
  ): PowerUpBannerEvent | null {
    const def = getPowerUpById(powerUpId);
    const { activated } = this.effects.activate(powerUpId);
    currencyManager.recordPowerUpCollected();

    if (!activated) {
      this.addFloatingText(x, y - 16, `${def.icon} MAX`, def.colorHex);
      if (emitSound) audioManager.playPowerUpCollect();
      return null;
    }

    this.addFloatingText(x, y - 18, def.bannerText, def.colorHex);
    if (particles) {
      particles.spawnFlapPuff(x, y, [def.colorHex, '#FFFFFF', '#FFD84D'], 'star');
    }

    if (emitSound) {
      switch (powerUpId) {
        case 'shield':
          audioManager.playShieldActivate();
          break;
        case 'slow_motion':
          audioManager.playSlowMotion();
          break;
        case 'magnet':
          audioManager.playMagnet();
          break;
        case 'score_boost':
          audioManager.playScoreBoost();
          break;
        case 'feather':
          audioManager.playFeather();
          break;
        case 'second_chance':
        default:
          audioManager.playPowerUpCollect();
          break;
      }
    }
    vibrationManager.vibrateScore();

    return {
      id: this.nextBannerId++,
      powerUpId,
      icon: def.icon,
      text: def.bannerText,
      colorHex: def.colorHex,
    };
  }

  /**
   * Intercepts collision to handle grace invulnerability, Shield break, or Revive offer.
   */
  public handleCollision(
    reason: 'pipe' | 'ground' | 'ceiling',
    player: Player,
    groundY: number,
    particles: ParticleSystem
  ): { survived: boolean; offerRevive: boolean; shieldBroken: boolean } {
    if (this.effects.isInvulnerable()) {
      this.nudgePlayerSafe(reason, player, groundY);
      return { survived: true, offerRevive: false, shieldBroken: false };
    }

    if (this.effects.consumeShield()) {
      this.nudgePlayerSafe(reason, player, groundY);
      particles.spawnCollisionBurst(player.x, player.y);
      this.addFloatingText(player.x, player.y - 26, '🛡️ SHIELD SAVED!', '#38BDF8');
      currencyManager.recordShieldSave();
      audioManager.playShieldBreak();
      vibrationManager.vibrateCollision();
      return { survived: true, offerRevive: false, shieldBroken: true };
    }

    if (this.effects.canOfferRevive()) {
      return { survived: false, offerRevive: true, shieldBroken: false };
    }

    return { survived: false, offerRevive: false, shieldBroken: false };
  }

  public executeRevive(
    player: Player,
    pipes: Pipe[],
    groundY: number,
    particles: ParticleSystem
  ): boolean {
    if (!this.effects.consumeRevive()) return false;

    // Position player safely inside nearest upcoming pipe gap or center sky
    let safeY = groundY * 0.45;
    for (const pipe of pipes) {
      if (pipe.x + pipe.width >= player.x - 50 && pipe.x <= player.x + 150) {
        safeY = pipe.gapY;
        break;
      }
    }

    player.isDead = false;
    player.y = Math.max(player.collisionRadius + 30, Math.min(groundY - player.collisionRadius - 30, safeY));
    player.vy = -135;
    player.rotation = -0.15;

    particles.spawnFlapPuff(player.x, player.y, ['#FB7185', '#FFFFFF', '#FFD84D'], 'star');
    this.addFloatingText(player.x, player.y - 28, '❤️ REVIVED!', '#FB7185');
    currencyManager.recordReviveUsed();
    audioManager.playRevive();
    vibrationManager.vibrateVictory();
    return true;
  }

  private nudgePlayerSafe(
    reason: 'pipe' | 'ground' | 'ceiling',
    player: Player,
    groundY: number
  ): void {
    if (reason === 'ground') {
      player.y = groundY - player.collisionRadius - 10;
      player.vy = -260;
    } else if (reason === 'ceiling') {
      player.y = player.collisionRadius + 10;
      player.vy = 95;
    }
  }

  private updateActiveFxParticles(
    dt: number,
    player: Player,
    particles: ParticleSystem
  ): void {
    if (this.visualFxQuality === 'low') return;
    this.trailTimer -= dt;
    if (this.trailTimer > 0) return;

    this.trailTimer = this.visualFxQuality === 'medium' ? 0.24 : 0.14;
    if (this.effects.slowMotionRemaining > 0) {
      particles.spawnFlapPuff(player.x, player.y, ['#A855F7', '#E9D5FF'], 'circle');
    } else if (this.effects.scoreBoostRemaining > 0) {
      particles.spawnFlapPuff(player.x, player.y, ['#FACC15', '#FEF08A'], 'star');
    } else if (this.effects.featherRemaining > 0) {
      particles.spawnFlapPuff(player.x, player.y, ['#6EE7B7', '#FFFFFF'], 'feather');
    }
  }

  public getActiveStatuses(): ActivePowerUpStatus[] {
    return this.effects.getActiveHUDList();
  }

  public getRemainingDuration(id: PowerUpId): number {
    switch (id) {
      case 'slow_motion':
        return this.effects.slowMotionRemaining;
      case 'magnet':
        return this.effects.magnetRemaining;
      case 'score_boost':
        return this.effects.scoreBoostRemaining;
      case 'feather':
        return this.effects.featherRemaining;
      case 'shield':
        return this.effects.hasShield ? 1 : 0;
      case 'second_chance':
        return this.effects.hasReviveCharge ? 1 : 0;
    }
  }

  public hasActivePowerUp(id: PowerUpId): boolean {
    return this.getRemainingDuration(id) > 0;
  }

  public drawScreenTint(ctx: CanvasRenderingContext2D): void {
    if (this.effects.slowMotionRemaining > 0 && this.visualFxQuality !== 'low') {
      const fade = Math.min(1, this.effects.slowMotionRemaining / 0.5);
      ctx.save();
      ctx.fillStyle = `rgba(126, 34, 206, ${0.13 * fade})`;
      ctx.fillRect(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);
      ctx.restore();
    }
  }

  public drawWorldItems(ctx: CanvasRenderingContext2D, player: Player): void {
    const lowFx = this.visualFxQuality === 'low';
    this.collectibles.draw(ctx, player.x, player.y, this.effects.isMagnetActive(), lowFx);

    for (const orb of this.spawner.getActivePowerUpOrbs()) {
      if (!orb.active) continue;
      this.drawPowerUpOrb(ctx, orb, lowFx);
    }
  }

  public drawPlayerAuras(ctx: CanvasRenderingContext2D, player: Player): void {
    const lowFx = this.visualFxQuality === 'low';

    // Invulnerability blink ring after Shield break or Revive
    if (this.effects.isInvulnerable()) {
      const pulse = 0.35 + 0.35 * Math.sin(this.elapsed * 22);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.visualRadius + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Magnet circular pulse
    if (this.effects.isMagnetActive() && !lowFx) {
      const pulse = (this.elapsed * 1.4) % 1;
      ctx.save();
      ctx.strokeStyle = `rgba(249, 115, 22, ${0.42 * (1 - pulse)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.visualRadius + 14 + pulse * 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Score Boost golden glow
    if (this.effects.scoreBoostRemaining > 0 && !lowFx) {
      ctx.save();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.visualRadius + 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Feather soft mint halo
    if (this.effects.featherRemaining > 0 && !lowFx) {
      ctx.save();
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.48)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.visualRadius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Shield bubble aura (bright crisp sky-blue bubble)
    if (this.effects.hasShield) {
      const pulse = 1 + Math.sin(this.elapsed * 6) * 0.05;
      const r = (player.visualRadius + 9) * pulse;
      ctx.save();
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.ellipse(player.x - r * 0.36, player.y - r * 0.38, 4.5, 2.2, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating pickup labels (+1, +2 PTS, SHIELD SAVED!, etc.)
    for (const ft of this.floatingTexts) {
      const t = ft.life / ft.maxLife;
      const alpha = Math.max(0, 1 - t);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '800 13px Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = GAME_CONFIG.colors.darkOutline;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string): void {
    this.floatingTexts.push({
      x,
      y,
      vy: -42,
      text,
      color,
      life: 0,
      maxLife: 0.9,
    });
  }

  private drawPowerUpOrb(
    ctx: CanvasRenderingContext2D,
    orb: ActivePowerUpOrb,
    lowFx: boolean
  ): void {
    const def = getPowerUpById(orb.powerUpId);
    ctx.save();
    ctx.translate(orb.x, orb.y);

    if (!lowFx) {
      ctx.fillStyle = def.glowRgba;
      ctx.beginPath();
      ctx.arc(0, 0, orb.radius + 7 + Math.sin(orb.phase * 1.4) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glossy arcade capsule orb
    ctx.fillStyle = def.colorHex;
    ctx.strokeStyle = GAME_CONFIG.colors.darkOutline;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-orb.radius * 0.3, -orb.radius * 0.35, 5, 2.8, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Vector badge icon inside orb (crisp across all platforms even without emoji fonts)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = GAME_CONFIG.colors.darkOutline;
    ctx.lineWidth = 1.6;
    if (orb.powerUpId === 'shield') {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(7, -5);
      ctx.lineTo(6, 3);
      ctx.lineTo(0, 9);
      ctx.lineTo(-6, 3);
      ctx.lineTo(-7, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (orb.powerUpId === 'second_chance') {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-3.5, -2, 4, 0, Math.PI * 2);
      ctx.arc(3.5, -2, 4, 0, Math.PI * 2);
      ctx.moveTo(-7.2, -0.5);
      ctx.lineTo(0, 8);
      ctx.lineTo(7.2, -0.5);
      ctx.fill();
    } else if (orb.powerUpId === 'slow_motion') {
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -4.5);
      ctx.moveTo(0, 0);
      ctx.lineTo(4, 2);
      ctx.stroke();
    } else if (orb.powerUpId === 'magnet') {
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -1, 6, 0, Math.PI);
      ctx.stroke();
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(-7.5, -6, 3.5, 5);
      ctx.fillRect(4, -6, 3.5, 5);
    } else if (orb.powerUpId === 'score_boost') {
      ctx.fillStyle = '#24415C';
      ctx.font = '900 12px Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('x2', 0, 1);
    } else {
      // Feather leaf shape
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}

export const powerUpManager = PowerUpManager.getInstance();
