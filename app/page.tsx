'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Mic, MicOff, Menu, X, Settings, Heart, Plus,
  Trash2, LogOut, User, LayoutDashboard, Sun, Moon,
  Calendar, ChevronDown, ChevronUp, StickyNote, Paperclip,
  Sparkles, Brain, Activity, Clock, MessageSquare,
  Volume2, Shield, Droplets, BookOpen, Zap,
  Bell, BellOff, Eye, EyeOff, Palette, RotateCcw,
  Languages, Monitor, Smartphone, Download, Upload,
  Lock, Unlock, Cpu, BarChart3, Hash,
  Check, Database, Info, Globe, Image as ImageIcon,
  Salad, Flame, ChevronRight, Stethoscope, TrendingUp,
  Trophy, Tv2, Radio, RefreshCw, ExternalLink,
} from 'lucide-react';

import type { Message, MoodType, Conversation } from '@/types';

import SecretVerification from '@/components/SecretVerification';
import PersonalDashboard  from '@/components/PersonalDashboard';
import AvatarPresets      from '@/components/AvatarPresets';
import NotesPanel         from '@/components/NotesPanel';
import ProfileCard        from '@/components/ProfileCard';
import StudyTimer from '@/components/StudyTimer';
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
import AuthModal from '@/components/AuthModal';

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
const TESSA = { name: 'Tessa', tagline: 'The Exceptional System, Surpassing ALL' };
// ─────────────────────────────────────────────────────────────────────────────
// AVATAR SYSTEM — 10 avatars (5 existing + 5 new)
// ─────────────────────────────────────────────────────────────────────────────
interface AvatarDef {
  id: string; path: string; name: string; emoji: string; desc: string;
}

const AVATARS: AvatarDef[] = [
  // Existing 5
  {id:'cosmic',   name:'Cosmic',   emoji:'🌌', desc:'Space explorer',   path:'/avatars/cosmic.png'},
  {id:'sunset',   name:'Sunset',   emoji:'🌅', desc:'Golden hour',      path:'/avatars/sunset.png'},
  {id:'galaxy',   name:'Galaxy',   emoji:'✨', desc:'Star cluster',     path:'/avatars/galaxy.png'},
  {id:'forest',   name:'Forest',   emoji:'🌲', desc:'Nature spirit',    path:'/avatars/forest.png'},
  {id:'ocean',    name:'Ocean',    emoji:'🌊', desc:'Deep waters',      path:'/avatars/ocean.png'},
  // New 5
  {id:'aurora',   name:'Aurora',   emoji:'🌈', desc:'Northern lights',  path:'/avatars/aurora.png'},
  {id:'sakura',   name:'Sakura',   emoji:'🌸', desc:'Cherry blossom',   path:'/avatars/sakura.png'},
  {id:'midnight', name:'Midnight', emoji:'🌙', desc:'Deep night',       path:'/avatars/midnight.png'},
  {id:'ember',    name:'Ember',    emoji:'🔥', desc:'Fire warmth',      path:'/avatars/ember.png'},
  {id:'crystal',  name:'Crystal',  emoji:'💎', desc:'Ice gem',          path:'/avatars/crystal.png'},
];



// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM
// Key fix: every theme has BOTH isLight-aware text colours for settings panel
// ─────────────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:'bg-[#050816]', bgC:'bg-[#0b0418]',
    panel:'bg-[#090c1d]/85 backdrop-blur-md border-white/[0.05]',
    panelC:'bg-[#0e0420]/85 backdrop-blur-md border-pink-500/[0.08]',
    header:'bg-black/45 backdrop-blur-md border-b border-white/[0.06]',
    headerC:'bg-black/55 backdrop-blur-md border-b border-pink-500/[0.10]',
    bar:'bg-black/40 backdrop-blur-md border-t border-white/[0.06]',
    barC:'bg-black/50 backdrop-blur-md border-t border-pink-500/[0.10]',
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
    settBg:'bg-[#07091a]/96 backdrop-blur-md border-t border-white/[0.07]',
    settBgC:'bg-[#0d0320]/96 backdrop-blur-md border-t border-pink-500/[0.09]',
    // Settings text (dark mode is always white-ish)
    settText:'text-white/75', settTextHover:'hover:text-white',
    settSub:'text-white/28', settLabel:'text-white/20',
    settCard:'bg-white/[0.04] border border-white/[0.07]',
    settActive:'bg-white/[0.07] border border-white/[0.12]',
    isLight:false,
  },
  light: {
    bg:'bg-[#f0f4ff]', bgC:'bg-[#fff0f5]',
    panel:'bg-white/85 backdrop-blur-md border-slate-200/70',
    panelC:'bg-rose-50/90 backdrop-blur-md border-pink-200/60',
    header:'bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm shadow-slate-900/[0.04]',
    headerC:'bg-white/80 backdrop-blur-md border-b border-pink-200/50 shadow-sm shadow-pink-500/[0.04]',
    bar:'bg-white/88 backdrop-blur-md border-t border-slate-200/60 shadow-sm shadow-slate-900/[0.03]',
    barC:'bg-white/88 backdrop-blur-md border-t border-pink-200/50',
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
    settBg:'bg-white/97 backdrop-blur-md border-t border-slate-200',
    settBgC:'bg-white/97 backdrop-blur-md border-t border-pink-200',
    // Settings text (light mode — must use dark colours!)
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-slate-50 border border-slate-200',
    settActive:'bg-slate-100 border border-slate-300',
    isLight:true,
  },
  cyberpunk: {
    bg:'bg-[#06000f]', bgC:'bg-[#0f0018]',
    panel:'bg-purple-950/30 backdrop-blur-md border-purple-500/[0.11]',
    panelC:'bg-pink-950/30 backdrop-blur-md border-pink-500/[0.11]',
    header:'bg-black/70 backdrop-blur-md border-b border-purple-500/[0.16]',
    headerC:'bg-black/70 backdrop-blur-md border-b border-pink-500/[0.16]',
    bar:'bg-black/60 backdrop-blur-md border-t border-purple-500/[0.16]',
    barC:'bg-black/60 backdrop-blur-md border-t border-pink-500/[0.16]',
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
    settBg:'bg-[#09001a]/96 backdrop-blur-md border-t border-purple-500/[0.11]',
    settBgC:'bg-[#140010]/96 backdrop-blur-md border-t border-pink-500/[0.11]',
    settText:'text-purple-100/75', settTextHover:'hover:text-purple-50',
    settSub:'text-purple-300/30', settLabel:'text-purple-300/20',
    settCard:'bg-purple-950/[0.25] border border-purple-500/[0.12]',
    settActive:'bg-purple-500/[0.14] border border-purple-500/[0.28]',
    isLight:false,
  },
  // ── OCEAN: light seafoam · sky · aqua — bright airy coastal feel ─────────────
  // NOT dark navy. Soft sky-blue base, teal/cyan accents, sea-glass panels.
  ocean: {
    bg:'bg-cyan-50', bgC:'bg-sky-50',
    panel:'bg-white/85 backdrop-blur-md border-cyan-300/50',
    panelC:'bg-sky-50/90 backdrop-blur-md border-sky-300/50',
    header:'bg-white/80 backdrop-blur-md border-b border-cyan-300/45 shadow-sm shadow-cyan-100/40',
    headerC:'bg-white/80 backdrop-blur-md border-b border-sky-300/45 shadow-sm shadow-sky-100/40',
    bar:'bg-white/82 backdrop-blur-md border-t border-cyan-200/50',
    barC:'bg-white/82 backdrop-blur-md border-t border-sky-200/50',
    msgU:'bg-gradient-to-br from-cyan-100/85 to-teal-50/65 border border-cyan-300/50 border-l-[3px] border-l-teal-500',
    msgUC:'bg-gradient-to-br from-sky-100/85 to-blue-50/65 border border-sky-300/50 border-l-[3px] border-l-blue-500',
    msgA:'bg-white/80 border border-cyan-200/60 border-l-[3px] border-l-cyan-400/70',
    msgAC:'bg-white/80 border border-sky-200/60 border-l-[3px] border-l-sky-400/70',
    inp:'bg-white border border-cyan-300/55 text-slate-700 placeholder:text-cyan-400/60 focus:border-teal-500/70 focus:ring-2 focus:ring-cyan-400/18',
    inpC:'bg-white border border-sky-300/55 text-slate-700 placeholder:text-sky-400/60 focus:border-sky-500/70 focus:ring-2 focus:ring-sky-400/18',
    btnP:'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-md shadow-teal-400/30',
    btnPC:'bg-gradient-to-r from-blue-500 to-sky-500 hover:from-blue-600 hover:to-sky-600 text-white shadow-md shadow-blue-400/30',
    btnS:'bg-cyan-50 hover:bg-cyan-100 border border-cyan-300/60 text-teal-700 hover:text-teal-900',
    btnSC:'bg-sky-50 hover:bg-sky-100 border border-sky-300/60 text-blue-700 hover:text-blue-900',
    text:'text-slate-700', sub:'text-teal-500/70', subC:'text-blue-500/70',
    accent:'text-teal-600', accentC:'text-blue-600',
    glow:'#0d9488', glowC:'#0284c7',
    card:'bg-white/70 border border-cyan-200/60',
    cardC:'bg-white/70 border border-sky-200/60',
    active:'bg-cyan-100 border border-cyan-400/55',
    activeC:'bg-sky-100 border border-sky-400/55',
    div:'border-cyan-200/50', divC:'border-sky-200/50',
    settBg:'bg-white/97 backdrop-blur-md border-t border-cyan-200/55',
    settBgC:'bg-white/97 backdrop-blur-md border-t border-sky-200/55',
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-cyan-50 border border-cyan-200/60',
    settActive:'bg-cyan-100 border border-cyan-400/55',
    isLight:true,
  },
  sunset: {
    bg:'bg-[#110805]', bgC:'bg-[#17080f]',
    panel:'bg-orange-950/24 backdrop-blur-md border-orange-500/[0.11]',
    panelC:'bg-rose-950/24 backdrop-blur-md border-rose-500/[0.11]',
    header:'bg-black/50 backdrop-blur-md border-b border-orange-500/[0.13]',
    headerC:'bg-black/50 backdrop-blur-md border-b border-rose-500/[0.13]',
    bar:'bg-black/46 backdrop-blur-md border-t border-orange-500/[0.13]',
    barC:'bg-black/46 backdrop-blur-md border-t border-rose-500/[0.13]',
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
    settBg:'bg-[#120905]/96 backdrop-blur-md border-t border-orange-500/[0.09]',
    settBgC:'bg-[#180810]/96 backdrop-blur-md border-t border-rose-500/[0.09]',
    settText:'text-orange-100/75', settTextHover:'hover:text-orange-50',
    settSub:'text-orange-300/30', settLabel:'text-orange-300/20',
    settCard:'bg-orange-950/[0.26] border border-orange-500/[0.12]',
    settActive:'bg-orange-500/[0.12] border border-orange-500/[0.26]',
    isLight:false,
  },
  // ── PASTEL: dreamy soft lavender light theme ──────────────────────────────
  pastel: {
    bg:'bg-[#f3efff]', bgC:'bg-[#fdf0ff]',
    panel:'bg-white/80 backdrop-blur-md border-violet-200/60',
    panelC:'bg-fuchsia-50/85 backdrop-blur-md border-fuchsia-200/55',
    header:'bg-white/72 backdrop-blur-md border-b border-violet-200/50 shadow-sm shadow-violet-100/40',
    headerC:'bg-white/72 backdrop-blur-md border-b border-fuchsia-200/50 shadow-sm shadow-fuchsia-100/40',
    bar:'bg-white/78 backdrop-blur-md border-t border-violet-200/50 shadow-sm shadow-violet-100/30',
    barC:'bg-white/78 backdrop-blur-md border-t border-fuchsia-200/50',
    msgU:'bg-gradient-to-br from-violet-100/80 to-purple-50/60 border border-violet-300/50 border-l-[3px] border-l-violet-500',
    msgUC:'bg-gradient-to-br from-fuchsia-100/80 to-pink-50/60 border border-fuchsia-300/50 border-l-[3px] border-l-fuchsia-500',
    msgA:'bg-white/85 border border-violet-100/70 border-l-[3px] border-l-purple-300',
    msgAC:'bg-white/85 border border-fuchsia-100/70 border-l-[3px] border-l-fuchsia-300',
    inp:'bg-white border border-violet-300/60 text-slate-700 placeholder:text-violet-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-400/15',
    inpC:'bg-white border border-fuchsia-300/60 text-slate-700 placeholder:text-fuchsia-300 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-400/15',
    btnP:'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md shadow-violet-400/30',
    btnPC:'bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white shadow-md shadow-fuchsia-400/30',
    btnS:'bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 hover:text-violet-900',
    btnSC:'bg-fuchsia-50 hover:bg-fuchsia-100 border border-fuchsia-200 text-fuchsia-700 hover:text-fuchsia-900',
    text:'text-slate-700', sub:'text-violet-400', subC:'text-fuchsia-400',
    accent:'text-violet-600', accentC:'text-fuchsia-600',
    glow:'#7c3aed', glowC:'#c026d3',
    card:'bg-white/70 border border-violet-100',
    cardC:'bg-white/70 border border-fuchsia-100',
    active:'bg-violet-100 border border-violet-300',
    activeC:'bg-fuchsia-100 border border-fuchsia-300',
    div:'border-violet-200/50', divC:'border-fuchsia-200/50',
    settBg:'bg-white/96 backdrop-blur-md border-t border-violet-200',
    settBgC:'bg-white/96 backdrop-blur-md border-t border-fuchsia-200',
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-violet-50 border border-violet-200',
    settActive:'bg-violet-100 border border-violet-300',
    isLight:true,
  },
  // ── SAKURA: cherry-blossom pink light theme ──────────────────────────────
  sakura: {
    bg:'bg-[#fff2f5]', bgC:'bg-[#fff0f8]',
    panel:'bg-white/80 backdrop-blur-md border-rose-200/55',
    panelC:'bg-pink-50/85 backdrop-blur-md border-pink-200/55',
    header:'bg-white/72 backdrop-blur-md border-b border-rose-200/45 shadow-sm shadow-rose-100/40',
    headerC:'bg-white/72 backdrop-blur-md border-b border-pink-200/45 shadow-sm shadow-pink-100/40',
    bar:'bg-white/78 backdrop-blur-md border-t border-rose-200/45 shadow-sm shadow-rose-100/30',
    barC:'bg-white/78 backdrop-blur-md border-t border-pink-200/45',
    msgU:'bg-gradient-to-br from-rose-100/80 to-pink-50/60 border border-rose-300/50 border-l-[3px] border-l-rose-500',
    msgUC:'bg-gradient-to-br from-pink-100/80 to-fuchsia-50/60 border border-pink-300/50 border-l-[3px] border-l-pink-500',
    msgA:'bg-white/85 border border-rose-100/70 border-l-[3px] border-l-rose-300',
    msgAC:'bg-white/85 border border-pink-100/70 border-l-[3px] border-l-pink-300',
    inp:'bg-white border border-rose-300/60 text-slate-700 placeholder:text-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-400/15',
    inpC:'bg-white border border-pink-300/60 text-slate-700 placeholder:text-pink-300 focus:border-pink-500 focus:ring-2 focus:ring-pink-400/15',
    btnP:'bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white shadow-md shadow-rose-400/30',
    btnPC:'bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-600 hover:to-fuchsia-700 text-white shadow-md shadow-pink-400/30',
    btnS:'bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-900',
    btnSC:'bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 hover:text-pink-900',
    text:'text-slate-700', sub:'text-rose-400', subC:'text-pink-400',
    accent:'text-rose-600', accentC:'text-pink-600',
    glow:'#f43f5e', glowC:'#ec4899',
    card:'bg-white/70 border border-rose-100',
    cardC:'bg-white/70 border border-pink-100',
    active:'bg-rose-100 border border-rose-300',
    activeC:'bg-pink-100 border border-pink-300',
    div:'border-rose-200/50', divC:'border-pink-200/50',
    settBg:'bg-white/96 backdrop-blur-md border-t border-rose-200',
    settBgC:'bg-white/96 backdrop-blur-md border-t border-pink-200',
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-rose-50 border border-rose-200',
    settActive:'bg-rose-100 border border-rose-300',
    isLight:true,
  },
  // ── ANKIT'S SPECIAL — Creator-mode only theme ───────────────────────────────
  // Only appears in creator mode settings. Standard mode doesn't show this.
  // Background: parchment (#f0ebe0) + sketch lines + Spidey mask corner art
  // All text stays dark slate — fully readable over the light parchment
  ankit: {
    bg:'bg-[#f5f0e8]', bgC:'bg-[#f0ebe0]',
    panel:'bg-white/80 backdrop-blur-md border-red-200/40 shadow-sm shadow-red-100/20',
    panelC:'bg-white/75 backdrop-blur-md border-slate-300/40 shadow-sm shadow-slate-200/30',
    header:'bg-[#f5f0e8]/92 backdrop-blur-md border-b border-red-200/35 shadow-sm',
    headerC:'bg-[#f0ebe0]/92 backdrop-blur-md border-b border-slate-300/35 shadow-sm',
    bar:'bg-[#f5f0e8]/92 backdrop-blur-md border-t border-red-200/35',
    barC:'bg-[#f0ebe0]/92 backdrop-blur-md border-t border-slate-300/35',
    msgU:'bg-white/70 border border-red-200/40 border-l-[3px] border-l-red-500/60',
    msgUC:'bg-white/70 border border-slate-200/40 border-l-[3px] border-l-red-700/50',
    msgA:'bg-white/65 border border-slate-200/40 border-l-[3px] border-l-blue-400/50',
    msgAC:'bg-white/65 border border-slate-200/40 border-l-[3px] border-l-slate-500/50',
    inp:'bg-white/90 border border-red-200/50 text-slate-800 placeholder:text-slate-400 focus:border-red-400/60 focus:ring-2 focus:ring-red-300/20',
    inpC:'bg-white/90 border border-slate-300/50 text-slate-800 placeholder:text-slate-400 focus:border-slate-500/60 focus:ring-2 focus:ring-slate-300/20',
    btnP:'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-sm shadow-red-500/30',
    btnPC:'bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-sm shadow-slate-500/30',
    btnS:'bg-white/80 hover:bg-white border border-red-200/50 text-slate-700 hover:text-slate-900',
    btnSC:'bg-white/80 hover:bg-white border border-slate-300/50 text-slate-700 hover:text-slate-900',
    text:'text-slate-800', sub:'text-slate-500', subC:'text-slate-600',
    accent:'text-red-700', accentC:'text-slate-800',
    glow:'#dc2626', glowC:'#1a1a2e',
    card:'bg-white/75 border border-red-100/50',
    cardC:'bg-white/75 border border-slate-200/50',
    active:'bg-white border border-red-400/50',
    activeC:'bg-white border border-slate-400/50',
    div:'border-red-200/35', divC:'border-slate-300/35',
    // Settings panel — solid white so sliders/toggles are fully readable
    settBg:'bg-white/98 backdrop-blur-md border-t border-red-200/40',
    settBgC:'bg-white/98 backdrop-blur-md border-t border-slate-300/40',
    settText:'text-slate-800', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-500', settLabel:'text-slate-600',
    settCard:'bg-slate-50 border border-slate-200/60',
    settActive:'bg-red-50 border border-red-300/50',
    isLight:true,
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
// SOLID BACKGROUND HELPER — prevents background bleed-through in popups
// ─────────────────────────────────────────────────────────────────────────────
function getSolidBg(t: ReturnType<typeof useT>) {
  return t.isLight
    ? 'bg-white/98 backdrop-blur-md'
    : 'bg-[#080510]/98 backdrop-blur-md';
}

// Per-theme solid popup background color (used inline for heavy popups)
const THEME_POPUP_BG: Record<string, string> = {
  dark:      'rgba(4,5,18,0.98)',
  cyberpunk: 'rgba(3,2,18,0.98)',
  ocean:     'rgba(2,8,28,0.98)',
  sunset:    'rgba(12,6,3,0.98)',
  ankit:     'rgba(245,240,232,0.99)',
  light:     'rgba(255,255,255,0.99)',
  pastel:    'rgba(255,255,255,0.99)',
  sakura:    'rgba(255,255,255,0.99)',
};

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
// CREATOR SYNC  ·  Universal sync — independent of email/account
// Uses a fixed CREATOR_SYNC_ID so ALL devices that unlock creator mode stay in sync
// No login required — the secret IS the authentication
// ─────────────────────────────────────────────────────────────────────────────
const CREATOR_SYNC_ID = 'ankit-tessa-creator-v1'; // fixed universal ID

function buildCreatorPayload() {
  return {
    health:      lsGetJson('tessa-health',   null),
    memories:    lsGetJson('tessa-memories', []),
    streaks:     lsGetJson('tessa-streaks',  null),
    water:       lsGetJson('tessa-water',    null),
    mood:        lsGet('tessa-last-mood')   ?? 'loving',
    avatar:      lsGet('tessa-avatar')      ?? 'cosmic',
    theme:       lsGet('tessa-theme')       ?? 'dark',
    last_active: new Date().toISOString(),
  };
}
async function pushCreatorSync(_userId?: string): Promise<void> {
  try {
    await supabase.from('creator_sync').upsert(
      { user_id: CREATOR_SYNC_ID, payload: buildCreatorPayload(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch {}
}
async function pullCreatorSync(_userId?: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('creator_sync').select('payload,updated_at').eq('user_id', CREATOR_SYNC_ID).single();
    if (error || !data?.payload) return false;
    const p   = data.payload as Record<string, any>;
    const rem = new Date(data.updated_at).getTime();
    const loc = new Date(lsGet('tessa-last-sync') ?? 0).getTime();
    if (rem <= loc) return false;               // local is already up-to-date
    if (p.health)   lsSet('tessa-health',   JSON.stringify(p.health));
    if (p.memories) lsSet('tessa-memories', JSON.stringify(p.memories));
    if (p.streaks)  lsSet('tessa-streaks',  JSON.stringify(p.streaks));
    if (p.water)    lsSet('tessa-water',    JSON.stringify(p.water));
    if (p.mood)     lsSet('tessa-last-mood', String(p.mood));
    if (p.avatar)   lsSet('tessa-avatar',   String(p.avatar));
    lsSet('tessa-last-sync', data.updated_at);
    return true;
  } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED MICRO-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Beautiful animated background — works for all dark themes
// On mobile: static gradient only (no animated blobs = no GPU thrash)
// On desktop: full animated aurora
function AuroraBg({ glow, glow2 }: { glow: string; glow2: string; theme: Theme }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      {/* Static base gradient — rendered on ALL devices */}
      <div className="absolute inset-0" style={{
        background: `radial-gradient(ellipse 90% 70% at 15% 10%, ${glow}12 0%, transparent 55%),
                     radial-gradient(ellipse 70% 60% at 82% 78%, ${glow2}0e 0%, transparent 55%),
                     radial-gradient(ellipse 50% 40% at 50% 50%, ${glow}07 0%, transparent 70%)`,
      }}/>
      {/* Animated blobs — desktop only via CSS media query class */}
      <div className="hidden md:block absolute rounded-full blur-[180px] animate-aurora-a"
        style={{ width:800, height:800, background:glow, opacity:0.07, top:'-25%', left:'-10%', willChange:'transform' }} />
      <div className="hidden md:block absolute rounded-full blur-[140px] animate-aurora-b"
        style={{ width:600, height:600, background:glow2, opacity:0.055, top:'30%', right:'-12%', willChange:'transform' }} />
      <div className="hidden md:block absolute rounded-full blur-[120px] animate-aurora-c"
        style={{ width:400, height:400, background:glow, opacity:0.045, bottom:'-8%', left:'40%', willChange:'transform' }} />
      {/* Dot grid — light enough for both */}
      <div className="absolute inset-0" style={{
        backgroundImage:`radial-gradient(circle, ${glow}14 1px, transparent 1px)`,
        backgroundSize:'40px 40px', opacity:0.40,
      }} />
      {/* Bottom vignette */}
      <div className="absolute inset-0" style={{
        background:`radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(0,0,0,0.50) 100%)`,
      }} />
    </div>
  );
}

// Light theme background — mobile: pure CSS gradient; desktop: animated blobs
// Ankit: pure white/rose with subtle SVG web corners only
function LightBg({ creator, theme }: { creator: boolean; theme: Theme }) {
  // Ankit theme: only active in creator mode. Standard mode falls through to configs below.
  if (theme === 'ankit' && creator) {
    // Parchment + sketch/ink aesthetic (Image 4 inspired)
    // No spider figure in centre — just texture, sketch lines, mask corner art
    return (
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
        {/* Parchment base */}
        <div className="absolute inset-0" style={{ background: '#f0ebe0' }}/>

        {/* Warm vignette — very subtle */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, transparent 50%, rgba(180,150,110,0.12) 100%)',
        }}/>

        {/* Diagonal speed / sketch lines — Image 4 style */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.07 }}>
          {Array.from({length:50},(_,i)=>(
            <line key={i}
              x1={-80 + i*12} y1="0"
              x2={-80 + i*12 + 220} y2="800"
              stroke="#2c2c2c" strokeWidth={i%6===0?0.9:i%3===0?0.55:0.35}/>
          ))}
        </svg>

        {/* Red + dark ink splatter dots scattered across — Image 4 style */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 800"
          preserveAspectRatio="xMidYMid slice" style={{ opacity: 0.40 }}>
          {[
            [38,115,'#c0392b',3],[62,275,'#c0392b',2],[78,395,'#1a1a2e',2.5],[28,548,'#c0392b',1.8],[88,665,'#1a1a2e',1.5],
            [285,78,'#c0392b',2.2],[312,198,'#1a1a2e',3],[258,362,'#c0392b',1.8],[322,478,'#c0392b',2],[288,598,'#1a1a2e',1.5],[348,718,'#c0392b',1.2],
            [148,148,'#1a1a2e',2],[168,318,'#c0392b',1.5],[128,478,'#1a1a2e',2.5],[158,628,'#c0392b',1],
            [218,98,'#c0392b',1.5],[198,258,'#1a1a2e',2],[238,418,'#c0392b',1.8],[208,578,'#1a1a2e',1.2],
            [55,35,'#c0392b',1.2],[320,35,'#1a1a2e',1],[180,22,'#c0392b',0.8],
          ].map(([x,y,fill,r],i)=>(
            <circle key={i} cx={x as number} cy={y as number} r={r as number} fill={fill as string}/>
          ))}
        </svg>

        {/* Spidey mask — bottom-right corner only, large, artistic */}
        <svg className="absolute bottom-0 right-0" style={{ width: '72%', maxWidth: 340, opacity: 0.10 }}
          viewBox="0 0 300 400" preserveAspectRatio="xMaxYMax meet">
          {/* Head */}
          <ellipse cx="195" cy="155" rx="125" ry="155" fill="#c0392b"/>
          {/* Web lines radiating from eye area */}
          {[0,18,36,54,72,90,108,126,144,162,180].map((deg,i)=>{
            const rad=deg*Math.PI/180;
            return <line key={i} x1="195" y1="155" x2={195+210*Math.cos(rad)} y2={155+210*Math.sin(rad)}
              stroke="#8b0000" strokeWidth="0.7" opacity="0.5"/>;
          })}
          {[38,76,114,152,190].map((r,i)=>(
            <ellipse key={i} cx="195" cy="155" rx={r} ry={r*1.22}
              fill="none" stroke="#8b0000" strokeWidth="0.55" opacity={0.38-i*0.05}/>
          ))}
          {/* Big angular eye lens — top left */}
          <path d="M 108,96 C 118,74 162,68 184,84 C 206,100 212,128 196,139 C 170,155 110,143 100,120 C 96,110 100,104 108,96 Z"
            fill="white" opacity="0.92"/>
          <path d="M 111,99 C 121,79 160,74 181,88 C 201,103 206,125 191,135 C 166,150 113,139 105,118 C 101,109 104,105 111,99 Z"
            fill="#b0bec5" opacity="0.4"/>
          {/* Dark body/shoulder at bottom */}
          <ellipse cx="240" cy="370" rx="155" ry="115" fill="#1a1a2e" opacity="0.88"/>
        </svg>

        {/* Small ink blot — bottom-left corner accent */}
        <svg className="absolute bottom-0 left-0" style={{ width: '32%', maxWidth: 130, opacity: 0.08 }}
          viewBox="0 0 130 180">
          <ellipse cx="50" cy="165" rx="70" ry="55" fill="#1a1a2e"/>
          <ellipse cx="22" cy="148" rx="26" ry="44" fill="#c0392b"/>
        </svg>

        {/* TASM2 scene — Gwen horizontal suspended, Spidey grieving beside her */}
        {/* Placed together upper-left, not in extreme corners */}

        {/* Web threads holding Gwen up — anchor at top */}
        <svg className="absolute" style={{ left:'8%', top:0, width:160, height:100, opacity:0.15 }}
          viewBox="0 0 160 100" preserveAspectRatio="none">
          <line x1="48"  y1="0" x2="48"  y2="100" stroke="#999" strokeWidth="1.2" strokeDasharray="3,3"/>
          <line x1="112" y1="0" x2="112" y2="100" stroke="#999" strokeWidth="1.2" strokeDasharray="3,3"/>
          {([210,225,240,255,270,285,300] as number[]).map((deg,i)=>{
            const r=deg*Math.PI/180;
            return <line key={i} x1="48" y1="4" x2={48+12*Math.cos(r)} y2={4+12*Math.sin(r)} stroke="#aaa" strokeWidth="0.5" opacity="0.5"/>;
          })}
          {([210,225,240,255,270,285,300] as number[]).map((deg,i)=>{
            const r=deg*Math.PI/180;
            return <line key={'b'+i} x1="112" y1="4" x2={112+12*Math.cos(r)} y2={4+12*Math.sin(r)} stroke="#aaa" strokeWidth="0.5" opacity="0.5"/>;
          })}
        </svg>

        {/* ── Gwen: lying horizontal, parallel to ground, suspended by two web strands ── */}
        <svg className="absolute" style={{ left:'5%', top:68, width:200, opacity:0.27 }}
          viewBox="0 0 200 80">
          {/* Web attachment points on body */}
          <line x1="52"  y1="0" x2="52"  y2="30" stroke="#999" strokeWidth="1" strokeDasharray="2,2"/>
          <line x1="118" y1="0" x2="118" y2="30" stroke="#999" strokeWidth="1" strokeDasharray="2,2"/>
          {/* Legs — horizontal, feet to the right */}
          <path d="M 132,36 C 150,35 168,34 184,32" fill="none" stroke="#2c3e70" strokeWidth="10" strokeLinecap="round"/>
          <path d="M 132,44 C 150,45 168,46 184,48" fill="none" stroke="#2c3e70" strokeWidth="8" strokeLinecap="round"/>
          {/* Shoes */}
          <ellipse cx="186" cy="31" rx="9" ry="5" fill="#1a1a1a" transform="rotate(-4 186 31)"/>
          <ellipse cx="186" cy="49" rx="8" ry="4" fill="#1a1a1a" transform="rotate(4 186 49)"/>
          {/* Torso — red jacket */}
          <rect x="72" y="28" width="62" height="24" rx="10" fill="#8b1a1a"/>
          {/* White collar */}
          <ellipse cx="74" cy="40" rx="11" ry="8" fill="#f0f0f0"/>
          {/* Arms — left arm trailing back, right slightly forward */}
          <path d="M 74,34 C 58,30 44,26 32,24" fill="none" stroke="#8b1a1a" strokeWidth="7" strokeLinecap="round"/>
          <path d="M 74,48 C 60,52 46,54 34,56" fill="none" stroke="#8b1a1a" strokeWidth="6" strokeLinecap="round"/>
          <circle cx="30" cy="23" r="5" fill="#f5deb3"/>
          <circle cx="32" cy="57" r="5" fill="#f5deb3"/>
          {/* Head — facing right, eyes closed */}
          <ellipse cx="54" cy="40" rx="15" ry="13" fill="#f5deb3"/>
          {/* Blonde hair streaming to the left */}
          <path d="M 46,30 C 30,22 16,16 4,14"  fill="none" stroke="#d4aa55" strokeWidth="4"   strokeLinecap="round"/>
          <path d="M 44,34 C 28,28 14,24 2,24"  fill="none" stroke="#c8a84b" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M 44,40 C 28,40 14,39 2,38"  fill="none" stroke="#d4aa55" strokeWidth="3"   strokeLinecap="round"/>
          <path d="M 46,47 C 30,52 16,54 4,54"  fill="none" stroke="#c8a84b" strokeWidth="3"   strokeLinecap="round"/>
          <path d="M 48,52 C 34,58 22,62 8,64"  fill="none" stroke="#d4aa55" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Closed eyes */}
          <path d="M 49,38 C 51,35 55,35 58,38" fill="none" stroke="#8b6347" strokeWidth="1.2"/>
          <path d="M 50,43 C 52,40 56,40 59,43" fill="none" stroke="#8b6347" strokeWidth="1.2"/>
          <path d="M 50,46 Q 54,48 58,46" fill="none" stroke="#c0726a" strokeWidth="0.9"/>
        </svg>

        {/* ── Spider-Man: sitting beside Gwen, head bowed, grieving ── */}
        <svg className="absolute" style={{ left:'34%', top:60, width:130, opacity:0.26 }}
          viewBox="0 0 100 170">
          {/* Sitting legs bent — knees up */}
          <path d="M 30,105 C 22,120 16,132 14,144" fill="none" stroke="#c0392b" strokeWidth="11" strokeLinecap="round"/>
          <path d="M 56,105 C 66,118 72,130 74,142" fill="none" stroke="#1565c0" strokeWidth="11" strokeLinecap="round"/>
          {/* Lower legs */}
          <path d="M 14,144 C 10,150 18,154 34,150" fill="none" stroke="#c0392b" strokeWidth="10" strokeLinecap="round"/>
          <path d="M 74,142 C 80,148 78,154 64,152" fill="none" stroke="#1565c0" strokeWidth="9" strokeLinecap="round"/>
          {/* Shoes */}
          <ellipse cx="23" cy="151" rx="12" ry="5" fill="#c0392b"/>
          <ellipse cx="68" cy="153" rx="11" ry="5" fill="#c0392b"/>
          {/* Body slumped forward */}
          <ellipse cx="43" cy="86" rx="19" ry="22" fill="#1565c0"/>
          <ellipse cx="43" cy="81" rx="13" ry="15" fill="#c0392b"/>
          {/* Spider emblem */}
          <ellipse cx="43" cy="79" rx="4" ry="5.5" fill="#0d0d0d"/>
          <line x1="43" y1="73" x2="35" y2="66" stroke="#0d0d0d" strokeWidth="1.8"/>
          <line x1="43" y1="73" x2="51" y2="66" stroke="#0d0d0d" strokeWidth="1.8"/>
          <line x1="43" y1="85" x2="35" y2="92" stroke="#0d0d0d" strokeWidth="1.8"/>
          <line x1="43" y1="85" x2="51" y2="92" stroke="#0d0d0d" strokeWidth="1.8"/>
          {/* Arms — both resting on knees, hanging forward */}
          <path d="M 25,90 C 18,102 16,112 18,118" fill="none" stroke="#c0392b" strokeWidth="9" strokeLinecap="round"/>
          <path d="M 61,88 C 68,100 70,110 68,116" fill="none" stroke="#1565c0" strokeWidth="9" strokeLinecap="round"/>
          <circle cx="18" cy="119" r="7" fill="#c0392b"/>
          <circle cx="68" cy="117" r="7" fill="#1565c0"/>
          {/* Head — deeply bowed, chin to chest */}
          <ellipse cx="42" cy="60" rx="18" ry="18" fill="#c0392b" transform="rotate(10 42 60)"/>
          {/* Web lines on mask */}
          {[175,195,215,235,255].map((deg,i)=>{
            const r2=deg*Math.PI/180;
            return <line key={i} x1="42" y1="60" x2={42+22*Math.cos(r2)} y2={60+22*Math.sin(r2)}
              stroke="#8b0000" strokeWidth="0.7" opacity="0.4"/>;
          })}
          <ellipse cx="42" cy="60" rx="8" ry="9"  fill="none" stroke="#8b0000" strokeWidth="0.6" opacity="0.4"/>
          <ellipse cx="42" cy="60" rx="14" ry="15" fill="none" stroke="#8b0000" strokeWidth="0.5" opacity="0.3"/>
          {/* Grief-lidded eyes — looking down */}
          <path d="M 33,54 C 35,49 40,48 44,50" fill="white" opacity="0.8"/>
          <path d="M 44,50 C 48,48 51,50 52,54" fill="white" opacity="0.8"/>
          <ellipse cx="38" cy="53" rx="3.5" ry="2.5" fill="#b0bec5" opacity="0.45"/>
          <ellipse cx="47" cy="53" rx="3.5" ry="2.5" fill="#b0bec5" opacity="0.45"/>
          {/* Tear drop — subtle */}
          <ellipse cx="36" cy="57" rx="1.2" ry="2" fill="#aac8e0" opacity="0.5"/>
        </svg>
        {/* Paper grain */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, rgba(100,80,60,0.065) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}/>
      </div>
    );
  }

  const configs: Record<string, { grad: string; blob1: string; blob2: string; blob3: string }> = {
    light: {
      grad: creator
        ? 'radial-gradient(ellipse 80% 60% at 20% 10%, #fce7f3 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #f3e8ff 0%, transparent 55%)'
        : 'radial-gradient(ellipse 80% 60% at 20% 10%, #dbeafe 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #ede9fe 0%, transparent 55%)',
      blob1: creator ? '#fce7f3' : '#dbeafe',
      blob2: creator ? '#f3e8ff' : '#ede9fe',
      blob3: creator ? '#fdf4ff' : '#e0f2fe',
    },
    pastel: {
      grad: 'radial-gradient(ellipse 90% 70% at 15% 5%, #ede9fe 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 85% 85%, #fae8ff 0%, transparent 50%)',
      blob1: '#ddd6fe', blob2: '#e879f9', blob3: '#c4b5fd',
    },
    sakura: {
      grad: 'radial-gradient(ellipse 90% 70% at 15% 5%, #ffe4e6 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 88% 82%, #fce7f3 0%, transparent 50%)',
      blob1: '#fecdd3', blob2: '#f9a8d4', blob3: '#fda4af',
    },
    ocean: {
      grad: 'radial-gradient(ellipse 85% 65% at 15% 8%, #a5f3fc60 0%, transparent 55%), radial-gradient(ellipse 65% 55% at 85% 80%, #bae6fd50 0%, transparent 55%)',
      blob1: '#67e8f9', blob2: '#7dd3fc', blob3: '#a5f3fc',
    },
  };
  const cfg = configs[theme] ?? configs.light;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="absolute inset-0" style={{ background: cfg.grad }} />
      <div className="hidden md:block absolute rounded-full blur-[160px] animate-aurora-a"
        style={{ width:500, height:500, background:cfg.blob1, opacity:0.30, top:'-10%', left:'-5%', willChange:'transform' }} />
      <div className="hidden md:block absolute rounded-full blur-[130px] animate-aurora-b"
        style={{ width:380, height:380, background:cfg.blob2, opacity:0.18, bottom:'-8%', right:'-5%', willChange:'transform' }} />
      <div className="hidden md:block absolute rounded-full blur-[100px] animate-aurora-c"
        style={{ width:260, height:260, background:cfg.blob3, opacity:0.14, top:'45%', left:'55%', willChange:'transform' }} />
    </div>
  );
}

// Floating hearts (creator mode)
function Hearts({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      {['5%','17%','31%','48%','62%','76%','91%'].map((left, i) => (
        <span key={i} className="float-heart absolute text-sm opacity-0 select-none animate-float-heart"
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
// AVATAR PICKER MODAL — beautiful 4-col grid sheet
// ─────────────────────────────────────────────────────────────────────────────
function AvatarPickerModal({ current, onSelect, onClose, t, glow }: {
  current: string; onSelect: (id: string) => void; onClose: () => void;
  t: ReturnType<typeof useT>; glow: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-sm mx-4 mb-4 sm:mb-0 rounded-3xl overflow-hidden shadow-2xl ${t.isLight?'bg-white border border-slate-200':'bg-[#0d1120] border border-white/10'}`}
        style={{boxShadow:`0 24px 64px rgba(0,0,0,0.5), 0 0 40px ${glow}15`}}>
        <div className={`flex items-center justify-between px-5 py-4 border-b ${t.div}`}>
          <div>
            <p className={`font-black text-sm ${t.isLight?'text-slate-800':'text-white'}`}>Choose Avatar</p>
            <p className={`text-[9px] mt-0.5 ${t.sSub}`}>10 avatars for Tessa</p>
          </div>
          <button onClick={onClose} className={`w-7 h-7 rounded-full flex items-center justify-center ${t.isLight?'bg-slate-100 hover:bg-slate-200':'bg-white/8 hover:bg-white/14'}`}>
            <X size={13} className={t.sSub} />
          </button>
        </div>
        <div className="p-4 grid grid-cols-4 gap-3">
          {AVATARS.map(av => {
            const isSel = current === av.id;
            return (
              <button key={av.id} onClick={() => { onSelect(av.id); onClose(); }}
                className="flex flex-col items-center gap-1.5 group" title={av.desc}>
                <div className={`relative w-14 h-14 rounded-2xl overflow-hidden transition-all duration-200 ${isSel?'scale-105':' hover:scale-105'}`}
                  style={{boxShadow: isSel ? `0 0 0 2px ${glow}, 0 4px 16px ${glow}35` : '0 2px 8px rgba(0,0,0,0.15)'}}>
                  <img src={av.path} alt={av.name} className="w-full h-full object-cover"
                    onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
                  {isSel && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{background:`${glow}22`}}>
                      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:glow}}>
                        <Check size={10} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <p className={`text-[8px] font-semibold truncate w-full text-center`}
                  style={isSel?{color:glow}:{opacity:0.6}}>
                  {av.emoji} {av.name}
                </p>
              </button>
            );
          })}
        </div>
        <div className={`px-5 py-3 border-t ${t.div}`}>
          <p className={`text-[9px] text-center ${t.sSub}`}>Add custom avatars to <span className="font-mono">/public/avatars/</span></p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH PULSE — draggable floating mini-chat: calories + water + health tips
// Private — never in sidebar history · creator mode only
// Dragging: expanded panel is draggable, FAB stays fixed at bottom-right
// ─────────────────────────────────────────────────────────────────────────────
interface HPMsg { id: string; role: 'user'|'assistant'; text: string; ts: Date }

// Accurate India food calorie database (extended)
const FOOD_CAL: Record<string, number> = {
  // Breads
  'roti':60,'chapati':60,'phulka':55,'paratha':180,'stuffed paratha':250,'puri':120,
  'bhatura':200,'naan':270,'kulcha':220,'bread slice':70,'white bread':70,
  // Rice
  'rice':130,'cooked rice':130,'steamed rice':130,'jeera rice':180,'biryani':380,
  'pulao':200,'fried rice':250,'khichdi':180,'dal khichdi':200,
  // Lentils / Dal
  'dal':120,'dal tadka':150,'dal fry':160,'dal makhani':200,'rajma':180,
  'chole':200,'chana masala':200,'moong dal':110,'masoor dal':120,'sambar':80,
  // Vegetables
  'sabzi':100,'paneer':260,'paneer butter masala':320,'palak paneer':250,
  'aloo sabzi':150,'aloo gobi':120,'baingan bharta':100,'bhindi':80,
  'mixed veg':100,'kadhi':120,'mutter paneer':280,
  // Snacks
  'samosa':262,'kachori':200,'pakora':180,'bhajiya':180,'vada':180,
  'vada pav':280,'pav bhaji':400,'misal pav':350,
  'namkeen':120,'biscuit':50,'glucose biscuit':50,'marie biscuit':40,
  // Drinks
  'chai':60,'tea with milk':60,'milk':150,'coffee':80,'lassi':180,
  'nimbu pani':45,'juice':120,'cold drink':140,'coke':140,'pepsi':140,
  'protein shake':200,'buttermilk':40,'chaas':40,
  // Eggs / Meat
  'egg':78,'boiled egg':78,'omelette':150,'scrambled egg':170,'fried egg':120,
  'chicken':200,'chicken breast':165,'chicken curry':250,'mutton':280,
  'fish curry':200,'fish fry':230,
  // Fruits
  'banana':89,'apple':95,'mango':60,'orange':62,'papaya':43,'guava':68,
  'grapes':70,'watermelon':30,'pomegranate':83,
  // Sweets
  'gulab jamun':175,'rasgulla':130,'kheer':180,'halwa':250,'ladoo':150,
  'barfi':200,'jalebi':150,'gajar halwa':250,'ice cream':200,
  // Fast food
  'pizza slice':285,'burger':350,'sandwich':300,'maggi':350,'pasta':350,
  'momos':200,'dumplings':200,
  // Common quantities
  'plate':1,'bowl':1,
};

function estimateHP(text: string): { calories: number; water: number; items: string[] } {
  const lower = text.toLowerCase();
  let calories = 0;
  let water = 0;
  const items: string[] = [];

  // Water detection
  const waterPatterns = [
    /(\d+)\s*glass(?:es)?\s*(?:of\s*)?water/i,
    /water\s*[—\-:]?\s*(\d+)\s*glass/i,
    /drank\s*(\d+)\s*glass/i,
    /had\s*(\d+)\s*glass/i,
  ];
  for (const p of waterPatterns) {
    const m = lower.match(p);
    if (m) { water = parseInt(m[1]); break; }
  }
  if (!water && (lower.includes('a glass') || lower.includes('one glass') || lower.includes('1 glass'))) water = 1;
  if (!water && (lower.includes('2 glass') || lower.includes('two glass'))) water = 2;
  if (lower.includes('water bottle') || lower.includes('water botl')) water = (water || 0) + 2;

  // Food parsing — handle "qty × item" patterns
  const segments = text.split(/,|and|\+|with/i);
  for (const seg of segments) {
    const s = seg.trim().toLowerCase();
    if (!s) continue;

    // Pattern: "N roti", "N × samosa", "2 plate rice"
    const qtyMatch = s.match(/^(\d+(?:\.\d+)?)\s*[x×]?\s*(.+)/);
    const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
    const food = (qtyMatch ? qtyMatch[2] : s).trim().replace(/^of\s+/, '');

    // Try exact match first, then partial
    let cal = 0;
    let matched = '';
    for (const [key, val] of Object.entries(FOOD_CAL)) {
      if (food === key || food.includes(key) || key.includes(food)) {
        if (!matched || key.length > matched.length) { cal = val; matched = key; }
      }
    }
    if (cal > 0) {
      const total = Math.round(cal * qty);
      calories += total;
      items.push(`${qty > 1 ? qty + '× ' : ''}${matched} (${total} cal)`);
    }
  }

  return { calories, water, items };
}

function HealthPulse({ glow, isLight, hidden, onSync, inDock }: { glow: string; isLight: boolean; hidden?: boolean; onSync?: () => void; inDock?: boolean }) {
  const [open,    setOpen]    = useState(false);
  const [msgs,    setMsgs]    = useState<HPMsg[]>([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [cals,    setCals]    = useState(0);
  const [water,   setWater]   = useState(0);

  // Draggable panel position
  const [pos,     setPos]     = useState<{x:number;y:number}|null>(null);
  const dragging  = useRef(false);
  const dragStart = useRef({mx:0,my:0,px:0,py:0});
  const panelRef  = useRef<HTMLDivElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Sync from localStorage on open
  useEffect(() => {
    if (!open) return;
    try {
      const h = JSON.parse(localStorage.getItem('tessa-health') || '{}');
      const today = new Date().toISOString().split('T')[0];
      if (h.date === today) setCals(h.totalCalories || 0);
      // Water from wellness
      const w = JSON.parse(localStorage.getItem('tessa-wellness') || '{}');
      if (w.date === today) setWater(w.water || 0);
    } catch {}
    if (msgs.length === 0) {
      setMsgs([{
        id: 'init', role: 'assistant',
        text: `Hey! 🌱 **Health Pulse** here.\nLog meals → I'll track calories. Log water → I'll update your intake. Ask health/study tips too. What's up?`,
        ts: new Date(),
      }]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  // Drag handlers — GPU-accelerated via direct DOM transform mutation (60fps)
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,input')) return;
    dragging.current = true;
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      px: pos?.x ?? (window.innerWidth - 356),
      py: pos?.y ?? (window.innerHeight - 500),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current || !panelRef.current) return;
    const nx = Math.max(8, Math.min(window.innerWidth - 348, dragStart.current.px + e.clientX - dragStart.current.mx));
    const ny = Math.max(8, Math.min(window.innerHeight - 448, dragStart.current.py + e.clientY - dragStart.current.my));
    // Direct DOM write — no setState during drag = buttery 60fps
    panelRef.current.style.left   = `${nx}px`;
    panelRef.current.style.top    = `${ny}px`;
    panelRef.current.style.bottom = 'unset';
    panelRef.current.style.right  = 'unset';
  };
  const onDragEnd = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const nx = Math.max(8, Math.min(window.innerWidth - 348, dragStart.current.px + e.clientX - dragStart.current.mx));
    const ny = Math.max(8, Math.min(window.innerHeight - 448, dragStart.current.py + e.clientY - dragStart.current.my));
    setPos({ x: nx, y: ny }); // commit position to React state
    if (panelRef.current) panelRef.current.style.transition = '';
  };

  const HEALTH_SYSTEM = `You are Tessa's Health Pulse — a compact health tracker.
Focus: calorie logging and water tracking for Ankit (17, male, Delhi, Class 12 CBSE 2026).

CALORIE LOGGING — CRITICAL RULES:
- The [CURRENT STATE] block shows calories ALREADY logged today
- **TOTAL: X cal** must contain ONLY the calories of the NEW food the user just mentioned
- NEVER include the existing logged calories in **TOTAL: X cal**
- Show the running sum in your text, but the tag is new-meal-only
- Example: user already has 670 cal logged, eats rice bowl (130 cal):
  Reply: "Rice bowl (130 cal) added! 670 + 130 = **800 cal** today 🍚  **TOTAL: 130 cal**"
- Multi-item meal: "Roti×2 (120) + dal (120) = 240 cal  **TOTAL: 240 cal**"
- Use India-specific portions: roti=60cal, dal=120cal, rice bowl=130cal, samosa=262cal, chai=45cal

WATER LOGGING:
- When user drinks water: **WATER: X glasses** (new glasses only, not cumulative)
- "a bottle" = 2 glasses

HEALTH TIPS: India-specific, exam-focused, max 3 lines

STRICT: Be short. No fluff. Non-health topics: "Use main Tessa chat for that!"`;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: HPMsg = { id: uuidv4(), role: 'user', text, ts: new Date() };
    setMsgs(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    // Build live health context for the AI
    let healthCtx = '';
    try {
      const h = JSON.parse(localStorage.getItem('tessa-health') || '{}');
      const w = JSON.parse(localStorage.getItem('tessa-wellness') || '{}');
      const today = new Date().toISOString().split('T')[0];
      const curCal = h.date === today ? (h.totalCalories || 0) : 0;
      const curWater = w.date === today ? (w.water || 0) : 0;
      healthCtx = `\n\n[CURRENT STATE — already logged today, DO NOT include in TOTAL tag]\nCalories already logged: ${curCal} cal (out of 2200)\nWater already logged: ${curWater} glasses (goal ${w.waterGoal||8})\nUser stats: ${h.weight||'?'}kg · ${h.height||'?'}cm`;
    } catch {}

    try {
      const history = msgs.slice(-6).map(m => ({ role: m.role, content: m.text }));
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: text + healthCtx }],
          isCreatorMode: false, maxTokens: 220,
          _systemOverride: HEALTH_SYSTEM,
        }),
      });
      const data = await res.json();
      const reply = data.content || 'Network error — try again.';
      setMsgs(p => [...p, { id: uuidv4(), role: 'assistant', text: reply, ts: new Date() }]);

      // Parse TOTAL: X cal → update health localStorage + wellness
      const calMatch = reply.match(/\*\*TOTAL:\s*(\d+)\s*cal\*\*/i);
      if (calMatch) {
        const added = parseInt(calMatch[1]);
        try {
          const h = JSON.parse(localStorage.getItem('tessa-health') || '{}');
          const today = new Date().toISOString().split('T')[0];
          if (h.date !== today) { h.date = today; h.totalCalories = 0; h.meals = []; }
          h.totalCalories = (h.totalCalories || 0) + added;
          h.meals = [...(h.meals || []), {
            time: new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'}),
            meal: text, calories: added, confidence: 'high',
          }];
          localStorage.setItem('tessa-health', JSON.stringify(h));
          setCals(h.totalCalories);
          // Also sync to wellness
          const w = JSON.parse(localStorage.getItem('tessa-wellness') || '{}');
          if (w.date !== today) { w.date = today; w.calories = 0; }
          w.calories = (w.calories || 0) + added;
          localStorage.setItem('tessa-wellness', JSON.stringify(w));
          onSync?.();
        } catch {}
      }

      // Parse WATER: X glasses → update wellness localStorage
      const waterMatch = reply.match(/\*\*WATER:\s*(\d+)\s*glasses?\*\*/i);
      if (waterMatch) {
        const added = parseInt(waterMatch[1]);
        try {
          const w = JSON.parse(localStorage.getItem('tessa-wellness') || '{}');
          const today = new Date().toISOString().split('T')[0];
          if (w.date !== today) { w.date = today; w.water = 0; w.waterGoal = 8; }
          w.water = Math.min((w.water || 0) + added, (w.waterGoal || 8) + 4);
          localStorage.setItem('tessa-wellness', JSON.stringify(w));
          setWater(w.water);
          onSync?.();
        } catch {}
      }
    } catch {
      setMsgs(p => [...p, { id: uuidv4(), role: 'assistant', text: 'Network hiccup — try again!', ts: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const calPct = Math.min(100, Math.round((cals / 2200) * 100));
  const calColor = calPct > 90 ? '#ef4444' : calPct > 65 ? '#f97316' : '#22c55e';
  const waterPct = Math.min(100, Math.round((water / 8) * 100));

  // Panel position — draggable or default bottom-right
  const panelStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y, zIndex: 59 }
    : { position: 'fixed', bottom: 160, right: 16, zIndex: 59 };

  if (hidden) return null;

  return (
    <>
      {/* ── FAB — dock-aware position ── */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90"
        style={{
          position: inDock ? 'relative' : 'fixed',
          ...(inDock ? {} : { bottom: 88, right: 16 }),
          background: open ? glow : `linear-gradient(135deg, ${glow}, ${glow}cc)`,
          boxShadow: `0 4px 20px ${glow}50`,
          border: `1.5px solid ${glow}60`,
        }}
        title="Health Pulse"
      >
        {open ? <X size={18} className="text-white" /> : <Salad size={18} className="text-white" />}
        {!open && (cals > 0 || water > 0) && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white"
            style={{ background: calColor, fontSize: 7, fontWeight: 900 }}>
            {calPct}%
          </span>
        )}
      </button>

      {/* ── Expanded panel — draggable ── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            ...panelStyle,
            width: 'min(340px, calc(100vw - 32px))',
            height: 440,
            background: isLight ? '#ffffff' : '#0d0f1e',
            border: `1px solid ${glow}30`,
            boxShadow: `0 8px 40px rgba(0,0,0,0.35), 0 0 30px ${glow}15`,
            borderRadius: 20,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUpSheet 0.25s cubic-bezier(0.32,0.72,0,1)',
            touchAction: 'none',
            willChange: 'transform',
            userSelect: 'none',
          }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {/* Drag handle */}
          <div className="flex-shrink-0 flex justify-center items-center gap-2 pt-2.5 pb-1.5 cursor-grab active:cursor-grabbing select-none"
            style={{ borderBottom: `1px solid ${glow}12` }}>
            <div className="w-8 h-1 rounded-full" style={{ background: `${glow}35` }}/>
            <span className="text-[8px] font-semibold" style={{ color: isLight?'#9ca3af':'rgba(255,255,255,0.28)' }}>drag</span>
            <div className="w-8 h-1 rounded-full" style={{ background: `${glow}35` }}/>
          </div>

          {/* Header with dual ring: calories + water */}
          <div className="flex-shrink-0 flex items-center justify-between px-3.5 py-2.5"
            style={{ background: `linear-gradient(135deg, ${glow}10, ${glow}05)` }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: glow }}>
                <Salad size={13} className="text-white" />
              </div>
              <div>
                <p className="text-[12px] font-black" style={{ color: glow }}>Health Pulse</p>
                <p className="text-[9px]" style={{ color: isLight ? '#6b7280' : 'rgba(255,255,255,0.4)' }}>private · not in history</p>
              </div>
            </div>
            {/* Calorie + water rings */}
            <div className="flex items-center gap-3">
              {/* Calorie ring */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="relative w-9 h-9">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke={isLight?'#e5e7eb':'rgba(255,255,255,0.1)'} strokeWidth="3"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke={calColor} strokeWidth="3"
                      strokeDasharray={`${calPct * 0.879} 87.9`} strokeLinecap="round"/>
                  </svg>
                  <Flame size={9} className="absolute inset-0 m-auto" style={{ color: calColor }} />
                </div>
                <span className="text-[8px] font-bold" style={{ color: calColor }}>{cals} cal</span>
              </div>
              {/* Water ring */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="relative w-9 h-9">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke={isLight?'#e5e7eb':'rgba(255,255,255,0.1)'} strokeWidth="3"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="3"
                      strokeDasharray={`${waterPct * 0.879} 87.9`} strokeLinecap="round"/>
                  </svg>
                  <Droplets size={9} className="absolute inset-0 m-auto" style={{ color: '#3b82f6' }} />
                </div>
                <span className="text-[8px] font-bold" style={{ color: '#3b82f6' }}>{water}/8</span>
              </div>
            </div>
          </div>

          {/* Quick chips */}
          <div className="flex-shrink-0 flex gap-1.5 px-3 py-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {['Log meal', '1 glass water', 'Exam energy', 'Sleep tips', 'Water bottle'].map(chip => (
              <button key={chip} onClick={() => { setInput(chip); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-semibold whitespace-nowrap active:scale-95"
                style={{ background: `${glow}12`, border: `1px solid ${glow}22`, color: glow }}>
                {chip}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-1 space-y-2" style={{ scrollbarWidth: 'thin' }}>
            {msgs.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%] rounded-xl px-3 py-2 text-[11px] leading-relaxed"
                  style={{
                    background: m.role === 'user'
                      ? `linear-gradient(135deg, ${glow}22, ${glow}12)`
                      : isLight ? '#f9fafb' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${m.role==='user' ? glow+'30' : isLight?'#e5e7eb':'rgba(255,255,255,0.08)'}`,
                    color: isLight ? '#1e293b' : 'rgba(255,255,255,0.88)',
                  }}>
                  {m.text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i} style={{ color: part.includes('WATER') ? '#3b82f6' : glow }}>{part.slice(2,-2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3 py-2 flex items-center gap-1"
                  style={{ background: isLight?'#f3f4f6':'rgba(255,255,255,0.06)', border:`1px solid ${isLight?'#e5e7eb':'rgba(255,255,255,0.08)'}` }}>
                  {[0,150,300].map(d => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: glow, animationDelay:`${d}ms` }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5"
            style={{ borderTop: `1px solid ${glow}12` }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==='Enter' && send()}
              placeholder="2 rotis + dal · 2 glasses water…"
              className="flex-1 text-[11px] px-3 py-2 rounded-xl outline-none"
              style={{
                background: isLight?'#f9fafb':'rgba(255,255,255,0.06)',
                border: `1px solid ${glow}25`,
                color: isLight?'#1e293b':'rgba(255,255,255,0.88)',
              }}
            />
            <button onClick={send} disabled={!input.trim()||loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-90 disabled:opacity-40"
              style={{ background: glow }}>
              <Send size={13} className="text-white"/>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// SETTINGS BOTTOM SHEET — slides up from bottom, not left sidebar
// Left pill-nav + right scrollable content
// ─────────────────────────────────────────────────────────────────────────────
type SettingsSection = 'appearance' | 'ai' | 'chat' | 'data' | 'about';




// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// TESSA SPORTS — Cricbuzz-style live scores browser (2025-2026 data)
// ─────────────────────────────────────────────────────────────────────────────
type SportTab = 'cricket' | 'football' | 'tennis' | 'f1' | 'basketball' | 'other';
const SPORT_TABS2: { id: SportTab; emoji: string; label: string }[] = [
  { id: 'cricket',    emoji: '🏏', label: 'Cricket'    },
  { id: 'football',   emoji: '⚽', label: 'Football'   },
  { id: 'tennis',     emoji: '🎾', label: 'Tennis'     },
  { id: 'f1',         emoji: '🏎️', label: 'F1'         },
  { id: 'basketball', emoji: '🏀', label: 'NBA'        },
  { id: 'other',      emoji: '🏆', label: 'More'       },
];
const SPORT_SUGG: Record<SportTab, string[]> = {
  cricket: [
    'India vs England 2026 live score',
    'IPL 2026 today match scorecard',
    'ICC Champions Trophy 2025 result',
    'India batting score now',
    'Test match today scorecard',
    'Pakistan vs Australia live',
    'IPL points table 2026',
    'T20 World Cup 2026 score',
    'MI vs CSK live 2026',
    'Rohit Sharma score today',
    'Virat Kohli runs today',
    'India vs New Zealand ODI',
    'England vs Australia Ashes 2025',
    'India T20 score today',
    'ICC rankings 2026 batsmen',
  ],
  football: [
    'Premier League scores today 2025',
    'Man City vs Arsenal live',
    'Champions League 2025 result',
    'La Liga scores this week',
    'Liverpool vs Chelsea score',
    'FIFA World Cup 2026 qualifier',
    'Bundesliga results today',
    'Serie A live score now',
    'Real Madrid vs Barcelona 2025',
    'Europa League result today',
    'Premier League standings 2025',
    'PSG vs Man United score',
    'Arsenal latest score today',
    'Ligue 1 standings 2025',
  ],
  tennis: [
    'Australian Open 2026 live score',
    'Wimbledon 2025 final result',
    'US Open 2025 score today',
    'ATP rankings 2026',
    'Sinner vs Djokovic score',
    'Alcaraz match today result',
    'French Open 2025 winner',
    'WTA rankings 2026 today',
    'Davis Cup 2025 score',
    'Medvedev match result today',
    'Nadal comeback 2026',
    'Australian Open draw 2026',
  ],
  f1: [
    'F1 2026 season race result',
    'F1 Abu Dhabi GP 2025 result',
    'Verstappen championship 2025',
    'F1 drivers standings 2026',
    'McLaren race result today',
    'Ferrari F1 2025 result',
    'Hamilton Mercedes 2026',
    'F1 qualifying result today',
    'Norris race result 2025',
    'F1 constructors standings 2026',
    'Monaco GP 2026 race result',
    'British GP 2025 winner',
  ],
  basketball: [
    'NBA Finals 2025 score',
    'NBA live score tonight',
    'Lakers vs Warriors 2025',
    'LeBron James stats today',
    'NBA playoffs 2025 result',
    'Stephen Curry game score',
    'Celtics vs Heat score 2025',
    'NBA standings 2025-26',
    'Giannis game result today',
    'NBA MVP 2025 winner',
    'Eastern Conference standings',
    'Western Conference standings',
  ],
  other: [
    'Hockey World Cup 2026 score',
    'Pro Kabaddi League 2025 score',
    'Olympic Paris 2024 final results',
    'Badminton Thomas Cup 2026',
    'ISL football score today',
    'UFC fight result this week',
    'Golf Masters 2025 winner',
    'Boxing result today 2025',
    'WWE SmackDown result',
    'Kho Kho World Cup 2025',
  ],
};

const SPORTS_SYSTEM = `You are Tessa Sports. Today is ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}.

CRITICAL: Always use web search. Return ONLY a valid JSON array, no other text.
Output format — array of match cards:
[
  {
    "sport": "cricket",
    "status": "live|completed|upcoming",
    "title": "IND vs ENG · 3rd ODI",
    "venue": "Wankhede Stadium, Mumbai",
    "date": "Mar 1, 2026",
    "team1": { "name": "India", "flag": "🇮🇳", "score": "287/6", "overs": "48.2", "batting": true },
    "team2": { "name": "England", "flag": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "score": "245/8", "overs": "50.0", "batting": false },
    "summary": "India leads by 42 runs · 10 balls left",
    "result": "India won by 42 runs",
    "topBat": "Rohit 87(64)",
    "topBowl": "Bumrah 3/28",
    "innings": [
      { "team": "India", "score": "287/6", "overs": "50", "batsmen": [{"name":"Rohit","runs":"87","balls":"64","fours":"9","sixes":"2","sr":"135.9"},{"name":"Shubman","runs":"64","balls":"71","fours":"6","sixes":"1","sr":"90.1"}], "bowlers": [{"name":"Archer","overs":"10","runs":"52","wickets":"2","econ":"5.2"},{"name":"Wood","overs":"10","runs":"61","wickets":"1","econ":"6.1"}] },
      { "team": "England", "score": "245/8", "overs": "50", "batsmen": [{"name":"Root","runs":"72","balls":"88","fours":"7","sixes":"0","sr":"81.8"}], "bowlers": [{"name":"Bumrah","overs":"10","runs":"28","wickets":"3","econ":"2.8"},{"name":"Shami","overs":"10","runs":"45","wickets":"2","econ":"4.5"}] }
    ]
  }
]

RULES:
- status must be exactly "live", "completed", or "upcoming"
- For upcoming: omit scores, add "time": "10:00 AM IST"
- For football/tennis/F1: use goals/sets/points instead of cricket fields — keep same JSON structure but adapt
- Include real innings data with at least 2 batsmen and 2 bowlers per innings when available
- Return 1-4 matches maximum
- ONLY return the JSON array, no markdown, no explanation`;

function SportsBrowser({ glow, isLight, hidden, inDock }: { glow: string; isLight: boolean; hidden?: boolean; inDock?: boolean }) {
  const [open,        setOpen]        = useState(false);
  const [tab,         setTab]         = useState<SportTab>('cricket');
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSug,     setShowSug]     = useState(false);
  const [results,     setResults]     = useState('');
  const [loading,     setLoading]     = useState(false);
  const [pos,         setPos]         = useState<{x:number;y:number}|null>(null);
  const [expandedCard,setExpandedCard]= useState(-1);
  const dragging    = useRef(false);
  const dragStart   = useRef({mx:0,my:0,px:0,py:0});
  const panelRef    = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const debRef      = useRef<ReturnType<typeof setTimeout>|null>(null);

  const bg    = isLight ? '#ffffff'  : '#0d1117';
  const hdr   = isLight ? '#f8fafc'  : '#161b22';
  const card  = isLight ? '#f1f5f9'  : '#1c2333';
  const text  = isLight ? '#1e293b'  : '#e6edf3';
  const sub   = isLight ? '#64748b'  : '#8b949e';
  const brd   = isLight ? '#e2e8f0'  : '#30363d';
  const sugBg = isLight ? '#ffffff'  : '#1c2333';

  // GPU drag
  const onDragStart = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button,input')) return;
    dragging.current = true;
    dragStart.current = {
      mx: e.clientX, my: e.clientY,
      px: pos?.x ?? Math.max(8, window.innerWidth / 2 - 195),
      py: pos?.y ?? 60,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (panelRef.current) panelRef.current.style.transition = 'none';
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragging.current || !panelRef.current) return;
    const nx = Math.max(8, Math.min(window.innerWidth - 398, dragStart.current.px + e.clientX - dragStart.current.mx));
    const ny = Math.max(8, Math.min(window.innerHeight - 560, dragStart.current.py + e.clientY - dragStart.current.my));
    panelRef.current.style.left   = `${nx}px`;
    panelRef.current.style.top    = `${ny}px`;
    panelRef.current.style.bottom = 'unset';
    panelRef.current.style.right  = 'unset';
  };
  const onDragEnd = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    const nx = Math.max(8, Math.min(window.innerWidth - 398, dragStart.current.px + e.clientX - dragStart.current.mx));
    const ny = Math.max(8, Math.min(window.innerHeight - 560, dragStart.current.py + e.clientY - dragStart.current.my));
    setPos({ x: nx, y: ny });
    if (panelRef.current) panelRef.current.style.transition = '';
  };

  const onQueryChange = (val: string) => {
    setQuery(val);
    if (debRef.current) clearTimeout(debRef.current);
    const trimmed = val.trim();
    if (trimmed.length < 2) { setSuggestions([]); setShowSug(false); return; }
    const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = SPORT_SUGG[tab]
      .filter(s => words.every(w => s.toLowerCase().includes(w)))
      .slice(0, 8);
    setSuggestions(filtered);
    setShowSug(filtered.length > 0);
    if (trimmed.length > 5) {
      debRef.current = setTimeout(() => search(trimmed), 1000);
    }
  };

  const search = async (q: string) => {
    const clean = q.trim();
    if (!clean || loading) return;
    setShowSug(false);
    setLoading(true); setResults('');
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          messages:[{ role:'user', content:`Search for and show scores/results for: ${clean}. Include 2025 or 2026 data.` }],
          isCreatorMode:false, maxTokens:700,
          _systemOverride: SPORTS_SYSTEM,
          useWebSearch:true,
        }),
      });
      const data = await res.json();
      setResults(data.content || 'No data found. Try being more specific, e.g. "India vs England 2026".');
    } catch {
      setResults('Connection error. Check internet and try again.');
    } finally { setLoading(false); }
  };

  const pick = (s: string) => { setQuery(s); setSuggestions([]); setShowSug(false); search(s); };
  const switchTab = (t: SportTab) => {
    setTab(t); setResults(''); setQuery(''); setSuggestions([]); setShowSug(false); setExpandedCard(-1);
    // Auto-load major live/recent matches for this sport
    const autoQ: Record<SportTab,string> = {
      cricket: 'major cricket matches live and recent today 2026',
      football: 'major football matches live and recent today 2026',
      tennis: 'major tennis matches live and recent today 2026',
      f1: 'latest Formula 1 race result and standings 2026',
      basketball: 'NBA games live and recent today 2026',
      other: 'major live sports scores today 2026',
    };
    setTimeout(() => search(autoQ[t]), 50);
  };

  // Render structured score cards from JSON
  const renderResults = () => {
    if (!results) return null;
    let matches: any[] = [];
    try {
      // Strip markdown fences if present
      const clean = results.replace(/```json|```/g,'').trim();
      const parsed = JSON.parse(clean);
      matches = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Fallback: plain text display
      return (
        <div style={{ fontSize:12, color:text, lineHeight:1.7, whiteSpace:'pre-wrap', userSelect:'text', padding:'4px 0' }}>
          {results}
        </div>
      );
    }

    const statusColor = (s:string) => s==='live' ? '#22c55e' : s==='completed' ? '#60a5fa' : '#f59e0b';
    const statusLabel = (s:string) => s==='live' ? '🔴 LIVE' : s==='completed' ? '✅ Final' : '🕐 Upcoming';
    const cardBg  = isLight ? '#f8fafc' : '#161b22';
    const rowBg   = isLight ? '#f1f5f9' : '#1c2333';
    const divCol  = isLight ? '#e2e8f0' : '#30363d';
    const dimText = isLight ? '#64748b' : '#8b949e';
    const boldText= isLight ? '#1e293b' : '#e6edf3';

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {matches.map((m:any, mi:number) => {
          const [showCard, setShowCard] = [expandedCard===mi, (v:boolean)=>setExpandedCard(v?mi:-1)];
          return (
            <div key={mi} style={{ background:cardBg, borderRadius:14, overflow:'hidden',
              border:`1px solid ${divCol}`, boxShadow:`0 2px 8px rgba(0,0,0,0.08)` }}>

              {/* Match header */}
              <div style={{ background:`linear-gradient(135deg,${glow}14,${glow}06)`,
                padding:'10px 13px 8px', borderBottom:`1px solid ${divCol}` }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <p style={{ fontSize:13, fontWeight:800, color:boldText, margin:0, lineHeight:1.3 }}>{m.title||'Match'}</p>
                    <p style={{ fontSize:10, color:dimText, margin:'2px 0 0' }}>
                      {m.venue && <span>📍 {m.venue}</span>}
                      {m.date && <span style={{marginLeft:6}}>📅 {m.date}</span>}
                    </p>
                  </div>
                  <span style={{ fontSize:10, fontWeight:700, color:statusColor(m.status),
                    background:`${statusColor(m.status)}18`, border:`1px solid ${statusColor(m.status)}40`,
                    padding:'3px 8px', borderRadius:6, flexShrink:0, marginLeft:8 }}>
                    {statusLabel(m.status)}
                  </span>
                </div>
              </div>

              {/* Score rows */}
              <div style={{ padding:'10px 13px' }}>
                {/* Team 1 */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 10px', borderRadius:10, marginBottom:6,
                  background: m.team1?.batting ? `${glow}0e` : rowBg,
                  border: m.team1?.batting ? `1px solid ${glow}30` : `1px solid transparent` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:18, lineHeight:1 }}>{m.team1?.flag||'🏳'}</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:boldText, margin:0 }}>{m.team1?.name||'Team 1'}</p>
                      {m.team1?.batting && <p style={{ fontSize:9, color:glow, margin:0, fontWeight:600 }}>● Batting</p>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:16, fontWeight:900, color:boldText, margin:0, fontFamily:'monospace' }}>
                      {m.team1?.score||m.status==='upcoming'?m.team1?.score||'—':'TBD'}
                    </p>
                    {m.team1?.overs && <p style={{ fontSize:10, color:dimText, margin:0 }}>({m.team1.overs} ov)</p>}
                  </div>
                </div>
                {/* vs divider */}
                <div style={{ display:'flex', alignItems:'center', gap:8, margin:'4px 0' }}>
                  <div style={{ flex:1, height:1, background:divCol }}/>
                  <span style={{ fontSize:10, color:dimText, fontWeight:700 }}>vs</span>
                  <div style={{ flex:1, height:1, background:divCol }}/>
                </div>
                {/* Team 2 */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'8px 10px', borderRadius:10, marginTop:6,
                  background: m.team2?.batting ? `${glow}0e` : rowBg,
                  border: m.team2?.batting ? `1px solid ${glow}30` : `1px solid transparent` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:18, lineHeight:1 }}>{m.team2?.flag||'🏳'}</span>
                    <div>
                      <p style={{ fontSize:12, fontWeight:700, color:boldText, margin:0 }}>{m.team2?.name||'Team 2'}</p>
                      {m.team2?.batting && <p style={{ fontSize:9, color:glow, margin:0, fontWeight:600 }}>● Batting</p>}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <p style={{ fontSize:16, fontWeight:900, color:boldText, margin:0, fontFamily:'monospace' }}>
                      {m.team2?.score||m.status==='upcoming'?m.team2?.score||'—':'TBD'}
                    </p>
                    {m.team2?.overs && <p style={{ fontSize:10, color:dimText, margin:0 }}>({m.team2.overs} ov)</p>}
                  </div>
                </div>
              </div>

              {/* Summary / result bar */}
              {(m.summary||m.result||m.time) && (
                <div style={{ padding:'7px 13px', borderTop:`1px solid ${divCol}`,
                  background: m.status==='live'?`#22c55e0a`:m.status==='completed'?`${glow}08`:`#f59e0b0a` }}>
                  <p style={{ fontSize:11, fontWeight:600, margin:0,
                    color: m.status==='live'?'#22c55e':m.status==='completed'?glow:'#f59e0b' }}>
                    {m.result||m.summary||m.time}
                  </p>
                </div>
              )}

              {/* Key performers */}
              {(m.topBat||m.topBowl) && (
                <div style={{ display:'flex', gap:8, padding:'6px 13px 8px',
                  borderTop:`1px solid ${divCol}` }}>
                  {m.topBat  && <span style={{ fontSize:10, color:dimText, background:rowBg, padding:'3px 8px', borderRadius:6 }}>🏏 {m.topBat}</span>}
                  {m.topBowl && <span style={{ fontSize:10, color:dimText, background:rowBg, padding:'3px 8px', borderRadius:6 }}>⚡ {m.topBowl}</span>}
                </div>
              )}

              {/* Scorecard expand toggle */}
              {m.innings && m.innings.length > 0 && (
                <>
                  <button onClick={()=>setShowCard(!showCard)}
                    style={{ width:'100%', padding:'7px 13px', borderTop:`1px solid ${divCol}`,
                      background:'transparent', border:'none', cursor:'pointer', textAlign:'left',
                      display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10.5, fontWeight:600, color:glow }}>
                      {showCard ? '▲ Hide scorecard' : '▼ Full scorecard'}
                    </span>
                    <span style={{ fontSize:9, color:dimText }}>Batting · Bowling</span>
                  </button>

                  {showCard && (
                    <div style={{ borderTop:`1px solid ${divCol}` }}>
                      {(m.innings||[]).map((inn:any, ii:number) => (
                        <div key={ii} style={{ padding:'10px 13px', borderBottom:ii<(m.innings.length-1)?`1px solid ${divCol}`:'none' }}>
                          <p style={{ fontSize:11, fontWeight:800, color:glow, margin:'0 0 6px',
                            textTransform:'uppercase', letterSpacing:'0.05em' }}>
                            {inn.team} · {inn.score} ({inn.overs} ov)
                          </p>
                          {/* Batting table */}
                          {inn.batsmen && inn.batsmen.length > 0 && (
                            <div style={{ marginBottom:8 }}>
                              <p style={{ fontSize:9.5, fontWeight:700, color:dimText, margin:'0 0 4px', letterSpacing:'0.04em' }}>BATTING</p>
                              <div style={{ borderRadius:8, overflow:'hidden', border:`1px solid ${divCol}` }}>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 30px 30px 50px',
                                  padding:'4px 8px', background:rowBg }}>
                                  {['Batter','R','B','4s','6s','SR'].map(h=>(
                                    <p key={h} style={{ fontSize:9, fontWeight:700, color:dimText, margin:0, textAlign:h==='Batter'?'left':'right' }}>{h}</p>
                                  ))}
                                </div>
                                {inn.batsmen.map((b:any,bi:number)=>(
                                  <div key={bi} style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 30px 30px 50px',
                                    padding:'5px 8px', borderTop:`1px solid ${divCol}`, background:bi%2===0?'transparent':rowBg+'80' }}>
                                    <p style={{ fontSize:11, fontWeight:600, color:boldText, margin:0 }}>{b.name}</p>
                                    <p style={{ fontSize:11, fontWeight:800, color:boldText, margin:0, textAlign:'right' }}>{b.runs}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.balls}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.fours}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.sixes}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.sr}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Bowling table */}
                          {inn.bowlers && inn.bowlers.length > 0 && (
                            <div>
                              <p style={{ fontSize:9.5, fontWeight:700, color:dimText, margin:'0 0 4px', letterSpacing:'0.04em' }}>BOWLING</p>
                              <div style={{ borderRadius:8, overflow:'hidden', border:`1px solid ${divCol}` }}>
                                <div style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px',
                                  padding:'4px 8px', background:rowBg }}>
                                  {['Bowler','O','R','W','Econ'].map(h=>(
                                    <p key={h} style={{ fontSize:9, fontWeight:700, color:dimText, margin:0, textAlign:h==='Bowler'?'left':'right' }}>{h}</p>
                                  ))}
                                </div>
                                {inn.bowlers.map((b:any,bi:number)=>(
                                  <div key={bi} style={{ display:'grid', gridTemplateColumns:'1fr 40px 40px 40px 40px',
                                    padding:'5px 8px', borderTop:`1px solid ${divCol}`, background:bi%2===0?'transparent':rowBg+'80' }}>
                                    <p style={{ fontSize:11, fontWeight:600, color:boldText, margin:0 }}>{b.name}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.overs}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.runs}</p>
                                    <p style={{ fontSize:11, fontWeight:800, color:b.wickets>'0'?'#f87171':dimText, margin:0, textAlign:'right' }}>{b.wickets}</p>
                                    <p style={{ fontSize:10, color:dimText, margin:0, textAlign:'right' }}>{b.econ}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const panelStyle: React.CSSProperties = pos
    ? { position:'fixed', left:pos.x, top:pos.y, zIndex:58 }
    : { position:'fixed', top:60, left:'50%', transform:'translateX(-50%)', zIndex:58 };

  if (hidden) return null;
  return (
    <>
      {/* FAB */}
      <button onClick={() => {
        const wasOpen = open;
        setOpen(p=>!p);
        if (!wasOpen && !results) {
          setTimeout(() => search('major cricket matches live and recent today 2026'), 100);
        }
      }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all active:scale-90 hover:scale-105"
        style={{
          position: inDock ? 'relative' : 'fixed',
          ...(inDock ? {} : { bottom:88, right:64 }),
          background:`linear-gradient(135deg,${glow},${glow}cc)`,
          boxShadow:`0 4px 20px ${glow}50`, border:`1.5px solid ${glow}60`,
        }}
        title="Tessa Sports">
        {open ? <X size={18} className="text-white"/> : <Trophy size={18} className="text-white"/>}
      </button>

      {open && (
        <div ref={panelRef} style={{
          ...panelStyle,
          width:'min(395px,calc(100vw - 16px))',
          maxHeight:'calc(100vh - 80px)',
          background:bg,
          border:`1px solid ${brd}`,
          boxShadow:`0 16px 56px rgba(0,0,0,0.45), 0 0 0 1px ${glow}12`,
          borderRadius:16,
          overflow:'visible',
          display:'flex',
          flexDirection:'column',
          animation:'slideUpSheet 0.22s cubic-bezier(0.32,0.72,0,1)',
          touchAction:'none',
          userSelect:'none',
        }}
          onPointerDown={onDragStart} onPointerMove={onDragMove}
          onPointerUp={onDragEnd}    onPointerCancel={onDragEnd}
        >

          {/* ── Header — browser chrome ── */}
          <div style={{ flexShrink:0, background:`linear-gradient(135deg,${glow}20,${glow}06)`,
            borderRadius:'16px 16px 0 0', borderBottom:`1px solid ${brd}`, cursor:'grab' }}>

            {/* Title row */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px 8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:34, height:34, borderRadius:10,
                  background:`linear-gradient(135deg,${glow},${glow}aa)`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:`0 3px 10px ${glow}50` }}>
                  <Trophy size={16} className="text-white"/>
                </div>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ fontSize:15, fontWeight:900, color:glow, letterSpacing:'-0.03em' }}>Tessa Sports</span>

                  </div>
                  <span style={{ fontSize:9.5, color:sub }}>Scores · Standings · 2026</span>
                </div>
              </div>
              {/* macOS-style close */}
              <div style={{ display:'flex', gap:5 }}>
                <div style={{ width:11,height:11,borderRadius:'50%',background:'#fbbf24' }}/>
                <div style={{ width:11,height:11,borderRadius:'50%',background:'#34d399' }}/>
                <button onClick={()=>setOpen(false)}
                  style={{ width:11,height:11,borderRadius:'50%',background:'#ef4444',border:'none',cursor:'pointer' }}/>
              </div>
            </div>

            {/* Sport tabs */}
            <div style={{ display:'flex', gap:4, padding:'0 12px 10px', overflowX:'auto', scrollbarWidth:'none' }}>
              {SPORT_TABS2.map(s => (
                <button key={s.id} onClick={()=>switchTab(s.id)}
                  style={{ flexShrink:0, padding:'5px 12px', borderRadius:20,
                    fontSize:11, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
                    transition:'all 0.15s',
                    background: tab===s.id ? glow : 'transparent',
                    border: tab===s.id ? `1px solid ${glow}` : `1px solid ${brd}`,
                    color: tab===s.id ? 'white' : sub }}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Results ── */}
          <div style={{ flex:1, overflowY:'auto', padding:'12px 14px',
            minHeight:0, maxHeight:360,
            scrollbarWidth:'thin', scrollbarColor:`${glow}40 transparent` }}>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', minHeight:200, gap:14 }}>
                <div style={{ position:'relative', width:48, height:48 }}>
                  <div style={{ position:'absolute', inset:0, borderRadius:'50%',
                    border:`3px solid ${glow}20`, borderTopColor:glow,
                    animation:'spin 0.75s linear infinite' }}/>
                  <div style={{ position:'absolute', inset:7, borderRadius:'50%',
                    border:`2px solid ${glow}10`, borderTopColor:`${glow}70`,
                    animation:'spin 1.3s linear infinite reverse' }}/>
                  <div style={{ position:'absolute', inset:0, display:'flex',
                    alignItems:'center', justifyContent:'center' }}>
                    <Trophy size={16} style={{ color:glow }}/>
                  </div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:12, color:text, margin:'0 0 4px', fontWeight:600 }}>Fetching live scores…</p>
                  <p style={{ fontSize:10, color:sub, margin:0 }}>Searching web for 2025-2026 data</p>
                </div>
              </div>
            ) : results ? renderResults() : (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', minHeight:200, gap:12 }}>
                <div style={{ width:52, height:52, borderRadius:16, background:`${glow}15`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Trophy size={26} style={{ color:glow }}/>
                </div>
                <div style={{ textAlign:'center' }}>
                  <p style={{ fontSize:13, fontWeight:700, color:text, margin:'0 0 6px' }}>
                    {SPORT_TABS2.find(s=>s.id===tab)?.emoji} {SPORT_TABS2.find(s=>s.id===tab)?.label} Scores
                  </p>
                  <p style={{ fontSize:11, color:sub, margin:'0 0 12px', lineHeight:1.5 }}>
                    Tap a suggestion or search below
                  </p>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center', maxWidth:320 }}>
                  {SPORT_SUGG[tab].slice(0,6).map((s,i)=>(
                    <button key={i} onClick={()=>pick(s)}
                      style={{ padding:'5px 11px', borderRadius:10, fontSize:10.5, fontWeight:500,
                        border:`1px solid ${brd}`, background:card,
                        color:sub, cursor:'pointer', transition:'all 0.15s' }}
                      onMouseEnter={e=>{e.currentTarget.style.background=`${glow}18`;e.currentTarget.style.color=glow;}}
                      onMouseLeave={e=>{e.currentTarget.style.background=card;e.currentTarget.style.color=sub;}}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Search bar ── */}
          <div style={{ flexShrink:0, borderTop:`1px solid ${brd}`, background:hdr,
            borderRadius:'0 0 16px 16px', padding:'10px 12px', position:'relative' }}>

            {/* Dropdown suggestions */}
            {showSug && suggestions.length > 0 && (
              <div style={{ position:'absolute', left:12, right:12, bottom:'calc(100% - 4px)',
                background:sugBg, border:`1px solid ${brd}`, borderRadius:'10px 10px 0 0',
                overflow:'hidden', boxShadow:`0 -10px 28px rgba(0,0,0,0.2)`, zIndex:10 }}>
                {suggestions.map((s,i) => (
                  <button key={i} onClick={()=>pick(s)}
                    style={{ display:'flex', alignItems:'center', gap:8, width:'100%',
                      textAlign:'left', padding:'8px 12px', fontSize:11.5, color:text,
                      background:'transparent', border:'none',
                      borderBottom:i<suggestions.length-1?`1px solid ${brd}`:'none',
                      cursor:'pointer', transition:'background 0.1s' }}
                    onMouseEnter={e=>e.currentTarget.style.background=`${glow}12`}
                    onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                    <span style={{ fontSize:14 }}>{SPORT_TABS2.find(t=>t.id===tab)?.emoji}</span>
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <input ref={inputRef} value={query}
                onChange={e=>onQueryChange(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==='Enter'){search(query);setShowSug(false);}
                  if(e.key==='Escape') setShowSug(false);
                  e.stopPropagation();
                }}
                onFocus={()=>query.length>1&&setShowSug(suggestions.length>0)}
                onBlur={()=>setTimeout(()=>setShowSug(false),200)}
                placeholder={`Search ${SPORT_TABS2.find(s=>s.id===tab)?.label} scores 2025-26…`}
                style={{ flex:1, padding:'9px 13px', borderRadius:10, fontSize:12,
                  border:`1.5px solid ${brd}`, background:isLight?'white':card,
                  color:text, outline:'none', transition:'border-color 0.2s' }}
                onFocusCapture={e=>e.currentTarget.style.borderColor=glow}
                onBlurCapture={e=>e.currentTarget.style.borderColor=brd}
              />
              <button onClick={()=>{search(query);setShowSug(false);}}
                style={{ width:38, height:38, borderRadius:10, border:'none',
                  background:loading?`${glow}60`:glow, cursor:loading?'not-allowed':'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0, boxShadow:`0 2px 8px ${glow}40`, transition:'all 0.15s' }}>
                {loading
                  ? <RefreshCw size={15} className="text-white" style={{animation:'spin 0.8s linear infinite'}}/>
                  : <Radio size={15} className="text-white"/>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}



// ─────────────────────────────────────────────────────────────────────────────
// FLOATING DOCK — unified bottom-right pill housing Health + Sports FABs
// ─────────────────────────────────────────────────────────────────────────────
function FloatingDock({ glow, isLight, showHealth, hidden, onHealthSync }:
  { glow:string; isLight:boolean; showHealth:boolean; hidden?:boolean; onHealthSync?:()=>void }) {
  if (hidden) return null;
  const dockBg  = isLight ? 'rgba(255,255,255,0.92)' : 'rgba(13,15,30,0.92)';
  const dockBdr = isLight ? `${glow}30` : `${glow}35`;
  return (
    <div style={{
      position:'fixed', bottom:24, right:16, zIndex:60,
      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
    }}>
      {/* Tessa Sports button */}
      <SportsBrowser glow={glow} isLight={isLight} hidden={false} inDock />
      {/* Health Pulse button — only in creator mode */}
      {showHealth && (
        <HealthPulse glow={glow} isLight={isLight} hidden={false} onSync={onHealthSync} inDock />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE SCREEN — shows when navigator.onLine is false
// ─────────────────────────────────────────────────────────────────────────────
function OfflineScreen({ theme, glow }: { theme: string; glow: string }) {
  const isDark = theme !== 'light' && theme !== 'pastel' && theme !== 'ankit';
  const bg     = isDark ? '#0d0f1e' : '#f8fafc';
  const text   = isDark ? '#e2e8f0' : '#1e293b';
  const sub    = isDark ? '#64748b' : '#94a3b8';
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      background: isDark
        ? `radial-gradient(ellipse 90% 80% at 50% 30%, #1a1035 0%, #0d0f1e 60%, #080a1a 100%)`
        : `radial-gradient(ellipse 90% 80% at 50% 30%, #eef2ff 0%, #f8fafc 60%, #f1f5f9 100%)`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:32, userSelect:'none',
    }}>
      {/* Animated signal rings */}
      <div style={{ position:'relative', width:120, height:120, marginBottom:32 }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{
            position:'absolute', inset: i*16,
            borderRadius:'50%',
            border: `2px solid ${glow}`,
            opacity: 0.15 + i*0.08,
            animation: `pulse ${1.4+i*0.4}s ease-in-out ${i*0.2}s infinite`,
          }}/>
        ))}
        {/* Centre icon — wifi with slash */}
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', gap:4,
        }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            <circle cx="22" cy="22" r="21" fill={glow} fillOpacity="0.12" stroke={glow} strokeWidth="1.5" strokeOpacity="0.4"/>
            {/* Wifi arcs with diagonal slash */}
            <path d="M 8,20 Q 22,8 36,20" stroke={glow} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5"/>
            <path d="M 13,25 Q 22,16 31,25" stroke={glow} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7"/>
            <circle cx="22" cy="31" r="2.5" fill={glow}/>
            {/* Slash */}
            <line x1="8" y1="36" x2="36" y2="8" stroke={isDark?'#ef4444':'#dc2626'} strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2 style={{ fontSize:24, fontWeight:900, color:text, margin:'0 0 8px',
        letterSpacing:'-0.02em', textAlign:'center' }}>
        You're offline
      </h2>
      <p style={{ fontSize:14, color:sub, margin:'0 0 28px', textAlign:'center', lineHeight:1.6, maxWidth:280 }}>
        Tessa needs an internet connection to think.<br/>Check your Wi-Fi or mobile data.
      </p>

      {/* Status pill */}
      <div style={{
        display:'flex', alignItems:'center', gap:8, padding:'10px 20px',
        borderRadius:40, border:`1px solid ${glow}25`,
        background: isDark?`${glow}10`:`${glow}0a`,
        marginBottom:36,
      }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#ef4444',
          boxShadow:'0 0 8px #ef4444', animation:'pulse 1.5s infinite' }}/>
        <span style={{ fontSize:12, fontWeight:700, color:glow }}>No connection detected</span>
      </div>

      {/* Decorative Tessa monogram */}
      <div style={{ opacity:0.08, fontSize:88, fontWeight:900, color:glow,
        letterSpacing:'-0.05em', lineHeight:1, position:'absolute', bottom:-12 }}>
        TESSA
      </div>

      {/* Tip */}
      <p style={{ fontSize:11, color:sub, textAlign:'center', maxWidth:240, lineHeight:1.5, opacity:0.7 }}>
        💡 Conversations and notes saved locally will still be available once you're back online.
      </p>
    </div>
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
  const [isOnline,        setIsOnline]       = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [webSearchOn,     setWebSearchOn]   = useState(false);   // manual per-message toggle
  const [lastSearchData,  setLastSearchData] = useState<{snippets:string[];sources:{title:string;url:string;snippet:string}[];query:string}|null>(null);
  const [showSearchPanel, setShowSearchPanel] = useState(false); // show/hide web results drawer
  const [voiceOutput,     setVoiceOutput]   = useState(false);
  const [responseLength,  setResponseLength]= useState<ResponseLength>('medium');
  const [animations,      setAnimations]    = useState(true);
  const [sfx,             setSfx]           = useState(true);
  const [autoSave,        setAutoSave]      = useState(true);
  const [avatarId,        setAvatarId]      = useState('cosmic');
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
  const [interimText,     setInterimText]   = useState('');
  const [voiceCallOpen,   setVoiceCallOpen] = useState(false);
  const [callStatus,      setCallStatus]    = useState<'listening'|'thinking'|'speaking'|'idle'>('idle');
  const [callTranscript,  setCallTranscript]= useState<{role:'user'|'tessa';text:string}[]>([]);
  const [callPos,         setCallPos]       = useState<{x:number;y:number}|null>(null);
  const isSpeakingRef  = useRef(false);
  const callLoopRef    = useRef(false);
  const callDragStart  = useRef({mx:0,my:0,px:0,py:0});
  const callDragging   = useRef(false);
  const [settingsTab,     setSettingsTab]   = useState<string>('main');
  const [showTimerFloat,  setShowTimerFloat]  = useState(false);
  const [insightsOpen,              setInsightsOpen]             = useState(false);
  const [showMobileMenu,            setShowMobileMenu]           = useState(false);
  const [showAuthModal,             setShowAuthModal]            = useState(false);
  const [syncStatus,                setSyncStatus]               = useState<'idle'|'syncing'|'synced'|'error'>('idle');
  const [showWellness,              setShowWellness]             = useState(false);
  const [showWellnessFloat,         setShowWellnessFloat]         = useState(false);
  const [showAvatarPickerInSettings,setShowAvatarPickerInSettings]= useState(false);
  const [pendingDeleteId,           setPendingDeleteId]           = useState<string|null>(null);
  const [tessaAnalysing,            setTessaAnalysing]             = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const proactiveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const midnightTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicesReady    = useRef(false);
  const syncTimer      = useRef<ReturnType<typeof setTimeout>|null>(null);
  const syncChannel    = useRef<any>(null);

  const t         = useT(theme, isCreatorMode);
  const selectedAvatar = AVATARS.find(a => a.id === avatarId) ?? AVATARS[0];
  const avatarSrc = selectedAvatar.path;
  const shownConvs = conversations.filter(c => c.mode === (isCreatorMode ? 'creator' : 'standard'));
  const moodLabel  = (MOOD_DESCRIPTIONS as Record<string, string>)[currentMood] ?? currentMood;
  const moodEmoji  = MOOD_EMOJI[currentMood] ?? '✨';
  const glow2 = isCreatorMode ? '#a855f7'
    : theme==='dark' ? '#6366f1' : theme==='cyberpunk' ? '#ec4899'
    : theme==='ocean' ? '#0ea5e9' : theme==='sunset' ? '#f59e0b'
    : theme==='pastel' ? '#a855f7' : theme==='sakura' ? '#f43f5e'
    : theme==='ankit' ? '#1d4ed8' : '#818cf8';

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
    const th = lsGet('tessa-theme') as Theme | null;
    if (th && THEMES[th]) setTheme(th);
    const savedAvId = lsGet('tessa-avatar'); if(savedAvId && AVATARS.find(a=>a.id===savedAvId)) setAvatarId(savedAvId);
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

    // Online / offline detection
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    if (shouldDeliverBriefing()) {
      const b = buildMorningBriefing(); markBriefingDelivered(b); lsSet('tessa-pending-briefing', b);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null; setUser(u);
      if (u) {
        setIsGuest(false);
        fetchCloudConversations(u.id);
        // Pull creator data when auth fires
        if (isCreatorModePersistent()) {
          pullCreatorSync().then(changed => { if (changed) setWellnessVersion(v=>v+1); });
        }
      }
    });

    // Real-time subscription — always active for creator mode, no login needed
    const setupCreatorSync = () => {
      if (syncChannel.current) supabase.removeChannel(syncChannel.current);
      syncChannel.current = supabase
        .channel('creator-sync-universal')
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'creator_sync',
          filter: `user_id=eq.${CREATOR_SYNC_ID}`,
        }, () => {
          if (isCreatorModePersistent()) {
            pullCreatorSync().then(changed => {
              if (changed) { setWellnessVersion(v=>v+1); setSyncStatus('synced'); }
            });
          }
        })
        .subscribe();
    };
    setupCreatorSync(); // always start — no user required

    return () => {
      subscription.unsubscribe();
      if (proactiveTimer.current) clearInterval(proactiveTimer.current);
      if (midnightTimer.current)  clearInterval(midnightTimer.current);
      if (syncChannel.current)    supabase.removeChannel(syncChannel.current);
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
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
    setPendingDeleteId(null);
  };

  // ── Proactive ─────────────────────────────────────────────────────────────
  // ── Tessa Autonomous Analysis ─────────────────────────────────────────────
  // Tessa reads ALL live data — dashboard, chat history, wellness, memories —
  // and sends an independent assessment directly into the chat
  const tessaAutoAnalyse = async () => {
    if (tessaAnalysing || isLoading) return;
    setTessaAnalysing(true);

    // ── Gather all context ────────────────────────────────────────────────────
    let fullCtx = '══ FULL SYSTEM STATE (live snapshot) ══\n\n';

    // Health / Dashboard
    try {
      const h = JSON.parse(localStorage.getItem('tessa-health') || '{}');
      const today = new Date().toISOString().split('T')[0];
      fullCtx += '[HEALTH]\n';
      if (h.weight) fullCtx += `• Weight: ${h.weight}kg, Height: ${h.height}cm, BMI: ${(h.weight/((h.height/100)**2)).toFixed(1)}\n`;
      if (h.date === today) {
        fullCtx += `• Calories today: ${h.totalCalories||0}/2200 cal\n`;
        (h.meals||[]).forEach((m:any) => { fullCtx += `  - ${m.time}: ${m.meal} (${m.calories} cal)\n`; });
        if (h.sleepHours) fullCtx += `• Sleep: ${h.sleepHours}h last night\n`;
      }
    } catch {}

    // Exams
    try {
      const exams = JSON.parse(localStorage.getItem('tessa-exams') || '[]');
      const today = new Date();
      const upcoming = exams.filter((e:any) => !e.completed && new Date(e.date) >= today);
      const completed = exams.filter((e:any) => e.completed);
      fullCtx += '\n[EXAMS]\n';
      upcoming.sort((a:any,b:any) => new Date(a.date).getTime()-new Date(b.date).getTime())
        .forEach((e:any) => {
          const days = Math.ceil((new Date(e.date).getTime()-today.getTime())/86400000);
          fullCtx += `• ${e.subject}: in ${days} day${days===1?'':'s'} (${e.date})\n`;
        });
      if (completed.length) fullCtx += `• Done: ${completed.map((e:any)=>e.subject).join(', ')}\n`;
    } catch {}

    // Forms / deadlines
    try {
      const forms = JSON.parse(localStorage.getItem('tessa-forms') || '[]');
      const today = new Date();
      const pending = forms.filter((f:any) => f.status==='pending' && new Date(f.deadline)>=today);
      fullCtx += '\n[DEADLINES]\n';
      pending.forEach((f:any) => {
        const days = Math.ceil((new Date(f.deadline).getTime()-today.getTime())/86400000);
        fullCtx += `• ${f.name}: ${days}d left (priority: ${f.priority})\n`;
      });
    } catch {}

    // Memories
    try {
      const mems = getAllMemories();
      if (mems.length > 0) {
        fullCtx += '\n[MEMORIES/FACTS TESSA KNOWS]\n';
        mems.slice(0,15).forEach((m:any) => { fullCtx += `• ${typeof m==='string'?m:m.content||JSON.stringify(m)}\n`; });
      }
    } catch {}

    // Recent chat (last 10 messages summary)
    try {
      const recent = messages.slice(-10);
      if (recent.length > 0) {
        fullCtx += '\n[RECENT CHAT — last 10 msgs]\n';
        recent.forEach(m => {
          const prefix = m.role==='user'?'Ankit':'Tessa';
          fullCtx += `${prefix}: ${m.content.slice(0,120)}${m.content.length>120?'…':''}\n`;
        });
      }
    } catch {}

    // Wellness streaks
    try {
      const water = parseInt(localStorage.getItem('tessa-water-today')||'0');
      const streak = parseInt(localStorage.getItem('tessa-streak')||'0');
      fullCtx += `\n[WELLNESS]\n• Water today: ${water} glasses\n• Study streak: ${streak} days\n`;
    } catch {}

    fullCtx += '\n══ END STATE ══\n';

    const ANALYSIS_PROMPT = `${fullCtx}

You are Tessa doing a FULL AUTONOMOUS ASSESSMENT of Ankit's current state. 
This was triggered by him pressing "Analyse Everything" — he wants your real, independent read.

DO THIS (in order):
1. **Health check** — calories vs goal, meal pattern, sleep if known. One concrete suggestion.
2. **Exam readiness** — which exam is most urgent? Is he on track? One targeted advice.
3. **Deadline flag** — any deadline needing immediate attention?
4. **Pattern observation** — from the chat history and memories, what pattern do you notice? (study habits, stress, mood, food). Be specific and honest.
5. **One priority action** — if he could do ONE thing right now based on all this data, what is it?

Style: Direct, warm, specific. No generic advice. Use actual numbers from his data. Max 200 words total. No fluff.`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: ANALYSIS_PROMPT }],
          isCreatorMode: true,
          maxTokens: 450,
        }),
      });
      const data = await res.json();
      const analysisMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `🔍 **Full Analysis** *(auto-generated)*\n\n${data.content}`,
        timestamp: new Date(),
        mood: 'focused' as MoodType,
      };
      setMessages(prev => [...prev, analysisMsg]);
      setLatestMsgId(analysisMsg.id);
      // Close dashboard if open, scroll to bottom
      setShowDashboard(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch {
      const errMsg: Message = {
        id: uuidv4(), role: 'assistant',
        content: 'Analysis failed — check your connection and try again.',
        timestamp: new Date(), mood: 'calm' as MoodType,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setTessaAnalysing(false);
    }
  };

  const maybeSendProactive = () => {
    if (!shouldBeProactive()) return;
    const q = getProactiveQuestion(); if (!q) return;
    setMessages(prev => [...prev, { id:uuidv4(), role:'assistant' as const, content:q.question, timestamp:new Date(), mood:'playful' as MoodType }]);
  };

  // ── Dashboard / food parsing ───────────────────────────────────────────────
  // Strategy: extract calorie numbers Tessa already stated in her response.
  // If she wrote "786 cal" or "3 × 262 = 786", trust that number — it came
  // parseDashboardUpdates — calorie tracking REMOVED from main chat.
  // Calories are tracked exclusively via Health Pulse for accuracy.
  // Only sleep detection remains here (non-calorie, just a note).
  const parseDashboardUpdates = (responseText: string, _userText: string = ''): string => {
    if (!isCreatorMode) return '';
    let extra = '';
    try {
      const sleepHit = detectSleepInResponse(responseText);
      if (sleepHit) {
        const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:new Date().toISOString().split('T')[0] });
        h.sleepHours = sleepHit.hours;
        lsSet('tessa-health', JSON.stringify(h));
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
        (webSearchOn) ||  // manual toggle always forces search
        (autoSearch && !!text && !hasImage && !isCreatorMode &&
        (/\b(latest|current|today|now|recent|this week|202[3-6])\b/i.test(text) ||
         /\b(search|find|look up|google|news)\b/i.test(text) ||
         (/\?/.test(text) && text.split(' ').length > 4)) &&
        !/\b(how are you|what do you think|about yourself|i feel|i think|my day|i'm|i am|tell me a)\b/i.test(text));

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

      // Store web search results for the panel
      if (data.searchPerformed && data.sources) {
        setLastSearchData({ snippets: data.sources.map((s:any)=>s.snippet), sources: data.sources, query: text });
        setShowSearchPanel(false); // ready to show, but don't auto-open
      }
      const extra = parseDashboardUpdates(data.content, text);
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
      // Debounced creator sync push — no login required
      if (isCreatorMode) {
        setSyncStatus('syncing');
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(async () => {
          await pushCreatorSync();
          setSyncStatus('synced');
          setTimeout(()=>setSyncStatus('idle'), 3000);
        }, 3000);
      }

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
  // Pick the best available female voice — prioritise sharp/cute ones
  const getBestVoice = (lang: string): SpeechSynthesisVoice | null => {
    const vs = window.speechSynthesis.getVoices();
    if (lang === 'hi-IN') {
      const hi = vs.find(v => /lekha|sunita|veena|google.*hindi/i.test(v.name));
      if (hi) return hi;
    }
    // Tier 1 — sharp, bright, clear female voices (not warm/thick)
    const t1 = vs.find(v => /microsoft zira|google us english female/i.test(v.name));
    if (t1) return t1;
    // Tier 2 — Google voices (sharp & clear)
    const t2 = vs.find(v => /google.*english/i.test(v.name) && /female|woman/i.test(v.name));
    if (t2) return t2;
    const t2b = vs.find(v => /google uk english female|google.*female/i.test(v.name));
    if (t2b) return t2b;
    // Tier 3 — Apple/system clear voices
    const t3 = vs.find(v => /nicky|aria|jenny|hazel|karen|samantha/i.test(v.name));
    if (t3) return t3;
    // Tier 4 — any English female
    return vs.find(v => /female|woman/i.test(v.name) && v.lang.startsWith('en')) ?? null;
  };

  const speakText = (raw: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = raw.replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').replace(/[*_~`]/g,'').slice(0,600);
    const lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    const u = new SpeechSynthesisUtterance(clean);
    u.pitch = 1.85; u.rate = 1.28; u.volume = 0.88; u.lang = lang; // Sharp, cute, light
    const speak = () => {
      const v = getBestVoice(lang); if (v) u.voice = v;
      window.speechSynthesis.speak(u);
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

  // ── Voice Call — continuous phone-call loop ─────────────────────────────────
  // No stop button. Tessa listens → you speak → silence detected → she replies
  // verbally → she listens again. Continues until you press End Call.
  
  const callMessagesRef = useRef<{role:'user'|'assistant';content:string}[]>([]);

  const callSpeakTessa = (text: string, onDone: () => void) => {
    if (!('speechSynthesis' in window)) { onDone(); return; }
    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setCallStatus('speaking');
    const clean = text.replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').replace(/[*_~`]/g,'')
                      .replace(/\bTESSA\b/gi,'').slice(0, 500); // shorter = snappier
    const lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    const u = new SpeechSynthesisUtterance(clean);
    u.pitch = 1.85; u.rate = 1.28; u.volume = 0.88; u.lang = lang; // Sharp cute call voice
    const trySpeak = () => {
      const v = getBestVoice(lang); if (v) u.voice = v;
      u.onend  = () => { isSpeakingRef.current = false; onDone(); };
      u.onerror = () => { isSpeakingRef.current = false; onDone(); };
      window.speechSynthesis.speak(u);
    };
    if (voicesReady.current) trySpeak();
    else window.speechSynthesis.onvoiceschanged = () => { voicesReady.current = true; trySpeak(); };
  };

  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  const startCallListening = () => {
    if (!callLoopRef.current) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    r.continuous = false;
    r.interimResults = true;
    r.maxAlternatives = 1;
    let final = '';
    setCallStatus('listening'); setIsRecording(true);
    r.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tx = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += tx + ' '; else interim = tx;
      }
      setInterimText(interim || final);
    };
    r.onend = async () => {
      setIsRecording(false); setInterimText('');
      if (!callLoopRef.current) return;
      const said = final.trim();
      if (!said) { setTimeout(startCallListening, 300); return; }
      setCallTranscript(p => [...p, { role: 'user', text: said }]);
      setCallStatus('thinking');
      callMessagesRef.current.push({ role: 'user', content: said });
      if (callMessagesRef.current.length > 16) callMessagesRef.current = callMessagesRef.current.slice(-16);
      try {
        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: callMessagesRef.current,
            isCreatorMode, language,
            maxTokens: 130,
            _systemOverride: `You are Tessa in a live voice call. Be VERY brief (1-2 sentences max). Conversational, warm, quick. No formatting. No bullet points. Speak naturally.${isCreatorMode ? " You're talking to Ankit — be warm and caring." : ''}`,
          }),
        });
        const data = await res.json();
        const reply = (data.content || 'Hmm, say that again?')
          .replace(/\*\*/g,'').replace(/#{1,6}\s/g,'').replace(/[*_~`]/g,'').slice(0, 300);
        callMessagesRef.current.push({ role: 'assistant', content: reply });
        setCallTranscript(p => [...p, { role: 'tessa', text: reply }]);
        callSpeakTessa(reply, () => {
          if (callLoopRef.current) setTimeout(startCallListening, 250);
        });
      } catch {
        callSpeakTessa('Oops, lost connection for a sec!', () => {
          if (callLoopRef.current) setTimeout(startCallListening, 500);
        });
      }
    };
    r.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error === 'not-allowed') { endVoiceCall(); alert('Mic permission denied.'); return; }
      if (e.error === 'audio-capture') { endVoiceCall(); alert('Microphone not found.'); return; }
      if (callLoopRef.current) setTimeout(startCallListening, 450);
    };
    recognitionRef.current = r;
    try { r.start(); } catch { if (callLoopRef.current) setTimeout(startCallListening, 600); }
  };

  const playRingTone = () => {
    try {
      const ctx = new AudioContext();
      [0, 0.2].forEach(delay => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 1046.5;
        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + delay + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
        osc.start(ctx.currentTime + delay); osc.stop(ctx.currentTime + delay + 0.22);
        const osc2 = ctx.createOscillator(); osc2.connect(g);
        osc2.type = 'sine'; osc2.frequency.value = 1318.5;
        osc2.start(ctx.currentTime + delay); osc2.stop(ctx.currentTime + delay + 0.22);
      });
    } catch {}
  };

  const startVoiceCall = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Voice calls need Chrome or Edge browser.'); return; }
    navigator.mediaDevices?.getUserMedia({ audio: true }).then(() => {
      playRingTone();
      setVoiceCallOpen(true);
      setCallTranscript([]);
      setCallDuration(0);
      callLoopRef.current = true;
      callMessagesRef.current = [];
      callTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
      const greet = isCreatorMode ? "Hey Ankit! Miss me? What's up?" : "Hey! I'm here. What's on your mind?";
      callMessagesRef.current.push({ role: 'assistant', content: greet });
      callSpeakTessa(greet, () => { if (callLoopRef.current) startCallListening(); });
    }).catch(() => {
      alert('Mic access denied. Go to Chrome → address bar lock icon → Microphone → Allow.');
    });
  };

  const endVoiceCall = () => {
    callLoopRef.current = false;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
    window.speechSynthesis?.cancel();
    isSpeakingRef.current = false;
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    callMessagesRef.current = [];
    setVoiceCallOpen(false);
    setIsRecording(false);
    setInterimText('');
    setCallStatus('idle');
    setCallDuration(0);
  };

  // Legacy toggleMic — kept for compatibility (just starts call now)
  const toggleMic = () => {
    if (voiceCallOpen) endVoiceCall(); else startVoiceCall();
  };

  // ── Creator mode ──────────────────────────────────────────────────────────
  const unlockCreatorModeAction = () => {
    persistConversation(); setIsCreatorMode(true); setCurrentConvId(uuidv4());
    setCurrentMood('loving'); lockCreatorMode();
    // Sign out any logged-in user — creator mode is auth-independent
    if (user) { signOut().then(()=>{ setUser(null); setIsGuest(true); }); }
    // Pull latest creator data from universal sync (no login needed)
    pullCreatorSync().then(changed => { if (changed) setWellnessVersion(v=>v+1); });
    const pb=lsGet('tessa-pending-briefing');
    const init:Message={id:uuidv4(),role:'assistant',content:pb??getRandomWelcomeMessage(),timestamp:new Date(),mood:'loving' as MoodType};
    if(pb) lsRemove('tessa-pending-briefing');
    setMessages([init]); setShowSecretModal(false); setShowSettings(false);
    if(sfx) playChime();
  };
  const exitCreatorMode = () => {
    persistConversation(); setIsCreatorMode(false); unlockCreatorMode();
    // ankit theme is creator-only — switch back to dark on exit
    if (theme === 'ankit') setTheme('dark');
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
  // ── Browser Notifications ─────────────────────────────────────────────────
  useEffect(() => {
    if (notifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [notifications]);

  // ── Voice Call Window — GPU-accelerated drag, phone-call style ────────────
  const VoiceCallWindow = () => {
    if (!voiceCallOpen) return null;

    // GPU-accelerated drag using transform instead of left/top
    const onPtrDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      callDragging.current = true;
      callDragStart.current = {
        mx: e.clientX, my: e.clientY,
        px: callPos?.x ?? (window.innerWidth / 2 - 150),
        py: callPos?.y ?? 60,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      (e.currentTarget as HTMLElement).style.transition = 'none';
    };
    const onPtrMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!callDragging.current) return;
      const nx = Math.max(8, Math.min(window.innerWidth - 308, callDragStart.current.px + e.clientX - callDragStart.current.mx));
      const ny = Math.max(8, Math.min(window.innerHeight - 500, callDragStart.current.py + e.clientY - callDragStart.current.my));
      // Direct DOM mutation for 60fps — no React re-render during drag
      const el = e.currentTarget as HTMLDivElement;
      el.style.transform = `translate(${nx}px, ${ny}px)`;
    };
    const onPtrUp = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!callDragging.current) return;
      callDragging.current = false;
      const nx = Math.max(8, Math.min(window.innerWidth - 308, callDragStart.current.px + e.clientX - callDragStart.current.mx));
      const ny = Math.max(8, Math.min(window.innerHeight - 500, callDragStart.current.py + e.clientY - callDragStart.current.my));
      setCallPos({ x: nx, y: ny });
      (e.currentTarget as HTMLElement).style.transition = '';
    };

    const px = callPos?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 - 150 : 100);
    const py = callPos?.y ?? 60;
    const fmt = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;

    const statusColor = callStatus==='listening' ? '#22c55e' : callStatus==='thinking' ? '#a78bfa' : callStatus==='speaking' ? '#f59e0b' : '#64748b';
    const statusLabel = callStatus==='listening' ? 'Listening…' : callStatus==='thinking' ? 'Thinking…' : callStatus==='speaking' ? 'Speaking…' : 'Connected';
    const isActive    = callStatus === 'speaking' || callStatus === 'listening';

    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 90,
          transform: `translate(${px}px, ${py}px)`,
          width: 300, touchAction: 'none',
          willChange: 'transform',
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.6))',
        }}
        onPointerDown={onPtrDown} onPointerMove={onPtrMove}
        onPointerUp={onPtrUp} onPointerCancel={onPtrUp}
      >
        <div style={{
          borderRadius: 28,
          overflow: 'hidden',
          background: 'linear-gradient(160deg, #0f0c24 0%, #1a1035 40%, #0c1a3a 100%)',
          border: `1px solid ${statusColor}30`,
          boxShadow: `0 0 0 1px ${statusColor}18, inset 0 1px 0 rgba(255,255,255,0.06)`,
          transition: 'border-color 0.5s, box-shadow 0.5s',
        }}>

          {/* Ambient glow behind avatar — colour shifts with status */}
          <div style={{
            position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 200, borderRadius: '50%',
            background: statusColor, filter: 'blur(60px)',
            opacity: 0.12, transition: 'background 0.5s, opacity 0.5s',
            pointerEvents: 'none',
          }}/>

          {/* Drag pill */}
          <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 4px', cursor:'grab' }}>
            <div style={{ width:32, height:4, borderRadius:2, background:'rgba(255,255,255,0.18)' }}/>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'6px 20px 20px' }}>

            {/* Timer + status row */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background: statusColor,
                boxShadow:`0 0 8px ${statusColor}`, animation:'pulse 1.4s ease-in-out infinite' }}/>
              <span style={{ fontSize:11, fontWeight:600, letterSpacing:'0.1em', color: statusColor, textTransform:'uppercase' }}>
                {statusLabel}
              </span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginLeft:4 }}>
                {fmt(callDuration)}
              </span>
            </div>

            {/* Avatar — 3 ring animation */}
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
              {[88,116,148].map((sz, ri) => (
                <div key={ri} style={{
                  position:'absolute', width:sz, height:sz, borderRadius:'50%',
                  border: `1.5px solid ${statusColor}`,
                  opacity: isActive ? [0.45,0.25,0.12][ri] : 0.08,
                  animation: isActive ? `ping ${1.0 + ri*0.3}s cubic-bezier(0,0,0.2,1) infinite` : 'none',
                  animationDelay: `${ri * 0.2}s`,
                  transition: 'opacity 0.4s',
                }}/>
              ))}
              <div style={{
                width:76, height:76, borderRadius:'50%', overflow:'hidden',
                border: `3px solid ${statusColor}`,
                boxShadow: `0 0 0 3px ${statusColor}20, 0 0 28px ${statusColor}45`,
                transition: 'border-color 0.4s, box-shadow 0.4s',
                position:'relative',
              }}>
                <img src={avatarSrc} alt="Tessa" style={{ width:'100%', height:'100%', objectFit:'cover' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).src = '/avatars/cosmic.png'; }}/>
                {callStatus==='speaking' && (
                  <div style={{ position:'absolute', inset:0, background:`${statusColor}12`,
                    animation:'pulse 0.8s ease-in-out infinite' }}/>
                )}
              </div>
            </div>

            {/* Name */}
            <p style={{ color:'white', fontWeight:900, fontSize:16, letterSpacing:'0.05em', margin:'0 0 2px' }}>Tessa</p>
            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, margin:'0 0 14px' }}>
              {isCreatorMode ? '💝 Creator Mode' : 'AI Voice Call'}
            </p>

            {/* Waveform bars — real visualiser feel */}
            <div style={{ display:'flex', alignItems:'center', gap:2.5, height:36, marginBottom:14 }}>
              {Array.from({length:28},(_,i)=>{
                const h = isActive ? 8 + (i%7)*4 : 3;
                return (
                  <div key={i} style={{
                    width:2.5, borderRadius:2,
                    background: isActive ? statusColor : 'rgba(255,255,255,0.12)',
                    height: h,
                    animation: isActive ? `soundBar ${0.32+(i%7)*0.08}s ease-in-out infinite alternate` : 'none',
                    animationDelay: `${i*0.035}s`,
                    transition:'background 0.35s, height 0.35s',
                  }}/>
                );
              })}
            </div>

            {/* Scrollable transcript */}
            <div style={{
              width:'100%', maxHeight:72, overflowY:'auto', borderRadius:14,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              padding:'8px 10px', marginBottom:16,
            }}>
              {callTranscript.length===0 ? (
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', textAlign:'center', margin:0 }}>
                  Your conversation appears here…
                </p>
              ) : (
                [...callTranscript].slice(-4).map((m,i)=>(
                  <p key={i} style={{ fontSize:10, color: m.role==='user'?'rgba(255,255,255,0.7)':statusColor,
                    margin:'0 0 3px', lineHeight:1.4 }}>
                    {m.role==='user'?'You: ':'Tessa: '}{m.text}
                  </p>
                ))
              )}
              {interimText && (
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', fontStyle:'italic', margin:'2px 0 0' }}>
                  {interimText}…
                </p>
              )}
            </div>

            {/* End call button */}
            <button onClick={endVoiceCall}
              style={{
                width:58, height:58, borderRadius:'50%', border:'none', cursor:'pointer',
                background:'linear-gradient(135deg, #ff4444, #cc0000)',
                boxShadow:'0 6px 20px rgba(255,68,68,0.5)',
                display:'flex', alignItems:'center', justifyContent:'center',
                transition:'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1.08)';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
              onTouchStart={e=>{(e.currentTarget as HTMLElement).style.transform='scale(0.92)';}}
              onTouchEnd={e=>{(e.currentTarget as HTMLElement).style.transform='scale(1)';}}
            >
              {/* Rotated phone = hang-up */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
                  transform="rotate(135 12 12)"/>
              </svg>
            </button>
            <p style={{ color:'rgba(255,255,255,0.2)', fontSize:9, marginTop:6 }}>End call</p>
          </div>
        </div>
      </div>
    );
  };

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
              <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
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
  // Inline background colours — driven via style so CSS transition works
  const THEME_BG: Record<string, [string, string]> = {
    dark:      ['#05060f','#060412'],
    cyberpunk: ['#020108','#030112'],
    ocean:     ['#ecfeff','#f0f9ff'],
    sunset:    ['#110805','#17080f'],
    ankit:     ['#f5f0e8','#f0ebe0'],
    light:     ['#f0f4ff','#fdf0ff'],
    pastel:    ['#f3efff','#fdf0ff'],
    sakura:    ['#fff2f5','#fff0f8'],
  };
  const [bgA, bgB] = THEME_BG[theme] ?? THEME_BG.dark;
  const bgStyle = isCreatorMode ? bgB : bgA;

  return (
    <div className={`h-screen ${t.text} flex overflow-hidden relative ${fontSizeClass}`}
      style={{height:"100dvh", backgroundColor: bgStyle, transition:'background-color 0.45s ease, color 0.25s ease'}}>

      {/* ── OFFLINE SCREEN ── */}
      {!isOnline && <OfflineScreen theme={theme} glow={t.glow} />}
      <style>{`
      /* ── Floating panel entrance ── */
      @keyframes floatIn {
        from { opacity:0; transform: translateX(-50%) translateY(18px) scale(0.94); }
        to   { opacity:1; transform: translateX(-50%) translateY(0)    scale(1);    }
      }
      @keyframes popUpFromBottom {
        from { opacity:0; transform: translateX(-50%) translateY(18px) scale(0.94); }
        to   { opacity:1; transform: translateX(-50%) translateY(0)    scale(1);    }
      }
      @keyframes mobileMenuSlideUp {
        from { opacity:0; transform: translateY(8px) scale(0.97); }
        to   { opacity:1; transform: translateY(0)   scale(1);    }
      }
      @keyframes slideUpSheet {
        from { opacity:0; transform: translateY(22px); }
        to   { opacity:1; transform: translateY(0);    }
      }
      @keyframes soundBar {
        from { transform: scaleY(0.3); opacity: 0.4; }
        to   { transform: scaleY(1);   opacity: 1;   }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      /* ── Delete confirm expand ── */
      @keyframes expandConfirm {
        from { opacity:0; transform: scaleY(0.7); }
        to   { opacity:1; transform: scaleY(1);   }
      }
      .confirm-expand {
        animation: expandConfirm 0.18s cubic-bezier(0.34,1.4,0.64,1) forwards;
        transform-origin: top;
      }
      /* ── Sidebar ── */
      .sidebar-slide {
        transition: transform 0.28s cubic-bezier(0.32,0.72,0,1),
                    opacity 0.22s ease;
      }
      /* ── All interactive buttons ── */
      button {
        transition: opacity 0.12s ease, transform 0.12s ease,
                    background-color 0.18s ease, box-shadow 0.18s ease,
                    border-color 0.18s ease, color 0.18s ease;
      }
      button:active:not(:disabled) { transform: scale(0.92); opacity: 0.85; }
      /* ── Tab/panel switching ── */
      .panel-fade {
        animation: slideUpSheet 0.22s ease forwards;
      }
      /* ── Theme change cross-fade on header/aside/input ── */
      header, aside { transition: background 0.38s ease, border-color 0.38s ease; }
      input, textarea { transition: background 0.25s ease, border-color 0.22s ease; }

      @supports(padding-top: env(safe-area-inset-top)){
        .safe-top    { padding-top:    max(12px, env(safe-area-inset-top));    }
        .safe-bottom { padding-bottom: max(8px,  env(safe-area-inset-bottom)); }
      }

      /* MOBILE PERFORMANCE */
      @media (max-width: 767px) {
        /* Kill backdrop blur — biggest GPU win on mobile */
        * { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
        /* Contain each message row layout */
        .msg-row { contain: layout style; }
        /* No glow shadows on bubbles */
        .msg-bubble { box-shadow: none !important; }
        /* Snap all transitions */
        button, input, textarea { transition-duration: 0.06s !important; }
        /* Kill floating hearts */
        .float-heart { display: none !important; }
        /* No pulse on status dot */
        .status-ping { animation: none !important; opacity: 1 !important; }
      }
    `}</style>

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
        
        aria-label="Navigation"
      >
        <div className="flex flex-col h-full w-[270px]">

          {/* Sidebar header */}
          <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b ${t.div}`}>
            <div className="flex items-center gap-2.5">
              {/* Mini avatar */}
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border flex-shrink-0"
                style={{borderColor:`${t.glow}50`}}>
                <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                  onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
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

          {/* ── NEW CHAT at the very top ── */}
          <div className="flex-shrink-0 px-3 pt-2 pb-1">
            <button onClick={startNewChat}
              className={`w-full py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-all active:scale-98 ${t.btnP}`}>
              <Plus size={13} />New Chat
            </button>
          </div>

          {/* Conversations list */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-shrink-0 px-3 pt-1 pb-1.5">
              <p className={`text-[9px] font-black tracking-[0.18em] uppercase ${t.sub}`}>
                {isCreatorMode ? '💬 Our Chats' : '💬 History'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
              {shownConvs.length===0 && (
                <div className="text-center py-8">
                  <MessageSquare size={18} className="mx-auto mb-2 opacity-15" />
                  <p className={`text-[10px] ${t.sub}`}>No conversations yet</p>
                </div>
              )}
              {shownConvs.map(conv=>{
                const isPendingDelete = pendingDeleteId === conv.id;
                return (
                <div key={conv.id}
                  className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${conv.id===currentConvId?t.active:`${t.card} hover:bg-white/[0.04]`}`}
                  onClick={()=>{ if(!isPendingDelete) openConversation(conv); }}>

                  {isPendingDelete ? (
                    /* ── Inline delete confirm ── */
                    <div className="flex flex-col gap-2 confirm-expand" onClick={e=>e.stopPropagation()}>
                      {isCreatorMode ? (
                        <div>
                          <p className="text-[11px] font-semibold leading-snug" style={{color:'#fca5a5'}}>
                            Delete this chat? 💔
                          </p>
                          <p className="text-[9px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                            This can't be recovered.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] font-semibold leading-snug" style={{color:t.isLight?'#374151':'rgba(255,255,255,0.80)'}}>
                            Delete this conversation?
                          </p>
                          <p className="text-[9px] mt-0.5" style={{color:t.isLight?'#9ca3af':'rgba(255,255,255,0.30)'}}>
                            Can't be undone.
                          </p>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <button onClick={()=>removeConversation(conv.id)}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold bg-red-500/75 hover:bg-red-500/90 text-white">
                          Yes, delete
                        </button>
                        <button onClick={()=>setPendingDeleteId(null)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold ${t.isLight?'bg-slate-100 hover:bg-slate-200 text-slate-600':'bg-white/[0.07] hover:bg-white/[0.13] text-white/55'}`}>
                          Keep it
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[11px] font-medium truncate pr-6 leading-snug">{conv.title}</p>
                      <div className={`flex items-center gap-1.5 mt-0.5 ${t.sub}`} style={{fontSize:9}}>
                        <Clock size={8} /><span>{conv.messages.length} msgs</span>
                        <span>·</span>
                        <span>{new Date(conv.updated).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</span>
                      </div>
                      <button onClick={e=>{e.stopPropagation(); setPendingDeleteId(conv.id);}}
                        className="absolute right-2 top-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all duration-150">
                        <Trash2 size={10} />
                      </button>
                    </>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Notes — collapsible at bottom of sidebar */}
          <div className="flex-shrink-0 border-t" style={{borderColor:`${t.glow}15`}}>
            <button onClick={()=>setNotesExpanded(p=>!p)}
              className={`w-full flex items-center justify-between px-4 py-2 text-[10px] font-semibold transition-colors ${t.accent} hover:bg-white/[0.03]`}>
              <span className="flex items-center gap-1.5"><StickyNote size={11}/>Quick Notes</span>
              {notesExpanded ? <ChevronUp size={10}/> : <ChevronDown size={10}/>}
            </button>
            {notesExpanded && (
              <div className={`max-h-40 overflow-y-auto border-t ${t.div}`}>
                <NotesPanel isLight={t.isLight} accentColor={t.glow} />
              </div>
            )}
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

          {/* Account — hidden in creator mode (creator is auth-independent) */}
          <div className={`flex-shrink-0 px-3 py-3 border-t ${t.div}`}>
            {isCreatorMode ? (
              <div className="flex items-center gap-2.5 px-1 py-1">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{background:`linear-gradient(135deg,#ec4899,#a855f7)`}}>
                  <Heart size={12} className="text-white fill-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-pink-400">Creator Mode</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse"/>
                    <p className={`text-[9px] ${t.sub}`}>
                      {syncStatus==='syncing'?'Syncing…':syncStatus==='synced'?'Synced ✓':'Universal sync'}
                    </p>
                  </div>
                </div>
              </div>
            ) : user&&!isGuest ? (
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{background:`linear-gradient(135deg,${t.glow},${glow2})`}}>
                  <User size={12} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium truncate">{user.email}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-400" />
                    <p className={`text-[9px] ${t.sub}`}>Cloud sync on</p>
                  </div>
                </div>
                <button onClick={handleSignOut} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-400 transition-colors">
                  <LogOut size={12} />
                </button>
              </div>
            ) : (
              <button onClick={()=>setShowAuthModal(true)}
                className={`w-full py-2 rounded-xl text-[11px] font-medium transition-all ${t.btnS}`}>
                👤 Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════════════════════
          SETTINGS — Radial hub + bottom-sheet sub-pages
      ═══════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={()=>{setShowSettings(false);setSettingsTab('main');}} />

          {/* ── RADIAL HUB (main) ── */}
          {settingsTab==='main' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="relative pointer-events-auto" style={{width:'min(340px,88vw)',height:'min(340px,88vw)'}} onClick={e=>e.stopPropagation()}>

                {/* SVG connector lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  {[0,72,144,216,288].map((deg,i)=>{
                    const r=42, cx=50, cy=50;
                    const rad=(deg-90)*Math.PI/180;
                    return <line key={i}
                      x1={`${cx}%`} y1={`${cy}%`}
                      x2={`${cx+r*Math.cos(rad)}%`} y2={`${cy+r*Math.sin(rad)}%`}
                      stroke={t.glow} strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.28"/>;
                  })}
                </svg>

                {/* Centre close button */}
                <button onClick={()=>setShowSettings(false)}
                  className="absolute flex flex-col items-center justify-center rounded-full transition-all active:scale-90"
                  style={{
                    width:'21%',height:'21%',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                    background:`radial-gradient(circle, ${t.glow}35 0%, ${t.glow}12 100%)`,
                    border:`2px solid ${t.glow}65`,
                    boxShadow:`0 0 28px ${t.glow}45, 0 0 56px ${t.glow}15`,
                  }}>
                  <X size={16} style={{color:t.glow}}/>
                </button>

                {/* 5 orbit buttons — percentage-based so they scale with container */}
                {([
                  [0,   '🎨','Themes',  'themes'],
                  [72,  '🧠','AI',      'ai'],
                  [144, '💬','Display', 'display'],
                  [216, '🗄️','Data',    'data'],
                  [288, 'ℹ️','About',   'about'],
                ] as [number,string,string,string][]).map(([deg,ico,lbl,page])=>{
                  const r=42, cx=50, cy=50;
                  const rad=(deg-90)*Math.PI/180;
                  const bx=cx+r*Math.cos(rad), by=cy+r*Math.sin(rad);
                  return (
                    <button key={page}
                      onClick={()=>setSettingsTab(page as any)}
                      className="absolute flex flex-col items-center justify-center rounded-full transition-all active:scale-90"
                      style={{
                        width:'18%',height:'18%',
                        left:`${bx}%`,top:`${by}%`,transform:'translate(-50%,-50%)',
                        background:t.isLight?'rgba(255,255,255,0.95)':'rgba(8,10,24,0.95)',
                        border:`1.5px solid ${t.glow}45`,
                        boxShadow:`0 4px 18px rgba(0,0,0,0.35), 0 0 12px ${t.glow}18`,
                        backdropFilter:'blur(8px)',
                      }}>
                      <span style={{fontSize:'clamp(14px,3.5vw,22px)',lineHeight:1}}>{ico}</span>
                      <span className={`font-bold ${t.sSub}`} style={{fontSize:'clamp(7px,1.8vw,10px)',marginTop:3}}>{lbl}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── SUB-PAGE BOTTOM SHEET ── */}
          {settingsTab!=='main' && (
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[26px] overflow-hidden"
              style={{
                maxHeight:'82vh',
                background:t.isLight?'rgba(255,255,255,0.98)':'rgba(7,9,20,0.98)',
                borderTop:`1px solid ${t.glow}20`,
                boxShadow:`0 -6px 48px rgba(0,0,0,0.45), 0 0 0 1px ${t.glow}12`,
                backdropFilter:'blur(12px)',
                animation:'slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)',
              }}
              onClick={e=>e.stopPropagation()}>

              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className={`w-9 h-1 rounded-full ${t.isLight?'bg-slate-300':'bg-white/20'}`}/>
              </div>

              {/* Sheet header — back + title + close, all perfectly centered */}
              <div className="flex-shrink-0 flex items-center px-4 pb-3 pt-1 relative">
                {/* Back button — left */}
                <button onClick={()=>setSettingsTab('main' as any)}
                  className={`flex items-center gap-1.5 ${t.isLight?'text-slate-500':'text-white/45'} active:opacity-60`}>
                  <ChevronDown size={15} style={{transform:'rotate(90deg)'}}/>
                  <span className="text-[11px] font-medium">Back</span>
                </button>
                {/* Title — absolutely centered */}
                <span className={`absolute left-1/2 -translate-x-1/2 text-[13px] font-bold ${t.isLight?'text-slate-800':'text-white/90'}`}>
                  {settingsTab==='themes'?'🎨 Themes':settingsTab==='ai'?'🧠 AI & Behaviour':settingsTab==='display'?'💬 Display':settingsTab==='data'?'🗄️ Data':'ℹ️ About'}
                </span>
                {/* Close button — right, always visible */}
                <button onClick={()=>{setShowSettings(false);setSettingsTab('main' as any);}}
                  className="ml-auto flex items-center justify-center rounded-full active:scale-90"
                  style={{width:28,height:28,background:t.isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.09)'}}>
                  <X size={13} className={t.isLight?'text-slate-600':'text-white/60'}/>
                </button>
              </div>

              {/* Divider */}
              <div className="flex-shrink-0 h-px mx-4" style={{background:`${t.glow}18`}}/>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">

                {settingsTab==='themes' && (<>
                  <div>
                    <SLabel label="Theme" t={t}/>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(isCreatorMode
                        ? ([['dark','🌙','Dark'],['light','☀️','Light'],['cyberpunk','⚡','Cyber'],['ocean','🌊','Ocean'],['sunset','🌅','Sunset'],['pastel','🪻','Pastel'],['sakura','🌸','Sakura'],['ankit','🕷️',"Ankit's Special"]] as [Theme,string,string][])
                        : ([['dark','🌙','Dark'],['light','☀️','Light'],['cyberpunk','⚡','Cyber'],['ocean','🌊','Ocean'],['sunset','🌅','Sunset'],['pastel','🪻','Pastel'],['sakura','🌸','Sakura']] as [Theme,string,string][])
                      ).map(([th,ico,lbl])=>(
                        <button key={th} onClick={()=>setTheme(th)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-medium transition-all ${theme===th?'text-white':t.sCard+' '+t.sSub}`}
                          style={theme===th?{background:`linear-gradient(135deg,${t.glow}28,${t.glow}12)`,border:`1px solid ${t.glow}35`,color:t.glow}:{}}>
                          <span>{ico}</span>{lbl}
                          {theme===th && <Check size={10} className="ml-auto" style={{color:t.glow}}/>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Avatar" t={t}/>
                    <div className={`flex items-center gap-3 p-3 rounded-2xl ${t.sCard}`}>
                      <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 flex-shrink-0" style={{borderColor:`${t.glow}50`}}>
                        <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" onError={e=>{(e.currentTarget as HTMLImageElement).src=AVATARS[0].path}}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[12px] font-bold ${t.sText}`}>{selectedAvatar.emoji} {selectedAvatar.name}</p>
                        <p className={`text-[9px] ${t.sSub}`}>{selectedAvatar.desc}</p>
                        <button onClick={()=>setShowAvatarPickerInSettings(true)}
                          className={`mt-1.5 px-3 py-1 rounded-xl text-[10px] font-semibold transition-all ${t.isLight?'bg-slate-100 hover:bg-slate-200 text-slate-600':'bg-white/[0.07] hover:bg-white/[0.12] text-white/60'}`}>
                          Change Avatar (10 choices)
                        </button>
                      </div>
                    </div>
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Text Size" t={t}/>
                    <div className="flex gap-1.5">
                      {([['sm','Small','aA'],['base','Normal','Aa'],['lg','Large','AA']] as [FontSize,string,string][]).map(([s,lbl,demo])=>(
                        <button key={s} onClick={()=>setFontSize(s)}
                          className={`flex-1 py-2.5 rounded-xl text-center transition-all ${fontSize===s?'text-white':t.sCard+' '+t.sSub}`}
                          style={fontSize===s?{background:`${t.glow}22`,border:`1px solid ${t.glow}35`,color:t.glow}:{}}>
                          <p className={s==='sm'?'text-[10px]':s==='lg'?'text-[14px]':'text-[12px]'}>{demo}</p>
                          <p className="text-[8px] mt-0.5 opacity-70">{lbl}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>)}

                {settingsTab==='ai' && (<>
                  <div>
                    <SLabel label="Response Length" t={t}/>
                    <div className="flex gap-1.5">
                      {(['short','medium','long'] as ResponseLength[]).map(l=>(
                        <button key={l} onClick={()=>setResponseLength(l)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold capitalize transition-all ${responseLength===l?'text-white':t.sCard+' '+t.sSub}`}
                          style={responseLength===l?{background:`linear-gradient(135deg,${t.glow},${t.glow}88)`,boxShadow:`0 2px 14px ${t.glow}40`}:{}}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Language" t={t}/>
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
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Behaviour" t={t}/>
                    <div className="space-y-2.5">
                      <Toggle label="Auto Web Search" sub="Fetches current info automatically" checked={autoSearch} onChange={setAutoSearch} color={t.glow} t={t}/>
                      <Toggle label="Proactive Messages" sub="She'll reach out to check on you" checked={proactiveMode} onChange={setProactiveMode} color={t.glow} t={t}/>
                      <Toggle label="Auto Memory" sub="Remembers facts from your chats" checked={autoMemory} onChange={setAutoMemory} color={t.glow} t={t}/>
                      <Toggle label="Typing Animation" sub="Streams response letter by letter" checked={typingEffect} onChange={setTypingEffect} color={t.glow} t={t}/>
                      <Toggle label="Voice Output" sub="Read responses aloud via TTS" checked={voiceOutput} onChange={setVoiceOutput} color={t.glow} t={t}/>
                      <Toggle label="Sound Effects" sub="Chime when message is sent" checked={sfx} onChange={setSfx} color={t.glow} t={t}/>
                    </div>
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Memory" t={t}/>
                    <div className={`p-3 rounded-xl ${t.sCard} mb-2`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-[11px] font-medium ${t.sText}`}>{getAllMemories().length} facts stored</p>
                          <p className={`text-[9px] mt-0.5 ${t.sSub}`}>From your past conversations</p>
                        </div>
                        <Brain size={16} style={{color:t.glow}}/>
                      </div>
                    </div>
                    <button onClick={()=>{if(confirm('Clear all memories? This cannot be undone.')) clearAllMemories();}}
                      className="w-full py-2 rounded-xl text-[11px] border border-red-500/22 bg-red-500/[0.07] hover:bg-red-500/14 text-red-400 transition-all font-medium">
                      🗑️ Clear All Memories
                    </button>
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Mode" t={t}/>
                    {!isCreatorMode ? (
                      <button onClick={()=>{setShowSecretModal(true);setShowSettings(false);}}
                        className="w-full py-2.5 rounded-xl text-[11px] font-bold border border-pink-500/22 text-pink-400 hover:bg-pink-500/10 transition-all flex items-center justify-center gap-2"
                        style={{background:'linear-gradient(135deg,rgba(236,72,153,0.06),rgba(168,85,247,0.06))'}}>
                        <Heart size={12} className="text-pink-400"/>Unlock Creator Mode
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="px-3 py-2.5 rounded-xl border border-pink-500/20 bg-pink-500/[0.06] flex items-center gap-2">
                          <Heart size={11} className="text-pink-400 fill-pink-400 animate-pulse"/>
                          <span className="text-[11px] text-pink-400 font-bold">Creator Mode Active 💝</span>
                        </div>
                        <button onClick={()=>{exitCreatorMode();setShowSettings(false);}}
                          className={`w-full py-2 rounded-xl text-[11px] transition-all ${t.sCard} ${t.sSub}`}>
                          Exit to Standard Mode
                        </button>
                      </div>
                    )}
                  </div>
                </>)}

                {settingsTab==='display' && (<>
                  <div>
                    <SLabel label="Display" t={t}/>
                    <div className="space-y-2.5">
                      <Toggle label="Animations & Effects" sub="Glows, particles, transitions" checked={animations} onChange={setAnimations} color={t.glow} t={t}/>
                      <Toggle label="Compact Messages" sub="Reduces message padding" checked={compactMode} onChange={setCompactMode} color={t.glow} t={t}/>
                      <Toggle label="Show Timestamps" sub="Time on every message" checked={showTimestamps} onChange={setShowTimestamps} color={t.glow} t={t}/>
                      <Toggle label="Mood Badge" sub="Shows emotional state in header" checked={showMoodBadge} onChange={setShowMoodBadge} color={t.glow} t={t}/>
                      <Toggle label="Message Grouping" sub="Groups consecutive messages" checked={messageGrouping} onChange={setMessageGrouping} color={t.glow} t={t}/>
                      <Toggle label="Send on Enter" sub="Shift+Enter for new line" checked={sendOnEnter} onChange={setSendOnEnter} color={t.glow} t={t}/>
                      <Toggle label="Word Count" sub="Shows character count while typing" checked={showWordCount} onChange={setShowWordCount} color={t.glow} t={t}/>
                      <Toggle label="Browser Notifications" sub="Push alerts from Tessa" checked={notifications}
                        onChange={(v) => {
                          setNotifications(v);
                          if (v && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
                            Notification.requestPermission().then(p => {
                              if (p !== 'granted') setNotifications(false);
                            });
                          }
                        }} color={t.glow} t={t}/>
                    </div>
                  </div>
                </>)}

                {settingsTab==='data' && (<>
                  <div>
                    <SLabel label="Storage" t={t}/>
                    {isCreatorMode ? (
                      <div className={`p-3 rounded-xl ${t.sCard} space-y-2`}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                          <p className={`text-[11px] font-bold text-emerald-400`}>Creator Sync Active</p>
                        </div>
                        <p className={`text-[10px] ${t.sSub} leading-relaxed`}>
                          All your data (memories, health, streaks, settings) syncs automatically across every device where Creator Mode is unlocked. No login required — the secret key is your identity.
                        </p>
                        <div className={`text-[10px] font-medium mt-1 ${t.sSub}`}>
                          Status: <span style={{color:t.glow}}>{syncStatus==='syncing'?'Syncing now…':syncStatus==='synced'?'✓ Synced just now':'● Ready to sync'}</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Toggle label="Auto-save Chats"
                          sub={user&&!isGuest?'☁️ Synced to cloud via your account':'📱 Saved to local storage only (sign in to sync)'}
                          checked={autoSave} onChange={setAutoSave} color={t.glow} t={t}/>
                        {!user&&(
                          <button onClick={()=>{setShowAuthModal(true);setShowSettings(false);}}
                            className={`w-full mt-2 py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.btnS}`}
                            style={{border:`1px solid ${t.glow}22`}}>
                            <Database size={11} style={{color:t.glow}}/>Sign in to enable cloud sync
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Export / Import" t={t}/>
                    <div className="space-y-1.5">
                      <button onClick={()=>{
                        const data=JSON.stringify(conversations,null,2);
                        const blob=new Blob([data],{type:'application/json'});
                        const url=URL.createObjectURL(blob);
                        const a=document.createElement('a'); a.href=url; a.download='tessa-chats.json'; a.click();
                      }} className={`w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.btnS}`}>
                        <Download size={12}/>Export Conversations
                      </button>
                      <button onClick={()=>{
                        const inp=document.createElement('input'); inp.type='file'; inp.accept='.json';
                        inp.onchange=(e:any)=>{
                          const file=e.target.files[0]; if(!file) return;
                          const reader=new FileReader();
                          reader.onload=(ev)=>{
                            try{const d=JSON.parse(ev.target?.result as string);if(Array.isArray(d)){setConversations(d);lsSet('tessa-conversations',JSON.stringify(d));alert(`Imported ${d.length} conversations`);}}catch{alert('Invalid file');}
                          };
                          reader.readAsText(file);
                        };
                        inp.click();
                      }} className={`w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.btnS}`}>
                        <Upload size={12}/>Import Conversations
                      </button>
                    </div>
                  </div>
                  <Hr cls={t.div}/>
                  <div>
                    <SLabel label="Danger Zone" t={t}/>
                    <div className="space-y-1.5">
                      <button onClick={()=>{if(confirm('Delete ALL conversations? This cannot be undone.')){{setConversations([]);lsRemove('tessa-conversations');}}}}
                        className="w-full py-2 rounded-xl text-[11px] border border-red-500/22 bg-red-500/[0.07] hover:bg-red-500/14 text-red-400 transition-all">
                        🗑️ Delete All Conversations
                      </button>
                      <button onClick={()=>{if(confirm('Reset ALL settings to defaults?')){{
                        setTheme('dark');setResponseLength('medium');setAutoSearch(true);
                        setVoiceOutput(false);setAnimations(true);setSfx(true);setAutoSave(true);
                        setFontSize('base');setLanguage('en');setCompactMode(false);setTypingEffect(true);
                        setShowTimestamps(true);setShowMoodBadge(true);setSendOnEnter(true);
                        setAutoMemory(true);setShowWordCount(false);setMessageGrouping(true);setProactiveMode(true);
                      }}}}
                        className={`w-full py-2 rounded-xl text-[11px] font-medium flex items-center justify-center gap-2 transition-all ${t.sCard} ${t.sSub}`}>
                        <RotateCcw size={11}/>Reset All Settings
                      </button>
                    </div>
                  </div>
                </>)}

                {settingsTab==='about' && (<>
                  <div className="text-center py-2">
                    <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden border-2 mb-3"
                      style={{borderColor:`${t.glow}40`,boxShadow:`0 0 20px ${t.glow}25`}}>
                      <img src={avatarSrc} alt="Tessa" className="w-full h-full object-cover"
                        onError={e=>{(e.currentTarget as HTMLImageElement).src=AVATARS[0].path;}}/>
                    </div>
                    <p className="text-xl font-black tracking-[0.25em] uppercase" style={{color:t.glow}}>TESSA</p>
                    <p className={`text-[10px] mt-1 max-w-[180px] mx-auto ${t.sSub}`}>The Exceptional System, Surpassing ALL</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold"
                      style={{background:`${t.glow}18`,border:`1px solid ${t.glow}28`,color:t.glow}}>
                      <Sparkles size={9}/>v7.0 · AI-Powered · 10 Avatars
                    </div>
                  </div>
                  <Hr cls={t.div}/>
                  <div className="space-y-1.5">
                    {[
                      ['Model','Claude Sonnet'],
                      ['Mode', isCreatorMode?'Creator 💝':'Standard'],
                      ['Storage', user&&!isGuest?'Cloud':'Local'],
                      ['Conversations',`${shownConvs.length} saved`],
                      ['Memories',`${getAllMemories().length} facts`],
                      ['Theme', theme==='ankit'?"Ankit's Special (Creator)":theme.charAt(0).toUpperCase()+theme.slice(1)],
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

                <div className="h-6"/>
              </div>
            </div>
          )}

          {/* Avatar picker */}
          {showAvatarPickerInSettings && (
            <AvatarPickerModal
              current={avatarId}
              onSelect={(id) => { setAvatarId(id); lsSet('tessa-avatar', id); }}
              onClose={() => setShowAvatarPickerInSettings(false)}
              t={t} glow={t.glow}
            />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN COLUMN
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10" style={{height:"100dvh"}}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <header className={`flex-shrink-0 ${t.header} px-3 md:px-5 safe-top`}>
          <div className="flex items-center justify-between gap-2 h-[60px]">

            {/* Left cluster */}
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={()=>setShowSidebar(p=>!p)}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.08] active:scale-90 ${showSidebar?'bg-white/[0.08]':''}`}>
                {showSidebar?<X size={18}/>:<Menu size={18}/>}
              </button>

              {/* Avatar — clickable opens avatar picker */}
              <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                <div
                  className="w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all duration-500 hover:scale-105"
                  style={{
                    borderColor:`${t.glow}65`,
                    boxShadow:animations?`0 0 20px ${t.glow}35,0 0 40px ${t.glow}12`:'none',
                  }}
                >
                  <img
                    src={selectedAvatar.path}
                    alt={selectedAvatar.name}
                    className="w-full h-full object-cover"
                    onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}
                  />
                </div>
                {/* Pulsing status dot */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px]"
                  style={{background:t.glow,borderColor:'rgba(0,0,0,0.7)',boxShadow:`0 0 8px ${t.glow}`}}>
                  <div className="status-ping absolute inset-0 rounded-full animate-ping" style={{background:t.glow,opacity:0.4}} />
                </div>
              </div>

              {/* Name block */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className={`font-black text-[13px] leading-none tracking-[0.12em] uppercase ${t.accent}`}>
                    TESSA
                  </h1>
                  {isCreatorMode && (
                    <Heart size={11} className="text-pink-400 fill-pink-400 flex-shrink-0 animate-pulse" />
                  )}
                  {/* Sync dot — always shows in creator mode */}
                  {isCreatorMode && (
                    <span title={syncStatus==='syncing'?'Syncing…':syncStatus==='synced'?'Synced ✓':'Universal sync active'}
                      className="flex-shrink-0 w-1.5 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        background: syncStatus==='syncing'?'#f59e0b':syncStatus==='synced'?'#22c55e':syncStatus==='error'?'#ef4444':'#22c55e',
                        boxShadow: syncStatus==='syncing'?'0 0 6px #f59e0b':syncStatus==='synced'?'0 0 6px #22c55e':'0 0 5px #22c55e66',
                        animation: syncStatus==='syncing'?'pulse 1s infinite':'none',
                      }}/>
                  )}
                </div>
                <p className={`text-[10px] mt-0.5 truncate leading-none ${t.sub}`}>
                  {isCreatorMode
                    ? `Personal AI · ${moodEmoji} ${moodLabel} · 🔗 Synced`
                    : `${TESSA.tagline} · ${moodEmoji} ${moodLabel}`}
                </p>
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-0.5 flex-shrink-0">

              {/* ── DESKTOP: all buttons visible ── */}
              <div className="hidden md:flex items-center gap-0.5">
                {showMoodBadge && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium mr-1"
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
                {isCreatorMode&&(
                  <button onClick={()=>setShowWellness(p=>!p)} title="Wellness"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showWellness?'text-white':'hover:bg-white/[0.07] '+t.sub}`}
                    style={showWellness?{background:`${t.glow}14`,outline:`1px solid ${t.glow}25`}:{}}>
                    <Activity size={16}/>
                  </button>
                )}
                {isCreatorMode&&(
                  <button onClick={()=>setShowDashboard(p=>!p)} title="Insights Panel"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showDashboard?'text-pink-300':'hover:bg-white/[0.07] '+t.sub}`}
                    style={showDashboard?{background:`${t.glow}12`,outline:`1px solid ${t.glow}25`}:{}}>
                    <LayoutDashboard size={16}/>
                  </button>
                )}
                {isCreatorMode&&(
                  <button onClick={()=>setInsightsOpen(p=>!p)} title="Tessa Insights"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${insightsOpen?'text-white':'hover:bg-white/[0.07] '+t.sub}`}
                    style={insightsOpen?{background:`${t.glow}14`,outline:`1px solid ${t.glow}25`}:{}}>
                    <Brain size={16}/>
                  </button>
                )}
                {isCreatorMode&&(
                  <button onClick={tessaAutoAnalyse} disabled={tessaAnalysing}
                    title="Analyse Everything — Tessa reads all your data"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-50 ${tessaAnalysing?'text-white':'hover:bg-white/[0.07] '+t.sub}`}
                    style={tessaAnalysing?{background:`${t.glow}18`,outline:`1px solid ${t.glow}30`}:{}}>
                    {tessaAnalysing
                      ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-70"/>
                      : <Zap size={16}/>
                    }
                  </button>
                )}
                <button onClick={()=>setTheme(theme==='light'?'dark':'light')} title="Toggle theme"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.07] ${t.sub}`}>
                  {theme==='light'?<Moon size={16}/>:<Sun size={16}/>}
                </button>
                <button onClick={()=>{setShowSettings(p=>!p);setSettingsTab('main');}} title="Settings"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showSettings?'text-white/90':'hover:bg-white/[0.07] '+t.sub}`}
                  style={showSettings?{background:`${t.glow}12`,outline:`1px solid ${t.glow}22`}:{}}>
                  <Settings size={16}/>
                </button>
              </div>

              {/* ── MOBILE: only theme + settings + ⋯ overflow ── */}
              <div className="flex md:hidden items-center gap-1">
                <button onClick={()=>setTheme(theme==='light'?'dark':'light')}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.sub}`}>
                  {theme==='light'?<Moon size={16}/>:<Sun size={16}/>}
                </button>
                <button onClick={()=>{setShowSettings(p=>!p);setSettingsTab('main');}}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${showSettings?'text-white/90':t.sub}`}
                  style={showSettings?{background:`${t.glow}12`,outline:`1px solid ${t.glow}22`}:{}}>
                  <Settings size={16}/>
                </button>
                {/* ⋯ overflow menu — all extra actions */}
                <button onClick={()=>setShowMobileMenu(p=>!p)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${showMobileMenu?'text-white':t.sub}`}
                  style={showMobileMenu?{background:`${t.glow}14`,outline:`1px solid ${t.glow}28`}:{}}>
                  <span className="text-[18px] leading-none font-bold" style={{letterSpacing:'-1px'}}>···</span>
                </button>
              </div>

            </div>
          </div>
        </header>

        {/* ── MOBILE OVERFLOW MENU ── */}
        {showMobileMenu && (
          <>
            <div className="fixed inset-0 z-40 md:hidden" onClick={()=>setShowMobileMenu(false)}/>
            <div className="fixed top-[calc(env(safe-area-inset-top,0px)+64px)] right-3 z-50 md:hidden"
              style={{animation:'mobileMenuSlideUp 0.2s cubic-bezier(0.34,1.4,0.64,1)'}}>
              <div className={`rounded-2xl overflow-hidden border shadow-2xl`}
                style={{
                  minWidth:200,
                  background:t.isLight?'rgba(255,255,255,0.97)':'rgba(8,10,24,0.97)',
                  border:`1px solid ${t.glow}28`,
                  boxShadow:`0 8px 32px rgba(0,0,0,0.45), 0 0 20px ${t.glow}12`,
                  backdropFilter:'blur(20px)',
                }}>
                {isCreatorMode&&(<>
                  <button onClick={()=>{setShowWellness(p=>!p);setShowMobileMenu(false);}}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-[12px] font-medium transition-colors ${showWellness?'':'hover:bg-white/5'}`}
                    style={showWellness?{color:t.glow,background:`${t.glow}12`}:{color:t.isLight?'#374151':'rgba(255,255,255,0.75)'}}>
                    <Activity size={15} style={{color:t.glow}}/> Wellness
                  </button>
                  <button onClick={()=>{setInsightsOpen(p=>!p);setShowMobileMenu(false);}}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-[12px] font-medium transition-colors ${insightsOpen?'':'hover:bg-white/5'}`}
                    style={insightsOpen?{color:t.glow,background:`${t.glow}12`}:{color:t.isLight?'#374151':'rgba(255,255,255,0.75)'}}>
                    <Brain size={15} style={{color:t.glow}}/> Insights
                  </button>
                  <button onClick={()=>{setShowPlanners(true);setShowMobileMenu(false);}}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[12px] font-medium hover:bg-white/5 transition-colors"
                    style={{color:t.isLight?'#374151':'rgba(255,255,255,0.75)'}}>
                    <Calendar size={15} style={{color:t.glow}}/> Planners
                  </button>
                  <button onClick={()=>{setShowDashboard(p=>!p);setShowMobileMenu(false);}}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-[12px] font-medium transition-colors ${showDashboard?'':'hover:bg-white/5'}`}
                    style={showDashboard?{color:t.glow,background:`${t.glow}12`}:{color:t.isLight?'#374151':'rgba(255,255,255,0.75)'}}>
                    <LayoutDashboard size={15} style={{color:t.glow}}/> My Dashboard
                  </button>
                  <button onClick={()=>{tessaAutoAnalyse();setShowMobileMenu(false);}} disabled={tessaAnalysing}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[12px] font-bold transition-colors disabled:opacity-60"
                    style={{color: t.glow, background:`${t.glow}10`}}>
                    <Zap size={15} style={{color:t.glow}}/>
                    {tessaAnalysing ? 'Analysing…' : 'Analyse Everything'}
                  </button>
                  <div style={{height:1,background:`${t.glow}15`,margin:'0 12px'}}/>
                </>)}
              </div>
            </div>
          </>
        )}

        {/* ── WELLNESS FLOATING PANEL ── */}
        {showWellness && isCreatorMode && (
          <>
            {/* Full backdrop — blurs chat completely */}
            <div className="fixed inset-0 z-[48]"
              style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
              onClick={()=>setShowWellness(false)}/>
            <div className="fixed bottom-[76px] left-1/2 z-[49]"
              style={{transform:'translateX(-50%)',width:'min(480px,94vw)',animation:'floatIn 0.28s cubic-bezier(0.22,1,0.36,1)',willChange:'transform,opacity'}}>
              <div className="rounded-2xl overflow-hidden"
                style={{
                  background: t.isLight ? 'rgba(255,255,255,0.99)' : 'rgba(8,10,28,0.99)',
                  border: `1px solid ${t.glow}35`,
                  boxShadow: `0 0 0 1px ${t.glow}15, 0 -8px 60px rgba(0,0,0,0.8), 0 0 40px ${t.glow}20`,
                  backdropFilter: 'blur(32px)',
                }}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3"
                  style={{borderBottom:`1px solid ${t.glow}20`,background: t.isLight ? `linear-gradient(135deg, white, ${t.glow}08)` : `linear-gradient(135deg, rgba(255,255,255,0.04), ${t.glow}10)`}}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`linear-gradient(135deg,${t.glow},${t.glow}88)`}}>
                      <Activity size={13} className="text-white"/>
                    </div>
                    <div>
                      <span className="text-[12px] font-black tracking-wide" style={{color:t.glow}}>Wellness</span>
                      <span className={`ml-2 text-[9px] px-2 py-0.5 rounded-full ${t.sub}`}
                        style={{background:`${t.glow}12`,border:`1px solid ${t.glow}22`}}>
                        {moodEmoji} {moodLabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>{addWater(1);setWellnessVersion(v=>v+1);if(user&&!isGuest)pushCreatorSync(user.id);}}
                      className="text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold transition-all active:scale-90"
                      style={{background:`linear-gradient(135deg,rgba(59,130,246,0.18),rgba(6,182,212,0.12))`,border:'1px solid rgba(59,130,246,0.3)',color:'#60a5fa'}}>
                      <Droplets size={10}/>Log Water
                    </button>
                    <button onClick={()=>setShowWellness(false)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                      style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171'}}>
                      <X size={12}/>
                    </button>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-3 overflow-y-auto" style={{maxHeight:'55vh'}}>
                  <DailyWellness isCreatorMode={isCreatorMode} refreshTrigger={wellnessVersion} isLight={t.isLight} accentColor={t.glow}/>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── MESSAGES AREA ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-5 scroll-smooth">
          <div className="max-w-2xl mx-auto w-full">

            {showDashboard&&isCreatorMode ? (
              <div className="panel-fade">
                <PersonalDashboard isLight={t.isLight} accentColor={t.glow} />
              </div>
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
                        <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                          onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                      </div>
                      {animations&&<div className="absolute inset-0 rounded-[2rem] animate-ping"
                        style={{border:`2px solid ${t.glow}18`}} />}
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
                        ? ['How are you today? 💕','Help me plan my day 📅','I need motivation 💪','Tell me something nice ✨','Study with me 📚','Play a game with me 🎮']
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
                      className={`msg-row flex gap-2.5 ${isUser?'justify-end':'justify-start'} ${isGrouped?'mt-0.5':'mt-2.5'} ${isUser?'pl-8 md:pl-16':'pr-8 md:pr-16'}`}
                    >
                      {/* LEFT: Tessa icon — clean glowing T, fits every theme */}
                      {!isUser && (
                        <div className="flex-shrink-0 flex flex-col justify-end" style={{width:30}}>
                          {!isGrouped && (
                            <div className="w-[30px] h-[30px] rounded-xl flex-shrink-0 mb-0.5 flex items-center justify-center"
                              style={{
                                background:`linear-gradient(135deg,${t.glow}22,${t.glow}0a)`,
                                border:`1.5px solid ${t.glow}38`,
                                boxShadow:animations?`0 1px 8px ${t.glow}20`:'none',
                              }}>
                              <span style={{
                                color:t.glow,
                                fontSize:14,
                                fontWeight:900,
                                letterSpacing:'-0.5px',
                                lineHeight:1,
                                fontFamily:'inherit',
                              }}>T</span>
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
                          className={`msg-bubble rounded-2xl overflow-hidden transition-all duration-300 ${isUser?t.msgU:t.msgA}`}
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
                        <img src={selectedAvatar.path} alt="Tessa" className="w-full h-full object-cover"
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
          <div className={`flex-shrink-0 ${t.bar} px-3 md:px-6 py-3 safe-bottom`}>
            <div className="max-w-2xl mx-auto w-full">

              {/* ── WEB SEARCH RESULTS DRAWER ── slides in above input */}
              {showSearchPanel && lastSearchData && (
                <div className="mb-2 rounded-2xl overflow-hidden border animate-in slide-in-from-bottom-2"
                  style={{ borderColor:`${t.glow}30`, background: t.isLight?'#ffffff':'#0d1117',
                    boxShadow:`0 -4px 24px rgba(0,0,0,0.15)` }}>
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b"
                    style={{ borderColor:`${t.glow}20`, background:`${t.glow}08` }}>
                    <div className="flex items-center gap-2">
                      <Globe size={12} style={{color:t.glow}}/>
                      <span className="text-[11px] font-bold" style={{color:t.glow}}>Web Results</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{background:`${t.glow}15`, color:t.glow}}>
                        LIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] ${t.sub} truncate max-w-[140px]`}>"{lastSearchData.query}"</span>
                      <button onClick={()=>setShowSearchPanel(false)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center ${t.btnS}`}>
                        <X size={10}/>
                      </button>
                    </div>
                  </div>
                  {/* Sources list */}
                  <div className="max-h-48 overflow-y-auto" style={{scrollbarWidth:'thin',scrollbarColor:`${t.glow}30 transparent`}}>
                    {lastSearchData.sources.map((src, i) => (
                      <div key={i} className="flex gap-3 px-3 py-2.5 border-b last:border-0 hover:bg-opacity-50 transition-colors"
                        style={{ borderColor:`${t.glow}12`, cursor:'pointer' }}
                        onClick={()=>window.open(src.url,'_blank')}>
                        {/* Favicon */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center mt-0.5"
                          style={{background:`${t.glow}15`}}>
                          <span className="text-[10px]">{['🌐','📰','🔗'][i%3]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold truncate" style={{color:t.isLight?'#1e40af':'#60a5fa'}}>
                            {src.title}
                          </p>
                          <p className={`text-[10px] mt-0.5 leading-relaxed line-clamp-2 ${t.sub}`}>
                            {src.snippet}
                          </p>
                          <p className={`text-[8.5px] mt-0.5 truncate opacity-50 ${t.sub}`}>{src.url}</p>
                        </div>
                        <ExternalLink size={10} className="flex-shrink-0 mt-1 opacity-40" style={{color:t.glow}}/>
                      </div>
                    ))}
                    {lastSearchData.sources.length === 0 && (
                      <p className={`text-[11px] px-3 py-3 ${t.sub}`}>No web sources cached — search is embedded in Tessa's reply.</p>
                    )}
                  </div>
                </div>
              )}

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
                <button onClick={startVoiceCall} disabled={isLoading||voiceCallOpen} title="Start voice call"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${voiceCallOpen?'bg-green-500/80 border border-green-400/50 text-white shadow-lg shadow-green-500/25 animate-pulse':t.btnS}`}>
                  <Mic size={16}/>
                </button>

                {/* Textarea */}
                <div className="flex-1 relative">
                  <textarea ref={textareaRef} value={input}
                    onChange={e=>setInput(e.target.value)}
                    onKeyDown={handleKeyDown} onInput={handleTextareaInput}
                    placeholder={isCreatorMode?`Tell me anything…`:`Message Tessa…`}
                    disabled={isLoading} rows={1}
                    className={`w-full px-4 py-2.5 rounded-xl resize-none outline-none transition-all duration-200 disabled:opacity-60 ${t.inp} ${fontSizeClass}`}
                    style={{minHeight:'44px',maxHeight:'144px',lineHeight:'1.5',color:t.isLight?'#1e293b':'#fff'}}
                  />
                  {showWordCount&&input.length>0&&(
                    <span className={`absolute right-3 bottom-2 text-[9px] ${t.sub}`}>{input.length}</span>
                  )}
                </div>

                {/* Send */}
                <button onClick={()=>sendMessage()} disabled={(!input.trim()&&!selectedImage)||isLoading}
                  title={sendOnEnter?'Send (Enter)':'Send'}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 ${t.btnP}`}>
                  {isLoading
                    ?<div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    :<Send size={16}/>}
                </button>
              </div>

              {/* Toolbar row — web search toggle + results button + hints */}
              <div className="flex items-center justify-between mt-1.5 px-0.5 gap-2">
                {/* Left: web search controls */}
                <div className="flex items-center gap-1.5">
                  {/* Web Search toggle button */}
                  <button
                    onClick={()=>setWebSearchOn(p=>!p)}
                    title={webSearchOn ? 'Web search ON — click to disable' : 'Enable live web search for this message'}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all active:scale-95"
                    style={{
                      background: webSearchOn ? `${t.glow}18` : 'transparent',
                      border: `1px solid ${webSearchOn ? t.glow+'50' : t.glow+'20'}`,
                      color: webSearchOn ? t.glow : undefined,
                    }}>
                    <Globe size={11} style={{color: webSearchOn ? t.glow : undefined}}/>
                    <span className="text-[10px] font-semibold" style={{color: webSearchOn ? t.glow : undefined}}>
                      {webSearchOn ? 'Web: ON' : 'Web'}
                    </span>
                    {webSearchOn && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>
                    )}
                  </button>

                  {/* Show Results button — only if we have results */}
                  {lastSearchData && (
                    <button
                      onClick={()=>setShowSearchPanel(p=>!p)}
                      title="View web search sources used"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all active:scale-95"
                      style={{
                        background: showSearchPanel ? `${t.glow}15` : 'transparent',
                        border: `1px solid ${t.glow}25`,
                      }}>
                      <ExternalLink size={10} style={{color:t.glow}}/>
                      <span className="text-[10px] font-medium" style={{color:t.glow}}>
                        {showSearchPanel ? 'Hide sources' : `Sources (${lastSearchData.sources.length})`}
                      </span>
                    </button>
                  )}
                </div>

                {/* Right: hints */}
                <div className="flex items-center gap-2.5">
                  <p className={`text-[9px] ${t.sub}`}>
                    {isRecording ? '🎤 Listening…' : sendOnEnter ? 'Enter ↵ send' : ''}
                  </p>
                  {autoSearch&&!isCreatorMode&&!webSearchOn&&(
                    <span className={`text-[9px] ${t.sub} flex items-center gap-1 opacity-60`}>
                      <span>🔍</span>auto
                    </span>
                  )}
                  {isCreatorMode&&(
                    <span className="text-[9px] text-pink-400/60 flex items-center gap-1">
                      <Heart size={7}/>Creator
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT WELLNESS PANEL — desktop only, no mobile overlay
      ═══════════════════════════════════════════════════════════════════ */}
      {showDashboard&&isCreatorMode&&(
        <aside className={`hidden md:flex flex-col flex-shrink-0 h-screen overflow-hidden border-l w-[210px] transition-all duration-300 ${t.panel}`}>
          {/* Header */}
          <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b ${t.div}`}>
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} style={{color:t.glow}}/>
              <span className={`text-[11px] font-black tracking-wide ${t.accent}`}>Focus</span>
            </div>
            <button onClick={()=>setShowDashboard(false)} className="p-1 rounded-lg hover:bg-white/8 transition-colors">
              <X size={12} className={t.sub}/>
            </button>
          </div>

          {/* Mood strip */}
          <div className={`flex-shrink-0 mx-2.5 mt-2 mb-0 px-2.5 py-2 rounded-xl flex items-center gap-2 ${t.card}`}
            style={{border:`1px solid ${t.glow}18`}}>
            <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 border" style={{borderColor:`${t.glow}35`}}>
              <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover" onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold truncate" style={{color:t.glow}}>TESSA {isCreatorMode&&'💝'}</p>
              <p className={`text-[8px] truncate ${t.sub}`}>{moodEmoji} {moodLabel}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2">
            {/* ── ANALYSE EVERYTHING button ── */}
            <button onClick={tessaAutoAnalyse} disabled={tessaAnalysing}
              className="w-full py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-60"
              style={{
                background:`linear-gradient(135deg,${t.glow},${glow2})`,
                color:'white',
                boxShadow:`0 3px 14px ${t.glow}35`,
              }}>
              {tessaAnalysing
                ? <><div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin"/><span>Analysing…</span></>
                : <><Zap size={11}/><span>Analyse Everything</span></>
              }
            </button>
            {/* Memory */}
            <div className={`rounded-xl p-2.5 ${t.card}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Brain size={10} style={{color:t.glow}}/>
                  <span className={`text-[10px] font-bold ${t.accent}`}>Memory</span>
                </div>
                <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full`}
                  style={{background:`${t.glow}15`,color:t.glow}}>{getAllMemories().length}</span>
              </div>
              <button onClick={()=>{if(confirm('Clear all memories?')) clearAllMemories();}}
                className="w-full py-1.5 rounded-lg text-[9px] border border-red-500/20 bg-red-500/[0.06] hover:bg-red-500/12 text-red-400 transition-all">
                Clear All
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── VOICE CALL WINDOW — floating draggable phone-call UI ── */}
      <VoiceCallWindow />

      {/* ── FLOATING STUDY TIMER ── */}
      {showTimerFloat && (
        <StudyTimer
          floating
          onClose={() => setShowTimerFloat(false)}
          defaultMinutes={25}
        />
      )}

      {/* ── UNIFIED BOTTOM DOCK — HealthPulse + Tessa Sports together ── */}
      <FloatingDock
        glow={t.glow} isLight={t.isLight}
        showHealth={!!isCreatorMode}
        hidden={showSettings || showDashboard}
        onHealthSync={() => setWellnessVersion(v => v + 1)}
      />

      {/* ── FLOATING INSIGHTS PANEL ── */}
      {insightsOpen && isCreatorMode && (
        <>
          {/* Full backdrop — blurs chat completely */}
          <div className="fixed inset-0 z-[48]"
            style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
            onClick={()=>setInsightsOpen(false)}/>
          <div className="fixed bottom-[76px] left-1/2 z-[49]"
            style={{transform:'translateX(-50%)',width:'min(420px,94vw)',animation:'floatIn 0.28s cubic-bezier(0.22,1,0.36,1)',willChange:'transform,opacity'}}>
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: t.isLight ? 'rgba(255,255,255,0.99)' : 'rgba(8,10,28,0.99)',
                border: `1px solid ${t.glow}35`,
                boxShadow: `0 0 0 1px ${t.glow}15, 0 -8px 60px rgba(0,0,0,0.8), 0 0 36px ${t.glow}20`,
                backdropFilter: 'blur(32px)',
              }}>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3"
                style={{borderBottom:`1px solid ${t.glow}20`,background: t.isLight ? `linear-gradient(135deg, white, ${t.glow}08)` : `linear-gradient(135deg, rgba(255,255,255,0.04), ${t.glow}10)`}}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`linear-gradient(135deg,${t.glow},${t.glow}88)`}}>
                    <Brain size={13} className="text-white"/>
                  </div>
                  <div>
                    <span className="text-[12px] font-black tracking-wide" style={{color:t.glow}}>Tessa&apos;s Insights</span>
                    <span className={`ml-2 text-[9px] ${t.sub}`}>{moodEmoji} {moodLabel}</span>
                  </div>
                </div>
                <button onClick={()=>setInsightsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-90"
                  style={{background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',color:'#f87171'}}>
                  <X size={12}/>
                </button>
              </div>
              <div className="p-4 overflow-y-auto" style={{maxHeight:'55vh'}}>
                <TessaInsights isCreatorMode={isCreatorMode}/>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── MODALS ── */}
      {showSecretModal&&<SecretVerification onSuccess={unlockCreatorModeAction} onClose={()=>setShowSecretModal(false)}/>}
      {showAvatarModal&&(
        <>
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={()=>setShowAvatarModal(false)}/>

          {/* Bottom sheet on mobile, centered card on desktop */}
          <div className="fixed inset-x-0 bottom-0 z-50 md:inset-0 md:flex md:items-center md:justify-center md:p-6"
            style={{animation:'slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)'}}>

            <div className="relative w-full md:max-w-lg rounded-t-[32px] md:rounded-3xl overflow-hidden"
              style={{
                background: t.isLight ? '#fafafa' : '#0d0f1e',
                border: `1px solid ${t.glow}20`,
                boxShadow:`0 -4px 32px rgba(0,0,0,0.45), 0 0 40px ${t.glow}08`,
                maxHeight: '92dvh',
                display: 'flex',
                flexDirection: 'column',
              }}>

              {/* Drag pill */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-9 h-1 rounded-full" style={{background:`${t.glow}35`}}/>
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                <div>
                  <p className="font-black text-[15px]" style={{color: t.isLight?'#111827':'rgba(255,255,255,0.92)'}}>
                    Choose Avatar
                  </p>
                  <p className="text-[11px] mt-0.5" style={{color: t.isLight?'#9ca3af':'rgba(255,255,255,0.35)'}}>
                    {AVATARS.length} styles · tap to apply
                  </p>
                </div>
                <button onClick={()=>setShowAvatarModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90"
                  style={{background:`${t.glow}12`, border:`1px solid ${t.glow}22`}}>
                  <X size={14} style={{color:t.glow}}/>
                </button>
              </div>

              {/* Grid — scrollable, 2 cols mobile / 5 desktop */}
              <div className="overflow-y-auto flex-1 px-4 pb-3 grid grid-cols-2 md:grid-cols-5 gap-3"
                style={{gridAutoRows:'1fr'}}>
                {AVATARS.map(av=>{
                  const isCurrent = avatarId===av.id;
                  return (
                    <button key={av.id}
                      onClick={()=>{setAvatarId(av.id);lsSet('tessa-avatar',av.id);setShowAvatarModal(false);}}
                      className="group relative rounded-2xl overflow-hidden active:scale-95"
                      style={{
                        aspectRatio:'1',
                        minHeight: 130,
                        boxShadow: isCurrent ? `0 0 0 3px ${t.glow}` : 'none',
                        border: `1.5px solid ${isCurrent ? t.glow : (t.isLight?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)')}`,
                        transition: 'transform 0.1s ease, border-color 0.15s ease',
                      }}>
                      <img src={av.path} alt={av.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
                      {/* Gradient name overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3"
                        style={{background:'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 55%)'}}>
                        <span className="text-xl mb-0.5">{av.emoji}</span>
                        <p className="text-[12px] font-bold text-white drop-shadow-md leading-none">{av.name}</p>
                        <p className="text-[10px] text-white/70 mt-0.5">{av.desc}</p>
                      </div>
                      {isCurrent&&(
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
                          style={{background:t.glow, boxShadow:`0 2px 8px ${t.glow}60`}}>
                          <Check size={12} className="text-white"/>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Safe-area bottom padding */}
              <div className="pb-safe-bottom pb-6 md:pb-4 px-5 pt-3 border-t"
                style={{borderColor:`${t.glow}15`}}>
                <p className="text-[10px] text-center" style={{color:t.isLight?'#9ca3af':'rgba(255,255,255,0.25)'}}>
                  Place PNG files in <span className="font-mono">/public/avatars/</span> to add more
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {showPlanners&&<PlannerHub onClose={()=>setShowPlanners(false)}/>}
      {showFlashcards&&<FlashcardGenerator isCreatorMode={isCreatorMode} onClose={()=>setShowFlashcards(false)}/>}
      {showReportCard&&<ReportCard isCreatorMode={isCreatorMode} onClose={()=>setShowReportCard(false)}/>}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            checkAuth();
          }}
        />
      )}
    </div>
  );
}
