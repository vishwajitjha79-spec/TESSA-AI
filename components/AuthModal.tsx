'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, Mail, Lock, X, Sparkles, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode]           = useState<'signin' | 'signup'>('signin');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

  const handle = async () => {
    if (!email.trim() || !password.trim()) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
        onSuccess();
      } else {
        const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) throw err;
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setMode('signin');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Something went wrong.';
      if (msg.includes('Invalid login')) setError('Incorrect email or password.');
      else if (msg.includes('already registered')) setError('Account already exists. Sign in instead.');
      else if (msg.includes('valid email')) setError('Please enter a valid email address.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handle(); };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(6, 8, 20, 0.97)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(6,182,212,0.1)',
        }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{background:'linear-gradient(135deg,#06b6d4,#6366f1)'}}>
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm tracking-wide">
                {mode === 'signin' ? 'Welcome back' : 'Create account'}
              </p>
              <p className="text-white/35 text-[9px] mt-0.5">
                {mode === 'signin' ? 'Sign in to sync your Tessa data' : 'Start syncing across devices'}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] transition-colors">
            <X size={13} className="text-white/50" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px mx-5 mb-4" style={{background:'rgba(255,255,255,0.06)'}} />

        {/* Form */}
        <div className="px-5 pb-5 space-y-3">

          {/* Email */}
          <div className="relative">
            <Mail size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="email"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12px] outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'white',
              }}
              onFocus={e => e.currentTarget.style.border = '1px solid rgba(6,182,212,0.45)'}
              onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Password (min 6 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full pl-9 pr-10 py-2.5 rounded-xl text-[12px] outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.09)',
                color: 'white',
              }}
              onFocus={e => e.currentTarget.style.border = '1px solid rgba(6,182,212,0.45)'}
              onBlur={e => e.currentTarget.style.border = '1px solid rgba(255,255,255,0.09)'}
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
              {showPass ? <EyeOff size={13}/> : <Eye size={13}/>}
            </button>
          </div>

          {/* Error / success messages */}
          {error && (
            <p className="text-[11px] text-red-400 px-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-400 flex-shrink-0"/>
              {error}
            </p>
          )}
          {success && (
            <p className="text-[11px] text-emerald-400 px-1 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0"/>
              {success}
            </p>
          )}

          {/* Primary button */}
          <button
            onClick={handle}
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50"
            style={{background: loading ? 'rgba(6,182,212,0.4)' : 'linear-gradient(135deg,#06b6d4,#6366f1)', boxShadow: '0 4px 16px rgba(6,182,212,0.25)'}}>
            {loading
              ? <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </span>
              : mode === 'signin' ? '✦ Sign In' : '✦ Create Account'
            }
          </button>

          {/* Toggle mode */}
          <p className="text-center text-[11px] text-white/35 pt-1">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError(''); setSuccess(''); }}
              className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
