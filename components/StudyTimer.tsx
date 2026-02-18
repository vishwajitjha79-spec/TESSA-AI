'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function StudyTimer() {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            playSound();
            if (isBreak) {
              setIsBreak(false);
              setMinutes(25);
              setIsActive(false);
            } else {
              setCompletedPomodoros(prev => prev + 1);
              setIsBreak(true);
              setMinutes(5);
            }
            setSeconds(0);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, minutes, seconds, isBreak]);

  const playSound = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const formatTime = (mins: number, secs: number) =>
    `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const getProgress = () => {
    const total = isBreak ? 5 * 60 : 25 * 60;
    const current = minutes * 60 + seconds;
    return ((total - current) / total) * 100;
  };

  const circumference = 2 * Math.PI * 52; // radius 52

  return (
    <div className="flex flex-col items-center">
      {/* Compact timer display */}
      <div className="relative w-32 h-32 mb-3">
        <svg className="transform -rotate-90 w-32 h-32">
          <circle
            cx="64" cy="64" r="52"
            stroke="currentColor" strokeWidth="6" fill="transparent"
            className="text-gray-700/30"
          />
          <circle
            cx="64" cy="64" r="52"
            stroke="currentColor" strokeWidth="6" fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * getProgress()) / 100}
            className={isBreak ? 'text-green-500' : 'text-pink-500'}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        
        {/* Time in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-pink-400 leading-none">
            {formatTime(minutes, seconds)}
          </p>
          <p className="text-[9px] text-gray-500 mt-1">
            {isBreak ? '☕ Break' : '📚 Focus'}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={toggleTimer}
          className={`p-2.5 rounded-full transition-all ${
            isActive 
              ? 'bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400' 
              : 'bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-400'
          }`}
          title={isActive ? 'Pause' : 'Start'}
        >
          {isActive ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={resetTimer}
          className="p-2.5 rounded-full bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600/40 text-gray-400 transition-all"
          title="Reset"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Pomodoro dots */}
      {completedPomodoros > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {[...Array(Math.min(completedPomodoros, 8))].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            ))}
          </div>
          <p className="text-[10px] text-gray-500">
            {completedPomodoros} today
          </p>
        </div>
      )}

      {/* Tip */}
      <div className="mt-3 bg-pink-500/5 border border-pink-500/20 rounded-lg px-3 py-2">
        <p className="text-[10px] text-pink-300/80 text-center leading-snug">
          💡 25 min focus + 5 min break
        </p>
      </div>
    </div>
  );
}
