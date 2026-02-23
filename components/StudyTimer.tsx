'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, X, ChevronUp, ChevronDown } from 'lucide-react';

interface StudyTimerProps {
  floating?: boolean;
  onClose?: () => void;
  defaultMinutes?: number;
}

export default function StudyTimer({
  floating = false,
  onClose,
  defaultMinutes = 25,
}: StudyTimerProps) {
  const [customMinutes, setCustomMinutes] = useState(defaultMinutes);
  const [timeLeft,      setTimeLeft]      = useState(defaultMinutes * 60);
  const [isRunning,     setIsRunning]     = useState(false);
  const [isMinimized,   setIsMinimized]   = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) { setIsRunning(false); playAlarm(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, timeLeft]);

  const playAlarm = () => {
    try {
      const ctx = new AudioContext();
      [880, 1100, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.18);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.18);
      });
    } catch {}
  };

  const minutes     = Math.floor(timeLeft / 60);
  const seconds     = timeLeft % 60;
  const total       = customMinutes * 60;
  const progress    = total > 0 ? ((total - timeLeft) / total) * 100 : 0;
  const r           = 54;
  const circ        = 2 * Math.PI * r;
  const isComplete  = timeLeft === 0;

  // colour shifts from cyan → amber → red as timer runs down
  const pct = total > 0 ? timeLeft / total : 1;
  const arcColor = pct > 0.5
    ? '#06b6d4'   // cyan
    : pct > 0.25
    ? '#f59e0b'   // amber
    : '#ef4444';  // red

  const handleSetTime = (mins: number) => {
    setCustomMinutes(mins); setTimeLeft(mins * 60); setIsRunning(false);
  };

  // ── MINIMIZED PILL (floating only) ──────────────────────────────────────
  if (floating && isMinimized) {
    return (
      <div className="fixed top-[72px] right-4 z-[100] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(6,10,30,0.96)',
          border: `1.5px solid ${arcColor}55`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.55), 0 0 16px ${arcColor}30`,
          backdropFilter: 'blur(20px)',
          animation: 'fadeIn 0.2s ease',
        }}>
        <button onClick={() => setIsMinimized(false)}
          className="text-white/40 hover:text-white/80 transition-colors">
          <ChevronDown size={14}/>
        </button>

        {/* Mini progress ring */}
        <div className="relative w-8 h-8 flex-shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke={arcColor} strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 15}
              strokeDashoffset={2 * Math.PI * 15 * (1 - progress / 100)}
              style={{transition:'stroke-dashoffset 1s linear, stroke 1s ease'}}/>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full" style={{background:arcColor}}/>
          </div>
        </div>

        <span className="font-mono text-[15px] font-bold tracking-wider"
          style={{color: isComplete ? '#ef4444' : 'white', minWidth: 44, textAlign:'center'}}>
          {String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
        </span>

        {isRunning
          ? <button onClick={() => setIsRunning(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90"
              style={{background:`${arcColor}22`,border:`1px solid ${arcColor}40`}}>
              <Pause size={12} style={{color:arcColor}}/>
            </button>
          : <button onClick={() => setIsRunning(true)} disabled={isComplete}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all active:scale-90 disabled:opacity-40"
              style={{background:`${arcColor}22`,border:`1px solid ${arcColor}40`}}>
              <Play size={12} style={{color:arcColor}}/>
            </button>
        }

        {onClose && (
          <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors ml-1">
            <X size={13}/>
          </button>
        )}
      </div>
    );
  }

  // ── FULL PANEL ────────────────────────────────────────────────────────────
  const wrapStyle = floating ? {
    position: 'fixed' as const,
    top: '72px',
    right: '16px',
    width: 300,
    zIndex: 100,
    animation: 'fadeIn 0.22s cubic-bezier(0.34,1.4,0.64,1)',
  } : {};

  return (
    <div style={wrapStyle}>
      <div style={{
        background: floating ? 'rgba(6,10,30,0.97)' : 'rgba(255,255,255,0.03)',
        border: floating ? `1.5px solid ${arcColor}40` : '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: floating ? `0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px ${arcColor}15, 0 0 40px ${arcColor}12` : 'none',
        backdropFilter: floating ? 'blur(28px)' : 'none',
      }}>

        {/* Header — floating only */}
        {floating && (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 14px',
            borderBottom:`1px solid rgba(255,255,255,0.07)`,
            background:`linear-gradient(135deg, rgba(255,255,255,0.03), ${arcColor}0a)`,
          }}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:26,height:26,borderRadius:8,background:`linear-gradient(135deg,${arcColor},${arcColor}88)`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:12}}>⏱️</span>
              </div>
              <span style={{color:'white',fontSize:12,fontWeight:800,letterSpacing:'0.05em'}}>Study Timer</span>
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={() => setIsMinimized(true)}
                style={{width:26,height:26,borderRadius:8,background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                <ChevronUp size={13}/>
              </button>
              {onClose && (
                <button onClick={onClose}
                  style={{width:26,height:26,borderRadius:8,background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.28)',color:'#f87171',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                  <X size={13}/>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Timer body */}
        <div style={{padding: floating ? '20px 18px 18px' : '8px 4px 4px'}}>

          {/* Big progress ring */}
          <div style={{position:'relative', width: floating ? 160 : 120, height: floating ? 160 : 120, margin:'0 auto 16px'}}>
            <svg style={{width:'100%',height:'100%',transform:'rotate(-90deg)'}}
              viewBox={`0 0 ${floating?160:120} ${floating?160:120}`}>
              <defs>
                <radialGradient id="ringBg" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={arcColor} stopOpacity="0.06"/>
                  <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
                </radialGradient>
                <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={arcColor}/>
                  <stop offset="100%" stopColor={arcColor === '#06b6d4' ? '#3b82f6' : arcColor === '#f59e0b' ? '#f97316' : '#dc2626'}/>
                </linearGradient>
                <filter id="arcGlow">
                  <feGaussianBlur stdDeviation="3" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              {/* Background glow circle */}
              <circle cx={floating?80:60} cy={floating?80:60} r={floating?r+14:r+8}
                fill="url(#ringBg)"/>
              {/* Track */}
              <circle cx={floating?80:60} cy={floating?80:60} r={floating?r:r-8}
                fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={floating?9:7}/>
              {/* Progress arc */}
              <circle cx={floating?80:60} cy={floating?80:60} r={floating?r:r-8}
                fill="none" stroke="url(#arcGrad)" strokeWidth={floating?9:7}
                strokeLinecap="round"
                strokeDasharray={floating ? circ : 2*Math.PI*(r-8)}
                strokeDashoffset={(floating ? circ : 2*Math.PI*(r-8)) * (1 - progress/100)}
                filter="url(#arcGlow)"
                style={{transition:'stroke-dashoffset 1s linear, stroke 0.8s ease'}}/>
              {/* Dot at progress tip */}
              {progress > 2 && (
                <circle
                  cx={(floating?80:60) + (floating?r:r-8) * Math.cos((progress/100 * 360 - 90) * Math.PI/180)}
                  cy={(floating?80:60) + (floating?r:r-8) * Math.sin((progress/100 * 360 - 90) * Math.PI/180)}
                  r="5" fill={arcColor}
                  style={{filter:`drop-shadow(0 0 6px ${arcColor})`}}/>
              )}
            </svg>

            {/* Center content */}
            <div style={{
              position:'absolute', inset:0,
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              gap: 2,
            }}>
              {/* Big time digits */}
              <div style={{
                fontFamily:'ui-monospace,monospace',
                fontSize: floating ? 34 : 24,
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: isComplete ? '#ef4444' : 'white',
                textShadow: `0 0 20px ${arcColor}80, 0 2px 4px rgba(0,0,0,0.5)`,
                lineHeight: 1,
              }}>
                {String(minutes).padStart(2,'0')}:{String(seconds).padStart(2,'0')}
              </div>
              {/* Status label */}
              <div style={{
                fontSize: 9, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase',
                color: isComplete ? '#ef4444' : isRunning ? arcColor : 'rgba(255,255,255,0.35)',
                marginTop: 2,
              }}>
                {isComplete ? '✓ DONE' : isRunning ? 'FOCUS' : 'READY'}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div style={{display:'flex', justifyContent:'center', gap:10, marginBottom:14}}>
            {isRunning ? (
              <button onClick={() => setIsRunning(false)}
                style={{
                  width:44, height:44, borderRadius:14,
                  background:`linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.1))`,
                  border:'1.5px solid rgba(245,158,11,0.45)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', transition:'all 0.15s',
                  boxShadow:'0 2px 12px rgba(245,158,11,0.2)',
                }}>
                <Pause size={18} color="#f59e0b"/>
              </button>
            ) : (
              <button onClick={() => setIsRunning(true)} disabled={isComplete}
                style={{
                  width:44, height:44, borderRadius:14,
                  background:`linear-gradient(135deg, ${arcColor}28, ${arcColor}14)`,
                  border:`1.5px solid ${arcColor}55`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor: isComplete ? 'not-allowed' : 'pointer',
                  opacity: isComplete ? 0.4 : 1,
                  transition:'all 0.15s',
                  boxShadow:`0 2px 12px ${arcColor}25`,
                }}>
                <Play size={18} color={arcColor}/>
              </button>
            )}
            <button onClick={() => { setIsRunning(false); setTimeLeft(customMinutes * 60); }}
              style={{
                width:44, height:44, borderRadius:14,
                background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.12)',
                display:'flex', alignItems:'center', justifyContent:'center',
                cursor:'pointer', transition:'all 0.15s',
              }}>
              <RotateCcw size={16} color="rgba(255,255,255,0.55)"/>
            </button>
          </div>

          {/* Preset chips */}
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:10}}>
            {[15,25,45,60].map(m => (
              <button key={m} onClick={() => handleSetTime(m)}
                style={{
                  padding:'7px 0', borderRadius:10,
                  background: customMinutes===m ? `linear-gradient(135deg,${arcColor}30,${arcColor}15)` : 'rgba(255,255,255,0.04)',
                  border: customMinutes===m ? `1.5px solid ${arcColor}55` : '1.5px solid rgba(255,255,255,0.09)',
                  color: customMinutes===m ? arcColor : 'rgba(255,255,255,0.45)',
                  fontSize:11, fontWeight:700,
                  cursor:'pointer', transition:'all 0.15s',
                  boxShadow: customMinutes===m ? `0 2px 10px ${arcColor}18` : 'none',
                }}>
                {m}m
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div style={{display:'flex', gap:8}}>
            <input type="number" min="1" max="180" value={customMinutes}
              onChange={e => setCustomMinutes(Math.min(Math.max(parseInt(e.target.value)||1,1),180))}
              style={{
                flex:1, padding:'7px 12px', borderRadius:10,
                background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.12)',
                color:'white', fontSize:12, textAlign:'center', outline:'none',
                fontFamily:'ui-monospace,monospace', fontWeight:700,
              }}
            />
            <button onClick={() => handleSetTime(customMinutes)}
              style={{
                padding:'7px 14px', borderRadius:10,
                background:`linear-gradient(135deg,${arcColor}28,${arcColor}14)`,
                border:`1.5px solid ${arcColor}45`,
                color:arcColor, fontSize:11, fontWeight:800,
                cursor:'pointer', transition:'all 0.15s',
              }}>
              Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
