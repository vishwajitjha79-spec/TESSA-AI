'use client';

import { useState } from 'react';
import { BookOpen, Calendar, Dumbbell, X, ChevronLeft } from 'lucide-react';
import ExamPlanner from './ExamPlanner';
import DayPlanner from './DayPlanner';
import WorkoutPlanner from './WorkoutPlanner';

type PlannerType = 'exam' | 'day' | 'workout' | null;

interface PlannerHubProps {
  onClose: () => void;
}

export default function PlannerHub({ onClose }: PlannerHubProps) {
  const [activePlanner, setActivePlanner] = useState<PlannerType>(null);

  // INDIVIDUAL PLANNER VIEW (with back button)
  if (activePlanner) {
    return (
      <>
        {/* BACKDROP - Click to close */}
        <div 
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
          onClick={() => setActivePlanner(null)}
        />
        
        {/* PLANNER CONTENT */}
        <div className="fixed inset-x-0 bottom-0 md:inset-0 z-[60] flex md:items-center md:justify-center">
          <div 
            className="w-full h-[90vh] md:h-auto md:max-h-[90vh] md:max-w-5xl 
                       bg-[#0a0c1d]/98 backdrop-blur-2xl
                       border-t md:border border-white/10 
                       rounded-t-3xl md:rounded-3xl 
                       shadow-2xl
                       flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER - Fixed at top */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6 py-3 md:py-4 
                            border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-purple-500/10">
              {/* BACK BUTTON */}
              <button
                onClick={() => setActivePlanner(null)}
                className="flex items-center gap-2 px-3 py-2 
                           bg-white/10 hover:bg-white/20 
                           rounded-xl transition-all active:scale-95
                           text-white text-sm font-medium"
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Back</span>
              </button>

              <h2 className="text-base md:text-lg font-bold text-white">
                {activePlanner === 'exam' && '📚 Exam Planner'}
                {activePlanner === 'day' && '📅 Day Planner'}
                {activePlanner === 'workout' && '💪 Workout Planner'}
              </h2>

              {/* CLOSE BUTTON - Always visible */}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-10 h-10 rounded-xl 
                           bg-red-500/20 hover:bg-red-500/30 
                           border border-red-500/30
                           flex items-center justify-center
                           transition-all active:scale-95"
              >
                <X size={20} className="text-red-400" />
              </button>
            </div>

            {/* SCROLLABLE CONTENT */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-6">
              {activePlanner === 'exam' && <ExamPlanner />}
              {activePlanner === 'day' && <DayPlanner />}
              {activePlanner === 'workout' && <WorkoutPlanner />}
            </div>
          </div>
        </div>
      </>
    );
  }

  // MAIN SELECTION VIEW (Choose planner)
  return (
    <>
      {/* BACKDROP - Click to close */}
      <div 
        className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* MODAL */}
      <div className="fixed inset-x-0 bottom-0 md:inset-0 z-[60] flex md:items-center md:justify-center p-0 md:p-4">
        <div 
          className="w-full md:max-w-4xl
                     bg-[#0a0c1d]/98 backdrop-blur-2xl
                     border-t md:border border-white/10 
                     rounded-t-3xl md:rounded-3xl 
                     shadow-2xl
                     max-h-[90vh] overflow-hidden
                     flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-8 py-4 md:py-6 
                          border-b border-white/10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text 
                             bg-gradient-to-r from-pink-400 to-purple-400">
                Smart Planners
              </h2>
              <p className="text-sm md:text-base text-gray-400 mt-1">
                Let me help you plan everything perfectly!
              </p>
            </div>
            
            {/* CLOSE BUTTON - Large touch target */}
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 rounded-xl 
                         bg-white/10 hover:bg-white/20 
                         flex items-center justify-center
                         transition-all active:scale-95"
            >
              <X size={20} className="text-white" />
            </button>
          </div>

          {/* PLANNER CARDS - Scrollable */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 md:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              
              {/* EXAM PLANNER */}
              <button
                onClick={() => setActivePlanner('exam')}
                className="group bg-gradient-to-br from-pink-500/10 to-pink-500/5 
                           border-2 border-pink-500/30 hover:border-pink-500 
                           rounded-2xl p-6 
                           transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 
                                  bg-pink-500/20 rounded-full 
                                  flex items-center justify-center 
                                  group-hover:bg-pink-500/30 transition-colors">
                    <BookOpen size={32} className="text-pink-400 md:w-10 md:h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-pink-400 mb-2">
                      Exam Planner
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400">
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

              {/* DAY PLANNER */}
              <button
                onClick={() => setActivePlanner('day')}
                className="group bg-gradient-to-br from-purple-500/10 to-purple-500/5 
                           border-2 border-purple-500/30 hover:border-purple-500 
                           rounded-2xl p-6 
                           transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 
                                  bg-purple-500/20 rounded-full 
                                  flex items-center justify-center 
                                  group-hover:bg-purple-500/30 transition-colors">
                    <Calendar size={32} className="text-purple-400 md:w-10 md:h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-purple-400 mb-2">
                      Day Planner
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400">
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

              {/* WORKOUT PLANNER */}
              <button
                onClick={() => setActivePlanner('workout')}
                className="group bg-gradient-to-br from-blue-500/10 to-blue-500/5 
                           border-2 border-blue-500/30 hover:border-blue-500 
                           rounded-2xl p-6 
                           transition-all hover:scale-[1.02] active:scale-95"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 
                                  bg-blue-500/20 rounded-full 
                                  flex items-center justify-center 
                                  group-hover:bg-blue-500/30 transition-colors">
                    <Dumbbell size={32} className="text-blue-400 md:w-10 md:h-10" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-blue-400 mb-2">
                      Workout Planner
                    </h3>
                    <p className="text-xs md:text-sm text-gray-400">
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

            {/* FOOTER TIP */}
            <div className="mt-6 bg-pink-500/10 border border-pink-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-pink-300">
                💝 Choose a planner and I'll create something perfect for you!
              </p>
            </div>

            {/* BOTTOM SPACING for mobile safe area */}
            <div className="h-4 md:hidden" />
          </div>
        </div>
      </div>
    </>
  );
}
