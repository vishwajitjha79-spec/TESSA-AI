'use client';

import { useState } from 'react';
import { BookOpen, Calendar, Dumbbell, X } from 'lucide-react';
import ExamPlanner from './ExamPlanner';
import DayPlanner from './DayPlanner';
import WorkoutPlanner from './WorkoutPlanner';

type PlannerType = 'exam' | 'day' | 'workout' | null;

interface PlannerHubProps {
  onClose: () => void;
}

export default function PlannerHub({ onClose }: PlannerHubProps) {
  const [activePlanner, setActivePlanner] = useState<PlannerType>(null);

  if (activePlanner === 'exam') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen p-4">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setActivePlanner(null)}
              className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2"
            >
              ← Back to Planners
            </button>
            <ExamPlanner />
          </div>
        </div>
      </div>
    );
  }

  if (activePlanner === 'day') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen p-4">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setActivePlanner(null)}
              className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2"
            >
              ← Back to Planners
            </button>
            <DayPlanner />
          </div>
        </div>
      </div>
    );
  }

  if (activePlanner === 'workout') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen p-4">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => setActivePlanner(null)}
              className="mb-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg flex items-center gap-2"
            >
              ← Back to Planners
            </button>
            <WorkoutPlanner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-2 border-pink-500/30 rounded-2xl p-8 max-w-4xl w-full">
        
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-pink-400 mb-2">Smart Planners</h2>
            <p className="text-gray-400">Let me help you plan everything perfectly!</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Exam Planner */}
          <button
            onClick={() => setActivePlanner('exam')}
            className="group bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-2 border-pink-500/30 hover:border-pink-500 rounded-xl p-6 transition-all hover:scale-105"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-pink-500/20 rounded-full flex items-center justify-center group-hover:bg-pink-500/30 transition-colors">
                <BookOpen size={40} className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-pink-400 mb-2">Exam Planner</h3>
                <p className="text-sm text-gray-400">
                  Create personalized study schedules for your exams
                </p>
              </div>
              <div className="w-full pt-4 border-t border-pink-500/20">
                <p className="text-xs text-pink-300">
                  ✨ AI-powered study plans
                </p>
              </div>
            </div>
          </button>

          {/* Day Planner */}
          <button
            onClick={() => setActivePlanner('day')}
            className="group bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-2 border-purple-500/30 hover:border-purple-500 rounded-xl p-6 transition-all hover:scale-105"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
                <Calendar size={40} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-purple-400 mb-2">Day Planner</h3>
                <p className="text-sm text-gray-400">
                  Organize your daily routine hour by hour
                </p>
              </div>
              <div className="w-full pt-4 border-t border-purple-500/20">
                <p className="text-xs text-purple-300">
                  ⏰ Time-optimized schedules
                </p>
              </div>
            </div>
          </button>

          {/* Workout Planner */}
          <button
            onClick={() => setActivePlanner('workout')}
            className="group bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-2 border-blue-500/30 hover:border-blue-500 rounded-xl p-6 transition-all hover:scale-105"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <Dumbbell size={40} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-blue-400 mb-2">Workout Planner</h3>
                <p className="text-sm text-gray-400">
                  Generate custom fitness routines for your goals
                </p>
              </div>
              <div className="w-full pt-4 border-t border-blue-500/20">
                <p className="text-xs text-blue-300">
                  💪 Goal-based workouts
                </p>
              </div>
            </div>
          </button>

        </div>

        <div className="mt-8 bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 text-center">
          <p className="text-sm text-pink-300">
            💝 Choose a planner and I'll create something perfect for you!
          </p>
        </div>
      </div>
    </div>
  );
}
