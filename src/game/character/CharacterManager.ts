import { CharacterSlot, CharacterStorage } from './CharacterStorage';
import { ImageProcessor } from './ImageProcessor';

export type CharacterChangeListener = (image: HTMLImageElement | null) => void;

export class CharacterManager {
  private readonly slot: CharacterSlot;
  private cachedImage: HTMLImageElement | null = null;
  private listeners = new Set<CharacterChangeListener>();
  private initialized = false;

  constructor(slot: CharacterSlot = 'default') {
    this.slot = slot;
  }

  public getSlot(): CharacterSlot {
    return this.slot;
  }

  public getImage(): HTMLImageElement | null {
    return this.cachedImage;
  }

  public hasCustomFace(): boolean {
    return this.cachedImage !== null;
  }

  public subscribe(listener: CharacterChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.cachedImage);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.cachedImage);
    }
  }

  public async init(): Promise<HTMLImageElement | null> {
    if (this.initialized) return this.cachedImage;
    this.initialized = true;

    try {
      const stored = await CharacterStorage.loadCharacter(this.slot);
      if (stored?.imageDataUrl) {
        const img = await ImageProcessor.loadImage(stored.imageDataUrl);
        this.cachedImage = img;
        this.notify();
        return img;
      }
    } catch {
      this.cachedImage = null;
      await CharacterStorage.removeCharacter(this.slot);
    }

    this.notify();
    return null;
  }

  public async setCustomFaceFromDataUrl(
    processedDataUrl: string,
    sourceType: 'camera' | 'gallery'
  ): Promise<HTMLImageElement> {
    const img = await ImageProcessor.loadImage(processedDataUrl);
    await CharacterStorage.saveCharacter(processedDataUrl, sourceType, this.slot);
    this.cachedImage = img;
    this.notify();
    return img;
  }

  public async removePhoto(): Promise<void> {
    await CharacterStorage.removeCharacter(this.slot);
    this.cachedImage = null;
    this.notify();
  }

  public async resetCharacter(): Promise<void> {
    return this.removePhoto();
  }
}

export const characterManager = new CharacterManager('default');
export const player1CharacterManager = new CharacterManager('player1');
export const player2CharacterManager = new CharacterManager('player2');
