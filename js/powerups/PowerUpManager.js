/**
 * Standalone ES Module singleton implementation at js/powerups/PowerUpManager.js.
 * Handles spawning cooldowns, player <-> power-up/collectible collision checks,
 * active effect timers/status flags, and cleanup on game end.
 */

export const POWERUP_DEFINITIONS = Object.freeze({
  shield: { id: 'shield', name: 'SHIELD', icon: '🛡️', duration: 0, weight: 26 },
  second_chance: { id: 'second_chance', name: 'SECOND CHANCE', icon: '❤️', duration: 0, weight: 10 },
  slow_motion: { id: 'slow_motion', name: 'SLOW MOTION', icon: '⏱️', duration: 5, weight: 18 },
  magnet: { id: 'magnet', name: 'MAGNET', icon: '🧲', duration: 8, weight: 18 },
  score_boost: { id: 'score_boost', name: 'SCORE BOOST', icon: '⚡', duration: 10, weight: 13 },
  feather: { id: 'feather', name: 'FEATHER', icon: '🪶', duration: 6, weight: 22 },
});

export const COLLECTIBLE_DEFINITIONS = Object.freeze({
  coin: { type: 'coin', icon: '🪙', coinValue: 1, gemValue: 0, bonusScore: 0, radius: 13, weight: 74 },
  star: { type: 'star', icon: '⭐', coinValue: 3, gemValue: 0, bonusScore: 2, radius: 14.5, weight: 19 },
  gem: { type: 'gem', icon: '💎', coinValue: 5, gemValue: 1, bonusScore: 3, radius: 14.5, weight: 7 },
});

const WORLD_WIDTH = 400;
const WORLD_HEIGHT = 720;
const GROUND_HEIGHT = 96;

function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const maxDist = ar + br;
  return dx * dx + dy * dy <= maxDist * maxDist;
}

class PowerUpManager {
  /** @type {PowerUpManager | null} */
  static #instance = null;

  powerUpsEnabled = true;
  collectiblesEnabled = true;
  frequency = 'normal';
  /** @type {Array<{id:number,powerUpId:string,x:number,y:number,baseY:number,radius:number,phase:number}>} */
  powerUpOrbs = [];
  /** @type {Array<{id:number,type:string,x:number,y:number,radius:number,phase:number}>} */
  collectibles = [];
  powerUpCooldown = 5.5;
  collectibleCooldown = 1.6;
  nextEntityId = 1;
  activeEffects = {
    hasShield: false,
    hasReviveCharge: false,
    revivedThisRun: false,
    slowMotionRemaining: 0,
    magnetRemaining: 0,
    scoreBoostRemaining: 0,
    featherRemaining: 0,
    invulnerableRemaining: 0,
  };
  runCoins = 0;
  runGems = 0;

  static getInstance() {
    if (!PowerUpManager.#instance) {
      PowerUpManager.#instance = new PowerUpManager();
    }
    return PowerUpManager.#instance;
  }

  constructor() {
    if (PowerUpManager.#instance) {
      return PowerUpManager.#instance;
    }
    PowerUpManager.#instance = this;
  }

  configure(options = {}) {
    if (typeof options.powerUpsEnabled === 'boolean') {
      this.powerUpsEnabled = options.powerUpsEnabled;
    }
    if (typeof options.collectiblesEnabled === 'boolean') {
      this.collectiblesEnabled = options.collectiblesEnabled;
    }
    if (options.frequency === 'low' || options.frequency === 'normal' || options.frequency === 'high') {
      this.frequency = options.frequency;
    }
  }

  reset() {
    this.cleanup();
    this.runCoins = 0;
    this.runGems = 0;
    this.powerUpCooldown = this.#getNextPowerUpCooldown(true);
    this.collectibleCooldown = 1.5;
  }

  cleanup() {
    this.powerUpOrbs = [];
    this.collectibles = [];
    this.activeEffects.hasShield = false;
    this.activeEffects.hasReviveCharge = false;
    this.activeEffects.revivedThisRun = false;
    this.activeEffects.slowMotionRemaining = 0;
    this.activeEffects.magnetRemaining = 0;
    this.activeEffects.scoreBoostRemaining = 0;
    this.activeEffects.featherRemaining = 0;
    this.activeEffects.invulnerableRemaining = 0;
  }

  onGameEnd() {
    this.cleanup();
  }

  #getNextPowerUpCooldown(initial = false) {
    if (this.frequency === 'low') return (initial ? 7.5 : 10.5) + Math.random() * 3.5;
    if (this.frequency === 'high') return (initial ? 3.4 : 4.8) + Math.random() * 2.0;
    return (initial ? 5.0 : 7.2) + Math.random() * 2.5;
  }

  #findSafeY(spawnX, pipes = []) {
    const groundY = WORLD_HEIGHT - GROUND_HEIGHT;
    let minY = 82;
    let maxY = groundY - 82;
    for (const pipe of pipes) {
      if (spawnX >= pipe.x - 62 && spawnX <= pipe.x + pipe.width + 62) {
        const halfBand = Math.max(24, pipe.gapHeight * 0.25);
        minY = Math.max(minY, pipe.gapY - halfBand);
        maxY = Math.min(maxY, pipe.gapY + halfBand);
      }
    }
    if (minY > maxY) return null;
    return minY + Math.random() * Math.max(4, maxY - minY);
  }

  #pickWeighted(entries) {
    const total = entries.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of entries) {
      roll -= item.weight;
      if (roll <= 0) return item;
    }
    return entries[0];
  }

  spawnPowerUp(powerUpId, x, y) {
    const def = POWERUP_DEFINITIONS[powerUpId];
    if (!def) return null;
    const orb = {
      id: this.nextEntityId++,
      powerUpId: def.id,
      x,
      y,
      baseY: y,
      radius: 17,
      phase: Math.random() * Math.PI * 2,
    };
    this.powerUpOrbs.push(orb);
    return orb;
  }

  spawnCollectible(type, x, y) {
    const def = COLLECTIBLE_DEFINITIONS[type];
    if (!def) return null;
    const item = {
      id: this.nextEntityId++,
      type: def.type,
      x,
      y,
      radius: def.radius,
      phase: Math.random() * Math.PI * 2,
    };
    this.collectibles.push(item);
    return item;
  }

  activatePowerUp(powerUpId) {
    const def = POWERUP_DEFINITIONS[powerUpId];
    if (!def) return false;
    if (powerUpId === 'shield') {
      if (this.activeEffects.hasShield) return false;
      this.activeEffects.hasShield = true;
      return true;
    }
    if (powerUpId === 'second_chance') {
      if (this.activeEffects.hasReviveCharge || this.activeEffects.revivedThisRun) return false;
      this.activeEffects.hasReviveCharge = true;
      return true;
    }
    if (powerUpId === 'slow_motion') {
      this.activeEffects.slowMotionRemaining = def.duration;
      return true;
    }
    if (powerUpId === 'magnet') {
      this.activeEffects.magnetRemaining = def.duration;
      return true;
    }
    if (powerUpId === 'score_boost') {
      this.activeEffects.scoreBoostRemaining = def.duration;
      return true;
    }
    if (powerUpId === 'feather') {
      this.activeEffects.featherRemaining = def.duration;
      return true;
    }
    return false;
  }

  update(dt, player, pipes = [], baseScrollSpeed = 176) {
    if (dt <= 0) return { collectedPowerUps: [], collectedItems: [], bonusScore: 0 };

    // 1. Tick active effect timers
    const fx = this.activeEffects;
    fx.slowMotionRemaining = Math.max(0, fx.slowMotionRemaining - dt);
    fx.magnetRemaining = Math.max(0, fx.magnetRemaining - dt);
    fx.scoreBoostRemaining = Math.max(0, fx.scoreBoostRemaining - dt);
    fx.featherRemaining = Math.max(0, fx.featherRemaining - dt);
    fx.invulnerableRemaining = Math.max(0, fx.invulnerableRemaining - dt);

    const speedMult = fx.slowMotionRemaining > 0 ? 0.56 : 1;
    const scrollSpeed = baseScrollSpeed * speedMult;

    // 2. Spawning logic with cooldowns
    if (this.collectiblesEnabled && this.collectibles.length < 8) {
      this.collectibleCooldown -= dt;
      if (this.collectibleCooldown <= 0) {
        const spawnX = WORLD_WIDTH + 28;
        const safeY = this.#findSafeY(spawnX, pipes);
        if (safeY !== null) {
          const picked = this.#pickWeighted(Object.values(COLLECTIBLE_DEFINITIONS));
          this.spawnCollectible(picked.type, spawnX, safeY);
        }
        this.collectibleCooldown = 1.65 + Math.random() * 1.15;
      }
    }

    if (this.powerUpsEnabled) {
      this.powerUpCooldown -= dt;
      if (this.powerUpCooldown <= 0) {
        if (this.powerUpOrbs.length === 0) {
          const spawnX = WORLD_WIDTH + 32;
          const safeY = this.#findSafeY(spawnX, pipes);
          if (safeY !== null) {
            const eligible = Object.values(POWERUP_DEFINITIONS).filter((p) => {
              if (p.id === 'shield' && fx.hasShield) return false;
              if (p.id === 'second_chance' && (fx.hasReviveCharge || fx.revivedThisRun)) return false;
              return true;
            });
            const picked = this.#pickWeighted(eligible);
            this.spawnPowerUp(picked.id, spawnX, safeY);
          }
        }
        this.powerUpCooldown = this.#getNextPowerUpCooldown(false);
      }
    }

    // 3. Move & detect collisions with player
    const playerRadius = player?.collisionRadius ?? 17.5;
    const collectedPowerUps = [];
    const collectedItems = [];
    let bonusScore = 0;
    const scoreMult = fx.scoreBoostRemaining > 0 ? 2 : 1;

    for (let i = this.powerUpOrbs.length - 1; i >= 0; i--) {
      const orb = this.powerUpOrbs[i];
      orb.x -= scrollSpeed * dt;
      orb.phase += dt * 3.8;
      orb.y = orb.baseY + Math.sin(orb.phase) * 7;

      if (player && circlesOverlap(player.x, player.y, playerRadius + 4, orb.x, orb.y, orb.radius)) {
        this.activatePowerUp(orb.powerUpId);
        collectedPowerUps.push(orb.powerUpId);
        this.powerUpOrbs.splice(i, 1);
      } else if (orb.x < -40) {
        this.powerUpOrbs.splice(i, 1);
      }
    }

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const item = this.collectibles[i];
      item.x -= scrollSpeed * dt;
      item.phase += dt * 4.5;

      // Smooth magnet attraction for collectibles only
      if (player && fx.magnetRemaining > 0) {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1 && dist <= 160) {
          const pull = (320 + (1 - dist / 160) * 180) * dt;
          item.x += (dx / dist) * pull;
          item.y += (dy / dist) * pull;
        }
      }

      if (player && circlesOverlap(player.x, player.y, playerRadius + 4, item.x, item.y, item.radius)) {
        const def = COLLECTIBLE_DEFINITIONS[item.type];
        this.runCoins += def.coinValue * scoreMult;
        this.runGems += def.gemValue;
        bonusScore += def.bonusScore * scoreMult;
        collectedItems.push(item.type);
        this.collectibles.splice(i, 1);
      } else if (item.x < -40) {
        this.collectibles.splice(i, 1);
      }
    }

    return { collectedPowerUps, collectedItems, bonusScore };
  }

  getActiveEffectsStatus() {
    const fx = this.activeEffects;
    const active = [];
    if (fx.hasShield) {
      active.push({ ...POWERUP_DEFINITIONS.shield, remaining: 1, isCharge: true });
    }
    if (fx.hasReviveCharge) {
      active.push({ ...POWERUP_DEFINITIONS.second_chance, remaining: 1, isCharge: true });
    }
    if (fx.scoreBoostRemaining > 0) {
      active.push({ ...POWERUP_DEFINITIONS.score_boost, remaining: fx.scoreBoostRemaining, isCharge: false });
    }
    if (fx.slowMotionRemaining > 0) {
      active.push({ ...POWERUP_DEFINITIONS.slow_motion, remaining: fx.slowMotionRemaining, isCharge: false });
    }
    if (fx.magnetRemaining > 0) {
      active.push({ ...POWERUP_DEFINITIONS.magnet, remaining: fx.magnetRemaining, isCharge: false });
    }
    if (fx.featherRemaining > 0) {
      active.push({ ...POWERUP_DEFINITIONS.feather, remaining: fx.featherRemaining, isCharge: false });
    }
    return active;
  }
}

export const powerUpManager = PowerUpManager.getInstance();
export default PowerUpManager;
