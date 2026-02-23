'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface StudyTimerProps {
  floating?: boolean;
  onClose?: () => void;
  defaultMinutes?: number;
}

export default function StudyTimer({ 
  floating = false, 
  onClose,
  defaultMinutes = 25 
}: StudyTimerProps) {
  const [customMinutes, setCustomMinutes] = useState(defaultMinutes);
  const [timeLeft, setTimeLeft] = useState(defaultMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            playAlarm();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const playAlarm = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = ((customMinutes * 60 - timeLeft) / (customMinutes * 60)) * 100;

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(customMinutes * 60);
  };

  const handleSetTime = (mins: number) => {
    setCustomMinutes(mins);
    setTimeLeft(mins * 60);
    setIsRunning(false);
  };

  // ═══════════════════════════════════════════════════════════════════
  // MINIMIZED FLOATING VIEW (Mobile overlay bubble)
  // ═══════════════════════════════════════════════════════════════════
  if (floating && isMinimized) {
    return (
      <div 
        className="fixed top-4 right-4 z-[100] 
                   bg-gradient-to-br from-cyan-500/95 to-blue-600/95 
                   backdrop-blur-xl
                   rounded-2xl shadow-2xl
                   px-4 py-2.5
                   flex items-center gap-3
                   animate-fadeIn
                   border border-white/20"
        style={{
          boxShadow: '0 8px 32px rgba(6, 182, 212, 0.5), 0 0 0 1px rgba(255,255,255,0.15)',
        }}
      >
        {/* EXPAND BUTTON */}
        <button 
          onClick={() => setIsMinimized(false)} 
          className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
        >
          <ChevronUp size={16} />
        </button>
        
        {/* TIME DISPLAY */}
        <div className="text-white font-mono text-lg font-bold tracking-wider">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        {/* PLAY/PAUSE */}
        {isRunning ? (
          <button 
            onClick={handlePause} 
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <Pause size={16} />
          </button>
        ) : (
          <button 
            onClick={handleStart} 
            className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
            disabled={timeLeft === 0}
          >
            <Play size={16} />
          </button>
        )}

        {/* CLOSE BUTTON */}
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // FULL VIEW (Expanded timer)
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className={floating ? 'fixed top-16 right-4 z-[100] w-80 sm:w-96 animate-fadeIn' : ''}>
      <div className={`
        rounded-2xl overflow-hidden
        ${floating 
          ? 'bg-[#0a0c1d]/98 backdrop-blur-2xl border border-white/10 shadow-2xl' 
          : 'bg-white/5 border border-white/10'}
      `}>
        {/* HEADER (only for floating) */}
        {floating && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10
                          bg-gradient-to-r from-cyan-500/10 to-blue-600/10">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-cyan-400" />
              <span className="text-cyan-400 text-sm font-bold">Study Timer</span>
            </div>
            <div className="flex items-center gap-2">
              {/* MINIMIZE BUTTON */}
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                title="Minimize"
              >
                <ChevronDown size={16} />
              </button>
              {/* CLOSE BUTTON */}
              {onClose && (
                <button 
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  title="Close"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* TIMER CONTENT */}
        <div className="p-6">
          {/* PROGRESS RING */}
          <div className="relative w-40 h-40 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="url(#timerGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 70}`}
                strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
                className="transition-all duration-300"
              />
              <defs>
                <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* TIME TEXT */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl font-mono font-bold text-white tabular-nums">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  {isRunning ? '⏱️ Running...' : timeLeft === 0 ? '✅ Complete!' : '⏸️ Ready'}
                </div>
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {/* PLAY/PAUSE */}
            {isRunning ? (
              <button
                onClick={handlePause}
                className="w-14 h-14 rounded-2xl 
                           bg-orange-500/20 hover:bg-orange-500/30 
                           border border-orange-500/30 
                           flex items-center justify-center
                           transition-all active:scale-95
                           shadow-lg shadow-orange-500/20"
              >
                <Pause size={24} className="text-orange-400" />
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={timeLeft === 0}
                className="w-14 h-14 rounded-2xl 
                           bg-cyan-500/20 hover:bg-cyan-500/30 
                           border border-cyan-500/30 
                           flex items-center justify-center
                           transition-all active:scale-95 
                           disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-lg shadow-cyan-500/20"
              >
                <Play size={24} className="text-cyan-400 ml-1" />
              </button>
            )}
            
            {/* RESET */}
            <button
              onClick={handleReset}
              className="w-14 h-14 rounded-2xl 
                         bg-white/5 hover:bg-white/10 
                         border border-white/10 
                         flex items-center justify-center
                         transition-all active:scale-95"
            >
              <RotateCcw size={20} className="text-white/60" />
            </button>
          </div>

          {/* QUICK TIME PRESETS */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[15, 25, 45, 60].map(mins => (
              <button
                key={mins}
                onClick={() => handleSetTime(mins)}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all active:scale-95
                  ${customMinutes === mins 
                    ? 'bg-cyan-500/25 border-2 border-cyan-400/50 text-cyan-400 shadow-lg shadow-cyan-500/20' 
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }`}
              >
                {mins}m
              </button>
            ))}
          </div>

          {/* CUSTOM TIME INPUT */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="number"
                min="1"
                max="180"
                value={customMinutes}
                onChange={e => {
                  const val = parseInt(e.target.value) || 1;
                  setCustomMinutes(Math.min(Math.max(val, 1), 180));
                }}
                className="w-full px-4 py-2.5 rounded-xl 
                           bg-white/5 border border-white/10
                           text-white text-sm text-center font-mono
                           focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/10
                           outline-none transition-all"
                placeholder="Minutes"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs pointer-events-none">
                min
              </div>
            </div>
            <button
              onClick={() => handleSetTime(customMinutes)}
              className="px-5 py-2.5 rounded-xl 
                         bg-gradient-to-r from-cyan-500/20 to-blue-600/20 
                         border border-cyan-500/30
                         text-cyan-400 text-sm font-bold
                         hover:from-cyan-500/30 hover:to-blue-600/30 
                         transition-all active:scale-95
                         shadow-lg shadow-cyan-500/10"
            >
              Set
            </button>
          </div>

          {/* TIP */}
          <div className="mt-4 text-center">
            <p className="text-xs text-white/40">
              💡 Tip: Use the minimize button to overlay on other apps
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
