import React, { useEffect, useState } from 'react';
import { PowerUpBannerEvent } from '../game/powerups/PowerUpManager';

interface PowerUpNotificationProps {
  banner: PowerUpBannerEvent | null;
  visible: boolean;
}

export const PowerUpNotification: React.FC<PowerUpNotificationProps> = ({
  banner,
  visible,
}) => {
  const [activeBanner, setActiveBanner] = useState<PowerUpBannerEvent | null>(null);

  useEffect(() => {
    if (!banner || !visible) {
      return;
    }
    setActiveBanner(banner);
    const timer = window.setTimeout(() => {
      setActiveBanner((cur) => (cur?.id === banner.id ? null : cur));
    }, 950);
    return () => window.clearTimeout(timer);
  }, [banner, visible]);

  useEffect(() => {
    if (!visible) {
      setActiveBanner(null);
    }
  }, [visible]);

  if (!activeBanner || !visible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute top-28 left-1/2 z-20 -translate-x-1/2"
    >
      <div
        key={activeBanner.id}
        className="anim-panel-pop inline-flex items-center gap-1.5 rounded-full border-2 border-[#24415C] bg-white/95 px-3.5 py-1 text-xs font-black tracking-wide text-[#24415C] shadow-[0_3px_0_#24415C]"
      >
        <span aria-hidden="true">{activeBanner.icon}</span>
        <span>{activeBanner.text}</span>
      </div>
    </div>
  );
};
