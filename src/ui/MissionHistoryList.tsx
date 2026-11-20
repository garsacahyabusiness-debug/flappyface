import React, { useState } from 'react';
import { Check, Coins, Gem, History } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { MissionCategory, MissionHistoryEntry } from '../game/missions/MissionTypes';

interface MissionHistoryListProps {
  history: MissionHistoryEntry[];
  totalCoinsEarned: number;
  totalGemsEarned: number;
}

type HistoryFilter = 'all' | MissionCategory;

const FILTERS: ReadonlyArray<{ id: HistoryFilter; label: string }> = [
  { id: 'all', label: 'ALL' },
  { id: 'daily', label: 'DAILY' },
  { id: 'weekly', label: 'WEEKLY' },
  { id: 'special', label: 'SPECIAL' },
];

export const MissionHistoryList: React.FC<MissionHistoryListProps> = ({
  history,
  totalCoinsEarned,
  totalGemsEarned,
}) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const items =
    filter === 'all' ? history : history.filter((item) => item.category === filter);

  return (
    <div className="space-y-2.5">
      {/* Totals Summary Bar */}
      <div className="flex items-center justify-between rounded-2xl border-2 border-[#24415C] bg-[#EEF7FF] px-3 py-2 text-xs font-black text-[#24415C]">
        <span>TOTAL REWARDS EARNED</span>
        <div className="flex items-center gap-2.5 tabular-nums">
          <span className="inline-flex items-center gap-1 text-[#B45309]">
            <Coins className="h-3.5 w-3.5 text-[#F59E0B]" />
            {totalCoinsEarned}
          </span>
          <span className="inline-flex items-center gap-1 text-[#0369A1]">
            <Gem className="h-3.5 w-3.5 text-[#38BDF8]" />
            {totalGemsEarned}
          </span>
        </div>
      </div>

      {/* Category Filter Row */}
      <div className="grid grid-cols-4 gap-1.5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                audioManager.playButton();
                setFilter(f.id);
              }}
              className={`min-h-[44px] rounded-xl border-2 border-[#24415C] text-[10px] font-black tracking-wide transition-colors ${
                active
                  ? 'bg-[#3998F7] text-white shadow-[0_2px_0_#24415C]'
                  : 'bg-white text-[#24415C]/75 hover:bg-[#EEF7FF]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* History Items or Empty State */}
      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#24415C]/25 bg-white/85 px-4 py-8 text-center">
          <History className="mx-auto h-8 w-8 text-[#3998F7]/65" />
          <div className="mt-2 font-display text-base font-bold text-[#24415C]">
            Belum Ada Riwayat Misi
          </div>
          <p className="mt-1 text-xs font-bold text-[#24415C]/65">
            Terbang dan selesaikan misi pertamamu untuk mengumpulkan Coin, Gem, dan hadiah spesial!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((entry) => {
            const dateStr = new Date(entry.claimedAt ?? entry.completedAt).toLocaleDateString(
              undefined,
              {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }
            );
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-[#24415C]/20 bg-white px-3 py-2.5 shadow-[0_2px_0_rgba(36,65,92,0.12)]"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#24415C]/25 bg-[#EEF7FF] text-base">
                    {entry.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-display text-xs font-bold text-[#24415C]">
                      {entry.title}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#24415C]/65">
                      <span className="uppercase">{entry.category}</span>
                      <span>·</span>
                      <span>{dateStr}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="flex items-center justify-end gap-1.5 text-[10px] font-black tabular-nums">
                    {entry.reward.coins > 0 && (
                      <span className="text-[#B45309]">+{entry.reward.coins}🪙</span>
                    )}
                    {entry.reward.gems > 0 && (
                      <span className="text-[#0369A1]">+{entry.reward.gems}💎</span>
                    )}
                  </div>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                      entry.status === 'claimed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {entry.status === 'claimed' && <Check className="h-2.5 w-2.5" />}
                    <span>{entry.status === 'claimed' ? 'CLAIMED' : 'UNCLAIMED'}</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
