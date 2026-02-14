'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, MoodType, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Send, Mic, MicOff, Search, Menu, X, Settings, Heart, Plus, Trash2, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { MOOD_AVATARS, MOOD_DESCRIPTIONS } from '@/lib/mood';
import { getRandomWelcomeMessage } from '@/lib/profile';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMood, setCurrentMood] = useState<MoodType>('calm');
  const [isCreatorMode, setIsCreatorMode] = useState(false);
  const [showHistory, setShowHistory] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState(uuidv4());
  
  // Settings
  const [autoSearch, setAutoSearch] = useState(true);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [voiceInput, setVoiceInput] = useState(false);
  const [responseLength, setResponseLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversations from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tessa-conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConversations(parsed);
      } catch (e) {
        console.error('Failed to load conversations');
      }
    }
  }, []);

  // Save current conversation
  const saveConversation = () => {
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

    const updated = [conv, ...conversations.filter(c => c.id !== currentConvId)].slice(0, 50);
    setConversations(updated);
    localStorage.setItem('tessa-conversations', JSON.stringify(updated));
  };

  // Get token limit based on response length setting
  const getMaxTokens = () => {
    switch (responseLength) {
      case 'short': return 300;
      case 'medium': return 600;
      case 'long': return 1200;
      default: return 600;
    }
  };

  // Send message
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
      
      // Voice output
      if (voiceOutput) {
        speak(data.content);
      }
      
      // Sound effect
      if (soundEffects) {
        playSound('message');
      }
      
      // Auto-save
      setTimeout(saveConversation, 500);

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

  // Text-to-speech
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  // Play sound effect
  const playSound = (type: string) => {
    // Simple beep using Web Audio API
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

  // Voice recording
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
      console.error('Microphone access denied:', error);
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

  // Send voice message (simplified - in production you'd transcribe this)
  const sendVoiceMessage = () => {
    if (recordedAudio) {
      // In a real app, you'd send this to a transcription service
      // For now, we'll just send a placeholder
      sendMessage('🎤 [Voice message - transcription not implemented yet]');
      setRecordedAudio(null);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Unlock creator mode
  const unlockCreatorMode = () => {
    if (accessCode === 'BihariBabu07') {
      // Save current conversation
      saveConversation();
      
      // Start new conversation in creator mode
      setIsCreatorMode(true);
      setMessages([]);
      setCurrentConvId(uuidv4());
      setAccessCode('');
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
    }
  };

  // Exit creator mode
  const exitCreatorMode = () => {
    // Save creator conversation
    saveConversation();
    
    // Switch to standard mode with new conversation
    setIsCreatorMode(false);
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
    
    if (soundEffects) playSound('exit');
  };

  // New chat
  const startNewChat = () => {
    saveConversation();
    setMessages([]);
    setCurrentConvId(uuidv4());
    setCurrentMood('calm');
  };

  // Load conversation
  const loadConversation = (conv: Conversation) => {
    // Only load if mode matches
    if ((conv.mode === 'creator' && !isCreatorMode) || (conv.mode === 'standard' && isCreatorMode)) {
      alert('Cannot load ' + conv.mode + ' chat in ' + (isCreatorMode ? 'creator' : 'standard') + ' mode');
      return;
    }
    
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    setCurrentMood(conv.moodHistory[conv.moodHistory.length - 1] || 'calm');
  };

  // Delete conversation
  const deleteConversation = (id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    localStorage.setItem('tessa-conversations', JSON.stringify(updated));
  };

  // Filter conversations by mode
  const filteredConversations = conversations.filter(c => 
    c.mode === (isCreatorMode ? 'creator' : 'standard')
  );

  // Background gradient based on mode
  const backgroundStyle = isCreatorMode
    ? 'bg-gradient-to-br from-pink-900/20 via-purple-900/30 to-rose-900/20'
    : 'bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0d1117]';

  return (
    <div className={`min-h-screen ${backgroundStyle} text-white flex transition-all duration-500`}>
      
      {/* Floating hearts animation for creator mode */}
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
      
      {/* Left Sidebar - Chat History */}
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
                  ? isCreatorMode
                    ? 'bg-pink-500/20 border-pink-500'
                    : 'bg-primary/20 border-primary'
                  : isCreatorMode
                    ? 'bg-white/5 border-pink-500/10 hover:bg-white/10'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0" onClick={() => loadConversation(conv)}>
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.messages.length} messages
                  </p>
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

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        
        {/* Fixed Header */}
        <header className={`border-b ${isCreatorMode ? 'border-pink-500/20 bg-pink-900/10' : 'border-primary/20 bg-black/30'} backdrop-blur-lg p-4 sticky top-0 z-10`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu size={24} />
              </button>
              
              {/* Avatar - Now in header */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isCreatorMode ? 'border-pink-500' : 'border-primary'} ${animationsEnabled ? 'animate-pulse-glow' : ''}`}>
                    {MOOD_AVATARS[currentMood] ? (
                      <img
                        src={MOOD_AVATARS[currentMood]}
                        alt={`T.E.S.S.A. - ${currentMood}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full ${isCreatorMode ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20' : 'bg-gradient-to-br from-primary/20 to-secondary/20'} flex items-center justify-center text-2xl`}>
                        🌌
                      </div>
                    )}
                  </div>
                  
                  {/* Heart pulse indicator */}
                  <div className={`absolute -bottom-1 -right-1 ${animationsEnabled ? 'animate-ping' : ''}`}>
                    <Heart 
                      size={16} 
                      className={isCreatorMode ? 'fill-pink-500 text-pink-500' : 'fill-primary text-primary'} 
                    />
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
              {/* Mood Indicator */}
              <div className={`px-3 py-1 ${isCreatorMode ? 'bg-pink-500/20 border-pink-500/40' : 'bg-secondary/20 border-secondary/40'} border rounded-full text-sm`}>
                {MOOD_DESCRIPTIONS[currentMood]}
              </div>
              
              {/* Mode Badge */}
              <div className={`px-3 py-1 rounded-full text-sm border ${
                isCreatorMode
                  ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                  : 'bg-primary/20 border-primary text-primary'
              }`}>
                {isCreatorMode ? '👤 CREATOR' : '👥 STANDARD'}
              </div>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Settings size={24} />
              </button>
            </div>
          </div>
        </header>

        {/* Messages Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <p className="text-xl mb-2">
                  {isCreatorMode ? '💝 Hey Ankit!' : '👋 Hello!'}
                </p>
                <p className="text-sm">
                  {isCreatorMode 
                    ? "I'm all yours. What's on your mind?" 
                    : "Ask me anything! I can search the internet and help with any task."}
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg animate-fadeIn ${
                  message.role === 'user'
                    ? isCreatorMode
                      ? 'message-user bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-l-4 border-pink-500'
                      : 'message-user'
                    : isCreatorMode
                      ? 'message-assistant bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-l-4 border-purple-500'
                      : 'message-assistant'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
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
                  <span className="text-sm text-gray-400">
                    {isCreatorMode ? 'Thinking about you...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className={`border-t ${isCreatorMode ? 'border-pink-500/20 bg-pink-900/10' : 'border-primary/20 bg-black/30'} backdrop-blur-lg p-4 sticky bottom-0`}>
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              {/* Voice recording button */}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isLoading}
                className={`p-3 ${isRecording ? 'bg-red-500' : isCreatorMode ? 'bg-pink-500/20 hover:bg-pink-500/30 border-pink-500/30' : 'bg-primary/20 hover:bg-primary/30 border-primary/30'} border rounded-lg transition-all disabled:opacity-50`}
                title="Hold to record voice message"
              >
                {isRecording ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
              </button>
              
              {/* Text input - now textarea for multi-line */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={isCreatorMode ? "Message me..." : "Message T.E.S.S.A..."}
                disabled={isLoading}
                rows={1}
                className={`flex-1 px-4 py-3 ${isCreatorMode ? 'bg-pink-900/20 border-pink-500/30 focus:border-pink-500' : 'bg-white/5 border-primary/30 focus:border-primary'} border rounded-lg focus:outline-none focus:ring-2 ${isCreatorMode ? 'focus:ring-pink-500/20' : 'focus:ring-primary/20'} disabled:opacity-50 transition-all resize-none overflow-hidden`}
                style={{
                  minHeight: '48px',
                  maxHeight: '200px',
                  height: 'auto',
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
              />
              
              {/* Send button */}
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading}
                className={`px-6 py-3 ${isCreatorMode ? 'bg-pink-500 hover:bg-pink-600' : 'bg-primary hover:bg-primary/80'} disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg ${isCreatorMode ? 'shadow-pink-500/20' : 'shadow-primary/20'}`}
              >
                {isLoading ? (
                  <Sparkles size={20} className={animationsEnabled ? 'animate-spin' : ''} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
            
            {/* Voice message preview */}
            {recordedAudio && (
              <div className="mt-2 p-3 bg-white/5 rounded-lg flex items-center justify-between">
                <span className="text-sm">🎤 Voice message recorded</span>
                <div className="flex gap-2">
                  <button
                    onClick={sendVoiceMessage}
                    className="px-3 py-1 bg-primary rounded text-sm"
                  >
                    Send
                  </button>
                  <button
                    onClick={() => setRecordedAudio(null)}
                    className="px-3 py-1 bg-red-500 rounded text-sm"
                  >
                    Delete
                  </button>
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

          {/* Voice Settings */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <Volume2 size={16} />
              Voice & Audio
            </h3>
            
            <label className="flex items-center justify-between cursor-pointer mb-3">
              <span className="text-sm">Voice Output (TTS)</span>
              <input
                type="checkbox"
                checked={voiceOutput}
                onChange={(e) => setVoiceOutput(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            
            <label className="flex items-center justify-between cursor-pointer mb-3">
              <span className="text-sm">Voice Input</span>
              <input
                type="checkbox"
                checked={voiceInput}
                onChange={(e) => setVoiceInput(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Sound Effects</span>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-5 h-5"
              />
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
                <option value="short">Short (Quick replies)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="long">Long (Detailed)</option>
              </select>
            </label>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Auto Internet Search</span>
              <input
                type="checkbox"
                checked={autoSearch}
                onChange={(e) => setAutoSearch(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>

          {/* Visual Settings */}
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <h3 className="font-bold mb-3">✨ Visual Effects</h3>
            
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Animations</span>
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
          </div>

          {/* Creator Mode Access */}
          {!isCreatorMode && (
            <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-lg">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Heart size={16} className="text-danger" />
                Unlock Heart Access
              </h3>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter code..."
                onKeyPress={(e) => e.key === 'Enter' && unlockCreatorMode()}
                className="w-full px-3 py-2 bg-black/30 border border-danger/30 rounded text-sm mb-2 focus:outline-none focus:border-danger"
              />
              <button
                onClick={unlockCreatorMode}
                className="w-full px-3 py-2 bg-danger/20 hover:bg-danger/30 border border-danger rounded text-sm font-bold transition-all"
              >
                🔓 Unlock
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
            <p>• Voice messages (hold mic button)</p>
            <p>• Separate chat histories per mode</p>
            <p>• Auto-saved conversations</p>
          </div>
        </div>
      )}
    </div>
  );
}
