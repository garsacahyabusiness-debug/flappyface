import { GAME_CONFIG, PipeTheme } from './Config';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PipePalette {
  light: string;
  highlight: string;
  main: string;
  dark: string;
  rim: string;
}

const PIPE_PALETTES: Record<PipeTheme, PipePalette> = {
  green: {
    light: '#82EB89',
    highlight: '#C2FBC4',
    main: '#61D66B',
    dark: '#32B85C',
    rim: '#238F44',
  },
  mint: {
    light: '#72EDD0',
    highlight: '#C1FFF0',
    main: '#3AD4B0',
    dark: '#1EA385',
    rim: '#157D65',
  },
  blue: {
    light: '#78C9FF',
    highlight: '#C2E6FF',
    main: '#3998F7',
    dark: '#2172CC',
    rim: '#17549C',
  },
  purple: {
    light: '#B99BFF',
    highlight: '#E2D3FF',
    main: '#8A63F2',
    dark: '#623CC9',
    rim: '#48289E',
  },
};

let nextPipeId = 1;

export class Pipe {
  public readonly id: number;
  public x: number;
  public readonly width: number;
  public readonly gapY: number;
  public readonly gapHeight: number;
  public readonly theme: PipeTheme;
  public passed: boolean;

  constructor(
    x: number,
    gapY: number,
    gapHeight: number = GAME_CONFIG.pipes.gap,
    theme: PipeTheme = 'green'
  ) {
    this.id = nextPipeId++;
    this.x = x;
    this.width = GAME_CONFIG.pipes.width;
    this.gapY = gapY;
    this.gapHeight = gapHeight;
    this.theme = theme;
    this.passed = false;
  }

  public update(dt: number, speed: number): void {
    this.x -= speed * dt;
  }

  public isOffScreen(): boolean {
    return this.x + this.width + GAME_CONFIG.pipes.capOverhang < -10;
  }

  public getCollisionRects(groundY: number): Rect[] {
    const { capHeight, capOverhang } = GAME_CONFIG.pipes;
    const topBottom = this.gapY - this.gapHeight / 2;
    const bottomTop = this.gapY + this.gapHeight / 2;

    return [
      { x: this.x, y: -60, width: this.width, height: topBottom + 60 },
      {
        x: this.x - capOverhang,
        y: topBottom - capHeight,
        width: this.width + capOverhang * 2,
        height: capHeight,
      },
      { x: this.x, y: bottomTop, width: this.width, height: Math.max(0, groundY - bottomTop) },
      {
        x: this.x - capOverhang,
        y: bottomTop,
        width: this.width + capOverhang * 2,
        height: capHeight,
      },
    ];
  }

  public draw(ctx: CanvasRenderingContext2D, groundY: number): void {
    const topBottom = this.gapY - this.gapHeight / 2;
    const bottomTop = this.gapY + this.gapHeight / 2;

    if (topBottom > 0) {
      this.drawSegment(ctx, -8, topBottom + 8, 'top');
    }

    const bottomH = groundY - bottomTop;
    if (bottomH > 0) {
      this.drawSegment(ctx, bottomTop, bottomH + 4, 'bottom');
    }
  }

  private drawSegment(
    ctx: CanvasRenderingContext2D,
    y: number,
    height: number,
    side: 'top' | 'bottom'
  ): void {
    const { capHeight, capOverhang } = GAME_CONFIG.pipes;
    const { darkOutline } = GAME_CONFIG.colors;
    const palette = PIPE_PALETTES[this.theme];
    const capW = this.width + capOverhang * 2;
    const capX = this.x - capOverhang;
    const capY = side === 'top' ? y + height - capHeight : y;

    ctx.save();

    // Soft drop shadow
    ctx.fillStyle = 'rgba(36, 65, 92, 0.16)';
    ctx.beginPath();
    ctx.roundRect(this.x + 6, y, this.width, height, 6);
    ctx.fill();

    // Pipe body gradient
    const shaftGrad = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
    shaftGrad.addColorStop(0, palette.light);
    shaftGrad.addColorStop(0.22, palette.highlight);
    shaftGrad.addColorStop(0.55, palette.main);
    shaftGrad.addColorStop(0.88, palette.dark);
    shaftGrad.addColorStop(1, palette.rim);

    ctx.fillStyle = shaftGrad;
    ctx.strokeStyle = darkOutline;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.rect(this.x, y, this.width, height);
    ctx.fill();
    ctx.stroke();

    // Vertical glossy specular stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.fillRect(this.x + 9, y, 7, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.x + 19, y, 3, height);

    // Pipe cap with rounded corners & 3D shading
    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, palette.light);
    capGrad.addColorStop(0.22, palette.highlight);
    capGrad.addColorStop(0.55, palette.main);
    capGrad.addColorStop(0.9, palette.dark);
    capGrad.addColorStop(1, palette.rim);

    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capHeight, 9);
    ctx.fill();
    ctx.stroke();

    // Inner lip bevel & highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.roundRect(capX + 10, capY + 4, 10, capHeight - 8, 4);
    ctx.fill();

    // Decorative rivets on pipe cap corners
    ctx.fillStyle = palette.rim;
    ctx.beginPath();
    ctx.arc(capX + capW - 10, capY + capHeight / 2, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // Inner neck shadow beneath cap
    ctx.fillStyle = 'rgba(36, 65, 92, 0.18)';
    if (side === 'bottom') {
      ctx.fillRect(this.x + 2, capY + capHeight + 1.5, this.width - 4, 6);
    } else {
      ctx.fillRect(this.x + 2, capY - 7.5, this.width - 4, 6);
    }

    ctx.restore();
  }
}
