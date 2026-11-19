import React, { useEffect, useRef } from 'react';
import { Player } from '../game/Player';

interface CharacterShowcaseCanvasProps {
  customFaceImg?: HTMLImageElement | null;
  size?: number;
}

export const CharacterShowcaseCanvas: React.FC<CharacterShowcaseCanvasProps> = ({
  customFaceImg = null,
  size = 172,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<Player>(new Player());

  useEffect(() => {
    playerRef.current.setCustomFaceImage(customFaceImg ?? null);
  }, [customFaceImg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const player = playerRef.current;
    player.x = size * 0.48;
    player.y = size * 0.46;

    const drawScene = (elapsed: number, bob: number, drawSparkles: boolean) => {
      ctx.clearRect(0, 0, size, size);

      // Soft ground shadow beneath floating character
      const shadowScale = 1 - (bob / 8) * 0.14;
      ctx.save();
      ctx.translate(size * 0.48, size * 0.8);
      ctx.scale(shadowScale, shadowScale * 0.36);
      ctx.fillStyle = 'rgba(36, 65, 92, 0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Scale character proportionally to canvas size
      const scaleFactor = (size / 176) * 1.72;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.scale(scaleFactor, scaleFactor);
      ctx.translate(-player.x, -player.y);
      player.draw(ctx);
      ctx.restore();

      if (!drawSparkles) return;

      const sparkles = [
        { x: size * 0.18, y: size * 0.25, phase: 0 },
        { x: size * 0.84, y: size * 0.22, phase: 1.8 },
        { x: size * 0.78, y: size * 0.68, phase: 3.4 },
      ];
      for (const s of sparkles) {
        const pulse = 0.45 + 0.55 * Math.sin(elapsed * 3.2 + s.phase);
        ctx.save();
        ctx.translate(s.x, s.y + Math.sin(elapsed * 2 + s.phase) * 3);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = '#FFE885';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const rad = i % 2 === 0 ? 7 : 2.5;
          const a = (i * Math.PI) / 4;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    };

    const motionQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    let rafId = 0;
    let last = performance.now();
    let elapsed = 0;

    const startOrRenderStatic = () => {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
      if (motionQuery?.matches) {
        player.y = size * 0.46;
        player.rotation = -0.05;
        player.wingPhase = 0.6;
        drawScene(0, 0, false);
        return;
      }

      last = performance.now();
      const loop = (now: number) => {
        if (typeof document !== 'undefined' && document.hidden) {
          last = now;
          rafId = window.requestAnimationFrame(loop);
          return;
        }
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        elapsed += dt;

        const bob = Math.sin(elapsed * 3.1) * 8;
        player.y = size * 0.46 + bob;
        player.rotation = Math.sin(elapsed * 2.2) * 0.09;
        player.updateFlyingAnimation(dt);

        drawScene(elapsed, bob, true);
        rafId = window.requestAnimationFrame(loop);
      };

      rafId = window.requestAnimationFrame(loop);
    };

    startOrRenderStatic();
    motionQuery?.addEventListener?.('change', startOrRenderStatic);

    return () => {
      window.cancelAnimationFrame(rafId);
      motionQuery?.removeEventListener?.('change', startOrRenderStatic);
    };
  }, [size, customFaceImg]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-label="Flappy Face character showcase"
      className="pointer-events-none block max-h-full max-w-full object-contain"
    />
  );
};
