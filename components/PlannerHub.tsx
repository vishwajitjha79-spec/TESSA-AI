'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PlannerHub.tsx — v9.0
// Tessa's AI-powered planner studio — workout types, Tessa chat, super-personal
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  X, Sparkles, BookOpen, Dumbbell, FileText, Save,
  Download, Check, RefreshCw, Calendar, Trash2, Zap,
  Home, Building2, User, ChevronDown,
  MessageCircle, Send, Loader2, RotateCcw, Star,
} from 'lucide-react';

interface Props { onClose: () => void; isCreatorMode?: boolean }

type PlannerType = 'study' | 'workout' | 'exam' | 'revision' | 'nutrition' | 'sleep';
type WorkoutType = 'home' | 'gym' | 'calisthenics' | 'student' | 'hiit' | 'yoga';
type WorkoutGoal = 'muscle' | 'fat_loss' | 'endurance' | 'flexibility' | 'strength' | 'general';
type MuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'core' | 'glutes' | 'full_body';
type StudyMode   = 'board' | 'jee' | 'weekend_only' | 'intensive' | 'balanced';

interface SavedPlanner {
  id: string; name: string; type: string;
  content: string; saved: string; meta?: string;
}
interface WorkoutDay {
  day: string; exercises: string[]; done: boolean; note?: string; calories?: number;
}
interface ChatMsg { id: string; role: 'user'|'tessa'; text: string }

// ─── workout sub-types ─────────────────────────────────────────────────────
const WORKOUT_TYPES: { id: WorkoutType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id:'home',         label:'Home Workout',      icon:<Home size={14}/>,      desc:'No equipment, small space' },
  { id:'gym',          label:'Gym Workout',        icon:<Building2 size={14}/>, desc:'Full equipment access' },
  { id:'calisthenics', label:'Calisthenics',       icon:<User size={14}/>,      desc:'Bodyweight mastery & skill' },
  { id:'student',      label:'Student Quick',      icon:<BookOpen size={14}/>,  desc:'15–20 min, fits study schedule' },
  { id:'hiit',         label:'HIIT / Cardio',      icon:<Zap size={14}/>,       desc:'High intensity fat burn' },
  { id:'yoga',         label:'Yoga & Stretch',     icon:<Star size={14}/>,      desc:'Flexibility, posture, calm' },
];

const WORKOUT_GOALS: { id: WorkoutGoal; label: string; emoji: string }[] = [
  { id:'muscle',      label:'Build Muscle',    emoji:'💪' },
  { id:'fat_loss',    label:'Lose Fat',         emoji:'🔥' },
  { id:'endurance',   label:'Endurance',        emoji:'🏃' },
  { id:'flexibility', label:'Flexibility',      emoji:'🧘' },
  { id:'strength',    label:'Raw Strength',     emoji:'🏋️' },
  { id:'general',     label:'General Fitness',  emoji:'⚡' },
];

const MUSCLE_GROUPS: { id: MuscleGroup; label: string; emoji: string; note: string }[] = [
  { id:'full_body',  label:'Full Body',   emoji:'🏃', note:'Balanced — all groups each session' },
  { id:'chest',      label:'Chest',       emoji:'🫁', note:'Push emphasis — pecs, anterior deltoid' },
  { id:'back',       label:'Back',        emoji:'🔙', note:'Pull emphasis — lats, rhomboids, traps' },
  { id:'shoulders',  label:'Shoulders',   emoji:'💆', note:'Deltoids, rotator cuff, traps' },
  { id:'arms',       label:'Arms',        emoji:'💪', note:'Biceps + triceps focus days' },
  { id:'legs',       label:'Legs',        emoji:'🦵', note:'Quads, hamstrings, calves, glutes' },
  { id:'core',       label:'Core',        emoji:'⚡', note:'Abs, obliques, lower back stability' },
  { id:'glutes',     label:'Glutes',      emoji:'🍑', note:'Glute activation + hip extension focus' },
];

const STUDY_MODES: { id: StudyMode; label: string; desc: string }[] = [
  { id:'board',        label:'Board Exam Focus',   desc:'CBSE 2026 intensive' },
  { id:'jee',          label:'JEE Aspirant',        desc:'PCM deep dives' },
  { id:'weekend_only', label:'Weekend Study',       desc:'2-day power sessions' },
  { id:'intensive',    label:'All-Day Intensive',   desc:'6 AM – 10 PM grind' },
  { id:'balanced',     label:'Balanced Life',       desc:'Study + breaks + health' },
];

const PLANNER_TYPES: { id: PlannerType; label: string; icon: React.ReactNode; desc: string; color: string; badge?: string }[] = [
  { id:'workout',   label:'Workout Plan',    icon:<Dumbbell size={15}/>,  desc:'Personalized by type & goal', color:'#22c55e', badge:'NEW' },
  { id:'study',     label:'Study Plan',      icon:<BookOpen size={15}/>,  desc:'CBSE 2026 + JEE timetable',   color:'#6366f1' },
  { id:'exam',      label:'Exam Countdown',  icon:<FileText size={15}/>,  desc:'Subject-wise prep calendar',  color:'#f59e0b' },
  { id:'revision',  label:'Rapid Revision',  icon:<RefreshCw size={15}/>, desc:'3-day sprint per subject',    color:'#ec4899' },
  { id:'nutrition', label:'Meal Plan',       icon:<Zap size={15}/>,       desc:'Calorie-targeted daily meals', color:'#06b6d4', badge:'NEW' },
  { id:'sleep',     label:'Sleep Schedule',  icon:<Star size={15}/>,      desc:'Sleep + recovery optimized',  color:'#8b5cf6', badge:'NEW' },
];

function parseWorkoutPlan(text: string): WorkoutDay[] | null {
  try {
    const cleaned = text.replace(/```json|```/g,'').trim();
    const idx = cleaned.indexOf('['); const last = cleaned.lastIndexOf(']');
    if (idx === -1 || last === -1) return null;
    const arr = JSON.parse(cleaned.slice(idx, last+1));
    if (!Array.isArray(arr)) return null;
    return arr.map(d => ({
      day:       String(d.day ?? ''),
      exercises: Array.isArray(d.exercises) ? d.exercises.map(String) : [],
      done:      false,
      note:      d.note     ? String(d.note)   : undefined,
      calories:  d.calories ? Number(d.calories) : undefined,
    }));
  } catch { return null; }
}

function buildWorkoutPrompt(wType: WorkoutType, goal: WorkoutGoal, days: number, muscleFocus: MuscleGroup): string {
  const typeCtx: Record<WorkoutType, string> = {
    home:         'HOME WORKOUT — No gym, no equipment. Use: floor space, bodyweight, optionally a water bottle as weight. Exercises: push-ups (standard/wide/diamond), squats, lunges, burpees, plank variations, mountain climbers, glute bridges, tricep dips on chair, jumping jacks. Be creative with home furniture.',
    gym:          'GYM WORKOUT — Full equipment access. Include: barbell compounds (bench press, back squat, deadlift, overhead press), dumbbell accessories, cable machines, lat pulldown, leg press. Specify weight guidance (e.g. "Start at 60% 1RM", "Use RPE 7-8"). Include warm-up sets and cool-down.',
    calisthenics: 'CALISTHENICS — Progressive bodyweight skill training. Include: pull-up progressions (dead hang → negatives → kipping → strict → weighted), push-up progressions (archer, pseudo planche, pike), dip progressions (assisted → ring), L-sit progression (tuck → full), handstand wall holds, front lever tuck. Explain progression logic.',
    student:      'STUDENT QUICK WORKOUT — Exactly 15–18 minutes. Maximum efficiency. No equipment. For study breaks. Structure: 2-min warm-up, 3 main exercises × 4 min (3 sets × 45s work / 15s rest), 2-min stretch. Purpose: blood flow to brain, not muscle exhaustion. Include a focus-boost breathing exercise.',
    hiit:         'HIIT CARDIO — Interval protocol: 40s work / 20s rest. 4 rounds × 5 exercises = ~20 min. Exercises: jump squats, burpee variations, high knees, plank to squat jumps, alternating lunges, shadow boxing, speed skaters. Include heart rate zones (target 75-85% max HR). Estimated calorie burn.',
    yoga:         'YOGA & MOBILITY — Pose sequences with exact hold durations. Morning sequence: Sun Salutation A × 5 rounds, then hip flexor opener (student posture fix), downward dog, cobra, pigeon pose. Evening sequence: yin-style holds (3–5 min). Include breathing instructions (4-7-8, box breathing). Special note: addresses hunched study posture.',
  };
  const goalCtx: Record<WorkoutGoal, string> = {
    muscle:      'GOAL — Muscle hypertrophy. Rep range: 8–12. Rest: 60–90s between sets. Include progressive overload note for week 2. Remind about 1.6–2g protein per kg bodyweight.',
    fat_loss:    'GOAL — Fat loss. Higher reps (15–20), shorter rest (30–45s), add 10-min cardio finisher (jump rope simulation or jog-in-place). Estimate calorie burn. Remind: deficit of 300–500 cal/day.',
    endurance:   'GOAL — Cardiovascular endurance. High reps (20–30), circuit format with minimal rest. Include steady-state cardio blocks (20-min run/brisk walk). Target heart rate: 65–75% max.',
    flexibility: 'GOAL — Flexibility & mobility. Each stretch: full range of motion, slow 4-count inhale/exhale. Hold all stretches 30–45s. Include PNF technique instruction (contract-relax). Good for study posture.',
    strength:    'GOAL — Raw strength. Low rep (3–5), heavy weight, long rest (3–5 min between sets). Focus on 5 core compound lifts only. Include 1RM testing protocol note for week 1.',
    general:     'GOAL — General fitness. Mix of: strength training (3×10 at moderate weight), 10-min cardio, 5-min mobility. Balanced, fun, sustainable. Good for a busy student.',
  };

  const muscleCtx: Record<MuscleGroup, string> = {
    full_body:  'MUSCLE DISTRIBUTION — Full body each session. Rotate push/pull/legs emphasis per day but hit all groups. Good for 3-4 day plans.',
    chest:      'MUSCLE FOCUS — CHEST is the priority (2 dedicated push days). Include: flat/incline bench or push-up variations, flyes, cable crossovers or chest squeeze. Target upper, mid, lower pec. Inner chest emphasis on final set.',
    back:       'MUSCLE FOCUS — BACK is the priority (2 dedicated pull days). Include: pull-ups or lat pulldown for width, rows (barbell/dumbbell/cable) for thickness, face pulls for rear delt + upper traps, deadlift or good morning for lower back. V-taper focus.',
    shoulders:  'MUSCLE FOCUS — SHOULDERS priority. Include: overhead press for mass, lateral raises for width (essential), front raises, rear delt flyes or face pulls. 3D shoulder development: all 3 delt heads every shoulder session.',
    arms:       'MUSCLE FOCUS — ARMS priority (2 arm days). Biceps: supinated curls, hammer curls, incline/concentration curls. Triceps: pushdown, overhead extension, close-grip or skull crushers. Forearm finisher on 1 day.',
    legs:       'MUSCLE FOCUS — LEGS priority (2 leg days). Quad day: squats, lunges, leg press, leg extension. Hamstring day: RDL, leg curl, Nordic curl. Calf raises every leg day. Knee stability work (terminal extensions, VMO squats).',
    core:       'MUSCLE FOCUS — CORE priority. Every session: 15+ min core. Anti-rotation (plank, pallof press), flexion (leg raises, crunches), rotation (Russian twist), lower back (extensions). Progress: hollow body → dragon flag → ab wheel.',
    glutes:     'MUSCLE FOCUS — GLUTES priority. Every session: hip thrusts or glute bridges (primary), kickbacks, lateral band walks, sumo squats, Romanian deadlift. 5-min glute activation before all sessions. Hip thrust is non-negotiable.',
  };

  return `Create a precise ${days}-day workout plan for Ankit (17M, 170cm, ~63kg, Delhi student — CBSE 2026, studies 6-8h/day, no injuries).

${typeCtx[wType]}
${goalCtx[goal]}
${muscleCtx[muscleFocus]}

Return ONLY a valid JSON array — zero preamble, zero markdown, pure JSON:
[
  {
    "day": "Monday",
    "muscleGroups": ["Chest", "Triceps"],
    "exercises": ["Push-ups wide 4×15 (rest 45s) — sets×reps", "Diamond Push-ups 3×12 (rest 45s)", "Pike Push-ups 3×10 (rest 45s)", "Tricep Dips on chair 3×12 (rest 45s)", "Chest squeeze press 3×15 (rest 30s)"],
    "done": false,
    "note": "Keep elbows 45° from body — not flared. Feel the chest stretch at bottom of each rep.",
    "calories": 220,
    "duration": 35
  }
]

Rules:
- muscleGroups: 1-3 primary muscles trained that day (used for display)
- Every exercise: exact "Name — sets×reps (rest Xs)" format — real numbers, not placeholders
- 4–8 exercises per training day; 2-3 active recovery exercises on rest/light days
- calories: realistic kcal for a 63kg student, not a pro athlete
- duration: estimated minutes for the session
- notes: real coaching cues with specific form tips — not generic phrases
- Include progressive overload note for at least 2 days (e.g. "+1 rep or +2.5kg next week")
- Rest days still have: 20-min walk, foam rolling, or light stretching — never pure rest
- No same primary muscle group 2 consecutive days`;
}

function buildStudyPrompt(mode: StudyMode): string {
  const modeCtx: Record<StudyMode, string> = {
    board:
`CBSE BOARD 2026 INTENSIVE. Exam dates: Physics Mar 9, Chemistry Feb 28, Maths (TBD), English Mar 12, CS Mar 25, Painting Feb 27. 
Prioritize by proximity to exam. For each subject slot: mention EXACT NCERT chapter (e.g. "Physics Ch.13 — Nuclei: half-life numericals"). 
Include 1 PYQ paper session per week per subject. Mark high-weightage chapters with ★.`,
    jee:
`JEE MAINS 2026 ASPIRANT. Focus subjects: Physics (mechanics, electrostatics, modern physics), Chemistry (organic reaction mechanisms, p-block elements, thermodynamics), Maths (differentiation, integration, coordinate geometry, vectors).
Each slot: name the exact JEE topic (e.g. "Physics — Rotational dynamics: moment of inertia + torque problems"). 
Include JEE PYQ analysis sessions and formula revision.`,
    weekend_only:
`WEEKEND-ONLY STUDY (Saturday + Sunday only). 
Saturday: heavy topics (Physics + Math) 9 AM–7 PM with 1-hour lunch.
Sunday: lighter topics (Chemistry + English/CS) + 2-hour mock test.
Include: topic chunking, priority ranking, weekly review.`,
    intensive:
`INTENSIVE FULL-DAY SCHEDULE (6 AM – 10 PM).
Pomodoro format: 50 min study / 10 min break. 
Include: exact subject blocks, 3 meals + 2 snacks at fixed times, 30-min walk, evening revision, sleep by 10 PM.
No subject block longer than 2 consecutive hours.`,
    balanced:
`BALANCED LIFE SCHEDULE. Max 5 hours focused study/day.
Include: morning walk/exercise (30 min), school hours (acknowledge), focused evening study blocks (2–3 × 50 min), 
one hour for hobbies/painting, family time, 8 hours sleep.
Priority: quality over quantity. Study smarter, not longer.`,
  };

  return `Create a detailed 7-day study timetable for Ankit (17 years old, Class 12 CBSE 2026, JEE aspirant, Delhi).
Subjects: Physics, Chemistry, Mathematics, Computer Science, English, Painting.

MODE: ${modeCtx[mode]}

Format EXACTLY as:
**Day 1 — Monday**
• 6:00–7:00 AM: Physics — [Specific NCERT topic + what to do]
• 7:00–8:00 AM: [Subject] — [Topic with action verb: solve/read/revise/practice]
(continue all day with times)

Rules:
- Be SPECIFIC: name exact chapters/topics (e.g. "Chemistry — Ch.7 p-Block: Group 15 compounds + PYQ questions")
- Include morning routine, school note, power nap slot, evening blocks, dinner time, sleep
- Mark ★ next to high-exam-weight topics
- Include one "Tessa's Check-in" block daily (5 min reflection: what did I learn? what's unclear?)
- End with: Tessa's personal 3 tips for Ankit's study week`;
}

function buildExamPrompt(): string {
  return `Create Ankit's precise CBSE Board Exam 2026 preparation master calendar.

Confirmed exam dates:
- Painting: February 27, 2026
- Chemistry: February 28, 2026
- Physics: March 9, 2026
- English: March 12, 2026
- Computer Science: March 25, 2026
- Mathematics: TBD (check latest CBSE datesheet)

For EACH subject, create a complete section:

**[SUBJECT] EXAM — [Date]**
📅 Days until exam: [calculate from today, March 8 2026]
🎯 High-weightage CBSE chapters (last 5 years analysis):
  • [Chapter] — [marks typically]
📊 CBSE Blueprint: [unit-wise marks distribution]

📅 Preparation Timeline:
**Week of [dates]:**
• [Day]: [Subject chapter] — [specific task: solve numericals / read theory / practice diagrams]

**3 Days Before Exam:**
Day –3: [What to cover]
Day –2: Formula sheet review + past papers only
Day –1: Light revision, sleep by 10 PM, pack items

🧠 Common mistakes to avoid: [3 specific ones for this subject]
💡 Tessa's personal note for this exam: [warm, personal, specific to Ankit]

Repeat for all 6 subjects. End with a master weekly calendar overlay.`;
}

function buildRevisionPrompt(): string {
  return `Create Ankit's RAPID REVISION sprint strategy for CBSE Board Exams 2026.

For EACH of the 6 subjects, create a complete 3-day pre-exam sprint:

════════════════════════════════════════
**PHYSICS — Exam: March 9, 2026**
════════════════════════════════════════

**Revision Technique: [recommended: Feynman / Cornell notes / solve-only / diagram-based]**

**Day –3 (March 6):**
⏰ 6:00–8:00 AM: Chapter [X] — [High-weight topic: re-read NCERT + annotate formulas]
⏰ 10:00 AM–12:00 PM: Chapter [Y] — [solve 20 PYQ numericals only]
⏰ 4:00–6:00 PM: Chapter [Z] — [formula derivations from memory]
⏰ 8:00–9:00 PM: Formula flash-card review (all chapters)

**Day –2 (March 7):**
Morning: Full mock paper (3 hours, exam conditions)
Afternoon: Analyze mistakes, rework wrong answers
Evening: Re-read weak areas only

**Day –1 (March 8):**
Morning: Light revision — only formulas + diagrams (no new topics)
Afternoon: Rest + short walk, confidence visualization
Evening: Sleep by 9:30 PM (7.5h sleep for memory consolidation)
Pre-exam kit: Roll number, pencil box, admit card check

**Top 5 most-asked topics (CBSE 2019–2025 analysis):**
1. [Topic] — asked in [X] of last 5 papers
2. [Topic] ...

**⚠️ Ankit, avoid these common mistakes:**
• [Specific mistake 1]
• [Specific mistake 2]

**Tessa says:** "[Personal, warm, specific encouragement for this subject]"

════════════════════════════════════════
[Repeat for all 6 subjects with actual dates calculated from today March 8 2026]
════════════════════════════════════════`;
}

function buildNutritionPrompt(): string {
  return `Create a 7-day Indian meal plan for Ankit (17 years old, male, ~63kg, 170cm, studying intensely for CBSE board exams in Delhi).

Goals: 
- Calories: 2000–2200 kcal/day (maintenance + brain fuel)
- High protein: 100–120g/day for muscle maintenance during study season
- Brain-boosting nutrients: omega-3s, choline, antioxidants, iron
- Realistic Indian food available in a Delhi household

Format EXACTLY as:
**Day 1 — Monday**
Total target: ~2100 cal | Protein: ~110g

🌅 Breakfast (7:30 AM) — ~[X] cal, ~[Xg] protein
• [Food] — [quantity] — 💡 [why: e.g. "eggs = choline boosts memory formation"]

🍱 Lunch (1:00 PM) — ~[X] cal
• [Indian meal] — [quantity]
• [Side] — [quantity]

☕ Study Snack (5:00 PM) — ~[X] cal
• [Snack] — [quantity] — 💡 [why it helps studying/focus]

🌙 Dinner (8:00 PM) — ~[X] cal
• [Indian dinner] — [quantity]

💧 Water goal: [X] glasses | ☕ Tea/coffee: [max X cups, timing]
🧠 Pre-study tip: [food/drink 30 min before a study session]

Repeat for all 7 days. Vary meals — don't repeat the same breakfast every day.

Rules:
- All food must be realistic for a Delhi home (no exotic ingredients)
- Include: dal, roti, rice, sabzi, dahi, fruits, eggs, milk, nuts
- Avoid: excessive oily/fried food during exam season
- Note iron-rich foods on 2 days (important for teenage boys)
- Note omega-3 day (walnuts, flaxseeds)

End with:
**Tessa's Weekly Nutrition Summary for Ankit:**
- Average calories: X
- Key nutrients covered: [list]
- 3 personal tips for exam season eating
- Foods to avoid the night before exams (and why)`;
}

function buildSleepPrompt(): string {
  return `Create Ankit's optimized Sleep & Recovery Protocol for CBSE Board Exam season (17 years old, male, student, Delhi — exams start Feb 27, 2026).

**Section 1: The Science (for Ankit to understand why this matters)**
Explain in 3 bullet points: why 7.5–8h sleep is non-negotiable for memory consolidation during exam prep, what happens to learning without enough sleep (cortisol + hippocampus impact), why a consistent sleep schedule outperforms irregular "catch-up" sleep.

**Section 2: Ankit's Optimal Sleep Architecture**
• Recommended bedtime: [time with reasoning based on circadian rhythm]
• Wake time: [time]
• Sleep stages to aim for: [brief explanation of REM importance for studying]
• Room temperature: [ideal for Delhi climate]

**Section 3: 7-Day Sleep Schedule**
Format per day:
**Day 1 — Monday**
🌙 Wind-down starts: [time]
  • [20-min pre-sleep routine: dim lights, no phone after X PM, chamomile tea, light stretching]
💤 Target sleep time: [time]
⏰ Target wake time: [time]
☀️ Morning energizer (5 min): [specific activity: sunlight exposure, cold water face wash, 10 jumping jacks]
📊 Sleep quality target: [what Ankit should aim for tonight]

**Section 4: Power Nap Protocol**
• Optimal nap time for students: [time] — why this time
• Duration: exactly 20 minutes (set alarm at 18 min)
• Pre-nap trick: coffee nap technique explained
• When NOT to nap: [avoid after X PM — ruins night sleep]

**Section 5: Pre-Exam Night Protocol (night before each board exam)**
Step-by-step: what to do the 12 hours before a board exam.
Include: what to eat for dinner, what time to stop studying, wind-down routine, what to pack the night before, ideal sleep time, morning of exam breakfast.

**Section 6: Sleep Killers to Eliminate**
For each: explain why + give the alternative:
• Phone/screen blue light
• Studying in bed
• Caffeine after [time]  
• Irregular schedule on weekends
• Heavy dinner too late

**Tessa's personal note to Ankit:**
[Warm, personal, specific — about how sleep is part of his success, not an obstacle to studying]`;
}

// ─── Tessa chat inside planner ────────────────────────────────────────────
function TessaPlannerChat({ plannerType, currentResult, accentColor }: {
  plannerType: PlannerType | null; currentResult: string; accentColor: string;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    id: 'init', role: 'tessa',
    text: currentResult
      ? `Hey! I just generated your ${plannerType} plan above. Ask me anything — want adjustments, harder/easier version, specific day changes, or have questions about it?`
      : `Hey Ankit! I'm here to help build your perfect plan. What do you need? Tell me about your goals, schedule, or any constraints and I'll make it super personalized.`,
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const send = async () => {
    const text = input.trim(); if (!text || loading) return;
    setMsgs(p => [...p, { id:uuidv4(), role:'user', text }]);
    setInput(''); setLoading(true);
    try {
      const history = msgs.slice(-6).map(m => ({ role:m.role==='tessa'?'assistant':'user' as const, content:m.text }));
      const context = currentResult
        ? `Context — the user has this ${plannerType} plan:\n${currentResult.slice(0,600)}\n\nUser question: ${text}`
        : `User question about ${plannerType} planner: ${text}`;
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          messages: [...history, { role:'user', content:context }],
          isCreatorMode:true, maxTokens:350,
          _systemOverride:`You are Tessa, Ankit's personal AI inside his Planner Studio. Context: Ankit is 17M, Class 12 CBSE 2026, JEE aspirant, Delhi, ~63kg 170cm, does home workouts, studies 6-8h/day, loves painting. Be specific, warm, practical. If suggesting plan changes, be concrete (e.g. "Change Tuesday to push-pull split: bench 3×10, rows 3×10…"). Keep reply under 4 sentences unless explaining something complex. No markdown.`,
        }),
      });
      const data = await res.json();
      setMsgs(p => [...p, { id:uuidv4(), role:'tessa', text:data.content||'Try again?' }]);
    } catch {
      setMsgs(p => [...p, { id:uuidv4(), role:'tessa', text:'Network blip! Try again.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col" style={{ height:420 }}>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
        style={{ scrollbarWidth:'thin', scrollbarColor:`${accentColor}30 transparent` }}>
        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
            <div className="max-w-[86%] px-3 py-2 rounded-2xl text-[11px] leading-relaxed"
              style={m.role==='tessa'
                ? { background:`${accentColor}15`, border:`1px solid ${accentColor}25`, color:'rgba(255,255,255,0.85)' }
                : { background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.75)' }
              }>
              {m.role==='tessa' && <span className="block text-[9px] font-black mb-0.5" style={{ color:accentColor }}>Tessa ✦</span>}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl flex items-center gap-1.5"
              style={{ background:`${accentColor}10`, border:`1px solid ${accentColor}20` }}>
              <Loader2 size={10} className="animate-spin" style={{ color:accentColor }}/>
              <span className="text-[10px]" style={{ color:accentColor }}>Tessa is thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      <div className="flex gap-2 p-3 border-t flex-shrink-0" style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Ask Tessa anything about your plan…"
          className="flex-1 px-3 py-2 rounded-xl text-[11px] outline-none"
          style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${accentColor}30`,
            color:'rgba(255,255,255,0.85)', caretColor:accentColor }}/>
        <button onClick={send} disabled={!input.trim()||loading}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background:input.trim()?accentColor:'rgba(255,255,255,0.06)',
            border:`1px solid ${input.trim()?accentColor+'50':'rgba(255,255,255,0.1)'}` }}>
          <Send size={12} className="text-white"/>
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function PlannerHub({ onClose, isCreatorMode = false }: Props) {
  const [selected,      setSelected]      = useState<PlannerType|null>(null);
  const [workoutType,   setWorkoutType]   = useState<WorkoutType>('student');
  const [workoutGoal,   setWorkoutGoal]   = useState<WorkoutGoal>('general');
  const [muscleFocus,   setMuscleFocus]   = useState<MuscleGroup>('full_body');
  const [workoutDays,   setWorkoutDays]   = useState(7);
  const [studyMode,     setStudyMode]     = useState<StudyMode>('board');
  const [result,        setResult]        = useState('');
  const [loading,       setLoading]       = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [tab,           setTab]           = useState<'generate'|'chat'|'saved'>('generate');
  const [savedList,     setSavedList]     = useState<SavedPlanner[]>(() => {
    try { return JSON.parse(localStorage.getItem('tessa-saved-planners')||'[]'); } catch { return []; }
  });
  const [workoutSynced, setWorkoutSynced] = useState(false);
  const [showConfig,    setShowConfig]    = useState(false);
  // Regeneration ask modal
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenFocus,     setRegenFocus]     = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const planType = PLANNER_TYPES.find(p=>p.id===selected);
  const gl       = planType?.color ?? '#6366f1';

  const buildPrompt = (focusOverride?: string): string => {
    switch (selected) {
      case 'workout':   return buildWorkoutPrompt(workoutType, workoutGoal, workoutDays, muscleFocus)
        + (focusOverride ? `\n\nSPECIAL FOCUS FOR THIS REGENERATION: ${focusOverride}` : '');
      case 'study':     return buildStudyPrompt(studyMode)
        + (focusOverride ? `\n\nSPECIAL ADJUSTMENTS REQUESTED: ${focusOverride}` : '');
      case 'exam':      return buildExamPrompt()
        + (focusOverride ? `\n\nSPECIAL FOCUS: ${focusOverride}` : '');
      case 'revision':  return buildRevisionPrompt()
        + (focusOverride ? `\n\nSPECIAL FOCUS: ${focusOverride}` : '');
      case 'nutrition': return buildNutritionPrompt()
        + (focusOverride ? `\n\nADJUSTMENT: ${focusOverride}` : '');
      case 'sleep':     return buildSleepPrompt()
        + (focusOverride ? `\n\nSPECIAL REQUEST: ${focusOverride}` : '');
      default: return '';
    }
  };

  const generate = async (focusOverride?: string) => {
    if (!selected) return;
    setLoading(true); setResult(''); setSaved(false); setWorkoutSynced(false);
    setShowRegenModal(false);
    try {
      const res = await fetch('/api/chat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          messages:[{ role:'user', content:buildPrompt(focusOverride) }],
          isCreatorMode:true,
          maxTokens: selected==='workout'?1600:1800,
          _systemOverride: selected==='workout'
            ? 'You are a certified personal trainer and sports scientist. Return ONLY a valid JSON array. Zero preamble, zero markdown, pure JSON. Use real exercise names, exact sets/reps/rest times. Include muscleGroups field per day. Make it genuinely expert-level.'
            : `You are Tessa, Ankit's deeply personal AI. Context: 17M, Class 12 CBSE 2026, JEE aspirant, Delhi, studies 6-8h/day, home workouts, loves painting, ~63kg 170cm, exams Feb-Mar 2026. Be hyper-specific, practical, and personal. Use bold headers (**), bullet points (•), relevant emojis. Reference his actual subjects and exam dates. End with a warm personal message from Tessa specifically to Ankit.`,
        }),
      });
      const data = await res.json();
      const content = data.content || 'Generation failed — try again.';
      setResult(content);
      if (selected==='workout') {
        const plan = parseWorkoutPlan(content);
        if (plan) { localStorage.setItem('tessa-workout-plan', JSON.stringify(plan)); setWorkoutSynced(true); }
      }
      setTimeout(() => setTab('chat'), 150);
    } catch {
      setResult('Network error — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const savePlanner = () => {
    if (!result||!selected) return;
    const meta = selected==='workout'
      ? `${WORKOUT_TYPES.find(w=>w.id===workoutType)?.label} · ${WORKOUT_GOALS.find(g=>g.id===workoutGoal)?.label} · ${workoutDays} days`
      : selected==='study' ? STUDY_MODES.find(m=>m.id===studyMode)?.label : undefined;
    const entry: SavedPlanner = {
      id:uuidv4(), name:`${planType?.label} — ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'short'})}`,
      type:planType?.label??'', content:result, saved:new Date().toISOString(), meta,
    };
    const updated = [...savedList, entry].slice(-20);
    setSavedList(updated); localStorage.setItem('tessa-saved-planners', JSON.stringify(updated));
    setSaved(true);
  };

  const deleteSaved = (id:string) => {
    const updated = savedList.filter(p=>p.id!==id);
    setSavedList(updated); localStorage.setItem('tessa-saved-planners', JSON.stringify(updated));
  };

  const exportTxt = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([result],{type:'text/plain'}));
    a.download = `tessa-${selected}-plan-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
  };

  const syncWorkout = (content:string) => {
    const plan = parseWorkoutPlan(content);
    if (plan) { localStorage.setItem('tessa-workout-plan', JSON.stringify(plan)); setWorkoutSynced(true); }
  };

  const renderResult = () => {
    if (selected==='workout') {
      const plan = parseWorkoutPlan(result);
      if (!plan) return (
        <pre className="text-[10px] leading-relaxed whitespace-pre-wrap rounded-2xl p-3 overflow-auto"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            color:'rgba(255,255,255,0.8)', maxHeight:300 }}>{result}</pre>
      );
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5 flex-wrap mb-1">
            {plan.map((d,i) => (
              <div key={i} className="flex flex-col items-center gap-0.5" style={{ minWidth:32 }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background:`${gl}18`, border:`1.5px solid ${gl}45`, color:gl }}>
                  {d.exercises.length}
                </div>
                <span className="text-[7px]" style={{ color:'rgba(255,255,255,0.35)' }}>{d.day.slice(0,2)}</span>
              </div>
            ))}
          </div>
          {plan.map((d,i) => {
            const isRest = d.exercises.length<=2||/rest|recovery|active recovery/i.test(d.note||d.exercises.join(' '));
            const muscles = (d as any).muscleGroups as string[]|undefined;
            return (
              <div key={i} className="p-3 rounded-xl"
                style={{ background:isRest?'rgba(255,255,255,0.03)':`${gl}08`,
                  border:`1px solid ${isRest?'rgba(255,255,255,0.07)':gl+'22'}` }}>
                <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12px] font-black text-white">{d.day}</span>
                    {muscles?.map((m,mi)=>(
                      <span key={mi} className="text-[7.5px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background:`${gl}15`, color:gl, border:`1px solid ${gl}28` }}>{m}</span>
                    ))}
                    {isRest && <span className="text-[8px] px-2 py-0.5 rounded-full"
                      style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.35)' }}>Rest / Recovery</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {d.calories && <span className="text-[9px] font-bold" style={{ color:'#f59e0b' }}>🔥 ~{d.calories}</span>}
                    {(d as any).duration && <span className="text-[9px]" style={{ color:'rgba(255,255,255,0.3)' }}>⏱{(d as any).duration}m</span>}
                    <span className="text-[8px] px-2 py-0.5 rounded-full"
                      style={{ background:`${gl}14`, color:gl, border:`1px solid ${gl}28` }}>
                      {d.exercises.length} ex
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {d.exercises.map((ex,j) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className="text-[8px] mt-0.5 flex-shrink-0" style={{ color:`${gl}70` }}>▸</span>
                      <span className="text-[10px] leading-snug" style={{ color:'rgba(255,255,255,0.78)' }}>{ex}</span>
                    </div>
                  ))}
                </div>
                {d.note && <p className="text-[9px] mt-2 leading-snug" style={{ color:`${gl}99` }}>💡 {d.note}</p>}
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div ref={resultRef} className="rounded-2xl p-4 overflow-auto"
        style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', maxHeight:380 }}>
        {result.split('\n').map((line,i) => {
          if (line.startsWith('**')&&line.endsWith('**'))
            return <p key={i} className="text-[12px] font-black mt-4 mb-1.5 first:mt-0" style={{ color:gl }}>{line.replace(/\*\*/g,'')}</p>;
          if (/^[•\-] /.test(line))
            return <p key={i} className="text-[10px] leading-relaxed ml-2 my-0.5" style={{ color:'rgba(255,255,255,0.75)' }}>{line}</p>;
          if (/^[📅🎯📊⏰💤☀️🌙💧🌅🍱☕🔥💪✦🧠⚠️════]/.test(line.trim()))
            return <p key={i} className="text-[11px] leading-relaxed my-1 font-semibold" style={{ color:'rgba(255,255,255,0.88)' }}>{line}</p>;
          if (line.trim()==='') return <div key={i} style={{ height:5 }}/>;
          return <p key={i} className="text-[10px] leading-relaxed" style={{ color:'rgba(255,255,255,0.6)' }}>{line}</p>;
        })}
      </div>
    );
  };

  const WorkoutConfig = () => (
    <div className="flex flex-col gap-3 p-1">
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.35)' }}>Workout Type</p>
        <div className="grid grid-cols-2 gap-1.5">
          {WORKOUT_TYPES.map(w => (
            <button key={w.id} onClick={()=>setWorkoutType(w.id)}
              className="p-2.5 rounded-xl text-left active:scale-95 transition-all"
              style={{ background:workoutType===w.id?`${gl}18`:'rgba(255,255,255,0.03)',
                border:`1.5px solid ${workoutType===w.id?gl+'55':'rgba(255,255,255,0.08)'}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span style={{ color:workoutType===w.id?gl:'rgba(255,255,255,0.4)' }}>{w.icon}</span>
                <span className="text-[10px] font-bold" style={{ color:workoutType===w.id?'#fff':'rgba(255,255,255,0.6)' }}>{w.label}</span>
              </div>
              <p className="text-[8px]" style={{ color:'rgba(255,255,255,0.28)' }}>{w.desc}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.35)' }}>Your Goal</p>
        <div className="grid grid-cols-3 gap-1.5">
          {WORKOUT_GOALS.map(g => (
            <button key={g.id} onClick={()=>setWorkoutGoal(g.id)}
              className="p-2 rounded-xl text-center active:scale-95 transition-all"
              style={{ background:workoutGoal===g.id?`${gl}18`:'rgba(255,255,255,0.03)',
                border:`1.5px solid ${workoutGoal===g.id?gl+'55':'rgba(255,255,255,0.08)'}` }}>
              <div className="text-[14px] mb-0.5">{g.emoji}</div>
              <div className="text-[9px] font-bold leading-tight" style={{ color:workoutGoal===g.id?'#fff':'rgba(255,255,255,0.5)' }}>{g.label}</div>
            </button>
          ))}
        </div>
      </div>
      {/* Muscle Focus */}
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.35)' }}>
          Muscle Focus <span style={{ color:`${gl}90`, fontWeight:400, textTransform:'none', letterSpacing:0 }}>— which area gets more volume?</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {MUSCLE_GROUPS.map(m => (
            <button key={m.id} onClick={()=>setMuscleFocus(m.id)}
              className="p-2.5 rounded-xl text-left active:scale-95 transition-all"
              style={{ background:muscleFocus===m.id?`${gl}18`:'rgba(255,255,255,0.03)',
                border:`1.5px solid ${muscleFocus===m.id?gl+'55':'rgba(255,255,255,0.07)'}` }}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[13px]">{m.emoji}</span>
                <span className="text-[10px] font-bold" style={{ color:muscleFocus===m.id?'#fff':'rgba(255,255,255,0.6)' }}>{m.label}</span>
                {muscleFocus===m.id && <Check size={9} style={{ color:gl, marginLeft:'auto' }}/>}
              </div>
              <p className="text-[8px] leading-tight" style={{ color:'rgba(255,255,255,0.25)' }}>{m.note}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.35)' }}>Days / Week</p>
        <div className="flex gap-1.5">
          {[3,4,5,6,7].map(d => (
            <button key={d} onClick={()=>setWorkoutDays(d)}
              className="w-9 h-9 rounded-xl text-[13px] font-black active:scale-90 transition-all"
              style={{ background:workoutDays===d?gl:'rgba(255,255,255,0.05)',
                border:`1.5px solid ${workoutDays===d?gl+'80':'rgba(255,255,255,0.1)'}`,
                color:workoutDays===d?'#fff':'rgba(255,255,255,0.45)' }}>
              {d}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const StudyConfig = () => (
    <div className="p-1">
      <p className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.35)' }}>Study Mode</p>
      <div className="flex flex-col gap-1.5">
        {STUDY_MODES.map(m => (
          <button key={m.id} onClick={()=>setStudyMode(m.id)}
            className="p-2.5 rounded-xl text-left active:scale-95 transition-all flex items-center justify-between"
            style={{ background:studyMode===m.id?`${gl}18`:'rgba(255,255,255,0.03)',
              border:`1.5px solid ${studyMode===m.id?gl+'55':'rgba(255,255,255,0.08)'}` }}>
            <div>
              <p className="text-[11px] font-bold" style={{ color:studyMode===m.id?'#fff':'rgba(255,255,255,0.7)' }}>{m.label}</p>
              <p className="text-[9px]" style={{ color:'rgba(255,255,255,0.32)' }}>{m.desc}</p>
            </div>
            {studyMode===m.id&&<Check size={12} style={{ color:gl }}/>}
          </button>
        ))}
      </div>
    </div>
  );

  const hasConfig = selected==='workout'||selected==='study';

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background:'rgba(0,0,0,0.82)', backdropFilter:'blur(16px)' }}>
      <div className="w-full sm:max-w-2xl flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background:'#07091a', border:'1px solid rgba(255,255,255,0.09)',
          boxShadow:'0 32px 80px rgba(0,0,0,0.8)', maxHeight:'92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor:'rgba(255,255,255,0.07)', background:`linear-gradient(135deg,${gl}14,transparent)` }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:`linear-gradient(135deg,${gl},${gl}bb)` }}>
              <Sparkles size={13} className="text-white"/>
            </div>
            <div>
              <h2 className="text-[15px] font-black text-white">Planner Studio</h2>
              <p className="text-[9px]" style={{ color:'rgba(255,255,255,0.28)' }}>
                {selected ? planType?.label : 'AI-powered · built for Ankit'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border:'1px solid rgba(255,255,255,0.09)' }}>
              {(['generate','chat','saved'] as const).map(t => (
                <button key={t} onClick={()=>setTab(t)}
                  className="px-2.5 py-1.5 text-[9px] font-bold capitalize flex items-center gap-1"
                  style={{ background:tab===t?gl:'transparent',
                    color:tab===t?'#fff':'rgba(255,255,255,0.38)' }}>
                  {t==='chat'&&<MessageCircle size={9}/>}
                  {t}{t==='saved'&&savedList.length>0?` (${savedList.length})`:''}
                </button>
              ))}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.22)', color:'#f87171' }}>
              <X size={13}/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth:'thin', scrollbarColor:`${gl}28 transparent` }}>

          {/* GENERATE TAB */}
          {tab==='generate' && (
            <div className="p-4 flex flex-col gap-3">
              {/* Type grid */}
              <div className="grid grid-cols-2 gap-2">
                {PLANNER_TYPES.map(p => (
                  <button key={p.id}
                    onClick={()=>{ setSelected(p.id); setResult(''); setSaved(false); setShowConfig(p.id==='workout'||p.id==='study'); }}
                    className="p-3 rounded-2xl text-left active:scale-95 transition-all relative overflow-hidden"
                    style={{ background:selected===p.id?`${p.color}18`:'rgba(255,255,255,0.03)',
                      border:`1.5px solid ${selected===p.id?p.color+'55':'rgba(255,255,255,0.07)'}` }}>
                    {p.badge && (
                      <span className="absolute top-2 right-2 text-[7px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background:p.color, color:'#fff' }}>{p.badge}</span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ color:p.color }}>{p.icon}</span>
                      <span className="text-[11px] font-bold" style={{ color:selected===p.id?'#fff':'rgba(255,255,255,0.65)' }}>
                        {p.label}
                      </span>
                    </div>
                    <p className="text-[9px]" style={{ color:'rgba(255,255,255,0.28)' }}>{p.desc}</p>
                  </button>
                ))}
              </div>

              {/* Config */}
              {selected && hasConfig && (
                <div className="rounded-2xl overflow-hidden"
                  style={{ border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.02)' }}>
                  <button onClick={()=>setShowConfig(p=>!p)}
                    className="w-full flex items-center justify-between px-4 py-2.5"
                    style={{ borderBottom:showConfig?'1px solid rgba(255,255,255,0.06)':'none' }}>
                    <span className="text-[10px] font-bold text-white">
                      {selected==='workout'
                        ? `⚙️ ${WORKOUT_TYPES.find(w=>w.id===workoutType)?.label} · ${WORKOUT_GOALS.find(g=>g.id===workoutGoal)?.label} · ${workoutDays} days`
                        : `⚙️ Mode: ${STUDY_MODES.find(m=>m.id===studyMode)?.label}`}
                    </span>
                    <ChevronDown size={13} style={{ color:'rgba(255,255,255,0.35)',
                      transform:showConfig?'rotate(180deg)':'none', transition:'transform 0.2s' }}/>
                  </button>
                  {showConfig && (
                    <div className="p-3">
                      {selected==='workout' ? <WorkoutConfig/> : <StudyConfig/>}
                    </div>
                  )}
                </div>
              )}

              {/* Generate button */}
              {selected && (
                <button onClick={generate} disabled={loading}
                  className="w-full py-3 rounded-2xl font-black text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  style={{ background:loading?'rgba(255,255,255,0.06)':`linear-gradient(135deg,${gl},${gl}cc)`,
                    color:loading?'rgba(255,255,255,0.35)':'#fff',
                    boxShadow:loading?'none':`0 4px 24px ${gl}45` }}>
                  {loading
                    ? <><Loader2 size={15} className="animate-spin"/>Generating your plan…</>
                    : <><Sparkles size={15}/>Generate {planType?.label}</>}
                </button>
              )}

              {/* Result */}
              {result && !loading && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={savePlanner} disabled={saved}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold active:scale-95"
                      style={{ background:saved?'#22c55e14':`${gl}14`, border:`1px solid ${saved?'#22c55e40':gl+'40'}`,
                        color:saved?'#22c55e':gl }}>
                      {saved?<><Check size={10}/>Saved!</>:<><Save size={10}/>Save Planner</>}
                    </button>
                    <button onClick={exportTxt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold active:scale-95"
                      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)',
                        color:'rgba(255,255,255,0.5)' }}>
                      <Download size={10}/>Export
                    </button>
                    {selected==='workout' && (
                      <button onClick={()=>syncWorkout(result)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold active:scale-95"
                        style={{ background:'#22c55e0f', border:`1px solid ${workoutSynced?'#22c55e40':'#22c55e28'}`, color:'#22c55e' }}>
                        {workoutSynced?<><Check size={10}/>Synced</>:<><Zap size={10}/>Sync to Dashboard</>}
                      </button>
                    )}
                    <button onClick={()=>setShowRegenModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold active:scale-95 ml-auto"
                      style={{ background:`${gl}10`, border:`1px solid ${gl}30`, color:gl }}>
                      <RotateCcw size={9}/>Regenerate
                    </button>
                  </div>
                  {renderResult()}
                </div>
              )}

              {/* ── Regeneration Ask Modal ── */}
              {showRegenModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                  style={{ background:'rgba(0,0,0,0.75)', backdropFilter:'blur(12px)' }}
                  onClick={e=>{ if(e.target===e.currentTarget) setShowRegenModal(false); }}>
                  <div className="w-full max-w-sm rounded-3xl p-5 flex flex-col gap-4"
                    style={{ background:'#0d0f1e', border:`1px solid ${gl}30`,
                      boxShadow:`0 24px 64px rgba(0,0,0,0.7), 0 0 40px ${gl}12` }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:`${gl}20`, border:`1px solid ${gl}35` }}>
                        <RotateCcw size={13} style={{ color:gl }}/>
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-white">What should I change?</p>
                        <p className="text-[9px]" style={{ color:'rgba(255,255,255,0.35)' }}>
                          Tell Tessa what to improve or keep the same
                        </p>
                      </div>
                    </div>

                    {/* Quick suggestion chips */}
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.28)' }}>Quick options</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(selected==='workout' ? [
                          'More chest exercises',
                          'Easier — I\'m a beginner',
                          'Harder — push me more',
                          'More leg focus',
                          'Shorter sessions (20 min)',
                          'Add core every day',
                          'More stretching',
                          'Change the rest days',
                        ] : selected==='study' ? [
                          'More Physics focus',
                          'More Maths practice time',
                          'Add more breaks',
                          'Start earlier (5 AM)',
                          'More Chemistry slots',
                          'Include JEE mock tests',
                        ] : selected==='nutrition' ? [
                          'More protein-rich meals',
                          'No eggs — vegetarian',
                          'Simpler meals to cook',
                          'Higher calorie target',
                          'More brain-boosting foods',
                        ] : [
                          'Make it more detailed',
                          'Focus on weak areas',
                          'More practice problems',
                          'Simplify the schedule',
                        ]).map(chip => (
                          <button key={chip}
                            onClick={()=>setRegenFocus(prev => prev ? prev+', '+chip : chip)}
                            className="text-[9px] px-2.5 py-1.5 rounded-xl font-semibold active:scale-95 transition-all"
                            style={{
                              background: regenFocus.includes(chip) ? `${gl}20` : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${regenFocus.includes(chip) ? gl+'50' : 'rgba(255,255,255,0.09)'}`,
                              color: regenFocus.includes(chip) ? gl : 'rgba(255,255,255,0.55)',
                            }}>
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom input */}
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-widest mb-2" style={{ color:'rgba(255,255,255,0.28)' }}>Or describe exactly what you want</p>
                      <textarea
                        value={regenFocus}
                        onChange={e=>setRegenFocus(e.target.value)}
                        placeholder={selected==='workout'
                          ? 'e.g. "More back exercises, add pull-ups progression, skip cardio days"'
                          : 'e.g. "More revision time for Physics, add mock test on Saturday"'}
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl text-[11px] outline-none resize-none"
                        style={{ background:'rgba(255,255,255,0.05)', border:`1px solid ${gl}28`,
                          color:'rgba(255,255,255,0.8)', caretColor:gl,
                          scrollbarWidth:'none' }}
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button onClick={()=>{ setRegenFocus(''); generate(); }}
                        className="flex-1 py-2.5 rounded-xl text-[10px] font-bold active:scale-95"
                        style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                          color:'rgba(255,255,255,0.5)' }}>
                        Fresh start (no changes)
                      </button>
                      <button onClick={()=>{ generate(regenFocus||undefined); }}
                        className="flex-1 py-2.5 rounded-xl text-[11px] font-black active:scale-95 flex items-center justify-center gap-1.5"
                        style={{ background:`linear-gradient(135deg,${gl},${gl}cc)`, color:'#fff',
                          boxShadow:`0 4px 16px ${gl}45` }}>
                        <Sparkles size={11}/>Regenerate
                      </button>
                    </div>
                    <button onClick={()=>setShowRegenModal(false)}
                      className="text-center text-[9px] py-1 active:opacity-60"
                      style={{ color:'rgba(255,255,255,0.25)' }}>Cancel</button>
                  </div>
                </div>
              )}

              {!selected && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="text-[38px] mb-3">📋</div>
                  <p className="text-[13px] font-black text-white mb-1">Pick a planner type</p>
                  <p className="text-[10px]" style={{ color:'rgba(255,255,255,0.3)' }}>
                    Each plan is built specifically for you, Ankit
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CHAT TAB */}
          {tab==='chat' && (
            <TessaPlannerChat plannerType={selected} currentResult={result} accentColor={gl}/>
          )}

          {/* SAVED TAB */}
          {tab==='saved' && (
            <div className="p-4">
              {savedList.length===0 ? (
                <div className="text-center py-12">
                  <Save size={28} className="mx-auto mb-3 opacity-20 text-white"/>
                  <p className="text-[11px]" style={{ color:'rgba(255,255,255,0.28)' }}>No saved planners yet</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {[...savedList].reverse().map(p => {
                    const typeDef = PLANNER_TYPES.find(x=>x.label===p.type);
                    const col = typeDef?.color??'#6366f1';
                    return (
                      <div key={p.id} className="rounded-2xl p-3"
                        style={{ background:`${col}07`, border:`1px solid ${col}1e` }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ background:`${col}18`, color:col }}>
                              {typeDef?.icon??<FileText size={12}/>}
                            </div>
                            <div>
                              <p className="text-[11px] font-bold text-white">{p.name}</p>
                              {p.meta&&<p className="text-[8px]" style={{ color:col }}>{p.meta}</p>}
                              <p className="text-[8px]" style={{ color:'rgba(255,255,255,0.28)' }}>
                                {new Date(p.saved).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {p.type==='Workout Plan' && (
                              <button onClick={()=>syncWorkout(p.content)}
                                className="p-1.5 rounded-lg"
                                style={{ background:'#22c55e14', border:'1px solid #22c55e28', color:'#22c55e' }}>
                                <Zap size={10}/>
                              </button>
                            )}
                            <button onClick={()=>deleteSaved(p.id)}
                              className="p-1.5 rounded-lg"
                              style={{ background:'rgba(239,68,68,0.09)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' }}>
                              <Trash2 size={10}/>
                            </button>
                          </div>
                        </div>
                        <p className="text-[9px] leading-relaxed"
                          style={{ color:'rgba(255,255,255,0.32)',
                            overflow:'hidden', display:'-webkit-box',
                            WebkitLineClamp:3, WebkitBoxOrient:'vertical' as const }}>
                          {p.content.replace(/\*\*/g,'').slice(0,240)}…
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
