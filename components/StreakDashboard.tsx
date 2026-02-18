'use client';

import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { getDailyWellness, type WellnessData } from '@/lib/streaks-water';

interface DailyWellnessProps {
  isCreatorMode: boolean;
  refreshTrigger?: number; // NEW: triggers re-render when wellness data changes
}

export default function DailyWellness({ isCreatorMode, refreshTrigger }: DailyWellnessProps) {
  const [wellness, setWellness] = useState<WellnessData | null>(null);

  useEffect(() => {
    setWellness(getDailyWellness());
    const interval = setInterval(() => setWellness(getDailyWellness()), 60_000);
    return () => clearInterval(interval);
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  if (!wellness) return null;

  const accent = isCreatorMode ? 'text-pink-400' : 'text-cyan-400';
  const accentBg = isCreatorMode ? 'bg-pink-500/10 border-pink-500/25' : 'bg-cyan-500/10 border-cyan-500/25';

  const items = [
    { key: 'breakfast', label: 'Breakfast', icon: '🍳', done: wellness.breakfast },
    { key: 'lunch',     label: 'Lunch',     icon: '🍱', done: wellness.lunch },
    { key: 'snacks',    label: 'Snacks',    icon: '🍪', done: wellness.snacks },
    { key: 'dinner',    label: 'Dinner',    icon: '🍽️', done: wellness.dinner },
    { key: 'water',     label: `Water ${wellness.water}/${wellness.waterGoal}`, icon: '💧', done: wellness.water >= wellness.waterGoal },
    { key: 'study',     label: 'Study',     icon: '📚', done: wellness.study },
  ];

  const completed = items.filter(i => i.done).length;
  const progress = (completed / items.length) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold ${accent}`}>✨ Daily Wellness</p>
        <span className={`text-[10px] font-semibold ${accent}`}>
          {completed}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isCreatorMode ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <div
            key={item.key}
            className={`
              p-2.5 rounded-lg border transition-all
              ${item.done 
                ? accentBg 
                : 'bg-white/3 border-white/8 opacity-60'
              }
            `}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-base leading-none">{item.icon}</span>
              {item.done ? (
                <Check size={12} className={accent} />
              ) : (
                <X size={12} className="text-gray-600" />
              )}
            </div>
            <p className={`text-[10px] font-medium leading-tight ${
              item.done ? 'text-white' : 'text-gray-500'
            }`}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Calories if any */}
      {wellness.calories > 0 && (
        <div className={`p-2.5 rounded-lg border ${accentBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400">Today's Calories</p>
              <p className={`text-lg font-black ${accent}`}>{wellness.calories}</p>
            </div>
            <span className="text-2xl">🔥</span>
          </div>
        </div>
      )}

      {/* Perfect day message */}
      {completed === items.length && (
        <div className={`p-2.5 rounded-lg border text-center ${accentBg}`}>
          <p className={`text-xs font-semibold ${accent}`}>
            🎉 Perfect day! So proud of you! 💝
          </p>
        </div>
      )}
    </div>
  );
}
