import React, { useState } from 'react';
import { Award, ClipboardCheck, Gamepad2, Sparkles, Swords } from 'lucide-react';
import { audioManager } from '../game/audio/AudioManager';
import { XPEventCategory, XPHistoryEntry } from '../game/progression/PlayerProgressTypes';

interface XPHistoryListProps {
  entries: readonly XPHistoryEntry[];
}

type HistoryFilter = 'all' | XPEventCategory;

function formatHistoryTime(ts: number): string {
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mo} ${hh}:${mm}`;
  } catch {
    return '';
  }
}

function renderCategoryIcon(cat: XPEventCategory) {
  switch (cat) {
    case 'gameplay':
      return <Gamepad2 className="h-4 w-4 text-[#3998F7]" />;
    case 'mission':
      return <ClipboardCheck className="h-4 w-4 text-[#32B85C]" />;
    case 'tournament':
      return <Swords className="h-4 w-4 text-[#F97316]" />;
    case 'achievement':
      return <Award className="h-4 w-4 text-[#F59E0B]" />;
    case 'collection':
      return <Sparkles className="h-4 w-4 text-[#9333EA]" />;
  }
}

export const XPHistoryList: React.FC<XPHistoryListProps> = ({ entries }) => {
  const [filter, setFilter] = useState<HistoryFilter>('all');

  const filtered =
    filter === 'all' ? entries : entries.filter((entry) => entry.category === filter);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            { id: 'all', label: 'ALL' },
            { id: 'gameplay', label: 'GAMEPLAY' },
            { id: 'mission', label: 'MISSION' },
            { id: 'tournament', label: 'TOURNAMENT' },
            { id: 'achievement', label: 'ACHIEVEMENT' },
            { id: 'collection', label: 'COLLECTION' },
          ] as const
        ).map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                audioManager.playButton();
                setFilter(tab.id);
              }}
              className={`min-h-[34px] rounded-xl border-2 px-2.5 text-[10px] font-black uppercase transition-colors ${
                active
                  ? 'border-[#24415C] bg-[#3998F7] text-white shadow-[0_2px_0_#24415C]'
                  : 'border-[#24415C]/20 bg-white text-[#24415C]/70'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-[#24415C]/15 bg-[#EEF7FF] p-5 text-center text-xs font-bold text-[#24415C]/65">
          Belum ada catatan XP di kategori ini. Mainkan game atau selesaikan misi untuk mulai mengumpulkan XP!
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2.5 rounded-2xl border border-[#24415C]/15 bg-[#F6FAFF] px-3 py-2"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#24415C]/15 bg-white">
                {renderCategoryIcon(item.category)}
              </div>

              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-extrabold text-[#24415C]">
                  {item.label}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] font-bold text-[#24415C]/60 uppercase">
                  <span>{item.category}</span>
                  <span>·</span>
                  <span>Lv.{item.levelAfter}</span>
                  <span>·</span>
                  <span>{formatHistoryTime(item.timestamp)}</span>
                </div>
              </div>

              <span className="shrink-0 rounded-xl border border-[#24415C]/20 bg-[#DCFCE7] px-2 py-0.5 font-display text-xs font-bold tabular-nums text-[#15803D]">
                +{item.amount} XP
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
