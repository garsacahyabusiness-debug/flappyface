import { CameraError } from './types';

export type FacingMode = 'user' | 'environment';

export class CameraController {
  private stream: MediaStream | null = null;
  private facingMode: FacingMode = 'user';

  public getFacingMode(): FacingMode {
    return this.facingMode;
  }

  public isActive(): boolean {
    return this.stream !== null;
  }

  public static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices) &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  public static isSecureContextAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }

  public async hasMultipleCameras(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
        return false;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      return videoDevices.length > 1;
    } catch {
      return false;
    }
  }

  public async start(
    videoElement: HTMLVideoElement,
    facing: FacingMode = 'user'
  ): Promise<{ ok: true } | { ok: false; error: CameraError }> {
    if (!CameraController.isSupported()) {
      return {
        ok: false,
        error: {
          code: 'UNSUPPORTED',
          message:
            'Browser ini tidak mendukung akses kamera. Silakan pilih foto dari galeri.',
        },
      };
    }

    if (!CameraController.isSecureContextAvailable()) {
      return {
        ok: false,
        error: {
          code: 'INSECURE_CONTEXT',
          message:
            'Kamera hanya dapat diakses di koneksi aman (HTTPS atau localhost). Gunakan galeri untuk memilih foto.',
        },
      };
    }

    this.stop();
    this.facingMode = facing;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 720, max: 1280 },
          height: { ideal: 720, max: 1280 },
        },
      });

      this.stream = stream;
      videoElement.srcObject = stream;
      videoElement.playsInline = true;
      videoElement.muted = true;
      await videoElement.play();
      return { ok: true };
    } catch (err) {
      this.stop();
      return { ok: false, error: this.mapMediaError(err) };
    }
  }

  public async switchCamera(
    videoElement: HTMLVideoElement
  ): Promise<{ ok: true } | { ok: false; error: CameraError }> {
    const nextFacing: FacingMode = this.facingMode === 'user' ? 'environment' : 'user';
    return this.start(videoElement, nextFacing);
  }

  public captureFrame(videoElement: HTMLVideoElement): string | null {
    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    if (!vw || !vh) return null;

    const maxDim = 960;
    const scale = Math.min(1, maxDim / Math.max(vw, vh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale);
    canvas.height = Math.round(vh * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Mirror front camera so captured frame matches live selfie preview
    if (this.facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  public stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Ignore track stop errors
        }
      }
      this.stream = null;
    }
  }

  private mapMediaError(err: unknown): CameraError {
    const name = err instanceof Error ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return {
        code: 'PERMISSION_DENIED',
        message:
          'Izin kamera ditolak. Berikan izin kamera di pengaturan browser atau pilih foto dari galeri.',
      };
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
      return {
        code: 'NOT_FOUND',
        message:
          'Kamera tidak ditemukan pada perangkat ini. Silakan pilih foto dari galeri.',
      };
    }
    if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
      return {
        code: 'BUSY',
        message:
          'Kamera sedang digunakan oleh aplikasi lain atau gagal dimulai. Coba tutup aplikasi lain atau gunakan galeri.',
      };
    }
    return {
      code: 'STREAM_ERROR',
      message:
        'Tidak dapat mengakses stream kamera. Kamu tetap bisa memilih foto dari galeri.',
    };
  }
}
