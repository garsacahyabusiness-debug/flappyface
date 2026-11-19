import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
}

class PWAManager {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;
  private wakeLock: WakeLockSentinel | null = null;
  private initialized = false;

  private state: PWAState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInstalled: false,
    isInstallable: false,
    isIOS: false,
    needRefresh: false,
    offlineReady: false,
  };

  private listeners = new Set<(state: PWAState) => void>();

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);

    this.state = {
      ...this.state,
      isOnline: navigator.onLine,
      isInstalled: standalone,
      isIOS,
    };

    window.addEventListener('online', () => {
      this.setState({ isOnline: true });
    });

    window.addEventListener('offline', () => {
      this.setState({ isOnline: false });
    });

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.setState({ isInstallable: true });
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.setState({ isInstalled: true, isInstallable: false });
    });

    try {
      this.updateSW = registerSW({
        immediate: true,
        onNeedRefresh: () => {
          this.setState({ needRefresh: true });
        },
        onOfflineReady: () => {
          this.setState({ offlineReady: true });
        },
        onRegisterError: () => {
          // Graceful fallback when running in restricted preview contexts
        },
      });
    } catch {
      // Ignore registration failure if SW API unavailable
    }

    this.notify();
  }

  public getState(): PWAState {
    return { ...this.state };
  }

  public subscribe(listener: (state: PWAState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public async promptInstall(): Promise<'accepted' | 'dismissed' | 'manual'> {
    if (!this.deferredPrompt) {
      return 'manual';
    }
    try {
      await this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
        this.setState({ isInstalled: true, isInstallable: false });
      }
      return outcome;
    } catch {
      return 'manual';
    }
  }

  public async applyUpdate(): Promise<void> {
    if (this.updateSW) {
      await this.updateSW(true);
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  public dismissUpdate(): void {
    this.setState({ needRefresh: false });
  }

  public async requestWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    if (this.wakeLock) return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch {
      // Wake lock can fail on battery saver or unsupported browsers
      this.wakeLock = null;
    }
  }

  public async releaseWakeLock(): Promise<void> {
    if (!this.wakeLock) return;
    try {
      await this.wakeLock.release();
    } catch {
      // Ignore release errors
    } finally {
      this.wakeLock = null;
    }
  }

  private setState(partial: Partial<PWAState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  private notify(): void {
    const snap = this.getState();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }
}

export const pwaManager = new PWAManager();

export function usePWAState(): PWAState {
  const [pwaState, setPwaState] = useState<PWAState>(() => pwaManager.getState());

  useEffect(() => {
    pwaManager.init();
    return pwaManager.subscribe(setPwaState);
  }, []);

  return pwaState;
}
