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
import SecretVerification   from '@/components/SecretVerification';
import PersonalDashboard    from '@/components/PersonalDashboard';
import AvatarPresets        from '@/components/AvatarPresets';
import NotesPanel           from '@/components/NotesPanel';
import ProfileCard          from '@/components/ProfileCard';
import StudyTimer           from '@/components/StudyTimer';
import PlannerHub           from '@/components/PlannerHub';
import SpotifyPlayer        from '@/components/SpotifyPlayer';
import { parseMusicCommand, getMusicResponse } from '@/lib/music-commands';

// ─── Lib ──────────────────────────────────────────────────────────────────────
import { supabase, getCurrentUser, signOut } from '@/lib/supabase';
import { MOOD_DESCRIPTIONS, MOOD_AVATARS }   from '@/lib/mood';
import { getRandomWelcomeMessage }           from '@/lib/profile';
import { estimateCalories }                  from '@/lib/food-database';
import {
  shouldBeProactive,
  getProactiveQuestion,
  detectMealInResponse,
  detectSleepInResponse,
  getSleepReaction,
} from '@/lib/proactive-tessa';

// ─── Local types ──────────────────────────────────────────────────────────────
type Theme          = 'dark' | 'light';
type ResponseLength = 'short' | 'medium' | 'long';

interface HealthSnapshot {
  weight      : number;
  height      : number;
  meals       : { time: string; meal: string; calories: number; confidence: string }[];
  totalCalories: number;
  sleepHours? : number;
  date        : string;
}

// ─── Theme helpers ────────────────────────────────────────────────────────────
const TC = {
  dark: {
    root  : 'bg-gradient-to-br from-[#0a0e27] via-[#141830] to-[#0d1020]',
    rootC : 'bg-gradient-to-br from-[#1a0a20] via-[#220a30] to-[#1a0820]',
    aside : 'bg-black/25 border-white/8',
    header: 'bg-black/30 border-white/8 backdrop-blur-xl',
    headerC:'bg-pink-950/20 border-pink-500/15 backdrop-blur-xl',
    card  : 'bg-white/4 border-white/8',
    body  : 'text-white',
    sub   : 'text-gray-400',
    msgU  : 'bg-[#0d1a2e] border-l-4 border-cyan-500',
    msgUC : 'bg-[#1f0a28] border-l-4 border-pink-500',
    msgA  : 'bg-[#0a1520] border-l-4 border-violet-500',
    msgAC : 'bg-[#130a20] border-l-4 border-purple-500',
    input : 'bg-white/5 border-white/15 text-white placeholder:text-white/30 focus:border-cyan-400/60',
    inputC: 'bg-pink-950/30 border-pink-500/25 text-white placeholder:text-pink-300/40 focus:border-pink-400/70',
    btnPrimary : 'bg-cyan-500 hover:bg-cyan-400 text-white',
    btnPrimaryC: 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white',
    btnSoft : 'border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300',
    btnSoftC: 'border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300',
    sectionH: 'text-cyan-400',
    sectionHC:'text-pink-400',
    accent  : 'text-cyan-400',
    accentC : 'text-pink-400',
  },
  light: {
    root  : 'bg-gradient-to-br from-slate-50 via-white to-blue-50/30',
    rootC : 'bg-gradient-to-br from-pink-50 via-white to-purple-50/30',
    aside : 'bg-white border-slate-200',
    header: 'bg-white/90 border-slate-200 backdrop-blur-xl shadow-sm',
    headerC:'bg-pink-50/90 border-pink-200 backdrop-blur-xl shadow-sm',
    card  : 'bg-slate-50 border-slate-200',
    body  : 'text-slate-800',
    sub   : 'text-slate-500',
    msgU  : 'bg-cyan-50 border-l-4 border-cyan-500',
    msgUC : 'bg-pink-50 border-l-4 border-pink-400',
    msgA  : 'bg-indigo-50/70 border-l-4 border-violet-400',
    msgAC : 'bg-purple-50/70 border-l-4 border-purple-400',
    input : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-cyan-400',
    inputC: 'bg-white border-pink-300 text-slate-800 placeholder:text-pink-300 focus:border-pink-400',
    btnPrimary : 'bg-cyan-500 hover:bg-cyan-600 text-white',
    btnPrimaryC: 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white',
    btnSoft : 'border border-cyan-500/50 bg-cyan-50 hover:bg-cyan-100 text-cyan-700',
    btnSoftC: 'border border-pink-500/50 bg-pink-50 hover:bg-pink-100 text-pink-700',
    sectionH: 'text-cyan-600',
    sectionHC:'text-pink-500',
    accent  : 'text-cyan-600',
    accentC : 'text-pink-500',
  },
} as const;

function useTc(theme: Theme, creatorMode: boolean) {
  const base = TC[theme];
  return {
    root    : creatorMode ? base.rootC    : base.root,
    aside   : base.aside,
    header  : creatorMode ? base.headerC  : base.header,
    card    : base.card,
    body    : base.body,
    sub     : base.sub,
    msgU    : creatorMode ? base.msgUC    : base.msgU,
    msgA    : creatorMode ? base.msgAC    : base.msgA,
    input   : creatorMode ? base.inputC   : base.input,
    primary : creatorMode ? base.btnPrimaryC : base.btnPrimary,
    soft    : creatorMode ? base.btnSoftC : base.btnSoft,
    sectionH: creatorMode ? base.sectionHC: base.sectionH,
    accent  : creatorMode ? base.accentC  : base.accent,
  };
}

// ─── MAX TOKENS MAP ───────────────────────────────────────────────────────────
const MAX_TOKENS: Record<ResponseLength, number> = { short: 350, medium: 700, long: 1400 };

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function Home() {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user,    setUser]    = useState<any>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [loading, setLoading] = useState(true);

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState('');
  const [isLoading,      setIsLoading]      = useState(false);
  const [currentMood,    setCurrentMood]    = useState<MoodType>('calm');
  const [isCreatorMode,  setIsCreatorMode]  = useState(false);
  const [conversations,  setConversations]  = useState<Conversation[]>([]);
  const [currentConvId,  setCurrentConvId]  = useState<string>(() => uuidv4());

  // ── UI toggles ─────────────────────────────────────────────────────────────
  const [showSidebar,          setShowSidebar]          = useState(false);
  const [showSettings,         setShowSettings]         = useState(false);
  const [showDashboard,        setShowDashboard]        = useState(false);
  const [showSecretModal,      setShowSecretModal]      = useState(false);
  const [showAvatarModal,      setShowAvatarModal]      = useState(false);
  const [showPlanners,         setShowPlanners]         = useState(false);
  const [notesExpanded,        setNotesExpanded]        = useState(true);
  const [showSpotify,          setShowSpotify]          = useState(false);
  const [spotifyQuery,         setSpotifyQuery]         = useState<string | undefined>(undefined);

  // ── Settings values ────────────────────────────────────────────────────────
  const [theme,          setThemeState]  = useState<Theme>('dark');
  const [autoSearch,     setAutoSearch]  = useState(true);
  const [voiceOutput,    setVoiceOutput] = useState(false);
  const [responseLength, setResponseLength] = useState<ResponseLength>('medium');
  const [animations,     setAnimations]  = useState(true);
  const [sfx,            setSfx]         = useState(true);
  const [autoSave,       setAutoSave]    = useState(true);
  const [avatar,         setAvatar]      = useState('/avatars/cosmic.png');

  // ── Voice ──────────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const bottomRef       = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);
  const mediaRecRef     = useRef<MediaRecorder | null>(null);
  const audioChunks     = useRef<Blob[]>([]);
  const proactiveTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const voicesReady     = useRef(false);

  // derived
  const tc = useTc(theme, isCreatorMode);

  // ─── Theme application ─────────────────────────────────────────────────────
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
    localStorage.setItem('tessa-theme', t);
  }, []);

  // ─── Initialisation ────────────────────────────────────────────────────────
  useEffect(() => {
    // Load persisted preferences
    const saved = {
      theme          : localStorage.getItem('tessa-theme') as Theme | null,
      avatar         : localStorage.getItem('tessa-avatar-preset'),
      autoSearch     : localStorage.getItem('tessa-auto-search'),
      voiceOutput    : localStorage.getItem('tessa-voice-output'),
      responseLength : localStorage.getItem('tessa-response-length') as ResponseLength | null,
      animations     : localStorage.getItem('tessa-animations'),
      sfx            : localStorage.getItem('tessa-sfx'),
    };

    if (saved.theme)          setTheme(saved.theme);
    if (saved.avatar)         setAvatar(saved.avatar);
    if (saved.autoSearch)     setAutoSearch(saved.autoSearch === 'true');
    if (saved.voiceOutput)    setVoiceOutput(saved.voiceOutput === 'true');
    if (saved.responseLength) setResponseLength(saved.responseLength);
    if (saved.animations)     setAnimations(saved.animations === 'true');
    if (saved.sfx)            setSfx(saved.sfx === 'true');

    // Preload speech voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => { voicesReady.current = true; };
      if (window.speechSynthesis.getVoices().length) voicesReady.current = true;
    }

    // Auth
    checkAuth();
    hydrateLocalConversations();

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

  // ─── Persist settings on change ────────────────────────────────────────────
  useEffect(() => { localStorage.setItem('tessa-auto-search',      String(autoSearch));     }, [autoSearch]);
  useEffect(() => { localStorage.setItem('tessa-voice-output',     String(voiceOutput));    }, [voiceOutput]);
  useEffect(() => { localStorage.setItem('tessa-response-length',  responseLength);         }, [responseLength]);
  useEffect(() => { localStorage.setItem('tessa-animations',       String(animations));     }, [animations]);
  useEffect(() => { localStorage.setItem('tessa-sfx',              String(sfx));            }, [sfx]);

  // ─── Proactive T.E.S.S.A. (creator only) ───────────────────────────────────
  useEffect(() => {
    if (proactiveTimer.current) { clearInterval(proactiveTimer.current); proactiveTimer.current = null; }

    if (!isCreatorMode) return;

    // Check once immediately (after short delay so chat is settled)
    const initialDelay = setTimeout(() => maybeSendProactive(), 5000);

    // Then check every 3 hours
    proactiveTimer.current = setInterval(() => maybeSendProactive(), 3 * 60 * 60 * 1000);

    return () => {
      clearTimeout(initialDelay);
      if (proactiveTimer.current) clearInterval(proactiveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreatorMode]);

  const maybeSendProactive = () => {
    if (!shouldBeProactive()) return;
    const q = getProactiveQuestion();
    if (!q) return;
    setMessages(prev => [
      ...prev,
      {
        id       : uuidv4(),
        role     : 'assistant' as const,
        content  : q.question,
        timestamp: new Date(),
        mood     : 'playful' as MoodType,
      },
    ]);
  };

  // ─── Auto-scroll (messages only, never sidebars) ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isLoading]);

  // ─── Auth helpers ───────────────────────────────────────────────────────────
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
    setMessages([]);
    setShowDashboard(false);
    hydrateLocalConversations();
  };

  // ─── Conversation management ────────────────────────────────────────────────
  const fetchCloudConversations = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })
        .limit(80);

      if (error || !data) return;

      setConversations(
        data.map((row: any): Conversation => ({
          id          : row.conversation_id,
          title       : row.title,
          messages    : row.messages,
          created     : new Date(row.created_at),
          updated     : new Date(row.updated_at),
          mode        : row.mode,
          moodHistory : row.mood_history ?? ['calm'],
        }))
      );
    } catch (_) {}
  };

  const hydrateLocalConversations = () => {
    try {
      const raw = localStorage.getItem('tessa-conversations');
      if (raw) setConversations(JSON.parse(raw));
    } catch (_) {}
  };

  const persistConversation = useCallback(async () => {
    if (messages.length === 0) return;

    const conv: Conversation = {
      id          : currentConvId,
      title       : messages[0].content.slice(0, 55).trimEnd() + '…',
      messages,
      created     : new Date(),
      updated     : new Date(),
      mode        : isCreatorMode ? 'creator' : 'standard',
      moodHistory : [currentMood],
    };

    if (user && !isGuest) {
      try {
        await supabase.from('conversations').upsert({
          user_id         : user.id,
          conversation_id : conv.id,
          title           : conv.title,
          messages        : conv.messages,
          mode            : conv.mode,
          mood_history    : conv.moodHistory,
          updated_at      : new Date().toISOString(),
        });
        fetchCloudConversations(user.id);
      } catch (_) {}
    } else if (autoSave) {
      const next = [conv, ...conversations.filter(c => c.id !== currentConvId)].slice(0, 50);
      setConversations(next);
      localStorage.setItem('tessa-conversations', JSON.stringify(next));
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
    const modeOk = (conv.mode === 'creator') === isCreatorMode;
    if (!modeOk) { alert(`Switch to ${conv.mode} mode first`); return; }
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    setCurrentMood(conv.moodHistory?.at(-1) ?? 'calm');
    setShowSidebar(false);
  };

  const removeConversation = async (id: string) => {
    if (user && !isGuest) {
      try {
        await supabase.from('conversations').delete()
          .eq('conversation_id', id).eq('user_id', user.id);
        fetchCloudConversations(user.id);
      } catch (_) {}
    } else {
      const next = conversations.filter(c => c.id !== id);
      setConversations(next);
      localStorage.setItem('tessa-conversations', JSON.stringify(next));
    }
  };

  // ─── Dashboard auto-update ──────────────────────────────────────────────────
  const parseDashboardUpdates = (text: string): string => {
    if (!isCreatorMode) return '';
    let extra = '';

    try {
      // Meal detection
      const foodHit = detectMealInResponse(text);
      if (foodHit) {
        const result = estimateCalories(foodHit.food);
        const rawHealth = localStorage.getItem('tessa-health');
        const health: HealthSnapshot = rawHealth
          ? JSON.parse(rawHealth)
          : { weight: 0, height: 0, meals: [], totalCalories: 0, date: new Date().toISOString().split('T')[0] };

        health.meals = health.meals ?? [];
        health.meals.push({
          time      : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          meal      : result.food,
          calories  : result.calories,
          confidence: result.confidence,
        });
        health.totalCalories = (health.totalCalories ?? 0) + result.calories;
        localStorage.setItem('tessa-health', JSON.stringify(health));
      }

      // Sleep detection
      const sleepHit = detectSleepInResponse(text);
      if (sleepHit) {
        const rawHealth = localStorage.getItem('tessa-health');
        const health: HealthSnapshot = rawHealth
          ? JSON.parse(rawHealth)
          : { weight: 0, height: 0, meals: [], totalCalories: 0, date: new Date().toISOString().split('T')[0] };
        health.sleepHours = sleepHit.hours;
        localStorage.setItem('tessa-health', JSON.stringify(health));
        extra = '\n\n' + getSleepReaction(sleepHit.hours);
      }
    } catch (_) {}

    return extra;
  };

  // ─── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || isLoading) return;

    // Parse user message for dashboard updates and get any extra reaction
    const sleepReaction = parseDashboardUpdates(text);

    // ── Music command detection ──────────────────────────────────────────────
    const musicCmd = parseMusicCommand(text);
    if (musicCmd) {
      const musicReply = getMusicResponse(musicCmd);

      const userMsg: Message = {
        id: uuidv4(), role: 'user', content: text, timestamp: new Date(),
      };
      const botMsg: Message = {
        id: uuidv4(), role: 'assistant', content: musicReply, timestamp: new Date(), mood: 'playful',
      };
      setMessages(prev => [...prev, userMsg, botMsg]);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = '48px';

      if (musicCmd.type === 'play' || musicCmd.type === 'search') {
        setSpotifyQuery(musicCmd.query);
        setShowSpotify(true);
      }
      if (musicCmd.type === 'close') setShowSpotify(false);
      if (sfx) playChime();
      return;                        // ← skip normal API call
    }
    // ────────────────────────────────────────────────────────────────────────

    const userMsg: Message = {
      id        : uuidv4(),
      role      : 'user',
      content   : text,
      timestamp : new Date(),
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

      const assistantMsg: Message = {
        id        : uuidv4(),
        role      : 'assistant',
        content   : data.content + sleepReaction,
        timestamp : new Date(),
        mood      : data.mood as MoodType | undefined,
      };

      setMessages(prev => [...prev, assistantMsg]);
      if (data.mood) setCurrentMood(data.mood as MoodType);

      if (voiceOutput) speakText(data.content);
      if (sfx)         playChime();
      if (autoSave)    setTimeout(persistConversation, 1000);

    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id       : uuidv4(),
          role     : 'assistant' as const,
          content  : `⚠️ ${err?.message ?? 'Something went wrong — please try again.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  // ─── Speech synthesis ───────────────────────────────────────────────────────
  const speakText = (raw: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Strip markdown-ish symbols for cleaner TTS
    const clean = raw
      .replace(/\*\*/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~`]/g, '')
      .slice(0, 600);

    const utter = new SpeechSynthesisUtterance(clean);
    utter.pitch = 1.45;
    utter.rate  = 1.1;
    utter.lang  = 'en-IN';

    const assignFemaleVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Priority order: known good female voices
      const female = voices.find(v =>
        /samantha|victoria|karen|moira|fiona|kate|veena|zira|google (us english|uk english female)/i.test(v.name)
      ) ?? voices.find(v =>
        /female|woman/i.test(v.name)
      );
      if (female) utter.voice = female;
      window.speechSynthesis.speak(utter);
    };

    if (voicesReady.current) {
      assignFemaleVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady.current = true;
        assignFemaleVoice();
      };
    }
  };

  // ─── Audio chime ────────────────────────────────────────────────────────────
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
    } catch (_) {}
  };

  // ─── Voice recording ────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks.current = [];

      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecRef.current = rec;

      rec.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };

      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        runSpeechRecognition();
      };

      rec.start();
      setIsRecording(true);
    } catch (_) {
      alert('Microphone access denied — please allow mic permissions in your browser settings.');
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
      setInput('🎤 Transcription unsupported in this browser — please type your message.');
      return;
    }
    const rec = new SR();
    rec.lang             = 'en-IN';
    rec.continuous       = false;
    rec.interimResults   = false;
    rec.onresult         = (e: any) => setInput(e.results[0][0].transcript);
    rec.onerror          = ()       => setInput('🎤 Couldn\'t understand — please type instead.');
    try { rec.start(); } catch (_) {}
  };

  // ─── Creator mode ────────────────────────────────────────────────────────────
  const unlockCreatorMode = () => {
    persistConversation();
    setIsCreatorMode(true);
    setCurrentConvId(uuidv4());
    setCurrentMood('loving');
    setMessages([{
      id       : uuidv4(),
      role     : 'assistant',
      content  : getRandomWelcomeMessage(),
      timestamp: new Date(),
      mood     : 'loving',
    }]);
    setShowSecretModal(false);
    setShowSettings(false);
    if (sfx) playChime();
  };

  const exitCreatorMode = () => {
    persistConversation();
    setIsCreatorMode(false);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
    setMessages([]);
    setShowDashboard(false);
  };

  // ─── Keyboard handler ────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ─── Textarea auto-resize ────────────────────────────────────────────────────
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 144) + 'px';
  };

  // ─── Derived UI ───────────────────────────────────────────────────────────────
  const shownConversations = conversations.filter(
    c => c.mode === (isCreatorMode ? 'creator' : 'standard')
  );

  const avatarSrc = avatar || '/avatars/cosmic.png';

  // ─── Loading screen ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-[#0a0e27] flex items-center justify-center">
        <div className="text-center">
          <div className={`text-5xl mb-5 ${animations ? 'animate-bounce' : ''}`}>🌌</div>
          <p className="text-gray-400 text-sm tracking-[0.2em] uppercase">Initialising T.E.S.S.A.</p>
        </div>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen ${tc.root} ${tc.body} flex overflow-hidden relative transition-colors duration-500`}>

      {/* ── Ambient floating hearts (creator, animated) ──────────────────── */}
      {isCreatorMode && animations && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
          {['8%','22%','38%','55%','70%','87%'].map((left, i) => (
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

      {/* ════════════════════════════════════════════════════════════════════
          LEFT SIDEBAR
      ════════════════════════════════════════════════════════════════════ */}
      <aside
        className={`
          flex-shrink-0 border-r ${tc.aside}
          flex flex-col h-screen overflow-hidden z-20
          transition-all duration-300 ease-in-out
          ${showSidebar ? 'w-[17rem] md:w-72' : 'w-0'}
        `}
        aria-label="Left sidebar"
      >
        {/* ── Notes panel ──────────────────────────────────────────── */}
        <div className="flex-shrink-0">
          <button
            onClick={() => setNotesExpanded(p => !p)}
            className={`
              w-full flex items-center justify-between px-4 py-3
              border-b ${tc.aside} text-sm font-semibold ${tc.sectionH}
              hover:bg-white/5 transition-colors
            `}
          >
            <span className="flex items-center gap-2">
              <StickyNote size={14} />
              Quick Notes
            </span>
            {notesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {notesExpanded && (
            <div className="max-h-56 overflow-y-auto">
              <NotesPanel />
            </div>
          )}
        </div>

        {/* ── Chat history ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 border-t border-white/5">

          {/* Header + new chat */}
          <div className="flex-shrink-0 p-3 pb-2">
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${tc.sectionH}`}>
              💬 {isCreatorMode ? 'Our Chats' : 'History'}
            </p>
            <button
              onClick={startNewChat}
              className={`w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${tc.soft}`}
            >
              <Plus size={13} />
              New Chat
            </button>
          </div>

          {/* Scrollable list — fixed height, never expands with content */}
          <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-3 space-y-1.5">
            {shownConversations.length === 0 && (
              <p className={`text-xs text-center py-8 ${tc.sub}`}>No chats yet</p>
            )}

            {shownConversations.map(conv => (
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

        {/* ── Account section ───────────────────────────────────────── */}
        <div className={`flex-shrink-0 p-3 border-t ${tc.aside}`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${tc.sectionH}`}>
            <User size={12} />
            Account
          </p>

          {user && !isGuest ? (
            <div className="space-y-1.5">
              <p className={`text-xs truncate ${tc.sub}`}>{user.email}</p>
              <button
                onClick={handleSignOut}
                className="w-full py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-400 text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <LogOut size={12} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <p className={`text-xs ${tc.sub}`}>👤 Guest Mode</p>
              <button
                onClick={() => alert('Configure Supabase auth to enable sign-in!')}
                className={`w-full py-1.5 rounded-lg text-xs transition-all ${tc.soft}`}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN AREA
      ════════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0 z-10">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className={`flex-shrink-0 border-b ${tc.header} px-3 py-2.5`}>
          <div className="flex items-center justify-between gap-2">

            {/* Left cluster */}
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Hamburger */}
              <button
                onClick={() => setShowSidebar(p => !p)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle sidebar"
              >
                {showSidebar ? <X size={19} /> : <Menu size={19} />}
              </button>

              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className={`
                  w-10 h-10 rounded-full overflow-hidden border-2 flex-shrink-0
                  ${isCreatorMode
                    ? `border-pink-500 ${animations ? 'animate-edge-pulse-creator' : ''}`
                    : `border-cyan-400 ${animations ? 'animate-edge-pulse-standard' : ''}`
                  }
                `}>
                  <img
                    src={avatarSrc}
                    alt="T.E.S.S.A. avatar"
                    className={`w-full h-full object-cover ${
                      animations
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

              {/* Name + subtitle */}
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-none holographic-text">T.E.S.S.A.</h1>
                <p className={`text-[10px] mt-0.5 ${tc.sub}`}>
                  {isCreatorMode ? '💝 Personal Mode' : 'AI Assistant'}
                </p>
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Mood chip — hidden on tiny screens */}
              <span className={`
                hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] border
                ${isCreatorMode
                  ? 'bg-pink-500/10 border-pink-500/25 text-pink-300'
                  : 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300'
                }
              `}>
                {(MOOD_DESCRIPTIONS as Record<string,string>)[currentMood] ?? currentMood}
              </span>

              {/* Creator-only: Planners */}
              {isCreatorMode && (
                <button
                  onClick={() => setShowPlanners(true)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Smart Planners"
                >
                  <Calendar size={17} />
                </button>
              )}

              {/* Music player toggle — always visible */}
              <button
                onClick={() => setShowSpotify(p => !p)}
                className={`p-1.5 rounded-lg transition-colors ${showSpotify ? 'bg-green-500/20 text-green-400' : 'hover:bg-white/10'}`}
                title="Music Player"
              >
                🎵
              </button>

              {/* Creator-only: Dashboard */}
              {isCreatorMode && (
                <button
                  onClick={() => setShowDashboard(p => !p)}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${showDashboard ? 'bg-pink-500/20 text-pink-300' : 'hover:bg-white/10'}
                  `}
                  title="Personal Dashboard"
                >
                  <LayoutDashboard size={17} />
                </button>
              )}

              {/* Theme toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(p => !p)}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-white/10' : 'hover:bg-white/10'}`}
                title="Settings"
              >
                {showSettings ? <X size={17} /> : <Settings size={17} />}
              </button>
            </div>
          </div>
        </header>

        {/* ── Messages / Dashboard ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-5 md:px-6">
          <div className="max-w-2xl mx-auto">

            {/* Dashboard view */}
            {showDashboard && isCreatorMode ? (
              <PersonalDashboard />

            ) : (
              /* Chat view */
              <div className="space-y-3">

                {/* Spotify player — floating above chat */}
                {showSpotify && (
                  <div className="flex justify-center mb-2">
                    <SpotifyPlayer
                      isCreatorMode={isCreatorMode}
                      initialQuery={spotifyQuery}
                      onClose={() => setShowSpotify(false)}
                    />
                  </div>
                )}

                {/* Empty state */}
                {messages.length === 0 && (
                  <div className="text-center py-20 select-none">
                    <div className={`text-5xl mb-4 ${animations ? 'animate-pulse' : ''}`}>
                      {isCreatorMode ? '💝' : '🌌'}
                    </div>
                    <p className={`text-base font-semibold ${tc.body}`}>
                      {isCreatorMode ? `Hey Ankit! 💕` : 'Hello!'}
                    </p>
                    <p className={`text-sm mt-1 ${tc.sub}`}>
                      {isCreatorMode
                        ? "What's on your mind today?"
                        : 'Ask me anything — I\'m here to help!'}
                    </p>
                  </div>
                )}

                {/* Messages */}
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`
                      rounded-xl px-4 py-3.5 animate-fadeIn
                      ${msg.role === 'user' ? tc.msgU : tc.msgA}
                    `}
                  >
                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      theme === 'light' ? 'text-slate-800' : 'text-gray-100'
                    }`}>
                      {msg.content}
                    </p>
                    <p className={`text-[10px] mt-2 ${tc.sub}`}>
                      {msg.role === 'user' ? '👤 You' : '✨ T.E.S.S.A.'}
                      {' · '}
                      {msg.timestamp instanceof Date
                        ? msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                        : new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      }
                    </p>
                  </div>
                ))}

                {/* Typing indicator */}
                {isLoading && (
                  <div className={`rounded-xl px-4 py-3.5 ${tc.msgA}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 150, 300].map(delay => (
                          <div
                            key={delay}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCreatorMode ? 'bg-pink-400' : 'bg-cyan-400'
                            } animate-bounce`}
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

                {/* Scroll anchor */}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>

        {/* ── Input bar (hidden when dashboard is open) ─────────────── */}
        {!showDashboard && (
          <div className={`flex-shrink-0 border-t ${tc.header} px-3 py-3 md:px-6`}>
            <div className="max-w-2xl mx-auto flex gap-2 items-end">

              {/* Mic button */}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={e => { e.preventDefault(); startRecording(); }}
                onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
                disabled={isLoading}
                className={`
                  flex-shrink-0 p-2.5 rounded-xl border transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${isRecording
                    ? 'bg-red-500/80 border-red-400 recording-indicator'
                    : tc.soft
                  }
                `}
                title="Hold to speak"
              >
                {isRecording ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              {/* Textarea */}
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
                  ${tc.input}
                  transition-all duration-200
                `}
                style={{ minHeight: '44px', maxHeight: '144px' }}
              />

              {/* Send button */}
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

      {/* ════════════════════════════════════════════════════════════════════
          RIGHT SIDEBAR — SETTINGS
      ════════════════════════════════════════════════════════════════════ */}
      {showSettings && (
        <aside
          className={`
            flex-shrink-0 border-l ${tc.aside}
            flex flex-col h-screen overflow-hidden z-20
            w-[17rem] md:w-72
          `}
          aria-label="Settings panel"
        >
          {/* Profile card — fixed at top */}
          <div className="flex-shrink-0">
            <ProfileCard
              avatarPath={avatarSrc}
              mood={currentMood}
              isCreatorMode={isCreatorMode}
              animationsEnabled={animations}
            />
          </div>

          {/* Settings header */}
          <div className={`flex-shrink-0 px-4 py-2.5 border-b ${tc.aside}`}>
            <h2 className={`font-bold text-sm ${tc.sectionH}`}>⚙️ Settings</h2>
          </div>

          {/* Scrollable settings body */}
          <div className="flex-1 overflow-y-auto settings-scroll px-3 py-3 space-y-3">

            {/* ── Theme ────────────────────────────────────────────── */}
            <section className="settings-section">
              <h3>{theme === 'dark' ? '🌙' : '☀️'} Theme</h3>
              <div className="flex rounded-lg overflow-hidden border border-white/10 mt-2">
                {(['dark','light'] as Theme[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`
                      flex-1 py-1.5 text-xs font-medium capitalize transition-all
                      ${theme === t
                        ? `${isCreatorMode ? 'bg-pink-500' : 'bg-cyan-500'} text-white`
                        : 'hover:bg-white/8'
                      }
                    `}
                  >
                    {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Avatar ───────────────────────────────────────────── */}
            <section className="settings-section">
              <h3>🎨 Avatar</h3>
              <button
                onClick={() => setShowAvatarModal(true)}
                className={`w-full py-1.5 rounded-lg text-xs font-semibold mt-2 transition-all ${tc.soft}`}
              >
                Choose Preset
              </button>
            </section>

            {/* ── Audio ────────────────────────────────────────────── */}
            <section className="settings-section">
              <h3>🔊 Audio</h3>
              <div className="space-y-2 mt-1">
                {([
                  { label: 'Voice Output (female)', val: voiceOutput, set: setVoiceOutput },
                  { label: 'Sound Effects',         val: sfx,         set: setSfx         },
                ] as const).map(({ label, val, set }) => (
                  <label key={label} className="flex items-center justify-between cursor-pointer text-xs">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={val}
                      onChange={e => (set as (v: boolean) => void)(e.target.checked)}
                      className="w-3.5 h-3.5 accent-pink-500"
                    />
                  </label>
                ))}
              </div>
            </section>

            {/* ── Chat ─────────────────────────────────────────────── */}
            <section className="settings-section">
              <h3>💬 Chat</h3>
              <div className="space-y-3 mt-1">

                {/* Response length */}
                <div>
                  <p className="text-xs mb-1.5">Response Length</p>
                  <div className="flex rounded-lg overflow-hidden border border-white/10">
                    {(['short','medium','long'] as ResponseLength[]).map(l => (
                      <button
                        key={l}
                        onClick={() => setResponseLength(l)}
                        className={`
                          flex-1 py-1.5 text-xs capitalize transition-all
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

                <label className="flex items-center justify-between cursor-pointer text-xs">
                  <span>Auto Web Search</span>
                  <input
                    type="checkbox"
                    checked={autoSearch}
                    onChange={e => setAutoSearch(e.target.checked)}
                    className="w-3.5 h-3.5 accent-pink-500"
                  />
                </label>
              </div>
            </section>

            {/* ── Visual ───────────────────────────────────────────── */}
            <section className="settings-section">
              <h3>✨ Visual</h3>
              <label className="flex items-center justify-between cursor-pointer text-xs mt-1">
                <span>Animations & Glows</span>
                <input
                  type="checkbox"
                  checked={animations}
                  onChange={e => setAnimations(e.target.checked)}
                  className="w-3.5 h-3.5 accent-pink-500"
                />
              </label>
            </section>

            {/* ── Data ─────────────────────────────────────────────── */}
            <section className="settings-section">
              <h3>💾 Data</h3>
              <label className="flex items-center justify-between cursor-pointer text-xs mt-1 mb-2">
                <span>Auto-save Chats</span>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={e => setAutoSave(e.target.checked)}
                  className="w-3.5 h-3.5 accent-pink-500"
                />
              </label>
              <p className={`text-[10px] ${tc.sub}`}>
                {user && !isGuest ? '☁️ Cloud synced to Supabase' : '📱 Stored locally on device'}
              </p>
            </section>

            {/* ── Study timer (creator only) ────────────────────────── */}
            {isCreatorMode && (
              <section className="settings-section">
                <h3>⏱️ Study Timer</h3>
                <div className="mt-2">
                  <StudyTimer />
                </div>
              </section>
            )}

            {/* ── Smart planners (creator only) ─────────────────────── */}
            {isCreatorMode && (
              <section className="settings-section">
                <h3>📋 Smart Planners</h3>
                <button
                  onClick={() => setShowPlanners(true)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold mt-2 transition-all ${tc.soft}`}
                >
                  Open Planners
                </button>
              </section>
            )}

            {/* ── Unlock / Exit creator ─────────────────────────────── */}
            {!isCreatorMode ? (
              <section className="settings-section" style={{ borderColor: 'rgba(236,72,153,0.3)' }}>
                <h3 className="text-pink-400">💝 Special Access</h3>
                <button
                  onClick={() => setShowSecretModal(true)}
                  className="w-full py-1.5 rounded-lg border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold mt-2 transition-all"
                >
                  🔓 Unlock Creator Mode
                </button>
              </section>
            ) : (
              <section className="settings-section" style={{ borderColor: 'rgba(236,72,153,0.3)' }}>
                <h3 className="text-pink-400">💝 Creator Mode</h3>
                <p className={`text-[10px] ${tc.sub} mb-2`}>Active — proactive mode on 🌸</p>
                <button
                  onClick={exitCreatorMode}
                  className="w-full py-1.5 rounded-lg border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 text-xs transition-all"
                >
                  Exit Creator Mode
                </button>
              </section>
            )}

          </div>
        </aside>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODALS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Secret verification */}
      {showSecretModal && (
        <SecretVerification
          onSuccess={unlockCreatorMode}
          onClose={() => setShowSecretModal(false)}
        />
      )}

      {/* Avatar presets */}
      {showAvatarModal && (
        <AvatarPresets
          currentAvatar={avatar}
          onAvatarChange={path => {
            setAvatar(path);
            localStorage.setItem('tessa-avatar-preset', path);
          }}
          onClose={() => setShowAvatarModal(false)}
        />
      )}

      {/* Smart planners hub */}
      {showPlanners && (
        <PlannerHub onClose={() => setShowPlanners(false)} />
      )}

    </div>
  );
}
