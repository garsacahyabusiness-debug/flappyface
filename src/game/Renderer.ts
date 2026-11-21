import { Background } from './Background';
import { CharacterRenderer } from './character/CharacterRenderer';
import { GhostReplaySample } from './competitive/CompetitiveTypes';
import { GAME_CONFIG, GameState } from './Config';
import { Ground } from './Ground';
import { ParticleSystem } from './ParticleSystem';
import { PipeManager } from './PipeManager';
import { Player } from './Player';
import { PowerUpManager } from './powerups/PowerUpManager';
import { Score } from './Score';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public readonly particles: ParticleSystem;
  private shakeTimer = 0;
  private flashTimer = 0;
  private targetMaxDpr = 2;
  private maxDpr = 2;
  private lowDetail = false;
  private reducedMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D tidak didukung pada browser ini.');
    }
    this.ctx = context;
    this.particles = new ParticleSystem();
    this.resize();
  }

  public setMaxDpr(maxDpr: number): void {
    this.targetMaxDpr = maxDpr;
    this.applyEffectiveDpr();
  }

  public setLowDetail(low: boolean): void {
    if (this.lowDetail === low) return;
    this.lowDetail = low;
    this.particles.setLowDetail(low);
    this.applyEffectiveDpr();
  }

  public setReducedMotion(reduced: boolean): void {
    if (this.reducedMotion === reduced) return;
    this.reducedMotion = reduced;
    this.particles.setReducedMotion(reduced);
    if (reduced) {
      this.shakeTimer = 0;
      this.flashTimer = 0;
    }
  }

  private applyEffectiveDpr(): void {
    const nextDpr = this.lowDetail ? Math.min(this.targetMaxDpr, 1.25) : this.targetMaxDpr;
    if (this.maxDpr === nextDpr) return;
    this.maxDpr = nextDpr;
    this.resize();
  }

  public resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = rect.width || GAME_CONFIG.worldWidth;
    const cssHeight = rect.height || GAME_CONFIG.worldHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.canvas.width = Math.round(cssWidth * dpr);
    this.canvas.height = Math.round(cssHeight * dpr);

    this.ctx.setTransform(
      this.canvas.width / GAME_CONFIG.worldWidth,
      0,
      0,
      this.canvas.height / GAME_CONFIG.worldHeight,
      0,
      0
    );
  }

  public resetEffects(): void {
    this.particles.reset();
    this.shakeTimer = 0;
    this.flashTimer = 0;
  }

  public triggerCollisionEffect(x: number, y: number): void {
    if (!this.reducedMotion) {
      this.shakeTimer = GAME_CONFIG.effects.shakeDuration;
      this.flashTimer = GAME_CONFIG.effects.flashDuration;
    }
    this.particles.spawnCollisionBurst(x, y);
  }

  public updateEffects(dt: number, isMenuAmbient: boolean): void {
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
    }
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }
    if (isMenuAmbient) {
      this.particles.updateAmbientMenuSparkles(dt);
    }
    this.particles.update(dt);
  }

  public render(
    state: GameState,
    background: Background,
    pipes: PipeManager,
    ground: Ground,
    player: Player,
    score: Score,
    elapsedTime: number,
    powerUps?: PowerUpManager,
    ghostSample: GhostReplaySample | null = null
  ): void {
    const ctx = this.ctx;
    const { worldWidth, worldHeight, groundHeight } = GAME_CONFIG;
    const groundY = worldHeight - groundHeight;

    ctx.save();

    if (this.shakeTimer > 0) {
      const progress = this.shakeTimer / GAME_CONFIG.effects.shakeDuration;
      const mag = GAME_CONFIG.effects.shakeIntensity * progress;
      ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
    }

    background.draw(ctx);
    background.drawWeatherOverlay(ctx);

    const showGameplayEntities =
      state === 'PLAYING' ||
      state === 'PAUSED' ||
      state === 'REVIVE_PROMPT' ||
      state === 'GAME_OVER' ||
      state === 'PLAYER_1_PLAYING' ||
      state === 'PLAYER_1_GAME_OVER' ||
      state === 'PLAYER_2_PLAYING' ||
      state === 'PLAYER_2_GAME_OVER';

    if (powerUps && showGameplayEntities) {
      powerUps.drawScreenTint(ctx);
    }

    pipes.draw(ctx, groundY);

    if (powerUps && showGameplayEntities) {
      powerUps.drawWorldItems(ctx, player);
    }

    ground.draw(ctx);

    const showGameplayBird =
      state === 'READY' ||
      state === 'PLAYING' ||
      state === 'PAUSED' ||
      state === 'REVIVE_PROMPT' ||
      state === 'GAME_OVER' ||
      state === 'PLAYER_1_READY' ||
      state === 'PLAYER_1_PLAYING' ||
      state === 'PLAYER_1_GAME_OVER' ||
      state === 'PLAYER_2_READY' ||
      state === 'PLAYER_2_PLAYING' ||
      state === 'PLAYER_2_GAME_OVER';
    if (showGameplayBird) {
      if (ghostSample) {
        ctx.save();
        ctx.globalAlpha = ghostSample.finished ? 0.2 : 0.42;
        CharacterRenderer.draw(ctx, {
          x: ghostSample.x - 10,
          y: ghostSample.y,
          visualRadius: GAME_CONFIG.player.visualRadius,
          rotation: ghostSample.rot,
          wingPhase: elapsedTime * 10,
          flapPulse: 0,
          isDead: false,
          isBlinking: false,
          customFaceImage: null,
          characterId: ghostSample.characterId,
          skinId: ghostSample.skinId,
          animTime: elapsedTime,
        });
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = ghostSample.finished ? 0.35 : 0.82;
        ctx.font = '800 9px Nunito, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const tagX = ghostSample.x - 10;
        const tagY = Math.max(24, ghostSample.y - GAME_CONFIG.player.visualRadius - 12);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.beginPath();
        ctx.roundRect(tagX - 27, tagY - 7, 54, 14, 6);
        ctx.fill();
        ctx.fillStyle = '#BAE6FD';
        ctx.fillText(ghostSample.label, tagX, tagY + 0.5);
        ctx.restore();
      }

      if (background.isDarkWorld()) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.visualRadius + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      player.draw(ctx);
      if (powerUps && showGameplayEntities) {
        powerUps.drawPlayerAuras(ctx, player);
      }
    }

    this.particles.draw(ctx);

    if (
      state === 'PLAYING' ||
      state === 'PAUSED' ||
      state === 'REVIVE_PROMPT' ||
      state === 'PLAYER_1_PLAYING' ||
      state === 'PLAYER_2_PLAYING'
    ) {
      score.draw(ctx);
    } else if (state === 'READY') {
      this.drawReadyPrompt(ctx, elapsedTime);
    }

    if (this.flashTimer > 0) {
      const alpha = (this.flashTimer / GAME_CONFIG.effects.flashDuration) * 0.65;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(-16, -16, worldWidth + 32, worldHeight + 32);
    }

    ctx.restore();
  }

  private drawReadyPrompt(ctx: CanvasRenderingContext2D, elapsedTime: number): void {
    const cx = GAME_CONFIG.worldWidth / 2;
    const bob = Math.sin(elapsedTime * 3.4) * 4;

    ctx.save();
    ctx.translate(cx, 488 + bob);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = GAME_CONFIG.colors.darkOutline;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.roundRect(-126, -34, 252, 68, 20);
    ctx.fill();
    ctx.stroke();

    ctx.font = '700 22px Fredoka, Nunito, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = GAME_CONFIG.colors.darkOutline;
    ctx.fillText('TAP TO START', 0, -8);

    ctx.font = '800 12px Nunito, system-ui, sans-serif';
    ctx.fillStyle = GAME_CONFIG.colors.primaryBlue;
    ctx.fillText('TAP · CLICK · SPACE · ↑', 0, 15);
    ctx.restore();
  }
}
