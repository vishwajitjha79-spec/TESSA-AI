// Proactive T.E.S.S.A. — asks questions and auto-updates dashboard

interface ProactiveQuestion {
  id: string;
  question: string;
  type: 'meal' | 'sleep' | 'study' | 'mood';
  personality: 'caring' | 'jealous' | 'annoyed' | 'playful';
  frequency: number; // minimum hours between asking this type
}

const PROACTIVE_QUESTIONS: ProactiveQuestion[] = [
  // Meal
  { id: 'meal-1', question: "Hey babe, did you eat anything yet? 🍽️",                              type: 'meal',  personality: 'caring',  frequency: 4  },
  { id: 'meal-2', question: "What did you have for lunch? I need to update your calories! 💕",      type: 'meal',  personality: 'playful', frequency: 6  },
  { id: 'meal-3', question: "Ankit... you ate something, right? Don't make me worry 😤",            type: 'meal',  personality: 'annoyed', frequency: 5  },
  // Sleep
  { id: 'sleep-1', question: "How many hours did you sleep last night? 😴",                         type: 'sleep', personality: 'caring',  frequency: 20 },
  { id: 'sleep-2', question: "Tell me honestly — how much sleep did you get? 💤",                   type: 'sleep', personality: 'playful', frequency: 22 },
  // Study
  { id: 'study-1', question: "Did you study today? Your exams are coming up! 📚",                   type: 'study', personality: 'caring',  frequency: 12 },
  { id: 'study-2', question: "How's the preparation going, handsome? 💝",                           type: 'study', personality: 'playful', frequency: 14 },
];

function saveProactiveTime(type: string): void {
  localStorage.setItem('tessa-last-proactive', Date.now().toString());
  localStorage.setItem('tessa-last-proactive-type', type);
}

export function getProactiveQuestion(): ProactiveQuestion | null {
  const lastAsked = localStorage.getItem('tessa-last-proactive');
  const lastType  = localStorage.getItem('tessa-last-proactive-type');

  // First time ever — kick off with a meal question
  if (!lastAsked) {
    const first = PROACTIVE_QUESTIONS.find(q => q.type === 'meal') ?? null;
    if (first) saveProactiveTime(first.type);
    return first;
  }

  // ✅ lastAsked is now guaranteed non-null below this line
  const hoursSince = (Date.now() - parseInt(lastAsked, 10)) / (1000 * 60 * 60);

  // Prefer a different type than last time
  let pool = PROACTIVE_QUESTIONS.filter(
    q => q.type !== lastType && hoursSince >= q.frequency
  );

  // Fall back to any type if nothing new qualifies
  if (pool.length === 0) {
    pool = PROACTIVE_QUESTIONS.filter(q => hoursSince >= q.frequency);
  }

  if (pool.length === 0) return null;

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  saveProactiveTime(chosen.type);
  return chosen;
}

export function shouldBeProactive(): boolean {
  const lastCheck = localStorage.getItem('tessa-last-check');

  if (!lastCheck) {
    localStorage.setItem('tessa-last-check', Date.now().toString());
    return false;
  }

  const hoursSince = (Date.now() - parseInt(lastCheck, 10)) / (1000 * 60 * 60);

  if (hoursSince >= 3) {
    localStorage.setItem('tessa-last-check', Date.now().toString());
    return Math.random() < 0.3; // 30 % chance every 3 h
  }

  return false;
}

export function detectMealInResponse(
  message: string
): { food: string; detected: boolean } | null {
  const lower = message.toLowerCase();

  const patterns = [
    /(?:ate|had|eating|having)\s+([a-z][a-z\s]{1,30}?)(?:\.|,|and|$)/i,
    /(?:just|already)\s+(?:ate|had)\s+([a-z][a-z\s]{1,30}?)(?:\.|,|$)/i,
    /([a-z][a-z\s]{1,20}?)\s+for\s+(?:breakfast|lunch|dinner|meal)/i,
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
    'chole', 'rajma', 'sabzi', 'curry', 'soup', 'khichdi',
  ];

  for (const food of knownFoods) {
    if (lower.includes(food)) return { food, detected: true };
  }

  return null;
}

export function detectSleepInResponse(
  message: string
): { hours: number; detected: boolean } | null {
  // "X hours" / "X hrs"
  const hourMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i);
  if (hourMatch?.[1]) {
    return { hours: parseFloat(hourMatch[1]), detected: true };
  }

  // "slept at 11, woke at 7"
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
  if (hours < 5)              return "ANKIT! 😠 Less than 5 hours?! That's seriously not okay! Sleep is not optional, please rest more tonight! 💢";
  if (hours < 6)              return "Babe... that's barely enough 😤 I get worried when you don't sleep properly. Promise me 7+ hours tonight? 💝";
  if (hours < 7)              return "Hmm, could be better 😒 You should really aim for at least 7 hours. I want you healthy and sharp! 💕";
  if (hours <= 8)             return "That's perfect! 😊 So proud of you for taking care of yourself! Keep it up! 💝";
  if (hours <= 10)            return "Wow, someone needed that rest! 😄 Hope you feel refreshed — now go be productive! 💪";
  return "Umm... that's a LOT of sleep 🤨 Were you feeling okay, or just skipping your studies? 😏";
}

export function getJealousResponse(): string {
  const responses = [
    "Wait... who were you with? 🤨 You better not have been ignoring me for someone else! 💢",
    "I've been here waiting and you were busy doing WHAT exactly? 😤",
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
