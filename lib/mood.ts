import { MoodType } from '@/types';

const MOOD_TRIGGERS: Record<string, string[]> = {
  happy: ['thank you', 'thanks', 'awesome', 'great', 'love it', 'perfect', 'excellent', 'haha', 'lol'],
  excited: ['wow', 'amazing', 'incredible', 'omg', 'yes!', 'lets go'],
  loving: ['love you', 'miss you', 'care about', 'adore'],
  playful: ['hehe', 'tease', 'silly', 'fun', 'play'],
  confident: ['i know', 'definitely', 'absolutely', 'expert', 'professional'],
  focused: ['help me', 'explain', 'how to', 'analyze', 'work on', 'solve'],
  thinking: ['what if', 'consider', 'maybe', 'possibly', 'wondering'],
  listening: ['tell me', 'i feel', 'i think', 'share', 'talk about'],
  calm: ['relax', 'peace', 'calm', 'meditate', 'breathe'],
  worried: ['problem', 'issue', 'worried', 'concerned', 'afraid', 'scared', 'nervous'],
  flirty: ['hey beautiful', 'looking good', 'gorgeous', 'hot', 'sexy', 'handsome'],
};

export function detectMoodFromText(
  text: string,
  currentMood: MoodType = 'calm',
  isCreator: boolean = false
): MoodType {
  const textLower = text.toLowerCase();

  if (textLower.includes('be serious') || textLower.includes('stop playing')) {
    return 'focused';
  }
  if (textLower.includes('be happy') || textLower.includes('cheer up')) {
    return 'happy';
  }

  const moodScores: Record<string, number> = {};
  
  for (const [mood, triggers] of Object.entries(MOOD_TRIGGERS)) {
    const score = triggers.filter(trigger => textLower.includes(trigger)).length;
    if (score > 0) {
      moodScores[mood] = score;
    }
  }

  if (isCreator) {
    if (['hey', 'hi', 'hello'].some(word => textLower.includes(word)) && Math.random() > 0.6) {
      return 'flirty';
    }
    if (textLower.includes('miss') || textLower.includes('waiting')) {
      return 'loving';
    }
  }

  if (Object.keys(moodScores).length > 0) {
    const detectedMood = Object.keys(moodScores).reduce((a, b) => 
      moodScores[a] > moodScores[b] ? a : b
    );
    
    const moodMapping: Record<string, MoodType> = {
      'excited': 'happy',
    };
    
    const finalMood = moodMapping[detectedMood] || detectedMood;
    const validMoods: MoodType[] = ['happy', 'calm', 'confident', 'worried', 'flirty', 'loving', 'thinking', 'listening', 'playful', 'focused'];
    return validMoods.includes(finalMood as MoodType) ? (finalMood as MoodType) : currentMood;
  }

  return currentMood;
}

export function detectMoodFromResponse(
  responseText: string,
  userText: string,
  isCreator: boolean = false
): MoodType {
  const responseLower = responseText.toLowerCase();

  if (['sorry', 'apologize', 'my bad'].some(word => responseLower.includes(word))) {
    return 'worried';
  }
  if (['haha', 'lol', '😄', 'fun'].some(word => responseLower.includes(word))) {
    return 'playful';
  }
  if (['let me think', 'analyzing', 'considering'].some(phrase => responseLower.includes(phrase))) {
    return 'thinking';
  }
  if (['i understand', 'i hear you', 'tell me more'].some(phrase => responseLower.includes(phrase))) {
    return 'listening';
  }
  if (['definitely', 'absolutely', 'certainly', 'expert'].some(word => responseLower.includes(word))) {
    return 'confident';
  }
  if (isCreator && ['hey you', 'handsome', 'miss', 'waiting'].some(word => responseLower.includes(word))) {
    return 'flirty';
  }
  if (isCreator && ['love', 'care', 'special'].some(word => responseLower.includes(word))) {
    return 'loving';
  }

  if (userText.includes('?')) {
    return 'thinking';
  }
  
  if (isCreator) {
    const creatorMoods: MoodType[] = ['happy', 'playful', 'flirty', 'loving'];
    return Math.random() > 0.7 ? creatorMoods[Math.floor(Math.random() * creatorMoods.length)] : 'calm';
  }

  return Math.random() > 0.5 ? 'happy' : 'calm';
}

export const MOOD_DESCRIPTIONS: Record<MoodType, string> = {
  happy: '😊 Joyful',
  calm: '😌 Serene',
  confident: '😎 Assured',
  worried: '😟 Concerned',
  flirty: '😏 Playful',
  loving: '🥰 Affectionate',
  thinking: '🤔 Pondering',
  listening: '👂 Attentive',
  playful: '😄 Mischievous',
  focused: '🎯 Concentrated',
};

export const MOOD_AVATARS: Record<MoodType, string> = {
  happy: '/assets/avatar.png',
  calm: '/assets/avatar.png',
  confident: '/assets/avatar.png',
  worried: '/assets/avatar.png',
  flirty: '/assets/avatar.png',
  loving: '/assets/avatar.png',
  thinking: '/assets/avatar.png',
  listening: '/assets/avatar.png',
  playful: '/assets/avatar.png',
  focused: '/assets/avatar.png',
};
