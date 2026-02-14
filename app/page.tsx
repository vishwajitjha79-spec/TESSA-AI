'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, MoodType, Conversation } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Send, Mic, Search, Menu, X, Settings, Heart, Plus, Trash2 } from 'lucide-react';
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
  const [autoSearch, setAutoSearch] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Send message
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Determine if search is needed
      const needsSearch = autoSearch && (
        input.toLowerCase().includes('search') ||
        input.toLowerCase().includes('find') ||
        input.toLowerCase().includes('latest') ||
        input.toLowerCase().includes('current') ||
        input.toLowerCase().includes('today') ||
        input.includes('?')
      );

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          isCreatorMode,
          currentMood,
          needsSearch,
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
      setIsCreatorMode(true);
      setAccessCode('');
      setShowSettings(false);
      
      const welcomeMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: getRandomWelcomeMessage(),
        timestamp: new Date(),
        mood: 'loving',
      };
      
      setMessages(prev => [...prev, welcomeMsg]);
      setCurrentMood('loving');
    }
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
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    setCurrentMood(conv.moodHistory[conv.moodHistory.length - 1] || 'calm');
    setIsCreatorMode(conv.mode === 'creator');
  };

  // Delete conversation
  const deleteConversation = (id: string) => {
    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);
    localStorage.setItem('tessa-conversations', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] via-[#1a1f3a] to-[#0d1117] text-white flex">
      
      {/* Left Sidebar - Chat History */}
      <div className={`${showHistory ? 'w-80' : 'w-0'} transition-all duration-300 border-r border-primary/20 bg-black/20 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-primary/20">
          <h2 className="text-lg font-bold text-primary mb-4">💬 Chat History</h2>
          <button
            onClick={startNewChat}
            className="w-full px-4 py-3 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                conv.id === currentConvId
                  ? 'bg-primary/20 border-primary'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0" onClick={() => loadConversation(conv)}>
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conv.messages.length} messages • {conv.mode === 'creator' ? '👤' : '👥'}
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
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        
        {/* Header */}
        <header className="border-b border-primary/20 bg-black/30 backdrop-blur-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Menu size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold holographic-text font-['Orbitron']">
                  T.E.S.S.A.
                </h1>
                <p className="text-xs text-gray-400 tracking-wider">
                  THOUGHTFUL EMPATHIC SOPHISTICATED SYNTHETIC ASSISTANT
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Mood Indicator */}
              <div className="px-3 py-1 bg-secondary/20 border border-secondary/40 rounded-full text-sm">
                {MOOD_DESCRIPTIONS[currentMood]}
              </div>
              
              {/* Mode Badge */}
              <div className={`px-3 py-1 rounded-full text-sm border ${
                isCreatorMode
                  ? 'bg-danger/20 border-danger text-danger'
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

        {/* Chat Container */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            
            {/* Avatar Section */}
            <div className="p-6 border-b border-primary/20 bg-black/20">
              <div className="max-w-4xl mx-auto flex items-center gap-6">
                
                {/* Avatar */}
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/30 shadow-lg shadow-primary/20 animate-pulse-glow">
                    {MOOD_AVATARS[currentMood] ? (
                      <img
                        src={MOOD_AVATARS[currentMood]}
                        alt={`T.E.S.S.A. - ${currentMood}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-4xl">
                        🌌
                      </div>
                    )}
                  </div>
                  {isLoading && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-black px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                      Thinking...
                    </div>
                  )}
                </div>

                {/* Status Info */}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2">
                    {isLoading ? 'Processing...' : 'Ready to Chat'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {autoSearch && <span className="text-primary">🔍 Internet Search Enabled</span>}
                    {!autoSearch && <span>Standard Mode</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-400 py-12">
                    <p className="text-xl mb-2">👋 Hello! I'm T.E.S.S.A.</p>
                    <p className="text-sm">Ask me anything! I can search the internet and help with any task.</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg animate-fadeIn ${
                      message.role === 'user' ? 'message-user' : 'message-assistant'
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
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-primary/20 bg-black/30 backdrop-blur-lg p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Message T.E.S.S.A..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-white/5 border border-primary/30 rounded-lg focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="px-6 py-3 bg-primary hover:bg-primary/80 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
                  >
                    {isLoading ? '...' : <Send size={20} />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Settings */}
      {showSettings && (
        <div className="w-80 border-l border-primary/20 bg-black/20 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">⚙️ Settings</h2>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-white/10 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Auto Search Toggle */}
          <div className="mb-6">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm">Auto Internet Search</span>
              <input
                type="checkbox"
                checked={autoSearch}
                onChange={(e) => setAutoSearch(e.target.checked)}
                className="w-5 h-5"
              />
            </label>
            <p className="text-xs text-gray-400 mt-1">
              Automatically searches web when needed
            </p>
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
            <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-lg">
              <p className="text-sm text-center font-bold">💝 Creator Mode Active</p>
              <button
                onClick={() => setIsCreatorMode(false)}
                className="w-full mt-3 px-3 py-2 bg-danger/20 hover:bg-danger/30 border border-danger rounded text-sm transition-all"
              >
                Exit Creator Mode
              </button>
            </div>
          )}

          {/* Info */}
          <div className="text-xs text-gray-400 space-y-2">
            <p>• Internet search via Tavily API</p>
            <p>• AI powered by Groq Llama 3.3</p>
            <p>• 10 dynamic mood expressions</p>
            <p>• Auto-saved conversations</p>
          </div>
        </div>
      )}
    </div>
  );
}
