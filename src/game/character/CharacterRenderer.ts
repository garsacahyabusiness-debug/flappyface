import { GAME_CONFIG } from '../Config';
import {
  CharacterAccessory,
  CharacterDefinition,
  getCharacterById,
} from './CharacterRegistry';
import { getSkinById, SkinId } from './CharacterSkinManager';

export interface BirdDrawParams {
  x: number;
  y: number;
  visualRadius: number;
  rotation: number;
  wingPhase: number;
  flapPulse: number;
  isDead: boolean;
  isBlinking: boolean;
  customFaceImage: HTMLImageElement | null;
  characterId?: string;
  skinId?: SkinId;
  animTime?: number;
  lockedSilhouette?: boolean;
}

/**
 * Renders all 15 original FLAPPY FACE characters, Custom Face avatars,
 * 9 cosmetic skins, and locked silhouettes while preserving exact hitbox geometry.
 */
export class CharacterRenderer {
  public static draw(ctx: CanvasRenderingContext2D, params: BirdDrawParams): void {
    const {
      x,
      y,
      visualRadius: r,
      rotation,
      wingPhase,
      flapPulse,
      isDead,
      isBlinking,
      customFaceImage,
      characterId = 'classic_bird',
      skinId = 'default',
      animTime = 0,
      lockedSilhouette = false,
    } = params;

    const outline = GAME_CONFIG.colors.darkOutline;
    const charDef = getCharacterById(characterId);
    const skin = getSkinById(skinId);
    const hasCustomFace =
      !lockedSilhouette &&
      customFaceImage !== null &&
      customFaceImage.complete &&
      customFaceImage.naturalWidth > 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (lockedSilhouette) {
      this.drawLockedSilhouette(ctx, r, charDef, wingPhase);
      ctx.restore();
      return;
    }

    // Subtle squash & stretch on flap
    const stretch = 1 + flapPulse * 0.11;
    const squash = 1 - flapPulse * 0.08;
    ctx.scale(squash, stretch);

    if (charDef.visual.translucent) {
      ctx.globalAlpha = 0.88;
    }

    // 0. Skin / Rarity Aura Glow behind body
    const activeGlow = skin.glowColor ?? charDef.visual.auraColor;
    if (activeGlow) {
      const pulse = 1 + Math.sin(animTime * 4) * 0.08;
      ctx.save();
      const auraGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.48 * pulse);
      auraGrad.addColorStop(0, activeGlow);
      auraGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.48 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 1. Ground-relative drop shadow
    ctx.save();
    ctx.translate(2, 4.5);
    ctx.fillStyle = 'rgba(36, 65, 92, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 1b. Tail feathers / Ghost tail
    this.drawTail(ctx, r, charDef, outline, hasCustomFace, animTime);

    // 1c. Top head crest / back accessory
    if (!hasCustomFace) {
      this.drawTopCrest(ctx, r, charDef, outline);
    }

    // 2. Main circular body
    if (hasCustomFace) {
      const bodyGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.35, r * 0.15, 0, 0, r);
      bodyGrad.addColorStop(0, '#FFF199');
      bodyGrad.addColorStop(0.55, '#FFD84D');
      bodyGrad.addColorStop(1, '#F2A322');
      ctx.fillStyle = bodyGrad;
    } else {
      const bodyGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.35, r * 0.15, 0, 0, r);
      bodyGrad.addColorStop(0, charDef.visual.bodyTop);
      bodyGrad.addColorStop(0.55, charDef.visual.bodyMid);
      bodyGrad.addColorStop(1, charDef.visual.bodyBottom);
      ctx.fillStyle = bodyGrad;
    }

    ctx.strokeStyle = skin.rimColor ?? outline;
    ctx.lineWidth = skin.rimColor ? 3.5 : 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3. Face Image OR Original Character Artwork
    if (hasCustomFace && customFaceImage) {
      const faceRadius = r * 0.87;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, faceRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        customFaceImage,
        -faceRadius,
        -faceRadius,
        faceRadius * 2,
        faceRadius * 2
      );

      if (skin.tintOverlay) {
        ctx.fillStyle = skin.tintOverlay;
        ctx.fillRect(-faceRadius, -faceRadius, faceRadius * 2, faceRadius * 2);
      }

      if (isDead) {
        ctx.fillStyle = 'rgba(255, 92, 92, 0.24)';
        ctx.fillRect(-faceRadius, -faceRadius, faceRadius * 2, faceRadius * 2);
      }
      ctx.restore();

      // Face rim
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, faceRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = skin.rimColor ?? '#FFD84D';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = outline;
      ctx.stroke();
      ctx.restore();
    } else {
      this.drawCharacterFaceDetails(ctx, r, charDef, outline, isDead, isBlinking, animTime);
      if (skin.tintOverlay) {
        ctx.save();
        ctx.fillStyle = skin.tintOverlay;
        ctx.beginPath();
        ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Rainbow skin rotating rim shimmer
    if (skin.id === 'rainbow') {
      ctx.save();
      const hue = (animTime * 160) % 360;
      ctx.strokeStyle = `hsl(${hue}, 92%, 60%)`;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Retro pixel skin subtle pixel-grid sheen
    if (skin.id === 'retro_pixel') {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(-r * 0.45, -r * 0.55, 5, 5);
      ctx.fillRect(-r * 0.22, -r * 0.68, 4, 4);
      ctx.restore();
    }

    // 5. Wing
    this.drawWing(ctx, r, charDef, wingPhase, outline, hasCustomFace);

    // 6. Beak
    this.drawBeak(ctx, r, charDef, outline, hasCustomFace);

    // 7. Character Unique Accessories (skip heavy face-covering ones when Custom Face is active)
    if (!hasCustomFace) {
      this.drawCharacterAccessory(ctx, r, charDef.visual.accessory, outline, animTime);
    }

    // 8. Compatible Skin Overlay Accessory (works on BOTH Game Characters & Custom Face!)
    this.drawSkinAccessory(ctx, r, skin.accessoryOverlay, outline, animTime);

    // 9. Custom face gloss / dizzy star
    if (hasCustomFace) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.84, -Math.PI * 0.78, -Math.PI * 0.32);
      ctx.stroke();
      ctx.restore();

      if (isDead) {
        ctx.save();
        ctx.translate(r * 0.68, -r * 0.72);
        ctx.fillStyle = '#FF6B6B';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-3, -3);
        ctx.lineTo(3, 3);
        ctx.moveTo(3, -3);
        ctx.lineTo(-3, 3);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  private static drawLockedSilhouette(
    ctx: CanvasRenderingContext2D,
    r: number,
    charDef: CharacterDefinition,
    wingPhase: number
  ): void {
    ctx.save();
    ctx.fillStyle = '#64748B';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.6;

    // Tail silhouette
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, -r * 0.18);
    ctx.lineTo(-r * 1.2, -r * 0.32);
    ctx.lineTo(-r * 1.04, 0);
    ctx.lineTo(-r * 1.2, r * 0.22);
    ctx.lineTo(-r * 0.78, r * 0.2);
    ctx.closePath();
    ctx.fill();

    // Body silhouette
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Beak silhouette
    ctx.beginPath();
    ctx.moveTo(r * 0.82, -r * 0.14);
    ctx.lineTo(r * 1.28, r * 0.08);
    ctx.lineTo(r * 0.82, r * 0.26);
    ctx.closePath();
    ctx.fill();

    // Subtle crest hint for crown/horns
    if (
      charDef.visual.accessory === 'royal_crown' ||
      charDef.visual.accessory === 'gold_crown_small' ||
      charDef.visual.accessory === 'legend_laurel'
    ) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.32, -r * 0.92);
      ctx.lineTo(-r * 0.18, -r * 1.28);
      ctx.lineTo(0, -r * 1.05);
      ctx.lineTo(r * 0.18, -r * 1.28);
      ctx.lineTo(r * 0.32, -r * 0.92);
      ctx.closePath();
      ctx.fill();
    } else if (
      charDef.visual.accessory === 'dragon_horns' ||
      charDef.visual.accessory === 'demon_horns'
    ) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.28, -r * 0.86);
      ctx.lineTo(-r * 0.5, -r * 1.32);
      ctx.lineTo(-r * 0.05, -r * 0.95);
      ctx.closePath();
      ctx.fill();
    }

    // Wing silhouette
    const wingLift = Math.sin(wingPhase) * r * 0.14;
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.ellipse(-r * 0.24, r * 0.14 + wingLift * 0.2, r * 0.36, r * 0.22, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static drawTail(
    ctx: CanvasRenderingContext2D,
    r: number,
    charDef: CharacterDefinition,
    outline: string,
    hasCustomFace: boolean,
    animTime: number
  ): void {
    ctx.save();
    ctx.fillStyle = hasCustomFace ? '#F5B82E' : charDef.visual.tailColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';

    if (!hasCustomFace && charDef.visual.accessory === 'ghost_tail') {
      const wave = Math.sin(animTime * 6) * 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.72, -r * 0.28);
      ctx.quadraticCurveTo(-r * 1.38, -r * 0.1 + wave, -r * 1.22, r * 0.18);
      ctx.quadraticCurveTo(-r * 1.05, r * 0.34 - wave, -r * 0.72, r * 0.26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (!hasCustomFace && charDef.visual.accessory === 'ninja_band') {
      // Flowing red ninja headband ribbons
      const flutter = Math.sin(animTime * 8) * 3.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, -r * 0.35);
      ctx.quadraticCurveTo(-r * 1.35, -r * 0.52 + flutter, -r * 1.5, -r * 0.28 + flutter);
      ctx.lineTo(-r * 0.85, -r * 0.16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, -r * 0.18);
      ctx.lineTo(-r * 1.24, -r * 0.36);
      ctx.lineTo(-r * 1.06, 0);
      ctx.lineTo(-r * 1.25, r * 0.24);
      ctx.lineTo(-r * 0.78, r * 0.22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private static drawTopCrest(
    ctx: CanvasRenderingContext2D,
    r: number,
    charDef: CharacterDefinition,
    outline: string
  ): void {
    const acc = charDef.visual.accessory;
    if (
      acc === 'space_helmet' ||
      acc === 'royal_crown' ||
      acc === 'gold_crown_small' ||
      acc === 'panda_ears' ||
      acc === 'dragon_horns' ||
      acc === 'demon_horns'
    ) {
      return;
    }

    ctx.save();
    ctx.fillStyle = charDef.visual.bodyMid;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (acc === 'egg_tuft') {
      ctx.moveTo(-r * 0.2, -r * 0.92);
      ctx.lineTo(-r * 0.08, -r * 1.32);
      ctx.lineTo(r * 0.06, -r * 1.12);
      ctx.lineTo(r * 0.2, -r * 1.26);
      ctx.lineTo(r * 0.22, -r * 0.9);
    } else {
      ctx.moveTo(-r * 0.18, -r * 0.9);
      ctx.quadraticCurveTo(-r * 0.04, -r * 1.32, r * 0.2, -r * 1.08);
      ctx.quadraticCurveTo(r * 0.08, -r * 0.96, r * 0.15, -r * 0.88);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private static drawCharacterFaceDetails(
    ctx: CanvasRenderingContext2D,
    r: number,
    charDef: CharacterDefinition,
    outline: string,
    isDead: boolean,
    isBlinking: boolean,
    animTime: number
  ): void {
    // Belly patch
    ctx.fillStyle = charDef.visual.bellyColor;
    ctx.beginPath();
    ctx.ellipse(r * 0.08, r * 0.48, r * 0.54, r * 0.32, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Gloss highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, -r * 0.46, r * 0.34, r * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Character-specific body markings
    if (charDef.id === 'panda_fly') {
      // Dark eye patch
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(r * 0.3, -r * 0.18, r * 0.42, r * 0.38, 0.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (charDef.id === 'toxic_bird') {
      ctx.fillStyle = 'rgba(217, 255, 128, 0.72)';
      ctx.beginPath();
      ctx.arc(-r * 0.34, r * 0.06, r * 0.14, 0, Math.PI * 2);
      ctx.arc(-r * 0.16, r * 0.3, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else if (charDef.id === 'galaxy_bird') {
      ctx.fillStyle = '#FDE047';
      const tw = 0.65 + Math.sin(animTime * 5) * 0.35;
      ctx.globalAlpha = tw;
      ctx.beginPath();
      ctx.arc(-r * 0.34, -r * 0.14, 2.2, 0, Math.PI * 2);
      ctx.arc(-r * 0.18, r * 0.22, 1.8, 0, Math.PI * 2);
      ctx.arc(-r * 0.48, r * 0.28, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Cheek blush
    ctx.fillStyle = charDef.visual.cheekColor;
    ctx.beginPath();
    ctx.ellipse(r * 0.22, r * 0.24, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Expressive Eye
    this.drawDefaultEye(
      ctx,
      r * 0.32,
      -r * 0.2,
      r * 0.34,
      outline,
      isDead,
      isBlinking,
      charDef.visual.eyeAccent
    );
  }

  private static drawWing(
    ctx: CanvasRenderingContext2D,
    r: number,
    charDef: CharacterDefinition,
    wingPhase: number,
    outline: string,
    hasCustomFace: boolean
  ): void {
    const wingLift = Math.sin(wingPhase) * r * 0.24;
    const wingRot = Math.sin(wingPhase) * 0.54;
    ctx.save();
    ctx.translate(hasCustomFace ? -r * 0.56 : -r * 0.26, hasCustomFace ? r * 0.34 : r * 0.12);
    ctx.rotate(wingRot);

    const wingGrad = ctx.createLinearGradient(0, -10, 0, 14);
    wingGrad.addColorStop(0, hasCustomFace ? '#FFFFFF' : charDef.visual.wingTop);
    wingGrad.addColorStop(1, hasCustomFace ? '#FFEFA6' : charDef.visual.wingBottom);
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;

    if (!hasCustomFace && charDef.visual.accessory === 'demon_horns') {
      // Bat-like spiky wing for Demon Bird
      ctx.beginPath();
      ctx.moveTo(r * 0.25, 0);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.38 + wingLift * 0.2, -r * 0.45, -r * 0.1 + wingLift * 0.2);
      ctx.lineTo(-r * 0.32, r * 0.15 + wingLift * 0.2);
      ctx.lineTo(-r * 0.12, r * 0.1 + wingLift * 0.2);
      ctx.lineTo(0, r * 0.24 + wingLift * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, wingLift * 0.22, r * 0.39, r * 0.24, -0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  private static drawBeak(
    ctx: CanvasRenderingContext2D,
    r: number,
    charDef: CharacterDefinition,
    outline: string,
    hasCustomFace: boolean
  ): void {
    ctx.save();
    ctx.translate(r * 0.84, r * 0.08);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';

    ctx.fillStyle = hasCustomFace ? '#FF9429' : charDef.visual.beakTop;
    ctx.beginPath();
    ctx.moveTo(-4, -r * 0.22);
    ctx.quadraticCurveTo(r * 0.48, -r * 0.14, r * 0.48, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hasCustomFace ? '#EB681B' : charDef.visual.beakBottom;
    ctx.beginPath();
    ctx.moveTo(-4, 3);
    ctx.lineTo(r * 0.34, 3);
    ctx.quadraticCurveTo(r * 0.24, r * 0.24, -4, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private static drawCharacterAccessory(
    ctx: CanvasRenderingContext2D,
    r: number,
    accessory: CharacterAccessory,
    outline: string,
    animTime: number
  ): void {
    switch (accessory) {
      case 'pink_bow': {
        ctx.save();
        ctx.translate(-r * 0.25, -r * 0.88);
        ctx.rotate(-0.2);
        ctx.fillStyle = '#FF4D8D';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(-6, 0, 6, 4.5, -0.3, 0, Math.PI * 2);
        ctx.ellipse(6, 0, 6, 4.5, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFD6EA';
        ctx.beginPath();
        ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'panda_ears': {
        ctx.save();
        ctx.fillStyle = '#1E293B';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(-r * 0.56, -r * 0.78, r * 0.26, 0, Math.PI * 2);
        ctx.arc(r * 0.34, -r * 0.84, r * 0.24, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'space_helmet': {
        ctx.save();
        // Translucent bubble dome
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 2.5;
        ctx.fillStyle = 'rgba(186, 230, 253, 0.22)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Helmet arc glint
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.02, -Math.PI * 0.8, -Math.PI * 0.35);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'ninja_band': {
        ctx.save();
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.roundRect(-r * 0.92, -r * 0.54, r * 1.72, r * 0.26, 4);
        ctx.fill();
        ctx.stroke();
        // Metal plate
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.roundRect(r * 0.1, -r * 0.52, r * 0.42, r * 0.22, 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'gold_crown_small':
      case 'royal_crown': {
        const isRoyal = accessory === 'royal_crown';
        const cw = isRoyal ? r * 0.78 : r * 0.56;
        const ch = isRoyal ? r * 0.48 : r * 0.36;
        ctx.save();
        ctx.translate(0, -r * 0.88);
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-cw * 0.5, 0);
        ctx.lineTo(-cw * 0.62, -ch);
        ctx.lineTo(-cw * 0.22, -ch * 0.45);
        ctx.lineTo(0, -ch * 1.12);
        ctx.lineTo(cw * 0.22, -ch * 0.45);
        ctx.lineTo(cw * 0.62, -ch);
        ctx.lineTo(cw * 0.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (isRoyal) {
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(0, -ch * 0.36, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }
      case 'cyber_visor': {
        ctx.save();
        ctx.fillStyle = 'rgba(34, 211, 238, 0.86)';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-r * 0.05, -r * 0.38, r * 0.92, r * 0.34, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(r * 0.1, -r * 0.31, r * 0.36, 2.5);
        ctx.restore();
        break;
      }
      case 'dragon_horns':
      case 'demon_horns': {
        const isDemon = accessory === 'demon_horns';
        ctx.save();
        ctx.fillStyle = isDemon ? '#18181B' : '#FDE047';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2.3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-r * 0.35, -r * 0.82);
        ctx.quadraticCurveTo(-r * 0.55, -r * 1.38, -r * 0.14, -r * 1.34);
        ctx.quadraticCurveTo(-r * 0.18, -r * 1.05, -r * 0.05, -r * 0.88);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(r * 0.08, -r * 0.88);
        ctx.quadraticCurveTo(r * 0.18, -r * 1.36, r * 0.44, -r * 1.24);
        ctx.quadraticCurveTo(r * 0.32, -r * 1.0, r * 0.36, -r * 0.82);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'galaxy_ring': {
        ctx.save();
        ctx.rotate(-0.35 + Math.sin(animTime * 2) * 0.08);
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.85)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.44, r * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#FDE047';
        const sx = Math.cos(animTime * 3.5) * r * 1.44;
        const sy = Math.sin(animTime * 3.5) * r * 0.4;
        ctx.beginPath();
        ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'legend_laurel': {
        ctx.save();
        ctx.translate(0, -r * 0.96);
        ctx.fillStyle = '#FDE047';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4ADE80';
        ctx.beginPath();
        ctx.ellipse(-9, 2, 6, 3, -0.5, 0, Math.PI * 2);
        ctx.ellipse(9, 2, 6, 3, 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'slime_bubbles': {
        ctx.save();
        ctx.fillStyle = '#A3FF12';
        ctx.strokeStyle = outline;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(-r * 0.4, -r * 1.1, 3.2, 0, Math.PI * 2);
        ctx.arc(r * 0.35, -r * 1.18, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        break;
      }
      default:
        break;
    }
  }

  private static drawSkinAccessory(
    ctx: CanvasRenderingContext2D,
    r: number,
    overlay: ReturnType<typeof getSkinById>['accessoryOverlay'],
    outline: string,
    animTime: number
  ): void {
    if (overlay === 'santa_hat') {
      ctx.save();
      ctx.translate(-r * 0.04, -r * 0.86);
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0);
      ctx.quadraticCurveTo(-r * 0.1, -r * 0.72, r * 0.38, -r * 0.44);
      ctx.lineTo(r * 0.42, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // White brim + pompom
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(-r * 0.5, -3, r * 0.96, 7, 3.5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.4, -r * 0.44, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (overlay === 'witch_hat') {
      ctx.save();
      ctx.translate(0, -r * 0.86);
      ctx.fillStyle = '#3B0764';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, 0);
      ctx.lineTo(-r * 0.05, -r * 0.74);
      ctx.lineTo(r * 0.38, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#F97316';
      ctx.fillRect(-r * 0.34, -5, r * 0.65, 4);
      ctx.fillStyle = '#3B0764';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.65, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (overlay === 'pixel_visor') {
      ctx.save();
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(r * 0.06, -r * 0.34, r * 0.54, 4);
      ctx.fillRect(r * 0.12, -r * 0.24, r * 0.42, 3);
      ctx.restore();
    } else if (overlay === 'halo_star') {
      ctx.save();
      const floatY = -r * 1.24 + Math.sin(animTime * 4) * 2;
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, floatY, r * 0.46, r * 0.15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private static drawDefaultEye(
    ctx: CanvasRenderingContext2D,
    ex: number,
    ey: number,
    eyeR: number,
    outline: string,
    isDead: boolean,
    isBlinking: boolean,
    eyeAccent?: string
  ): void {
    ctx.save();
    ctx.translate(ex, ey);

    if (isDead) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const s = eyeR * 0.52;
      ctx.beginPath();
      ctx.moveTo(-s, -s);
      ctx.lineTo(s, s);
      ctx.moveTo(s, -s);
      ctx.lineTo(-s, s);
      ctx.stroke();
    } else if (isBlinking) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 2, eyeR * 0.65, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = eyeAccent ?? outline;
      ctx.beginPath();
      ctx.arc(eyeR * 0.22, 0, eyeR * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(eyeR * 0.36, -eyeR * 0.24, eyeR * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
