// Streaks, Water Tracker & Daily Briefing

// ═══════════════════════════════════════════════════════════════════════════════
// STREAKS
// ═══════════════════════════════════════════════════════════════════════════════

export interface StreakData {
  study : { current: number; best: number; lastDate: string };
  sleep : { current: number; best: number; lastDate: string };
  meals : { current: number; best: number; lastDate: string };
  water : { current: number; best: number; lastDate: string };
}

const today = () => new Date().toISOString().split('T')[0];

export function getStreaks(): StreakData {
  try {
    const raw = localStorage.getItem('tessa-streaks');
    if (raw) return JSON.parse(raw) as StreakData;
  } catch { /* */ }

  return {
    study : { current: 0, best: 0, lastDate: '' },
    sleep : { current: 0, best: 0, lastDate: '' },
    meals : { current: 0, best: 0, lastDate: '' },
    water : { current: 0, best: 0, lastDate: '' },
  };
}

export function incrementStreak(type: keyof StreakData): StreakData {
  const streaks = getStreaks();
  const entry   = streaks[type];
  const t       = today();

  if (entry.lastDate === t) return streaks;   // already counted today

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];

  entry.current = entry.lastDate === yStr ? entry.current + 1 : 1;
  entry.best    = Math.max(entry.best, entry.current);
  entry.lastDate= t;

  localStorage.setItem('tessa-streaks', JSON.stringify(streaks));
  return streaks;
}

export function getStreakEmoji(n: number): string {
  if (n >= 30) return '🏆';
  if (n >= 14) return '🔥';
  if (n >= 7)  return '⚡';
  if (n >= 3)  return '✨';
  return '🌱';
}

export function getStreakCelebration(type: string, n: number): string | null {
  if (n === 3)  return `${n}-day ${type} streak! You're building a habit! ✨`;
  if (n === 7)  return `ONE WEEK ${type} streak!! I'm so proud of you! 🔥`;
  if (n === 14) return `TWO WEEKS!! Ankit you're incredible! 🏅`;
  if (n === 30) return `30 DAYS!! LEGEND. I can't even 🏆💝`;
  if (n % 10 === 0) return `${n} day ${type} streak! You never stop amazing me 💕`;
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WATER TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

export interface WaterData {
  glasses  : number;
  goal     : number;
  date     : string;
  lastNudge: number;   // timestamp
}

export function getWaterData(): WaterData {
  try {
    const raw = localStorage.getItem('tessa-water');
    if (raw) {
      const data = JSON.parse(raw) as WaterData;
      // Reset if new day
      if (data.date !== today()) {
        return resetWater(data.goal);
      }
      return data;
    }
  } catch { /* */ }
  return resetWater(8);
}

function resetWater(goal: number): WaterData {
  const fresh: WaterData = { glasses: 0, goal, date: today(), lastNudge: 0 };
  localStorage.setItem('tessa-water', JSON.stringify(fresh));
  return fresh;
}

export function addWater(glasses = 1): WaterData {
  const data     = getWaterData();
  data.glasses   = Math.min(data.glasses + glasses, data.goal + 2);
  localStorage.setItem('tessa-water', JSON.stringify(data));
  return data;
}

export function setWaterGoal(goal: number): void {
  const data = getWaterData();
  data.goal  = goal;
  localStorage.setItem('tessa-water', JSON.stringify(data));
}

export function shouldNudgeWater(): string | null {
  const data        = getWaterData();
  const hoursSince  = (Date.now() - data.lastNudge) / (1000 * 60 * 60);
  const hour        = new Date().getHours();

  if (data.glasses >= data.goal) return null;
  if (hoursSince < 2) return null;
  if (hour < 8 || hour > 22) return null;

  // Update nudge time
  data.lastNudge = Date.now();
  localStorage.setItem('tessa-water', JSON.stringify(data));

  const remaining = data.goal - data.glasses;
  if (data.glasses === 0)   return `Hey! You haven't drunk ANY water today 😤 Go drink some right now!`;
  if (remaining >= 4)       return `Ankit... you've only had ${data.glasses} glasses. You need ${remaining} more! 💧`;
  if (remaining >= 2)       return `Almost there! Just ${remaining} more glasses of water today 💕`;
  return `One more glass and you hit your water goal! You got this 💧`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY BRIEFING
// ═══════════════════════════════════════════════════════════════════════════════

export interface BriefingData {
  date       : string;
  delivered  : boolean;
  content    : string;
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

  // Health data
  let healthRaw: any = {};
  try { healthRaw = JSON.parse(localStorage.getItem('tessa-health') ?? '{}'); } catch { /* */ }
  const calories  = healthRaw.totalCalories ?? 0;
  const sleep     = healthRaw.sleepHours;

  // Streaks
  const streaks = getStreaks();

  // Water
  const water   = getWaterData();

  // Exams from dashboard
  let exams: any[] = [];
  try { exams = JSON.parse(localStorage.getItem('tessa-exams') ?? '[]'); } catch { /* */ }

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

  // Exams
  if (upcomingExams.length > 0) {
    lines.push('📚 **Upcoming Exams:**');
    for (const e of upcomingExams) {
      const urgency = e.days === 0 ? '🔴 TODAY!' : e.days <= 3 ? '🟠' : '🟢';
      lines.push(`  ${urgency} ${e.subject} — ${e.days === 0 ? 'TODAY' : `${e.days} day${e.days === 1 ? '' : 's'}`}`);
    }
    lines.push('');
  }

  // Sleep
  if (sleep !== undefined) {
    const sleepMsg = sleep < 6 ? `😟 Only ${sleep}h sleep — please rest more tonight!`
                   : sleep < 7 ? `😐 ${sleep}h sleep — could be better`
                   : `😊 ${sleep}h sleep — well rested!`;
    lines.push(`💤 **Sleep:** ${sleepMsg}`);
  }

  // Water goal
  lines.push(`💧 **Water:** ${water.glasses}/${water.goal} glasses — ${
    water.glasses === 0 ? "haven't started yet!" :
    water.glasses >= water.goal ? 'goal met! 🎉' :
    `${water.goal - water.glasses} to go`
  }`);

  // Streaks
  const activeStreaks = Object.entries(streaks).filter(([, v]) => v.current > 0);
  if (activeStreaks.length > 0) {
    lines.push(`\n🔥 **Active Streaks:**`);
    for (const [type, data] of activeStreaks) {
      lines.push(`  ${getStreakEmoji(data.current)} ${type}: ${data.current} day${data.current === 1 ? '' : 's'}`);
    }
  }

  // Motivational closer
  const closers = [
    "\nYou've got this today! I believe in you 💪",
    "\nMake today count — I'm cheering for you! 🌟",
    "\nLet's have an amazing day! I'm right here with you 💕",
    "\nSmall steps every day — you're doing great! ✨",
  ];
  lines.push(closers[Math.floor(Math.random() * closers.length)]);

  return lines.join('\n');
}
