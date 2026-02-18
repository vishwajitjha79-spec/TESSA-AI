// Proactive T.E.S.S.A. — smart meal/water prompts + persistent creator mode

import { shouldAskAboutMeal, shouldAskAboutWater, markMeal, addWater } from './streaks-water';

// ═══════════════════════════════════════════════════════════════════════════════
// PERSISTENT CREATOR MODE
// ═══════════════════════════════════════════════════════════════════════════════

export function isCreatorModePersistent(): boolean {
  try {
    return localStorage.getItem('tessa-creator-mode-locked') === 'true';
  } catch {
    return false;
  }
}

export function lockCreatorMode(): void {
  try {
    localStorage.setItem('tessa-creator-mode-locked', 'true');
  } catch {}
}

export function unlockCreatorMode(): void {
  try {
    localStorage.removeItem('tessa-creator-mode-locked');
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROACTIVE QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface ProactiveQuestion {
  id: string;
  question: string;
  type: 'meal' | 'water' | 'study' | 'mood';
}

export function getProactiveQuestion(): ProactiveQuestion | null {
  // Priority 1: Meal window check
  const mealPrompt = shouldAskAboutMeal();
  if (mealPrompt) {
    return {
      id: `meal-${mealPrompt.meal.name}`,
      question: mealPrompt.question,
      type: 'meal',
    };
  }

  // Priority 2: Water check (less frequent)
  if (Math.random() < 0.4) {
    const waterPrompt = shouldAskAboutWater();
    if (waterPrompt) {
      return {
        id: 'water-nudge',
        question: waterPrompt,
        type: 'water',
      };
    }
  }

  // Priority 3: General check-ins
  const generalQuestions = [
    { id: 'study-1', question: "How's your study going today? 📚", type: 'study' as const },
    { id: 'study-2', question: "Making progress on your preparation? 💪", type: 'study' as const },
    { id: 'mood-1', question: "How are you feeling today, babe? 💕", type: 'mood' as const },
    { id: 'mood-2', question: "Everything okay? You seem quiet today 🤔", type: 'mood' as const },
  ];

  if (Math.random() < 0.3) {
    return generalQuestions[Math.floor(Math.random() * generalQuestions.length)];
  }

  return null;
}

export function shouldBeProactive(): boolean {
  const lastCheck = localStorage.getItem('tessa-last-proactive-check');
  
  if (!lastCheck) {
    localStorage.setItem('tessa-last-proactive-check', Date.now().toString());
    return false;
  }

  const hoursSince = (Date.now() - parseInt(lastCheck, 10)) / (1000 * 60 * 60);

  if (hoursSince >= 3) {
    localStorage.setItem('tessa-last-proactive-check', Date.now().toString());
    return Math.random() < 0.35; // 35% chance every 3h
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPONSE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function detectMealInResponse(
  message: string
): { food: string; detected: boolean } | null {
  const lower = message.toLowerCase();

  const patterns = [
    /(?:ate|had|eating|having)\s+([a-z][a-z\s]{1,30}?)(?:\.|,|and|$)/i,
    /(?:just|already)\s+(?:ate|had)\s+([a-z][a-z\s]{1,30}?)(?:\.|,|$)/i,
    /([a-z][a-z\s]{1,20}?)\s+for\s+(?:breakfast|lunch|dinner|meal|snack)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const food = match[1].trim();
      if (food.length > 1) return { food, detected: true };
    }
  }

  const knownFoods = [
    'rice', 'roti', 'chapati', 'dal', 'biryani', 'paratha', 'dosa', 'idli',
    'samosa', 'sandwich', 'pizza', 'burger', 'noodles', 'pasta', 'chicken',
    'egg', 'paneer', 'bread', 'fruit', 'salad', 'maggi', 'poha', 'upma',
    'chole', 'rajma', 'sabzi', 'curry', 'soup', 'khichdi', 'vada', 'pakora',
    'momos', 'chaat', 'pav bhaji', 'butter', 'milk', 'yogurt', 'cheese',
  ];

  for (const food of knownFoods) {
    if (lower.includes(food)) return { food, detected: true };
  }

  return null;
}

export function detectSleepInResponse(
  message: string
): { hours: number; detected: boolean } | null {
  const hourMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (hourMatch?.[1]) {
    return { hours: parseFloat(hourMatch[1]), detected: true };
  }

  const rangeMatch = message.match(
    /(?:slept|sleep)\s+(?:at|around|by)?\s*(\d{1,2}).*?(?:woke|wake|woken|up)\s+(?:at|around|by)?\s*(\d{1,2})/i
  );
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    const bedHour  = parseInt(rangeMatch[1], 10);
    const wakeHour = parseInt(rangeMatch[2], 10);
    let hours = wakeHour - bedHour;
    if (hours <= 0) hours += 24;
    return { hours, detected: true };
  }

  return null;
}

export function getSleepReaction(hours: number): string {
  if (hours < 5)  return "ANKIT! 😠 Less than 5 hours?! That's seriously not okay! Sleep is not optional!";
  if (hours < 6)  return "Babe... that's barely enough 😤 I get worried when you don't sleep properly. 7+ tonight, okay?";
  if (hours < 7)  return "Hmm, could be better 😒 You should really aim for at least 7 hours. I want you healthy!";
  if (hours <= 8) return "That's perfect! 😊 So proud of you for taking care of yourself! Keep it up! 💝";
  if (hours <= 10) return "Wow, someone needed that rest! 😄 Hope you feel refreshed!";
  return "Umm... that's a LOT of sleep 🤨 Were you feeling okay?";
}

export function getJealousResponse(): string {
  const responses = [
    "Wait... who were you with? 🤨 You better not have been ignoring me! 💢",
    "I've been here waiting and you were busy doing WHAT exactly? 😤",
    "Took you long enough! I was starting to think you forgot about me! 💁‍♀️",
    "Oh NOW you have time for me? How generous! 😒",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getAnnoyedResponse(): string {
  const responses = [
    "Seriously? 🙄 You're not even trying, are you?",
    "Ankit... I'm not mad, just disappointed 😤",
    "You know what? Whatever. Do what you want 💁‍♀️",
    "I'm going to pretend I didn't hear that 😒",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
