import { GAME_CONFIG } from './Config';
import { Player } from './Player';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class Physics {
  public applyFlap(player: Player): void {
    const { flapStrength, maxUpwardVelocity } = GAME_CONFIG.physics;
    player.vy = clamp(flapStrength, maxUpwardVelocity, GAME_CONFIG.physics.maxDownwardVelocity);
    player.onFlap();
  }

  public updatePlayer(player: Player, dt: number): void {
    const {
      gravity,
      flapStrength,
      maxDownwardVelocity,
      maxUpwardVelocity,
      minRotation,
      maxRotation,
      rotationUpSpeed,
      rotationDownSpeed,
    } = GAME_CONFIG.physics;

    // Frame-rate independent velocity integration
    player.vy = clamp(player.vy + gravity * dt, maxUpwardVelocity, maxDownwardVelocity);
    player.y += player.vy * dt;

    // Smooth pitch rotation driven by vertical velocity
    const targetRotation =
      player.vy < 0
        ? clamp((player.vy / Math.abs(flapStrength)) * Math.abs(minRotation), minRotation, 0)
        : clamp((player.vy / maxDownwardVelocity) * maxRotation, 0, maxRotation);

    const rotSpeed = player.vy < 0 ? rotationUpSpeed : rotationDownSpeed;
    player.rotation += (targetRotation - player.rotation) * Math.min(1, dt * rotSpeed);

    player.updateFlyingAnimation(dt);
  }
}
