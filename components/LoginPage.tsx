'use client';

import { useState } from 'react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/supabase';
import { Heart, Mail, Lock, User, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onGuestContinue: () => void;
}

export default function LoginPage({ onGuestContinue }: LoginPageProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (isSignUp && !displayName) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    if (isSignUp) {
      const { error } = await signUpWithEmail(email, password, displayName);
      if (error) {
        setError(error.message);
      } else {
        setError('Check your email to verify your account!');
      }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error.message);
      }
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0d1117] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        
        {/* Logo/Header */}
        <div className="text-center">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-4xl animate-pulse-glow">
              🌌
            </div>
          </div>
          <h1 className="text-4xl font-bold holographic-text font-['Orbitron'] mb-2">
            T.E.S.S.A.
          </h1>
          <p className="text-sm text-gray-400 tracking-wider">
            THOUGHTFUL EMPATHIC SOPHISTICATED SYNTHETIC ASSISTANT
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-lg border border-primary/20 rounded-2xl p-8 space-y-6">
          
          {/* Guest Continue */}
          <button
            onClick={onGuestContinue}
            className="w-full px-6 py-4 bg-gradient-to-r from-primary/20 to-secondary/20 hover:from-primary/30 hover:to-secondary/30 border-2 border-primary/30 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg"
          >
            <Sparkles size={24} />
            Continue as Guest
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a1f3a] text-gray-400">OR SIGN IN</span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full px-6 py-4 bg-white text-black hover:bg-gray-100 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#1a1f3a] text-gray-400">OR USE EMAIL</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <div className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name</label>
                <div className="relative">
                  <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-primary/30 rounded-lg focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-2">Email</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-primary/30 rounded-lg focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-primary/30 rounded-lg focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {error && (
              <div className={`text-sm p-3 rounded-lg ${
                error.includes('Check your email') 
                  ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
              }`}>
                {error}
              </div>
            )}

            <button
              onClick={handleEmailAuth}
              disabled={loading}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 rounded-lg font-bold transition-all disabled:opacity-50"
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>

            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>By continuing, you agree to T.E.S.S.A.'s Terms of Service</p>
          <p className="mt-2">Guest mode: Data stored locally only</p>
          <p>Signed in: Data synced securely to cloud</p>
        </div>
      </div>
    </div>
  );
}
