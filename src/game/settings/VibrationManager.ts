export class VibrationManager {
  private enabled = true;

  public isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    );
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private trigger(pattern: number | number[]): void {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported/blocked vibration environments
    }
  }

  public vibrateFlap(): void {
    this.trigger(8);
  }

  public vibrateScore(): void {
    this.trigger(12);
  }

  public vibrateCollision(): void {
    this.trigger(38);
  }

  public vibrateGameOver(): void {
    this.trigger([35, 30, 55]);
  }

  public vibrateCountdown(): void {
    this.trigger(10);
  }

  public vibrateVictory(): void {
    this.trigger([25, 35, 25, 35, 65]);
  }

  public vibrateDraw(): void {
    this.trigger([22, 30, 22]);
  }
}

export const vibrationManager = new VibrationManager();
