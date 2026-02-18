'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp } from 'lucide-react';
import { getDailyWellness } from '@/lib/streaks-water';

interface InsightsProps {
  isCreatorMode: boolean;
}

export default function TessaInsights({ isCreatorMode }: InsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);

  useEffect(() => {
    generateInsights();
    // Refresh insights every 5 minutes
    const interval = setInterval(generateInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const generateInsights = () => {
    const wellness = getDailyWellness();
    const newInsights: string[] = [];

    // Water pattern insight
    if (wellness.water === 0) {
      newInsights.push('💧 Haven\'t started drinking water yet — hydration affects focus!');
    } else if (wellness.water < wellness.waterGoal / 2) {
      newInsights.push('💧 Water intake tends to drop in afternoons — set a 3pm reminder!');
    } else if (wellness.water >= wellness.waterGoal) {
      newInsights.push('💧 Perfect hydration today! This consistency will boost your energy.');
    }

    // Meal completion insight
    const mealsCompleted = [wellness.breakfast, wellness.lunch, wellness.dinner].filter(Boolean).length;
    if (mealsCompleted === 3) {
      newInsights.push('🍽️ All meals completed — steady energy levels all day!');
    } else if (mealsCompleted === 0) {
      newInsights.push('🍽️ No meals logged yet — proper nutrition fuels your brain!');
    } else if (!wellness.breakfast) {
      newInsights.push('🍳 Breakfast skipped — studies show it improves morning focus by 30%!');
    }

    // Study consistency
    if (wellness.study) {
      newInsights.push('📚 Study session active! Daily consistency compounds into exam success.');
    } else {
      const hour = new Date().getHours();
      if (hour >= 19 && hour <= 23) {
        newInsights.push('📚 Evening study window open — your most productive hours are ahead!');
      }
    }

    // Calorie tracking insight
    if (wellness.calories > 0) {
      if (wellness.calories < 1200) {
        newInsights.push(`🔥 ${wellness.calories} cal logged — consider adding a healthy snack!`);
      } else if (wellness.calories > 2500) {
        newInsights.push(`🔥 ${wellness.calories} cal tracked — balanced nutrition is key!`);
      } else {
        newInsights.push(`🔥 ${wellness.calories} cal — great calorie awareness today!`);
      }
    }

    // Snack reminder
    const hour = new Date().getHours();
    if (hour >= 15 && hour <= 17 && !wellness.snacks) {
      newInsights.push('🍪 Afternoon energy dip? A healthy snack can help maintain focus!');
    }

    // Overall wellness score
    const completed = [
      wellness.breakfast,
      wellness.lunch,
      wellness.snacks,
      wellness.dinner,
      wellness.water >= wellness.waterGoal,
      wellness.study,
    ].filter(Boolean).length;

    if (completed >= 5) {
      newInsights.push('✨ Fantastic wellness day! You\'re building strong habits.');
    } else if (completed >= 3) {
      newInsights.push('💪 Good progress today — small steps lead to big changes!');
    }

    setInsights(newInsights.slice(0, 4)); // Show max 4 insights
  };

  if (insights.length === 0) return null;

  const accent = isCreatorMode ? 'text-pink-400' : 'text-cyan-400';
  const bg = isCreatorMode ? 'bg-pink-500/10 border-pink-500/25' : 'bg-cyan-500/10 border-cyan-500/25';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Brain size={14} className={accent} />
        <p className={`text-xs font-bold ${accent}`}>✨ AI Insights</p>
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`p-2.5 rounded-lg border ${bg} text-[11px] leading-relaxed animate-fadeIn`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {insight}
          </div>
        ))}
      </div>

      <div className={`text-[9px] ${accent} opacity-60 text-center pt-1`}>
        <TrendingUp size={10} className="inline mr-1" />
        Based on your patterns
      </div>
    </div>
  );
}
