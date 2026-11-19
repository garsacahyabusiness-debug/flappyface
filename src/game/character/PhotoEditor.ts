import { ImageProcessor } from './ImageProcessor';
import { CropTransform } from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export class PhotoEditor {
  private sourceImage: HTMLImageElement;
  public readonly editorSize: number;
  public readonly minZoom: number;
  public readonly maxZoom = 3.2;
  private crop: CropTransform;

  constructor(sourceImage: HTMLImageElement, editorSize = 260) {
    this.sourceImage = sourceImage;
    this.editorSize = editorSize;
    this.minZoom = ImageProcessor.getMinZoom(sourceImage, editorSize);
    this.crop = {
      zoom: 1.12,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    };
  }

  public getCrop(): CropTransform {
    return { ...this.crop };
  }

  public reset(): CropTransform {
    this.crop = {
      zoom: 1.12,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
    };
    return this.getCrop();
  }

  public setZoom(zoom: number): CropTransform {
    this.crop.zoom = clamp(Number(zoom.toFixed(2)), this.minZoom, this.maxZoom);
    return this.getCrop();
  }

  public panBy(dx: number, dy: number): CropTransform {
    const bound = this.editorSize * 0.85;
    this.crop.offsetX = clamp(this.crop.offsetX + dx, -bound, bound);
    this.crop.offsetY = clamp(this.crop.offsetY + dy, -bound, bound);
    return this.getCrop();
  }

  public setOffset(x: number, y: number): CropTransform {
    const bound = this.editorSize * 0.85;
    this.crop.offsetX = clamp(x, -bound, bound);
    this.crop.offsetY = clamp(y, -bound, bound);
    return this.getCrop();
  }

  public rotateBy(degrees: number): CropTransform {
    this.crop.rotation = (this.crop.rotation + degrees) % 360;
    return this.getCrop();
  }

  public async tryAutoCenterFace(): Promise<{ detected: boolean; crop: CropTransform }> {
    const face = await ImageProcessor.detectFace(this.sourceImage);
    if (!face) {
      return { detected: false, crop: this.getCrop() };
    }

    const img = this.sourceImage;
    const baseScale = Math.max(this.editorSize / img.width, this.editorSize / img.height);
    const faceRatio = Math.max(face.width, face.height) / Math.min(img.width, img.height);
    const suggestedZoom = clamp(0.68 / Math.max(0.2, faceRatio), 1.0, 2.5);

    const faceCenterX = face.x + face.width / 2 - img.width / 2;
    const faceCenterY = face.y + face.height / 2 - img.height / 2;

    this.crop = {
      zoom: Number(suggestedZoom.toFixed(2)),
      offsetX: clamp(-faceCenterX * baseScale * suggestedZoom, -this.editorSize * 0.7, this.editorSize * 0.7),
      offsetY: clamp(-faceCenterY * baseScale * suggestedZoom, -this.editorSize * 0.7, this.editorSize * 0.7),
      rotation: 0,
    };

    return { detected: true, crop: this.getCrop() };
  }

  public renderToCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = this.editorSize;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = '#E8F6FF';
    ctx.fillRect(0, 0, size, size);

    const img = this.sourceImage;
    const baseScale = Math.max(size / img.width, size / img.height);
    const scale = baseScale * this.crop.zoom;

    ctx.save();
    ctx.translate(size / 2 + this.crop.offsetX, size / 2 + this.crop.offsetY);
    ctx.rotate((this.crop.rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();

    // Translucent dark mask outside circular crop guide
    const radius = size * 0.44;
    ctx.save();
    ctx.fillStyle = 'rgba(36, 65, 92, 0.58)';
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2, true);
    ctx.fill();

    // Circular crop guide border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFD84D';
    ctx.stroke();

    // Subtle crosshair guide for centering eyes/face
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(size / 2 - 40, size / 2 - 8);
    ctx.lineTo(size / 2 + 40, size / 2 - 8);
    ctx.moveTo(size / 2, size / 2 - 46);
    ctx.lineTo(size / 2, size / 2 + 36);
    ctx.stroke();
    ctx.restore();
  }

  public exportProcessedDataUrl(): string {
    return ImageProcessor.exportCroppedFace(this.sourceImage, this.crop, this.editorSize, 384);
  }
}
