'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Mic, MicOff, Menu, X, Settings, Heart, Plus,
  Trash2, LogOut, User, LayoutDashboard, Sun, Moon,
  Calendar, ChevronDown, ChevronUp, StickyNote,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
import type { Message, MoodType, Conversation } from '@/types';

// ─── Components ───────────────────────────────────────────────────────────────
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
import MessageRenderer    from '@/components/MessageRenderer';

// ─── Lib ──────────────────────────────────────────────────────────────────────
import { supabase, getCurrentUser, signOut }         from '@/lib/supabase';
import { MOOD_DESCRIPTIONS }                          from '@/lib/mood';
import { getRandomWelcomeMessage }                    from '@/lib/profile';
import { estimateCalories }                           from '@/lib/food-database';
import {
  shouldBeProactive, getProactiveQuestion,
  detectMealInResponse, detectSleepInResponse, getSleepReaction,
  isCreatorModePersistent, lockCreatorMode, unlockCreatorMode,
} from '@/lib/proactive-tessa';
import {
  buildMemoryContext, extractMemoriesFromMessage,
  getAllMemories, deleteMemory, clearAllMemories,
} from '@/lib/memory';
import {
  markMeal, markStudy, addWater, addCalories,
  shouldAskAboutMeal, shouldAskAboutWater,
  getCurrentMealWindow,
} from '@/lib/streaks-water';
import { buildMorningBriefing, shouldDeliverBriefing, markBriefingDelivered } from '@/lib/streaks-water';

// ─── Local types ──────────────────────────────────────────────────────────────
type Theme          = 'dark' | 'light' | 'cyberpunk' | 'ocean' | 'sunset';
type ResponseLength = 'short' | 'medium' | 'long';

interface HealthSnapshot {
  weight       : number;
  height       : number;
  meals        : { time: string; meal: string; calories: number; confidence: string }[];
  totalCalories: number;
  sleepHours?  : number;
  date         : string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_TOKENS: Record<ResponseLength, number> = { short: 350, medium: 700, long: 1400 };

const VALID_MOODS: MoodType[] = [
  'happy', 'calm', 'confident', 'worried',
  'flirty', 'loving', 'thinking', 'listening', 'playful', 'focused',
];

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const TC = {
  dark: {
    root    : 'bg-gradient-to-br from-[#0a0e27] via-[#141830] to-[#0d1020]',
    rootC   : 'bg-gradient-to-br from-[#1a0a20] via-[#220a30] to-[#1a0820]',
    aside   : 'bg-black/25 border-white/8',
    header  : 'bg-black/30 border-white/8 backdrop-blur-xl',
    headerC : 'bg-pink-950/20 border-pink-500/15 backdrop-blur-xl',
    card    : 'bg-white/4 border-white/8',
    body    : 'text-white',
    sub     : 'text-gray-400',
    msgU    : 'bg-[#0d1a2e] border-l-4 border-cyan-500',
    msgUC   : 'bg-[#1f0a28] border-l-4 border-pink-500',
    msgA    : 'bg-[#0a1520] border-l-4 border-violet-500',
    msgAC   : 'bg-[#130a20] border-l-4 border-purple-500',
    input   : 'bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-cyan-400/60',
    inputC  : 'bg-pink-950/30 border-pink-500/25 text-white placeholder:text-pink-300/40 focus:border-pink-400/70',
    btnP    : 'bg-cyan-500 hover:bg-cyan-400 text-white',
    btnPC   : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white',
    btnS    : 'border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300',
    btnSC   : 'border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300',
    sH      : 'text-cyan-400',
    sHC     : 'text-pink-400',
    accent  : 'text-cyan-400',
    accentC : 'text-pink-400',
  },
  light: {
    root    : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30',
    rootC   : 'bg-gradient-to-br from-pink-50 via-white to-purple-50/30',
    aside   : 'bg-white border-slate-200',
    header  : 'bg-white/90 border-slate-200 backdrop-blur-xl shadow-sm',
    headerC : 'bg-pink-50/90 border-pink-200 backdrop-blur-xl shadow-sm',
    card    : 'bg-slate-50 border-slate-200',
    body    : 'text-slate-800',
    sub     : 'text-slate-500',
    msgU    : 'bg-cyan-50 border-l-4 border-cyan-500',
    msgUC   : 'bg-pink-50 border-l-4 border-pink-400',
    msgA    : 'bg-indigo-50/70 border-l-4 border-violet-400',
    msgAC   : 'bg-purple-50/70 border-l-4 border-purple-400',
    input   : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-cyan-400',
    inputC  : 'bg-white border-pink-300 text-slate-800 placeholder:text-pink-300 focus:border-pink-400',
    btnP    : 'bg-cyan-500 hover:bg-cyan-600 text-white',
    btnPC   : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white',
    btnS    : 'border border-cyan-500/50 bg-cyan-50 hover:bg-cyan-100 text-cyan-700',
    btnSC   : 'border border-pink-500/50 bg-pink-50 hover:bg-pink-100 text-pink-700',
    sH      : 'text-cyan-600',
    sHC     : 'text-pink-500',
    accent  : 'text-cyan-600',
    accentC : 'text-pink-500',
  },
  cyberpunk: {
    root    : 'bg-gradient-to-br from-[#0a0014] via-[#1a0028] to-[#0f001f]',
    rootC   : 'bg-gradient-to-br from-[#1a0a20] via-[#220a30] to-[#1a0820]',
    aside   : 'bg-black/40 border-purple-500/20',
    header  : 'bg-black/50 border-purple-500/20 backdrop-blur-xl',
    headerC : 'bg-pink-950/20 border-pink-500/15 backdrop-blur-xl',
    card    : 'bg-purple-950/20 border-purple-500/20',
    body    : 'text-purple-100',
    sub     : 'text-purple-300',
    msgU    : 'bg-[#1a0030] border-l-4 border-purple-400',
    msgUC   : 'bg-[#1f0a28] border-l-4 border-pink-500',
    msgA    : 'bg-[#0f0025] border-l-4 border-cyan-400',
    msgAC   : 'bg-[#130a20] border-l-4 border-purple-500',
    input   : 'bg-black/40 border-purple-500/30 text-purple-100 placeholder:text-purple-300/40 focus:border-purple-400/70',
    inputC  : 'bg-pink-950/30 border-pink-500/25 text-white placeholder:text-pink-300/40 focus:border-pink-400/70',
    btnP    : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white',
    btnPC   : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white',
    btnS    : 'border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300',
    btnSC   : 'border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300',
    sH      : 'text-purple-400',
    sHC     : 'text-pink-400',
    accent  : 'text-purple-400',
    accentC : 'text-pink-400',
  },
  ocean: {
    root    : 'bg-gradient-to-br from-[#001a33] via-[#002244] to-[#001428]',
    rootC   : 'bg-gradient-to-br from-[#1a0a20] via-[#220a30] to-[#1a0820]',
    aside   : 'bg-black/30 border-blue-500/20',
    header  : 'bg-black/40 border-blue-500/20 backdrop-blur-xl',
    headerC : 'bg-pink-950/20 border-pink-500/15 backdrop-blur-xl',
    card    : 'bg-blue-950/20 border-blue-500/20',
    body    : 'text-blue-50',
    sub     : 'text-blue-300',
    msgU    : 'bg-[#002850] border-l-4 border-teal-400',
    msgUC   : 'bg-[#1f0a28] border-l-4 border-pink-500',
    msgA    : 'bg-[#001f40] border-l-4 border-blue-400',
    msgAC   : 'bg-[#130a20] border-l-4 border-purple-500',
    input   : 'bg-black/30 border-blue-500/30 text-blue-50 placeholder:text-blue-300/40 focus:border-teal-400/70',
    inputC  : 'bg-pink-950/30 border-pink-500/25 text-white placeholder:text-pink-300/40 focus:border-pink-400/70',
    btnP    : 'bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white',
    btnPC   : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white',
    btnS    : 'border border-teal-500/50 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300',
    btnSC   : 'border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300',
    sH      : 'text-teal-400',
    sHC     : 'text-pink-400',
    accent  : 'text-teal-400',
    accentC : 'text-pink-400',
  },
  sunset: {
    root    : 'bg-gradient-to-br from-[#2d1810] via-[#3d2418] to-[#251510]',
    rootC   : 'bg-gradient-to-br from-[#1a0a20] via-[#220a30] to-[#1a0820]',
    aside   : 'bg-black/30 border-orange-500/20',
    header  : 'bg-black/40 border-orange-500/20 backdrop-blur-xl',
    headerC : 'bg-pink-950/20 border-pink-500/15 backdrop-blur-xl',
    card    : 'bg-orange-950/20 border-orange-500/20',
    body    : 'text-orange-50',
    sub     : 'text-orange-300',
    msgU    : 'bg-[#3d2010] border-l-4 border-orange-400',
    msgUC   : 'bg-[#1f0a28] border-l-4 border-pink-500',
    msgA    : 'bg-[#2d1808] border-l-4 border-amber-400',
    msgAC   : 'bg-[#130a20] border-l-4 border-purple-500',
    input   : 'bg-black/30 border-orange-500/30 text-orange-50 placeholder:text-orange-300/40 focus:border-amber-400/70',
    inputC  : 'bg-pink-950/30 border-pink-500/25 text-white placeholder:text-pink-300/40 focus:border-pink-400/70',
    btnP    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white',
    btnPC   : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white',
    btnS    : 'border border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/20 text-orange-300',
    btnSC   : 'border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300',
    sH      : 'text-orange-400',
    sHC     : 'text-pink-400',
    accent  : 'text-orange-400',
    accentC : 'text-pink-400',
  },
} as const;

function useTc(theme: Theme, creator: boolean) {
  const b = TC[theme];
  return {
    root    : creator ? b.rootC   : b.root,
    aside   : b.aside,
    header  : creator ? b.headerC : b.header,
    card    : b.card,
    body    : b.body,
    sub     : b.sub,
    msgU    : creator ? b.msgUC  : b.msgU,
    msgA    : creator ? b.msgAC  : b.msgA,
    input   : creator ? b.inputC : b.input,
    primary : creator ? b.btnPC  : b.btnP,
    soft    : creator ? b.btnSC  : b.btnS,
    sH      : creator ? b.sHC    : b.sH,
    accent  : creator ? b.accentC: b.accent,
  };
}

function safeMood(m?: string): MoodType {
  return VALID_MOODS.includes(m as MoodType) ? (m as MoodType) : 'calm';
}

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, val: string): void {
  try { localStorage.setItem(key, val); } catch {}
}
function lsRemove(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}
function lsGetJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {

  const [user,    setUser]    = useState<any>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState('');
  const [isLoading,     setIsLoading]     = useState(false);
  const [currentMood,   setCurrentMood]   = useState<MoodType>('calm');
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string>(() => uuidv4());
  const [latestMsgId,   setLatestMsgId]   = useState<string | null>(null);

  const [showSidebar,     setShowSidebar]     = useState(false);
  const [showSettings,    setShowSettings]    = useState(false);
  const [showDashboard,   setShowDashboard]   = useState(false);
  const [showSecretModal, setShowSecretModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showPlanners,    setShowPlanners]    = useState(false);
  const [showFlashcards,  setShowFlashcards]  = useState(false);
  const [showReportCard,  setShowReportCard]  = useState(false);
  const [notesExpanded,   setNotesExpanded]   = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(false); // NEW: settings in left sidebar
  const [typingEnabled,   setTypingEnabled]   = useState(true);

  const [theme,          setThemeState]    = useState<Theme>('dark');
  const [autoSearch,     setAutoSearch]    = useState(true);
  const [voiceOutput,    setVoiceOutput]   = useState(false);
  const [responseLength, setResponseLength]= useState<ResponseLength>('medium');
  const [animations,     setAnimations]    = useState(true);
  const [sfx,            setSfx]           = useState(true);
  const [autoSave,       setAutoSave]      = useState(true);
  const [avatar,         setAvatar]        = useState('/avatars/cosmic.png');

  const [isRecording, setIsRecording] = useState(false);

  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const mediaRecRef    = useRef<MediaRecorder | null>(null);
  const audioChunks    = useRef<Blob[]>([]);
  const proactiveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicesReady    = useRef(false);

  const tc        = useTc(theme, isCreatorMode);
  const avatarSrc = avatar || '/avatars/cosmic.png';
  const shownConvs = conversations.filter(
    c => c.mode === (isCreatorMode ? 'creator' : 'standard')
  );

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.remove('light', 'dark', 'cyberpunk', 'ocean', 'sunset');
    document.documentElement.classList.add(t);
    lsSet('tessa-theme', t);
  }, []);

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = {
      theme         : lsGet('tessa-theme') as Theme | null,
      avatar        : lsGet('tessa-avatar-preset'),
      autoSearch    : lsGet('tessa-auto-search'),
      voiceOutput   : lsGet('tessa-voice-output'),
      responseLength: lsGet('tessa-response-length') as ResponseLength | null,
      animations    : lsGet('tessa-animations'),
      sfx           : lsGet('tessa-sfx'),
    };
    if (saved.theme)          setTheme(saved.theme);
    if (saved.avatar)         setAvatar(saved.avatar);
    if (saved.autoSearch)     setAutoSearch(saved.autoSearch === 'true');
    if (saved.voiceOutput)    setVoiceOutput(saved.voiceOutput === 'true');
    if (saved.responseLength) setResponseLength(saved.responseLength);
    if (saved.animations)     setAnimations(saved.animations === 'true');
    if (saved.sfx)            setSfx(saved.sfx === 'true');

    // Persistent creator mode check
    if (isCreatorModePersistent()) {
      setIsCreatorMode(true);
      setCurrentMood('loving');
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => { voicesReady.current = true; };
      if (window.speechSynthesis.getVoices().length) voicesReady.current = true;
    }

    checkAuth();
    hydrateLocalConversations();

    if (shouldDeliverBriefing()) {
      const briefing = buildMorningBriefing();
      markBriefingDelivered(briefing);
      lsSet('tessa-pending-briefing', briefing);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) { setIsGuest(false); fetchCloudConversations(u.id); }
    });

    return () => {
      subscription.unsubscribe();
      if (proactiveTimer.current) clearInterval(proactiveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { lsSet('tessa-auto-search',     String(autoSearch));    }, [autoSearch]);
  useEffect(() => { lsSet('tessa-voice-output',    String(voiceOutput));   }, [voiceOutput]);
  useEffect(() => { lsSet('tessa-response-length', responseLength);        }, [responseLength]);
  useEffect(() => { lsSet('tessa-animations',      String(animations));    }, [animations]);
  useEffect(() => { lsSet('tessa-sfx',             String(sfx));           }, [sfx]);

  useEffect(() => {
    if (proactiveTimer.current) { clearInterval(proactiveTimer.current); proactiveTimer.current = null; }
    if (!isCreatorMode) return;

    const delay = setTimeout(() => maybeSendProactive(), 5_000);
    proactiveTimer.current = setInterval(() => maybeSendProactive(), 3 * 60 * 60 * 1_000);

    return () => {
      clearTimeout(delay);
      if (proactiveTimer.current) clearInterval(proactiveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreatorMode]);

  const maybeSendProactive = () => {
    if (!shouldBeProactive()) return;
    const q = getProactiveQuestion();
    if (!q) return;
    setMessages(prev => [...prev, {
      id       : uuidv4(),
      role     : 'assistant' as const,
      content  : q.question,
      timestamp: new Date(),
      mood     : 'playful' as MoodType,
    }]);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  const checkAuth = async () => {
    try {
      const u = await getCurrentUser();
      if (u) { setUser(u); setIsGuest(false); fetchCloudConversations(u.id); }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsGuest(true);
    setIsCreatorMode(false);
    unlockCreatorMode(); // Clear persistent flag
    setMessages([]);
    setShowDashboard(false);
    hydrateLocalConversations();
  };

  const fetchCloudConversations = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(80);

      if (error || !data) return;

      setConversations(data.map((row: any): Conversation => ({
        id         : row.conversation_id,
        title      : row.title,
        messages   : row.messages,
        created    : new Date(row.created_at),
        updated    : new Date(row.updated_at),
        mode       : row.mode,
        moodHistory: row.mood_history ?? ['calm'],
      })));
    } catch {}
  };

  const hydrateLocalConversations = () => {
    const convs = lsGetJson<Conversation[]>('tessa-conversations', []);
    if (convs.length) setConversations(convs);
  };

  const persistConversation = useCallback(async () => {
    if (messages.length === 0) return;

    const conv: Conversation = {
      id         : currentConvId,
      title      : messages[0].content.slice(0, 55).trimEnd() + '…',
      messages,
      created    : new Date(),
      updated    : new Date(),
      mode       : isCreatorMode ? 'creator' : 'standard',
      moodHistory: [currentMood],
    };

    if (user && !isGuest) {
      try {
        await supabase.from('conversations').upsert({
          user_id        : user.id,
          conversation_id: conv.id,
          title          : conv.title,
          messages       : conv.messages,
          mode           : conv.mode,
          mood_history   : conv.moodHistory,
          updated_at     : new Date().toISOString(),
        });
        fetchCloudConversations(user.id);
      } catch {}
    } else if (autoSave) {
      const next = [conv, ...conversations.filter(c => c.id !== currentConvId)].slice(0, 50);
      setConversations(next);
      lsSet('tessa-conversations', JSON.stringify(next));
    }
  }, [messages, currentConvId, isCreatorMode, currentMood, user, isGuest, autoSave, conversations]);

  const startNewChat = () => {
    persistConversation();
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
    setShowDashboard(false);
    setShowSidebar(false);
  };

  const openConversation = (conv: Conversation) => {
    if ((conv.mode === 'creator') !== isCreatorMode) {
      alert(`Switch to ${conv.mode} mode first.`);
      return;
    }
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    setCurrentMood(safeMood(conv.moodHistory?.at(-1)));
    setShowSidebar(false);
  };

  const removeConversation = async (id: string) => {
    if (user && !isGuest) {
      try {
        await supabase.from('conversations').delete()
          .eq('conversation_id', id).eq('user_id', user.id);
        fetchCloudConversations(user.id);
      } catch {}
    } else {
      const next = conversations.filter(c => c.id !== id);
      setConversations(next);
      lsSet('tessa-conversations', JSON.stringify(next));
    }
  };

  const parseDashboardUpdates = (responseText: string): string => {
    if (!isCreatorMode) return '';
    let extra = '';

    try {
      const foodHit = detectMealInResponse(responseText);
      if (foodHit) {
        const result = estimateCalories(foodHit.food);
        const health = lsGetJson<HealthSnapshot>('tessa-health', {
          weight: 0, height: 0, meals: [], totalCalories: 0,
          date: new Date().toISOString().split('T')[0],
        });
        health.meals.push({
          time      : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          meal      : result.food,
          calories  : result.calories,
          confidence: result.confidence,
        });
        health.totalCalories = (health.totalCalories ?? 0) + result.calories;
        lsSet('tessa-health', JSON.stringify(health));

        // Mark meal in wellness tracker
        const window = getCurrentMealWindow();
        if (window) markMeal(window.name);
        addCalories(result.calories);
      }

      const sleepHit = detectSleepInResponse(responseText);
      if (sleepHit) {
        const health = lsGetJson<HealthSnapshot>('tessa-health', {
          weight: 0, height: 0, meals: [], totalCalories: 0,
          date: new Date().toISOString().split('T')[0],
        });
        health.sleepHours = sleepHit.hours;
        lsSet('tessa-health', JSON.stringify(health));
        extra = '\n\n' + getSleepReaction(sleepHit.hours);
      }
    } catch {}

    return extra;
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id       : uuidv4(),
      role     : 'user',
      content  : text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '48px';
    setIsLoading(true);

    try {
      const needsSearch =
        autoSearch &&
        /search|find|latest|current|today|202[4-6]|now|recent|\?/i.test(text);

      const res = await fetch('/api/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          messages    : [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
          isCreatorMode,
          currentMood,
          needsSearch,
          maxTokens   : MAX_TOKENS[responseLength],
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const dashboardExtra = parseDashboardUpdates(data.content);

      const assistantMsg: Message = {
        id       : uuidv4(),
        role     : 'assistant',
        content  : data.content + dashboardExtra,
        timestamp: new Date(),
        mood     : safeMood(data.mood) as MoodType,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setCurrentMood(safeMood(data.mood));
      setLatestMsgId(assistantMsg.id);

      extractMemoriesFromMessage(text, data.content).catch(() => {});
      markStudy(); // Every interaction counts as study engagement

      if (voiceOutput) speakText(data.content);
      if (sfx)         playChime();
      if (autoSave)    setTimeout(persistConversation, 1_000);

    } catch (err: any) {
      setMessages(prev => [...prev, {
        id       : uuidv4(),
        role     : 'assistant' as const,
        content  : `⚠️ ${err?.message ?? 'Something went wrong — please try again.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const speakText = (raw: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const clean = raw
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~`]/g, '')
      .slice(0, 600);

    const utter = new SpeechSynthesisUtterance(clean);
    utter.pitch = 1.45;
    utter.rate  = 1.1;
    utter.lang  = 'en-IN';

    const assignVoice = () => {
      const voices  = window.speechSynthesis.getVoices();
      const female  = voices.find(v =>
        /samantha|victoria|karen|moira|fiona|kate|veena|zira|google (us english|uk english female)/i.test(v.name)
      ) ?? voices.find(v => /female|woman/i.test(v.name));
      if (female) utter.voice = female;
      window.speechSynthesis.speak(utter);
    };

    if (voicesReady.current) {
      assignVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { voicesReady.current = true; assignVoice(); };
    }
  };

  const playChime = () => {
    try {
      const ctx  = new AudioContext();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type            = 'sine';
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecRef.current = rec;
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); runSpeechRecognition(); };
      rec.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied — please allow mic permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && isRecording) {
      mediaRecRef.current.stop();
      setIsRecording(false);
    }
  };

  const runSpeechRecognition = () => {
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) {
      setInput('🎤 Transcription unsupported — please type.');
      return;
    }
    const rec = new SR();
    rec.lang           = 'en-IN';
    rec.continuous     = false;
    rec.interimResults = false;
    rec.onresult       = (e: any) => setInput(e.results[0][0].transcript);
    rec.onerror        = () => setInput("🎤 Couldn't understand — please type.");
    try { rec.start(); } catch {}
  };

  const unlockCreatorModeAction = () => {
    persistConversation();
    setIsCreatorMode(true);
    setCurrentConvId(uuidv4());
    setCurrentMood('loving');
    lockCreatorMode(); // Persistent across refreshes

    const pendingBriefing = lsGet('tessa-pending-briefing');
    const initMsg: Message = pendingBriefing
      ? {
          id       : uuidv4(),
          role     : 'assistant',
          content  : pendingBriefing,
          timestamp: new Date(),
          mood     : 'loving' as MoodType,
        }
      : {
          id       : uuidv4(),
          role     : 'assistant',
          content  : getRandomWelcomeMessage(),
          timestamp: new Date(),
          mood     : 'loving' as MoodType,
        };

    if (pendingBriefing) lsRemove('tessa-pending-briefing');

    setMessages([initMsg]);
    setShowSecretModal(false);
    setShowSettings(false);
    if (sfx) playChime();
  };

  const exitCreatorMode = () => {
    persistConversation();
    setIsCreatorMode(false);
    unlockCreatorMode(); // Clear persistent flag
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
    setMessages([]);
    setShowDashboard(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  };

  const ToggleRow = ({
    label, checked, onChange,
  }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between cursor-pointer text-xs">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-pink-500"
      />
    </label>
  );

  if (loading) {
    return (
      <div className="h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className={`text-5xl mb-5 ${animations ? 'animate-bounce' : ''}`}>🌌</div>
          <p className="text-gray-400 text-sm tracking-[0.2em] uppercase">
            Initialising T.E.S.S.A.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen ${tc.root} ${tc.body} flex overflow-hidden relative transition-colors duration-500`}>

      {isCreatorMode && animations && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
          {['8%', '22%', '38%', '55%', '70%', '87%'].map((left, i) => (
            <span
              key={i}
              className="absolute text-lg select-none opacity-0 animate-float-heart"
              style={{ left, animationDelay: `${i * 1.6}s`, animationDuration: `${8 + i * 1.2}s` }}
            >
              ❤️
            </span>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ══════════════════════════════════════════════════════════════════ */}
      <aside
        className={`
          flex-shrink-0 border-r ${tc.aside}
          flex flex-col h-screen overflow-hidden z-20
          transition-all duration-300 ease-in-out
          ${showSidebar ? 'w-[17rem] md:w-72' : 'w-0'}
        `}
        aria-label="Navigation sidebar"
      >
        {/* Notes panel */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setNotesExpanded(p => !p)}
            className={`
              w-full flex items-center justify-between px-4 py-3
              border-b ${tc.aside} text-sm font-semibold ${tc.sH}
              hover:bg-white/5 transition-colors
            `}
          >
            <span className="flex items-center gap-2"><StickyNote size={14} />Quick Notes</span>
            {notesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {notesExpanded && (
            <div className="max-h-56 overflow-y-auto">
              <NotesPanel />
            </div>
          )}
        </div>

        {/* Chat history */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-white/5">
          <div className="flex-shrink-0 p-3 pb-2">
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${tc.sH}`}>
              💬 {isCreatorMode ? 'Our Chats' : 'History'}
            </p>
            <button
              onClick={startNewChat}
              className={`w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${tc.soft}`}
            >
              <Plus size={13} /> New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-3 space-y-1.5">
            {shownConvs.length === 0 && (
              <p className={`text-xs text-center py-8 ${tc.sub}`}>No chats yet</p>
            )}
            {shownConvs.map(conv => (
              <div
                key={conv.id}
                onClick={() => openConversation(conv)}
                className={`
                  group relative px-3 py-2.5 rounded-lg border cursor-pointer transition-all
                  ${conv.id === currentConvId
                    ? `${tc.soft} border-opacity-80`
                    : `${tc.card} hover:border-white/15`
                  }
                `}
              >
                <p className="text-xs font-medium truncate pr-5 leading-snug">{conv.title}</p>
                <p className={`text-[10px] mt-0.5 ${tc.sub}`}>{conv.messages.length} messages</p>
                <button
                  onClick={e => { e.stopPropagation(); removeConversation(conv.id); }}
                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* NEW: Settings section in left sidebar */}
        <div className="flex-shrink-0 border-t border-white/5">
          <button
            onClick={() => setSettingsExpanded(p => !p)}
            className={`
              w-full flex items-center justify-between px-4 py-3
              text-sm font-semibold ${tc.sH}
              hover:bg-white/5 transition-colors
            `}
          >
            <span className="flex items-center gap-2"><Settings size={14} />Settings</span>
            {settingsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {settingsExpanded && (
            <div className="max-h-[50vh] overflow-y-auto settings-scroll px-3 py-3 space-y-3">
              
              {/* Theme */}
              <section className="settings-section">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Theme</h3>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ['dark', '🌙 Dark'],
                    ['light', '☀️ Light'],
                    ['cyberpunk', '⚡ Cyberpunk'],
                    ['ocean', '🌊 Ocean'],
                    ['sunset', '🌅 Sunset'],
                  ] as [Theme, string][]).map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`
                        py-2 px-2 text-[10px] font-medium rounded-lg transition-all
                        ${theme === t
                          ? `${isCreatorMode ? 'bg-pink-500' : 'bg-cyan-500'} text-white border-2 border-white/20`
                          : 'bg-white/5 hover:bg-white/10 border border-white/10'
                        }
                      `}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Avatar */}
              <section className="settings-section">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Avatar</h3>
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${tc.soft}`}
                >
                  Choose Preset
                </button>
              </section>

              {/* Audio */}
              <section className="settings-section">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Audio</h3>
                <div className="space-y-2">
                  <ToggleRow label="Voice Output" checked={voiceOutput} onChange={setVoiceOutput} />
                  <ToggleRow label="Sound Effects" checked={sfx} onChange={setSfx} />
                </div>
              </section>

              {/* Chat */}
              <section className="settings-section">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Chat</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">Response Length</p>
                    <div className="flex rounded-lg overflow-hidden border border-white/10">
                      {(['short', 'medium', 'long'] as ResponseLength[]).map(l => (
                        <button
                          key={l}
                          onClick={() => setResponseLength(l)}
                          className={`
                            flex-1 py-1 text-[10px] capitalize transition-all
                            ${responseLength === l
                              ? `${isCreatorMode ? 'bg-pink-500' : 'bg-cyan-500'} text-white`
                              : 'hover:bg-white/8'
                            }
                          `}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ToggleRow label="Auto Web Search" checked={autoSearch} onChange={setAutoSearch} />
                  <ToggleRow label="Typing Animation" checked={typingEnabled} onChange={setTypingEnabled} />
                </div>
              </section>

              {/* Visual */}
              <section className="settings-section">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Visual</h3>
                <ToggleRow label="Animations & Glows" checked={animations} onChange={setAnimations} />
              </section>

              {/* Data */}
              <section className="settings-section">
                <h3 className="text-[10px] font-bold uppercase text-gray-400 mb-2">Data</h3>
                <ToggleRow label="Auto-save Chats" checked={autoSave} onChange={setAutoSave} />
                <p className={`text-[9px] ${tc.sub} mt-1`}>
                  {user && !isGuest ? '☁️ Cloud synced' : '📱 Local storage'}
                </p>
              </section>

              {/* Creator mode */}
              {!isCreatorMode ? (
                <section className="settings-section border-pink-500/20">
                  <button
                    onClick={() => setShowSecretModal(true)}
                    className="w-full py-2 rounded-lg border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold transition-all"
                  >
                    🔓 Unlock Creator Mode
                  </button>
                </section>
              ) : (
                <section className="settings-section border-pink-500/20">
                  <p className={`text-[10px] ${tc.sub} mb-2`}>Creator Mode Active 💝</p>
                  <button
                    onClick={exitCreatorMode}
                    className="w-full py-1.5 rounded-lg border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs transition-all"
                  >
                    Exit Creator Mode
                  </button>
                </section>
              )}

            </div>
          )}
        </div>

        {/* Account */}
        <div className={`flex-shrink-0 p-3 border-t ${tc.aside}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${tc.sH}`}>
            <User size={12} /> Account
          </p>
          {user && !isGuest ? (
            <div className="space-y-1.5">
              <p className={`text-xs truncate ${tc.sub}`}>{user.email}</p>
              <button
                onClick={handleSignOut}
                className="w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut size={12} /> Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className={`text-xs ${tc.sub}`}>👤 Guest Mode</p>
              <button
                onClick={() => alert('Configure Supabase auth!')}
                className={`w-full py-1.5 rounded-lg text-xs transition-all ${tc.soft}`}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN AREA
      ══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 z-10">

        {/* Header */}
        <header className={`flex-shrink-0 border-b ${tc.header} px-3 py-2.5`}>
          <div className="flex items-center justify-between gap-2">

            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => setShowSidebar(p => !p)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle sidebar"
              >
                {showSidebar ? <X size={19} /> : <Menu size={19} />}
              </button>

              <div className="relative flex-shrink-0">
                <div className={`
                  w-10 h-10 rounded-full overflow-hidden border-2
                  ${isCreatorMode
                    ? `border-pink-500 ${animations ? 'animate-edge-pulse-creator' : ''}`
                    : `border-cyan-400 ${animations ? 'animate-edge-pulse-standard' : ''}`
                  }
                `}>
                  <img
                    src={avatarSrc}
                    alt="T.E.S.S.A."
                    className={`w-full h-full object-cover ${animations
                      ? isCreatorMode ? 'neon-avatar-creator' : 'neon-avatar-standard'
                      : ''
                    }`}
                    onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
                <Heart
                  size={11}
                  className={`
                    absolute -bottom-0.5 -right-0.5
                    ${isCreatorMode ? 'text-pink-400 fill-pink-400' : 'text-cyan-400 fill-cyan-400'}
                    ${animations ? 'animate-pulse' : ''}
                  `}
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-none holographic-text">T.E.S.S.A.</h1>
                <p className={`text-[10px] mt-0.5 ${tc.sub}`}>
                  {isCreatorMode ? '💝 Personal Mode' : 'AI Assistant'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`
                hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] border
                ${isCreatorMode
                  ? 'bg-pink-500/10 border-pink-500/25 text-pink-300'
                  : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
                }
              `}>
                {(MOOD_DESCRIPTIONS as Record<string, string>)[currentMood] ?? currentMood}
              </span>

              {isCreatorMode && (
                <button
                  onClick={() => setShowPlanners(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Smart Planners"
                >
                  <Calendar size={17} />
                </button>
              )}

              {isCreatorMode && (
                <button
                  onClick={() => setShowDashboard(p => !p)}
                  className={`p-1.5 rounded-lg transition-colors ${showDashboard ? 'bg-pink-500/20 text-pink-300' : 'hover:bg-white/10'}`}
                  title="Personal Dashboard"
                >
                  <LayoutDashboard size={17} />
                </button>
              )}

              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              <button
                onClick={() => setShowSettings(p => !p)}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-white/10' : 'hover:bg-white/10'}`}
                title="Right Panel"
              >
                {showSettings ? <X size={17} /> : <Settings size={17} />}
              </button>
            </div>
          </div>
        </header>

        {/* Messages / Dashboard */}
        <div className="flex-1 overflow-y-auto px-3 py-5 md:px-6">
          <div className="max-w-2xl mx-auto">

            {showDashboard && isCreatorMode ? (
              <PersonalDashboard />
            ) : (
              <div className="space-y-3">

                {messages.length === 0 && (
                  <div className="text-center py-20 select-none">
                    <div className={`text-5xl mb-4 ${animations ? 'animate-pulse' : ''}`}>
                      {isCreatorMode ? '💝' : '🌌'}
                    </div>
                    <p className={`text-base font-semibold ${tc.body}`}>
                      {isCreatorMode ? 'Hey Ankit! 💕' : 'Hello!'}
                    </p>
                    <p className={`text-sm mt-1 ${tc.sub}`}>
                      {isCreatorMode
                        ? "What's on your mind today?"
                        : "Ask me anything — I'm here to help!"}
                    </p>
                  </div>
                )}

                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`rounded-xl px-4 py-3.5 animate-fadeIn ${msg.role === 'user' ? tc.msgU : tc.msgA}`}
                  >
                    <MessageRenderer
                      content={msg.content}
                      className={`text-sm ${theme === 'light' ? 'text-slate-800' : 'text-gray-100'}`}
                      animate={typingEnabled && msg.role === 'assistant' && msg.id === latestMsgId}
                      isCreatorMode={isCreatorMode}
                    />
                    <p className={`text-[10px] mt-2 ${tc.sub}`}>
                      {msg.role === 'user' ? '👤 You' : '✨ T.E.S.S.A.'}
                      {' · '}
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}

                {isLoading && (
                  <div className={`rounded-xl px-4 py-3.5 ${tc.msgA}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(delay => (
                          <div
                            key={delay}
                            className={`w-1.5 h-1.5 rounded-full ${isCreatorMode ? 'bg-pink-400' : 'bg-cyan-400'} animate-bounce`}
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                      <span className={`text-xs ${tc.sub}`}>
                        {isCreatorMode ? 'Thinking about you…' : 'Thinking…'}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input bar */}
        {!showDashboard && (
          <div className={`flex-shrink-0 border-t ${tc.header} px-3 py-3 md:px-6`}>
            <div className="max-w-2xl mx-auto flex gap-2 items-end">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={e => { e.preventDefault(); startRecording(); }}
                onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
                disabled={isLoading}
                className={`
                  flex-shrink-0 p-2.5 rounded-xl border transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isRecording ? 'bg-red-500/80 border-red-400 recording-indicator' : tc.soft}
                `}
                title="Hold to speak"
              >
                {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                placeholder={isCreatorMode ? 'Tell me anything…' : 'Message T.E.S.S.A…'}
                disabled={isLoading}
                rows={1}
                className={`
                  flex-1 px-3.5 py-2.5 rounded-xl border text-sm resize-none
                  focus:outline-none focus:ring-2
                  ${isCreatorMode ? 'focus:ring-pink-500/30' : 'focus:ring-cyan-500/30'}
                  ${tc.input} transition-all duration-200
                `}
                style={{ minHeight: '44px', maxHeight: '144px' }}
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className={`
                  flex-shrink-0 p-2.5 rounded-xl font-bold transition-all
                  disabled:opacity-35 disabled:cursor-not-allowed active:scale-95
                  ${tc.primary}
                `}
                title="Send"
              >
                <Send size={17} />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — TIMER ONLY
      ══════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <aside
          className={`
            flex-shrink-0 border-l ${tc.aside}
            flex flex-col h-screen overflow-hidden z-20
            w-[15rem]
          `}
          aria-label="Right panel"
        >
          {/* Profile card */}
          <div className="flex-shrink-0">
            <ProfileCard
              avatarPath={avatarSrc}
              mood={currentMood}
              isCreatorMode={isCreatorMode}
              animationsEnabled={animations}
            />
          </div>

          {/* Wellness tracker */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            <DailyWellness isCreatorMode={isCreatorMode} />

            {/* Study timer */}
            {isCreatorMode && (
              <div>
                <p className={`text-xs font-bold ${tc.sH} mb-3`}>⏱️ Study Timer</p>
                <StudyTimer />
              </div>
            )}

            {/* Memory */}
            {isCreatorMode && (
              <div className="settings-section">
                <h3 className="text-xs font-bold text-gray-400 mb-2">🧠 Memory</h3>
                <p className={`text-[10px] ${tc.sub} mb-2`}>
                  {getAllMemories().length} facts remembered
                </p>
                <button
                  onClick={() => { if (confirm('Clear all memories?')) clearAllMemories(); }}
                  className="w-full py-1.5 rounded-lg text-xs border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"
                >
                  Clear Memory
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {showSecretModal && (
        <SecretVerification
          onSuccess={unlockCreatorModeAction}
          onClose={() => setShowSecretModal(false)}
        />
      )}

      {showAvatarModal && (
        <AvatarPresets
          currentAvatar={avatar}
          onAvatarChange={path => {
            setAvatar(path);
            lsSet('tessa-avatar-preset', path);
          }}
          onClose={() => setShowAvatarModal(false)}
        />
      )}

      {showPlanners && (
        <PlannerHub onClose={() => setShowPlanners(false)} />
      )}

      {showFlashcards && (
        <FlashcardGenerator
          isCreatorMode={isCreatorMode}
          onClose={() => setShowFlashcards(false)}
        />
      )}

      {showReportCard && (
        <ReportCard
          isCreatorMode={isCreatorMode}
          onClose={() => setShowReportCard(false)}
        />
      )}

    </div>
  );
}
