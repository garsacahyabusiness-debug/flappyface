import { EnvironmentRenderer, GraphicsPreset } from './worlds/EnvironmentRenderer';
import { ParticleLevel } from './worlds/WeatherSystem';
import { WeatherType, WorldId } from './worlds/WorldRegistry';

export type SkyTheme = 'classic' | 'special';

export class Background {
  public readonly environment = new EnvironmentRenderer();

  public setLowDetail(low: boolean): void {
    this.environment.setLowDetail(low);
  }

  public setReducedMotion(reduced: boolean): void {
    this.environment.setReducedMotion(reduced);
  }

  public setSkyTheme(theme: SkyTheme): void {
    this.environment.setSpecialAuroraOverride(theme === 'special');
  }

  public setWorld(worldId: WorldId): void {
    this.environment.setWorld(worldId);
  }

  public isDarkWorld(): boolean {
    return this.environment.getWorld().isDarkWorld;
  }

  public setWeather(weather: WeatherType | null): void {
    this.environment.setWeather(weather);
  }

  public setParallaxEnabled(enabled: boolean): void {
    this.environment.setParallaxEnabled(enabled);
  }

  public setDynamicSkyEnabled(enabled: boolean): void {
    this.environment.setDynamicSkyEnabled(enabled);
  }

  public setEnhancedEnvGlow(enabled: boolean): void {
    this.environment.setEnhancedEnvGlow(enabled);
  }

  public setParticleLevel(level: ParticleLevel): void {
    this.environment.setParticleLevel(level);
  }

  public setGraphicsPreset(preset: GraphicsPreset): void {
    this.environment.setGraphicsPreset(preset);
  }

  public reset(): void {
    this.environment.reset();
  }

  public update(dt: number, speedFactor: number, advanceSkyCycle = true): void {
    this.environment.update(dt, speedFactor, advanceSkyCycle);
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.environment.drawBackgroundLayers(ctx);
  }

  public drawWeatherOverlay(ctx: CanvasRenderingContext2D): void {
    this.environment.drawWeatherOverlay(ctx);
  }
}
