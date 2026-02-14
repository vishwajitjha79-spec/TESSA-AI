export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  mood?: MoodType;
}

export type MoodType = 
  | 'happy'
  | 'calm'
  | 'confident'
  | 'worried'
  | 'flirty'
  | 'loving'
  | 'thinking'
  | 'listening'
  | 'playful'
  | 'focused';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created: Date;
  updated: Date;
  mode: 'standard' | 'creator';
  moodHistory: MoodType[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

export interface TessaState {
  status: 'idle' | 'thinking' | 'speaking' | 'searching';
  currentMood: MoodType;
  isCreatorMode: boolean;
}
