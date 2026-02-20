'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Mic, MicOff, Menu, X, Settings, Heart, Plus,
  Trash2, LogOut, User, LayoutDashboard, Sun, Moon,
  Calendar, ChevronDown, ChevronUp, StickyNote, Paperclip,
  ChevronRight, Sparkles, Brain, Activity, Clock,
  Volume2, Shield, Droplets, BookOpen, ImageIcon,
} from 'lucide-react';

import type { Message, MoodType, Conversation } from '@/types';

import SecretVerification from '@/components/SecretVerification';
import PersonalDashboard  from '@/components/PersonalDashboard';
import AvatarPresets      from '@/components/AvatarPresets';
import NotesPanel         from '@/components/NotesPanel';
import ProfileCard        from '@/components/ProfileCard';
import StudyTimer         from '@/components/StudyTimer';
import PlannerHub         from '@/components/PlannerHub';
import FlashcardGenerator from '@/components/FlashcardGenerator';
import ReportCard         from '@/components/ReportCard';
import DailyWellness      from '@/components/StreakDashboard';
import TessaInsights      from '@/components/TessaInsights';
import MessageRenderer    from '@/components/MessageRenderer';

import { supabase, getCurrentUser, signOut }          from '@/lib/supabase';
import { MOOD_DESCRIPTIONS }                           from '@/lib/mood';
import { getRandomWelcomeMessage }                     from '@/lib/profile';
import { estimateCalories }                            from '@/lib/food-database';
import {
  shouldBeProactive, getProactiveQuestion,
  detectMealInResponse, detectSleepInResponse, getSleepReaction,
  isCreatorModePersistent, lockCreatorMode, unlockCreatorMode,
} from '@/lib/proactive-tessa';
import {
  extractMemoriesFromMessage,
  getAllMemories, clearAllMemories,
} from '@/lib/memory';
import {
  markMeal, markStudy, addWater, addCalories,
  getCurrentMealWindow,
} from '@/lib/streaks-water';
import {
  buildMorningBriefing, shouldDeliverBriefing, markBriefingDelivered,
} from '@/lib/streaks-water';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type Theme          = 'dark' | 'light' | 'cyberpunk' | 'ocean' | 'sunset';
type ResponseLength = 'short' | 'medium' | 'long';

interface HealthSnapshot {
  weight        : number;
  height        : number;
  meals         : { time: string; meal: string; calories: number; confidence: string }[];
  totalCalories : number;
  sleepHours?   : number;
  date          : string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MAX_TOKENS: Record<ResponseLength, number> = { short: 350, medium: 700, long: 1400 };

const VALID_MOODS: MoodType[] = [
  'happy','calm','confident','worried','flirty',
  'loving','thinking','listening','playful','focused',
];

const MOOD_EMOJI: Record<string, string> = {
  happy:'😊', calm:'😌', confident:'💪', worried:'😟',
  flirty:'😏', loving:'💕', thinking:'🤔', listening:'👂',
  playful:'😄', focused:'🎯',
};

// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM — standard + creator layer for every theme
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:'bg-[#050816]', bgC:'bg-[#0c0516]',
    panel:'bg-[#0a0d1e]/80 backdrop-blur-xl border-white/[0.05]',
    panelC:'bg-[#0f0520]/80 backdrop-blur-xl border-pink-500/[0.08]',
    header:'bg-black/50 backdrop-blur-2xl border-b border-white/[0.06]',
    headerC:'bg-black/60 backdrop-blur-2xl border-b border-pink-500/[0.10]',
    bar:'bg-black/40 backdrop-blur-2xl border-t border-white/[0.06]',
    barC:'bg-black/50 backdrop-blur-2xl border-t border-pink-500/[0.10]',
    msgU:'bg-gradient-to-br from-[#0d2040] to-[#091528] border border-cyan-500/[0.15] border-l-[3px] border-l-cyan-500',
    msgUC:'bg-gradient-to-br from-[#200838] to-[#140520] border border-pink-500/[0.15] border-l-[3px] border-l-pink-500',
    msgA:'bg-gradient-to-br from-[#08101f] to-[#060c18] border border-violet-500/[0.10] border-l-[3px] border-l-violet-500/60',
    msgAC:'bg-gradient-to-br from-[#0f0320] to-[#080215] border border-purple-500/[0.10] border-l-[3px] border-l-purple-500/60',
    inp:'bg-white/[0.04] border border-white/[0.10] text-white placeholder:text-white/20 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/10',
    inpC:'bg-pink-950/[0.20] border border-pink-500/[0.18] text-white placeholder:text-pink-200/25 focus:border-pink-400/50 focus:ring-2 focus:ring-pink-500/10',
    btnP:'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/[0.22]',
    btnPC:'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-lg shadow-pink-500/[0.22]',
    btnS:'bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/60 hover:text-white/90',
    btnSC:'bg-pink-500/[0.07] hover:bg-pink-500/[0.14] border border-pink-500/[0.16] text-pink-300/80 hover:text-pink-200',
    text:'text-white', sub:'text-white/40', subC:'text-pink-200/40',
    accent:'text-cyan-400', accentC:'text-pink-400',
    glow:'#06b6d4', glowC:'#ec4899',
    card:'bg-white/[0.03] border border-white/[0.06]',
    cardC:'bg-pink-500/[0.04] border border-pink-500/[0.08]',
    active:'bg-cyan-500/[0.10] border border-cyan-500/[0.20]',
    activeC:'bg-pink-500/[0.10] border border-pink-500/[0.20]',
    div:'border-white/[0.05]', divC:'border-pink-500/[0.08]',
    settBg:'bg-[#07091a]/95 backdrop-blur-2xl border-r border-white/[0.07]',
    settBgC:'bg-[#0e0420]/95 backdrop-blur-2xl border-r border-pink-500/[0.10]',
    isLight:false,
  },
  light: {
    bg:'bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-50',
    bgC:'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50',
    panel:'bg-white/80 backdrop-blur-xl border-slate-200/80',
    panelC:'bg-pink-50/90 backdrop-blur-xl border-pink-200/60',
    header:'bg-white/85 backdrop-blur-2xl border-b border-slate-200/70 shadow-sm shadow-black/[0.04]',
    headerC:'bg-white/85 backdrop-blur-2xl border-b border-pink-200/60 shadow-sm shadow-pink-500/[0.04]',
    bar:'bg-white/90 backdrop-blur-2xl border-t border-slate-200/70 shadow-sm shadow-black/[0.03]',
    barC:'bg-white/90 backdrop-blur-2xl border-t border-pink-200/60',
    msgU:'bg-gradient-to-br from-sky-50 to-cyan-50/60 border border-cyan-200/60 border-l-[3px] border-l-cyan-400',
    msgUC:'bg-gradient-to-br from-pink-50 to-rose-50/60 border border-pink-200/60 border-l-[3px] border-l-pink-400',
    msgA:'bg-gradient-to-br from-indigo-50/80 to-violet-50/40 border border-violet-200/50 border-l-[3px] border-l-violet-400',
    msgAC:'bg-gradient-to-br from-purple-50/80 to-pink-50/40 border border-purple-200/50 border-l-[3px] border-l-purple-400',
    inp:'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10',
    inpC:'bg-white border border-pink-200 text-slate-800 placeholder:text-pink-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/10',
    btnP:'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md shadow-cyan-500/[0.20]',
    btnPC:'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/[0.20]',
    btnS:'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900',
    btnSC:'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 hover:text-pink-800',
    text:'text-slate-800', sub:'text-slate-400', subC:'text-slate-400',
    accent:'text-cyan-600', accentC:'text-pink-500',
    glow:'#0891b2', glowC:'#ec4899',
    card:'bg-white/70 border border-slate-200/80',
    cardC:'bg-white/70 border border-pink-200/70',
    active:'bg-cyan-50 border border-cyan-200',
    activeC:'bg-pink-50 border border-pink-200',
    div:'border-slate-200/70', divC:'border-pink-200/60',
    settBg:'bg-white/95 backdrop-blur-2xl border-r border-slate-200',
    settBgC:'bg-white/95 backdrop-blur-2xl border-r border-pink-200',
    isLight:true,
  },
  cyberpunk: {
    bg:'bg-[#06000f]', bgC:'bg-[#0f0018]',
    panel:'bg-purple-950/30 backdrop-blur-xl border-purple-500/[0.12]',
    panelC:'bg-pink-950/30 backdrop-blur-xl border-pink-500/[0.12]',
    header:'bg-black/70 backdrop-blur-2xl border-b border-purple-500/[0.18]',
    headerC:'bg-black/70 backdrop-blur-2xl border-b border-pink-500/[0.18]',
    bar:'bg-black/60 backdrop-blur-2xl border-t border-purple-500/[0.18]',
    barC:'bg-black/60 backdrop-blur-2xl border-t border-pink-500/[0.18]',
    msgU:'bg-gradient-to-br from-purple-950/60 to-violet-950/30 border border-purple-500/[0.18] border-l-[3px] border-l-purple-400',
    msgUC:'bg-gradient-to-br from-pink-950/60 to-rose-950/30 border border-pink-500/[0.18] border-l-[3px] border-l-pink-400',
    msgA:'bg-gradient-to-br from-black/70 to-purple-950/20 border border-cyan-500/[0.10] border-l-[3px] border-l-cyan-400/70',
    msgAC:'bg-gradient-to-br from-black/70 to-pink-950/20 border border-purple-500/[0.10] border-l-[3px] border-l-purple-400/70',
    inp:'bg-black/50 border border-purple-500/[0.22] text-purple-100 placeholder:text-purple-300/30 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/10',
    inpC:'bg-black/50 border border-pink-500/[0.22] text-pink-50 placeholder:text-pink-300/30 focus:border-pink-400/60 focus:ring-2 focus:ring-pink-500/10',
    btnP:'bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-500 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/[0.28]',
    btnPC:'bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 text-white shadow-lg shadow-pink-500/[0.28]',
    btnS:'bg-purple-500/[0.08] hover:bg-purple-500/[0.16] border border-purple-500/[0.18] text-purple-300 hover:text-purple-100',
    btnSC:'bg-pink-500/[0.08] hover:bg-pink-500/[0.16] border border-pink-500/[0.18] text-pink-300 hover:text-pink-100',
    text:'text-purple-50', sub:'text-purple-300/40', subC:'text-pink-300/40',
    accent:'text-purple-400', accentC:'text-pink-400',
    glow:'#a855f7', glowC:'#ec4899',
    card:'bg-purple-950/[0.15] border border-purple-500/[0.10]',
    cardC:'bg-pink-950/[0.15] border border-pink-500/[0.10]',
    active:'bg-purple-500/[0.12] border border-purple-500/[0.25]',
    activeC:'bg-pink-500/[0.12] border border-pink-500/[0.25]',
    div:'border-purple-500/[0.08]', divC:'border-pink-500/[0.08]',
    settBg:'bg-[#0a0015]/95 backdrop-blur-2xl border-r border-purple-500/[0.12]',
    settBgC:'bg-[#150010]/95 backdrop-blur-2xl border-r border-pink-500/[0.12]',
    isLight:false,
  },
  ocean: {
    bg:'bg-[#020d1a]', bgC:'bg-[#080820]',
    panel:'bg-blue-950/30 backdrop-blur-xl border-blue-500/[0.12]',
    panelC:'bg-indigo-950/30 backdrop-blur-xl border-indigo-500/[0.12]',
    header:'bg-black/55 backdrop-blur-2xl border-b border-teal-500/[0.15]',
    headerC:'bg-black/55 backdrop-blur-2xl border-b border-purple-500/[0.15]',
    bar:'bg-black/50 backdrop-blur-2xl border-t border-teal-500/[0.15]',
    barC:'bg-black/50 backdrop-blur-2xl border-t border-purple-500/[0.15]',
    msgU:'bg-gradient-to-br from-blue-950/70 to-teal-950/40 border border-teal-500/[0.16] border-l-[3px] border-l-teal-400',
    msgUC:'bg-gradient-to-br from-indigo-950/70 to-purple-950/40 border border-purple-500/[0.16] border-l-[3px] border-l-purple-400',
    msgA:'bg-gradient-to-br from-slate-950/70 to-blue-950/25 border border-blue-500/[0.10] border-l-[3px] border-l-blue-400/70',
    msgAC:'bg-gradient-to-br from-slate-950/70 to-indigo-950/25 border border-indigo-500/[0.10] border-l-[3px] border-l-indigo-400/70',
    inp:'bg-blue-950/[0.35] border border-teal-500/[0.18] text-blue-50 placeholder:text-blue-300/30 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-500/10',
    inpC:'bg-indigo-950/[0.35] border border-purple-500/[0.18] text-indigo-50 placeholder:text-purple-300/30 focus:border-purple-400/60 focus:ring-2 focus:ring-purple-500/10',
    btnP:'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/[0.25]',
    btnPC:'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/[0.25]',
    btnS:'bg-teal-500/[0.08] hover:bg-teal-500/[0.16] border border-teal-500/[0.16] text-teal-300 hover:text-teal-100',
    btnSC:'bg-purple-500/[0.08] hover:bg-purple-500/[0.16] border border-purple-500/[0.16] text-purple-300 hover:text-purple-100',
    text:'text-blue-50', sub:'text-blue-300/40', subC:'text-purple-300/40',
    accent:'text-teal-400', accentC:'text-purple-400',
    glow:'#14b8a6', glowC:'#a855f7',
    card:'bg-blue-950/[0.20] border border-blue-500/[0.10]',
    cardC:'bg-indigo-950/[0.20] border border-indigo-500/[0.10]',
    active:'bg-teal-500/[0.10] border border-teal-500/[0.22]',
    activeC:'bg-purple-500/[0.10] border border-purple-500/[0.22]',
    div:'border-blue-500/[0.07]', divC:'border-purple-500/[0.07]',
    settBg:'bg-[#030e1c]/95 backdrop-blur-2xl border-r border-teal-500/[0.10]',
    settBgC:'bg-[#080820]/95 backdrop-blur-2xl border-r border-purple-500/[0.10]',
    isLight:false,
  },
  sunset: {
    bg:'bg-[#110805]', bgC:'bg-[#180810]',
    panel:'bg-orange-950/25 backdrop-blur-xl border-orange-500/[0.12]',
    panelC:'bg-rose-950/25 backdrop-blur-xl border-rose-500/[0.12]',
    header:'bg-black/55 backdrop-blur-2xl border-b border-orange-500/[0.15]',
    headerC:'bg-black/55 backdrop-blur-2xl border-b border-rose-500/[0.15]',
    bar:'bg-black/50 backdrop-blur-2xl border-t border-orange-500/[0.15]',
    barC:'bg-black/50 backdrop-blur-2xl border-t border-rose-500/[0.15]',
    msgU:'bg-gradient-to-br from-orange-950/70 to-amber-950/30 border border-orange-500/[0.16] border-l-[3px] border-l-orange-400',
    msgUC:'bg-gradient-to-br from-rose-950/70 to-pink-950/30 border border-rose-500/[0.16] border-l-[3px] border-l-rose-400',
    msgA:'bg-gradient-to-br from-stone-950/70 to-orange-950/15 border border-amber-500/[0.10] border-l-[3px] border-l-amber-400/70',
    msgAC:'bg-gradient-to-br from-stone-950/70 to-rose-950/15 border border-pink-500/[0.10] border-l-[3px] border-l-pink-400/70',
    inp:'bg-orange-950/[0.28] border border-orange-500/[0.18] text-orange-50 placeholder:text-orange-300/30 focus:border-amber-400/60 focus:ring-2 focus:ring-orange-500/10',
    inpC:'bg-rose-950/[0.28] border border-rose-500/[0.18] text-rose-50 placeholder:text-rose-300/30 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-500/10',
    btnP:'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/[0.25]',
    btnPC:'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-lg shadow-rose-500/[0.25]',
    btnS:'bg-orange-500/[0.08] hover:bg-orange-500/[0.16] border border-orange-500/[0.16] text-orange-300 hover:text-orange-100',
    btnSC:'bg-rose-500/[0.08] hover:bg-rose-500/[0.16] border border-rose-500/[0.16] text-rose-300 hover:text-rose-100',
    text:'text-orange-50', sub:'text-orange-300/40', subC:'text-rose-300/40',
    accent:'text-amber-400', accentC:'text-rose-400',
    glow:'#f97316', glowC:'#f43f5e',
    card:'bg-orange-950/[0.18] border border-orange-500/[0.10]',
    cardC:'bg-rose-950/[0.18] border border-rose-500/[0.10]',
    active:'bg-orange-500/[0.10] border border-orange-500/[0.22]',
    activeC:'bg-rose-500/[0.10] border border-rose-500/[0.22]',
    div:'border-orange-500/[0.07]', divC:'border-rose-500/[0.07]',
    settBg:'bg-[#120905]/95 backdrop-blur-2xl border-r border-orange-500/[0.10]',
    settBgC:'bg-[#180810]/95 backdrop-blur-2xl border-r border-rose-500/[0.10]',
    isLight:false,
  },
} as const;

type ThemeKey = keyof typeof THEMES;

function useT(theme: Theme, c: boolean) {
  const T = THEMES[theme] as (typeof THEMES)['dark'];
  return {
    bg      : c ? T.bgC      : T.bg,
    panel   : c ? T.panelC   : T.panel,
    header  : c ? T.headerC  : T.header,
    bar     : c ? T.barC     : T.bar,
    msgU    : c ? T.msgUC    : T.msgU,
    msgA    : c ? T.msgAC    : T.msgA,
    inp     : c ? T.inpC     : T.inp,
    btnP    : c ? T.btnPC    : T.btnP,
    btnS    : c ? T.btnSC    : T.btnS,
    text    : T.text,
    sub     : c ? T.subC     : T.sub,
    accent  : c ? T.accentC  : T.accent,
    glow    : c ? T.glowC    : T.glow,
    card    : c ? T.cardC    : T.card,
    active  : c ? T.activeC  : T.active,
    div     : c ? T.divC     : T.div,
    settBg  : c ? T.settBgC  : T.settBg,
    isLight : T.isLight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function safeMood(m?: string): MoodType {
  return VALID_MOODS.includes(m as MoodType) ? (m as MoodType) : 'calm';
}
function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch {} }
function lsRemove(k: string): void { try { localStorage.removeItem(k); } catch {} }
function lsGetJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? JSON.parse(r) as T : fb; } catch { return fb; }
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Animated aurora background
function AuroraBg({ glow, glow2, isLight }: { glow: string; glow2: string; isLight: boolean }) {
  if (isLight) return null; // light theme has its own gradient bg
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="absolute rounded-full blur-[160px] animate-aurora-a"
        style={{ width:700, height:700, background:glow, opacity:0.06, top:'-20%', left:'-5%' }} />
      <div className="absolute rounded-full blur-[120px] animate-aurora-b"
        style={{ width:480, height:480, background:glow2, opacity:0.05, top:'40%', right:'-10%' }} />
      <div className="absolute rounded-full blur-[100px] animate-aurora-c"
        style={{ width:320, height:320, background:glow, opacity:0.04, bottom:'-5%', left:'38%' }} />
      <div className="absolute inset-0"
        style={{ backgroundImage:`radial-gradient(circle, ${glow}14 1px, transparent 1px)`, backgroundSize:'32px 32px', opacity:0.5 }} />
    </div>
  );
}

// Hearts for creator mode
function Hearts({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      {(['5%','17%','31%','48%','62%','76%','91%'] as string[]).map((left, i) => (
        <span key={i} className="absolute text-sm opacity-0 select-none animate-float-heart"
          style={{ left, bottom:'-10px', animationDelay:`${i*1.3}s`, animationDuration:`${8+i}s` }}>
          {['❤️','💕','✨','💗','🌸','💖','⭐'][i]}
        </span>
      ))}
    </div>
  );
}

// Typing dots
function TypingDots({ glow }: { glow: string }) {
  return (
    <div className="flex items-center gap-1.5 py-1 px-0.5">
      {[0,180,360].map(d => (
        <div key={d} className="w-[7px] h-[7px] rounded-full animate-bounce"
          style={{ background:glow, boxShadow:`0 0 6px ${glow}80`, animationDelay:`${d}ms` }} />
      ))}
    </div>
  );
}

// Section label for settings
function SLabel({ label }: { label: string }) {
  return <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/22 mb-2">{label}</p>;
}

// Divider
function Hr({ cls }: { cls: string }) {
  return <div className={`h-px w-full border-t ${cls}`} />;
}

// Toggle switch
function Toggle({ label, sub, checked, onChange, color }: {
  label: string; sub?: string; checked: boolean; onChange:(v:boolean)=>void; color: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group py-0.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-white/60 group-hover:text-white/85 transition-colors leading-snug">{label}</p>
        {sub && <p className="text-[9px] text-white/25 leading-snug mt-0.5">{sub}</p>}
      </div>
      <div onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-8 h-[18px] rounded-full transition-all duration-300 cursor-pointer"
        style={{ background: checked ? color : 'rgba(255,255,255,0.08)', boxShadow: checked ? `0 0 8px ${color}50` : 'none' }}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-md transition-all duration-300 ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
      </div>
    </label>
  );
}

// Light-mode overrides for toggle labels
function ToggleLight({ label, sub, checked, onChange, color }: {
  label: string; sub?: string; checked: boolean; onChange:(v:boolean)=>void; color: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group py-0.5">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-slate-600 group-hover:text-slate-800 transition-colors leading-snug">{label}</p>
        {sub && <p className="text-[9px] text-slate-400 leading-snug mt-0.5">{sub}</p>}
      </div>
      <div onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-8 h-[18px] rounded-full transition-all duration-300 cursor-pointer"
        style={{ background: checked ? color : '#e2e8f0', boxShadow: checked ? `0 0 8px ${color}50` : 'none' }}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] bg-white rounded-full shadow-md transition-all duration-300 ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
      </div>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user,    setUser]    = useState<any>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [currentMood,   setCurrentMood]   = useState<MoodType>('calm');
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string>(() => uuidv4());
  const [latestMsgId,   setLatestMsgId]   = useState<string | null>(null);

  // ── UI panels ─────────────────────────────────────────────────────────────
  const [showSidebar,     setShowSidebar]     = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showDashboard,   setShowDashboard]   = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPlanners,    setShowPlanners]    = useState(false);
  const [showFlashcards,  setShowFlashcards]  = useState(false);
  const [showReportCard,  setShowReportCard]  = useState(false);
  const [notesExpanded,   setNotesExpanded]   = useState(true);
  const [typingEnabled,   setTypingEnabled]   = useState(true);

  // ── Settings ──────────────────────────────────────────────────────────────
  const [theme,          setThemeState]    = useState<Theme>('dark');
  const [autoSearch,     setAutoSearch]    = useState(true);
  const [voiceOutput,    setVoiceOutput]   = useState(false);
  const [responseLength, setResponseLength]= useState<ResponseLength>('medium');
  const [animations,     setAnimations]    = useState(true);
  const [sfx,            setSfx]           = useState(true);
  const [autoSave,       setAutoSave]      = useState(true);
  const [avatar,         setAvatar]        = useState('/avatars/cosmic.png');

  // ── Media ─────────────────────────────────────────────────────────────────
  const [isRecording,     setIsRecording]     = useState(false);
  const [wellnessVersion, setWellnessVersion] = useState(0);
  const [selectedImage,   setSelectedImage]   = useState<string | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const proactiveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const midnightTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicesReady    = useRef(false);

  const t           = useT(theme, isCreatorMode);
  const avatarSrc   = avatar || '/avatars/cosmic.png';
  const shownConvs  = conversations.filter(c => c.mode === (isCreatorMode ? 'creator' : 'standard'));
  const moodLabel   = (MOOD_DESCRIPTIONS as Record<string, string>)[currentMood] ?? currentMood;
  const moodEmoji   = MOOD_EMOJI[currentMood] ?? '✨';

  // Aurora secondary colour
  const glow2 = isCreatorMode ? '#a855f7'
    : theme === 'dark' ? '#6366f1'
    : theme === 'cyberpunk' ? '#ec4899'
    : theme === 'ocean' ? '#3b82f6'
    : theme === 'sunset' ? '#f59e0b'
    : '#a5b4fc';

  // ── Theme setter ──────────────────────────────────────────────────────────
  const setTheme = useCallback((th: Theme) => {
    setThemeState(th);
    document.documentElement.setAttribute('data-theme', th);
    lsSet('tessa-theme', th);
  }, []);

  // ── Midnight reset ────────────────────────────────────────────────────────
  const checkMidnightReset = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const last  = lsGet('tessa-last-date');
    if (last && last !== today) {
      const h = lsGetJson<HealthSnapshot>('tessa-health', {
        weight:0, height:0, meals:[], totalCalories:0, date:today,
      });
      h.meals = []; h.totalCalories = 0; h.date = today;
      lsSet('tessa-health', JSON.stringify(h));
      setWellnessVersion(v => v + 1);
    }
    lsSet('tessa-last-date', today);
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const th = lsGet('tessa-theme') as Theme | null;
    if (th && THEMES[th]) setTheme(th);
    const av = lsGet('tessa-avatar-preset'); if (av) setAvatar(av);
    const as_ = lsGet('tessa-auto-search');  if (as_ !== null) setAutoSearch(as_ === 'true');
    const vo  = lsGet('tessa-voice-output'); if (vo !== null) setVoiceOutput(vo === 'true');
    const rl  = lsGet('tessa-response-length') as ResponseLength | null; if (rl) setResponseLength(rl);
    const an  = lsGet('tessa-animations');   if (an !== null) setAnimations(an === 'true');
    const sf  = lsGet('tessa-sfx');          if (sf !== null) setSfx(sf === 'true');

    if (isCreatorModePersistent()) { setIsCreatorMode(true); setCurrentMood('loving'); }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => { voicesReady.current = true; };
      if (window.speechSynthesis.getVoices().length) voicesReady.current = true;
    }

    checkAuth();
    hydrateLocalConversations();
    checkMidnightReset();
    midnightTimer.current = setInterval(checkMidnightReset, 60_000);

    if (shouldDeliverBriefing()) {
      const b = buildMorningBriefing();
      markBriefingDelivered(b);
      lsSet('tessa-pending-briefing', b);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null; setUser(u);
      if (u) { setIsGuest(false); fetchCloudConversations(u.id); }
    });

    return () => {
      subscription.unsubscribe();
      if (proactiveTimer.current) clearInterval(proactiveTimer.current);
      if (midnightTimer.current)  clearInterval(midnightTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { lsSet('tessa-auto-search',     String(autoSearch));    }, [autoSearch]);
  useEffect(() => { lsSet('tessa-voice-output',    String(voiceOutput));   }, [voiceOutput]);
  useEffect(() => { lsSet('tessa-response-length', responseLength);        }, [responseLength]);
  useEffect(() => { lsSet('tessa-animations',      String(animations));    }, [animations]);
  useEffect(() => { lsSet('tessa-sfx',             String(sfx));           }, [sfx]);

  // Proactive messages
  useEffect(() => {
    if (proactiveTimer.current) { clearInterval(proactiveTimer.current); proactiveTimer.current = null; }
    if (!isCreatorMode) return;
    const d = setTimeout(() => maybeSendProactive(), 6_000);
    proactiveTimer.current = setInterval(() => maybeSendProactive(), 3*60*60*1_000);
    return () => { clearTimeout(d); if (proactiveTimer.current) clearInterval(proactiveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreatorMode]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth', block:'end' }); }, [messages, isLoading]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const checkAuth = async () => {
    try { const u = await getCurrentUser(); if (u) { setUser(u); setIsGuest(false); fetchCloudConversations(u.id); } }
    finally { setLoading(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null); setIsGuest(true); setIsCreatorMode(false); unlockCreatorMode();
    setMessages([]); setShowDashboard(false); hydrateLocalConversations();
  };

  const fetchCloudConversations = async (uid: string) => {
    try {
      const { data, error } = await supabase.from('conversations').select('*').eq('user_id', uid)
        .order('updated_at', { ascending:false }).limit(80);
      if (error || !data) return;
      setConversations(data.map((row: any): Conversation => ({
        id:row.conversation_id, title:row.title, messages:row.messages,
        created:new Date(row.created_at), updated:new Date(row.updated_at),
        mode:row.mode, moodHistory:row.mood_history ?? ['calm'],
      })));
    } catch {}
  };

  const hydrateLocalConversations = () => {
    const c = lsGetJson<Conversation[]>('tessa-conversations', []);
    if (c.length) setConversations(c);
  };

  // ── Conversations ─────────────────────────────────────────────────────────
  const persistConversation = useCallback(async () => {
    if (!messages.length) return;
    const conv: Conversation = {
      id:currentConvId,
      title:messages[0].content.slice(0,55).trimEnd()+'…',
      messages, created:new Date(), updated:new Date(),
      mode:isCreatorMode ? 'creator' : 'standard',
      moodHistory:[currentMood],
    };
    if (user && !isGuest) {
      try {
        await supabase.from('conversations').upsert({
          user_id:user.id, conversation_id:conv.id, title:conv.title,
          messages:conv.messages, mode:conv.mode,
          mood_history:conv.moodHistory, updated_at:new Date().toISOString(),
        });
        fetchCloudConversations(user.id);
      } catch {}
    } else if (autoSave) {
      const next = [conv, ...conversations.filter(c => c.id !== currentConvId)].slice(0,50);
      setConversations(next); lsSet('tessa-conversations', JSON.stringify(next));
    }
  }, [messages, currentConvId, isCreatorMode, currentMood, user, isGuest, autoSave, conversations]);

  const startNewChat = () => {
    persistConversation();
    setMessages([]); setCurrentConvId(uuidv4());
    setCurrentMood('calm'); setShowDashboard(false); setShowSidebar(false);
  };

  const openConversation = (conv: Conversation) => {
    if ((conv.mode === 'creator') !== isCreatorMode) { alert(`Switch to ${conv.mode} mode first.`); return; }
    setMessages(conv.messages); setCurrentConvId(conv.id);
    setCurrentMood(safeMood(conv.moodHistory?.at(-1))); setShowSidebar(false);
  };

  const removeConversation = async (id: string) => {
    if (user && !isGuest) {
      try { await supabase.from('conversations').delete().eq('conversation_id', id).eq('user_id', user.id); fetchCloudConversations(user.id); }
      catch {}
    } else {
      const next = conversations.filter(c => c.id !== id);
      setConversations(next); lsSet('tessa-conversations', JSON.stringify(next));
    }
  };

  // ── Proactive ─────────────────────────────────────────────────────────────
  const maybeSendProactive = () => {
    if (!shouldBeProactive()) return;
    const q = getProactiveQuestion(); if (!q) return;
    setMessages(prev => [...prev, { id:uuidv4(), role:'assistant' as const, content:q.question, timestamp:new Date(), mood:'playful' as MoodType }]);
  };

  // ── Dashboard parser ──────────────────────────────────────────────────────
  const parseDashboardUpdates = (responseText: string): string => {
    if (!isCreatorMode) return '';
    let extra = '';
    try {
      const foodHit = detectMealInResponse(responseText);
      if (foodHit) {
        const foods = foodHit.food.split(/,|and|\+|with/i).map(f => f.trim()).filter(Boolean);
        let totalCal = 0;
        const lines: string[] = [];
        for (const food of foods) {
          const qm = food.match(/^(\d+)\s+(.+)/);
          const qty = qm ? parseInt(qm[1]) : 1;
          const fn  = qm ? qm[2] : food;
          const res = estimateCalories(fn);
          const cal = res.calories * qty;
          totalCal += cal;
          lines.push(`${qty > 1 ? qty+' ' : ''}${res.food} (${cal}cal)`);
        }
        const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:new Date().toISOString().split('T')[0] });
        h.meals.push({ time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), meal:lines.join(', '), calories:totalCal, confidence:'medium' });
        h.totalCalories = (h.totalCalories ?? 0) + totalCal;
        lsSet('tessa-health', JSON.stringify(h));
        const mw = getCurrentMealWindow(); if (mw) markMeal(mw.name);
        addCalories(totalCal); setWellnessVersion(v => v + 1);
      }
      const sleepHit = detectSleepInResponse(responseText);
      if (sleepHit) {
        const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:new Date().toISOString().split('T')[0] });
        h.sleepHours = sleepHit.hours; lsSet('tessa-health', JSON.stringify(h));
        extra = '\n\n' + getSleepReaction(sleepHit.hours);
      }
    } catch {}
    return extra;
  };

  // ── Image ─────────────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5*1024*1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setSelectedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text && !selectedImage) return;
    if (isLoading) return;

    const userMsg: Message = {
      id:uuidv4(), role:'user',
      content: text || '📷 [Image]',
      timestamp:new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // MUST declare imageCopy/hasImage before needsSearch
    const imageCopy = selectedImage;
    const hasImage  = !!imageCopy;
    removeSelectedImage();
    if (textareaRef.current) textareaRef.current.style.height = '48px';
    setIsLoading(true);

    try {
      const needsSearch =
        autoSearch && !!text && !hasImage && !isCreatorMode &&
        (
          /\b(latest|current|today|now|recent|this week|this month|202[3-6])\b/i.test(text) ||
          /\b(search|find|look up|google|news)\b/i.test(text) ||
          (/\?/.test(text) && text.split(' ').length > 4)
        ) &&
        !/\b(how are you|what do you think|about yourself|your opinion|you like|i feel|i think|my day|i'm|i am|tell me a)\b/i.test(text);

      const hist = [...messages, userMsg].slice(-12);
      const payload = hasImage && imageCopy
        ? {
            messages: hist.map((m, idx) => ({
              role:m.role,
              content: (idx === hist.length-1 && m.role === 'user')
                ? [ { type:'image', source:{ type:'base64', media_type:'image/jpeg', data:imageCopy.split(',')[1] } }, { type:'text', text:m.content } ]
                : m.content,
            })),
            isCreatorMode, currentMood, needsSearch, maxTokens:MAX_TOKENS[responseLength],
          }
        : {
            messages: hist.map(m => ({ role:m.role, content:m.content })),
            isCreatorMode, currentMood, needsSearch, maxTokens:MAX_TOKENS[responseLength],
          };

      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const extra = parseDashboardUpdates(data.content);
      const assistantMsg: Message = {
        id:uuidv4(), role:'assistant',
        content: data.content + extra,
        timestamp:new Date(), mood:safeMood(data.mood) as MoodType,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setCurrentMood(safeMood(data.mood));
      setLatestMsgId(assistantMsg.id);
      extractMemoriesFromMessage(text, data.content).catch(() => {});
      markStudy();
      if (voiceOutput) speakText(data.content);
      if (sfx)         playChime();
      if (autoSave)    setTimeout(persistConversation, 1_000);

    } catch (err: any) {
      let msg = err?.message || 'Something went wrong.';
      if (msg.includes('429') || msg.includes('rate limit')) msg = '⏱️ Rate limit — please wait a moment.';
      else if (msg.includes('401') || msg.includes('API key')) msg = '🔑 Auth error. Please contact support.';
      else if (msg.includes('context length')) msg = '📝 Context too long — start a new chat.';
      else if (hasImage) msg = '📷 Image processing failed. Please try again.';
      setMessages(prev => [...prev, { id:uuidv4(), role:'assistant' as const, content:`⚠️ ${msg}`, timestamp:new Date() }]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speakText = (raw: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = raw.replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').replace(/[*_~`]/g,'').slice(0,600);
    const u = new SpeechSynthesisUtterance(clean);
    u.pitch=1.45; u.rate=1.1; u.lang='en-IN';
    const speak = () => {
      const vs = window.speechSynthesis.getVoices();
      const f = vs.find(v => /samantha|victoria|karen|moira|veena|zira|google.*english.*female/i.test(v.name)) ?? vs.find(v => /female|woman/i.test(v.name));
      if (f) u.voice = f;
      window.speechSynthesis.speak(u);
    };
    if (voicesReady.current) speak();
    else window.speechSynthesis.onvoiceschanged = () => { voicesReady.current=true; speak(); };
  };

  // ── Chime ─────────────────────────────────────────────────────────────────
  const playChime = () => {
    try {
      const ctx=new AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value=880; osc.type='sine';
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.28);
      osc.start(); osc.stop(ctx.currentTime+0.28);
    } catch {}
  };

  // ── Voice recording ───────────────────────────────────────────────────────
  const startRecording = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported'); return; }
    const r = new SR(); r.lang='en-IN'; r.continuous=false; r.interimResults=true; r.maxAlternatives=3;
    let final = '';
    r.onstart  = () => setIsRecording(true);
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tx = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tx+' '; else interim += tx;
      }
      setInput(final+interim);
    };
    r.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error==='audio-capture') alert('Microphone not found.');
      else if (e.error==='not-allowed') alert('Mic access denied.');
      else if (e.error!=='no-speech') alert('Voice failed, try again.');
    };
    r.onend = () => setIsRecording(false);
    recognitionRef.current = r;
    try { r.start(); } catch { setIsRecording(false); }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) { recognitionRef.current.stop(); recognitionRef.current=null; }
  };

  // ── Creator mode ──────────────────────────────────────────────────────────
  const unlockCreatorModeAction = () => {
    persistConversation();
    setIsCreatorMode(true); setCurrentConvId(uuidv4()); setCurrentMood('loving'); lockCreatorMode();
    const pb = lsGet('tessa-pending-briefing');
    const init: Message = { id:uuidv4(), role:'assistant', content:pb??getRandomWelcomeMessage(), timestamp:new Date(), mood:'loving' as MoodType };
    if (pb) lsRemove('tessa-pending-briefing');
    setMessages([init]); setShowSecretModal(false); setShowSettings(false);
    if (sfx) playChime();
  };

  const exitCreatorMode = () => {
    persistConversation();
    setIsCreatorMode(false); unlockCreatorMode();
    setCurrentConvId(uuidv4()); setCurrentMood('calm');
    setMessages([]); setShowDashboard(false);
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144)+'px';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-[#050816] flex items-center justify-center">
        <div className="text-center space-y-5">
          <div className="relative inline-flex">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/30 animate-pulse"
              style={{ background:'linear-gradient(135deg,#06b6d4,#6366f1)' }}>
              <Sparkles size={28} className="text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 animate-ping" />
          </div>
          <div>
            <p className="text-white text-xl font-black tracking-[0.35em] uppercase">T.E.S.S.A.</p>
            <p className="text-white/30 text-xs mt-1 tracking-[0.15em]">Initialising…</p>
          </div>
          <div className="flex gap-1.5 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay:`${i*150}ms` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen ${t.bg} ${t.text} flex overflow-hidden relative transition-colors duration-500`}>

      {/* Layer 0 — atmosphere */}
      <AuroraBg glow={t.glow} glow2={glow2} isLight={t.isLight} />
      {isCreatorMode && animations && <Hearts on />}

      {/* ─── SIDEBAR OVERLAY (mobile backdrop) ─── */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setShowSidebar(false)} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ═══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-30 md:z-10
          flex-shrink-0 flex flex-col h-screen border-r
          transition-all duration-300 ease-in-out
          ${t.panel}
          ${showSidebar ? 'w-[270px] translate-x-0 opacity-100' : 'w-[270px] -translate-x-full md:w-0 opacity-0 md:opacity-100 md:translate-x-0 overflow-hidden'}
        `}
        aria-label="Navigation"
      >
        <div className="flex flex-col h-full w-[270px]">

          {/* Sidebar top bar */}
          <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${t.div}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isCreatorMode ? 'linear-gradient(135deg,#ec4899,#a855f7)' : 'linear-gradient(135deg,#06b6d4,#6366f1)' }}>
                <Sparkles size={13} className="text-white" />
              </div>
              <span className={`text-sm font-black tracking-[0.15em] ${t.accent}`}>T.E.S.S.A.</span>
            </div>
            <button onClick={() => setShowSidebar(false)}
              className="p-1.5 rounded-lg hover:bg-white/8 transition-colors md:hidden">
              <X size={14} className={t.sub} />
            </button>
          </div>

          {/* Quick Notes */}
          <div className="flex-shrink-0">
            <button
              onClick={() => setNotesExpanded(p => !p)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold ${t.accent} hover:bg-white/[0.03] transition-colors`}
            >
              <span className="flex items-center gap-2"><StickyNote size={12} />Quick Notes</span>
              {notesExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {notesExpanded && (
              <div className={`max-h-52 overflow-y-auto border-b ${t.div}`}>
                <NotesPanel />
              </div>
            )}
          </div>

          {/* New chat + history */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-3 pt-3 pb-2">
              <p className={`text-[9px] font-bold tracking-[0.18em] uppercase ${t.sub} mb-2`}>
                {isCreatorMode ? '💬 Our Chats' : '💬 History'}
              </p>
              <button onClick={startNewChat}
                className={`w-full py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98 ${t.btnS}`}>
                <Plus size={12} />New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {shownConvs.length === 0 && (
                <div className="text-center py-8">
                  <p className={`text-[10px] ${t.sub}`}>No conversations yet</p>
                </div>
              )}
              {shownConvs.map(conv => (
                <div key={conv.id} onClick={() => openConversation(conv)}
                  className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${conv.id === currentConvId ? t.active : `${t.card} hover:bg-white/[0.04]`}`}>
                  <p className="text-[11px] font-medium truncate pr-6 leading-snug">{conv.title}</p>
                  <div className={`flex items-center gap-1.5 mt-0.5 ${t.sub}`} style={{ fontSize:9 }}>
                    <Clock size={8} />
                    <span>{conv.messages.length} msgs</span>
                    <span>·</span>
                    <span>{new Date(conv.updated).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeConversation(conv.id); }}
                    className="absolute right-2 top-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div className={`flex-shrink-0 px-4 py-2 border-t ${t.div} flex items-center gap-3`}>
            <div className="flex items-center gap-1">
              <Brain size={9} className={t.sub} />
              <span className={`text-[9px] ${t.sub}`}>{getAllMemories().length} memories</span>
            </div>
            {user && !isGuest && (
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400">Cloud</span>
              </div>
            )}
          </div>

          {/* Account footer */}
          <div className={`flex-shrink-0 px-3 py-3 border-t ${t.div}`}>
            {user && !isGuest ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${t.glow},${glow2})` }}>
                  <User size={12} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium truncate`}>{user.email}</p>
                  <p className={`text-[9px] ${t.sub}`}>Signed in ·
                    <span className="text-emerald-400 ml-1">●</span>
                  </p>
                </div>
                <button onClick={handleSignOut}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors" title="Sign out">
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button onClick={() => alert('Configure Supabase auth!')}
                className={`w-full py-2 rounded-xl text-[11px] font-medium transition-all ${t.btnS}`}>
                👤 Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          SETTINGS PANEL — slides over sidebar from the left
      ═══════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setShowSettings(false)} />
          <div
            className={`
              fixed left-0 top-0 bottom-0 z-50
              w-[min(88vw,340px)]
              flex flex-col
              shadow-2xl
              animate-slide-in-left
              ${t.settBg}
            `}
            onClick={e => e.stopPropagation()}
          >
            {/* Settings header */}
            <div className={`flex-shrink-0 flex items-center justify-between px-5 py-4 border-b ${t.div}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{ background:`${t.glow}18`, border:`1px solid ${t.glow}28` }}>
                  <Settings size={13} style={{ color:t.glow }} />
                </div>
                <h2 className="font-bold text-sm">Settings</h2>
              </div>
              <button onClick={() => setShowSettings(false)}
                className="p-1.5 rounded-xl hover:bg-white/8 transition-colors">
                <X size={15} className={t.sub} />
              </button>
            </div>

            {/* Settings scroll body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">

              {/* Appearance */}
              <div>
                <SLabel label="Appearance" />
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {([
                    ['dark',      '🌙', 'Dark'],
                    ['light',     '☀️', 'Light'],
                    ['cyberpunk', '⚡', 'Cyberpunk'],
                    ['ocean',     '🌊', 'Ocean'],
                    ['sunset',    '🌅', 'Sunset'],
                  ] as [Theme,string,string][]).map(([th, ico, lbl]) => (
                    <button key={th} onClick={() => setTheme(th)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all duration-200 ${theme === th ? 'text-white' : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/45 border border-white/[0.07]'}`}
                      style={theme === th ? { background:`linear-gradient(135deg,${t.glow}28,${t.glow}12)`, border:`1px solid ${t.glow}35`, color:t.glow } : {}}>
                      <span>{ico}</span>{lbl}
                      {theme === th && <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background:t.glow }} />}
                    </button>
                  ))}
                </div>
                <Toggle label="Animations & Effects" sub="Particles, glows, transitions"
                  checked={animations} onChange={setAnimations} color={t.glow} />
              </div>

              <Hr cls={t.div} />

              {/* Avatar */}
              <div>
                <SLabel label="Avatar" />
                <button onClick={() => { setShowAvatarModal(true); setShowSettings(false); }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${t.btnS}`}>
                  Choose Avatar Preset
                </button>
              </div>

              <Hr cls={t.div} />

              {/* Audio */}
              <div>
                <SLabel label="Audio" />
                <div className="space-y-2">
                  <Toggle label="Voice Output" sub="Read responses aloud via TTS"
                    checked={voiceOutput} onChange={setVoiceOutput} color={t.glow} />
                  <Toggle label="Sound Effects" sub="Chime sound when message sent"
                    checked={sfx} onChange={setSfx} color={t.glow} />
                </div>
              </div>

              <Hr cls={t.div} />

              {/* AI behaviour */}
              <div>
                <SLabel label="AI Behaviour" />
                <div className="space-y-3">
                  <div>
                    <p className={`text-[10px] mb-1.5 ${t.sub}`}>Response Length</p>
                    <div className="flex gap-1">
                      {(['short','medium','long'] as ResponseLength[]).map(l => (
                        <button key={l} onClick={() => setResponseLength(l)}
                          className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all ${responseLength === l ? 'text-white' : `bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.07]`}`}
                          style={responseLength === l ? { background:`linear-gradient(135deg,${t.glow},${t.glow}80)`, boxShadow:`0 2px 12px ${t.glow}40` } : {}}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle label="Auto Web Search" sub="Fetches current info when needed"
                    checked={autoSearch} onChange={setAutoSearch} color={t.glow} />
                  <Toggle label="Typing Animation" sub="Streams response character by character"
                    checked={typingEnabled} onChange={setTypingEnabled} color={t.glow} />
                </div>
              </div>

              <Hr cls={t.div} />

              {/* Data */}
              <div>
                <SLabel label="Data & Privacy" />
                <div className="space-y-2">
                  <Toggle label="Auto-save Chats"
                    sub={user && !isGuest ? '☁️ Cloud sync enabled' : '📱 Saved locally'}
                    checked={autoSave} onChange={setAutoSave} color={t.glow} />
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[11px] text-white/60">Memories</p>
                      <p className={`text-[9px] ${t.sub}`}>{getAllMemories().length} facts stored</p>
                    </div>
                    <button onClick={() => { if (confirm('Clear all memories?')) clearAllMemories(); }}
                      className="px-2.5 py-1 rounded-lg text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all">
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <Hr cls={t.div} />

              {/* Mode toggle */}
              <div>
                <SLabel label="Mode" />
                {!isCreatorMode ? (
                  <button onClick={() => setShowSecretModal(true)}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border border-pink-500/22 text-pink-300 hover:bg-pink-500/10 transition-all flex items-center justify-center gap-2"
                    style={{ background:'linear-gradient(135deg,rgba(236,72,153,0.06),rgba(168,85,247,0.06))' }}>
                    <Heart size={12} className="text-pink-400" />Unlock Creator Mode
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="px-3 py-2.5 rounded-xl border border-pink-500/20 bg-pink-500/[0.05] flex items-center gap-2">
                      <Heart size={11} className="text-pink-400 fill-pink-400 animate-pulse" />
                      <span className="text-[11px] text-pink-300 font-bold">Creator Mode Active 💝</span>
                    </div>
                    <button onClick={exitCreatorMode}
                      className="w-full py-2 rounded-xl text-[11px] border border-white/10 hover:bg-white/5 text-white/40 hover:text-white/70 transition-all">
                      Exit to Standard Mode
                    </button>
                  </div>
                )}
              </div>

              <div className="h-4" />
            </div>

            {/* Settings footer */}
            <div className={`flex-shrink-0 px-4 py-3 border-t ${t.div}`}>
              <p className={`text-[9px] text-center ${t.sub}`}>
                T.E.S.S.A. v3.0 · {user && !isGuest ? '☁️ Cloud' : '👤 Guest'} Mode
              </p>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN COLUMN
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 relative z-10">

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className={`flex-shrink-0 ${t.header} px-3 md:px-4`}>
          <div className="flex items-center justify-between gap-2 h-14">

            {/* Left cluster */}
            <div className="flex items-center gap-2.5 min-w-0">

              {/* Hamburger */}
              <button
                onClick={() => setShowSidebar(p => !p)}
                className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 hover:bg-white/[0.07] active:scale-90 ${showSidebar ? 'bg-white/[0.07]' : ''}`}
                aria-label="Toggle sidebar"
              >
                {showSidebar ? <X size={18} /> : <Menu size={18} />}
              </button>

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-9 h-9 rounded-xl overflow-hidden border-2 transition-all duration-500"
                  style={{ borderColor:`${t.glow}70`, boxShadow: animations ? `0 0 14px ${t.glow}35` : 'none' }}>
                  <img src={avatarSrc} alt="TESSA" className="w-full h-full object-cover"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = '/avatars/cosmic.png'; }} />
                </div>
                {/* Live dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[2px]"
                  style={{ background:t.glow, borderColor:'rgba(0,0,0,0.6)', boxShadow:`0 0 6px ${t.glow}` }} />
              </div>

              {/* Name + status */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className={`text-sm font-black tracking-[0.18em] uppercase ${t.accent}`}>T.E.S.S.A.</h1>
                  {isCreatorMode && <Heart size={10} className="text-pink-400 fill-pink-400 flex-shrink-0 animate-pulse" />}
                </div>
                <p className={`text-[10px] ${t.sub} truncate`}>
                  {isCreatorMode ? `💝 Personal · ${moodEmoji} ${moodLabel}` : `${moodEmoji} ${moodLabel}`}
                </p>
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-0.5 flex-shrink-0">

              {/* Mood chip */}
              <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium mr-1"
                style={{ background:`${t.glow}12`, border:`1px solid ${t.glow}22`, color:t.glow }}>
                {moodEmoji} {moodLabel}
              </span>

              {/* Planner (creator) */}
              {isCreatorMode && (
                <button onClick={() => setShowPlanners(true)} title="Smart Planners"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.07] ${t.sub} hover:${t.text}`}>
                  <Calendar size={16} />
                </button>
              )}

              {/* Dashboard (creator) */}
              {isCreatorMode && (
                <button onClick={() => setShowDashboard(p => !p)} title="Dashboard"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showDashboard ? 'bg-pink-500/12 text-pink-300' : `hover:bg-white/[0.07] ${t.sub}`}`}>
                  <LayoutDashboard size={16} />
                </button>
              )}

              {/* Theme */}
              <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.07] ${t.sub}`}>
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>

              {/* Settings */}
              <button onClick={() => setShowSettings(p => !p)} title="Settings"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showSettings ? 'text-white/90' : `hover:bg-white/[0.07] ${t.sub}`}`}
                style={showSettings ? { background:`${t.glow}10`, outline:`1px solid ${t.glow}25` } : {}}>
                <Settings size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* ── MESSAGES ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5 scroll-smooth">
          <div className="max-w-2xl mx-auto w-full">

            {showDashboard && isCreatorMode ? (
              <PersonalDashboard />
            ) : (
              <div className="space-y-3 pb-2">

                {/* Empty state */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 select-none">
                    <div className="relative mb-6">
                      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl"
                        style={{
                          background:`linear-gradient(135deg,${t.glow}1a,${t.glow}08)`,
                          border:`1px solid ${t.glow}22`,
                          boxShadow: animations ? `0 0 40px ${t.glow}12` : 'none',
                        }}>
                        {isCreatorMode ? '💝' : '✨'}
                      </div>
                      {animations && (
                        <div className="absolute inset-0 rounded-3xl animate-ping opacity-20"
                          style={{ border:`1px solid ${t.glow}` }} />
                      )}
                    </div>
                    <h2 className={`text-lg font-bold mb-1.5`}>
                      {isCreatorMode ? 'Hey Ankit! 💕' : 'Hello!'}
                    </h2>
                    <p className={`text-sm ${t.sub} text-center max-w-xs leading-relaxed`}>
                      {isCreatorMode
                        ? "I'm always here for you. What's on your mind?"
                        : "I'm T.E.S.S.A. — your AI assistant. Ask me anything!"}
                    </p>
                    {/* Prompt chips */}
                    <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-sm">
                      {(isCreatorMode
                        ? ['How are you?','Plan my day 📅','Motivate me 💪','Tell me something nice ✨']
                        : ['Explain AI to me','Help me code','Write an essay','Latest tech news?']
                      ).map(q => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:scale-105 active:scale-95 ${t.btnS}`}
                          style={{ border:`1px solid ${t.glow}18` }}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map(msg => {
                  const isUser  = msg.role === 'user';
                  const isLatest = msg.id === latestMsgId;
                  const time    = new Date(msg.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
                  const emoji   = msg.mood ? MOOD_EMOJI[msg.mood] : null;

                  return (
                    <div key={msg.id}
                      className={`rounded-2xl overflow-hidden animate-fadeIn transition-all duration-300 ${isUser ? t.msgU : t.msgA}`}
                      style={isLatest && !isUser && animations ? { boxShadow:`0 0 20px ${t.glow}10` } : {}}>

                      {/* Bubble header */}
                      <div className={`flex items-center justify-between px-4 pt-3 pb-1`}>
                        <div className={`flex items-center gap-1.5 text-[10px] ${t.sub}`}>
                          {isUser ? (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full bg-white/10 flex items-center justify-center">
                                <User size={8} />
                              </div>
                              <span>You</span>
                            </>
                          ) : (
                            <>
                              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                style={{ background:`${t.glow}28` }}>
                                <Sparkles size={7} style={{ color:t.glow }} />
                              </div>
                              <span style={{ color:t.glow }}>T.E.S.S.A.</span>
                              {emoji && <span className="text-[11px]">{emoji}</span>}
                            </>
                          )}
                        </div>
                        <span className={`text-[9px] ${t.sub}`}>{time}</span>
                      </div>

                      {/* Bubble body */}
                      <div className="px-4 pb-3.5">
                        <MessageRenderer
                          content={msg.content}
                          className={`text-sm leading-relaxed ${t.isLight ? 'text-slate-800' : 'text-white/90'}`}
                          animate={typingEnabled && !isUser && isLatest}
                          isCreatorMode={isCreatorMode}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isLoading && (
                  <div className={`rounded-2xl overflow-hidden animate-fadeIn ${t.msgA}`}>
                    <div className="px-4 py-3.5">
                      <TypingDots glow={t.glow} />
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── INPUT BAR ──────────────────────────────────────────────────── */}
        {!showDashboard && (
          <div className={`flex-shrink-0 ${t.bar} px-3 md:px-6 py-3`}>
            <div className="max-w-2xl mx-auto w-full">

              {/* Image preview */}
              {selectedImage && (
                <div className="mb-2.5 flex items-start gap-2">
                  <div className="relative">
                    <img src={selectedImage} alt="Preview"
                      className="max-h-28 max-w-[160px] rounded-xl object-cover border"
                      style={{ borderColor:`${t.glow}25` }} />
                    <button onClick={removeSelectedImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                  <p className={`text-[10px] ${t.sub} mt-1`}>📎 Image attached</p>
                </div>
              )}

              {/* Input row */}
              <div className="flex items-end gap-2">

                {/* Attach */}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} title="Attach image"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${selectedImage ? 'text-white' : t.btnS}`}
                  style={selectedImage ? { background:`${t.glow}18`, outline:`1px solid ${t.glow}35` } : {}}>
                  <Paperclip size={16} />
                </button>

                {/* Voice */}
                <button
                  onMouseDown={startRecording} onMouseUp={stopRecording}
                  onTouchStart={e => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
                  disabled={isLoading} title="Hold to speak"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${isRecording ? 'bg-red-500/80 border border-red-400/50 text-white shadow-lg shadow-red-500/30 animate-pulse' : t.btnS}`}>
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>

                {/* Text area */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={handleTextareaInput}
                    placeholder={isCreatorMode ? 'Tell me anything, Ankit…' : 'Message T.E.S.S.A…'}
                    disabled={isLoading}
                    rows={1}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm resize-none outline-none transition-all duration-200 disabled:opacity-60 ${t.inp}`}
                    style={{ minHeight:'44px', maxHeight:'144px', lineHeight:'1.5', color: t.isLight ? '#1e293b' : '#fff' }}
                  />
                  {input.length > 200 && (
                    <span className={`absolute right-3 bottom-2 text-[9px] ${t.sub}`}>{input.length}</span>
                  )}
                </div>

                {/* Send */}
                <button onClick={() => sendMessage()}
                  disabled={(!input.trim() && !selectedImage) || isLoading}
                  title="Send (Enter)"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 ${t.btnP}`}>
                  {isLoading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send size={16} />}
                </button>
              </div>

              {/* Hint row */}
              <div className={`flex items-center justify-between mt-1.5 px-1`}>
                <p className={`text-[9px] ${t.sub}`}>
                  {isRecording ? '🎤 Listening…' : 'Enter to send · Shift+Enter for newline'}
                </p>
                <div className="flex items-center gap-3">
                  {autoSearch && !isCreatorMode && (
                    <span className={`text-[9px] ${t.sub} flex items-center gap-1`}>
                      <span>🔍</span>Web search on
                    </span>
                  )}
                  {isCreatorMode && (
                    <span className="text-[9px] text-pink-400/60 flex items-center gap-1">
                      <Heart size={8} />Creator Mode
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT WELLNESS PANEL
      ═══════════════════════════════════════════════════════════════════ */}
      {showDashboard && isCreatorMode && (
        <>
          <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setShowDashboard(false)} />
          <aside
            className={`fixed right-0 inset-y-0 z-30 md:relative md:z-10 flex-shrink-0 flex flex-col h-screen overflow-hidden border-l w-[min(82vw,240px)] ${t.panel}`}
            aria-label="Wellness panel">

            {/* Panel header */}
            <div className={`flex-shrink-0 flex items-center justify-between px-3.5 py-3 border-b ${t.div}`}>
              <div className="flex items-center gap-2">
                <Activity size={12} style={{ color:t.glow }} />
                <span className={`text-xs font-bold ${t.accent}`}>Wellness</span>
              </div>
              <button onClick={() => setShowDashboard(false)}
                className="p-1 rounded-lg hover:bg-white/8 transition-colors md:hidden">
                <X size={13} className={t.sub} />
              </button>
            </div>

            {/* Profile card */}
            <div className="flex-shrink-0 p-3">
              <ProfileCard avatarPath={avatarSrc} mood={currentMood}
                isCreatorMode={isCreatorMode} animationsEnabled={animations} />
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3">

              <DailyWellness isCreatorMode={isCreatorMode} refreshTrigger={wellnessVersion} />

              {/* Water */}
              <div className={`rounded-xl p-3 ${t.card}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Droplets size={12} className="text-blue-400" />
                  <span className="text-[11px] font-semibold text-blue-400">Hydration</span>
                </div>
                <button onClick={() => { addWater(1); setWellnessVersion(v => v+1); }}
                  className={`w-full py-2 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${t.btnS}`}>
                  💧 +1 Glass of Water
                </button>
              </div>

              {/* Study timer */}
              <div className={`rounded-xl p-3 ${t.card}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <BookOpen size={12} style={{ color:t.glow }} />
                  <span className={`text-[11px] font-semibold ${t.accent}`}>Study Timer</span>
                </div>
                <StudyTimer />
              </div>

              {/* Insights */}
              <div className={`rounded-xl p-3 ${t.card}`}>
                <TessaInsights isCreatorMode={isCreatorMode} />
              </div>

              {/* Memory */}
              <div className={`rounded-xl p-3 ${t.card}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain size={12} style={{ color:t.glow }} />
                  <span className={`text-[11px] font-semibold ${t.accent}`}>Memory</span>
                </div>
                <p className={`text-[10px] ${t.sub} mb-2`}>{getAllMemories().length} facts remembered</p>
                <button onClick={() => { if (confirm('Clear all memories?')) clearAllMemories(); }}
                  className="w-full py-1.5 rounded-lg text-[10px] border border-red-500/20 bg-red-500/[0.07] hover:bg-red-500/15 text-red-400 transition-all">
                  Clear All Memories
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODALS
      ═══════════════════════════════════════════════════════════════════ */}
      {showSecretModal && <SecretVerification onSuccess={unlockCreatorModeAction} onClose={() => setShowSecretModal(false)} />}
      {showAvatarModal && <AvatarPresets currentAvatar={avatar} onAvatarChange={path => { setAvatar(path); lsSet('tessa-avatar-preset', path); }} onClose={() => setShowAvatarModal(false)} />}
      {showPlanners    && <PlannerHub onClose={() => setShowPlanners(false)} />}
      {showFlashcards  && <FlashcardGenerator isCreatorMode={isCreatorMode} onClose={() => setShowFlashcards(false)} />}
      {showReportCard  && <ReportCard isCreatorMode={isCreatorMode} onClose={() => setShowReportCard(false)} />}

    </div>
  );
}
