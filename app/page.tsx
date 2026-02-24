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
// AVATAR SYSTEM — 10 avatars
// ─────────────────────────────────────────────────────────────────────────────
interface AvatarDef {
  id: string; path: string; name: string; emoji: string; desc: string;
}

const AVATARS: AvatarDef[] = [
  {id:'cosmic',   name:'Cosmic',   emoji:'🌌', desc:'Space explorer',   path:'/avatars/cosmic.png'},
  {id:'sunset',   name:'Sunset',   emoji:'🌅', desc:'Golden hour',      path:'/avatars/sunset.png'},
  {id:'galaxy',   name:'Galaxy',   emoji:'✨', desc:'Star cluster',     path:'/avatars/galaxy.png'},
  {id:'forest',   name:'Forest',   emoji:'🌲', desc:'Nature spirit',    path:'/avatars/forest.png'},
  {id:'ocean',    name:'Ocean',    emoji:'🌊', desc:'Deep waters',      path:'/avatars/ocean.png'},
  {id:'aurora',   name:'Aurora',   emoji:'🌈', desc:'Northern lights',  path:'/avatars/aurora.png'},
  {id:'sakura',   name:'Sakura',   emoji:'🌸', desc:'Cherry blossom',   path:'/avatars/sakura.png'},
  {id:'midnight', name:'Midnight', emoji:'🌙', desc:'Deep night',       path:'/avatars/midnight.png'},
  {id:'ember',    name:'Ember',    emoji:'🔥', desc:'Fire warmth',      path:'/avatars/ember.png'},
  {id:'crystal',  name:'Crystal',  emoji:'💎', desc:'Ice gem',          path:'/avatars/crystal.png'},
];

// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM
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
    settBg:'bg-[#07091a]/96 backdrop-blur-2xl border-t border-white/[0.07]',
    settBgC:'bg-[#0d0320]/96 backdrop-blur-2xl border-t border-pink-500/[0.09]',
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
    settBg:'bg-white/97 backdrop-blur-2xl border-t border-slate-200',
    settBgC:'bg-white/97 backdrop-blur-2xl border-t border-pink-200',
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
    settBg:'bg-[#09001a]/96 backdrop-blur-2xl border-t border-purple-500/[0.11]',
    settBgC:'bg-[#140010]/96 backdrop-blur-2xl border-t border-pink-500/[0.11]',
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
    settBg:'bg-[#030e1c]/96 backdrop-blur-2xl border-t border-teal-500/[0.09]',
    settBgC:'bg-[#070820]/96 backdrop-blur-2xl border-t border-purple-500/[0.09]',
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
    settBg:'bg-[#120905]/96 backdrop-blur-2xl border-t border-orange-500/[0.09]',
    settBgC:'bg-[#180810]/96 backdrop-blur-2xl border-t border-rose-500/[0.09]',
    settText:'text-orange-100/75', settTextHover:'hover:text-orange-50',
    settSub:'text-orange-300/30', settLabel:'text-orange-300/20',
    settCard:'bg-orange-950/[0.26] border border-orange-500/[0.12]',
    settActive:'bg-orange-500/[0.12] border border-orange-500/[0.26]',
    isLight:false,
  },
  pastel: {
    bg:'bg-[#f3efff]', bgC:'bg-[#fdf0ff]',
    panel:'bg-white/80 backdrop-blur-xl border-violet-200/60',
    panelC:'bg-fuchsia-50/85 backdrop-blur-xl border-fuchsia-200/55',
    header:'bg-white/72 backdrop-blur-2xl border-b border-violet-200/50 shadow-sm shadow-violet-100/40',
    headerC:'bg-white/72 backdrop-blur-2xl border-b border-fuchsia-200/50 shadow-sm shadow-fuchsia-100/40',
    bar:'bg-white/78 backdrop-blur-2xl border-t border-violet-200/50 shadow-sm shadow-violet-100/30',
    barC:'bg-white/78 backdrop-blur-2xl border-t border-fuchsia-200/50',
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
    settBg:'bg-white/96 backdrop-blur-2xl border-t border-violet-200',
    settBgC:'bg-white/96 backdrop-blur-2xl border-t border-fuchsia-200',
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-violet-50 border border-violet-200',
    settActive:'bg-violet-100 border border-violet-300',
    isLight:true,
  },
  sakura: {
    bg:'bg-[#fff2f5]', bgC:'bg-[#fff0f8]',
    panel:'bg-white/80 backdrop-blur-xl border-rose-200/55',
    panelC:'bg-pink-50/85 backdrop-blur-xl border-pink-200/55',
    header:'bg-white/72 backdrop-blur-2xl border-b border-rose-200/45 shadow-sm shadow-rose-100/40',
    headerC:'bg-white/72 backdrop-blur-2xl border-b border-pink-200/45 shadow-sm shadow-pink-100/40',
    bar:'bg-white/78 backdrop-blur-2xl border-t border-rose-200/45 shadow-sm shadow-rose-100/30',
    barC:'bg-white/78 backdrop-blur-2xl border-t border-pink-200/45',
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
    settBg:'bg-white/96 backdrop-blur-2xl border-t border-rose-200',
    settBgC:'bg-white/96 backdrop-blur-2xl border-t border-pink-200',
    settText:'text-slate-700', settTextHover:'hover:text-slate-900',
    settSub:'text-slate-400', settLabel:'text-slate-400',
    settCard:'bg-rose-50 border border-rose-200',
    settActive:'bg-rose-100 border border-rose-300',
    isLight:true,
  },
  // ── ANKIT'S SPECIAL — deep saffron, marigold & gold — like a royal Indian sunrise ─────
  ankit: {
    // Background: warm parchment with a deep golden sunrise glow bleeding in from top-left
    bg:'bg-[#fef9ee]',
    bgC:'bg-[#fff5e6]',
    // Panels: ivory with a strong saffron-gold shimmer edge
    panel:'bg-white/92 backdrop-blur-xl border-amber-500/50 shadow-lg shadow-amber-200/40',
    panelC:'bg-orange-50/95 backdrop-blur-xl border-orange-500/50 shadow-lg shadow-orange-200/40',
    // Header: deep marigold-gold gradient, rich and warm — distinctly royal
    header:'bg-gradient-to-r from-amber-100/95 via-yellow-50/90 to-orange-50/85 backdrop-blur-2xl border-b-2 border-amber-500/40 shadow-lg shadow-amber-400/20',
    headerC:'bg-gradient-to-r from-orange-200/90 via-amber-100/95 to-yellow-100/85 backdrop-blur-2xl border-b-2 border-orange-500/40 shadow-lg shadow-orange-400/25',
    // Input bar: warm ivory, strong shadow like a stone ledge in warm light
    bar:'bg-gradient-to-r from-amber-50/98 to-yellow-50/95 backdrop-blur-2xl border-t-2 border-amber-400/50 shadow-[0_-4px_24px_rgba(217,119,6,0.18)]',
    barC:'bg-gradient-to-r from-orange-50/98 to-amber-50/95 backdrop-blur-2xl border-t-2 border-orange-400/50 shadow-[0_-4px_24px_rgba(234,88,12,0.18)]',
    // Messages: user has rich marigold warmth, AI has clean ivory with gold left-bar
    msgU:'bg-gradient-to-br from-amber-200/80 via-yellow-100/70 to-amber-100/60 border border-amber-500/50 border-l-[5px] border-l-amber-600 shadow-md shadow-amber-300/35',
    msgUC:'bg-gradient-to-br from-orange-200/80 via-amber-100/70 to-yellow-100/60 border border-orange-500/50 border-l-[5px] border-l-orange-600 shadow-md shadow-orange-300/35',
    msgA:'bg-white/97 border border-amber-300/60 border-l-[5px] border-l-amber-500 shadow-md shadow-amber-100/60',
    msgAC:'bg-white/97 border border-orange-300/60 border-l-[5px] border-l-orange-500 shadow-md shadow-orange-100/60',
    // Input: clean white with rich saffron focus ring
    inp:'bg-white border-2 border-amber-400/60 text-amber-950 placeholder:text-amber-400/50 focus:border-amber-600 focus:ring-4 focus:ring-amber-400/15 shadow-sm shadow-amber-100/80',
    inpC:'bg-white border-2 border-orange-400/60 text-orange-950 placeholder:text-orange-400/50 focus:border-orange-600 focus:ring-4 focus:ring-orange-400/15 shadow-sm shadow-orange-100/80',
    // Buttons: deep saffron-to-amber gradient, very rich, almost like a button carved in gold
    btnP:'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 hover:from-amber-700 hover:via-orange-600 hover:to-amber-700 text-white shadow-xl shadow-amber-500/50 border border-amber-500/40 font-bold',
    btnPC:'bg-gradient-to-r from-orange-600 via-rose-500 to-orange-600 hover:from-orange-700 hover:via-rose-600 hover:to-orange-700 text-white shadow-xl shadow-orange-500/50 border border-orange-500/40 font-bold',
    btnS:'bg-gradient-to-br from-amber-100 to-yellow-50 hover:from-amber-200 hover:to-yellow-100 border-2 border-amber-400/70 text-amber-900 font-semibold hover:text-amber-950 shadow-md shadow-amber-200/60 hover:shadow-amber-300/50',
    btnSC:'bg-gradient-to-br from-orange-100 to-amber-50 hover:from-orange-200 hover:to-amber-100 border-2 border-orange-400/70 text-orange-900 font-semibold hover:text-orange-950 shadow-md shadow-orange-200/60',
    text:'text-amber-950', sub:'text-amber-700/75', subC:'text-orange-700/75',
    accent:'text-amber-800', accentC:'text-orange-800',
    // Glow: pure saffron + deep orange — vivid, warm
    glow:'#b45309', glowC:'#c2410c',
    // Cards: parchment with gold shimmer
    card:'bg-gradient-to-br from-white to-amber-50/80 border border-amber-400/55 shadow-md shadow-amber-200/50',
    cardC:'bg-gradient-to-br from-white to-orange-50/80 border border-orange-400/55 shadow-md shadow-orange-200/50',
    // Active states: rich golden fill
    active:'bg-gradient-to-br from-amber-300/80 to-yellow-200/70 border-2 border-amber-600/55 shadow-lg shadow-amber-400/45',
    activeC:'bg-gradient-to-br from-orange-300/80 to-amber-200/70 border-2 border-orange-600/55 shadow-lg shadow-orange-400/45',
    div:'border-amber-400/45', divC:'border-orange-400/45',
    // Settings: warm ivory, feels like reading on cream paper in sunlight
    settBg:'bg-gradient-to-br from-white via-amber-50/80 to-yellow-50/60 backdrop-blur-2xl border-t-2 border-amber-400/55',
    settBgC:'bg-gradient-to-br from-white via-orange-50/80 to-amber-50/60 backdrop-blur-2xl border-t-2 border-orange-400/55',
    settText:'text-amber-950', settTextHover:'hover:text-amber-950',
    settSub:'text-amber-700', settLabel:'text-amber-800',
    settCard:'bg-gradient-to-br from-amber-50 to-yellow-50/80 border border-amber-400/60 shadow-sm shadow-amber-200/40',
    settActive:'bg-gradient-to-br from-amber-200 to-yellow-100 border-2 border-amber-500/65 shadow-md shadow-amber-300/40',
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
    sText: T.settText, sTextH: T.settTextHover,
    sSub: T.settSub, sLabel: T.settLabel,
    sCard: T.settCard, sActive: T.settActive,
    isLight: T.isLight,
  };
}

function getSolidBg(t: ReturnType<typeof useT>) {
  return t.isLight
    ? 'bg-white/98 backdrop-blur-2xl'
    : 'bg-[#0a0c1d]/98 backdrop-blur-2xl';
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
// CREATOR SYNC
// ─────────────────────────────────────────────────────────────────────────────
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
async function pushCreatorSync(userId: string): Promise<void> {
  try {
    await supabase.from('creator_sync').upsert(
      { user_id: userId, payload: buildCreatorPayload(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  } catch {}
}
async function pullCreatorSync(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('creator_sync').select('payload,updated_at').eq('user_id', userId).single();
    if (error || !data?.payload) return false;
    const p   = data.payload as Record<string, any>;
    const rem = new Date(data.updated_at).getTime();
    const loc = new Date(lsGet('tessa-last-sync') ?? 0).getTime();
    if (rem <= loc) return false;
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

function AuroraBg({ glow, glow2, theme }: { glow: string; glow2: string; theme: Theme }) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="absolute rounded-full blur-[180px] animate-aurora-a"
        style={{ width:800, height:800, background:glow, opacity:0.07, top:'-25%', left:'-10%' }} />
      <div className="absolute rounded-full blur-[140px] animate-aurora-b"
        style={{ width:600, height:600, background:glow2, opacity:0.055, top:'30%', right:'-12%' }} />
      <div className="absolute rounded-full blur-[120px] animate-aurora-c"
        style={{ width:400, height:400, background:glow, opacity:0.045, bottom:'-8%', left:'40%' }} />
      <div className="absolute rounded-full blur-[200px]"
        style={{ width:500, height:300, background:glow2, opacity:0.03, top:'55%', left:'15%' }} />
      <div className="absolute inset-0" style={{
        backgroundImage:`radial-gradient(circle, ${glow}16 1px, transparent 1px)`,
        backgroundSize:'36px 36px', opacity:0.45,
      }} />
      <div className="absolute inset-0" style={{
        background:`radial-gradient(ellipse at 50% 0%, transparent 40%, rgba(0,0,0,0.55) 100%)`,
      }} />
    </div>
  );
}

function LightBg({ creator, theme }: { creator: boolean; theme: Theme }) {
  const configs: Record<string, { grad: string; blob1: string; blob2: string; blob3: string }> = {
    light: {
      grad: creator
        ? 'radial-gradient(ellipse 80% 60% at 20% 10%, #fce7f3 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #f3e8ff 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, #fff1f5 0%, transparent 70%)'
        : 'radial-gradient(ellipse 80% 60% at 20% 10%, #dbeafe 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, #ede9fe 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 50% 50%, #f0f9ff 0%, transparent 70%)',
      blob1: creator ? '#fce7f3' : '#dbeafe',
      blob2: creator ? '#f3e8ff' : '#ede9fe',
      blob3: creator ? '#fdf4ff' : '#e0f2fe',
    },
    pastel: {
      grad: 'radial-gradient(ellipse 90% 70% at 15% 5%, #ede9fe 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 85% 85%, #fae8ff 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 50% 50%, #f3efff 0%, transparent 65%)',
      blob1: '#ddd6fe', blob2: '#e879f9', blob3: '#c4b5fd',
    },
    sakura: {
      grad: 'radial-gradient(ellipse 90% 70% at 15% 5%, #ffe4e6 0%, transparent 50%), radial-gradient(ellipse 70% 60% at 88% 82%, #fce7f3 0%, transparent 50%), radial-gradient(ellipse 60% 50% at 50% 50%, #fff2f5 0%, transparent 65%)',
      blob1: '#fecdd3', blob2: '#f9a8d4', blob3: '#fda4af',
    },
    // Ankit: deep royal saffron — like dawn light on a marigold field
    ankit: {
      grad: creator
        ? 'radial-gradient(ellipse 95% 70% at 5% 0%, #fbbf24 0%, transparent 45%), radial-gradient(ellipse 75% 60% at 92% 88%, #fb923c 0%, transparent 45%), radial-gradient(ellipse 60% 50% at 50% 50%, #fef9ee 0%, transparent 55%), radial-gradient(ellipse 45% 40% at 70% 15%, #f97316 0%, transparent 40%)'
        : 'radial-gradient(ellipse 95% 70% at 5% 0%, #fde68a 0%, transparent 45%), radial-gradient(ellipse 75% 60% at 92% 88%, #fed7aa 0%, transparent 45%), radial-gradient(ellipse 60% 50% at 50% 50%, #fef9ee 0%, transparent 55%), radial-gradient(ellipse 45% 40% at 72% 16%, #fbbf24 0%, transparent 40%)',
      blob1: creator ? '#f59e0b' : '#fbbf24',
      blob2: creator ? '#ea580c' : '#f97316',
      blob3: creator ? '#d97706' : '#f59e0b',
    },
  };
  const cfg = configs[theme] ?? configs.light;
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden>
      <div className="absolute inset-0" style={{ background: cfg.grad }} />
      <div className="absolute rounded-full blur-[160px] animate-aurora-a"
        style={{ width:500, height:500, background:cfg.blob1, opacity:theme==='ankit'?0.55:0.35, top:'-10%', left:'-5%' }} />
      <div className="absolute rounded-full blur-[130px] animate-aurora-b"
        style={{ width:380, height:380, background:cfg.blob2, opacity:theme==='ankit'?0.38:0.22, bottom:'-8%', right:'-5%' }} />
      <div className="absolute rounded-full blur-[100px] animate-aurora-c"
        style={{ width:260, height:260, background:cfg.blob3, opacity:theme==='ankit'?0.32:0.18, top:'45%', left:'55%' }} />
      {/* Ankit-only: extra warm glow blob in top-right */}
      {theme==='ankit' && (
        <div className="absolute rounded-full blur-[120px] animate-aurora-b"
          style={{ width:350, height:350, background:'#f97316', opacity:0.28, top:'2%', right:'5%' }} />
      )}
      {/* Ankit-only: second gold flare bottom-center */}
      {theme==='ankit' && (
        <div className="absolute rounded-full blur-[140px]"
          style={{ width:280, height:200, background:'#d97706', opacity:0.22, bottom:'10%', left:'30%' }} />
      )}
      <div className="absolute inset-0 opacity-[0.012]" style={{
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}

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
// DELETE CONFIRM MODAL — standard vs creator mode variants
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({ title, onConfirm, onCancel, isCreator, glow, t }: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  isCreator: boolean;
  glow: string;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: t.isLight ? 'rgba(255,255,255,0.99)' : 'rgba(10,12,28,0.99)',
          border: `1px solid ${glow}30`,
          boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 40px ${glow}15`,
          backdropFilter: 'blur(24px)',
        }}>
        {/* Icon */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{
              background: isCreator
                ? 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.10))'
                : 'rgba(239,68,68,0.10)',
              border: isCreator ? '1px solid rgba(236,72,153,0.25)' : '1px solid rgba(239,68,68,0.22)',
            }}>
            {isCreator
              ? <Heart size={24} className="text-pink-400" />
              : <Trash2 size={24} className="text-red-400" />}
          </div>

          {/* Title & message */}
          {isCreator ? (
            <>
              <p className={`text-[15px] font-black text-center mb-1 ${t.isLight ? 'text-slate-800' : 'text-white'}`}>
                Delete this chat? 💔
              </p>
              <p className={`text-[11px] text-center leading-relaxed mb-1 ${t.sSub}`}>
                <span className="font-semibold" style={{color:glow}}>"{title}"</span>
              </p>
              <p className={`text-[11px] text-center leading-relaxed ${t.sSub}`}>
                Our memories in this chat will be gone forever. Are you sure?
              </p>
            </>
          ) : (
            <>
              <p className={`text-[15px] font-black text-center mb-1 ${t.isLight ? 'text-slate-800' : 'text-white'}`}>
                Delete conversation?
              </p>
              <p className={`text-[11px] text-center leading-relaxed mb-1 ${t.sSub}`}>
                <span className="font-semibold" style={{color:glow}}>"{title}"</span>
              </p>
              <p className={`text-[11px] text-center leading-relaxed ${t.sSub}`}>
                This cannot be undone.
              </p>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 px-6 pb-7 pt-2">
          <button onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all active:scale-95 ${t.isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-white/[0.07] hover:bg-white/[0.12] text-white/60'}`}>
            {isCreator ? 'Keep it 🥺' : 'Cancel'}
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-[12px] font-bold transition-all active:scale-95"
            style={{
              background: isCreator
                ? 'linear-gradient(135deg, #ec4899, #a855f7)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              boxShadow: isCreator
                ? '0 4px 16px rgba(236,72,153,0.35)'
                : '0 4px 16px rgba(239,68,68,0.35)',
            }}>
            {isCreator ? 'Delete 💔' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR PICKER MODAL
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

type SettingsSection = 'appearance' | 'ai' | 'chat' | 'data' | 'about';

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

  // ── Delete confirm state ───────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // ── Settings ──────────────────────────────────────────────────────────────
  const [theme,           setThemeState]    = useState<Theme>('dark');
  const [autoSearch,      setAutoSearch]    = useState(true);
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
  const [settingsTab,     setSettingsTab]   = useState<string>('main');
  const [showTimerFloat,  setShowTimerFloat]  = useState(false);
  const [insightsOpen,              setInsightsOpen]             = useState(false);
  const [showMobileMenu,            setShowMobileMenu]           = useState(false);
  const [showAuthModal,             setShowAuthModal]            = useState(false);
  const [syncStatus,                setSyncStatus]               = useState<'idle'|'syncing'|'synced'|'error'>('idle');
  const [showWellness,              setShowWellness]             = useState(false);
  const [showWellnessFloat,         setShowWellnessFloat]         = useState(false);
  const [showAvatarPickerInSettings,setShowAvatarPickerInSettings]= useState(false);

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
    : theme==='ocean' ? '#3b82f6' : theme==='sunset' ? '#f59e0b'
    : theme==='pastel' ? '#a855f7' : theme==='sakura' ? '#f43f5e'
    : theme==='ankit' ? '#ea580c' : '#818cf8';

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

    if (shouldDeliverBriefing()) {
      const b = buildMorningBriefing(); markBriefingDelivered(b); lsSet('tessa-pending-briefing', b);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null; setUser(u);
      if (u) {
        setIsGuest(false);
        fetchCloudConversations(u.id);
        if (isCreatorModePersistent()) {
          pullCreatorSync(u.id).then(changed => { if (changed) setWellnessVersion(v=>v+1); });
        }
      }
    });

    const setupRealtimeSync = (uid: string) => {
      if (syncChannel.current) supabase.removeChannel(syncChannel.current);
      syncChannel.current = supabase
        .channel(`creator-sync-${uid}`)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'creator_sync',
          filter: `user_id=eq.${uid}`,
        }, () => {
          pullCreatorSync(uid).then(changed => {
            if (changed) { setWellnessVersion(v=>v+1); setSyncStatus('synced'); }
          });
        })
        .subscribe();
    };

    getCurrentUser().then(u => { if (u) setupRealtimeSync(u.id); });

    return () => {
      subscription.unsubscribe();
      if (proactiveTimer.current) clearInterval(proactiveTimer.current);
      if (midnightTimer.current)  clearInterval(midnightTimer.current);
      if (syncChannel.current)    supabase.removeChannel(syncChannel.current);
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

  // ── Delete with confirmation modal ────────────────────────────────────────
  const requestDeleteConversation = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setDeleteTarget({ id: conv.id, title: conv.title });
  };
  const confirmDeleteConversation = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
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
  const parseDashboardUpdates = (responseText: string, userText: string = ''): string => {
    if (!isCreatorMode) return '';
    let extra = '';
    try {
      const foodHit = detectMealInResponse(userText) || detectMealInResponse(responseText);
      if (foodHit) {
        let tessaTotal: number | null = null;
        const sumMatch = responseText.match(/[=≈~]\s*\*{0,2}(\d{3,5})\*{0,2}\s*cal/i)
          ?? responseText.match(/total[^\d]*(\d{3,5})\s*cal/i)
          ?? responseText.match(/logged[^\d]*(\d{3,5})\s*cal/i);
        if (sumMatch?.[1]) tessaTotal = parseInt(sumMatch[1], 10);
        if (!tessaTotal) {
          const allCalMatches = [...responseText.matchAll(/(\d{2,5})\s*cal(?:ories)?/gi)];
          if (allCalMatches.length > 0) {
            const nums = allCalMatches.map(m => parseInt(m[1], 10)).filter(n => n >= 30 && n <= 5000);
            if (nums.length > 0) tessaTotal = Math.max(...nums);
          }
        }
        let totalCal: number;
        let lines: string[];
        if (tessaTotal && tessaTotal >= 30 && tessaTotal <= 5000) {
          totalCal = tessaTotal;
          lines = [`${foodHit.food} — ${totalCal}cal (from Tessa's response)`];
        } else {
          const foods = foodHit.food.split(/,|and|\+|with/i).map(f => f.trim()).filter(Boolean);
          totalCal = 0; lines = [];
          for (const food of foods) {
            const qm  = food.match(/^(\d+(?:\.\d+)?)\s*[xX×]?\s*(.+)/);
            const qty  = qm ? parseFloat(qm[1]) : 1;
            const fn   = qm ? qm[2].trim() : food;
            const res  = estimateCalories(fn, qty);
            totalCal  += res.calories;
            lines.push(`${res.food} — ${res.calories}cal (${res.unit})`);
          }
        }
        const h = lsGetJson<HealthSnapshot>('tessa-health', { weight:0, height:0, meals:[], totalCalories:0, date:new Date().toISOString().split('T')[0] });
        h.meals.push({ time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), meal:lines.join(', '), calories:totalCal, confidence: tessaTotal ? 'high' : 'medium' });
        h.totalCalories=(h.totalCalories??0)+totalCal;
        lsSet('tessa-health', JSON.stringify(h));
        const mw = getCurrentMealWindow(); if (mw) markMeal(mw.name);
        addCalories(totalCal); setWellnessVersion(v => v+1);
        if (isCreatorMode && user && !isGuest) {
          if (syncTimer.current) clearTimeout(syncTimer.current);
          syncTimer.current = setTimeout(() => pushCreatorSync(user.id), 3000);
        }
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
      if (isCreatorMode && user && !isGuest) {
        setSyncStatus('syncing');
        if (syncTimer.current) clearTimeout(syncTimer.current);
        syncTimer.current = setTimeout(async () => {
          await pushCreatorSync(user.id);
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
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-2xl shadow-cyan-500/25 animate-pulse">
              <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
            </div>
            <div className="absolute inset-0 rounded-2xl border border-cyan-400/20 animate-ping" />
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
    <div className={`h-screen ${t.bg} ${t.text} flex overflow-hidden relative transition-colors duration-500 ${fontSizeClass}`} style={{height:"100dvh"}}>
      <style>{`
      @keyframes popUpFromBottom{
        from{opacity:0;transform:translateX(-50%) translateY(24px) scale(0.94);}
        to{opacity:1;transform:translateX(-50%) translateY(0) scale(1);}
      }
      @keyframes mobileMenuSlideUp{
        from{opacity:0;transform:translateY(12px) scale(0.96);}
        to{opacity:1;transform:translateY(0) scale(1);}
      }
      @supports(padding-top: env(safe-area-inset-top)){
        .safe-top{ padding-top: max(12px, env(safe-area-inset-top)); }
        .safe-bottom{ padding-bottom: max(8px, env(safe-area-inset-bottom)); }
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
        style={{backdropFilter:'blur(24px)'}}
        aria-label="Navigation"
      >
        <div className="flex flex-col h-full w-[270px]">

          {/* Sidebar header */}
          <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b ${t.div}`}>
            <div className="flex items-center gap-2.5">
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

          {/* ── NEW CHAT ── */}
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
              {shownConvs.map(conv=>(
                <div key={conv.id} onClick={()=>openConversation(conv)}
                  className={`group relative px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${conv.id===currentConvId?t.active:`${t.card} hover:bg-white/[0.04]`}`}>
                  <p className="text-[11px] font-medium truncate pr-6 leading-snug">{conv.title}</p>
                  <div className={`flex items-center gap-1.5 mt-0.5 ${t.sub}`} style={{fontSize:9}}>
                    <Clock size={8} /><span>{conv.messages.length} msgs</span>
                    <span>·</span>
                    <span>{new Date(conv.updated).toLocaleDateString('en-IN',{month:'short',day:'numeric'})}</span>
                  </div>
                  {/* ── DELETE BUTTON — now triggers confirmation modal ── */}
                  <button
                    onClick={e => requestDeleteConversation(e, conv)}
                    className="absolute right-2 top-2.5 p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-red-400 transition-all">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
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
              <button onClick={()=>setShowAuthModal(true)}
                className={`w-full py-2 rounded-xl text-[11px] font-medium transition-all ${t.btnS}`}>
                👤 Sign In
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
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={()=>{setShowSettings(false);setSettingsTab('main');}} />

          {settingsTab==='main' && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="relative pointer-events-auto" style={{width:'min(340px,88vw)',height:'min(340px,88vw)'}} onClick={e=>e.stopPropagation()}>
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
                        backdropFilter:'blur(14px)',
                      }}>
                      <span style={{fontSize:'clamp(14px,3.5vw,22px)',lineHeight:1}}>{ico}</span>
                      <span className={`font-bold ${t.sSub}`} style={{fontSize:'clamp(7px,1.8vw,10px)',marginTop:3}}>{lbl}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {settingsTab!=='main' && (
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-[26px] overflow-hidden"
              style={{
                maxHeight:'82vh',
                background:t.isLight?'rgba(255,255,255,0.98)':'rgba(7,9,20,0.98)',
                borderTop:`1px solid ${t.glow}20`,
                boxShadow:`0 -6px 48px rgba(0,0,0,0.45), 0 0 0 1px ${t.glow}12`,
                backdropFilter:'blur(24px)',
                animation:'slideUpSheet 0.28s cubic-bezier(0.32,0.72,0,1)',
              }}
              onClick={e=>e.stopPropagation()}>

              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className={`w-9 h-1 rounded-full ${t.isLight?'bg-slate-300':'bg-white/20'}`}/>
              </div>

              <div className="flex-shrink-0 flex items-center px-4 pb-3 pt-1 relative">
                <button onClick={()=>setSettingsTab('main' as any)}
                  className={`flex items-center gap-1.5 ${t.isLight?'text-slate-500':'text-white/45'} active:opacity-60`}>
                  <ChevronDown size={15} style={{transform:'rotate(90deg)'}}/>
                  <span className="text-[11px] font-medium">Back</span>
                </button>
                <span className={`absolute left-1/2 -translate-x-1/2 text-[13px] font-bold ${t.isLight?'text-slate-800':'text-white/90'}`}>
                  {settingsTab==='themes'?'🎨 Themes':settingsTab==='ai'?'🧠 AI & Behaviour':settingsTab==='display'?'💬 Display':settingsTab==='data'?'🗄️ Data':'ℹ️ About'}
                </span>
                <button onClick={()=>{setShowSettings(false);setSettingsTab('main' as any);}}
                  className="ml-auto flex items-center justify-center rounded-full active:scale-90"
                  style={{width:28,height:28,background:t.isLight?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.09)'}}>
                  <X size={13} className={t.isLight?'text-slate-600':'text-white/60'}/>
                </button>
              </div>

              <div className="flex-shrink-0 h-px mx-4" style={{background:`${t.glow}18`}}/>

              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">

                {settingsTab==='themes' && (<>
                  <div>
                    <SLabel label="Theme" t={t}/>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([['dark','🌙','Dark'],['light','☀️','Light'],['cyberpunk','⚡','Cyber'],['ocean','🌊','Ocean'],['sunset','🌅','Sunset'],['pastel','🪻','Pastel'],['sakura','🌸','Sakura'],['ankit','✨',"Ankit's"]] as [Theme,string,string][]).map(([th,ico,lbl])=>(
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
                      <Toggle label="Browser Notifications" sub="Push alerts from Tessa" checked={notifications} onChange={setNotifications} color={t.glow} t={t}/>
                    </div>
                  </div>
                </>)}

                {settingsTab==='data' && (<>
                  <div>
                    <SLabel label="Storage" t={t}/>
                    <Toggle label="Auto-save Chats"
                      sub={user&&!isGuest?'☁️ Synced to Supabase cloud':'📱 Saved to local storage'}
                      checked={autoSave} onChange={setAutoSave} color={t.glow} t={t}/>
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
                      ['Theme', theme==='ankit'?"Ankit's Special":theme.charAt(0).toUpperCase()+theme.slice(1)],
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

            <div className="flex items-center gap-3 min-w-0">
              <button onClick={()=>setShowSidebar(p=>!p)}
                className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/[0.08] active:scale-90 ${showSidebar?'bg-white/[0.08]':''}`}>
                {showSidebar?<X size={18}/>:<Menu size={18}/>}
              </button>

              <div className="relative flex-shrink-0 cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                <div className="w-11 h-11 rounded-2xl overflow-hidden border-2 transition-all duration-500 hover:scale-105"
                  style={{ borderColor:`${t.glow}65`, boxShadow:animations?`0 0 20px ${t.glow}35,0 0 40px ${t.glow}12`:'none' }}>
                  <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                    onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                </div>
               </div>
  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-[2.5px]"
  style={{
    background: t.glow,
    borderColor: t.isLight ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)',
    boxShadow: `0 0 8px ${t.glow}`
  }}
                 </div>
    className="absolute inset-0 rounded-full animate-ping" 
    style={{ background: t.glow, opacity: 0.4 }} 
  />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-black text-[13px] leading-none tracking-[0.12em] uppercase" style={{color:t.glow}}>TESSA</h1>
                  {isCreatorMode && <Heart size={11} className="text-pink-400 fill-pink-400 flex-shrink-0 animate-pulse" />}
                  {isCreatorMode && user && !isGuest && (
                    <span title={syncStatus==='syncing'?'Syncing…':syncStatus==='synced'?'Synced ✓':'Live sync'}
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
                    ? `Personal AI · ${moodEmoji} ${moodLabel}${user&&!isGuest?' · ☁️ Live':''}`
                    : `${TESSA.tagline} · ${moodEmoji} ${moodLabel}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 flex-shrink-0">

              {/* ── DESKTOP ── */}
              <div className="hidden md:flex items-center gap-0.5">
                {showMoodBadge && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium mr-1"
                    style={{background:`${t.glow}12`,border:`1px solid ${t.glow}22`,color:t.glow}}>
                    {moodEmoji} {moodLabel}
                  </span>
                )}
                {isCreatorMode&&(
                  <button onClick={()=>setShowPlanners(true)} title="Smart Planners"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-black/[0.06] ${t.sub}`}>
                    <Calendar size={16}/>
                  </button>
                )}
                {isCreatorMode&&(
                  <button onClick={()=>setShowWellness(p=>!p)} title="Wellness"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showWellness?'text-white':'hover:bg-black/[0.06] '+t.sub}`}
                    style={showWellness?{background:`${t.glow}14`,outline:`1px solid ${t.glow}25`}:{}}>
                    <Activity size={16}/>
                  </button>
                )}
                {isCreatorMode&&(
                  <button onClick={()=>setShowDashboard(p=>!p)} title="Insights Panel"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showDashboard?'text-pink-300':'hover:bg-black/[0.06] '+t.sub}`}
                    style={showDashboard?{background:`${t.glow}12`,outline:`1px solid ${t.glow}25`}:{}}>
                    <LayoutDashboard size={16}/>
                  </button>
                )}
                {isCreatorMode&&(
                  <button onClick={()=>setInsightsOpen(p=>!p)} title="Tessa Insights"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${insightsOpen?'text-white':'hover:bg-black/[0.06] '+t.sub}`}
                    style={insightsOpen?{background:`${t.glow}14`,outline:`1px solid ${t.glow}25`}:{}}>
                    <Brain size={16}/>
                  </button>
                )}
                <button onClick={()=>setTheme(theme==='light'?'dark':'light')} title="Toggle theme"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-black/[0.06] ${t.sub}`}>
                  {theme==='light'?<Moon size={16}/>:<Sun size={16}/>}
                </button>
                <button onClick={()=>{setShowSettings(p=>!p);setSettingsTab('main');}} title="Settings"
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showSettings?'text-white/90':'hover:bg-white/[0.07] '+t.sub}`}
                  style={showSettings?{background:`${t.glow}12`,outline:`1px solid ${t.glow}22`}:{}}>
                  <Settings size={16}/>
                </button>
              </div>

              {/* ── MOBILE ── */}
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
              <div className="rounded-2xl overflow-hidden border shadow-2xl"
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
                    <LayoutDashboard size={15} style={{color:t.glow}}/> Dashboard
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
            <div className="fixed inset-0 z-[48]"
              style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
              onClick={()=>setShowWellness(false)}/>
            <div className="fixed bottom-[76px] left-1/2 z-[49]"
              style={{transform:'translateX(-50%)',width:'min(480px,94vw)',animation:'popUpFromBottom 0.3s cubic-bezier(0.34,1.4,0.64,1)',willChange:'transform,opacity'}}>
              <div className="rounded-2xl overflow-hidden"
                style={{
                  background: t.isLight ? 'rgba(255,255,255,0.99)' : 'rgba(8,10,28,0.99)',
                  border: `1px solid ${t.glow}35`,
                  boxShadow: `0 0 0 1px ${t.glow}15, 0 -8px 60px rgba(0,0,0,0.8), 0 0 40px ${t.glow}20`,
                  backdropFilter: 'blur(32px)',
                }}>
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
              <PersonalDashboard isLight={t.isLight} accentColor={t.glow} />
            ) : (
              <div className="space-y-2.5 pb-2">

                {messages.length===0 && (
                  <div className="flex flex-col items-center justify-center min-h-[60vh] select-none">
                    <div className="relative mb-6">
                      <div className="w-28 h-28 rounded-[2rem] overflow-hidden border-2 transition-all duration-500"
                        style={{ borderColor:`${t.glow}50`, boxShadow:animations?`0 0 0 8px ${t.glow}08, 0 0 40px ${t.glow}25, 0 0 80px ${t.glow}10`:'none' }}>
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
                    <h2 className={`text-2xl font-black mb-1 text-center`}>
                      {isCreatorMode ? `Hey Ankit! 💝` : `Hi, I'm Tessa 👋`}
                    </h2>
                    <p className={`text-sm ${t.sub} text-center max-w-xs leading-relaxed mb-6`}>
                      {isCreatorMode
                        ? "I'm always here for you, ready to talk about anything. What's on your mind?"
                        : `${TESSA.tagline.split(',')[0]}. Ask me anything — I'm here to help!`}
                    </p>
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

                {messages.map((msg,idx)=>{
                  const isUser  = msg.role==='user';
                  const isLatest = msg.id===latestMsgId;
                  const time    = new Date(msg.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
                  const emoji   = msg.mood?MOOD_EMOJI[msg.mood]:null;
                  const padY    = compactMode ? 'py-2.5' : 'py-3.5';
                  const prevMsg = messages[idx-1];
                  const isGrouped = messageGrouping && prevMsg && prevMsg.role===msg.role;

                  return (
                    <div key={msg.id}
                      className={`flex gap-2.5 animate-fadeIn ${isUser?'justify-end':'justify-start'} ${isGrouped?'mt-0.5':'mt-2.5'} ${isUser?'pl-8 md:pl-16':'pr-8 md:pr-16'}`}>
                      {!isUser && (
                        <div className="flex-shrink-0 flex flex-col justify-end" style={{width:32}}>
                          {!isGrouped && (
                            <div className="w-8 h-8 rounded-xl overflow-hidden border flex-shrink-0 mb-0.5"
                              style={{borderColor:`${t.glow}35`,boxShadow:animations?`0 2px 8px ${t.glow}20`:'none'}}>
                              <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                                onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}} />
                            </div>
                          )}
                        </div>
                      )}
                      <div className={`max-w-[82%] md:max-w-[74%] flex flex-col ${isUser?'items-end':'items-start'}`}>
                        {!isGrouped && (
                          <div className={`flex items-center gap-1.5 mb-1 px-0.5 ${isUser?'flex-row-reverse':''}`}>
                            <span className={`text-[10px] font-semibold ${isUser ? t.sub : ''}`} style={!isUser?{color:t.glow}:{}}>
                              {isUser ? 'You' : 'Tessa'}
                            </span>
                            {!isUser && emoji && <span className="text-[10px]">{emoji}</span>}
                            {showTimestamps && <span className={`text-[9px] ${t.sub}`}>{time}</span>}
                          </div>
                        )}
                        <div className={`rounded-2xl overflow-hidden transition-all duration-300 ${isUser?t.msgU:t.msgA}`}
                          style={isLatest&&!isUser&&animations?{boxShadow:`0 4px 24px ${t.glow}15`}:{}}>
                          <div className={`px-4 ${padY}`}>
                            <MessageRenderer
                              content={msg.content}
                              className={`leading-relaxed ${t.isLight?'text-slate-700':'text-white/90'} ${fontSizeClass}`}
                              animate={typingEffect&&!isUser&&isLatest}
                              isCreatorMode={isCreatorMode}
                            />
                          </div>
                        </div>
                        {isGrouped && showTimestamps && (
                          <span className={`text-[9px] mt-0.5 px-1 ${t.sub}`}>{time}</span>
                        )}
                      </div>
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
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                <button onClick={()=>fileInputRef.current?.click()} disabled={isLoading} title="Attach image"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${selectedImage?'text-white':''+t.btnS}`}
                  style={selectedImage?{background:`${t.glow}18`,outline:`1px solid ${t.glow}35`}:{}}>
                  <Paperclip size={16}/>
                </button>
                <button
                  onMouseDown={startRecording} onMouseUp={stopRecording}
                  onTouchStart={e=>{e.preventDefault();startRecording();}}
                  onTouchEnd={e=>{e.preventDefault();stopRecording();}}
                  disabled={isLoading} title="Hold to speak"
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 active:scale-90 ${isRecording?'bg-red-500/80 border border-red-400/50 text-white shadow-lg shadow-red-500/25 animate-pulse':t.btnS}`}>
                  {isRecording?<MicOff size={16}/>:<Mic size={16}/>}
                </button>
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
                <button onClick={()=>sendMessage()}
                  disabled={(!input.trim()&&!selectedImage)||isLoading}
                  title={sendOnEnter?'Send (Enter)':'Send'}
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-90 ${t.btnP}`}>
                  {isLoading
                    ?<div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                    :<Send size={16}/>}
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <p className={`text-[9px] ${t.sub}`}>
                  {isRecording?'🎤 Listening…':sendOnEnter?'Enter to send · Shift+Enter new line':'Click ➤ to send'}
                </p>
                <div className="flex items-center gap-3">
                  {autoSearch&&!isCreatorMode&&(
                    <span className={`text-[9px] ${t.sub} flex items-center gap-1`}><span>🔍</span>Web search on</span>
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
          RIGHT DASHBOARD PANEL — desktop only, no mobile sidebar
      ═══════════════════════════════════════════════════════════════════ */}
      {showDashboard && isCreatorMode && (
        <aside className={`hidden md:flex flex-shrink-0 flex-col h-screen overflow-hidden border-l w-[210px] ${t.panel}`}>
          {/* Header */}
          <div className={`flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b ${t.div}`}>
            <div className="flex items-center gap-1.5">
              <Sparkles size={11} style={{color:t.glow}}/>
              <span className={`text-[11px] font-black tracking-wide ${t.accent}`}>Focus</span>
            </div>
          </div>

          {/* Mood strip */}
          <div className={`flex-shrink-0 mx-2.5 mt-2 mb-0 px-2.5 py-2 rounded-xl flex items-center gap-2 ${t.card}`}
            style={{border:`1px solid ${t.glow}18`}}>
            <div className="w-6 h-6 rounded-lg overflow-hidden flex-shrink-0 border" style={{borderColor:`${t.glow}35`}}>
              <img src={selectedAvatar.path} alt={selectedAvatar.name} className="w-full h-full object-cover"
                onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold truncate" style={{color:t.glow}}>TESSA 💝</p>
              <p className={`text-[8px] truncate ${t.sub}`}>{moodEmoji} {moodLabel}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2">
            <div className={`rounded-xl p-2.5 ${t.card}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Brain size={10} style={{color:t.glow}}/>
                  <span className={`text-[10px] font-bold ${t.accent}`}>Memory</span>
                </div>
                <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
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

      {/* ── FLOATING STUDY TIMER ── */}
      {showTimerFloat && (
        <StudyTimer floating onClose={() => setShowTimerFloat(false)} defaultMinutes={25} />
      )}

      {/* ── FLOATING INSIGHTS PANEL ── */}
      {insightsOpen && isCreatorMode && (
        <>
          <div className="fixed inset-0 z-[48]"
            style={{background:'rgba(0,0,0,0.55)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}
            onClick={()=>setInsightsOpen(false)}/>
          <div className="fixed bottom-[76px] left-1/2 z-[49]"
            style={{transform:'translateX(-50%)',width:'min(420px,94vw)',animation:'popUpFromBottom 0.3s cubic-bezier(0.34,1.4,0.64,1)',willChange:'transform,opacity'}}>
            <div className="rounded-2xl overflow-hidden"
              style={{
                background: t.isLight ? 'rgba(255,255,255,0.99)' : 'rgba(8,10,28,0.99)',
                border: `1px solid ${t.glow}35`,
                boxShadow: `0 0 0 1px ${t.glow}15, 0 -8px 60px rgba(0,0,0,0.8), 0 0 36px ${t.glow}20`,
                backdropFilter: 'blur(32px)',
              }}>
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

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          title={deleteTarget.title}
          onConfirm={confirmDeleteConversation}
          onCancel={() => setDeleteTarget(null)}
          isCreator={isCreatorMode}
          glow={t.glow}
          t={t}
        />
      )}

      {/* ── MODALS ── */}
      {showSecretModal&&<SecretVerification onSuccess={unlockCreatorModeAction} onClose={()=>setShowSecretModal(false)}/>}
      {showAvatarModal&&(
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md animate-fadeIn"
            onClick={()=>setShowAvatarModal(false)}/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className={`w-full max-w-3xl rounded-3xl overflow-hidden ${t.panel}`}
              style={{boxShadow:`0 8px 48px rgba(0,0,0,0.4), 0 0 40px ${t.glow}15`}}>
              <div className={`flex items-center justify-between px-6 py-5 border-b ${t.div}`}>
                <div>
                  <h3 className={`font-bold text-xl ${t.text}`}>Choose Avatar</h3>
                  <p className={`text-sm mt-0.5 ${t.sub}`}>Select Tessa's visual style — 10 unique avatars</p>
                </div>
                <button onClick={()=>setShowAvatarModal(false)} className={`p-2 rounded-xl hover:bg-white/10 ${t.sub}`}>
                  <X size={20}/>
                </button>
              </div>
              <div className="p-6 grid grid-cols-5 gap-4">
                {AVATARS.map(av=>{
                  const isCurrent = avatarId===av.id;
                  return (
                    <button key={av.id}
                      onClick={()=>{setAvatarId(av.id);lsSet('tessa-avatar',av.id);setShowAvatarModal(false);}}
                      className="group relative aspect-square rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
                      style={{boxShadow:isCurrent?`0 0 0 3px ${t.glow}, 0 0 24px ${t.glow}40`:'0 2px 12px rgba(0,0,0,0.2)'}}>
                      <img src={av.path} alt={av.name} className="absolute inset-0 w-full h-full object-cover"
                        onError={e=>{(e.currentTarget as HTMLImageElement).src='/avatars/cosmic.png';}}/>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col items-center justify-end pb-3">
                        <span className="text-2xl mb-1">{av.emoji}</span>
                        <p className="text-xs font-bold text-white drop-shadow-lg">{av.name}</p>
                        <p className="text-[10px] text-white/80 drop-shadow">{av.desc}</p>
                      </div>
                      {isCurrent&&(
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center"
                          style={{boxShadow:`0 0 8px ${t.glow}`}}>
                          <Check size={12} className="fill-current" style={{color:t.glow}}/>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className={`px-6 py-3 border-t ${t.div}`}>
                <p className={`text-[9px] text-center ${t.sub}`}>Add avatars by placing PNG files in <span className="font-mono">/public/avatars/</span></p>
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
          onSuccess={() => { setShowAuthModal(false); checkAuth(); }}
        />
      )}
    </div>
  );
}
