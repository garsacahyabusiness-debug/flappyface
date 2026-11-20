import { getCharacterById } from './character/CharacterRegistry';
import { CharacterRenderer } from './character/CharacterRenderer';
import { getSkinById, SkinId } from './character/CharacterSkinManager';
import { GAME_CONFIG } from './Config';
import { ParticleKind } from './ParticleSystem';

export class Player {
  public x: number;
  public y: number;
  public vy: number;
  public rotation: number;
  public wingPhase: number;
  public flapPulse: number;
  public isDead: boolean;
  public readonly visualRadius: number;
  public readonly collisionRadius: number;

  private blinkTimer: number;
  private isBlinking: boolean;
  private animTime = 0;
  private customFaceImage: HTMLImageElement | null = null;
  private characterId = 'classic_bird';
  private skinId: SkinId = 'default';

  constructor() {
    this.visualRadius = GAME_CONFIG.player.visualRadius;
    this.collisionRadius = GAME_CONFIG.player.collisionRadius;
    this.x = GAME_CONFIG.player.startX;
    this.y = GAME_CONFIG.player.startY;
    this.vy = 0;
    this.rotation = 0;
    this.wingPhase = 0;
    this.flapPulse = 0;
    this.isDead = false;
    this.blinkTimer = 2.2;
    this.isBlinking = false;
  }

  public setCustomFaceImage(image: HTMLImageElement | null): void {
    this.customFaceImage = image;
  }

  public setCharacterVisual(characterId: string, skinId: SkinId = 'default'): void {
    this.characterId = characterId;
    this.skinId = skinId;
  }

  public getTrailStyle(): { colors: readonly string[]; kind: ParticleKind } {
    const skin = getSkinById(this.skinId);
    const charDef = getCharacterById(this.characterId);
    const colors = skin.trailColors ?? charDef.visual.trailColors;
    const kind: ParticleKind =
      skin.particleKind !== 'default' ? skin.particleKind : 'feather';
    return { colors, kind };
  }

  public reset(): void {
    this.x = GAME_CONFIG.player.startX;
    this.y = GAME_CONFIG.player.startY;
    this.vy = 0;
    this.rotation = 0;
    this.wingPhase = 0;
    this.flapPulse = 0;
    this.isDead = false;
    this.blinkTimer = 2.2;
    this.isBlinking = false;
  }

  public onFlap(): void {
    this.flapPulse = 1;
    this.wingPhase = 0.25;
  }

  public updateIdle(elapsedSec: number, dt: number): void {
    const { startY, idleAmplitude, idleFrequency } = GAME_CONFIG.player;
    this.animTime += dt;
    this.y = startY + Math.sin(elapsedSec * idleFrequency) * idleAmplitude;
    this.rotation = Math.sin(elapsedSec * 2.1) * 0.06;
    this.wingPhase += dt * 9.5;
    this.flapPulse = Math.max(0, this.flapPulse - dt * 4);
    this.updateBlink(dt);
  }

  public updateFlyingAnimation(dt: number): void {
    this.animTime += dt;
    const wingSpeed = this.vy < 110 ? 18 : 7.5;
    this.wingPhase += dt * wingSpeed;
    this.flapPulse = Math.max(0, this.flapPulse - dt * 5.2);
    this.updateBlink(dt);
  }

  public updateDeathFall(dt: number, groundY: number): void {
    const maxY = groundY - this.collisionRadius;
    if (this.y < maxY) {
      this.vy = Math.min(760, this.vy + GAME_CONFIG.physics.gravity * 1.1 * dt);
      this.y = Math.min(maxY, this.y + this.vy * dt);
      this.rotation = Math.min(Math.PI * 0.48, this.rotation + 6.5 * dt);
    }
  }

  private updateBlink(dt: number): void {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      if (this.isBlinking) {
        this.isBlinking = false;
        this.blinkTimer = 2.0 + Math.random() * 2.4;
      } else {
        this.isBlinking = true;
        this.blinkTimer = 0.13;
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    CharacterRenderer.draw(ctx, {
      x: this.x,
      y: this.y,
      visualRadius: this.visualRadius,
      rotation: this.rotation,
      wingPhase: this.wingPhase,
      flapPulse: this.flapPulse,
      isDead: this.isDead,
      isBlinking: this.isBlinking,
      customFaceImage: this.customFaceImage,
      characterId: this.characterId,
      skinId: this.skinId,
      animTime: this.animTime,
    });
  }

  public drawLocked(ctx: CanvasRenderingContext2D): void {
    CharacterRenderer.draw(ctx, {
      x: this.x,
      y: this.y,
      visualRadius: this.visualRadius,
      rotation: this.rotation,
      wingPhase: this.wingPhase,
      flapPulse: 0,
      isDead: false,
      isBlinking: false,
      customFaceImage: null,
      characterId: this.characterId,
      skinId: 'default',
      animTime: this.animTime,
      lockedSilhouette: true,
    });
  }
}
