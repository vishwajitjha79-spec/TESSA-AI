'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';

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
            // Timer complete
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
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not available');
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setMinutes(25);
    setSeconds(0);
  };

  const formatTime = (mins: number, secs: number) => {
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    const total = isBreak ? 5 * 60 : 25 * 60;
    const current = minutes * 60 + seconds;
    return ((total - current) / total) * 100;
  };

  return (
    <div className="bg-white/5 rounded-lg p-6 border border-pink-500/20">
      <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
        <Clock size={20} />
        Study Timer
      </h3>

      <div className="text-center mb-6">
        <p className="text-sm text-gray-400 mb-2">
          {isBreak ? '☕ Break Time' : '📚 Focus Time'}
        </p>
        <p className="text-6xl font-bold text-pink-400 mb-4">
          {formatTime(minutes, seconds)}
        </p>
        
        {/* Progress circle */}
        <div className="relative w-48 h-48 mx-auto mb-4">
          <svg className="transform -rotate-90 w-48 h-48">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-700"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={553}
              strokeDashoffset={553 - (553 * getProgress()) / 100}
              className={isBreak ? 'text-green-500' : 'text-pink-500'}
            />
          </svg>
        </div>

        <div className="flex justify-center gap-3 mb-4">
          <button
            onClick={toggleTimer}
            className={`p-4 rounded-full ${
              isActive ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-pink-500 hover:bg-pink-600'
            } transition-all`}
          >
            {isActive ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button
            onClick={resetTimer}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
          >
            <RotateCcw size={24} />
          </button>
        </div>

        <div className="flex justify-center gap-2">
          {[...Array(completedPomodoros)].map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-pink-500" />
          ))}
          {completedPomodoros > 0 && (
            <p className="text-xs text-gray-400 ml-2">
              {completedPomodoros} completed today
            </p>
          )}
        </div>
      </div>

      <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3">
        <p className="text-xs text-pink-300 text-center">
          💡 Tip: 25 min focus + 5 min break = 1 Pomodoro
        </p>
      </div>
    </div>
  );
}
