import React from 'react';
import { WifiOff } from 'lucide-react';
import { usePWAState } from '../game/pwa/PWAManager';

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWAState();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute bottom-3 left-3 z-40 inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-[#FFD84D]/95 px-2.5 py-1 text-[10px] font-black tracking-wider text-[#24415C] shadow-[0_2px_0_#24415C]"
    >
      <WifiOff className="h-3 w-3 shrink-0" />
      <span>OFFLINE</span>
    </div>
  );
};
