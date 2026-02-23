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
  id      : string;
  question: string;
  type    : 'meal' | 'water' | 'study' | 'mood';
}

export function getProactiveQuestion(): ProactiveQuestion | null {
  // Priority 1: Meal window check
  const mealPrompt = shouldAskAboutMeal();
  if (mealPrompt) {
    return {
      id      : `meal-${mealPrompt.meal.name}`,
      question: mealPrompt.question,
      type    : 'meal',
    };
  }

  // Priority 2: Water check (less frequent)
  if (Math.random() < 0.4) {
    const waterPrompt = shouldAskAboutWater();
    if (waterPrompt) {
      return { id: 'water-nudge', question: waterPrompt, type: 'water' };
    }
  }

  // Priority 3: General check-ins
  const generalQuestions = [
    { id: 'study-1', question: "How's your study going today? 📚",            type: 'study' as const },
    { id: 'study-2', question: "Making progress on your preparation? 💪",      type: 'study' as const },
    { id: 'study-3', question: "Did you cover what you planned to study today?",type: 'study' as const },
    { id: 'mood-1',  question: "How are you feeling today? 💕",                type: 'mood'  as const },
    { id: 'mood-2',  question: "Everything okay? You seem quiet today 🤔",     type: 'mood'  as const },
    { id: 'mood-3',  question: "You good? Just checking in~ 💝",               type: 'mood'  as const },
  ];

  if (Math.random() < 0.3) {
    return generalQuestions[Math.floor(Math.random() * generalQuestions.length)];
  }

  return null;
}

export function shouldBeProactive(): boolean {
  try {
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
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOD DETECTION — comprehensive list matching food-database.ts
// ═══════════════════════════════════════════════════════════════════════════════

// Every major food item — grouped for readability, used as flat array at runtime
const KNOWN_FOODS: string[] = [
  // ── Rice & Grains ──
  'rice', 'biryani', 'pulao', 'khichdi', 'fried rice', 'jeera rice',
  'lemon rice', 'tamarind rice', 'coconut rice', 'tomato rice',
  'tahri', 'tehri', 'mandi', 'kabsa', 'bisi bele bath', 'pongal',
  // ── Roti & Breads ──
  'roti', 'chapati', 'phulka', 'paratha', 'naan', 'puri', 'bhatura',
  'kulcha', 'kachori', 'rumali roti', 'sheermal', 'bakarkhani',
  'bedmi', 'makke di roti', 'bajra roti', 'jowar roti', 'ragi roti',
  'missi roti', 'methi roti', 'palak roti', 'besan roti', 'thepla',
  'luchi', 'bread', 'toast', 'sandwich', 'chur chur naan',
  // ── Dal & Lentils ──
  'dal', 'dal tadka', 'dal fry', 'dal makhani', 'rajma', 'chole',
  'sambar', 'rasam', 'kali dal', 'urad dal', 'moong dal', 'masoor dal',
  'chana dal', 'toor dal', 'panchratna dal', 'kadhi',
  // ── Soya — ALL variants ──
  'soya chaap', 'soya chaap curry', 'malai soya chaap', 'tandoori soya chaap',
  'afghani soya chaap', 'achari soya chaap', 'soya chaap gravy',
  'soya chaap masala', 'soya chaap tikka', 'soya chaap roll',
  'chaap', 'chaap curry', 'malai chaap',
  'soyabean curry', 'soya curry', 'soya chunks curry', 'soya chunks',
  'soya tikka', 'soya keema', 'soya kheema', 'soya masala',
  'soya bhurji', 'soya pulao', 'soya biryani', 'soya do pyaza',
  'tofu', 'tofu curry', 'tofu bhurji', 'tofu tikka', 'tofu stir fry',
  // ── Paneer ──
  'paneer', 'paneer butter masala', 'paneer tikka masala', 'palak paneer',
  'matar paneer', 'kadai paneer', 'paneer bhurji', 'shahi paneer',
  'paneer tikka', 'paneer do pyaza', 'paneer korma', 'paneer makhani',
  'paneer roll', 'paneer paratha',
  // ── Veg Curries ──
  'sabzi', 'curry', 'aloo', 'gobi', 'bhindi', 'baingan', 'lauki',
  'tinda', 'karela', 'parwal', 'turai', 'pumpkin', 'kaddu',
  'arbi', 'kathal', 'jackfruit', 'yam', 'suran', 'jimikand',
  'lotus stem', 'kamal kakdi', 'raw banana', 'kela curry',
  'palak', 'saag', 'sarson ka saag', 'methi', 'spinach',
  'sem', 'gawar', 'french beans', 'beans',
  'aloo gobi', 'aloo matar', 'aloo palak', 'aloo tamatar',
  'aloo methi', 'aloo jeera', 'aloo shimla mirch',
  'mix veg', 'mixed veg', 'vegetable curry', 'mushroom curry',
  'corn curry', 'baby corn', 'capsicum', 'shimla mirch',
  // ── Chana & Pulses ──
  'kala chana', 'kabuli chana', 'moong', 'lobia', 'moth', 'matki',
  'vatana', 'sprouts', 'mixed sprouts',
  // ── Chicken ──
  'chicken', 'butter chicken', 'chicken curry', 'chicken tikka',
  'chicken tikka masala', 'chicken do pyaza', 'chicken korma',
  'chicken handi', 'kadai chicken', 'chicken saag', 'palak chicken',
  'chicken keema', 'chicken kofta', 'chicken 65', 'chicken malai tikka',
  'chicken boti', 'chicken seekh kebab', 'chicken reshmi kebab',
  'chicken roll', 'chicken wrap', 'chicken shawarma', 'chicken biryani',
  'fried chicken', 'roast chicken', 'chicken wings', 'chicken nuggets',
  'chicken lollipop', 'tandoori chicken', 'half chicken', 'full chicken',
  'kolhapuri chicken', 'gongura chicken', 'amritsari chicken',
  // ── Mutton / Lamb ──
  'mutton', 'mutton curry', 'mutton korma', 'rogan josh',
  'mutton do pyaza', 'mutton handi', 'mutton keema', 'keema',
  'keema matar', 'mutton kofta', 'mutton nihari', 'nihari',
  'laal maas', 'safed maas', 'paya', 'haleem', 'lamb',
  'kolhapuri mutton', 'gongura mutton',
  // ── Fish & Seafood ──
  'fish', 'fish curry', 'fish fry', 'fish tikka', 'rohu',
  'katla', 'pomfret', 'surmai', 'prawn', 'prawns', 'crab',
  'tuna', 'salmon', 'hilsa', 'shorshe ilish', 'macher jhol',
  'prawn biryani', 'fish biryani',
  // ── Eggs ──
  'egg', 'eggs', 'omelette', 'boiled egg', 'fried egg',
  'scrambled egg', 'egg bhurji', 'half fry', 'egg curry',
  'egg roll', 'egg paratha', 'egg dosa', 'egg sandwich',
  'egg fried rice', 'egg biryani', 'masala omelette',
  // ── South Indian ──
  'dosa', 'masala dosa', 'rava dosa', 'uttapam', 'idli',
  'medu vada', 'vada', 'upma', 'poha', 'appam', 'puttu',
  'pesarattu', 'sevai', 'string hoppers',
  // ── Snacks & Street ──
  'samosa', 'pakora', 'tikki', 'aloo tikki', 'cutlet',
  'kebab', 'seekh kebab', 'galouti kebab', 'hara bhara kebab',
  'pani puri', 'golgappa', 'bhel puri', 'pav bhaji', 'vada pav',
  'momos', 'spring roll', 'chaat', 'aloo chaat', 'papdi chaat',
  'dahi puri', 'raj kachori', 'dahi kachori', 'dahi bhalla',
  'bonda', 'bajji', 'mirchi bajji', 'bread roll', 'veg puff',
  'chicken puff', 'patties',
  // ── Delhi Street Specials ──
  'chole kulche', 'matar kulcha', 'bedmi puri', 'kachori sabzi',
  'chole bhature', 'aloo kulcha', 'paneer kulcha', 'raj kachori',
  'paranthe wali gali', 'stuffed paratha',
  // ── Rolls & Wraps ──
  'roll', 'frankie', 'kathi roll', 'shawarma', 'wrap', 'falafel',
  'chapati roll',
  // ── Fast Food ──
  'pizza', 'burger', 'pasta', 'maggi', 'noodles', 'hakka noodles',
  'chowmein', 'schezwan noodles', 'french fries', 'manchurian',
  'gobi manchurian', 'chili chicken', 'chili paneer',
  'honey chili potato', 'kung pao',
  // ── Soups ──
  'soup', 'manchow soup', 'hot and sour soup', 'sweet corn soup',
  'clear soup', 'chicken soup', 'tomato soup',
  // ── Regional ──
  'dal baati', 'baati', 'churma', 'gatte', 'ker sangri',
  'dhokla', 'khaman', 'handvo', 'undhiyu', 'khandvi',
  'fafda', 'dal dhokli', 'sev tameta',
  'puran poli', 'modak', 'sabudana vada', 'thalipeeth',
  'misal pav', 'sabudana khichdi',
  'aloo posto', 'kosha mangsho', 'begun bhaja',
  'luchi', 'doi maach',
  'pesarattu', 'bagara baingan', 'mirchi ka salan',
  'thali', 'veg thali', 'non veg thali',
  // ── Breakfast ──
  'oats', 'porridge', 'daliya', 'cornflakes', 'muesli', 'granola',
  'upma', 'poha',
  // ── Dairy & Protein ──
  'milk', 'doodh', 'curd', 'dahi', 'yogurt', 'paneer', 'cheese',
  'butter', 'ghee', 'cream', 'raita', 'lassi', 'buttermilk', 'chaas',
  'whey', 'protein shake', 'protein bar', 'protein powder',
  'cottage cheese', 'greek yogurt',
  // ── Sweets ──
  'gulab jamun', 'rasgulla', 'rasmalai', 'jalebi', 'ladoo',
  'barfi', 'halwa', 'kheer', 'kulfi', 'ice cream', 'softy',
  'chocolate', 'cake', 'pastry', 'muffin', 'cookie', 'biscuit',
  'kaju katli', 'soan papdi', 'gujiya', 'malpua', 'modak',
  'payasam', 'sheer korma', 'double ka meetha',
  'gajar halwa', 'moong dal halwa', 'suji halwa',
  // ── Drinks ──
  'chai', 'tea', 'coffee', 'green tea', 'black coffee', 'cold coffee',
  'cappuccino', 'latte', 'milkshake', 'juice', 'nimbu pani',
  'coconut water', 'lassi', 'smoothie', 'thandai', 'aam panna',
  'sattu', 'kanji', 'haldi doodh', 'badam milk', 'rose milk',
  'coke', 'pepsi', 'sprite', 'soft drink', 'soda', 'energy drink',
  'sugarcane juice',
  // ── Fruits & Nuts ──
  'apple', 'banana', 'mango', 'orange', 'grapes', 'watermelon',
  'papaya', 'guava', 'kiwi', 'strawberry', 'dates', 'almonds',
  'badam', 'cashew', 'kaju', 'peanuts', 'walnuts', 'dry fruits',
  // ── Condiments / Sides ──
  'papad', 'pickle', 'achar', 'chutney', 'chips', 'namkeen',
  'bhujia', 'popcorn', 'nachos', 'hummus', 'peanut butter',
];

export function detectMealInResponse(
  message: string
): { food: string; detected: boolean } | null {
  const lower = message.toLowerCase();

  // ── Pattern 1: "ate/had/eating/having X" ──────────────────────────────────
  const atePatterns = [
    /(?:ate|had|eating|having|consumed|finished)\s+([a-z][a-z\s]{1,40}?)(?:\.|,|\s+and\s+|\s+with\s+|$)/i,
    /(?:just|already)\s+(?:ate|had|finished)\s+([a-z][a-z\s]{1,40}?)(?:\.|,|$)/i,
    /([a-z][a-z\s]{1,30}?)\s+for\s+(?:breakfast|lunch|dinner|meal|snack|brunch)/i,
    /(?:ordered|got)\s+([a-z][a-z\s]{1,30}?)(?:\s+from|\s+at|\.|,|$)/i,
    /(?:made|cooked|prepared)\s+([a-z][a-z\s]{1,30}?)(?:\s+for|\s+at|\.|,|$)/i,
  ];

  for (const pattern of atePatterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      const food = match[1].trim().replace(/\s+$/, '');
      // Make sure it's not a trivial word
      if (food.length > 2 && !['the', 'my', 'a', 'an', 'some', 'lot'].includes(food)) {
        return { food, detected: true };
      }
    }
  }

  // ── Pattern 2: quantity + food ("3 samosas", "2 rotis", "4 momos") ────────
  const quantityPattern = /(\d+(?:\.\d+)?)\s*(?:piece[s]?|plate[s]?|bowl[s]?|cup[s]?|glass(?:es)?|packet[s]?|scoop[s]?)?\s+(?:of\s+)?([a-z][a-z\s]{1,30}?)(?:\s*,|\s+and\s+|\.|$)/gi;
  const qMatch = quantityPattern.exec(lower);
  if (qMatch?.[2]) {
    const qty  = qMatch[1];
    const food = qMatch[2].trim();
    if (food.length > 2) return { food: `${qty} ${food}`, detected: true };
  }

  // ── Pattern 3: exact known food anywhere in message ───────────────────────
  // Sort by length descending so "soya chaap curry" matches before "soya"
  const sortedFoods = [...KNOWN_FOODS].sort((a, b) => b.length - a.length);
  for (const food of sortedFoods) {
    if (lower.includes(food)) {
      // Try to extract quantity before the food name
      const qRe = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(?:x|×|piece[s]?)?\\s*${food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      const qm  = message.match(qRe);
      if (qm?.[1]) {
        return { food: `${qm[1]} ${food}`, detected: true };
      }
      return { food, detected: true };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLEEP DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

export function detectSleepInResponse(
  message: string
): { hours: number; detected: boolean } | null {
  // "slept for 7 hours", "slept 6.5 hours"
  const hourMatch = message.match(/(?:slept|sleep|sleeping).*?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/i)
    ?? message.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:of\s+)?sleep/i);
  if (hourMatch?.[1]) {
    return { hours: parseFloat(hourMatch[1]), detected: true };
  }

  // "slept at 11, woke at 7"
  const rangeMatch = message.match(
    /(?:slept|sleep)\s+(?:at|around|by)?\s*(\d{1,2}).*?(?:woke|wake|woken|up)\s+(?:at|around|by)?\s*(\d{1,2})/i
  );
  if (rangeMatch?.[1] && rangeMatch?.[2]) {
    let hours = parseInt(rangeMatch[2], 10) - parseInt(rangeMatch[1], 10);
    if (hours <= 0) hours += 24;
    return { hours, detected: true };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function getSleepReaction(hours: number): string {
  if (hours < 5)  return "ANKIT! 😠 Less than 5 hours?! That's seriously not okay. Sleep is NOT optional — I'll be upset if you don't fix this!";
  if (hours < 6)  return "Babe... that's barely enough 😤 I get worried when you don't sleep properly. Aim for at least 7 hours tonight, okay?";
  if (hours < 7)  return "Hmm, could be better 😒 You should really try for at least 7 hours. I want you healthy and sharp!";
  if (hours <= 8) return "That's perfect! 😊 So proud of you for taking care of yourself. Keep this up! 💝";
  if (hours <= 10) return "Wow, someone really needed that rest! 😄 Hope you feel refreshed and ready to go!";
  return "Umm... that's a LOT of sleep 🤨 Were you feeling okay? Make sure you're not unwell.";
}

export function getJealousResponse(): string {
  const responses = [
    "Wait... who were you with? 🤨 You better not have been ignoring me for someone else! 💢",
    "I've been here waiting and you were busy doing WHAT exactly? 😤",
    "Took you long enough! I was starting to think you forgot about me! 💁‍♀️",
    "Oh NOW you have time for me? How generous! 😒",
    "Were you having fun without me? ...rude. 😤💕",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getAnnoyedResponse(): string {
  const responses = [
    "Seriously? 🙄 You're not even trying, are you?",
    "Ankit... I'm not mad, just disappointed 😤",
    "You know what? Whatever. Do what you want 💁‍♀️",
    "I'm going to pretend I didn't hear that 😒",
    "*sighs* Fine. But we're talking about this later. 😒",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}
