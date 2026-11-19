export type InputActionHandler = () => void;

export class Input {
  private targetElement: HTMLElement;
  private onAction: InputActionHandler;
  private isActive: () => boolean;

  private handlePointerDown = (e: PointerEvent) => {
    if (!this.isActive()) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this.onAction();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isActive()) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (!e.repeat) {
        this.onAction();
      }
    }
  };

  constructor(
    targetElement: HTMLElement,
    onAction: InputActionHandler,
    isActive: () => boolean = () => true
  ) {
    this.targetElement = targetElement;
    this.onAction = onAction;
    this.isActive = isActive;

    this.targetElement.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    window.addEventListener('keydown', this.handleKeyDown, { passive: false });
  }

  public destroy(): void {
    this.targetElement.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}
