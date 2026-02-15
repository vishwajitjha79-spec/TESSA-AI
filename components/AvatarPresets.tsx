'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';

interface AvatarPresetsProps {
  currentAvatar: string;
  onAvatarChange: (avatarPath: string) => void;
  onClose: () => void;
}

// These filenames match what you'll upload to /public/avatars/
const AVATAR_PRESETS = [
  {
    id: 'cosmic',
    name: 'Cosmic',
    path: '/avatars/cosmic.png',
    description: 'Purple nebula with stars'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    path: '/avatars/ocean.png',
    description: 'Deep blue waves'
  },
  {
    id: 'sunset',
    name: 'Sunset',
    path: '/avatars/sunset.png',
    description: 'Orange-pink gradient'
  },
  {
    id: 'forest',
    name: 'Forest',
    path: '/avatars/forest.png',
    description: 'Green nature theme'
  },
  {
    id: 'galaxy',
    name: 'Galaxy',
    path: '/avatars/galaxy.png',
    description: 'Multi-color stars'
  }
];

export default function AvatarPresets({ currentAvatar, onAvatarChange, onClose }: AvatarPresetsProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(currentAvatar);

  const handleSelect = (path: string) => {
    setSelectedAvatar(path);
  };

  const handleSave = () => {
    onAvatarChange(selectedAvatar);
    localStorage.setItem('tessa-avatar-preset', selectedAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-pink-500/30 rounded-2xl p-6 max-w-2xl w-full">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-pink-400">Choose T.E.S.S.A.'s Avatar</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-6 text-center">
          Select a beautiful preset for T.E.S.S.A.'s appearance
        </p>

        {/* Avatar Grid */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {AVATAR_PRESETS.map((avatar) => (
            <div
              key={avatar.id}
              onClick={() => handleSelect(avatar.path)}
              className={`relative cursor-pointer transition-all ${
                selectedAvatar === avatar.path
                  ? 'ring-4 ring-pink-500 scale-105'
                  : 'ring-2 ring-pink-500/20 hover:ring-pink-500/50'
              } rounded-xl overflow-hidden`}
            >
              <div className="aspect-square bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center relative">
                <img 
                  src={avatar.path} 
                  alt={avatar.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if image not found
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                    }
                  }}
                />
                {/* Fallback placeholder */}
                <div className="absolute inset-0 items-center justify-center text-4xl hidden">
                  {avatar.id === 'cosmic' && '🌌'}
                  {avatar.id === 'ocean' && '🌊'}
                  {avatar.id === 'sunset' && '🌅'}
                  {avatar.id === 'forest' && '🌲'}
                  {avatar.id === 'galaxy' && '✨'}
                </div>
                
                {selectedAvatar === avatar.path && (
                  <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
                    <div className="bg-pink-500 rounded-full p-2">
                      <Check size={24} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-2 bg-black/50 text-center">
                <p className="text-xs font-bold text-white">{avatar.name}</p>
                <p className="text-xs text-gray-400 truncate">{avatar.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div className="mb-6 p-4 bg-pink-500/10 border border-pink-500/30 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-pink-500">
              <img 
                src={selectedAvatar} 
                alt="Preview" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-pink-300 font-bold">Preview</p>
              <p className="text-xs text-gray-400">
                This will be T.E.S.S.A.'s avatar in the app
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} />
            Save Avatar
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg font-bold transition-all"
          >
            Cancel
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your choice is saved locally in your browser
        </p>
      </div>
    </div>
  );
}
