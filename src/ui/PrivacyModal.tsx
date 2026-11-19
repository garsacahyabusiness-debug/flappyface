import React from 'react';
import { CheckCircle2, Lock, ShieldCheck, X } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';

interface PrivacyModalProps {
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  return (
    <div className="anim-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#24415C]/55 p-4 backdrop-blur-sm">
      <div className="anim-panel-pop game-panel w-full max-w-[330px] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#32B85C]" />
            <h3 className="font-display text-lg font-bold text-[#24415C]">
              PRIVACY POLICY
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close privacy dialog"
            onClick={() => {
              audioManager.playButton();
              onClose();
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-[#24415C]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-[#E8F6FF] p-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#24415C]">
            <Lock className="h-4 w-4 text-[#3998F7]" />
            <span>100% Local Processing</span>
          </div>
          <p className="mt-1 text-xs font-bold leading-relaxed text-[#24415C]/80">
            Your photo stays on your device. FLAPPY FACE does not upload, track, or identify your face.
          </p>
        </div>

        <ul className="mt-3 space-y-2 text-xs font-bold text-[#24415C]/80">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#32B85C]" />
            <span>Foto karakter disimpan lokal di IndexedDB browser dan dapat dihapus kapan saja.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#32B85C]" />
            <span>Skor tertinggi & pengaturan audio disimpan lokal di LocalStorage perangkat.</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#32B85C]" />
            <span>Tidak ada server backend, analitik foto, maupun pelacakan akun.</span>
          </li>
        </ul>

        <button
          type="button"
          onClick={() => {
            audioManager.playButton();
            onClose();
          }}
          className="btn-base btn-primary mt-4 min-h-[44px] w-full text-sm"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
