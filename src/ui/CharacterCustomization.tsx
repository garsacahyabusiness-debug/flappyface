import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { CameraController } from '../game/character/CameraController';
import { CharacterManager, characterManager } from '../game/character/CharacterManager';
import { SkinId } from '../game/character/CharacterSkinManager';
import { characterUnlockManager } from '../game/character/CharacterUnlockManager';
import { GalleryController } from '../game/character/GalleryController';
import { ImageProcessor } from '../game/character/ImageProcessor';
import { PhotoEditor } from '../game/character/PhotoEditor';
import { CropTransform } from '../game/character/types';
import { CharacterShowcaseCanvas } from './CharacterShowcaseCanvas';

interface CharacterCustomizationProps {
  customFaceImg: HTMLImageElement | null;
  targetManager?: CharacterManager;
  slotBadge?: { label: string; tone: 'blue' | 'rose' } | null;
  activeSkinId?: SkinId;
  onBack: () => void;
}

type ScreenStep = 'MENU' | 'CAMERA' | 'EDITOR';

export const CharacterCustomization: React.FC<CharacterCustomizationProps> = ({
  customFaceImg,
  targetManager = characterManager,
  slotBadge = null,
  activeSkinId = 'default',
  onBack,
}) => {
  const [step, setStep] = useState<ScreenStep>('MENU');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraRef = useRef<CameraController>(new CameraController());
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Gallery input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Photo editor state
  const editorRef = useRef<PhotoEditor | null>(null);
  const editorCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [sourceType, setSourceType] = useState<'camera' | 'gallery'>('gallery');
  const [cropState, setCropState] = useState<CropTransform>({
    zoom: 1.12,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
  });
  const [minZoom, setMinZoom] = useState(0.5);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const cameraStartTimerRef = useRef<number | null>(null);
  const successTimerRef = useRef<number | null>(null);

  const showSuccess = useCallback((msg: string, duration = 2600) => {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
    }
    setSuccessMsg(msg);
    successTimerRef.current = window.setTimeout(() => {
      setSuccessMsg(null);
      successTimerRef.current = null;
    }, duration);
  }, []);

  const stopCameraStream = useCallback(() => {
    if (cameraStartTimerRef.current !== null) {
      window.clearTimeout(cameraStartTimerRef.current);
      cameraStartTimerRef.current = null;
    }
    cameraRef.current.stop();
    setIsCameraReady(false);
  }, []);

  // Always release camera tracks and timers when leaving component
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
        successTimerRef.current = null;
      }
    };
  }, [stopCameraStream]);

  const drawEditorCanvas = useCallback(() => {
    const canvas = editorCanvasRef.current;
    const editor = editorRef.current;
    if (canvas && editor) {
      editor.renderToCanvas(canvas);
    }
  }, []);

  useEffect(() => {
    if (step === 'EDITOR') {
      drawEditorCanvas();
    }
  }, [step, cropState, drawEditorCanvas]);

  const openEditorWithImage = useCallback(
    async (img: HTMLImageElement, origin: 'camera' | 'gallery') => {
      const editor = new PhotoEditor(img, 250);
      editorRef.current = editor;
      setSourceType(origin);
      setMinZoom(editor.minZoom);

      // Optional browser FaceDetector auto-framing (gracefully skipped if unsupported)
      const faceResult = await editor.tryAutoCenterFace();
      setCropState(faceResult.crop);
      setStep('EDITOR');
      window.requestAnimationFrame(() => drawEditorCanvas());
    },
    [drawEditorCanvas]
  );

  const handleStartCamera = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setStep('CAMERA');
    setIsCameraReady(false);

    if (cameraStartTimerRef.current !== null) {
      window.clearTimeout(cameraStartTimerRef.current);
    }
    cameraStartTimerRef.current = window.setTimeout(async () => {
      cameraStartTimerRef.current = null;
      const video = videoRef.current;
      if (!video) return;

      const result = await cameraRef.current.start(video, 'user');
      if (!result.ok) {
        setErrorMsg(result.error.message);
        setStep('MENU');
        return;
      }

      setFacingMode(cameraRef.current.getFacingMode());
      setIsCameraReady(true);
      const multi = await cameraRef.current.hasMultipleCameras();
      setHasMultipleCameras(multi);
    }, 50);
  };

  const handleSwitchCamera = async () => {
    const video = videoRef.current;
    if (!video || !hasMultipleCameras) return;
    setIsCameraReady(false);
    const res = await cameraRef.current.switchCamera(video);
    if (!res.ok) {
      setErrorMsg(res.error.message);
      stopCameraStream();
      setStep('MENU');
      return;
    }
    setFacingMode(cameraRef.current.getFacingMode());
    setIsCameraReady(true);
  };

  const handleCaptureFrame = async () => {
    const video = videoRef.current;
    if (!video || !isCameraReady) return;

    const frameUrl = cameraRef.current.captureFrame(video);
    stopCameraStream();

    if (!frameUrl) {
      setErrorMsg('Gagal mengambil foto dari kamera. Silakan coba lagi.');
      setStep('MENU');
      return;
    }

    try {
      setIsProcessing(true);
      const img = await ImageProcessor.loadImage(frameUrl);
      await openEditorWithImage(img, 'camera');
    } catch {
      setErrorMsg('Foto kamera tidak dapat diproses. Silakan coba lagi.');
      setStep('MENU');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGalleryFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      setIsProcessing(true);
      const img = await GalleryController.importFromFile(file);
      await openEditorWithImage(img, 'gallery');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal membaca gambar dari galeri.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUsePhoto = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      const processedDataUrl = editor.exportProcessedDataUrl();
      await targetManager.setCustomFaceFromDataUrl(processedDataUrl, sourceType);
      characterUnlockManager.selectCustomFaceMode(targetManager.getSlot());
      editorRef.current = null;
      setStep('MENU');
      showSuccess('Custom face saved! Ready to fly!', 2800);
    } catch {
      setErrorMsg('Gagal menyimpan foto karakter. Coba gambar lain.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmRemove = async () => {
    try {
      setIsProcessing(true);
      const slot = targetManager.getSlot();
      const sel = characterUnlockManager.getSelection(slot);
      await targetManager.removePhoto();
      if (sel.mode === 'custom_face') {
        characterUnlockManager.selectGameCharacter(sel.characterId, slot);
      }
      setShowRemoveConfirm(false);
      showSuccess('Foto dihapus. Kembali ke karakter game.', 2500);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUseDefault = async () => {
    if (!customFaceImg) return;
    try {
      setIsProcessing(true);
      characterUnlockManager.selectGameCharacter('classic_bird', targetManager.getSlot());
      showSuccess('Memakai Classic Bird. Foto Custom Face tetap tersimpan!', 2600);
    } finally {
      setIsProcessing(false);
    }
  };

  // Pointer drag handlers for Photo Editor Canvas (touch + mouse)
  const handleEditorPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handleEditorPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active || !editorRef.current) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    setCropState(editorRef.current.panBy(dx, dy));
  };

  const handleEditorPointerUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div className="anim-fade-in relative z-30 flex h-full w-full flex-col bg-[#24415C]/25 px-4 pt-safe pb-safe backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            stopCameraStream();
            if (step !== 'MENU') {
              editorRef.current = null;
              setStep('MENU');
            } else {
              onBack();
            }
          }}
          className="btn-base btn-secondary min-h-[44px] px-3.5 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{step === 'MENU' ? 'BACK' : 'CANCEL'}</span>
        </button>

        <h2 className="font-display text-stroke-dark text-xl font-bold tracking-wide text-white">
          CUSTOM YOUR FACE
        </h2>

        <div className="w-[78px]" aria-hidden="true" />
      </div>

      {/* Scrollable Body */}
      <div className="mx-auto my-auto flex w-full max-w-[340px] flex-col overflow-y-auto py-1">
        <div className="anim-panel-pop game-panel p-5">
          {/* Status & Error Alerts */}
          {errorMsg && (
            <div className="mb-3 rounded-2xl border-2 border-red-300 bg-red-50 p-3 text-xs font-bold text-red-700">
              <div className="flex items-start gap-2">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {step === 'MENU' && (
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    fileInputRef.current?.click();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-[#24415C] shadow-sm"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-[#3998F7]" />
                  <span>CHOOSE FROM GALLERY</span>
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-extrabold text-emerald-800">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: CHARACTER CUSTOMIZATION MENU */}
          {step === 'MENU' && (
            <div className="flex flex-col items-center">
              {slotBadge ? (
                <div
                  className={`mb-1.5 inline-flex items-center rounded-xl border-2 border-[#24415C] px-3 py-0.5 text-[11px] font-black tracking-wider uppercase ${
                    slotBadge.tone === 'blue'
                      ? 'bg-[#3998F7] text-white'
                      : 'bg-[#FF6B6B] text-white'
                  }`}
                >
                  {slotBadge.label}
                </div>
              ) : (
                <div className="text-[11px] font-black tracking-wider text-[#24415C]/65 uppercase">
                  CURRENT CHARACTER
                </div>
              )}

              <div className="mt-2 flex flex-col items-center rounded-3xl bg-[#E8F6FF] px-6 py-1">
                <CharacterShowcaseCanvas
                  customFaceImg={customFaceImg}
                  skinId={activeSkinId}
                  size={136}
                />
              </div>

              <div className="mt-2 text-xs font-extrabold text-[#3998F7]">
                {customFaceImg ? 'Custom Face Saved' : 'Default Cartoon Bird'}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex w-full flex-col gap-2.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    audioManager.playButton();
                    handleStartCamera();
                  }}
                  className="btn-base btn-primary min-h-[50px] w-full text-base"
                >
                  <Camera className="h-5 w-5" />
                  <span>TAKE A PHOTO</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    audioManager.playButton();
                    fileInputRef.current?.click();
                  }}
                  className="btn-base btn-secondary min-h-[48px] w-full text-sm"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#3998F7]" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-[#3998F7]" />
                  )}
                  <span>{isProcessing ? 'LOADING PHOTO...' : 'CHOOSE FROM GALLERY'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleGalleryFileChange}
                  className="hidden"
                />

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isProcessing || !customFaceImg}
                    onClick={() => {
                      audioManager.playButton();
                      handleUseDefault();
                    }}
                    className="btn-base btn-secondary min-h-[42px] px-2 text-xs"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-[#3998F7]" />
                    <span>USE DEFAULT</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing || !customFaceImg}
                    onClick={() => {
                      audioManager.playButton();
                      setShowRemoveConfirm(true);
                    }}
                    className="btn-base btn-danger min-h-[42px] px-2 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>REMOVE PHOTO</span>
                  </button>
                </div>
              </div>

              {/* Privacy Note */}
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#F2F9FF] px-3 py-2.5 text-left">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#32B85C]" />
                <p className="text-[11px] font-bold leading-snug text-[#24415C]/75">
                  Your photo stays on your device. FLAPPY FACE does not upload or identify your face.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: LIVE CAMERA CAPTURE */}
          {step === 'CAMERA' && (
            <div className="flex flex-col items-center">
              <div className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-3xl border-[3px] border-[#24415C] bg-[#24415C]">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-full w-full object-cover ${
                    facingMode === 'user' ? '-scale-x-100' : ''
                  }`}
                />

                {/* Circular Face Positioning Guide */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-[74%] w-[74%] rounded-full border-4 border-dashed border-[#FFD84D] shadow-[0_0_0_9999px_rgba(36,65,92,0.42)]" />
                </div>

                {!isCameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#24415C]/85 text-xs font-extrabold text-white">
                    <Loader2 className="h-6 w-6 animate-spin text-[#FFD84D]" />
                    <span>Starting camera...</span>
                  </div>
                )}
              </div>

              <p className="mt-2.5 text-center text-xs font-bold text-[#24415C]/75">
                Center your face inside the yellow circle
              </p>

              <div className="mt-4 flex w-full items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    stopCameraStream();
                    setStep('MENU');
                  }}
                  className="btn-base btn-secondary min-h-[46px] flex-1 px-3 text-xs"
                >
                  <X className="h-4 w-4" />
                  <span>CANCEL</span>
                </button>

                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={() => {
                      audioManager.playButton();
                      handleSwitchCamera();
                    }}
                    aria-label="Switch Camera"
                    className="btn-base btn-secondary min-h-[46px] min-w-[46px] px-3"
                  >
                    <RefreshCw className="h-4 w-4 text-[#3998F7]" />
                  </button>
                )}

                <button
                  type="button"
                  disabled={!isCameraReady || isProcessing}
                  onClick={() => {
                    audioManager.playButton();
                    handleCaptureFrame();
                  }}
                  className="btn-base btn-green min-h-[46px] flex-[1.4] px-4 text-sm"
                >
                  <Camera className="h-4 w-4" />
                  <span>CAPTURE</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: INTERACTIVE CANVAS PHOTO EDITOR */}
          {step === 'EDITOR' && (
            <div className="flex flex-col items-center">
              <div className="flex w-full items-center justify-between text-xs font-extrabold text-[#24415C]/80">
                <span>Drag to move · Slider to zoom</span>
                {ImageProcessor.supportsFaceDetection() && (
                  <button
                    type="button"
                    onClick={async () => {
                      audioManager.playButton();
                      if (!editorRef.current) return;
                      const res = await editorRef.current.tryAutoCenterFace();
                      setCropState(res.crop);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#E8F6FF] px-2.5 py-1 text-[11px] font-black text-[#3998F7]"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Auto</span>
                  </button>
                )}
              </div>

              <div className="mt-2.5 overflow-hidden rounded-3xl border-[3px] border-[#24415C] shadow-inner">
                <canvas
                  ref={editorCanvasRef}
                  onPointerDown={handleEditorPointerDown}
                  onPointerMove={handleEditorPointerMove}
                  onPointerUp={handleEditorPointerUp}
                  onPointerCancel={handleEditorPointerUp}
                  onWheel={(e) => {
                    e.preventDefault();
                    if (!editorRef.current) return;
                    const delta = e.deltaY < 0 ? 0.1 : -0.1;
                    setCropState(editorRef.current.setZoom(cropState.zoom + delta));
                  }}
                  style={{ width: 250, height: 250, touchAction: 'none' }}
                  className="block cursor-grab active:cursor-grabbing"
                />
              </div>

              {/* Zoom Slider */}
              <div className="mt-3.5 flex w-full items-center gap-2">
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => {
                    audioManager.playButton();
                    if (!editorRef.current) return;
                    setCropState(editorRef.current.setZoom(cropState.zoom - 0.15));
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C]/20 bg-[#F2F9FF] text-[#24415C]"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <input
                  type="range"
                  min={minZoom}
                  max={3.2}
                  step={0.04}
                  value={cropState.zoom}
                  aria-label="Zoom photo"
                  onChange={(e) => {
                    if (!editorRef.current) return;
                    setCropState(editorRef.current.setZoom(parseFloat(e.target.value)));
                  }}
                  className="h-2 w-full accent-[#3998F7]"
                />
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() => {
                    audioManager.playButton();
                    if (!editorRef.current) return;
                    setCropState(editorRef.current.setZoom(cropState.zoom + 0.15));
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#24415C]/20 bg-[#F2F9FF] text-[#24415C]"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>

              {/* Rotate & Reset Crop Controls */}
              <div className="mt-2.5 flex w-full items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    if (!editorRef.current) return;
                    setCropState(editorRef.current.rotateBy(-15));
                  }}
                  className="flex min-h-[38px] items-center gap-1 rounded-xl border-2 border-[#24415C]/20 bg-[#F2F9FF] px-3 text-xs font-extrabold text-[#24415C]"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Left</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    if (!editorRef.current) return;
                    setCropState(editorRef.current.reset());
                  }}
                  className="flex min-h-[38px] items-center rounded-xl border-2 border-[#24415C]/20 bg-slate-100 px-3 text-xs font-extrabold text-[#24415C]"
                >
                  RESET CROP
                </button>

                <button
                  type="button"
                  onClick={() => {
                    audioManager.playButton();
                    if (!editorRef.current) return;
                    setCropState(editorRef.current.rotateBy(15));
                  }}
                  className="flex min-h-[38px] items-center gap-1 rounded-xl border-2 border-[#24415C]/20 bg-[#F2F9FF] px-3 text-xs font-extrabold text-[#24415C]"
                >
                  <span>Right</span>
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Confirm / Cancel */}
              <div className="mt-4 flex w-full gap-2.5">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    audioManager.playButton();
                    editorRef.current = null;
                    setStep('MENU');
                  }}
                  className="btn-base btn-secondary min-h-[48px] flex-1 text-sm"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    audioManager.playButton();
                    handleUsePhoto();
                  }}
                  className="btn-base btn-green min-h-[48px] flex-[1.5] text-sm"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>{isProcessing ? 'SAVING...' : 'USE PHOTO'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REMOVE PHOTO Confirmation Dialog */}
      {showRemoveConfirm && (
        <div className="anim-fade-in absolute inset-0 z-40 flex items-center justify-center bg-[#24415C]/55 p-5 backdrop-blur-sm">
          <div className="anim-panel-pop game-panel w-full max-w-[290px] p-5 text-center">
            <h3 className="font-display text-xl font-bold text-[#24415C]">
              Remove Photo?
            </h3>
            <p className="mt-2 text-xs font-bold leading-relaxed text-[#24415C]/80">
              Remove your custom face and return to the default character?
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  audioManager.playButton();
                  setShowRemoveConfirm(false);
                }}
                className="btn-base btn-secondary min-h-[44px] text-sm"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  audioManager.playButton();
                  handleConfirmRemove();
                }}
                className="btn-base btn-danger min-h-[44px] text-sm"
              >
                REMOVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
