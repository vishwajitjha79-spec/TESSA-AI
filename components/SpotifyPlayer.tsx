'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play, Pause, SkipForward, SkipBack,
  Volume2, VolumeX, ExternalLink, Music, Loader2, X
} from 'lucide-react';
import type { SpotifyTrack } from '@/app/api/spotify/search/route';

interface SpotifyPlayerProps {
  isCreatorMode   : boolean;
  initialQuery   ?: string;          // passed from chat command
  onClose        ?: () => void;
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function SpotifyPlayer({
  isCreatorMode,
  initialQuery,
  onClose,
}: SpotifyPlayerProps) {

  const [query,        setQuery]        = useState(initialQuery ?? '');
  const [tracks,       setTracks]       = useState<SpotifyTrack[]>([]);
  const [current,      setCurrent]      = useState<SpotifyTrack | null>(null);
  const [isSearching,  setIsSearching]  = useState(false);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [progress,     setProgress]     = useState(0);       // 0–1
  const [elapsed,      setElapsed]      = useState(0);       // ms
  const [volume,       setVolume]       = useState(0.8);
  const [muted,        setMuted]        = useState(false);
  const [noPreview,    setNoPreview]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const audioRef      = useRef<HTMLAudioElement | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimer   = useRef<ReturnType<typeof setTimeout>  | null>(null);

  // ── Auto-search when initialQuery arrives ──────────────────────────────────
  useEffect(() => {
    if (initialQuery) search(initialQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // ── Clean up on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (progressTimer.current) clearInterval(progressTimer.current);
      if (searchTimer.current)   clearTimeout(searchTimer.current);
    };
  }, []);

  // ── Apply volume / mute ────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // ── Search ─────────────────────────────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setError(null);
    setNoPreview(false);

    try {
      const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(q)}&type=track`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);
      if (!res.ok)    throw new Error(`HTTP ${res.status}`);

      setTracks(data.tracks ?? []);

      // Auto-play first track that has a preview
      const first = (data.tracks as SpotifyTrack[]).find(t => t.previewUrl);
      if (first) playTrack(first);
      else if (data.tracks?.length) {
        setCurrent(data.tracks[0]);
        setNoPreview(true);
      }
    } catch (err: any) {
      setError(err.message ?? 'Search failed');
    } finally {
      setIsSearching(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search on input change (500 ms)
  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (val.trim().length > 1) search(val);
    }, 500);
  };

  // ── Play a track ───────────────────────────────────────────────────────────
  const playTrack = (track: SpotifyTrack) => {
    setNoPreview(false);
    setCurrent(track);

    if (!track.previewUrl) {
      setNoPreview(true);
      setIsPlaying(false);
      return;
    }

    // Stop previous
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (progressTimer.current) clearInterval(progressTimer.current);

    const audio = new Audio(track.previewUrl);
    audio.volume = muted ? 0 : volume;
    audioRef.current = audio;

    audio.play().then(() => {
      setIsPlaying(true);
      setProgress(0);
      setElapsed(0);

      // Progress ticker
      progressTimer.current = setInterval(() => {
        if (!audio.paused) {
          const pct = audio.currentTime / audio.duration;
          setProgress(isNaN(pct) ? 0 : pct);
          setElapsed(audio.currentTime * 1000);
        }
      }, 500);

      // Auto-advance
      audio.onended = () => {
        setIsPlaying(false);
        setProgress(1);
        if (progressTimer.current) clearInterval(progressTimer.current);
        // Auto-play next track
        const idx = tracks.findIndex(t => t.id === track.id);
        const next = tracks.slice(idx + 1).find(t => t.previewUrl);
        if (next) playTrack(next);
      };
    }).catch(() => {
      setNoPreview(true);
      setIsPlaying(false);
    });
  };

  // ── Playback controls ──────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current || !current?.previewUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const skipNext = () => {
    if (!current) return;
    const idx  = tracks.findIndex(t => t.id === current.id);
    const next = tracks[idx + 1];
    if (next) playTrack(next);
  };

  const skipPrev = () => {
    if (!current) return;
    const idx  = tracks.findIndex(t => t.id === current.id);
    const prev = tracks[idx - 1];
    if (prev) playTrack(prev);
  };

  const seek = (pct: number) => {
    if (!audioRef.current?.duration) return;
    audioRef.current.currentTime = pct * audioRef.current.duration;
    setProgress(pct);
  };

  // ── Colours ────────────────────────────────────────────────────────────────
  const accent = isCreatorMode ? 'text-pink-400' : 'text-green-400';
  const accentBg = isCreatorMode ? 'bg-pink-500' : 'bg-green-500';
  const accentBorder = isCreatorMode ? 'border-pink-500/40' : 'border-green-500/40';
  const accentSoft = isCreatorMode ? 'bg-pink-500/15 hover:bg-pink-500/25' : 'bg-green-500/15 hover:bg-green-500/25';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={`
      rounded-2xl border ${accentBorder} overflow-hidden
      bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl
      w-full max-w-sm shadow-2xl
    `}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Music size={15} className={accent} />
          <span className={`text-xs font-bold ${accent}`}>Spotify</span>
          <span className="text-[10px] text-gray-500 border border-white/10 px-1.5 rounded-full">30s preview</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search(query)}
            placeholder="Search songs, artists…"
            className="w-full px-3 py-2 pr-8 rounded-lg bg-white/8 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 transition-all"
          />
          {isSearching && (
            <Loader2 size={14} className="absolute right-2.5 top-2.5 text-gray-400 animate-spin" />
          )}
        </div>
        {error && (
          <div className="px-4 pb-3">
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
              ⚠️ {error}
            </p>
            <button
              onClick={async () => {
                const res = await fetch('/api/spotify/search?debug=1');
                const d = await res.json();
                setError(JSON.stringify(d, null, 2));
              }}
              className="mt-1.5 text-[10px] text-gray-500 hover:text-white underline"
            >
              Run diagnostics
            </button>
          </div>
        )}
      </div>

      {/* Now playing */}
      {current && (
        <div className="px-4 pb-3">
          <div className="flex gap-3 mb-3">
            {/* Album art */}
            <div className="relative flex-shrink-0">
              <img
                src={current.albumArt}
                alt={current.album}
                className={`w-14 h-14 rounded-lg object-cover border ${accentBorder} ${isPlaying ? 'animate-pulse-slow' : ''}`}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex gap-0.5 items-end h-4">
                    {[1,2,3].map(i => (
                      <div
                        key={i}
                        className={`w-1 rounded-full ${accentBg} animate-bounce`}
                        style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{current.name}</p>
              <p className="text-xs text-gray-400 truncate">{current.artists.join(', ')}</p>
              <p className="text-[10px] text-gray-500 truncate">{current.album}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-500">{formatMs(current.durationMs)}</span>
                <a
                  href={current.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-[10px] ${accent} flex items-center gap-0.5 hover:underline`}
                >
                  Open Spotify <ExternalLink size={9} />
                </a>
              </div>
            </div>
          </div>

          {/* No preview notice */}
          {noPreview && (
            <p className="text-[10px] text-yellow-400 mb-2 text-center">
              ⚠️ No 30s preview available — open Spotify to listen
            </p>
          )}

          {/* Progress bar */}
          {!noPreview && (
            <div className="mb-2">
              <div
                className="relative h-1.5 bg-white/10 rounded-full cursor-pointer group"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  seek((e.clientX - rect.left) / rect.width);
                }}
              >
                <div
                  className={`h-full ${accentBg} rounded-full transition-all`}
                  style={{ width: `${progress * 100}%` }}
                />
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 ${accentBg} rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg`}
                  style={{ left: `calc(${progress * 100}% - 6px)` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>{formatMs(elapsed)}</span>
                <span>0:30</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={skipPrev}
                disabled={tracks.findIndex(t => t.id === current.id) === 0}
                className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                <SkipBack size={16} />
              </button>

              <button
                onClick={togglePlay}
                disabled={noPreview}
                className={`
                  p-2.5 rounded-full ${accentBg} disabled:opacity-40
                  hover:scale-105 active:scale-95 transition-all shadow-lg
                `}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <button
                onClick={skipNext}
                disabled={tracks.findIndex(t => t.id === current.id) >= tracks.length - 1}
                className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30 transition-all"
              >
                <SkipForward size={16} />
              </button>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setMuted(m => !m)} className="text-gray-400 hover:text-white transition-colors">
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
                className="w-16 accent-green-500 cursor-pointer"
                style={{ accentColor: isCreatorMode ? '#ec4899' : '#22c55e' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Track list */}
      {tracks.length > 0 && (
        <div className="border-t border-white/8 max-h-44 overflow-y-auto">
          {tracks.map((track, i) => (
            <button
              key={track.id}
              onClick={() => playTrack(track)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all
                ${current?.id === track.id ? accentSoft : 'hover:bg-white/5'}
              `}
            >
              <img
                src={track.albumArt}
                alt=""
                className="w-9 h-9 rounded object-cover flex-shrink-0"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${current?.id === track.id ? accent : 'text-white'}`}>
                  {track.name}
                </p>
                <p className="text-[10px] text-gray-500 truncate">{track.artists.join(', ')}</p>
              </div>
              {!track.previewUrl && (
                <span className="text-[9px] text-yellow-500 flex-shrink-0">no preview</span>
              )}
              {current?.id === track.id && isPlaying && (
                <div className="flex gap-0.5 items-end h-3 flex-shrink-0">
                  {[1,2,3].map(j => (
                    <div key={j} className={`w-0.5 ${accentBg} animate-bounce rounded-full`}
                      style={{ height: `${4 + j * 3}px`, animationDelay: `${j * 0.1}s` }} />
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isSearching && tracks.length === 0 && !error && (
        <div className="px-4 pb-4 text-center">
          <Music size={28} className="text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Search for any song!</p>
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {['One Dance', 'Blinding Lights', 'Kesariya', 'Tum Hi Ho'].map(s => (
              <button
                key={s}
                onClick={() => { setQuery(s); search(s); }}
                className="text-[10px] px-2 py-1 rounded-full bg-white/8 hover:bg-white/15 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
