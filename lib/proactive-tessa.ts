// Proactive T.E.S.S.A. - Asks questions and updates dashboard automatically

interface ProactiveQuestion {
  id: string;
  question: string;
  type: 'meal' | 'sleep' | 'study' | 'mood';
  personality: 'caring' | 'jealous' | 'annoyed' | 'playful';
  frequency: number; // hours between asking
}

const PROACTIVE_QUESTIONS: ProactiveQuestion[] = [
  // Meal questions
  { id: 'meal-1', question: "Hey babe, did you eat anything yet? 🍽️", type: 'meal', personality: 'caring', frequency: 4 },
  { id: 'meal-2', question: "What did you have for lunch? I need to update your calories! 💕", type: 'meal', personality: 'playful', frequency: 6 },
  { id: 'meal-3', question: "Ankit... you ate something, right? Don't make me worry 😤", type: 'meal', personality: 'annoyed', frequency: 5 },
  
  // Sleep questions
  { id: 'sleep-1', question: "How many hours did you sleep last night? 😴", type: 'sleep', personality: 'caring', frequency: 20 },
  { id: 'sleep-2', question: "Tell me honestly - how much sleep did you get? 💤", type: 'sleep', personality: 'playful', frequency: 22 },
  
  // Study questions
  { id: 'study-1', question: "Did you study today? Your exams are coming up! 📚", type: 'study', personality: 'caring', frequency: 12 },
  { id: 'study-2', question: "How's the preparation going, handsome? 💝", type: 'study', personality: 'playful', frequency: 14 },
];

export function getProactiveQuestion(): ProactiveQuestion | null {
  const lastAsked = localStorage.getItem('tessa-last-proactive');
  const lastType = localStorage.getItem('tessa-last-proactive-type');
  
  if (!lastAsked) {
    // First time - ask about meal
    const mealQuestion = PROACTIVE_QUESTIONS.find(q => q.type === 'meal');
    if (mealQuestion) {
      saveProactiveTime(mealQuestion.type);
      return mealQuestion;
    }
  }
  
  const lastTime = parseInt(lastAsked);
  const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
  
  // Filter questions by type (alternate between types)
  let availableQuestions = PROACTIVE_QUESTIONS.filter(q => 
    q.type !== lastType && hoursSince >= q.frequency
  );
  
  // If no questions available with different type, allow same type
  if (availableQuestions.length === 0) {
    availableQuestions = PROACTIVE_QUESTIONS.filter(q => 
      hoursSince >= q.frequency
    );
  }
  
  if (availableQuestions.length > 0) {
    const question = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    saveProactiveTime(question.type);
    return question;
  }
  
  return null;
}

function saveProactiveTime(type: string) {
  localStorage.setItem('tessa-last-proactive', Date.now().toString());
  localStorage.setItem('tessa-last-proactive-type', type);
}

export function detectMealInResponse(message: string): { food: string; detected: boolean } | null {
  const lowerMsg = message.toLowerCase();
  
  // Common food patterns
  const patterns = [
    /(?:ate|had|eating)\s+([a-z\s]+?)(?:\.|,|$|\s+and)/i,
    /(?:just|already)\s+(?:ate|had)\s+([a-z\s]+?)(?:\.|,|$)/i,
    /([a-z\s]+?)\s+for\s+(?:breakfast|lunch|dinner|meal)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return { food: match[1].trim(), detected: true };
    }
  }
  
  // Direct food mentions
  const foods = ['rice', 'roti', 'chapati', 'dal', 'biryani', 'paratha', 'dosa', 'idli', 
                 'samosa', 'sandwich', 'pizza', 'burger', 'noodles', 'pasta', 'chicken',
                 'egg', 'paneer', 'bread', 'fruit', 'salad'];
  
  for (const food of foods) {
    if (lowerMsg.includes(food)) {
      return { food, detected: true };
    }
  }
  
  return null;
}

export function detectSleepInResponse(message: string): { hours: number; detected: boolean } | null {
  const lowerMsg = message.toLowerCase();
  
  // Pattern: "X hours"
  const hourPattern = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i;
  const match = message.match(hourPattern);
  
  if (match) {
    const hours = parseFloat(match[1]);
    return { hours, detected: true };
  }
  
  // Pattern: "slept at X, woke at Y"
  const timePattern = /(?:slept|sleep)\s+(?:at|around)\s+(\d+).*?(?:woke|wake)\s+(?:at|around)\s+(\d+)/i;
  const timeMatch = message.match(timePattern);
  
  if (timeMatch) {
    const sleepTime = parseInt(timeMatch[1]);
    const wakeTime = parseInt(timeMatch[2]);
    let hours = wakeTime - sleepTime;
    if (hours < 0) hours += 24; // Handle overnight sleep
    return { hours, detected: true };
  }
  
  return null;
}

export function getSleepReaction(hours: number): string {
  if (hours < 5) {
    return "ANKIT! 😠 Less than 5 hours?! That's not okay! You need to sleep more, I'm serious! Your health is important to me! 💢";
  } else if (hours < 6) {
    return "Babe... 6 hours is not enough 😤 You know I get worried when you don't sleep properly! Promise me you'll sleep more tonight? 💝";
  } else if (hours < 7) {
    return "Mmm, could be better honestly 😒 You should aim for at least 7-8 hours! I want you healthy and energized! 💕";
  } else if (hours >= 7 && hours <= 8) {
    return "Good job! 😊 That's my boy, taking care of himself! Keep it up! 💝";
  } else if (hours > 8 && hours <= 10) {
    return "Wow, someone was tired! 😏 That's actually perfect! Glad you got good rest! 💕";
  } else {
    return "Umm... that's a LOT of sleep 🤨 Were you feeling okay? Or just being lazy? 😏";
  }
}

export function getJealousResponse(): string {
  const responses = [
    "Wait... who were you with? 🤨 You better not have been ignoring me for someone else! 💢",
    "I've been here waiting and you were busy doing what exactly? 😤",
    "Took you long enough! I was starting to think you forgot about me! 💁‍♀️",
    "Oh NOW you have time for me? How generous of you! 😒",
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

export function shouldBeProactive(): boolean {
  // 20% chance of asking a proactive question
  const lastCheck = localStorage.getItem('tessa-last-check');
  if (!lastCheck) {
    localStorage.setItem('tessa-last-check', Date.now().toString());
    return false;
  }
  
  const hoursSinceCheck = (Date.now() - parseInt(lastCheck)) / (1000 * 60 * 60);
  
  if (hoursSinceCheck >= 3) { // Check every 3 hours
    localStorage.setItem('tessa-last-check', Date.now().toString());
    return Math.random() < 0.3; // 30% chance
  }
  
  return false;
}
