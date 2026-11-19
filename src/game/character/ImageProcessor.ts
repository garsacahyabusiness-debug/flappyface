import { CropTransform, FaceBox } from './types';

interface BrowserFaceDetector {
  detect(source: ImageBitmapSource): Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
}

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => BrowserFaceDetector;
  }
}

export class ImageProcessor {
  public static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Gagal memuat gambar. Pastikan file gambar valid.'));
      img.src = src;
    });
  }

  public static supportsFaceDetection(): boolean {
    return typeof window !== 'undefined' && typeof window.FaceDetector === 'function';
  }

  public static async detectFace(img: HTMLImageElement): Promise<FaceBox | null> {
    if (!this.supportsFaceDetection() || !window.FaceDetector) {
      return null;
    }
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (faces && faces.length > 0) {
        const box = faces[0].boundingBox;
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
      }
    } catch {
      // Optional enhancement: fall back quietly to manual crop
    }
    return null;
  }

  /**
   * Computes minimum zoom so the entire photo fits comfortably inside the editor circle
   * if the user wants to zoom all the way out.
   */
  public static getMinZoom(img: HTMLImageElement, editorSize: number): number {
    const coverScale = Math.max(editorSize / img.width, editorSize / img.height);
    const containScale = Math.min(editorSize / img.width, editorSize / img.height);
    const ratio = (containScale * 0.88) / coverScale;
    return Math.max(0.35, Math.min(0.9, Number(ratio.toFixed(2))));
  }

  /**
   * Downscales an oversized source image before opening the editor to keep memory low.
   */
  public static async resizeSourceFile(file: File, maxDimension = 1024): Promise<HTMLImageElement> {
    const objectUrl = URL.createObjectURL(file);
    try {
      const original = await this.loadImage(objectUrl);
      const longest = Math.max(original.width, original.height);
      if (longest <= maxDimension) {
        // Clone onto clean canvas so objectUrl can be revoked immediately
        const canvas = document.createElement('canvas');
        canvas.width = original.width;
        canvas.height = original.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
        ctx.drawImage(original, 0, 0);
        return await this.loadImage(canvas.toDataURL('image/jpeg', 0.92));
      }

      const scale = maxDimension / longest;
      const targetW = Math.max(1, Math.round(original.width * scale));
      const targetH = Math.max(1, Math.round(original.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D tidak tersedia.');
      ctx.drawImage(original, 0, 0, targetW, targetH);
      return await this.loadImage(canvas.toDataURL('image/jpeg', 0.92));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  /**
   * Renders the final circular cropped character face onto an optimized 384x384 image.
   * Uses WebP when supported for compact IndexedDB storage, falling back to PNG.
   */
  public static exportCroppedFace(
    img: HTMLImageElement,
    crop: CropTransform,
    editorSize = 260,
    outputSize = 384
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D tidak tersedia untuk memproses foto.');
    }

    const center = outputSize / 2;
    const cropCircleRadius = outputSize * 0.48;
    const offsetRatio = outputSize / editorSize;

    ctx.clearRect(0, 0, outputSize, outputSize);

    // Circular mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, cropCircleRadius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#FFE885';
    ctx.fill();
    ctx.clip();

    const baseCoverScale = Math.max(outputSize / img.width, outputSize / img.height);
    const effectiveScale = baseCoverScale * crop.zoom;

    ctx.translate(center + crop.offsetX * offsetRatio, center + crop.offsetY * offsetRatio);
    ctx.rotate((crop.rotation * Math.PI) / 180);
    ctx.scale(effectiveScale, effectiveScale);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    // Subtle top-left cartoon specular highlight inside face circle
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sheen = ctx.createRadialGradient(
      outputSize * 0.32,
      outputSize * 0.24,
      outputSize * 0.04,
      center,
      center,
      cropCircleRadius
    );
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    sheen.addColorStop(0.65, 'rgba(255, 255, 255, 0)');
    sheen.addColorStop(1, 'rgba(36, 65, 92, 0.12)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, outputSize, outputSize);

    ctx.restore();

    const webp = canvas.toDataURL('image/webp', 0.9);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
    return canvas.toDataURL('image/png');
  }
}
