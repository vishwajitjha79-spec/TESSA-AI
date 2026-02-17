'use client';

import { useState, useEffect } from 'react';
import { Flame } from 'lucide-react';
import { getStreaks, getStreakEmoji, type StreakData } from '@/lib/streaks-water';

interface StreakDashboardProps {
  isCreatorMode: boolean;
}

const STREAK_LABELS: Record<keyof StreakData, { label: string; icon: string }> = {
  study : { label: 'Study',  icon: '📚' },
  sleep : { label: 'Sleep',  icon: '😴' },
  meals : { label: 'Meals',  icon: '🍽️' },
  water : { label: 'Water',  icon: '💧' },
};

export default function StreakDashboard({ isCreatorMode }: StreakDashboardProps) {
  const [streaks, setStreaks] = useState<StreakData | null>(null);

  useEffect(() => { setStreaks(getStreaks()); }, []);

  if (!streaks) return null;

  const accent  = isCreatorMode ? 'text-pink-400'  : 'text-cyan-400';
  const accentBg= isCreatorMode ? 'bg-pink-500/10 border-pink-500/20' : 'bg-cyan-500/10 border-cyan-500/20';

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 mb-3">
        <Flame size={14} className="text-orange-400" />
        <p className={`text-xs font-bold ${accent}`}>Streaks</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(streaks) as [keyof StreakData, StreakData[keyof StreakData]][]).map(([key, val]) => (
          <div
            key={key}
            className={`p-3 rounded-xl border ${val.current > 0 ? accentBg : 'bg-white/3 border-white/8'}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base">{STREAK_LABELS[key].icon}</span>
              <span className={`text-[10px] font-bold ${val.current > 0 ? accent : 'text-gray-600'}`}>
                {getStreakEmoji(val.current)}
              </span>
            </div>
            <p className={`text-lg font-black ${val.current > 0 ? 'text-white' : 'text-gray-600'}`}>
              {val.current}
              <span className="text-[10px] font-normal text-gray-500 ml-1">days</span>
            </p>
            <p className="text-[10px] text-gray-500">{STREAK_LABELS[key].label}</p>
            {val.best > 0 && (
              <p className="text-[9px] text-gray-600 mt-0.5">best: {val.best}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
