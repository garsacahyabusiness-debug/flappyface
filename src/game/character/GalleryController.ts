import { ImageProcessor } from './ImageProcessor';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB guard

export class GalleryController {
  public static validateFile(file: File | undefined): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'Tidak ada gambar yang dipilih.' };
    }

    const lowerType = file.type.toLowerCase();
    if (lowerType === 'image/svg+xml' || /\.svg$/i.test(file.name)) {
      return {
        valid: false,
        error: 'File SVG tidak didukung. Pilih foto JPG, JPEG, PNG, atau WEBP.',
      };
    }

    const mimeOk = lowerType.startsWith('image/') || ALLOWED_MIME.has(lowerType);
    const extOk = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);

    if (!mimeOk && !extOk) {
      return {
        valid: false,
        error: 'Format gambar tidak didukung. Pilih file JPG, JPEG, PNG, atau WEBP.',
      };
    }

    if (file.size > MAX_FILE_BYTES) {
      return {
        valid: false,
        error: 'Ukuran file terlalu besar (maksimal 20 MB). Pilih foto yang lebih kecil.',
      };
    }

    return { valid: true };
  }

  public static async importFromFile(file: File | undefined): Promise<HTMLImageElement> {
    const check = this.validateFile(file);
    if (!check.valid || !file) {
      throw new Error(check.error || 'File gambar tidak valid.');
    }
    return ImageProcessor.resizeSourceFile(file, 1024);
  }
}
