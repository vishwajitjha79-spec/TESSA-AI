'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, MoodType, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Send, Mic, MicOff, Menu, X, Settings, Heart, Plus, Trash2, LogOut, User, LayoutDashboard } from 'lucide-react';
import { MOOD_AVATARS, MOOD_DESCRIPTIONS } from '@/lib/mood';
import { getRandomWelcomeMessage } from '@/lib/profile';
import SecretVerification from '@/components/SecretVerification';
import PersonalDashboard from '@/components/PersonalDashboard';
import AvatarPresets from '@/components/AvatarPresets';
import NotesPanel from '@/components/NotesPanel';
import ProfileCard from '@/components/ProfileCard';
import StudyTimer from '@/components/StudyTimer';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(true); // Start as guest (no login screen)
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodType>('calm');
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  
  // UI state
  const [showHistory, setShowHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSecretVerification, setShowSecretVerification] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState(uuidv4());
  
  // Settings
  const [autoSearch, setAutoSearch] = useState(true);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [customAvatar, setCustomAvatar] = useState<string>('/avatars/cosmic.png');
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check auth on mount
  useEffect(() => {
    checkUser();
    loadCustomAvatar();
    loadLocalConversations();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setIsGuest(false);
        loadUserConversations(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setLoading(false);
    
    if (currentUser) {
      setIsGuest(false);
      loadUserConversations(currentUser.id);
    }
  };

  const loadCustomAvatar = () => {
    const saved = localStorage.getItem('tessa-avatar-preset');
    if (saved) {
      setCustomAvatar(saved);
    }
  };

  const handleAvatarChange = (newAvatar: string) => {
    setCustomAvatar(newAvatar);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsGuest(true);
    setMessages([]);
    setConversations([]);
    setIsCreatorMode(false);
    loadLocalConversations();
  };

  const handleSignIn = () => {
    // For now, just show an alert - you can add LoginPage component if needed
    alert('Sign in feature: Visit your deployment URL and use Supabase auth. For now, continue as guest!');
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations
  const loadUserConversations = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (data) {
        const formatted: Conversation[] = data.map((conv: any) => ({
          id: conv.conversation_id,
          title: conv.title,
          messages: conv.messages,
          created: new Date(conv.created_at),
          updated: new Date(conv.updated_at),
          mode: conv.mode as 'standard' | 'creator',
          moodHistory: conv.mood_history,
        }));
        setConversations(formatted);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadLocalConversations = () => {
    const saved = localStorage.getItem('tessa-conversations');
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load local conversations');
      }
    }
  };

  // Save conversation
  const saveConversation = async () => {
    if (messages.length === 0) return;

    const conv: Conversation = {
      id: currentConvId,
      title: messages[0]?.content.slice(0, 40) + '...' || 'New Chat',
      messages,
      created: new Date(),
      updated: new Date(),
      mode: isCreatorMode ? 'creator' : 'standard',
      moodHistory: [currentMood],
    };

    if (user && !isGuest) {
      try {
        await supabase.from('conversations').upsert({
          user_id: user.id,
          conversation_id: conv.id,
          title: conv.title,
          messages: conv.messages,
          mode: conv.mode,
          mood_history: conv.moodHistory,
          updated_at: new Date().toISOString(),
        });
        await loadUserConversations(user.id);
      } catch (error) {
        console.error('Failed to save:', error);
      }
    } else {
      const updated = [conv, ...conversations.filter(c => c.id !== currentConvId)].slice(0, 50);
      setConversations(updated);
      if (autoSave) {
        localStorage.setItem('tessa-conversations', JSON.stringify(updated));
      }
    }
  };

  const getMaxTokens = () => {
    const tokens = { short: 300, medium: 600, long: 1200 };
    return tokens[responseLength];
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const needsSearch = autoSearch && (
        /search|find|latest|current|today|2024|2025|2026|now|recent|\?/.test(textToSend.toLowerCase())
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          isCreatorMode,
          currentMood,
          needsSearch,
          maxTokens: getMaxTokens(),
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        mood: data.mood,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentMood(data.mood);
      
      if (voiceOutput) speak(data.content);
      if (soundEffects) playSound('message');
      if (autoSave) setTimeout(saveConversation, 500);

    } catch (error: any) {
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `⚠️ Error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  const playSound = (type: string) => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.frequency.value = type === 'message' ? 800 : 600;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.1);
    } catch (e) {
      console.log('Audio not available');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        setRecordedAudio(new Blob(chunks, { type: 'audio/webm' }));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      if (soundEffects) playSound('start');
    } catch (error) {
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (soundEffects) playSound('stop');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCreatorUnlock = () => {
    saveConversation();
    setIsCreatorMode(true);
    setMessages([{
      id: uuidv4(),
      role: 'assistant',
      content: getRandomWelcomeMessage(),
      timestamp: new Date(),
      mood: 'loving',
    }]);
    setCurrentConvId(uuidv4());
    setCurrentMood('loving');
    setShowSecretVerification(false);
    setShowSettings(false);
    if (soundEffects) playSound('unlock');
  };

  const exitCreatorMode = () => {
    saveConversation();
    setIsCreatorMode(false);
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
    setShowDashboard(false);
  };

  const startNewChat = () => {
    saveConversation();
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
  };

  const loadConversation = (conv: Conversation) => {
    if ((conv.mode === 'creator' && !isCreatorMode) || (conv.mode === 'standard' && isCreatorMode)) {
      alert(`Cannot load ${conv.mode} chat in ${isCreatorMode ? 'creator' : 'standard'} mode`);
      return;
    }
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    setCurrentMood(conv.moodHistory[conv.moodHistory.length - 1] || 'calm');
  };

  const deleteConversation = async (id: string) => {
    if (user && !isGuest) {
      try {
        await supabase.from('conversations').delete().eq('user_id', user.id).eq('conversation_id', id);
        await loadUserConversations(user.id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    } else {
      const updated = conversations.filter(c => c.id !== id);
      setConversations(updated);
      localStorage.setItem('tessa-conversations', JSON.stringify(updated));
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.mode === (isCreatorMode ? 'creator' : 'standard')
  );

  const bgStyle = isCreatorMode
    ? 'bg-gradient-to-br from-pink-900/20 via-purple-900/30 to-rose-900/20'
    : 'bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0d1117]';

  const getAvatarImage = () => {
    if (customAvatar) return customAvatar;
    if (MOOD_AVATARS[currentMood]) return MOOD_AVATARS[currentMood];
    return '/avatars/cosmic.png';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🌌</div>
          <p className="text-gray-400">Loading T.E.S.S.A...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgStyle} text-white flex transition-all duration-500 ${showDashboard ? 'dashboard-active' : ''}`}>
      
      {/* Floating hearts */}
      {isCreatorMode && animationsEnabled && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-heart opacity-20 text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 2}s`,
                animationDuration: `${8 + Math.random() * 4}s`,
              }}
            >
              ❤️
            </div>
          ))}
        </div>
      )}
      
      {/* LEFT SIDEBAR */}
      <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 border-r ${isCreatorMode ? 'border-pink-500/30' : 'border-primary/20'} bg-black/20 overflow-hidden flex flex-col`}>
        
        {/* Notes Panel */}
        <NotesPanel />
        
        {/* Chat History */}
        <div className="flex-1 overflow-hidden flex flex-col border-t border-primary/20">
          <div className="p-4 border-b border-primary/20">
            <h3 className={`text-sm font-bold mb-3 ${isCreatorMode ? 'text-pink-400' : 'text-primary'}`}>
              💬 {isCreatorMode ? 'Our Chats' : 'History'}
            </h3>
            <button
              onClick={startNewChat}
              className={`w-full px-4 py-2 ${isCreatorMode ? 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30' : 'bg-primary/10 hover:bg-primary/20 border-primary/30'} border rounded-lg flex items-center justify-center gap-2 transition-all text-sm`}
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-2">
            {filteredConversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                  conv.id === currentConvId
                    ? isCreatorMode ? 'bg-pink-500/20 border-pink-500' : 'bg-primary/20 border-primary'
                    : isCreatorMode ? 'bg-white/5 border-pink-500/10 hover:bg-white/10' : 'bg-white/5 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => loadConversation(conv)}>
                    <p className="text-xs font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{conv.messages.length} msgs</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conv.id);
                    }}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            
            {filteredConversations.length === 0 && (
              <div className="text-center text-gray-400 py-6">
                <p className="text-xs">No chats yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Section */}
        <div className="p-4 border-t border-primary/20">
          <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <User size={16} />
            Account
          </h3>
          {user && !isGuest ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
              <button
                onClick={handleSignOut}
                className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded text-xs flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">👤 Guest Mode</p>
              <button
                onClick={handleSignIn}
                className="w-full px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-primary rounded text-xs"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header */}
        <header className={`border-b ${isCreatorMode ? 'border-pink-500/20 bg-pink-900/10' : 'border-primary/20 bg-black/30'} backdrop-blur-lg p-4 sticky top-0 z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Menu size={24} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isCreatorMode ? 'border-pink-500 animate-edge-pulse-creator' : 'border-primary animate-edge-pulse-standard'}`}>
                    <img 
                      src={getAvatarImage()} 
                      alt="T.E.S.S.A."
                      className={`w-full h-full object-cover ${animationsEnabled ? (isCreatorMode ? 'neon-avatar-creator' : 'neon-avatar-standard') : ''}`}
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1">
                    <Heart size={14} className={`${isCreatorMode ? 'fill-pink-500 text-pink-500' : 'fill-primary text-primary'} ${animationsEnabled ? 'animate-pulse' : ''}`} />
                  </div>
                </div>
                
                <div>
                  <h1 className={`text-xl font-bold ${isCreatorMode ? 'text-pink-400' : ''} holographic-text`}>
                    T.E.S.S.A.
                  </h1>
                  <p className="text-xs text-gray-400">
                    {isCreatorMode ? '💝 Personal' : 'AI Assistant'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 ${isCreatorMode ? 'bg-pink-500/20 border-pink-500/40' : 'bg-secondary/20 border-secondary/40'} border rounded-full text-xs`}>
                {MOOD_DESCRIPTIONS[currentMood]}
              </div>
              
              {isCreatorMode && (
                <button
                  onClick={() => setShowDashboard(!showDashboard)}
                  className={`p-2 rounded-lg ${showDashboard ? 'bg-pink-500/20' : 'hover:bg-white/10'} transition-colors`}
                  title="Dashboard"
                >
                  <LayoutDashboard size={20} className={showDashboard ? 'text-pink-400' : ''} />
                </button>
              )}
              
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Messages / Dashboard */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {showDashboard && isCreatorMode ? (
              <PersonalDashboard />
            ) : (
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <p className="text-xl mb-2">{isCreatorMode ? '💝 Hey Ankit!' : '👋 Hello!'}</p>
                    <p className="text-sm">{isCreatorMode ? "What's on your mind?" : "Ask me anything!"}</p>
                  </div>
                )}
                
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg animate-fadeIn ${
                      msg.role === 'user'
                        ? isCreatorMode ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-l-4 border-pink-500' : 'bg-primary/10 border-l-4 border-primary'
                        : isCreatorMode ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-l-4 border-purple-500' : 'bg-secondary/10 border-l-4 border-secondary'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <p className="text-xs text-gray-500 mt-2">{msg.timestamp.toLocaleTimeString()}</p>
                  </div>
                ))}
                
                {isLoading && (
                  <div className={`p-4 rounded-lg ${isCreatorMode ? 'bg-pink-500/10' : 'bg-secondary/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        {[0, 0.1, 0.2].map((delay, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${isCreatorMode ? 'bg-pink-500' : 'bg-secondary'} animate-bounce`}
                            style={{animationDelay: `${delay}s`}}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-400">{isCreatorMode ? 'Thinking about you...' : 'Thinking...'}</span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input - Hidden when dashboard open */}
        {!showDashboard && (
          <div className={`input-static border-t ${isCreatorMode ? 'border-pink-500/20 bg-pink-900/10' : 'border-primary/20 bg-black/30'} backdrop-blur-lg p-4`}>
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  disabled={isLoading}
                  className={`p-3 ${isRecording ? 'bg-red-500' : isCreatorMode ? 'bg-pink-500/20 border-pink-500/30' : 'bg-primary/20 border-primary/30'} border rounded-lg disabled:opacity-50`}
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isCreatorMode ? "Message me..." : "Message T.E.S.S.A..."}
                  disabled={isLoading}
                  rows={1}
                  className={`flex-1 px-4 py-3 ${isCreatorMode ? 'bg-pink-900/20 border-pink-500/30' : 'bg-white/5 border-primary/30'} border rounded-lg focus:outline-none resize-none text-sm`}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = t.scrollHeight + 'px';
                  }}
                />
                
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className={`px-6 py-3 ${isCreatorMode ? 'bg-pink-500' : 'bg-primary'} disabled:bg-gray-600 rounded-lg font-bold`}
                >
                  <Send size={20} />
                </button>
              </div>
              
              {recordedAudio && (
                <div className="mt-2 p-3 bg-white/5 rounded-lg flex justify-between text-sm">
                  <span>🎤 Recorded</span>
                  <div className="flex gap-2">
                    <button onClick={() => {sendMessage('🎤 Voice'); setRecordedAudio(null);}} className="px-3 py-1 bg-primary rounded text-xs">Send</button>
                    <button onClick={() => setRecordedAudio(null)} className="px-3 py-1 bg-red-500 rounded text-xs">Delete</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      {showSettings && (
        <div className="w-80 border-l border-primary/20 bg-black/20 flex flex-col">
          
          {/* Profile Card */}
          <ProfileCard
            avatarPath={getAvatarImage()}
            mood={currentMood}
            isCreatorMode={isCreatorMode}
            animationsEnabled={animationsEnabled}
          />

          {/* Settings Header */}
          <div className="p-4 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">⚙️ Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto settings-scroll p-4 space-y-4">
            
            {/* Avatar */}
            <div className="settings-section">
              <h3>🎨 Appearance</h3>
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="w-full px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded text-sm font-bold mt-2"
              >
                Choose Avatar
              </button>
              <label className="flex items-center justify-between mt-3 cursor-pointer text-sm">
                <span>Animations</span>
                <input type="checkbox" checked={animationsEnabled} onChange={(e) => setAnimationsEnabled(e.target.checked)} className="w-5 h-5" />
              </label>
            </div>

            {/* Audio */}
            <div className="settings-section">
              <h3>🔊 Audio</h3>
              <label className="flex items-center justify-between mb-2 cursor-pointer text-sm">
                <span>Voice Output</span>
                <input type="checkbox" checked={voiceOutput} onChange={(e) => setVoiceOutput(e.target.checked)} className="w-5 h-5" />
              </label>
              <label className="flex items-center justify-between cursor-pointer text-sm">
                <span>Sound Effects</span>
                <input type="checkbox" checked={soundEffects} onChange={(e) => setSoundEffects(e.target.checked)} className="w-5 h-5" />
              </label>
            </div>

            {/* Chat */}
            <div className="settings-section">
              <h3>💬 Chat</h3>
              <label className="block mb-3">
                <span className="text-sm block mb-2">Response Length</span>
                <select value={responseLength} onChange={(e) => setResponseLength(e.target.value as any)} className="w-full px-3 py-2 bg-black/30 border border-primary/30 rounded text-sm">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </label>
              <label className="flex items-center justify-between cursor-pointer text-sm">
                <span>Auto Search</span>
                <input type="checkbox" checked={autoSearch} onChange={(e) => setAutoSearch(e.target.checked)} className="w-5 h-5" />
              </label>
            </div>

            {/* Data */}
            <div className="settings-section">
              <h3>💾 Data</h3>
              <label className="flex items-center justify-between mb-2 cursor-pointer text-sm">
                <span>Auto-save</span>
                <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="w-5 h-5" />
              </label>
              {isGuest && <p className="text-xs text-yellow-400">⚠️ Guest: Local storage</p>}
              {user && !isGuest && <p className="text-xs text-green-400">✅ Cloud synced</p>}
            </div>

            {/* Study Timer */}
            {isCreatorMode && (
              <StudyTimer />
            )}

            {/* Creator Access */}
            {!isCreatorMode && (
              <div className="settings-section bg-danger/10 border-danger/30">
                <h3 className="text-danger">💝 Special</h3>
                <button onClick={() => setShowSecretVerification(true)} className="w-full px-3 py-2 bg-danger/20 border border-danger rounded text-sm font-bold mt-2">
                  🔓 Unlock
                </button>
              </div>
            )}

            {isCreatorMode && (
              <div className="settings-section bg-pink-500/10 border-pink-500/30">
                <p className="text-sm text-center font-bold mb-2">💝 Creator Mode</p>
                <button onClick={exitCreatorMode} className="w-full px-3 py-2 bg-pink-500/20 border border-pink-500 rounded text-sm">
                  Exit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showSecretVerification && (
        <SecretVerification
          onSuccess={handleCreatorUnlock}
          onClose={() => setShowSecretVerification(false)}
        />
      )}

      {showAvatarSelector && (
        <AvatarPresets
          currentAvatar={customAvatar}
          onAvatarChange={handleAvatarChange}
          onClose={() => setShowAvatarSelector(false)}
        />
      )}
    </div>
  );
}
