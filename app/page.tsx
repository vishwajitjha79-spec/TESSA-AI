'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, MoodType, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Send, Mic, MicOff, Menu, X, Settings, Heart, Plus, Trash2, Volume2, VolumeX, Sparkles, LogOut, User, Lock } from 'lucide-react';
import { MOOD_AVATARS, MOOD_DESCRIPTIONS } from '@/lib/mood';
import { getRandomWelcomeMessage } from '@/lib/profile';
import LoginPage from '@/components/LoginPage';
import SecretVerification from '@/components/SecretVerification';
import { supabase, getCurrentUser, signOut } from '@/lib/supabase';

export default function Home() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(true);
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
  const [showSecretVerification, setShowSecretVerification] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState(uuidv4());
  
  // Settings
  const [autoSearch, setAutoSearch] = useState(true);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [theme, setTheme] = useState<'auto' | 'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [autoSave, setAutoSave] = useState(true);
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Check auth status on mount
  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setShowLogin(false);
        setIsGuest(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    setLoading(false);
    
    if (currentUser) {
      setShowLogin(false);
      setIsGuest(false);
      loadUserConversations(currentUser.id);
    }
  };

  const handleGuestContinue = () => {
    setIsGuest(true);
    setShowLogin(false);
    loadLocalConversations();
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setIsGuest(false);
    setMessages([]);
    setConversations([]);
    setIsCreatorMode(false);
    setShowLogin(true);
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations
  const loadUserConversations = async (userId: string) => {
    // Load from Supabase for logged-in users
    try {
      const { data } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (data) {
        const formatted = data.map(conv => ({
          id: conv.conversation_id,
          title: conv.title,
          messages: conv.messages,
          created: new Date(conv.created_at),
          updated: new Date(conv.updated_at),
          mode: conv.mode,
          moodHistory: conv.mood_history,
        }));
        setConversations(formatted);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadLocalConversations = () => {
    // Load from localStorage for guest users
    const saved = localStorage.getItem('tessa-conversations');
    if (saved) {
      try {
        setConversations(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load conversations');
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
      // Save to Supabase
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
        console.error('Failed to save conversation:', error);
      }
    } else {
      // Save to localStorage for guest
      const updated = [conv, ...conversations.filter(c => c.id !== currentConvId)].slice(0, 50);
      setConversations(updated);
      if (autoSave) {
        localStorage.setItem('tessa-conversations', JSON.stringify(updated));
      }
    }
  };

  const getMaxTokens = () => {
    switch (responseLength) {
      case 'short': return 300;
      case 'medium': return 600;
      case 'long': return 1200;
      default: return 600;
    }
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
        textToSend.toLowerCase().includes('search') ||
        textToSend.toLowerCase().includes('find') ||
        textToSend.toLowerCase().includes('latest') ||
        textToSend.toLowerCase().includes('current') ||
        textToSend.toLowerCase().includes('today') ||
        textToSend.toLowerCase().includes('2024') ||
        textToSend.toLowerCase().includes('2025') ||
        textToSend.toLowerCase().includes('2026') ||
        textToSend.toLowerCase().includes('now') ||
        textToSend.toLowerCase().includes('recent') ||
        textToSend.includes('?')
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

      if (data.error) {
        throw new Error(data.error);
      }

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
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: `⚠️ Sorry, I encountered an error: ${error.message}. Please try again.`,
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
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedAudio(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      if (soundEffects) playSound('start');
    } catch (error) {
      alert('Please allow microphone access to use voice messages');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (soundEffects) playSound('stop');
    }
  };

  const sendVoiceMessage = () => {
    if (recordedAudio) {
      sendMessage('🎤 [Voice message - transcription not implemented yet]');
      setRecordedAudio(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const unlockCreatorMode = () => {
    setShowSecretVerification(true);
  };

  const handleCreatorUnlock = () => {
    saveConversation();
    setIsCreatorMode(true);
    setMessages([]);
    setCurrentConvId(uuidv4());
    setShowSecretVerification(false);
    setShowSettings(false);
    
    const welcomeMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: getRandomWelcomeMessage(),
      timestamp: new Date(),
      mood: 'loving',
    };
    
    setMessages([welcomeMsg]);
    setCurrentMood('loving');
    if (soundEffects) playSound('unlock');
  };

  const exitCreatorMode = () => {
    saveConversation();
    setIsCreatorMode(false);
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
    if (soundEffects) playSound('exit');
  };

  const startNewChat = () => {
    saveConversation();
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
  };

  const loadConversation = (conv: Conversation) => {
    if ((conv.mode === 'creator' && !isCreatorMode) || (conv.mode === 'standard' && isCreatorMode)) {
      alert('Cannot load ' + conv.mode + ' chat in ' + (isCreatorMode ? 'creator' : 'standard') + ' mode');
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
        console.error('Failed to delete:', error);
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

  const backgroundStyle = isCreatorMode
    ? 'bg-gradient-to-br from-pink-900/20 via-purple-900/30 to-rose-900/20'
    : 'bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0d1117]';

  // Show login screen
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

  if (showLogin) {
    return <LoginPage onGuestContinue={handleGuestContinue} />;
  }

  return (
    <div className={`min-h-screen ${backgroundStyle} text-white flex transition-all duration-500`}>
      
      {isCreatorMode && animationsEnabled && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float-heart opacity-20"
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
      
      {/* Left Sidebar */}
      <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 border-r ${isCreatorMode ? 'border-pink-500/30' : 'border-primary/20'} bg-black/20 overflow-hidden flex flex-col`}>
        <div className={`p-4 border-b ${isCreatorMode ? 'border-pink-500/30' : 'border-primary/20'}`}>
          <h2 className={`text-lg font-bold mb-4 ${isCreatorMode ? 'text-pink-400' : 'text-primary'}`}>
            💬 {isCreatorMode ? 'Our Chats' : 'Chat History'}
          </h2>
          <button
            onClick={startNewChat}
            className={`w-full px-4 py-3 ${isCreatorMode ? 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/30' : 'bg-primary/10 hover:bg-primary/20 border-primary/30'} border rounded-lg flex items-center justify-center gap-2 transition-all`}
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredConversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                conv.id === currentConvId
                  ? isCreatorMode ? 'bg-pink-500/20 border-pink-500' : 'bg-primary/20 border-primary'
                  : isCreatorMode ? 'bg-white/5 border-pink-500/10 hover:bg-white/10' : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0" onClick={() => loadConversation(conv)}>
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{conv.messages.length} messages</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          
          {filteredConversations.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p className="text-sm">No {isCreatorMode ? 'personal' : ''} chats yet</p>
              <p className="text-xs mt-2">Start chatting to see history!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        
        {/* Header */}
        <header className={`border-b ${isCreatorMode ? 'border-pink-500/20 bg-pink-900/10' : 'border-primary/20 bg-black/30'} backdrop-blur-lg p-4 sticky top-0 z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setShowHistory(!showHistory)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Menu size={24} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isCreatorMode ? 'border-pink-500' : 'border-primary'} ${animationsEnabled ? 'animate-pulse-glow' : ''}`}>
                    {MOOD_AVATARS[currentMood] ? (
                      <img src={MOOD_AVATARS[currentMood]} alt={`T.E.S.S.A. - ${currentMood}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full ${isCreatorMode ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20' : 'bg-gradient-to-br from-primary/20 to-secondary/20'} flex items-center justify-center text-2xl`}>
                        🌌
                      </div>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 ${animationsEnabled ? 'animate-ping' : ''}`}>
                    <Heart size={16} className={isCreatorMode ? 'fill-pink-500 text-pink-500' : 'fill-primary text-primary'} />
                  </div>
                </div>
                
                <div>
                  <h1 className={`text-2xl font-bold ${isCreatorMode ? 'text-pink-400' : ''} holographic-text font-['Orbitron']`}>
                    T.E.S.S.A.
                  </h1>
                  <p className="text-xs text-gray-400 tracking-wider">
                    {isCreatorMode ? '💝 Personal Mode' : 'AI Assistant'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 ${isCreatorMode ? 'bg-pink-500/20 border-pink-500/40' : 'bg-secondary/20 border-secondary/40'} border rounded-full text-sm`}>
                {MOOD_DESCRIPTIONS[currentMood]}
              </div>
              
              {user && !isGuest && (
                <div className="px-3 py-1 bg-primary/20 border border-primary/40 rounded-full text-sm flex items-center gap-2">
                  <User size={14} />
                  <span>{user.email?.split('@')[0] || 'User'}</span>
                </div>
              )}
              
              {isGuest && (
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-sm">
                  👤 Guest
                </div>
              )}
              
              <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Settings size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl mb-2">{isCreatorMode ? '💝 Hey Ankit!' : '👋 Hello!'}</p>
                <p className="text-sm">{isCreatorMode ? "I'm all yours. What's on your mind?" : "Ask me anything! I can search the internet and help with any task."}</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg animate-fadeIn ${
                  message.role === 'user'
                    ? isCreatorMode ? 'message-user bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-l-4 border-pink-500' : 'message-user'
                    : isCreatorMode ? 'message-assistant bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-l-4 border-purple-500' : 'message-assistant'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs text-gray-500 mt-2">{message.timestamp.toLocaleTimeString()}</p>
              </div>
            ))}
            
            {isLoading && (
              <div className={`p-4 rounded-lg ${isCreatorMode ? 'bg-pink-500/10 border border-pink-500/30' : 'bg-secondary/10 border border-secondary/30'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className={`w-2 h-2 rounded-full ${isCreatorMode ? 'bg-pink-500' : 'bg-secondary'} ${animationsEnabled ? 'animate-bounce' : ''}`} style={{animationDelay: '0s'}} />
                    <div className={`w-2 h-2 rounded-full ${isCreatorMode ? 'bg-pink-500' : 'bg-secondary'} ${animationsEnabled ? 'animate-bounce' : ''}`} style={{animationDelay: '0.1s'}} />
                    <div className={`w-2 h-2 rounded-full ${isCreatorMode ? 'bg-pink-500' : 'bg-secondary'} ${animationsEnabled ? 'animate-bounce' : ''}`} style={{animationDelay: '0.2s'}} />
                  </div>
                  <span className="text-sm text-gray-400">{isCreatorMode ? 'Thinking about you...' : 'Thinking...'}</span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className={`border-t ${isCreatorMode ? 'border-pink-500/20 bg-pink-900/10' : 'border-primary/20 bg-black/30'} backdrop-blur-lg p-4 sticky bottom-0`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isLoading}
                className={`p-3 ${isRecording ? 'bg-red-500' : isCreatorMode ? 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/30' : 'bg-primary/20 hover:bg-primary/30 border-primary/30'} border rounded-lg transition-all disabled:opacity-50`}
                title="Hold to record"
              >
                {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
              </button>
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isCreatorMode ? "Message me..." : "Message T.E.S.S.A..."}
                disabled={isLoading}
                rows={1}
                className={`flex-1 px-4 py-3 ${isCreatorMode ? 'bg-pink-900/20 border-pink-500/30 focus:border-pink-500' : 'bg-white/5 border-primary/30 focus:border-primary'} border rounded-lg focus:outline-none focus:ring-2 ${isCreatorMode ? 'focus:ring-pink-500/20' : 'focus:ring-primary/20'} disabled:opacity-50 transition-all resize-none overflow-hidden`}
                style={{ minHeight: '48px', maxHeight: '200px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className={`px-6 py-3 ${isCreatorMode ? 'bg-pink-500 hover:bg-pink-600' : 'bg-primary hover:bg-primary/80'} disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg ${isCreatorMode ? 'shadow-pink-500/20' : 'shadow-primary/20'}`}
              >
                {isLoading ? <Sparkles size={20} className={animationsEnabled ? 'animate-spin' : ''} /> : <Send size={20} />}
              </button>
            </div>
            
            {recordedAudio && (
              <div className="mt-2 p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <span className="text-sm">🎤 Voice message recorded</span>
                <div className="flex gap-2">
                  <button onClick={sendVoiceMessage} className="px-3 py-1 bg-primary rounded text-sm">Send</button>
                  <button onClick={() => setRecordedAudio(null)} className="px-3 py-1 bg-red-500 rounded text-sm">Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="w-80 border-l border-primary/20 bg-black/20 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">⚙️ Settings</h2>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Account Section */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <User size={16} />
              Account
            </h3>
            
            {user && !isGuest ? (
              <div className="space-y-3">
                <div className="text-sm">
                  <p className="text-gray-400">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500 rounded text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">You're in guest mode</p>
                <button
                  onClick={() => {
                    setShowSettings(false);
                    setShowLogin(true);
                  }}
                  className="w-full px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-primary rounded text-sm transition-all"
                >
                  Sign In to Sync
                </button>
              </div>
            )}
          </div>

          {/* Voice & Audio */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Volume2 size={16} />
              Voice & Audio
            </h3>
            
            <label className="flex items-center justify-between cursor-pointer mb-3">
              <span className="text-sm">Voice Output (TTS)</span>
              <input type="checkbox" checked={voiceOutput} onChange={(e) => setVoiceOutput(e.target.checked)} className="w-5 h-5" />
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Sound Effects</span>
              <input type="checkbox" checked={soundEffects} onChange={(e) => setSoundEffects(e.target.checked)} className="w-5 h-5" />
            </label>
          </div>

          {/* Response Settings */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3">💬 Response Settings</h3>
            
            <label className="block mb-3">
              <span className="text-sm block mb-2">Response Length</span>
              <select
                value={responseLength}
                onChange={(e) => setResponseLength(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/30 border border-primary/30 rounded"
              >
                <option value="short">Short (Quick)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="long">Long (Detailed)</option>
              </select>
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Auto Internet Search</span>
              <input type="checkbox" checked={autoSearch} onChange={(e) => setAutoSearch(e.target.checked)} className="w-5 h-5" />
            </label>
          </div>

          {/* Visual Settings */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3">✨ Visual Settings</h3>
            
            <label className="block mb-3">
              <span className="text-sm block mb-2">Theme</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/30 border border-primary/30 rounded"
              >
                <option value="auto">Auto</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label className="block mb-3">
              <span className="text-sm block mb-2">Font Size</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as any)}
                className="w-full px-3 py-2 bg-black/30 border border-primary/30 rounded"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Animations</span>
              <input type="checkbox" checked={animationsEnabled} onChange={(e) => setAnimationsEnabled(e.target.checked)} className="w-5 h-5" />
            </label>
          </div>

          {/* Data Settings */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3">💾 Data Settings</h3>
            
            <label className="flex items-center justify-between cursor-pointer mb-3">
              <span className="text-sm">Auto-save Chats</span>
              <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="w-5 h-5" />
            </label>

            {isGuest && (
              <div className="text-xs text-yellow-400 mb-3">
                ⚠️ Guest mode: Data saved locally only
              </div>
            )}

            {user && !isGuest && (
              <div className="text-xs text-green-400 mb-3">
                ✅ Synced to cloud
              </div>
            )}
          </div>

          {/* Creator Mode */}
          {!isCreatorMode && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Heart size={16} className="text-danger" />
                Unlock Heart Access
              </h3>
              <button
                onClick={unlockCreatorMode}
                className="w-full px-3 py-2 bg-danger/20 hover:bg-danger/30 border border-danger rounded text-sm font-bold transition-all"
              >
                🔓 Advanced Access
              </button>
            </div>
          )}

          {isCreatorMode && (
            <div className="mb-6 p-4 bg-pink-500/10 border border-pink-500 rounded-lg">
              <p className="text-sm text-center font-bold mb-3">💝 Creator Mode Active</p>
              <button
                onClick={exitCreatorMode}
                className="w-full px-3 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded text-sm transition-all"
              >
                Exit Creator Mode
              </button>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-400 space-y-2 mt-6">
            <p>• Real-time internet search</p>
            <p>• Voice messages (hold mic)</p>
            <p>• Separate chat histories</p>
            <p>• Cloud sync (when signed in)</p>
            <p>• Auto-saved conversations</p>
          </div>
        </div>
      )}

      {/* Secret Verification Modal */}
      {showSecretVerification && (
        <SecretVerification
          onSuccess={handleCreatorUnlock}
          onClose={() => setShowSecretVerification(false)}
        />
      )}
    </div>
  );
}
