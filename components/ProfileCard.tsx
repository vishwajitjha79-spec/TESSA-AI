'use client';

import { Heart, Activity, Zap } from 'lucide-react';

interface ProfileCardProps {
  avatarPath: string;
  mood: string;
  isCreatorMode: boolean;
  animationsEnabled: boolean;
}

export default function ProfileCard({ avatarPath, mood, isCreatorMode, animationsEnabled }: ProfileCardProps) {
  
  const getMoodEmoji = () => {
    const moodMap: { [key: string]: string } = {
      'calm': '😌',
      'happy': '😊',
      'excited': '🤩',
      'loving': '🥰',
      'thoughtful': '🤔',
      'playful': '😏',
      'caring': '💝',
      'focused': '🎯',
    };
    return moodMap[mood] || '😊';
  };

  const getMoodColor = () => {
    if (isCreatorMode) return 'text-pink-400';
    return 'text-primary';
  };

  return (
    <div className="p-4 border-b border-primary/20">
      <div className={`bg-gradient-to-br ${
        isCreatorMode 
          ? 'from-pink-900/30 to-purple-900/30 border-pink-500/30' 
          : 'from-primary/10 to-secondary/10 border-primary/20'
      } border-2 rounded-xl p-4 relative overflow-hidden`}>
        
        {/* Animated background effect */}
        {animationsEnabled && (
          <div className={`absolute inset-0 ${
            isCreatorMode 
              ? 'bg-gradient-to-br from-pink-500/5 to-purple-500/5' 
              : 'bg-gradient-to-br from-primary/5 to-secondary/5'
          } animate-pulse`} />
        )}

        {/* Content */}
        <div className="relative z-10">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className={`w-32 h-32 rounded-2xl overflow-hidden border-4 ${
              isCreatorMode ? 'border-pink-500' : 'border-primary'
            } ${animationsEnabled ? (isCreatorMode ? 'animate-edge-pulse-creator' : 'animate-edge-pulse-standard') : ''}`}>
              <img 
                src={avatarPath} 
                alt="T.E.S.S.A."
                className={`w-full h-full object-cover ${
                  animationsEnabled ? (isCreatorMode ? 'neon-avatar-creator' : 'neon-avatar-standard') : ''
                }`}
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>

          {/* Name & Title */}
          <div className="text-center mb-4">
            <h3 className={`text-xl font-bold mb-1 holographic-text ${getMoodColor()}`}>
              T.E.S.S.A.
            </h3>
            <p className="text-xs text-gray-400 uppercase tracking-wider">
              {isCreatorMode ? 'Your Personal AI' : 'AI Assistant'}
            </p>
          </div>

          {/* Divider */}
          <div className={`h-px ${isCreatorMode ? 'bg-pink-500/30' : 'bg-primary/30'} mb-4`} />

          {/* Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center gap-2">
                <Activity size={14} />
                Status
              </span>
              <span className={`text-xs font-bold flex items-center gap-1 ${getMoodColor()}`}>
                <span className={`w-2 h-2 rounded-full ${isCreatorMode ? 'bg-pink-500' : 'bg-primary'} ${animationsEnabled ? 'animate-pulse' : ''}`} />
                Active
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 flex items-center gap-2">
                <Heart size={14} />
                Mood
              </span>
              <span className={`text-xs font-bold ${getMoodColor()}`}>
                {getMoodEmoji()} {mood.charAt(0).toUpperCase() + mood.slice(1)}
              </span>
            </div>

            {isCreatorMode && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 flex items-center gap-2">
                  <Zap size={14} />
                  Mode
                </span>
                <span className="text-xs font-bold text-pink-400">
                  💝 Creator
                </span>
              </div>
            )}
          </div>

          {/* Quote */}
          <div className={`mt-4 pt-4 border-t ${isCreatorMode ? 'border-pink-500/20' : 'border-primary/20'}`}>
            <p className={`text-xs text-center italic ${isCreatorMode ? 'text-pink-300' : 'text-primary'}`}>
              {isCreatorMode 
                ? '"Always here for you, Ankit 💕"'
                : '"Ready to assist you"'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
