import { GAME_CONFIG, PipeTheme } from './Config';
import { WorldPipeSkin } from './worlds/WorldRegistry';

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
  outline?: string;
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

const WORLD_PIPE_PALETTES: Record<Exclude<WorldPipeSkin, 'classic_green'>, PipePalette> = {
  candy_cane: {
    light: '#FF9CD0',
    highlight: '#FFF5FA',
    main: '#FF6FB7',
    dark: '#E84A98',
    rim: '#C02678',
    outline: '#4A1D42',
  },
  ice_snow: {
    light: '#C8EDFF',
    highlight: '#FFFFFF',
    main: '#7CD3FC',
    dark: '#38A3DB',
    rim: '#1E74A8',
    outline: '#1E3A5F',
  },
  bamboo: {
    light: '#B5E86D',
    highlight: '#E3FAAD',
    main: '#84CC3D',
    dark: '#579E1E',
    rim: '#3D7311',
    outline: '#24415C',
  },
  lava_stone: {
    light: '#64484B',
    highlight: '#8A6266',
    main: '#422B2E',
    dark: '#28171A',
    rim: '#1A0C0F',
    outline: '#12070A',
  },
  cyber_neon: {
    light: '#334155',
    highlight: '#475569',
    main: '#1E293B',
    dark: '#0F172A',
    rim: '#090F1E',
    outline: '#22D3EE',
  },
  sky_gold: {
    light: '#FFFBEB',
    highlight: '#FFFFFF',
    main: '#F1F5F9',
    dark: '#CBD5E1',
    rim: '#F59E0B',
    outline: '#334155',
  },
  space_metal: {
    light: '#94A3B8',
    highlight: '#E2E8F0',
    main: '#64748B',
    dark: '#334155',
    rim: '#1E293B',
    outline: '#0B1120',
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
  public pipeSkin: WorldPipeSkin;
  public passed: boolean;

  constructor(
    x: number,
    gapY: number,
    gapHeight: number = GAME_CONFIG.pipes.gap,
    theme: PipeTheme = 'green',
    pipeSkin: WorldPipeSkin = 'classic_green'
  ) {
    this.id = nextPipeId++;
    this.x = x;
    this.width = GAME_CONFIG.pipes.width;
    this.gapY = gapY;
    this.gapHeight = gapHeight;
    this.theme = theme;
    this.pipeSkin = pipeSkin;
    this.passed = false;
  }

  public update(dt: number, speed: number): void {
    this.x -= speed * dt;
  }

  public isOffScreen(): boolean {
    return this.x + this.width + GAME_CONFIG.pipes.capOverhang < -10;
  }

  // Strictly invariant collision geometry across every world pipe skin
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
    const palette =
      this.pipeSkin === 'classic_green'
        ? PIPE_PALETTES[this.theme]
        : WORLD_PIPE_PALETTES[this.pipeSkin];
    const strokeOutline = palette.outline ?? GAME_CONFIG.colors.darkOutline;
    const capW = this.width + capOverhang * 2;
    const capX = this.x - capOverhang;
    const capY = side === 'top' ? y + height - capHeight : y;

    ctx.save();

    // Soft drop shadow
    ctx.fillStyle = 'rgba(20, 32, 48, 0.2)';
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
    ctx.strokeStyle = strokeOutline;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.rect(this.x, y, this.width, height);
    ctx.fill();
    ctx.stroke();

    // Biome-specific shaft ornaments (purely cosmetic, strictly inside shaft)
    this.drawShaftSkinDetail(ctx, y, height);

    // Vertical glossy specular stripes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
    ctx.fillRect(this.x + 9, y, 7, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.fillRect(this.x + 19, y, 3, height);

    // Pipe cap
    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0, palette.light);
    capGrad.addColorStop(0.22, palette.highlight);
    capGrad.addColorStop(0.55, palette.main);
    capGrad.addColorStop(0.9, palette.dark);
    capGrad.addColorStop(1, palette.rim);

    ctx.fillStyle = capGrad;
    ctx.strokeStyle = strokeOutline;
    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capHeight, 9);
    ctx.fill();
    ctx.stroke();

    // Cap skin accents
    this.drawCapSkinDetail(ctx, capX, capY, capW, capHeight, side, palette);

    // Inner neck shadow beneath cap
    ctx.fillStyle = 'rgba(20, 32, 48, 0.22)';
    if (side === 'bottom') {
      ctx.fillRect(this.x + 2, capY + capHeight + 1.5, this.width - 4, 6);
    } else {
      ctx.fillRect(this.x + 2, capY - 7.5, this.width - 4, 6);
    }

    ctx.restore();
  }

  private drawShaftSkinDetail(ctx: CanvasRenderingContext2D, y: number, height: number): void {
    if (this.pipeSkin === 'candy_cane') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(this.x + 2, y, this.width - 4, height);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      for (let sy = y - 24; sy < y + height + 24; sy += 28) {
        ctx.beginPath();
        ctx.moveTo(this.x, sy);
        ctx.lineTo(this.x + this.width, sy + 16);
        ctx.lineTo(this.x + this.width, sy + 27);
        ctx.lineTo(this.x, sy + 11);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (this.pipeSkin === 'bamboo') {
      ctx.fillStyle = '#3D7311';
      for (let sy = y + 36; sy < y + height - 28; sy += 46) {
        ctx.fillRect(this.x + 2, sy, this.width - 4, 4);
        ctx.fillStyle = 'rgba(227, 250, 173, 0.55)';
        ctx.fillRect(this.x + 2, sy - 2, this.width - 4, 2);
        ctx.fillStyle = '#3D7311';
      }
    } else if (this.pipeSkin === 'lava_stone') {
      ctx.strokeStyle = '#FB923C';
      ctx.lineWidth = 2.4;
      for (let sy = y + 26; sy < y + height - 24; sy += 48) {
        ctx.beginPath();
        ctx.moveTo(this.x + 10, sy);
        ctx.lineTo(this.x + 28, sy + 10);
        ctx.lineTo(this.x + 48, sy + 4);
        ctx.stroke();
      }
    } else if (this.pipeSkin === 'cyber_neon') {
      ctx.fillStyle = '#EC4899';
      ctx.fillRect(this.x + this.width - 10, y + 4, 3, Math.max(0, height - 8));
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(this.x + 7, y + 4, 2.5, Math.max(0, height - 8));
    } else if (this.pipeSkin === 'sky_gold') {
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(this.x + this.width - 8, y, 4, height);
    } else if (this.pipeSkin === 'space_metal') {
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      for (let sy = y + 38; sy < y + height - 26; sy += 52) {
        ctx.beginPath();
        ctx.moveTo(this.x + 2, sy);
        ctx.lineTo(this.x + this.width - 2, sy);
        ctx.stroke();
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(this.x + this.width - 14, sy - 7, 5, 3);
      }
    }
  }

  private drawCapSkinDetail(
    ctx: CanvasRenderingContext2D,
    capX: number,
    capY: number,
    capW: number,
    capHeight: number,
    side: 'top' | 'bottom',
    palette: PipePalette
  ): void {
    // Glossy inner bevel
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.roundRect(capX + 10, capY + 4, 10, capHeight - 8, 4);
    ctx.fill();

    if (this.pipeSkin === 'ice_snow') {
      ctx.fillStyle = '#FFFFFF';
      const frostY = side === 'bottom' ? capY + 1.5 : capY + capHeight - 8;
      ctx.beginPath();
      ctx.roundRect(capX + 3, frostY, capW - 6, 6.5, 3);
      ctx.fill();
      return;
    }

    if (this.pipeSkin === 'lava_stone') {
      ctx.fillStyle = '#FB923C';
      ctx.beginPath();
      ctx.roundRect(capX + 12, capY + capHeight / 2 - 2, capW - 24, 4, 2);
      ctx.fill();
      return;
    }

    if (this.pipeSkin === 'cyber_neon') {
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.roundRect(capX + 12, capY + capHeight / 2 - 2, capW - 24, 4, 2);
      ctx.fill();
      return;
    }

    if (this.pipeSkin === 'sky_gold') {
      ctx.fillStyle = '#FCD34D';
      ctx.beginPath();
      ctx.roundRect(capX + 4, capY + capHeight - 7, capW - 8, 4.5, 2);
      ctx.fill();
      return;
    }

    if (this.pipeSkin === 'space_metal') {
      ctx.fillStyle = '#38BDF8';
      ctx.beginPath();
      ctx.arc(capX + capW - 11, capY + capHeight / 2, 2.8, 0, Math.PI * 2);
      ctx.arc(capX + 11, capY + capHeight / 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Default / candy / bamboo corner rivet
    ctx.fillStyle = palette.rim;
    ctx.beginPath();
    ctx.arc(capX + capW - 10, capY + capHeight / 2, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }
}
