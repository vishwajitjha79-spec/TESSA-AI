'use client';

import { useState, useRef } from 'react';
import { Upload, X, Check } from 'lucide-react';

interface AvatarSelectorProps {
  currentAvatar: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  onClose: () => void;
}

export default function AvatarSelector({ currentAvatar, onAvatarChange, onClose }: AvatarSelectorProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, JPEG)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);

    // Convert to base64 for localStorage
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPreview(base64);
      setUploading(false);
    };
    reader.onerror = () => {
      alert('Failed to read file');
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (preview) {
      onAvatarChange(preview);
      localStorage.setItem('tessa-avatar', preview);
      onClose();
    }
  };

  const handleReset = () => {
    setPreview(null);
    localStorage.removeItem('tessa-avatar');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-pink-500/30 rounded-2xl p-6 max-w-md w-full">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-pink-400">Choose T.E.S.S.A.'s Avatar</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div className="mb-6">
          <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-pink-500 bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
            {preview ? (
              <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="text-6xl mb-2">🌌</div>
                <p className="text-xs text-gray-400">No avatar</p>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4 mb-4">
          <p className="text-sm text-pink-300 mb-2">📸 Upload Guidelines:</p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• PNG or JPG format</li>
            <li>• Maximum 5MB file size</li>
            <li>• Square images work best</li>
            <li>• Will be displayed as circle</li>
          </ul>
        </div>

        {/* Upload Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-4 py-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload size={20} />
            {uploading ? 'Processing...' : 'Upload Image'}
          </button>

          {preview && (
            <>
              <button
                onClick={handleSave}
                className="w-full px-4 py-3 bg-pink-500 hover:bg-pink-600 rounded-lg font-bold transition-all flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Save Avatar
              </button>

              <button
                onClick={handleReset}
                className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded-lg font-bold transition-all text-sm"
              >
                Reset to Default
              </button>
            </>
          )}
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-4 text-center">
          Your avatar is stored locally in your browser
        </p>
      </div>
    </div>
  );
}
