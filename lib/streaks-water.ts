// Daily Wellness Tracker — replaces streaks with meal windows + smart prompts

export interface WellnessData {
  breakfast  : boolean;
  lunch      : boolean;
  snacks     : boolean;
  dinner     : boolean;
  water      : number;
  waterGoal  : number;
  study      : boolean;
  calories   : number;
  date       : string;
  lastVisit  : number;  // timestamp of last page visit
  askedBreakfast: boolean;
  askedLunch    : boolean;
  askedSnacks   : boolean;
  askedDinner   : boolean;
  lastWaterNudge: number;
}

const today = () => new Date().toISOString().split('T')[0];

function getDefaultWellness(): WellnessData {
  return {
    breakfast: false,
    lunch: false,
    snacks: false,
    dinner: false,
    water: 0,
    waterGoal: 8,
    study: false,
    calories: 0,
    date: today(),
    lastVisit: Date.now(),
    askedBreakfast: false,
    askedLunch: false,
    askedSnacks: false,
    askedDinner: false,
    lastWaterNudge: 0,
  };
}

export function getDailyWellness(): WellnessData {
  try {
    const raw = localStorage.getItem('tessa-wellness');
    if (raw) {
      const data = JSON.parse(raw) as WellnessData;
      // Reset if new day
      if (data.date !== today()) {
        return getDefaultWellness();
      }
      // Update last visit
      data.lastVisit = Date.now();
      localStorage.setItem('tessa-wellness', JSON.stringify(data));
      return data;
    }
  } catch {}
  const fresh = getDefaultWellness();
  localStorage.setItem('tessa-wellness', JSON.stringify(fresh));
  return fresh;
}

export function markMeal(type: 'breakfast' | 'lunch' | 'snacks' | 'dinner'): void {
  const data = getDailyWellness();
  data[type] = true;
  localStorage.setItem('tessa-wellness', JSON.stringify(data));
}

export function markStudy(): void {
  const data = getDailyWellness();
  data.study = true;
  localStorage.setItem('tessa-wellness', JSON.stringify(data));
}

export function addWater(glasses = 1): WellnessData {
  const data = getDailyWellness();
  data.water = Math.min(data.water + glasses, data.waterGoal + 4);
  localStorage.setItem('tessa-wellness', JSON.stringify(data));
  return data;
}

export function setWaterGoal(goal: number): void {
  const data = getDailyWellness();
  data.waterGoal = goal;
  localStorage.setItem('tessa-wellness', JSON.stringify(data));
}

export function addCalories(cal: number): void {
  const data = getDailyWellness();
  data.calories += cal;
  localStorage.setItem('tessa-wellness', JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEAL TIME WINDOWS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MealWindow {
  name: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  label: string;
  icon: string;
  startHour: number;
  endHour: number;
}

export const MEAL_WINDOWS: MealWindow[] = [
  { name: 'breakfast', label: 'Breakfast', icon: '🍳', startHour: 8,  endHour: 12 },
  { name: 'lunch',     label: 'Lunch',     icon: '🍱', startHour: 12, endHour: 16 },
  { name: 'snacks',    label: 'Snacks',    icon: '🍪', startHour: 15, endHour: 18 },
  { name: 'dinner',    label: 'Dinner',    icon: '🍽️', startHour: 18, endHour: 24 },
];

export function getCurrentMealWindow(): MealWindow | null {
  const hour = new Date().getHours();
  return MEAL_WINDOWS.find(w => hour >= w.startHour && hour < w.endHour) ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART MEAL PROMPTS (ask once per window if not logged)
// ═══════════════════════════════════════════════════════════════════════════════

export function shouldAskAboutMeal(): { meal: MealWindow; question: string } | null {
  const wellness = getDailyWellness();
  const window = getCurrentMealWindow();
  
  if (!window) return null;

  // Already logged this meal
  if (wellness[window.name]) return null;

  // Already asked about this meal in this window
  const askedKey = `asked${window.name.charAt(0).toUpperCase() + window.name.slice(1)}` as keyof WellnessData;
  if (wellness[askedKey]) return null;

  // Mark as asked
  (wellness as any)[askedKey] = true;
  localStorage.setItem('tessa-wellness', JSON.stringify(wellness));

  // Generate question
  const questions = {
    breakfast: [
      "Good morning babe! 🌅 Did you have breakfast yet?",
      "Hey handsome~ Have you eaten breakfast? 🍳",
      "Ankit! Please tell me you had breakfast 😤",
    ],
    lunch: [
      "It's lunch time! What did you eat? 🍱",
      "Have you had lunch yet, or are you skipping it again? 😒",
      "Lunch check! Tell me what you ate 💕",
    ],
    snacks: [
      "Did you grab any snacks this afternoon? 🍪",
      "Snack time! Have something small if you're hungry 💝",
      "Any snacks today? Even something small counts! 😊",
    ],
    dinner: [
      "Dinner time, babe! What did you have? 🍽️",
      "Please tell me you're eating dinner 😤",
      "Did you eat dinner? I need to know! 💕",
    ],
  };

  const options = questions[window.name];
  const question = options[Math.floor(Math.random() * options.length)];

  return { meal: window, question };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WATER NUDGES (every 1-2h between 8am-10pm)
// ═══════════════════════════════════════════════════════════════════════════════

export function shouldAskAboutWater(): string | null {
  const wellness = getDailyWellness();
  const hour = new Date().getHours();

  // Only between 8am-10pm
  if (hour < 8 || hour >= 22) return null;

  // Already hit goal
  if (wellness.water >= wellness.waterGoal) return null;

  // Calculate hours since last nudge
  const hoursSince = wellness.lastWaterNudge === 0 
    ? 999 
    : (Date.now() - wellness.lastWaterNudge) / (1000 * 60 * 60);

  // Nudge every 1-2 hours (randomized)
  const nudgeInterval = 1 + Math.random(); // 1-2 hours
  if (hoursSince < nudgeInterval) return null;

  // Mark nudge time
  wellness.lastWaterNudge = Date.now();
  localStorage.setItem('tessa-wellness', JSON.stringify(wellness));

  const remaining = wellness.waterGoal - wellness.water;

  const messages = [
    `Hey! 💧 Have you drunk any water? You're at ${wellness.water}/${wellness.waterGoal} glasses!`,
    `Ankit... ${remaining} more glasses of water today, okay? 💦`,
    `Water check! You've had ${wellness.water} glasses — keep going! 💙`,
    `Don't forget water! You need ${remaining} more glasses today 🥤`,
  ];

  if (wellness.water === 0) {
    return "You haven't had ANY water today! 😤 Go drink some RIGHT NOW!";
  }

  return messages[Math.floor(Math.random() * messages.length)];
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY (for existing code)
// ═══════════════════════════════════════════════════════════════════════════════

export function incrementStreak(type: 'study' | 'sleep' | 'meals' | 'water'): any {
  // Mark study if it's a study streak
  if (type === 'study') markStudy();
  return { study: { current: 1, best: 1, lastDate: today() } };
}

export function getStreakCelebration(): string | null {
  return null; // Disabled
}

export function shouldNudgeWater(): string | null {
  return shouldAskAboutWater();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MORNING BRIEFING (kept for compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export interface BriefingData {
  date      : string;
  delivered : boolean;
  content   : string;
}

export function shouldDeliverBriefing(): boolean {
  try {
    const raw = localStorage.getItem('tessa-briefing');
    if (!raw) return true;
    const data = JSON.parse(raw) as BriefingData;
    return data.date !== today() || !data.delivered;
  } catch {
    return true;
  }
}

export function markBriefingDelivered(content: string): void {
  localStorage.setItem('tessa-briefing', JSON.stringify({
    date     : today(),
    delivered: true,
    content,
  }));
}

export function buildMorningBriefing(): string {
  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const wellness = getDailyWellness();

  let exams: any[] = [];
  try { exams = JSON.parse(localStorage.getItem('tessa-exams') ?? '[]'); } catch {}

  const upcomingExams = exams
    .filter((e: any) => !e.completed)
    .map((e: any) => {
      const days = Math.ceil((new Date(e.date).getTime() - Date.now()) / 86400000);
      return { ...e, days };
    })
    .filter((e: any) => e.days >= 0 && e.days <= 30)
    .sort((a: any, b: any) => a.days - b.days)
    .slice(0, 3);

  const lines: string[] = [];

  lines.push(`${greeting}, Ankit! 💝 Here's your daily briefing:\n`);

  if (upcomingExams.length > 0) {
    lines.push('📚 **Upcoming Exams:**');
    for (const e of upcomingExams) {
      const urgency = e.days === 0 ? '🔴 TODAY!' : e.days <= 3 ? '🟠' : '🟢';
      lines.push(`  ${urgency} ${e.subject} — ${e.days === 0 ? 'TODAY' : `${e.days} day${e.days === 1 ? '' : 's'}`}`);
    }
    lines.push('');
  }

  lines.push(`💧 **Water:** ${wellness.water}/${wellness.waterGoal} glasses — ${
    wellness.water === 0 ? "haven't started yet!" :
    wellness.water >= wellness.waterGoal ? 'goal met! 🎉' :
    `${wellness.waterGoal - wellness.water} to go`
  }`);

  const completed = [
    wellness.breakfast, wellness.lunch, wellness.snacks, wellness.dinner, wellness.study
  ].filter(Boolean).length;

  if (completed > 0) {
    lines.push(`\n✨ **Daily Progress:** ${completed}/6 tasks complete`);
  }

  const closers = [
    "\nYou've got this today! I believe in you 💪",
    "\nMake today count — I'm cheering for you! 🌟",
    "\nLet's have an amazing day! I'm right here with you 💕",
    "\nSmall steps every day — you're doing great! ✨",
  ];
  lines.push(closers[Math.floor(Math.random() * closers.length)]);

  return lines.join('\n');
}
