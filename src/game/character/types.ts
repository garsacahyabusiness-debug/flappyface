export interface CropTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
  rotation: number; // degrees
}

export interface StoredCharacterRecord {
  id: 'current' | 'player1' | 'player2';
  imageDataUrl: string;
  updatedAt: number;
  sourceType: 'camera' | 'gallery';
}

export interface CharacterMetadata {
  hasCustomFace: boolean;
  updatedAt: number | null;
}

export type CameraErrorCode =
  | 'UNSUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'BUSY'
  | 'STREAM_ERROR';

export interface CameraError {
  code: CameraErrorCode;
  message: string;
}

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
