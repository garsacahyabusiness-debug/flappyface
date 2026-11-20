import React, { useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
import { GAME_CONFIG } from '../game/Config';
import { Ground } from '../game/Ground';
import { Pipe } from '../game/Pipe';
import { EnvironmentRenderer } from '../game/worlds/EnvironmentRenderer';
import { getWorldById, WeatherType, WorldId } from '../game/worlds/WorldRegistry';

interface WorldPreviewProps {
  worldId: WorldId;
  weather?: WeatherType | null;
  dynamicSky?: boolean;
  showSamplePipe?: boolean;
  locked?: boolean;
  animate?: boolean;
  className?: string;
}

export const WorldPreview: React.FC<WorldPreviewProps> = ({
  worldId,
  weather,
  dynamicSky = false,
  showSamplePipe = true,
  locked = false,
  animate = true,
  className = 'h-40 w-full',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = getWorldById(worldId);
    const env = new EnvironmentRenderer();
    env.setWorld(worldId);
    env.setWeather(weather === undefined ? world.defaultWeather : weather);
    env.setDynamicSkyEnabled(dynamicSky);
    env.setParallaxEnabled(animate);
    env.setParticleLevel(animate ? 'medium' : 'low');

    const ground = new Ground();
    ground.setWorldTheme(worldId);

    const pipe = new Pipe(GAME_CONFIG.worldWidth * 0.62, 330, 174, 'green', world.pipeSkin);
    const groundY = GAME_CONFIG.worldHeight - GAME_CONFIG.groundHeight;

    const renderFrame = (dt: number) => {
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(120, Math.round(rect.width || 280));
      const cssH = Math.max(80, Math.round(rect.height || 160));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      if (dt > 0) {
        env.update(dt, 0.45, dynamicSky);
        ground.update(dt, 0.45);
      }

      ctx.save();
      // Crop nicely on middle playable sky + ground horizon so preview feels vibrant
      const scaleX = canvas.width / GAME_CONFIG.worldWidth;
      const scaleY = canvas.height / GAME_CONFIG.worldHeight;
      ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);

      env.drawBackgroundLayers(ctx);
      env.drawWeatherOverlay(ctx);
      if (showSamplePipe) {
        pipe.draw(ctx, groundY);
      }
      ground.draw(ctx);
      ctx.restore();
    };

    renderFrame(0);
    if (!animate) return;

    let rafId = 0;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastTs) / 1000));
      lastTs = now;
      renderFrame(dt);
      rafId = window.requestAnimationFrame(tick);
    };
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [worldId, weather, dynamicSky, showSamplePipe, animate]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 border-[#24415C] ${className}`}>
      <canvas
        ref={canvasRef}
        className={`block h-full w-full ${locked ? 'brightness-75 saturate-75' : ''}`}
      />
      {locked && (
        <div className="pointer-events-none absolute top-2 right-2 flex items-center gap-1 rounded-full border-2 border-[#24415C] bg-slate-900/80 px-2 py-0.5 text-[10px] font-black text-white">
          <Lock className="h-3 w-3 text-[#FFD84D]" />
          <span>LOCKED</span>
        </div>
      )}
    </div>
  );
};
