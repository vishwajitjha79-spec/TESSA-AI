'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TESSA v7.0 — StreakDashboard.tsx (DailyWellness)
// Perfect text contrast for ALL themes: light (pastel/sakura/ankit/light)
// and dark (dark/cyberpunk/ocean/sunset)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Check, X, Droplets, Plus, Minus } from 'lucide-react';
import { getDailyWellness, addWater, type WellnessData } from '@/lib/streaks-water';

interface DailyWellnessProps {
  isCreatorMode  : boolean;
  refreshTrigger?: number;
  isLight?       : boolean;
  accentColor?   : string;
}

export default function DailyWellness({
  isCreatorMode,
  refreshTrigger,
  isLight = false,
  accentColor,
}: DailyWellnessProps) {
  const [wellness, setWellness] = useState<WellnessData | null>(null);

  const acc = accentColor ?? (isCreatorMode ? '#ec4899' : '#06b6d4');

  useEffect(() => {
    setWellness(getDailyWellness());
    const t = setInterval(() => setWellness(getDailyWellness()), 30_000);
    return () => clearInterval(t);
  }, [refreshTrigger]);

  if (!wellness) return null;

  // ── Theme-aware colour tokens ─────────────────────────────────────────────
  // Light modes (pastel, sakura, ankit, light): dark text on bright backgrounds
  // Dark modes (dark, cyberpunk, ocean, sunset): light text on dark backgrounds
  const text    = isLight ? '#111827'                  : 'rgba(255,255,255,0.92)';
  const textMid = isLight ? '#374151'                  : 'rgba(255,255,255,0.78)';
  const sub     = isLight ? '#6b7280'                  : 'rgba(255,255,255,0.48)';
  const subFade = isLight ? '#9ca3af'                  : 'rgba(255,255,255,0.28)';

  // Surfaces — solid enough to be legible, subtle enough not to overpower
  const card    = isLight ? 'rgba(255,255,255,0.68)'   : 'rgba(255,255,255,0.05)';
  const cardB   = isLight ? 'rgba(0,0,0,0.10)'         : 'rgba(255,255,255,0.09)';
  const trackBg = isLight ? 'rgba(0,0,0,0.08)'         : 'rgba(255,255,255,0.08)';

  // Done-state surfaces
  const doneCard  = isLight ? `${acc}14`               : `${acc}20`;
  const doneBorder = `${acc}38`;

  // Item label colour: dark text if light mode, light text if dark mode
  const labelDone    = isLight ? '#111827'             : '#ffffff';
  const labelNotDone = sub;

  // X icon for not-done: visible but not harsh
  const xColor = isLight ? '#d1d5db' : 'rgba(255,255,255,0.20)';

  const meals = [
    { key: 'breakfast', label: 'Breakfast', icon: '🍳', done: wellness.breakfast },
    { key: 'lunch',     label: 'Lunch',     icon: '🍱', done: wellness.lunch     },
    { key: 'snacks',    label: 'Snacks',    icon: '🍪', done: wellness.snacks    },
    { key: 'dinner',    label: 'Dinner',    icon: '🍽️', done: wellness.dinner   },
  ];

  const all  = [...meals, { key: 'water', done: wellness.water >= wellness.waterGoal }, { key: 'study', done: wellness.study }];
  const done = all.filter(i => i.done).length;
  const pct  = Math.round((done / all.length) * 100);

  const handleWater = (delta: number) => {
    addWater(delta);
    setWellness(getDailyWellness());
  };

  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif' }}>

      {/* Header + overall progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: acc, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Daily Wellness
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: text }}>
          {done}/{all.length}
          <span style={{ color: sub, fontWeight: 400 }}> done</span>
        </span>
      </div>

      {/* Master progress bar */}
      <div style={{ height: 5, background: trackBg, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 99, transition: 'width 0.5s ease',
          background: pct === 100
            ? 'linear-gradient(90deg,#10b981,#34d399)'
            : `linear-gradient(90deg,${acc},${acc}99)`,
        }} />
      </div>

      {/* Meal grid — 2 × 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        {meals.map(item => (
          <div key={item.key} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 10px', borderRadius: 10,
            background: item.done ? doneCard : card,
            border: `1px solid ${item.done ? doneBorder : cardB}`,
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 10, fontWeight: 700,
                color: item.done ? labelDone : labelNotDone,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{item.label}</div>
            </div>
            {item.done
              ? <Check size={11} style={{ color: acc, flexShrink: 0 }} />
              : <X     size={11} style={{ color: xColor, flexShrink: 0 }} />
            }
          </div>
        ))}
      </div>

      {/* Water control */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '9px 11px', borderRadius: 10, marginBottom: 7,
        background: wellness.water >= wellness.waterGoal ? doneCard : card,
        border: `1px solid ${wellness.water >= wellness.waterGoal ? doneBorder : cardB}`,
      }}>
        <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>💧</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700,
            color: wellness.water >= wellness.waterGoal ? labelDone : labelNotDone,
          }}>
            Water
          </div>
          <div style={{ fontSize: 9, color: sub, marginTop: 1.5 }}>
            {wellness.water} / {wellness.waterGoal} glasses
          </div>
        </div>
        {/* Water track */}
        <div style={{ width: 50, height: 4, background: trackBg, borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
          <div style={{
            height: '100%', borderRadius: 99, background: '#60a5fa',
            width: `${Math.min(100, (wellness.water / wellness.waterGoal) * 100)}%`,
            transition: 'width 0.3s',
          }} />
        </div>
        <button onClick={() => handleWater(-1)} disabled={wellness.water <= 0}
          style={{
            width: 22, height: 22, borderRadius: 7, border: `1px solid ${cardB}`,
            background: card, color: sub, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, opacity: wellness.water <= 0 ? 0.30 : 1,
          }}>
          <Minus size={10} />
        </button>
        <button onClick={() => handleWater(1)}
          style={{
            width: 22, height: 22, borderRadius: 7, border: `1px solid ${acc}40`,
            background: `${acc}18`, color: acc, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
          <Plus size={10} />
        </button>
      </div>

      {/* Study */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '8px 11px', borderRadius: 10, marginBottom: 10,
        background: wellness.study ? doneCard : card,
        border: `1px solid ${wellness.study ? doneBorder : cardB}`,
      }}>
        <span style={{ fontSize: 15 }}>📚</span>
        <span style={{
          fontSize: 10, fontWeight: 700, flex: 1,
          color: wellness.study ? labelDone : labelNotDone,
        }}>
          Study session
        </span>
        {wellness.study
          ? <Check size={11} style={{ color: acc }} />
          : <X     size={11} style={{ color: xColor }} />
        }
      </div>

      {/* Calories */}
      {wellness.calories > 0 && (
        <div style={{
          padding: '10px 11px', borderRadius: 10,
          background: card, border: `1px solid ${cardB}`,
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 9, color: sub, marginBottom: 3, fontWeight: 600 }}>Calories today</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: acc, lineHeight: 1 }}>
                {wellness.calories.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 22 }}>🔥</span>
              <div style={{ fontSize: 9, color: sub, marginTop: 3 }}>
                {wellness.calories > 2200 ? `${wellness.calories - 2200} over` : `${2200 - wellness.calories} left`}
              </div>
            </div>
          </div>
          {/* Mini calorie bar */}
          <div style={{ height: 4, background: trackBg, borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min(100, (wellness.calories / 2200) * 100)}%`,
              background: wellness.calories > 2200 ? '#ef4444'
                : wellness.calories > 1800 ? '#f97316'
                : `linear-gradient(90deg,${acc},${acc}99)`,
              transition: 'width 0.4s',
            }} />
          </div>
        </div>
      )}

      {/* Perfect day banner */}
      {done === all.length && (
        <div style={{
          padding: '9px 11px', borderRadius: 10,
          background: `linear-gradient(135deg,${acc}22,${acc}0c)`,
          border: `1px solid ${acc}35`, textAlign: 'center',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: isLight ? '#1f2937' : acc }}>
            🎉 Perfect day. Really proud of you.
          </span>
        </div>
      )}

      {/* Version footer */}
      <div style={{ marginTop: 10, textAlign: 'right' }}>
        <span style={{ fontSize: 8, color: subFade, fontWeight: 600, letterSpacing: '0.05em' }}>
          TESSA v7.0
        </span>
      </div>
    </div>
  );
}
