'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Mic, MicOff, Menu, X, Settings, Heart, Plus,
  Trash2, LogOut, User, LayoutDashboard, Sun, Moon,
  Calendar, ChevronDown, ChevronUp, StickyNote, Paperclip,
  Sparkles, Brain, Activity, Clock, MessageSquare,
  Volume2, Shield, Droplets, BookOpen, Zap, Star,
  Bell, BellOff, Eye, EyeOff, Palette, RotateCcw,
  Languages, Monitor, Smartphone, Download, Upload,
  Lock, Unlock, Cpu, BarChart3, Hash,
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
type Theme          = 'dark' | 'light' | 'cyberpunk' | 'ocean' | 'sunset' | 'pastel' | 'sakura' | 'ankit';
type ResponseLength = 'short' | 'medium' | 'long';
type FontSize       = 'sm' | 'base' | 'lg';
type Language       = 'en' | 'hi' | 'hinglish';

interface HealthSnapshot {
  weight: number; height: number;
  meals: { time: string; meal: string; calories: number; confidence: string }[];
  totalCalories: number; sleepHours?: number; date: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MAX_TOKENS: Record<ResponseLength, number> = { short: 350, medium: 700, long: 1400 };
const VALID_MOODS: MoodType[] = ['happy','calm','confident','worried','flirty','loving','thinking','listening','playful','focused'];
const MOOD_EMOJI: Record<string, string> = {
  happy:'😊', calm:'😌', confident:'💪', worried:'😟',
  flirty:'😏', loving:'💕', thinking:'🤔', listening:'👂',
  playful:'😄', focused:'🎯',
};

// Fixed persona — always Tessa
const TESSA = { name: 'Tessa', tagline: 'The Exceptional System, Surpassing All' };

// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM
// Key fix: every theme has BOTH isLight-aware text colours for settings panel
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:'bg-[#050816]', bgC:'bg-[#0b0418]',
    panel:'bg-[#090c1d]/85 backdrop-blur-xl border-white/[0.05]',
    panelC:'bg-[#0e0420]/85 backdrop-blur-xl border-pink-500/[0.08]',
    header:'bg-black/45 backdrop-blur-2xl border-b border-white/[0.06]',
    headerC:'bg-black/55 backdrop-blur-2xl border-b border-pink-500/[0.10]',
    bar:'bg-black/40 backdrop-blur-2xl border-t border-white/[0.06]',
    barC:'bg-black/50 backdrop-blur-2xl border-t border-pink-500/[0.10]',
    msgU:'bg-gradient-to-br from-[#0d2040] to-[#08152a] border border-cyan-500/[0.14] border-l-[3px] border-l-cyan-500',
    msgUC:'bg-gradient-to-br from-[#1e0635] to-[#120418] border border-pink-500/[0.14] border-l-[3px] border-l-pink-500',
    msgA:'bg-gradient-to-br from-[#07101e] to-[#050b16] border border-violet-500/[0.09] border-l-[3px] border-l-violet-500/60',
    msgAC:'bg-gradient-to-br from-[#0e031d] to-[#070113] border border-purple-500/[0.09] border-l-[3px] border-l-purple-500/60',
    inp:'bg-white/[0.04] border border-white/[0.10] text-white placeholder:text-white/20 focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-500/10',
    inpC:'bg-pink-950/[0.18] border border-pink-500/[0.16] text-white placeholder:text-pink-200/22 focus:border-pink-400/50 focus:ring-2 focus:ring-pink-500/10',
    btnP:'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/[0.22]',
    btnPC:'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white shadow-lg shadow-pink-500/[0.22]',
    btnS:'bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/60 hover:text-white/90',
    btnSC:'bg-pink-500/[0.07] hover:bg-pink-500/[0.13] border border-pink-500/[0.15] text-pink-300/80 hover:text-pink-200',
    text:'text-white', sub:'text-white/40', subC:'text-pink-200/40',
    accent:'text-cyan-400', accentC:'text-pink-400',
    glow:'#06b6d4', glowC:'#ec4899',
    card:'bg-white/[0.025] border border-white/[0.055]',
    cardC:'bg-pink-500/[0.035] border border-pink-500/[0.07]',
    active:'bg-cyan-500/[0.09] border border-cyan-500/[0.18]',
    activeC:'bg-pink-500/[0.09] border border-pink-500/[0.18]',
    div:'border-white/[0.05]', divC:'border-pink-500/[0.07]',
    // Settings panel — uses CSS vars via isLight flag
    settBg:'bg-[#07091a]/96 backdrop-blur-2xl border-r border-white/[0.07]',
    settBgC:'bg-[#0d0320]/96 backdrop-blur-2xl border-r border-pink-500/[0.09]',
    // Settings text (dark mode is always white-ish)
    settText:'text-white/75', settTextHover:'hover:text-white',
    settSub:'text-white/28', settLabel:'text-white/20',
    settCard:'bg-white/[0.04] border border-white/[0.07]',
    settActive:'bg-white/[0.07] border border-white/[0.12]',
    isLight:false,
  },
  light: {
    bg:'bg-[#f0f4ff]', bgC:'bg-[#fff0f5]',
    panel:'bg-white/85 backdrop-blur-xl border-slate-200/70',
    panelC:'bg-rose-50/90 backdrop-blur-xl border-pink-200/60',
    header:'bg-white/80 backdrop-blur-2xl border-b border-slate-200/60 shadow-sm shadow-slate-900/[0.04]',
    headerC:'bg-white/80 backdrop-blur-2xl border-b border-pink-200/50 shadow-sm shadow-pink-500/[0.04]',
    bar:'bg-white/88 backdrop-blur-2xl border-t border-slate-200/60 shadow-sm shadow-slate-900/[0.03]',
    barC:'bg-white/88 backdrop-blur-2xl border-t border-pink-200/50',
    msgU:'bg-gradient-to-br from-sky-50 to-cyan-50/50 border border-cyan-200/55 border-l-[3px] border-l-cyan-400',
    msgUC:'bg-gradient-to-br from-pink-50 to-rose-50/50 border border-pink-200/55 border-l-[3px] border-l-pink-400',
    msgA:'bg-white/80 border border-slate-200/60 border-l-[3px] border-l-violet-400',
    msgAC:'bg-white/80 border border-purple-200/50 border-l-[3px] border-l-purple-400',
    inp:'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/10',
    inpC:'bg-white border border-pink-200 text-slate-800 placeholder:text-pink-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-400/10',
    btnP:'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-md shadow-cyan-500/[0.18]',
    btnPC:'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-md shadow-pink-500/[0.18]',
    btnS:'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900',
    btnSC:'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-600 hover:text-pink-800',
    text:'text-slate-800', sub:'text-slate-400', subC:'text-slate-500',
    accent:'text-cyan-600', accentC:'text-pink-500',
    glow:'#0891b2', glowC:'#ec4899',
    card:'bg-white/70 border border-slate-200/70',
    cardC:'bg-white/70 border border-pink-200/60',
    active:'bg-cyan-50 border border-cyan-300',
    activeC:'bg-pink-50 border border-pink-300',
    div:'border-slate-200/60', divC:'border-pink-200/50',
    settBg:'bg-white/97 backdrop-blur-2xl border-r border-slate-200',
    settBgC:'bg-white/97 backdrop-blur-2xl border-r border-pink-200',
    // Settings text (light mode — must use dark colours!)
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-slate-50 border border-slate-200',
    settActive:'bg-slate-100 border border-slate-300',
    isLight:true,
  },
  cyberpunk: {
    bg:'bg-[#06000f]', bgC:'bg-[#0f0018]',
    panel:'bg-purple-950/30 backdrop-blur-xl border-purple-500/[0.11]',
    panelC:'bg-pink-950/30 backdrop-blur-xl border-pink-500/[0.11]',
    header:'bg-black/70 backdrop-blur-2xl border-b border-purple-500/[0.16]',
    headerC:'bg-black/70 backdrop-blur-2xl border-b border-pink-500/[0.16]',
    bar:'bg-black/60 backdrop-blur-2xl border-t border-purple-500/[0.16]',
    barC:'bg-black/60 backdrop-blur-2xl border-t border-pink-500/[0.16]',
    msgU:'bg-gradient-to-br from-purple-950/55 to-violet-950/28 border border-purple-500/[0.16] border-l-[3px] border-l-purple-400',
    msgUC:'bg-gradient-to-br from-pink-950/55 to-rose-950/28 border border-pink-500/[0.16] border-l-[3px] border-l-pink-400',
    msgA:'bg-gradient-to-br from-black/65 to-purple-950/18 border border-cyan-500/[0.09] border-l-[3px] border-l-cyan-400/70',
    msgAC:'bg-gradient-to-br from-black/65 to-pink-950/18 border border-purple-500/[0.09] border-l-[3px] border-l-purple-400/70',
    inp:'bg-black/45 border border-purple-500/[0.20] text-purple-100 placeholder:text-purple-300/28 focus:border-purple-400/55 focus:ring-2 focus:ring-purple-500/10',
    inpC:'bg-black/45 border border-pink-500/[0.20] text-pink-50 placeholder:text-pink-300/28 focus:border-pink-400/55 focus:ring-2 focus:ring-pink-500/10',
    btnP:'bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-500 hover:to-fuchsia-600 text-white shadow-lg shadow-purple-500/[0.26]',
    btnPC:'bg-gradient-to-r from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 text-white shadow-lg shadow-pink-500/[0.26]',
    btnS:'bg-purple-500/[0.07] hover:bg-purple-500/[0.14] border border-purple-500/[0.16] text-purple-300 hover:text-purple-100',
    btnSC:'bg-pink-500/[0.07] hover:bg-pink-500/[0.14] border border-pink-500/[0.16] text-pink-300 hover:text-pink-100',
    text:'text-purple-50', sub:'text-purple-300/40', subC:'text-pink-300/40',
    accent:'text-purple-400', accentC:'text-pink-400',
    glow:'#a855f7', glowC:'#ec4899',
    card:'bg-purple-950/[0.14] border border-purple-500/[0.09]',
    cardC:'bg-pink-950/[0.14] border border-pink-500/[0.09]',
    active:'bg-purple-500/[0.11] border border-purple-500/[0.22]',
    activeC:'bg-pink-500/[0.11] border border-pink-500/[0.22]',
    div:'border-purple-500/[0.07]', divC:'border-pink-500/[0.07]',
    settBg:'bg-[#09001a]/96 backdrop-blur-2xl border-r border-purple-500/[0.11]',
    settBgC:'bg-[#140010]/96 backdrop-blur-2xl border-r border-pink-500/[0.11]',
    settText:'text-purple-100/75', settTextHover:'hover:text-purple-50',
    settSub:'text-purple-300/30', settLabel:'text-purple-300/20',
    settCard:'bg-purple-950/[0.25] border border-purple-500/[0.12]',
    settActive:'bg-purple-500/[0.14] border border-purple-500/[0.28]',
    isLight:false,
  },
  ocean: {
    bg:'bg-[#020d1a]', bgC:'bg-[#070820]',
    panel:'bg-blue-950/28 backdrop-blur-xl border-blue-500/[0.11]',
    panelC:'bg-indigo-950/28 backdrop-blur-xl border-indigo-500/[0.11]',
    header:'bg-black/50 backdrop-blur-2xl border-b border-teal-500/[0.13]',
    headerC:'bg-black/50 backdrop-blur-2xl border-b border-purple-500/[0.13]',
    bar:'bg-black/46 backdrop-blur-2xl border-t border-teal-500/[0.13]',
    barC:'bg-black/46 backdrop-blur-2xl border-t border-purple-500/[0.13]',
    msgU:'bg-gradient-to-br from-blue-950/65 to-teal-950/38 border border-teal-500/[0.14] border-l-[3px] border-l-teal-400',
    msgUC:'bg-gradient-to-br from-indigo-950/65 to-purple-950/38 border border-purple-500/[0.14] border-l-[3px] border-l-purple-400',
    msgA:'bg-gradient-to-br from-slate-950/65 to-blue-950/22 border border-blue-500/[0.09] border-l-[3px] border-l-blue-400/70',
    msgAC:'bg-gradient-to-br from-slate-950/65 to-indigo-950/22 border border-indigo-500/[0.09] border-l-[3px] border-l-indigo-400/70',
    inp:'bg-blue-950/[0.32] border border-teal-500/[0.16] text-blue-50 placeholder:text-blue-300/28 focus:border-teal-400/55 focus:ring-2 focus:ring-teal-500/10',
    inpC:'bg-indigo-950/[0.32] border border-purple-500/[0.16] text-indigo-50 placeholder:text-purple-300/28 focus:border-purple-400/55 focus:ring-2 focus:ring-purple-500/10',
    btnP:'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white shadow-lg shadow-teal-500/[0.23]',
    btnPC:'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/[0.23]',
    btnS:'bg-teal-500/[0.07] hover:bg-teal-500/[0.14] border border-teal-500/[0.14] text-teal-300 hover:text-teal-100',
    btnSC:'bg-purple-500/[0.07] hover:bg-purple-500/[0.14] border border-purple-500/[0.14] text-purple-300 hover:text-purple-100',
    text:'text-blue-50', sub:'text-blue-300/40', subC:'text-purple-300/40',
    accent:'text-teal-400', accentC:'text-purple-400',
    glow:'#14b8a6', glowC:'#a855f7',
    card:'bg-blue-950/[0.18] border border-blue-500/[0.09]',
    cardC:'bg-indigo-950/[0.18] border border-indigo-500/[0.09]',
    active:'bg-teal-500/[0.09] border border-teal-500/[0.20]',
    activeC:'bg-purple-500/[0.09] border border-purple-500/[0.20]',
    div:'border-blue-500/[0.06]', divC:'border-purple-500/[0.06]',
    settBg:'bg-[#030e1c]/96 backdrop-blur-2xl border-r border-teal-500/[0.09]',
    settBgC:'bg-[#070820]/96 backdrop-blur-2xl border-r border-purple-500/[0.09]',
    settText:'text-blue-100/75', settTextHover:'hover:text-blue-50',
    settSub:'text-blue-300/30', settLabel:'text-blue-300/20',
    settCard:'bg-blue-950/[0.28] border border-blue-500/[0.12]',
    settActive:'bg-teal-500/[0.12] border border-teal-500/[0.26]',
    isLight:false,
  },
  sunset: {
    bg:'bg-[#110805]', bgC:'bg-[#17080f]',
    panel:'bg-orange-950/24 backdrop-blur-xl border-orange-500/[0.11]',
    panelC:'bg-rose-950/24 backdrop-blur-xl border-rose-500/[0.11]',
    header:'bg-black/50 backdrop-blur-2xl border-b border-orange-500/[0.13]',
    headerC:'bg-black/50 backdrop-blur-2xl border-b border-rose-500/[0.13]',
    bar:'bg-black/46 backdrop-blur-2xl border-t border-orange-500/[0.13]',
    barC:'bg-black/46 backdrop-blur-2xl border-t border-rose-500/[0.13]',
    msgU:'bg-gradient-to-br from-orange-950/65 to-amber-950/28 border border-orange-500/[0.14] border-l-[3px] border-l-orange-400',
    msgUC:'bg-gradient-to-br from-rose-950/65 to-pink-950/28 border border-rose-500/[0.14] border-l-[3px] border-l-rose-400',
    msgA:'bg-gradient-to-br from-stone-950/65 to-orange-950/14 border border-amber-500/[0.09] border-l-[3px] border-l-amber-400/70',
    msgAC:'bg-gradient-to-br from-stone-950/65 to-rose-950/14 border border-pink-500/[0.09] border-l-[3px] border-l-pink-400/70',
    inp:'bg-orange-950/[0.26] border border-orange-500/[0.16] text-orange-50 placeholder:text-orange-300/28 focus:border-amber-400/55 focus:ring-2 focus:ring-orange-500/10',
    inpC:'bg-rose-950/[0.26] border border-rose-500/[0.16] text-rose-50 placeholder:text-rose-300/28 focus:border-rose-400/55 focus:ring-2 focus:ring-rose-500/10',
    btnP:'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/[0.23]',
    btnPC:'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white shadow-lg shadow-rose-500/[0.23]',
    btnS:'bg-orange-500/[0.07] hover:bg-orange-500/[0.14] border border-orange-500/[0.14] text-orange-300 hover:text-orange-100',
    btnSC:'bg-rose-500/[0.07] hover:bg-rose-500/[0.14] border border-rose-500/[0.14] text-rose-300 hover:text-rose-100',
    text:'text-orange-50', sub:'text-orange-300/40', subC:'text-rose-300/40',
    accent:'text-amber-400', accentC:'text-rose-400',
    glow:'#f97316', glowC:'#f43f5e',
    card:'bg-orange-950/[0.16] border border-orange-500/[0.09]',
    cardC:'bg-rose-950/[0.16] border border-rose-500/[0.09]',
    active:'bg-orange-500/[0.09] border border-orange-500/[0.20]',
    activeC:'bg-rose-500/[0.09] border border-rose-500/[0.20]',
    div:'border-orange-500/[0.06]', divC:'border-rose-500/[0.06]',
    settBg:'bg-[#120905]/96 backdrop-blur-2xl border-r border-orange-500/[0.09]',
    settBgC:'bg-[#180810]/96 backdrop-blur-2xl border-r border-rose-500/[0.09]',
    settText:'text-orange-100/75', settTextHover:'hover:text-orange-50',
    settSub:'text-orange-300/30', settLabel:'text-orange-300/20',
    settCard:'bg-orange-950/[0.26] border border-orange-500/[0.12]',
    settActive:'bg-orange-500/[0.12] border border-orange-500/[0.26]',
    isLight:false,
  },
  // ── PASTEL: dark lavender-violet dream ─────────────────────────────────────
  pastel: {
    bg:'bg-[#100c1f]', bgC:'bg-[#160c22]',
    panel:'bg-[#1a1230]/80 backdrop-blur-xl border-violet-500/[0.12]',
    panelC:'bg-[#1e0d30]/80 backdrop-blur-xl border-fuchsia-500/[0.12]',
    header:'bg-black/40 backdrop-blur-2xl border-b border-violet-500/[0.14]',
    headerC:'bg-black/45 backdrop-blur-2xl border-b border-fuchsia-500/[0.14]',
    bar:'bg-black/36 backdrop-blur-2xl border-t border-violet-500/[0.14]',
    barC:'bg-black/40 backdrop-blur-2xl border-t border-fuchsia-500/[0.14]',
    msgU:'bg-gradient-to-br from-[#1e1240] to-[#130d2c] border border-violet-400/[0.18] border-l-[3px] border-l-violet-400',
    msgUC:'bg-gradient-to-br from-[#28103c] to-[#1a0c2a] border border-fuchsia-400/[0.18] border-l-[3px] border-l-fuchsia-400',
    msgA:'bg-gradient-to-br from-[#120f22] to-[#0e0b1a] border border-purple-500/[0.10] border-l-[3px] border-l-purple-400/60',
    msgAC:'bg-gradient-to-br from-[#150e26] to-[#100b1e] border border-violet-500/[0.10] border-l-[3px] border-l-violet-400/60',
    inp:'bg-violet-950/[0.30] border border-violet-400/[0.18] text-violet-50 placeholder:text-violet-300/30 focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/12',
    inpC:'bg-fuchsia-950/[0.28] border border-fuchsia-400/[0.18] text-fuchsia-50 placeholder:text-fuchsia-300/28 focus:border-fuchsia-400/60 focus:ring-2 focus:ring-fuchsia-500/12',
    btnP:'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white shadow-lg shadow-violet-500/[0.30]',
    btnPC:'bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-400 hover:to-pink-500 text-white shadow-lg shadow-fuchsia-500/[0.30]',
    btnS:'bg-violet-500/[0.08] hover:bg-violet-500/[0.16] border border-violet-500/[0.18] text-violet-300 hover:text-violet-100',
    btnSC:'bg-fuchsia-500/[0.08] hover:bg-fuchsia-500/[0.16] border border-fuchsia-500/[0.18] text-fuchsia-300 hover:text-fuchsia-100',
    text:'text-violet-50', sub:'text-violet-300/42', subC:'text-fuchsia-300/42',
    accent:'text-violet-400', accentC:'text-fuchsia-400',
    glow:'#7c3aed', glowC:'#d946ef',
    card:'bg-violet-950/[0.18] border border-violet-500/[0.10]',
    cardC:'bg-fuchsia-950/[0.18] border border-fuchsia-500/[0.10]',
    active:'bg-violet-500/[0.12] border border-violet-500/[0.24]',
    activeC:'bg-fuchsia-500/[0.12] border border-fuchsia-500/[0.24]',
    div:'border-violet-500/[0.08]', divC:'border-fuchsia-500/[0.08]',
    settBg:'bg-[#0e0b1e]/96 backdrop-blur-2xl border-r border-violet-500/[0.12]',
    settBgC:'bg-[#130b22]/96 backdrop-blur-2xl border-r border-fuchsia-500/[0.12]',
    settText:'text-violet-100/75', settTextHover:'hover:text-violet-50',
    settSub:'text-violet-300/32', settLabel:'text-violet-300/22',
    settCard:'bg-violet-950/[0.22] border border-violet-500/[0.12]',
    settActive:'bg-violet-500/[0.15] border border-violet-500/[0.28]',
    isLight:false,
  },
  // ── SAKURA: dark cherry-blossom night ────────────────────────────────────
  sakura: {
    bg:'bg-[#120810]', bgC:'bg-[#18080f]',
    panel:'bg-[#200c16]/80 backdrop-blur-xl border-rose-500/[0.12]',
    panelC:'bg-[#240c1a]/80 backdrop-blur-xl border-pink-500/[0.12]',
    header:'bg-black/42 backdrop-blur-2xl border-b border-rose-500/[0.14]',
    headerC:'bg-black/48 backdrop-blur-2xl border-b border-pink-500/[0.14]',
    bar:'bg-black/38 backdrop-blur-2xl border-t border-rose-500/[0.14]',
    barC:'bg-black/44 backdrop-blur-2xl border-t border-pink-500/[0.14]',
    msgU:'bg-gradient-to-br from-[#2a0e1a] to-[#1a0a12] border border-rose-400/[0.18] border-l-[3px] border-l-rose-400',
    msgUC:'bg-gradient-to-br from-[#2e0c1e] to-[#1e0a16] border border-pink-400/[0.18] border-l-[3px] border-l-pink-400',
    msgA:'bg-gradient-to-br from-[#170c10] to-[#100810] border border-rose-500/[0.09] border-l-[3px] border-l-rose-300/60',
    msgAC:'bg-gradient-to-br from-[#1a0c14] to-[#120810] border border-pink-500/[0.09] border-l-[3px] border-l-pink-300/60',
    inp:'bg-rose-950/[0.28] border border-rose-400/[0.18] text-rose-50 placeholder:text-rose-300/30 focus:border-rose-400/60 focus:ring-2 focus:ring-rose-500/12',
    inpC:'bg-pink-950/[0.28] border border-pink-400/[0.18] text-pink-50 placeholder:text-pink-300/28 focus:border-pink-400/60 focus:ring-2 focus:ring-pink-500/12',
    btnP:'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white shadow-lg shadow-rose-500/[0.28]',
    btnPC:'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white shadow-lg shadow-pink-500/[0.28]',
    btnS:'bg-rose-500/[0.08] hover:bg-rose-500/[0.16] border border-rose-500/[0.16] text-rose-300 hover:text-rose-100',
    btnSC:'bg-pink-500/[0.08] hover:bg-pink-500/[0.16] border border-pink-500/[0.16] text-pink-300 hover:text-pink-100',
    text:'text-rose-50', sub:'text-rose-300/42', subC:'text-pink-300/42',
    accent:'text-rose-400', accentC:'text-pink-400',
    glow:'#f43f5e', glowC:'#ec4899',
    card:'bg-rose-950/[0.18] border border-rose-500/[0.10]',
    cardC:'bg-pink-950/[0.18] border border-pink-500/[0.10]',
    active:'bg-rose-500/[0.12] border border-rose-500/[0.24]',
    activeC:'bg-pink-500/[0.12] border border-pink-500/[0.24]',
    div:'border-rose-500/[0.08]', divC:'border-pink-500/[0.08]',
    settBg:'bg-[#110810]/96 backdrop-blur-2xl border-r border-rose-500/[0.11]',
    settBgC:'bg-[#15080e]/96 backdrop-blur-2xl border-r border-pink-500/[0.11]',
    settText:'text-rose-100/75', settTextHover:'hover:text-rose-50',
    settSub:'text-rose-300/32', settLabel:'text-rose-300/22',
    settCard:'bg-rose-950/[0.22] border border-rose-500/[0.12]',
    settActive:'bg-rose-500/[0.15] border border-rose-500/[0.28]',
    isLight:false,
  },
  // ── ANKIT'S SPECIAL: midnight gold — deep obsidian + warm gold aurora ────
  ankit: {
    bg:'bg-[#09080e]', bgC:'bg-[#0e0812]',
    panel:'bg-[#0f0e1c]/85 backdrop-blur-xl border-yellow-500/[0.10]',
    panelC:'bg-[#150c20]/85 backdrop-blur-xl border-amber-500/[0.12]',
    header:'bg-black/55 backdrop-blur-2xl border-b border-yellow-500/[0.12]',
    headerC:'bg-black/60 backdrop-blur-2xl border-b border-amber-500/[0.14]',
    bar:'bg-black/50 backdrop-blur-2xl border-t border-yellow-500/[0.12]',
    barC:'bg-black/55 backdrop-blur-2xl border-t border-amber-500/[0.14]',
    msgU:'bg-gradient-to-br from-[#1a1508] to-[#0f0e0a] border border-yellow-500/[0.16] border-l-[3px] border-l-yellow-400',
    msgUC:'bg-gradient-to-br from-[#200d08] to-[#150a08] border border-amber-500/[0.16] border-l-[3px] border-l-amber-400',
    msgA:'bg-gradient-to-br from-[#100f16] to-[#0c0c12] border border-yellow-500/[0.08] border-l-[3px] border-l-yellow-600/50',
    msgAC:'bg-gradient-to-br from-[#140d16] to-[#0e0b12] border border-amber-500/[0.08] border-l-[3px] border-l-amber-600/50',
    inp:'bg-yellow-950/[0.20] border border-yellow-500/[0.18] text-yellow-50 placeholder:text-yellow-300/28 focus:border-yellow-400/55 focus:ring-2 focus:ring-yellow-500/12',
    inpC:'bg-amber-950/[0.20] border border-amber-500/[0.18] text-amber-50 placeholder:text-amber-300/28 focus:border-amber-400/55 focus:ring-2 focus:ring-amber-500/12',
    btnP:'bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-bold shadow-lg shadow-yellow-500/[0.30]',
    btnPC:'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black font-bold shadow-lg shadow-amber-500/[0.30]',
    btnS:'bg-yellow-500/[0.07] hover:bg-yellow-500/[0.14] border border-yellow-500/[0.15] text-yellow-300 hover:text-yellow-100',
    btnSC:'bg-amber-500/[0.07] hover:bg-amber-500/[0.14] border border-amber-500/[0.15] text-amber-300 hover:text-amber-100',
    text:'text-yellow-50', sub:'text-yellow-300/38', subC:'text-amber-300/38',
    accent:'text-yellow-400', accentC:'text-amber-400',
    glow:'#eab308', glowC:'#f59e0b',
    card:'bg-yellow-950/[0.14] border border-yellow-500/[0.08]',
    cardC:'bg-amber-950/[0.14] border border-amber-500/[0.08]',
    active:'bg-yellow-500/[0.10] border border-yellow-500/[0.22]',
    activeC:'bg-amber-500/[0.10] border border-amber-500/[0.22]',
    div:'border-yellow-500/[0.07]', divC:'border-amber-500/[0.07]',
    settBg:'bg-[#080810]/96 backdrop-blur-2xl border-r border-yellow-500/[0.10]',
    settBgC:'bg-[#0c0810]/96 backdrop-blur-2xl border-r border-amber-500/[0.10]',
    settText:'text-yellow-100/75', settTextHover:'hover:text-yellow-50',
    settSub:'text-yellow-300/30', settLabel:'text-yellow-300/20',
    settCard:'bg-yellow-950/[0.22] border border-yellow-500/[0.10]',
    settActive:'bg-yellow-500/[0.14] border border-yellow-500/[0.26]',
    isLight:false,
  },
} as const;

type ThemeTokens = (typeof THEMES)['dark'];

function useT(theme: Theme, c: boolean) {
  const T = THEMES[theme] as ThemeTokens;
  return {
    bg: c ? T.bgC : T.bg, panel: c ? T.panelC : T.panel,
    header: c ? T.headerC : T.header, bar: c ? T.barC : T.bar,
    msgU: c ? T.msgUC : T.msgU, msgA: c ? T.msgAC : T.msgA,
    inp: c ? T.inpC : T.inp, btnP: c ? T.btnPC : T.btnP,
    btnS: c ? T.btnSC : T.btnS,
    text: T.text, sub: c ? T.subC : T.sub,
    accent: c ? T.accentC : T.accent,
    glow: c ? T.glowC : T.glow,
    card: c ? T.cardC : T.card,
    active: c ? T.activeC : T.active,
    div: c ? T.divC : T.div,
    settBg: c ? T.settBgC : T.settBg,
    // Settings-specific text tokens — THEME-AWARE (fixes light mode white text bug)
    sText: T.settText, sTextH: T.settTextHover,
    sSub: T.settSub, sLabel: T.settLabel,
    sCard: T.settCard, sActive: T.settActive,
    isLight: T.isLight,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
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
// SHARED MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Beautiful animated background — works for all dark themes
function AuroraBg({ glow, glow2, theme }: { glow: string; glow2: string; theme: Theme }) {
  const isAnkit = theme === 'ankit';
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Main aurora blobs */}
      <div className="absolute rounded-full blur-[180px] animate-aurora-a"
        style={{ width:800, height:800, background:glow, opacity: isAnkit ? 0.10 : 0.07, top:'-25%', left:'-10%' }} />
      <div className="absolute rounded-full blur-[140px] animate-aurora-b"
        style={{ width:600, height:600, background:glow2, opacity: isAnkit ? 0.08 : 0.055, top:'30%', right:'-12%' }} />
      <div className="absolute rounded-full blur-[120px] animate-aurora-c"
        style={{ width:400, height:400, background:glow, opacity: isAnkit ? 0.07 : 0.045, bottom:'-8%', left:'40%' }} />
      {/* Extra mid-screen glow */}
      <div className="absolute rounded-full blur-[200px]"
        style={{ width:500, height:300, background:glow2, opacity: isAnkit ? 0.05 : 0.03, top:'55%', left:'15%' }} />
      {/* Ankit special: diagonal gold streak */}
      {isAnkit && (
        <div className="absolute blur-[80px] animate-aurora-b"
          style={{ width:900, height:120, background:`linear-gradient(90deg,transparent,${glow}30,${glow2}20,transparent)`, top:'38%', left:'-10%', transform:'rotate(-8deg)' }} />
      )}
      {/* Fine dot grid */}
      <div className="absolute inset-0" style={{
        backgroundImage:`radial-gradient(circle, ${glow}${isAnkit?'22':'16'} 1px, transparent 1px)`,
        backgroundSize: isAnkit ? '28px 28px' : '36px 36px', opacity: isAnkit ? 0.55 : 0.45,
      }} />
      {/* Scanline vignette */}
      <div className="absolute inset-0" style={{
        background:`radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(0,0,0,0.55) 100%)`,
      }} />
    </div>
  );
}

// Light theme: beautiful soft gradient mesh background (only used for light theme now)
function LightBg({ creator, theme }: { creator: boolean; theme: Theme }) {
  const grad = creator
    ? 'radial-gradient(ellipse 80% 60% at 20% 10%, #fce7f3 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #f3e8ff 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, #fff1f5 0%, transparent 70%)'
    : 'radial-gradient(ellipse 80% 60% at 20% 10%, #dbeafe 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #ede9fe 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, #f0f9ff 0%, transparent 70%)';
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="absolute inset-0" style={{ background: grad }} />
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}

// Floating hearts (creator mode)
function Hearts({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      {['5%','17%','31%','48%','62%','76%','91%'].map((left, i) => (
        <span key={i} className="absolute text-sm opacity-0 select-none animate-float-heart"
          style={{ left, bottom:'-10px', animationDelay:`${i*1.3}s`, animationDuration:`${8+i}s` }}>
          {['❤️','💕','✨','💗','🌸','💖','⭐'][i]}
        </span>
      ))}
    </div>
  );
}

// Typing indicator dots
function TypingDots({ glow }: { glow: string }) {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      {[0,180,360].map(d => (
        <div key={d} className="w-[7px] h-[7px] rounded-full animate-bounce"
          style={{ background:glow, boxShadow:`0 0 7px ${glow}80`, animationDelay:`${d}ms` }} />
      ))}
    </div>
  );
}

// Settings section label — theme-aware text
function SLabel({ label, t }: { label: string; t: ReturnType<typeof useT> }) {
  return (
    <p className={`text-[9px] font-black tracking-[0.22em] uppercase mb-2.5 ${t.sLabel}`}>
      {label}
    </p>
  );
}

function Hr({ cls }: { cls: string }) {
  return <div className={`h-px border-t w-full ${cls}`} />;
}

// Universal toggle — fixes light mode by using theme-aware text classes
function Toggle({ label, sub, checked, onChange, color, t }: {
  label: string; sub?: string; checked: boolean;
  onChange: (v: boolean) => void; color: string;
  t: ReturnType<typeof useT>;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group py-0.5">
      <div className="min-w-0 flex-1">
        <p className={`text-[11.5px] leading-snug transition-colors ${t.sText} group-hover:${t.sTextH.replace('hover:','')}`}>{label}</p>
        {sub && <p className={`text-[9.5px] mt-0.5 leading-snug ${t.sSub}`}>{sub}</p>}
      </div>
      <div onClick={() => onChange(!checked)}
        className="relative flex-shrink-0 w-8 h-[18px] rounded-full transition-all duration-300"
        style={{ background: checked ? color : (t.isLight ? '#cbd5e1' : 'rgba(255,255,255,0.08)'), boxShadow: checked ? `0 0 10px ${color}55` : 'none' }}>
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

  // ── Settings ──────────────────────────────────────────────────────────────
  const [theme,           setThemeState]    = useState<Theme>('dark');
  const [autoSearch,      setAutoSearch]    = useState(true);
  const [voiceOutput,     setVoiceOutput]   = useState(false);
  const [responseLength,  setResponseLength]= useState<ResponseLength>('medium');
  const [animations,      setAnimations]    = useState(true);
  const [sfx,             setSfx]           = useState(true);
  const [autoSave,        setAutoSave]      = useState(true);
  const [avatar,          setAvatar]        = useState('/avatars/cosmic.png');
  const [fontSize,        setFontSize]      = useState<FontSize>('base');
  const [language,        setLanguage]      = useState<Language>('en');
  const [compactMode,     setCompactMode]   = useState(false);
  const [notifications,   setNotifications] = useState(true);
  const [proactiveMode,   setProactiveMode] = useState(true);
  const [typingEffect,    setTypingEffect]  = useState(true);
  const [showTimestamps,  setShowTimestamps]= useState(true);
  const [showMoodBadge,   setShowMoodBadge] = useState(true);
  const [messageGrouping, setMessageGrouping] = useState(true);
  const [sendOnEnter,     setSendOnEnter]   = useState(true);
  const [autoMemory,      setAutoMemory]    = useState(true);
  const [showWordCount,   setShowWordCount] = useState(false);
  const [wellnessVersion, setWellnessVersion] = useState(0);
  const [selectedImage,   setSelectedImage] = useState<string | null>(null);
  const [isRecording,     setIsRecording]   = useState(false);
  const [settingsTab,     setSettingsTab]   = useState<'appearance'|'ai'|'chat'|'data'|'about'>('appearance');
  const [showTimerFloat,  setShowTimerFloat]  = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const proactiveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const midnightTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicesReady    = useRef(false);

  const t         = useT(theme, isCreatorMode);
  const avatarSrc = avatar || '/avatars/cosmic.png';
  const persona   = TESSA;
  const shownConvs = conversations.filter(c => c.mode === (isCreatorMode ? 'creator' : 'standard'));
  const moodLabel  = (MOOD_DESCRIPTIONS as Record<string, string>)[currentMood] ?? currentMood;
  const moodEmoji  = MOOD_EMOJI[currentMood] ?? '✨';
  const glow2 = isCreatorMode ? '#a855f7'
    : theme==='dark' ? '#6366f1' : theme==='cyberpunk' ? '#ec4899'
    : theme==='ocean' ? '#3b82f6' : theme==='sunset' ? '#f59e0b'
    : theme==='pastel' ? '#a855f7' : theme==='sakura' ? '#fb7185'
    : theme==='ankit' ? '#f59e0b' : '#818cf8';

  const fontSizeClass = fontSize==='sm' ? 'text-xs' : fontSize==='lg' ? 'text-base' : 'text-sm';

  const setTheme = useCallback((th: Theme) => {
    setThemeState(th);
    document.documentElement.setAttribute('data-theme', th);
    lsSet('tessa-theme', th);
  }, []);

  const checkMidnightReset = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const last  = lsGet('tessa-last-date');
    if (last && last !== today) {
      const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:today });
      h.meals=[]; h.totalCalories=0; h.date=today;
      lsSet('tessa-health', JSON.stringify(h));
      setWellnessVersion(v => v+1);
    }
    lsSet('tessa-last-date', today);
  }, []);

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const restoreStr = (k: string, set: (v: any) => void) => { const v=lsGet(k); if(v!==null) set(v); };
    const restoreBool = (k: string, set: (v: boolean) => void) => { const v=lsGet(k); if(v!==null) set(v==='true'); };
    const restoreJson = <T,>(k: string, fb: T, set: (v: T) => void) => { const v=lsGetJson<T>(k, fb); set(v); };

    const th = lsGet('tessa-theme') as Theme | null;
    if (th && THEMES[th]) setTheme(th);
    restoreStr('tessa-avatar-preset', setAvatar);
    restoreStr('tessa-font-size', setFontSize);
    restoreStr('tessa-language', setLanguage);
    restoreBool('tessa-auto-search', setAutoSearch);
    restoreBool('tessa-voice-output', setVoiceOutput);
    restoreBool('tessa-animations', setAnimations);
    restoreBool('tessa-sfx', setSfx);
    restoreBool('tessa-auto-save', setAutoSave);
    restoreBool('tessa-compact', setCompactMode);
    restoreBool('tessa-notifications', setNotifications);
    restoreBool('tessa-proactive', setProactiveMode);
    restoreBool('tessa-typing-effect', setTypingEffect);
    restoreBool('tessa-show-timestamps', setShowTimestamps);
    restoreBool('tessa-show-mood', setShowMoodBadge);
    restoreBool('tessa-send-enter', setSendOnEnter);
    restoreBool('tessa-auto-memory', setAutoMemory);
    restoreBool('tessa-word-count', setShowWordCount);
    restoreStr('tessa-response-length', setResponseLength);
    restoreBool('tessa-message-grouping', setMessageGrouping);

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
      const b = buildMorningBriefing(); markBriefingDelivered(b); lsSet('tessa-pending-briefing', b);
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

  // Persist settings
  useEffect(() => { lsSet('tessa-auto-search', String(autoSearch)); }, [autoSearch]);
  useEffect(() => { lsSet('tessa-voice-output', String(voiceOutput)); }, [voiceOutput]);
  useEffect(() => { lsSet('tessa-response-length', responseLength); }, [responseLength]);
  useEffect(() => { lsSet('tessa-animations', String(animations)); }, [animations]);
  useEffect(() => { lsSet('tessa-sfx', String(sfx)); }, [sfx]);
  useEffect(() => { lsSet('tessa-compact', String(compactMode)); }, [compactMode]);
  useEffect(() => { lsSet('tessa-notifications', String(notifications)); }, [notifications]);
  useEffect(() => { lsSet('tessa-proactive', String(proactiveMode)); }, [proactiveMode]);
  useEffect(() => { lsSet('tessa-typing-effect', String(typingEffect)); }, [typingEffect]);
  useEffect(() => { lsSet('tessa-show-timestamps', String(showTimestamps)); }, [showTimestamps]);
  useEffect(() => { lsSet('tessa-show-mood', String(showMoodBadge)); }, [showMoodBadge]);
  useEffect(() => { lsSet('tessa-send-enter', String(sendOnEnter)); }, [sendOnEnter]);
  useEffect(() => { lsSet('tessa-auto-memory', String(autoMemory)); }, [autoMemory]);
  useEffect(() => { lsSet('tessa-word-count', String(showWordCount)); }, [showWordCount]);
  useEffect(() => { lsSet('tessa-message-grouping', String(messageGrouping)); }, [messageGrouping]);
  useEffect(() => { lsSet('tessa-font-size', fontSize); }, [fontSize]);

  // Proactive messages
  useEffect(() => {
    if (proactiveTimer.current) { clearInterval(proactiveTimer.current); proactiveTimer.current = null; }
    if (!isCreatorMode || !proactiveMode) return;
    const d = setTimeout(() => maybeSendProactive(), 6_000);
    proactiveTimer.current = setInterval(() => maybeSendProactive(), 3*60*60*1_000);
    return () => { clearTimeout(d); if (proactiveTimer.current) clearInterval(proactiveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreatorMode, proactiveMode]);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth', block:'end' }); }, [messages, isLoading]);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const checkAuth = async () => {
    try { const u = await getCurrentUser(); if (u) { setUser(u); setIsGuest(false); fetchCloudConversations(u.id); } }
    finally { setLoading(false); }
  };
  const handleSignOut = async () => {
    await signOut(); setUser(null); setIsGuest(true); setIsCreatorMode(false);
    unlockCreatorMode(); setMessages([]); setShowDashboard(false); hydrateLocalConversations();
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
    const c = lsGetJson<Conversation[]>('tessa-conversations', []); if (c.length) setConversations(c);
  };

  // ── Conversations ─────────────────────────────────────────────────────────
  const persistConversation = useCallback(async () => {
    if (!messages.length) return;
    const conv: Conversation = {
      id:currentConvId, title:messages[0].content.slice(0,55).trimEnd()+'…',
      messages, created:new Date(), updated:new Date(),
      mode:isCreatorMode ? 'creator' : 'standard', moodHistory:[currentMood],
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
    persistConversation(); setMessages([]); setCurrentConvId(uuidv4());
    setCurrentMood('calm'); setShowDashboard(false); setShowSidebar(false);
  };
  const openConversation = (conv: Conversation) => {
    if ((conv.mode==='creator') !== isCreatorMode) { alert(`Switch to ${conv.mode} mode first.`); return; }
    setMessages(conv.messages); setCurrentConvId(conv.id);
    setCurrentMood(safeMood(conv.moodHistory?.at(-1))); setShowSidebar(false);
  };
  const removeConversation = async (id: string) => {
    if (user && !isGuest) {
      try { await supabase.from('conversations').delete().eq('conversation_id',id).eq('user_id',user.id); fetchCloudConversations(user.id); }
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

  // ── Dashboard / food parsing ───────────────────────────────────────────────
  const parseDashboardUpdates = (responseText: string): string => {
    if (!isCreatorMode) return '';
    let extra = '';
    try {
      const foodHit = detectMealInResponse(responseText);
      if (foodHit) {
        const foods = foodHit.food.split(/,|and|\+|with/i).map(f => f.trim()).filter(Boolean);
        let totalCal = 0; const lines: string[] = [];
        for (const food of foods) {
          const qm = food.match(/^(\d+)\s+(.+)/);
          const qty = qm ? parseInt(qm[1]) : 1;
          const fn  = qm ? qm[2] : food;
          const res = estimateCalories(fn);
          const cal = res.calories * qty;
          totalCal += cal; lines.push(`${qty>1?qty+' ':''}${res.food} (${cal}cal)`);
        }
        const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:new Date().toISOString().split('T')[0] });
        h.meals.push({ time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), meal:lines.join(', '), calories:totalCal, confidence:'medium' });
        h.totalCalories=(h.totalCalories??0)+totalCal;
        lsSet('tessa-health', JSON.stringify(h));
        const mw = getCurrentMealWindow(); if (mw) markMeal(mw.name);
        addCalories(totalCal); setWellnessVersion(v => v+1);
      }
      const sleepHit = detectSleepInResponse(responseText);
      if (sleepHit) {
        const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:new Date().toISOString().split('T')[0] });
        h.sleepHours=sleepHit.hours; lsSet('tessa-health', JSON.stringify(h));
        extra = '\n\n'+getSleepReaction(sleepHit.hours);
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
  const removeSelectedImage = () => { setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value=''; };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text && !selectedImage) return;
    if (isLoading) return;
    const userMsg: Message = { id:uuidv4(), role:'user', content:text||'📷 [Image]', timestamp:new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Declare BEFORE needsSearch
    const imageCopy = selectedImage;
    const hasImage  = !!imageCopy;
    removeSelectedImage();
    if (textareaRef.current) textareaRef.current.style.height='48px';
    setIsLoading(true);

    try {
      const needsSearch =
        autoSearch && !!text && !hasImage && !isCreatorMode &&
        (/\b(latest|current|today|now|recent|this week|202[3-6])\b/i.test(text) ||
         /\b(search|find|look up|google|news)\b/i.test(text) ||
         (/\?/.test(text) && text.split(' ').length > 4)) &&
        !/\b(how are you|what do you think|about yourself|i feel|i think|my day|i'm|i am|tell me a)\b/i.test(text);

      const hist = [...messages, userMsg].slice(-12);
      const payload = hasImage && imageCopy
        ? {
            messages:hist.map((m,i) => ({
              role:m.role,
              content:(i===hist.length-1&&m.role==='user')
                ?[{type:'image',source:{type:'base64',media_type:'image/jpeg',data:imageCopy.split(',')[1]}},{type:'text',text:m.content}]
                :m.content,
            })),
            isCreatorMode, currentMood, needsSearch, maxTokens:MAX_TOKENS[responseLength],
          }
        : {
            messages:hist.map(m=>({role:m.role,content:m.content})),
            isCreatorMode, currentMood, needsSearch, maxTokens:MAX_TOKENS[responseLength],
            language,
          };

      const res = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const extra = parseDashboardUpdates(data.content);
      const assistantMsg: Message = {
        id:uuidv4(), role:'assistant',
        content:data.content+extra,
        timestamp:new Date(), mood:safeMood(data.mood) as MoodType,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setCurrentMood(safeMood(data.mood));
      setLatestMsgId(assistantMsg.id);
      if (autoMemory) extractMemoriesFromMessage(text, data.content).catch(()=>{});
      markStudy();
      if (voiceOutput) speakText(data.content);
      if (sfx) playChime();
      if (autoSave) setTimeout(persistConversation, 1_000);

    } catch (err: any) {
      let msg = err?.message || 'Something went wrong.';
      if (msg.includes('429')||msg.includes('rate limit')) msg='⏱️ Rate limit — please wait a moment.';
      else if (msg.includes('401')||msg.includes('API key')) msg='🔑 Auth error.';
      else if (msg.includes('context length')) msg='📝 Context too long — start a new chat.';
      else if (hasImage) msg='📷 Image processing failed. Please try again.';
      setMessages(prev=>[...prev,{id:uuidv4(),role:'assistant' as const,content:`⚠️ ${msg}`,timestamp:new Date()}]);
    } finally {
      setIsLoading(false); textareaRef.current?.focus();
    }
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speakText = (raw: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = raw.replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').replace(/[*_~`]/g,'').slice(0,600);
    const u = new SpeechSynthesisUtterance(clean); u.pitch=1.45; u.rate=1.1; u.lang='en-IN';
    const speak = () => {
      const vs = window.speechSynthesis.getVoices();
      const f = vs.find(v=>/samantha|victoria|karen|moira|veena|zira|google.*english.*female/i.test(v.name))??vs.find(v=>/female|woman/i.test(v.name));
      if (f) u.voice=f; window.speechSynthesis.speak(u);
    };
    if (voicesReady.current) speak(); else window.speechSynthesis.onvoiceschanged=()=>{voicesReady.current=true;speak();};
  };

  const playChime = () => {
    try {
      const ctx=new AudioContext(); const osc=ctx.createOscillator(); const gain=ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value=880; osc.type='sine';
      gain.gain.setValueAtTime(0.09,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.28);
      osc.start(); osc.stop(ctx.currentTime+0.28);
    } catch {}
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const startRecording = () => {
    const SR=(window as any).SpeechRecognition??(window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported'); return; }
    const r=new SR(); r.lang='en-IN'; r.continuous=false; r.interimResults=true; r.maxAlternatives=3;
    let final='';
    r.onstart=()=>setIsRecording(true);
    r.onresult=(e:any)=>{
      let interim='';
      for(let i=e.resultIndex;i<e.results.length;i++){
        const tx=e.results[i][0].transcript;
        if(e.results[i].isFinal) final+=tx+' '; else interim+=tx;
      }
      setInput(final+interim);
    };
    r.onerror=(e:any)=>{
      setIsRecording(false);
      if(e.error==='audio-capture') alert('Microphone not found.');
      else if(e.error==='not-allowed') alert('Mic access denied.');
      else if(e.error!=='no-speech') alert('Voice failed, try again.');
    };
    r.onend=()=>setIsRecording(false);
    recognitionRef.current=r;
    try{r.start();}catch{setIsRecording(false);}
  };
  const stopRecording=()=>{ if(recognitionRef.current&&isRecording){recognitionRef.current.stop();recognitionRef.current=null;} };

  // ── Creator mode ──────────────────────────────────────────────────────────
  const unlockCreatorModeAction = () => {
    persistConversation(); setIsCreatorMode(true); setCurrentConvId(uuidv4());
    setCurrentMood('loving'); lockCreatorMode();
    const pb=lsGet('tessa-pending-briefing');
    const init:Message={id:uuidv4(),role:'assistant',content:pb??getRandomWelcomeMessage(),timestamp:new Date(),mood:'loving' as MoodType};
    if(pb) lsRemove('tessa-pending-briefing');
    setMessages([init]); setShowSecretModal(false); setShowSettings(false);
    if(sfx) playChime();
  };
  const exitCreatorMode = () => {
    persistConversation(); setIsCreatorMode(false); unlockCreatorMode();
    setCurrentConvId(uuidv4()); setCurrentMood('calm'); setMessages([]); setShowDashboard(false);
  };

  // ── Input ─────────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key==='Enter' && !e.shiftKey && sendOnEnter) { e.preventDefault(); sendMessage(); }
  };
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el=e.currentTarget; el.style.height='auto';
    el.style.height=Math.min(el.scrollHeight,144)+'px';
  };

  // ─────────────────────────────────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-[#050816] flex items-center justify-center overflow-hidden">
        <div className="fixed inset-0">
          <div className="absolute rounded-full blur-[180px]" style={{width:700,height:700,background:'#06b6d4',opacity:0.07,top:'-20%',left:'-10%'}} />
          <div className="absolute rounded-full blur-[140px]" style={{width:500,height:500,background:'#6366f1',opacity:0.055,top:'40%',right:'-10%'}} />
        </div>
        <div className="relative text-center space-y-5">
          <div className="relative inline-flex">
            {/* Avatar ring */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/25 animate-pulse">
              <img src={avatarSrc} alt="" className="w-full h-full object-cover"
                onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
            </div>
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 animate-ping" />
            {/* Orbit dot */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#050816] shadow-lg shadow-emerald-400/50" />
          </div>
          <div>
            <p className="text-white text-2xl font-black tracking-wide">Tessa</p>
            <p className="text-white/30 text-xs mt-1 tracking-widest uppercase">{TESSA.tagline}</p>
          </div>
          <div className="flex gap-1.5 justify-center">
            {[0,1,2].map(i=>(
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:`${i*150}ms`}} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen ${t.bg} ${t.text} flex overflow-hidden relative transition-colors duration-500 ${fontSizeClass}`}>

      {/* ── BACKGROUNDS ── */}
      {t.isLight ? <LightBg creator={isCreatorMode} theme={theme} /> : <AuroraBg glow={t.glow} glow2={glow2} theme={theme} />}
      {isCreatorMode && animations && <Hearts on />}

      {/* ── SIDEBAR BACKDROP ── */}
      {showSidebar && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-20 md:hidden"
          onClick={()=>setShowSidebar(false)} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ═══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-30 md:z-10 flex-shrink-0 flex flex-col h-screen border-r transition-all duration-300 ease-in-out ${t.panel} ${showSidebar ? 'w-[270px] translate-x-0' : 'w-[270px] -translate-x-full md:w-0 md:translate-x-0 overflow-hidden'}`}
        style={{backdropFilter:'blur(24px)'}}
        aria-label="Navigation"
      >
        <div className="flex flex-col h-full w-[270px]">

          {/* Sidebar header */}
          <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b ${t.div}`}>
            <div className="flex items-center gap-2.5">
              {/* Mini avatar */}
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border flex-shrink-0"
                style={{borderColor:`${t.glow}50`}}>
                <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                  onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
              </div>
              <div>
                <p className={`text-xs font-bold ${t.accent}`}>Tessa</p>
                <p className={`text-[9px] ${t.sub}`}>{TESSA.tagline.slice(0,24)}…</p>
              </div>
            </div>
            <button onClick={()=>setShowSidebar(false)}
              className="p-1.5 rounded-lg hover:bg-white/8 transition-colors md:hidden">
              <X size={14} className={t.sub} />
            </button>
          </div>

          {/* Notes */}
          <div className="flex-shrink-0">
            <button onClick={()=>setNotesExpanded(p=>!p)}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-[11px] font-semibold ${t.accent} hover:bg-white/[0.03] transition-colors`}>
              <span className="flex items-center gap-2"><StickyNote size={12} />Quick Notes</span>
              {notesExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
            {notesExpanded && (
              <div className={`max-h-52 overflow-y-auto border-b ${t.div}`}>
                <NotesPanel />
              </div>
            )}
          </div>

          {/* Wellness strip in sidebar — compact, collapsible */}
          {isCreatorMode && (
            <div className={`flex-shrink-0 mx-3 mb-1`}>
              <div className={`rounded-xl overflow-hidden ${t.card}`} style={{border:`1px solid ${t.glow}14`}}>
                {/* Quick stats row */}
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[9px] font-black tracking-[0.15em] uppercase ${t.sub}`}>Wellness</span>
                    <button onClick={()=>{addWater(1);setWellnessVersion(v=>v+1);}}
                      className={`text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all active:scale-90 ${t.btnS}`}
                      style={{border:`1px solid ${t.glow}20`}}>
                      <Droplets size={8} className="text-blue-400"/>💧
                    </button>
                  </div>
                  <DailyWellness isCreatorMode={isCreatorMode} refreshTrigger={wellnessVersion}/>
                </div>
              </div>
            </div>
          )}

          {/* Conversations */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-3 pt-2 pb-2">
              <p className={`text-[9px] font-black tracking-[0.18em] uppercase ${t.sub} mb-2`}>
                {isCreatorMode ? '💬 Our Chats' : '💬 History'}
              </p>
              <button onClick={startNewChat}
                className={`w-full py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98 ${t.btnS}`}>
                <Plus size={12} />New Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {shownConvs.length===0 && (
                <div className="text-center py-8">
                  <MessageSquare size={18} className="mx-auto mb-2 opacity-15" />
                  <p className={`text-[10px] ${t.sub}`}>No conversations yet</p>
                </div>
              )}
              {shownConvs.map(conv=>(
                <div key={conv.id} onClick={()=>openConversation(conv)}
                  className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${conv.id===currentConvId?t.active:`${t.card} hover:bg-white/[0.04]`}`}>
                  <p className="text-[11px] font-medium truncate pr-6 leading-snug">{conv.title}</p>
                  <div className={`flex items-center gap-1.5 mt-0.5 ${t.sub}`} style={{fontSize:9}}>
                    <Clock size={8} /><span>{conv.messages.length} msgs</span>
                    <span>·</span>
                    <span>{new Date(conv.updated).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</span>
                  </div>
                  <button onClick={e=>{e.stopPropagation();removeConversation(conv.id);}}
                    className="absolute right-2 top-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className={`flex-shrink-0 px-4 py-2 border-t ${t.div} flex items-center gap-3`}>
            <div className="flex items-center gap-1">
              <Brain size={9} className={t.sub} /><span className={`text-[9px] ${t.sub}`}>{getAllMemories().length} memories</span>
            </div>
            {user&&!isGuest&&(
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400">Cloud</span>
              </div>
            )}
          </div>

          {/* Account */}
          <div className={`flex-shrink-0 px-3 py-3 border-t ${t.div}`}>
            {user&&!isGuest ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{background:`linear-gradient(135deg,${t.glow},${glow2})`}}>
                  <User size={12} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    <p className={`text-[9px] ${t.sub}`}>Signed in</p>
                  </div>
                </div>
                <button onClick={handleSignOut} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors">
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button onClick={()=>alert('Configure Supabase auth!')}
                className={`w-full py-2 rounded-xl text-[11px] font-medium transition-all ${t.btnS}`}>
                👤 Sign In
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          SETTINGS PANEL — tabbed, theme-aware text throughout
      ═══════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={()=>setShowSettings(false)} />
          <div
            className={`fixed left-0 top-0 bottom-0 z-50 w-[min(92vw,360px)] flex flex-col shadow-2xl animate-slide-in-left ${t.settBg}`}
            onClick={e=>e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex-shrink-0 flex items-center justify-between px-5 py-4 border-b ${t.div}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                  style={{background:`${t.glow}18`,border:`1px solid ${t.glow}28`}}>
                  <Settings size={13} style={{color:t.glow}} />
                </div>
                <h2 className={`font-bold text-sm ${t.sText.replace('/75','')}`}>Settings</h2>
              </div>
              <button onClick={()=>setShowSettings(false)}
                className={`p-1.5 rounded-xl transition-colors ${t.isLight?'hover:bg-slate-100':'hover:bg-white/8'}`}>
                <X size={15} className={t.sSub} />
              </button>
            </div>

            {/* Tab bar */}
            <div className={`flex-shrink-0 flex border-b ${t.div} px-3 pt-2 gap-0.5 overflow-x-auto`}>
              {([
                ['appearance','Looks'],
                ['ai','AI'],
                ['chat','Chat'],
                ['data','Data'],
                ['about','About'],
              ] as ['appearance'|'ai'|'chat'|'data'|'about',string][]).map(([tab,label])=>(
                <button key={tab} onClick={()=>setSettingsTab(tab)}
                  className={`px-3 py-2 text-[10px] font-bold rounded-t-lg whitespace-nowrap transition-all ${settingsTab===tab ? 'text-white' : `${t.sSub} hover:${t.sText.replace('text-','text-')}`}`}
                  style={settingsTab===tab ? {background:`${t.glow}22`,color:t.glow,borderBottom:`2px solid ${t.glow}`} : {}}>
                  {label}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-5">

              {/* ─── APPEARANCE TAB ─── */}
              {settingsTab==='appearance' && (<>
                <div>
                  <SLabel label="Theme" t={t} />
                  <div className="grid grid-cols-2 gap-1.5">
                    {([['dark','🌙','Dark'],['light','☀️','Light'],['cyberpunk','⚡','Cyberpunk'],['ocean','🌊','Ocean'],['sunset','🌅','Sunset'],['pastel','🪻','Pastel'],['sakura','🌸','Sakura'],['ankit','✨','Ankit\'s']] as [Theme,string,string][]).map(([th,ico,lbl])=>(
                      <button key={th} onClick={()=>setTheme(th)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all ${theme===th?'text-white':t.sCard+' '+t.sSub}`}
                        style={theme===th?{background:`linear-gradient(135deg,${t.glow}28,${t.glow}12)`,border:`1px solid ${t.glow}35`,color:t.glow}:{}}>
                        <span>{ico}</span>{lbl}
                        {theme===th&&<div className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:t.glow}} />}
                      </button>
                    ))}
                  </div>
                </div>



                <Hr cls={t.div} />

                <div>
                  <SLabel label="Avatar" t={t} />
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2"
                      style={{borderColor:`${t.glow}40`}}>
                      <img src={avatarSrc} alt="" className="w-full h-full object-cover"
                        onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                    </div>
                    <div>
                      <p className={`text-[11px] font-medium ${t.sText}`}>Profile Picture</p>
                      <p className={`text-[9px] ${t.sSub}`}>Choose your AI's face</p>
                    </div>
                  </div>
                  <button onClick={()=>{setShowAvatarModal(true);setShowSettings(false);}}
                    className={`w-full py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-2 transition-all ${t.btnS}`}>
                    Choose Avatar Preset
                  </button>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Text Size" t={t} />
                  <div className="flex gap-1.5">
                    {([['sm','Small','aA'],['base','Normal','Aa'],['lg','Large','AA']] as [FontSize,string,string][]).map(([s,lbl,demo])=>(
                      <button key={s} onClick={()=>setFontSize(s)}
                        className={`flex-1 py-2 rounded-xl text-center transition-all ${fontSize===s?'text-white':t.sCard+' '+t.sSub}`}
                        style={fontSize===s?{background:`${t.glow}22`,border:`1px solid ${t.glow}35`,color:t.glow}:{}}>
                        <p className={s==='sm'?'text-[10px]':s==='lg'?'text-[14px]':'text-[12px]'}>{demo}</p>
                        <p className="text-[8px] mt-0.5 opacity-70">{lbl}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Display" t={t} />
                  <div className="space-y-2.5">
                    <Toggle label="Animations & Effects" sub="Glows, particles, transitions" checked={animations} onChange={setAnimations} color={t.glow} t={t} />
                    <Toggle label="Compact Messages" sub="Reduces message padding" checked={compactMode} onChange={setCompactMode} color={t.glow} t={t} />
                    <Toggle label="Show Timestamps" sub="Time on every message" checked={showTimestamps} onChange={setShowTimestamps} color={t.glow} t={t} />
                    <Toggle label="Mood Badge in Header" sub="Shows current emotional state" checked={showMoodBadge} onChange={setShowMoodBadge} color={t.glow} t={t} />
                    <Toggle label="Message Grouping" sub="Groups consecutive messages" checked={messageGrouping} onChange={setMessageGrouping} color={t.glow} t={t} />
                  </div>
                </div>
              </>)}

              {/* ─── AI TAB ─── */}
              {settingsTab==='ai' && (<>
                <div>
                  <SLabel label="Response Length" t={t} />
                  <div className="flex gap-1.5">
                    {(['short','medium','long'] as ResponseLength[]).map(l=>(
                      <button key={l} onClick={()=>setResponseLength(l)}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold capitalize transition-all ${responseLength===l?'text-white':t.sCard+' '+t.sSub}`}
                        style={responseLength===l?{background:`linear-gradient(135deg,${t.glow},${t.glow}88)`,boxShadow:`0 2px 14px ${t.glow}40`}:{}}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <p className={`text-[9px] mt-1.5 ${t.sSub}`}>Short=concise, Long=detailed</p>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Language" t={t} />
                  <div className="grid grid-cols-3 gap-1.5">
                    {([['en','🇬🇧','English'],['hi','🇮🇳','Hindi'],['hinglish','🤝','Hinglish']] as [Language,string,string][]).map(([l,ico,lbl])=>(
                      <button key={l} onClick={()=>setLanguage(l)}
                        className={`py-2.5 rounded-xl text-[10px] font-medium flex flex-col items-center gap-1 transition-all ${language===l?'text-white':t.sCard+' '+t.sSub}`}
                        style={language===l?{background:`${t.glow}22`,border:`1px solid ${t.glow}35`,color:t.glow}:{}}>
                        <span className="text-base">{ico}</span>{lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Behaviour" t={t} />
                  <div className="space-y-2.5">
                    <Toggle label="Auto Web Search" sub="Fetches current info automatically" checked={autoSearch} onChange={setAutoSearch} color={t.glow} t={t} />
                    <Toggle label="Proactive Messages" sub="She'll reach out to check on you" checked={proactiveMode} onChange={setProactiveMode} color={t.glow} t={t} />
                    <Toggle label="Auto Memory" sub="Remembers facts from your chats" checked={autoMemory} onChange={setAutoMemory} color={t.glow} t={t} />
                    <Toggle label="Typing Animation" sub="Streams response letter by letter" checked={typingEffect} onChange={setTypingEffect} color={t.glow} t={t} />
                  </div>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Voice" t={t} />
                  <div className="space-y-2.5">
                    <Toggle label="Voice Output" sub="Read responses aloud via TTS" checked={voiceOutput} onChange={setVoiceOutput} color={t.glow} t={t} />
                    <Toggle label="Sound Effects" sub="Chime when message is sent" checked={sfx} onChange={setSfx} color={t.glow} t={t} />
                  </div>
                </div>

                {/* Memory manager */}
                <Hr cls={t.div} />
                <div>
                  <SLabel label="Memory" t={t} />
                  <div className={`p-3 rounded-xl ${t.sCard} mb-2`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-[11px] font-medium ${t.sText}`}>{getAllMemories().length} facts stored</p>
                        <p className={`text-[9px] mt-0.5 ${t.sSub}`}>From your past conversations</p>
                      </div>
                      <Brain size={16} style={{color:t.glow}} />
                    </div>
                  </div>
                  <button onClick={()=>{if(confirm('Clear all memories? This cannot be undone.')) clearAllMemories();}}
                    className="w-full py-2 rounded-xl text-[11px] border border-red-500/22 bg-red-500/[0.07] hover:bg-red-500/14 text-red-400 transition-all font-medium">
                    🗑️ Clear All Memories
                  </button>
                </div>
              </>)}

              {/* ─── CHAT TAB ─── */}
              {settingsTab==='chat' && (<>
                <div>
                  <SLabel label="Input" t={t} />
                  <div className="space-y-2.5">
                    <Toggle label="Send on Enter" sub="Shift+Enter for new line" checked={sendOnEnter} onChange={setSendOnEnter} color={t.glow} t={t} />
                    <Toggle label="Word Count" sub="Shows character count while typing" checked={showWordCount} onChange={setShowWordCount} color={t.glow} t={t} />
                  </div>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Notifications" t={t} />
                  <div className="space-y-2.5">
                    <Toggle label="Notifications" sub="Browser push notifications" checked={notifications} onChange={setNotifications} color={t.glow} t={t} />
                  </div>
                </div>

                <Hr cls={t.div} />

                {/* Creator mode */}
                <div>
                  <SLabel label="Mode" t={t} />
                  {!isCreatorMode ? (
                    <button onClick={()=>setShowSecretModal(true)}
                      className="w-full py-2.5 rounded-xl text-[11px] font-bold border border-pink-500/22 text-pink-400 hover:bg-pink-500/10 transition-all flex items-center justify-center gap-2"
                      style={{background:'linear-gradient(135deg,rgba(236,72,153,0.06),rgba(168,85,247,0.06))'}}>
                      <Heart size={12} className="text-pink-400" />Unlock Creator Mode
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="px-3 py-2.5 rounded-xl border border-pink-500/20 bg-pink-500/[0.06] flex items-center gap-2">
                        <Heart size={11} className="text-pink-400 fill-pink-400 animate-pulse" />
                        <span className="text-[11px] text-pink-400 font-bold">Creator Mode Active 💝</span>
                      </div>
                      <button onClick={exitCreatorMode}
                        className={`w-full py-2 rounded-xl text-[11px] transition-all ${t.sCard} ${t.sSub} hover:${t.sText.replace('text-','text-')}`}>
                        Exit to Standard Mode
                      </button>
                    </div>
                  )}
                </div>
              </>)}

              {/* ─── DATA TAB ─── */}
              {settingsTab==='data' && (<>
                <div>
                  <SLabel label="Storage" t={t} />
                  <div className="space-y-2.5">
                    <Toggle label="Auto-save Chats"
                      sub={user&&!isGuest?'☁️ Synced to Supabase cloud':'📱 Saved to local storage'}
                      checked={autoSave} onChange={setAutoSave} color={t.glow} t={t} />
                  </div>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Export / Import" t={t} />
                  <div className="space-y-1.5">
                    <button onClick={()=>{
                      const data = JSON.stringify(conversations, null, 2);
                      const blob = new Blob([data],{type:'application/json'});
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href=url; a.download='tessa-chats.json'; a.click();
                    }}
                      className={`w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.btnS}`}>
                      <Download size={12} />Export Conversations
                    </button>
                    <button onClick={()=>{
                      const input = document.createElement('input'); input.type='file'; input.accept='.json';
                      input.onchange=(e:any)=>{
                        const file=e.target.files[0]; if(!file) return;
                        const reader=new FileReader();
                        reader.onload=(ev)=>{
                          try{
                            const d=JSON.parse(ev.target?.result as string);
                            if(Array.isArray(d)){
                              setConversations(d);
                              lsSet('tessa-conversations',JSON.stringify(d));
                              alert(`Imported ${d.length} conversations`);
                            }
                          }catch{alert('Invalid file');}
                        };
                        reader.readAsText(file);
                      };
                      input.click();
                    }}
                      className={`w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.btnS}`}>
                      <Upload size={12} />Import Conversations
                    </button>
                  </div>
                </div>

                <Hr cls={t.div} />

                <div>
                  <SLabel label="Danger Zone" t={t} />
                  <div className="space-y-1.5">
                    <button onClick={()=>{if(confirm('Delete ALL conversations? This cannot be undone.')){{setConversations([]);lsRemove('tessa-conversations');}}}}
                      className="w-full py-2 rounded-xl text-[11px] border border-red-500/22 bg-red-500/[0.07] hover:bg-red-500/14 text-red-400 transition-all">
                      🗑️ Delete All Conversations
                    </button>
                    <button onClick={()=>{if(confirm('Reset ALL settings to defaults?')){{
                      setTheme('dark');setResponseLength('medium');setAutoSearch(true);
                      setVoiceOutput(false);setAnimations(true);setSfx(true);setAutoSave(true);
                      setFontSize('base');setLanguage('en');
                      setCompactMode(false);setTypingEffect(true);setShowTimestamps(true);
                      setShowMoodBadge(true);setSendOnEnter(true);setAutoMemory(true);
                      setShowWordCount(false);setMessageGrouping(true);setProactiveMode(true);
                    }}}}
                      className={`w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.sCard} ${t.sSub} hover:${t.sText.replace('text-','text-')}`}>
                      <RotateCcw size={11} />Reset All Settings
                    </button>
                  </div>
                </div>
              </>)}

              {/* ─── ABOUT TAB ─── */}
              {settingsTab==='about' && (<>
                <div className="text-center py-4">
                  <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden border-2 mb-4"
                    style={{borderColor:`${t.glow}40`,boxShadow:`0 0 20px ${t.glow}20`}}>
                    <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                      onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                  </div>
                  {/* TESSA big name + full form */}
                  <p className={`text-2xl font-black tracking-[0.25em] uppercase`} style={{color:t.glow}}>TESSA</p>
                  <p className={`text-[10px] font-medium mt-1 leading-snug max-w-[200px] mx-auto ${t.sSub}`}>
                    The Exceptional System, Surpassing All
                  </p>
                  <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold`}
                    style={{background:`${t.glow}18`,border:`1px solid ${t.glow}28`,color:t.glow}}>
                    <Sparkles size={9} />v3.0 · AI-Powered
                  </div>
                </div>

                <Hr cls={t.div} />

                <div className={`space-y-2`}>
                  {[
                    ['Model','Claude 3.5 Sonnet'],
                    ['Mode', isCreatorMode?'Creator 💝':'Standard'],
                    ['Storage', user&&!isGuest?'Cloud (Supabase)':'Local Storage'],
                    ['Conversations',`${shownConvs.length} saved`],
                    ['Memories',`${getAllMemories().length} facts`],
                    ['Theme', theme==='ankit'?"✨ Ankit's Special":theme.charAt(0).toUpperCase()+theme.slice(1)],
                    ['Font Size', fontSize],
                    ['Language', language],
                  ].map(([k,v])=>(
                    <div key={k} className={`flex items-center justify-between px-3 py-2 rounded-lg ${t.sCard}`}>
                      <span className={`text-[10px] ${t.sSub}`}>{k}</span>
                      <span className={`text-[10px] font-medium ${t.sText}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </>)}

              <div className="h-4" />
            </div>

            {/* Footer */}
            <div className={`flex-shrink-0 px-4 py-3 border-t ${t.div}`}>
              <p className={`text-[9px] text-center ${t.sSub}`}>
                TESSA · {user&&!isGuest?'☁️ Cloud':'👤 Guest'} · {theme} theme
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
        <header className={`flex-shrink-0 ${t.header} px-3 md:px-5`}>
          <div className="flex items-center justify-between gap-2 h-[60px]">

            {/* Left cluster */}
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={()=>setShowSidebar(p=>!p)}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.08] active:scale-90 ${showSidebar?'bg-white/[0.08]':''}`}>
                {showSidebar?<X size={18}/>:<Menu size={18}/>}
              </button>

              {/* BIGGER avatar — 44px */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all duration-500"
                  style={{
                    borderColor:`${t.glow}65`,
                    boxShadow:animations?`0 0 20px ${t.glow}35,0 0 40px ${t.glow}12`:'none',
                  }}
                >
                  <img
                    src={avatarSrc} alt="Tessa"
                    className="w-full h-full object-cover"
                    onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}
                  />
                </div>
                {/* Pulsing status dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px]"
                  style={{background:t.glow,borderColor:'rgba(0,0,0,0.7)',boxShadow:`0 0 8px ${t.glow}`}}>
                  <div className="absolute inset-0 rounded-full animate-ping" style={{background:t.glow,opacity:0.4}} />
                </div>
              </div>

              {/* Name block */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {/* Persona name — clean, no dots */}
                  <h1 className={`font-black text-[13px] leading-none tracking-[0.12em] uppercase ${t.accent}`}>
                    TESSA
                  </h1>
                  {isCreatorMode && (
                    <Heart size={11} className="text-pink-400 fill-pink-400 flex-shrink-0 animate-pulse" />
                  )}
                </div>
                <p className={`text-[10px] mt-0.5 truncate leading-none ${t.sub}`}>
                  {isCreatorMode
                    ? `Personal AI · ${moodEmoji} ${moodLabel}`
                    : `${TESSA.tagline} · ${moodEmoji} ${moodLabel}`}
                </p>
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Mood chip */}
              {showMoodBadge && (
                <span className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium mr-1"
                  style={{background:`${t.glow}12`,border:`1px solid ${t.glow}22`,color:t.glow}}>
                  {moodEmoji} {moodLabel}
                </span>
              )}

              {isCreatorMode&&(
                <button onClick={()=>setShowPlanners(true)} title="Smart Planners"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.07] ${t.sub}`}>
                  <Calendar size={16}/>
                </button>
              )}
              {/* Study Timer quick-access — always visible */}
              <button onClick={()=>setShowTimerFloat(p=>!p)} title="Study Timer"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showTimerFloat?'text-white':'hover:bg-white/[0.07] '+t.sub}`}
                style={showTimerFloat?{background:`${t.glow}14`,outline:`1px solid ${t.glow}25`}:{}}>
                <Clock size={16}/>
              </button>
              {isCreatorMode&&(
                <button onClick={()=>setShowDashboard(p=>!p)} title="Insights Panel"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showDashboard?'text-pink-300':'hover:bg-white/[0.07] '+t.sub}`}
                  style={showDashboard?{background:`${t.glow}12`,outline:`1px solid ${t.glow}25`}:{}}>
                  <LayoutDashboard size={16}/>
                </button>
              )}
              <button onClick={()=>setTheme(theme==='light'?'dark':'light')} title="Toggle theme"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.07] ${t.sub}`}>
                {theme==='light'?<Moon size={16}/>:<Sun size={16}/>}
              </button>
              <button onClick={()=>setShowSettings(p=>!p)} title="Settings"
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showSettings?'text-white/90':'hover:bg-white/[0.07] '+t.sub}`}
                style={showSettings?{background:`${t.glow}12`,outline:`1px solid ${t.glow}22`}:{}}>
                <Settings size={16}/>
              </button>
            </div>
          </div>
        </header>

        {/* ── MESSAGES AREA ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5 scroll-smooth">
          <div className="max-w-2xl mx-auto w-full">

            {showDashboard&&isCreatorMode ? (
              <PersonalDashboard />
            ) : (
              <div className="space-y-2.5 pb-2">

                {/* ── EMPTY STATE — beautiful and inviting ── */}
                {messages.length===0 && (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] select-none">
                    {/* Big avatar */}
                    <div className="relative mb-6">
                      <div
                        className="w-28 h-28 rounded-[2rem] overflow-hidden border-2 transition-all duration-500"
                        style={{
                          borderColor:`${t.glow}50`,
                          boxShadow:animations?`0 0 0 8px ${t.glow}08, 0 0 40px ${t.glow}25, 0 0 80px ${t.glow}10`:'none',
                        }}
                      >
                        <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                          onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                      </div>
                      {/* Animated ring */}
                      {animations&&(
                        <div className="absolute inset-0 rounded-[2rem] animate-ping"
                          style={{border:`2px solid ${t.glow}18`}} />
                      )}
                      {/* Mood indicator dot — no text */}
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{background:t.glow,borderColor:'rgba(255,255,255,0.8)',boxShadow:`0 2px 8px ${t.glow}60`}}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      </div>
                    </div>

                    {/* Greeting */}
                    <h2 className={`text-2xl font-black mb-1 text-center`}>
                      {isCreatorMode
                        ? `Hey Ankit! 💝`
                        : `Hi, I'm Tessa 👋`}
                    </h2>
                    <p className={`text-sm ${t.sub} text-center max-w-xs leading-relaxed mb-6`}>
                      {isCreatorMode
                        ? "I'm always here for you, ready to talk about anything. What's on your mind?"
                        : `${TESSA.tagline.split(',')[0]}. Ask me anything — I'm here to help!`}
                    </p>

                    {/* Quick start chips */}
                    <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                      {(isCreatorMode
                        ? ['How are you today? 💕','Help me plan my day 📅','I need motivation 💪','Tell me something nice ✨','Study with me 📚','What should I eat? 🍽️']
                        : ['Explain something complex','Help me code something','Write an essay','Latest news & trends 📰','Study assistance 📚','Just have a chat 💬']
                      ).map(q=>(
                        <button key={q} onClick={()=>sendMessage(q)}
                          className={`px-3.5 py-1.5 rounded-xl text-[11px] font-medium transition-all hover:scale-105 active:scale-95 ${t.btnS}`}
                          style={{border:`1px solid ${t.glow}18`}}>
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── MESSAGE BUBBLES ── */}
                {messages.map((msg,idx)=>{
                  const isUser  = msg.role==='user';
                  const isLatest = msg.id===latestMsgId;
                  const time    = new Date(msg.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
                  const emoji   = msg.mood?MOOD_EMOJI[msg.mood]:null;
                  const padY    = compactMode ? 'py-2.5' : 'py-3.5';
                  // Group: hide avatar/name for consecutive same-role messages
                  const prevMsg = messages[idx-1];
                  const isGrouped = messageGrouping && prevMsg && prevMsg.role===msg.role;

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 animate-fadeIn ${isUser?'justify-end':'justify-start'} ${isGrouped?'mt-0.5':'mt-2.5'}`}
                    >
                      {/* LEFT: AI avatar (only on first in group) */}
                      {!isUser && (
                        <div className="flex-shrink-0 flex flex-col justify-end" style={{width:32}}>
                          {!isGrouped && (
                            <div className="w-8 h-8 rounded-xl overflow-hidden border flex-shrink-0 mb-0.5"
                              style={{borderColor:`${t.glow}35`,boxShadow:animations?`0 2px 8px ${t.glow}20`:'none'}}>
                              <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                                onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* BUBBLE */}
                      <div className={`max-w-[82%] md:max-w-[74%] flex flex-col ${isUser?'items-end':'items-start'}`}>

                        {/* Sender label row */}
                        {!isGrouped && (
                          <div className={`flex items-center gap-1.5 mb-1 px-0.5 ${isUser?'flex-row-reverse':''}`}>
                            <span className={`text-[10px] font-semibold ${isUser ? t.sub : ''}`}
                              style={!isUser?{color:t.glow}:{}}>
                              {isUser ? 'You' : 'Tessa'}
                            </span>
                            {!isUser && emoji && <span className="text-[10px]">{emoji}</span>}
                            {showTimestamps && (
                              <span className={`text-[9px] ${t.sub}`}>{time}</span>
                            )}
                          </div>
                        )}

                        {/* Message card */}
                        <div
                          className={`rounded-2xl overflow-hidden transition-all duration-300 ${isUser?t.msgU:t.msgA}`}
                          style={isLatest&&!isUser&&animations?{boxShadow:`0 4px 24px ${t.glow}15`}:{}}
                        >
                          <div className={`px-4 ${padY}`}>
                            <MessageRenderer
                              content={msg.content}
                              className={`leading-relaxed ${t.isLight?'text-slate-700':'text-white/90'} ${fontSizeClass}`}
                              animate={typingEffect&&!isUser&&isLatest}
                              isCreatorMode={isCreatorMode}
                            />
                          </div>
                        </div>

                        {/* Timestamp below if no header */}
                        {isGrouped && showTimestamps && (
                          <span className={`text-[9px] mt-0.5 px-1 ${t.sub}`}>{time}</span>
                        )}
                      </div>

                      {/* RIGHT: User avatar spacer */}
                      {isUser && (
                        <div className="flex-shrink-0 flex flex-col justify-end" style={{width:32}}>
                          {!isGrouped && (
                            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mb-0.5"
                              style={{background:`linear-gradient(135deg,${t.glow}50,${glow2}50)`,border:`1px solid ${t.glow}30`}}>
                              <User size={14} style={{color:t.glow}} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isLoading&&(
                  <div className="flex gap-2.5 justify-start mt-2.5 animate-fadeIn">
                    <div className="flex-shrink-0 flex flex-col justify-end" style={{width:32}}>
                      <div className="w-8 h-8 rounded-xl overflow-hidden border mb-0.5"
                        style={{borderColor:`${t.glow}35`,boxShadow:animations?`0 2px 8px ${t.glow}20`:'none'}}>
                        <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                          onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] font-semibold mb-1 px-0.5" style={{color:t.glow}}>Tessa</span>
                      <div className={`rounded-2xl px-4 py-3 ${t.msgA}`}
                        style={animations?{boxShadow:`0 2px 12px ${t.glow}10`}:{}}>
                        <TypingDots glow={t.glow} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── INPUT BAR ──────────────────────────────────────────────────── */}
        {!showDashboard&&(
          <div className={`flex-shrink-0 ${t.bar} px-3 md:px-6 py-3`}>
            <div className="max-w-2xl mx-auto w-full">

              {/* Image preview */}
              {selectedImage&&(
                <div className="mb-2.5 flex items-start gap-2">
                  <div className="relative">
                    <img src={selectedImage} alt="Preview"
                      className="max-h-28 max-w-[160px] rounded-xl object-cover border"
                      style={{borderColor:`${t.glow}28`}} />
                    <button onClick={removeSelectedImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90">
                      <X size={10} className="text-white" />
                    </button>
                  </div>
                  <p className={`text-[10px] mt-1 ${t.sub}`}>📎 Image attached</p>
                </div>
              )}

              {/* Row */}
              <div className="flex items-end gap-2">

                {/* Attach */}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <button onClick={()=>fileInputRef.current?.click()} disabled={isLoading} title="Attach image"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${selectedImage?'text-white':''+t.btnS}`}
                  style={selectedImage?{background:`${t.glow}18`,outline:`1px solid ${t.glow}35`}:{}}>
                  <Paperclip size={16}/>
                </button>

                {/* Voice */}
                <button
                  onMouseDown={startRecording} onMouseUp={stopRecording}
                  onTouchStart={e=>{e.preventDefault();startRecording();}}
                  onTouchEnd={e=>{e.preventDefault();stopRecording();}}
                  disabled={isLoading} title="Hold to speak"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${isRecording?'bg-red-500/80 border border-red-400/50 text-white shadow-lg shadow-red-500/25 animate-pulse':t.btnS}`}>
                  {isRecording?<MicOff size={16}/>:<Mic size={16}/>}
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onInput={handleTextareaInput}
                    placeholder={isCreatorMode?`Tell me anything…`:`Message Tessa…`}
                    disabled={isLoading}
                    rows={1}
                    className={`w-full px-4 py-2.5 rounded-xl resize-none outline-none transition-all duration-200 disabled:opacity-60 ${t.inp} ${fontSizeClass}`}
                    style={{minHeight:'44px',maxHeight:'144px',lineHeight:'1.5',color:t.isLight?'#1e293b':'#fff'}}
                  />
                  {showWordCount&&input.length>0&&(
                    <span className={`absolute right-3 bottom-2 text-[9px] ${t.sub}`}>{input.length}</span>
                  )}
                </div>

                {/* Send */}
                <button onClick={()=>sendMessage()}
                  disabled={(!input.trim()&&!selectedImage)||isLoading}
                  title={sendOnEnter?'Send (Enter)':'Send'}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 ${t.btnP}`}>
                  {isLoading
                    ?<div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    :<Send size={16}/>}
                </button>
              </div>

              {/* Hint bar */}
              <div className="flex items-center justify-between mt-1.5 px-1">
                <p className={`text-[9px] ${t.sub}`}>
                  {isRecording?'🎤 Listening…':sendOnEnter?'Enter to send · Shift+Enter new line':'Click ➤ to send'}
                </p>
                <div className="flex items-center gap-3">
                  {autoSearch&&!isCreatorMode&&(
                    <span className={`text-[9px] ${t.sub} flex items-center gap-1`}>
                      <span>🔍</span>Web search on
                    </span>
                  )}
                  {isCreatorMode&&(
                    <span className="text-[9px] text-pink-400/60 flex items-center gap-1">
                      <Heart size={7}/>Creator Mode
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
      {showDashboard&&isCreatorMode&&(
        <>
          <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={()=>setShowDashboard(false)}/>
          <aside className={`fixed right-0 inset-y-0 z-30 md:relative md:z-10 flex-shrink-0 flex flex-col h-screen overflow-hidden border-l w-[min(82vw,220px)] ${t.panel}`}>
            {/* Header — compact */}
            <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b ${t.div}`}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={11} style={{color:t.glow}}/>
                <span className={`text-[11px] font-black tracking-wide ${t.accent}`}>Insights</span>
              </div>
              <button onClick={()=>setShowDashboard(false)} className="p-1 rounded-lg hover:bg-white/8 transition-colors md:hidden">
                <X size={12} className={t.sub}/>
              </button>
            </div>

            {/* Mood strip — replaces ProfileCard, much smaller */}
            <div className={`flex-shrink-0 mx-3 mt-2.5 mb-1.5 px-3 py-2 rounded-xl flex items-center gap-2.5 ${t.card}`}
              style={{border:`1px solid ${t.glow}20`}}>
              <div className="w-7 h-7 rounded-xl overflow-hidden flex-shrink-0 border"
                style={{borderColor:`${t.glow}40`}}>
                <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                  onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold" style={{color:t.glow}}>Tessa</p>
                <p className={`text-[9px] ${t.sub}`}>{moodEmoji} {moodLabel}</p>
              </div>
              {isCreatorMode && <Heart size={10} className="ml-auto text-pink-400 fill-pink-400 flex-shrink-0"/>}
            </div>

            {/* Scrollable content — only insights + quick actions */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5">

              {/* Tessa Insights — the main widget */}
              <div className={`rounded-xl p-2.5 ${t.card}`}>
                <TessaInsights isCreatorMode={isCreatorMode}/>
              </div>

              {/* Study Timer — accessible from panel */}
              <div className={`rounded-xl p-2.5 ${t.card}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Clock size={10} style={{color:t.glow}}/>
                  <span className={`text-[10px] font-bold ${t.accent}`}>Study Timer</span>
                </div>
                <StudyTimer/>
              </div>

              {/* Quick wellness row */}
              <div className={`rounded-xl p-2.5 ${t.card}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={10} style={{color:t.glow}}/>
                  <span className={`text-[10px] font-bold ${t.accent}`}>Quick Actions</span>
                </div>
                <div className="space-y-1.5">
                  <button onClick={()=>{addWater(1);setWellnessVersion(v=>v+1);}}
                    className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-all active:scale-95 flex items-center justify-center gap-1.5 ${t.btnS}`}>
                    <Droplets size={10} className="text-blue-400"/>💧 Log Water
                  </button>
                  <button onClick={()=>setShowDashboard(false)}
                    className={`w-full py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 ${t.btnS}`}>
                    <LayoutDashboard size={10}/>Full Dashboard
                  </button>
                </div>
              </div>

              {/* Memory quick view */}
              <div className={`rounded-xl p-2.5 ${t.card}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Brain size={10} style={{color:t.glow}}/>
                    <span className={`text-[10px] font-bold ${t.accent}`}>Memory</span>
                  </div>
                  <span className={`text-[9px] ${t.sub}`}>{getAllMemories().length} facts</span>
                </div>
                <button onClick={()=>{if(confirm('Clear all memories?')) clearAllMemories();}}
                  className="w-full py-1.5 rounded-lg text-[9px] border border-red-500/20 bg-red-500/[0.06] hover:bg-red-500/12 text-red-400 transition-all">
                  Clear Memories
                </button>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* ── FLOATING STUDY TIMER ── */}
      {showTimerFloat && (
        <div className="fixed bottom-24 right-4 z-50 w-64 animate-fadeIn shadow-2xl">
          <div className={`rounded-2xl overflow-hidden border ${t.panel}`}
            style={{boxShadow:`0 8px 32px rgba(0,0,0,0.4), 0 0 24px ${t.glow}15`}}>
            <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${t.div}`}>
              <div className="flex items-center gap-2">
                <Clock size={12} style={{color:t.glow}}/>
                <span className={`text-[11px] font-bold ${t.accent}`}>Study Timer</span>
              </div>
              <button onClick={()=>setShowTimerFloat(false)} className={`p-1 rounded-lg hover:bg-white/10 ${t.sub}`}>
                <X size={11}/>
              </button>
            </div>
            <div className="p-3">
              <StudyTimer/>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showSecretModal&&<SecretVerification onSuccess={unlockCreatorModeAction} onClose={()=>setShowSecretModal(false)}/>}
      {showAvatarModal&&<AvatarPresets currentAvatar={avatar} onAvatarChange={path=>{setAvatar(path);lsSet('tessa-avatar-preset',path);}} onClose={()=>setShowAvatarModal(false)}/>}
      {showPlanners&&<PlannerHub onClose={()=>setShowPlanners(false)}/>}
      {showFlashcards&&<FlashcardGenerator isCreatorMode={isCreatorMode} onClose={()=>setShowFlashcards(false)}/>}
      {showReportCard&&<ReportCard isCreatorMode={isCreatorMode} onClose={()=>setShowReportCard(false)}/>}
    </div>
  );
}
