import { GAME_CONFIG } from '../Config';

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
}

/**
 * Renders the complete bird character (both custom face and default cartoon bird)
 * in consistent layer order:
 * 1. Shadow -> 2. Body -> 3. Face Image -> 4. Face Border -> 5. Wing -> 6. Beak -> 7. Decorative elements.
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
    } = params;
    const outline = GAME_CONFIG.colors.darkOutline;
    const hasCustomFace =
      customFaceImage !== null &&
      customFaceImage.complete &&
      customFaceImage.naturalWidth > 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Subtle squash & stretch on flap
    const stretch = 1 + flapPulse * 0.11;
    const squash = 1 - flapPulse * 0.08;
    ctx.scale(squash, stretch);

    // 1. Shadow
    ctx.save();
    ctx.translate(2, 4.5);
    ctx.fillStyle = 'rgba(36, 65, 92, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Tail feathers (part of body silhouette behind main circle)
    ctx.save();
    ctx.fillStyle = '#F5B82E';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.78, -r * 0.18);
    ctx.lineTo(-r * 1.24, -r * 0.36);
    ctx.lineTo(-r * 1.06, 0);
    ctx.lineTo(-r * 1.25, r * 0.24);
    ctx.lineTo(-r * 0.78, r * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Top head crest tuft
    ctx.save();
    ctx.fillStyle = '#FFD84D';
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.18, -r * 0.9);
    ctx.quadraticCurveTo(-r * 0.04, -r * 1.32, r * 0.2, -r * 1.08);
    ctx.quadraticCurveTo(r * 0.08, -r * 0.96, r * 0.15, -r * 0.88);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Body (round bright golden yellow with soft shading)
    const bodyGrad = ctx.createRadialGradient(-r * 0.28, -r * 0.35, r * 0.15, 0, 0, r);
    bodyGrad.addColorStop(0, '#FFF199');
    bodyGrad.addColorStop(0.55, '#FFD84D');
    bodyGrad.addColorStop(1, '#F2A322');

    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (hasCustomFace && customFaceImage) {
      // 3. Face Image (prominent circular mask inside bird body)
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

      if (isDead) {
        ctx.fillStyle = 'rgba(255, 92, 92, 0.24)';
        ctx.fillRect(-faceRadius, -faceRadius, faceRadius * 2, faceRadius * 2);
      }
      ctx.restore();

      // 4. Face Border (cartoon rim + crisp highlight)
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, faceRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#FFD84D';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = outline;
      ctx.stroke();
      ctx.restore();
    } else {
      // Default cartoon bird belly, cheeks & expressive eye
      ctx.fillStyle = '#FFF7C2';
      ctx.beginPath();
      ctx.ellipse(r * 0.08, r * 0.48, r * 0.54, r * 0.32, -0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.22, -r * 0.46, r * 0.34, r * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 118, 128, 0.55)';
      ctx.beginPath();
      ctx.ellipse(r * 0.22, r * 0.24, r * 0.2, r * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();

      this.drawDefaultEye(ctx, r * 0.32, -r * 0.2, r * 0.34, outline, isDead, isBlinking);
    }

    // 5. Wing (animated flapping, shifted slightly lower-back when custom face is active)
    const wingLift = Math.sin(wingPhase) * r * 0.24;
    const wingRot = Math.sin(wingPhase) * 0.54;
    ctx.save();
    ctx.translate(hasCustomFace ? -r * 0.56 : -r * 0.26, hasCustomFace ? r * 0.34 : r * 0.12);
    ctx.rotate(wingRot);

    const wingGrad = ctx.createLinearGradient(0, -10, 0, 14);
    wingGrad.addColorStop(0, '#FFFFFF');
    wingGrad.addColorStop(1, '#FFEFA6');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(0, wingLift * 0.22, r * 0.39, r * 0.24, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 6. Beak (rounded orange triangle on the right front edge)
    ctx.save();
    ctx.translate(r * 0.84, r * 0.08);
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.8;
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#FF9429';
    ctx.beginPath();
    ctx.moveTo(-4, -r * 0.22);
    ctx.quadraticCurveTo(r * 0.48, -r * 0.14, r * 0.48, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EB681B';
    ctx.beginPath();
    ctx.moveTo(-4, 3);
    ctx.lineTo(r * 0.34, 3);
    ctx.quadraticCurveTo(r * 0.24, r * 0.24, -4, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 7. Decorative elements (gloss highlight arc on top rim + dizzy badge on collision for custom face)
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
        // Cute small dizzy star near top-right on crash
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

  private static drawDefaultEye(
    ctx: CanvasRenderingContext2D,
    ex: number,
    ey: number,
    eyeR: number,
    outline: string,
    isDead: boolean,
    isBlinking: boolean
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

      ctx.fillStyle = outline;
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
