import React from 'react';

interface CurrencyDisplayProps {
  coins: number;
  gems: number;
  compact?: boolean;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  coins,
  gems,
  compact = false,
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-2xl border-2 border-[#24415C] bg-white/92 shadow-[0_2px_0_#24415C] ${
        compact ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <span className="inline-flex items-center gap-1 font-display font-bold tabular-nums text-[#24415C]">
        <span aria-hidden="true">🪙</span>
        <span>{coins}</span>
      </span>

      <span className="h-3 w-[1.5px] bg-[#24415C]/20" aria-hidden="true" />

      <span className="inline-flex items-center gap-1 font-display font-bold tabular-nums text-[#0284C7]">
        <span aria-hidden="true">💎</span>
        <span>{gems}</span>
      </span>
    </div>
  );
};
