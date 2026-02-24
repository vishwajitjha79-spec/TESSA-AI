'use client';

import { useState, useEffect } from 'react';
import { Check, X, Droplets, BookOpen, Utensils } from 'lucide-react';
import { getDailyWellness, type WellnessData } from '@/lib/streaks-water';

interface DailyWellnessProps {
  isCreatorMode: boolean;
  refreshTrigger?: number;
}

export default function DailyWellness({ isCreatorMode, refreshTrigger }: DailyWellnessProps) {
  const [wellness, setWellness] = useState<WellnessData | null>(null);

  useEffect(() => {
    setWellness(getDailyWellness());
    const interval = setInterval(() => setWellness(getDailyWellness()), 60_000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  if (!wellness) return null;

  const accent = isCreatorMode ? 'text-pink-400' : 'text-cyan-400';
  const accentBg = isCreatorMode ? 'bg-pink-500/10 border-pink-500/25' : 'bg-cyan-500/10 border-cyan-500/25';
  const gradientFrom = isCreatorMode ? 'from-pink-500' : 'from-cyan-500';
  const gradientTo = isCreatorMode ? 'to-purple-500' : 'to-blue-500';

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
    <div className="space-y-4">
      {/* Header with Progress */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-bold ${accent}`}>✨ Daily Wellness</p>
          <p className="text-xs text-gray-500 mt-0.5">Track your daily habits</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black ${accent}`}>{completed}/{items.length}</p>
          <p className="text-xs text-gray-500">completed</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 bg-gradient-to-r ${gradientFrom} ${gradientTo}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white/80">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => (
          <div
            key={item.key}
            className={`
              relative p-3 rounded-xl border transition-all duration-300
              ${item.done 
                ? accentBg + ' scale-[1.02]'
                : 'bg-white/[0.02] border-white/[0.08] opacity-50'
              }
            `}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xl leading-none">{item.icon}</span>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                item.done 
                  ? `bg-gradient-to-br ${gradientFrom} ${gradientTo}`
                  : 'bg-white/5'
              }`}>
                {item.done ? (
                  <Check size={12} className="text-white" />
                ) : (
                  <X size={12} className="text-gray-600" />
                )}
              </div>
            </div>
            <p className={`text-xs font-medium leading-tight ${
              item.done ? 'text-white' : 'text-gray-500'
            }`}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {/* Calories Card */}
      {wellness.calories > 0 && (
        <div className={`p-3 rounded-xl border ${accentBg}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">Today's Calories</p>
              <p className={`text-2xl font-black ${accent}`}>{wellness.calories}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
              <span className="text-2xl">🔥</span>
            </div>
          </div>
        </div>
      )}

      {/* Perfect Day Message */}
      {completed === items.length && (
        <div className={`p-3 rounded-xl border text-center ${accentBg} animate-fadeIn`}>
          <p className="text-2xl mb-1">🎉</p>
          <p className={`text-xs font-bold ${accent}`}>
            Perfect day! All tasks completed!
          </p>
        </div>
      )}

      {/* Motivational Message */}
      {completed > 0 && completed < items.length && (
        <div className="text-center">
          <p className="text-xs text-gray-400">
            {completed >= 4 ? '💪 Almost there! Keep going!' : 
             completed >= 2 ? '⭐ Great progress today!' :
             '🌟 Every step counts!'}
          </p>
        </div>
      )}
    </div>
  );
}
