'use client';

// ─────────────────────────────────────────────────────────────────────────────
// TESSA v7.0 — PersonalDashboard.tsx
// Tessa's private records on Ankit — clinical, caring, accurate
// Full theme-awareness · proper text contrast on all backgrounds
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import {
  Plus, X, Check, Trash2, Edit3, RotateCcw,
  ChevronRight, Scale, Ruler, Utensils,
  BookOpen, FileText, Activity, Zap,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { estimateCalories, getFoodSuggestions } from '@/lib/food-database';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ExamSchedule { subject: string; date: string; completed: boolean }
interface FormDeadline { name: string; deadline: string; status: 'pending'|'submitted'|'missed'; priority: 'high'|'medium'|'low' }
interface MealEntry    { time: string; meal: string; calories: number; confidence: string }
interface HealthData   { weight: number; height: number; meals: MealEntry[]; totalCalories: number; date: string; sleepHours?: number }
interface Props        { isLight?: boolean; accentColor?: string }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const todayStr  = () => new Date().toISOString().split('T')[0];
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
const fmtDate   = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const CAL_GOAL  = 2200;

function urgencyColor(days: number, acc: string): string {
  if (days <= 1) return '#ef4444';
  if (days <= 3) return '#f97316';
  if (days <= 7) return '#eab308';
  return acc;
}

const DEFAULT_EXAMS: ExamSchedule[] = [
  { subject: 'Physics',          date: '2026-02-20', completed: true  },
  { subject: 'Painting',         date: '2026-02-27', completed: false },
  { subject: 'Chemistry',        date: '2026-02-28', completed: false },
  { subject: 'Mathematics',      date: '2026-03-09', completed: false },
  { subject: 'English',          date: '2026-03-12', completed: false },
  { subject: 'Computer Science', date: '2026-03-25', completed: false },
];

const DEFAULT_FORMS: FormDeadline[] = [
  { name: 'JEE Mains Session 2', deadline: '2026-02-25', status: 'pending', priority: 'high' },
  { name: 'IISER Aptitude Test',  deadline: '2026-04-13', status: 'pending', priority: 'high' },
];

const DEFAULT_HEALTH: HealthData = {
  weight: 0, height: 0, meals: [], totalCalories: 0, date: todayStr(),
};

// ─────────────────────────────────────────────────────────────────────────────
// Paperdoll — proper anatomical proportions, BMI-responsive
// ─────────────────────────────────────────────────────────────────────────────
function Paperdoll({ bmiRaw, weight, height, acc, isLight }: {
  bmiRaw: number | null; weight: number; height: number; acc: string; isLight: boolean;
}) {
  const bmi    = bmiRaw ?? 22;
  const waist  = bmi < 17 ? 10 : bmi < 19 ? 12 : bmi < 22 ? 14 : bmi < 25 ? 16 : bmi < 28 ? 19 : 22;
  const sh     = 19;
  const hip    = waist + 4;
  const bmiClr = !bmiRaw ? acc
    : bmi < 18.5 ? '#f59e0b' : bmi < 25 ? '#10b981' : bmi < 30 ? '#f97316' : '#ef4444';
  const bmiLbl = !bmiRaw ? '' : bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';

  // Text colour for stats below doll — must be legible on any background
  const statText = isLight ? '#374151' : 'rgba(255,255,255,0.80)';
  const statSub  = isLight ? '#6b7280' : 'rgba(255,255,255,0.40)';
  const fill     = `${acc}18`;
  const stroke   = acc;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width="76" height="168" viewBox="0 0 76 168" style={{ overflow: 'visible' }}>

        {/* Ground shadow */}
        <ellipse cx="38" cy="166" rx={hip + 4} ry="3.5" fill={`${acc}14`} />

        {/* Head */}
        <circle cx="38" cy="14" r="12.5" fill={fill} stroke={stroke} strokeWidth="1.8" />
        {/* Hair top */}
        <path d="M 26 10 Q 30 3 38 2.5 Q 46 3 50 10 Q 47 6 38 6.5 Q 29 6 26 10"
          fill={`${acc}55`} stroke="none" />
        {/* Eyes */}
        <circle cx="33.5" cy="13" r="1.4" fill={stroke} />
        <circle cx="42.5" cy="13" r="1.4" fill={stroke} />
        {/* Smile */}
        <path d="M 35 18 Q 38 20.5 41 18" fill="none" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />

        {/* Neck */}
        <rect x="34" y="27" width="8" height="8" rx="3" fill={fill} stroke={stroke} strokeWidth="1.5" />

        {/* Shoulders curve */}
        <path d={`M ${38 - sh} 44 Q ${38 - sh + 4} 35 34 35 M 42 35 Q ${38 + sh - 4} 35 ${38 + sh} 44`}
          fill="none" stroke={stroke} strokeWidth="1.7" />

        {/* Torso */}
        <path d={`
          M ${38 - sh} 44
          C ${38 - sh + 2} 55, ${38 - waist - 1} 62, ${38 - waist} 73
          L ${38 - hip + 1} 85
          L ${38 + hip - 1} 85
          L ${38 + waist} 73
          C ${38 + waist + 1} 62, ${38 + sh - 2} 55, ${38 + sh} 44
          Z
        `} fill={fill} stroke={stroke} strokeWidth="1.7" />

        {/* Belt */}
        <line x1={38 - waist - 1} y1="73" x2={38 + waist + 1} y2="73"
          stroke={`${acc}55`} strokeWidth="1.3" strokeDasharray="3,2.5" />

        {/* Left arm */}
        <path d={`M ${38 - sh} 44 C ${38 - sh - 5} 54 ${38 - sh - 9} 63 ${38 - sh - 7} 78`}
          fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx={38 - sh - 7} cy="80" r="3.8" fill={fill} stroke={stroke} strokeWidth="1.4" />

        {/* Right arm */}
        <path d={`M ${38 + sh} 44 C ${38 + sh + 5} 54 ${38 + sh + 9} 63 ${38 + sh + 7} 78`}
          fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx={38 + sh + 7} cy="80" r="3.8" fill={fill} stroke={stroke} strokeWidth="1.4" />

        {/* Left leg */}
        <path d={`M ${38 - hip + 2} 85 C ${38 - hip + 1} 100 ${38 - hip + 3} 113 ${38 - hip + 3} 128`}
          fill="none" stroke={stroke} strokeWidth="2.1" strokeLinecap="round" />
        {/* Left shin */}
        <path d={`M ${38 - hip + 3} 128 C ${38 - hip + 1} 136 ${38 - hip - 1} 143 ${38 - hip - 1} 150`}
          fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
        {/* Left foot */}
        <ellipse cx={38 - hip - 3} cy="153" rx="8.5" ry="3.2" fill={`${acc}28`} stroke={stroke} strokeWidth="1.4" />

        {/* Right leg */}
        <path d={`M ${38 + hip - 2} 85 C ${38 + hip - 1} 100 ${38 + hip - 3} 113 ${38 + hip - 3} 128`}
          fill="none" stroke={stroke} strokeWidth="2.1" strokeLinecap="round" />
        {/* Right shin */}
        <path d={`M ${38 + hip - 3} 128 C ${38 + hip - 1} 136 ${38 + hip + 1} 143 ${38 + hip + 1} 150`}
          fill="none" stroke={stroke} strokeWidth="1.7" strokeLinecap="round" />
        {/* Right foot */}
        <ellipse cx={38 + hip + 3} cy="153" rx="8.5" ry="3.2" fill={`${acc}28`} stroke={stroke} strokeWidth="1.4" />

        {/* BMI badge */}
        {bmiRaw && (
          <g>
            <rect x="16" y="158" width="44" height="16" rx="6" fill={`${bmiClr}22`} stroke={`${bmiClr}55`} strokeWidth="1" />
            <text x="38" y="168.5" textAnchor="middle" fill={bmiClr} fontSize="8.5" fontWeight="800">
              {bmi.toFixed(1)} · {bmiLbl}
            </text>
          </g>
        )}
      </svg>

      {/* Stats under paperdoll */}
      {(weight > 0 || height > 0) && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {weight > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: statText, lineHeight: 1 }}>{weight}kg</div>
              <div style={{ fontSize: 8, color: statSub, marginTop: 2 }}>weight</div>
            </div>
          )}
          {height > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: statText, lineHeight: 1 }}>{height}cm</div>
              <div style={{ fontSize: 8, color: statSub, marginTop: 2 }}>height</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function PersonalDashboard({ isLight = false, accentColor = '#ec4899' }: Props) {

  const [exams,       setExams]       = useState<ExamSchedule[]>(DEFAULT_EXAMS);
  const [forms,       setForms]       = useState<FormDeadline[]>(DEFAULT_FORMS);
  const [health,      setHealth]      = useState<HealthData>(DEFAULT_HEALTH);
  const [tab,         setTab]         = useState<'overview' | 'exams' | 'forms' | 'health'>('overview');
  const [foodInput,   setFoodInput]   = useState('');
  const [qtyInput,    setQtyInput]    = useState('1');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editStats,   setEditStats]   = useState(false);
  const [wDraft,      setWDraft]      = useState('');
  const [hDraft,      setHDraft]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const e = localStorage.getItem('tessa-exams');
      const f = localStorage.getItem('tessa-forms');
      const h = localStorage.getItem('tessa-health');
      if (e) setExams(JSON.parse(e));
      if (f) setForms(JSON.parse(f));
      if (h) {
        const hd: HealthData = JSON.parse(h);
        if (hd.date !== todayStr()) { hd.meals = []; hd.totalCalories = 0; hd.date = todayStr(); }
        setHealth(hd);
        setWDraft(String(hd.weight || ''));
        setHDraft(String(hd.height || ''));
      }
    } catch { }
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => { try { localStorage.setItem('tessa-exams',  JSON.stringify(exams));  } catch { } }, [exams]);
  useEffect(() => { try { localStorage.setItem('tessa-forms',  JSON.stringify(forms));  } catch { } }, [forms]);
  useEffect(() => { try { localStorage.setItem('tessa-health', JSON.stringify(health)); } catch { } }, [health]);

  useEffect(() => {
    setSuggestions(foodInput.length >= 2 ? getFoodSuggestions(foodInput).slice(0, 6) : []);
  }, [foodInput]);

  // ─────────────────────────────────────────────────────────────────────────
  // Theme tokens — carefully calibrated for EVERY light & dark mode
  // Light modes: pastel, sakura, ankit, light → dark text on bright bg
  // Dark modes: dark, cyberpunk, ocean, sunset → light text on dark bg
  // ─────────────────────────────────────────────────────────────────────────
  const acc = accentColor;

  // Foreground text — must pass contrast on any theme bg
  const text    = isLight ? '#1f2937'             : 'rgba(255,255,255,0.92)';
  const textMid = isLight ? '#374151'             : 'rgba(255,255,255,0.75)';
  const sub     = isLight ? '#6b7280'             : 'rgba(255,255,255,0.45)';
  const subSoft = isLight ? '#9ca3af'             : 'rgba(255,255,255,0.30)';

  // Surfaces
  const card    = isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.045)';
  const cardB   = isLight ? 'rgba(0,0,0,0.10)'       : 'rgba(255,255,255,0.09)';
  const cardHvr = isLight ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.07)';

  // Inputs
  const inp  = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.25)';
  const inpB = isLight ? 'rgba(0,0,0,0.14)'       : 'rgba(255,255,255,0.10)';

  // Divider
  const div  = isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.07)';

  // Dropdown
  const drop = isLight ? '#ffffff'                 : '#0d0d20';
  const dropB = isLight ? 'rgba(0,0,0,0.08)'       : 'rgba(255,255,255,0.08)';

  // Accent surface (done/active items)
  const accSurf  = `${acc}18`;
  const accBord  = `${acc}35`;

  // Tab active text always white (on accent bg)
  const tabActiveText = '#ffffff';
  const tabIdleText   = isLight ? '#6b7280' : 'rgba(255,255,255,0.45)';

  // ── Derived ───────────────────────────────────────────────────────────────
  const bmiRaw = health.height && health.weight
    ? health.weight / ((health.height / 100) ** 2) : null;
  const bmiLbl = bmiRaw
    ? bmiRaw < 18.5 ? 'Underweight' : bmiRaw < 25 ? 'Healthy' : bmiRaw < 30 ? 'Overweight' : 'Obese'
    : null;
  const bmiClr = bmiRaw
    ? bmiRaw < 18.5 ? '#f59e0b' : bmiRaw < 25 ? '#10b981' : bmiRaw < 30 ? '#f97316' : '#ef4444'
    : acc;

  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const upExams   = exams.filter(e => {
    if (e.completed) return false;
    const d = new Date(e.date); d.setHours(23, 59, 59);
    return d >= today;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const doneExams = exams.filter(e => e.completed);

  const pendForms = forms.filter(f => {
    if (f.status !== 'pending') return false;
    const d = new Date(f.deadline); d.setHours(23, 59, 59);
    return d >= today;
  }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

  const calPct = Math.min(110, (health.totalCalories / CAL_GOAL) * 100);

  // ── Actions ───────────────────────────────────────────────────────────────
  const addMeal = (name?: string) => {
    const food = (name ?? foodInput).trim(); if (!food) return;
    const qty  = Math.max(0.5, parseFloat(qtyInput) || 1);
    const res  = estimateCalories(food, qty);
    setHealth(p => ({
      ...p,
      meals:         [...p.meals, {
        time:       new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        meal:       res.food,
        calories:   res.calories,
        confidence: res.confidence,
      }],
      totalCalories: p.totalCalories + res.calories,
    }));
    setFoodInput(''); setQtyInput('1'); setSuggestions([]); setShowAdd(false);
  };

  const removeMeal = (i: number) => setHealth(p => {
    const meals = p.meals.filter((_, idx) => idx !== i);
    return { ...p, meals, totalCalories: meals.reduce((s, m) => s + m.calories, 0) };
  });

  const saveStats = () => {
    setHealth(p => ({ ...p, weight: parseFloat(wDraft) || 0, height: parseFloat(hDraft) || 0 }));
    setEditStats(false);
  };

  const toggleExam = (i: number) => {
    const u = [...exams]; u[i].completed = !u[i].completed; setExams(u);
  };
  const submitForm = (i: number) => {
    const u = [...forms]; u[i].status = 'submitted'; setForms(u);
  };

  // live calorie preview
  const liveQty = parseFloat(qtyInput) || 1;
  const liveCal = foodInput ? estimateCalories(foodInput, liveQty).calories : 0;

  // ── Shared card style ────────────────────────────────────────────────────
  const crd = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: card,
    border:     `1px solid ${cardB}`,
    borderRadius: 14,
    padding:    '12px 14px',
    ...extra,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION: OVERVIEW
  // ─────────────────────────────────────────────────────────────────────────
  const OverviewTab = () => {
    const nextExam = upExams[0];
    const nextForm = pendForms[0];
    const calRemaining = CAL_GOAL - health.totalCalories;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Tessa's status bar */}
        <div style={{ ...crd(), background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.04)', borderColor: `${acc}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: acc, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tessa's Records
            </span>
            <span style={{ fontSize: 8, color: subSoft, fontWeight: 500 }}>— v7.0</span>
          </div>
          <p style={{ fontSize: 10, color: textMid, lineHeight: 1.5 }}>
            {upExams.length === 0
              ? 'All board exams accounted for. 👏'
              : `${upExams.length} exam${upExams.length > 1 ? 's' : ''} remaining · next: ${upExams[0]?.subject}`}
            {pendForms.length > 0 && ` · ${pendForms.length} deadline${pendForms.length > 1 ? 's' : ''} pending`}
          </p>
        </div>

        {/* 4 stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {([
            { lbl: 'Exams left',   val: upExams.length,          clr: '#818cf8' },
            { lbl: 'Forms due',    val: pendForms.length,        clr: '#f472b6' },
            { lbl: 'Sleep',        val: health.sleepHours ? `${health.sleepHours}h` : '—', clr: '#a78bfa' },
            { lbl: 'BMI',          val: bmiRaw?.toFixed(1) ?? '—', clr: bmiClr },
          ] as { lbl: string; val: string | number; clr: string }[]).map(s => (
            <div key={s.lbl} style={{ ...crd() }}>
              <div style={{ fontSize: 8, color: sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>
                {s.lbl}
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.clr, lineHeight: 1 }}>
                {s.val}
              </div>
            </div>
          ))}
        </div>

        {/* Next exam card */}
        {nextExam && (
          <div style={{ ...crd(), borderColor: `${urgencyColor(daysUntil(nextExam.date), acc)}35` }}>
            <div style={{ fontSize: 8, color: sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Next Exam
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: text }}>{nextExam.subject}</div>
                <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{fmtDate(nextExam.date)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: urgencyColor(daysUntil(nextExam.date), acc) }}>
                  {daysUntil(nextExam.date)}
                </div>
                <div style={{ fontSize: 9, color: sub }}>days</div>
              </div>
            </div>
          </div>
        )}

        {/* Next form */}
        {nextForm && (
          <div style={{ ...crd(), borderColor: `${urgencyColor(daysUntil(nextForm.deadline), acc)}35` }}>
            <div style={{ fontSize: 8, color: sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
              Next Deadline
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nextForm.name}
                </div>
                <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{fmtDate(nextForm.deadline)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, color: urgencyColor(daysUntil(nextForm.deadline), acc) }}>
                  {daysUntil(nextForm.deadline)}
                </div>
                <div style={{ fontSize: 9, color: sub }}>days</div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION: EXAMS
  // ─────────────────────────────────────────────────────────────────────────
  const ExamsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Tessa's note */}
      <div style={{ ...crd(), borderColor: `${acc}25`, padding: '9px 12px' }}>
        <p style={{ fontSize: 10, color: textMid, lineHeight: 1.5 }}>
          {doneExams.length > 0
            ? `${doneExams.map(e => e.subject).join(', ')} — done ✓`
            : 'No completed exams yet.'} {upExams.length > 0 ? `${upExams.length} to go.` : ' All done!'}
        </p>
      </div>

      {exams.map((exam, i) => {
        const d   = daysUntil(exam.date);
        const uc  = urgencyColor(d, acc);
        const isDone = exam.completed || d < 0;
        return (
          <div key={i} style={{
            ...crd(),
            borderColor: isDone ? cardB : `${uc}30`,
            opacity: isDone ? 0.55 : 1,
            transition: 'all 0.2s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 800,
                  color: isDone ? sub : text,
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>
                  {exam.subject}
                </div>
                <div style={{ fontSize: 10, color: sub, marginTop: 2 }}>{fmtDate(exam.date)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {!isDone && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: uc, lineHeight: 1 }}>{d}</div>
                    <div style={{ fontSize: 8, color: sub }}>days</div>
                  </div>
                )}
                {isDone && !exam.completed && (
                  <span style={{ fontSize: 9, color: sub, fontWeight: 600 }}>past</span>
                )}
                <button onClick={() => toggleExam(i)} style={{
                  width: 28, height: 28, borderRadius: 8, cursor: 'pointer',
                  border: `1.5px solid ${exam.completed ? '#10b981' : cardB}`,
                  background: exam.completed ? '#10b98118' : 'transparent',
                  color: exam.completed ? '#10b981' : sub,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Check size={13} />
                </button>
              </div>
            </div>
            {!isDone && d >= 0 && d <= 30 && (
              <div style={{ marginTop: 8, height: 3, background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)', borderRadius: 99 }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: uc,
                  width: `${Math.max(3, ((30 - d) / 30) * 100)}%`, transition: 'width 0.4s',
                }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION: FORMS
  // ─────────────────────────────────────────────────────────────────────────
  const FormsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {forms.map((form, i) => {
        const d  = daysUntil(form.deadline);
        const uc = form.status === 'submitted' ? '#10b981' : urgencyColor(d, acc);
        return (
          <div key={i} style={{ ...crd(), borderColor: `${uc}30` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: text, marginBottom: 3 }}>{form.name}</div>
                <div style={{ fontSize: 10, color: sub }}>Due: {fmtDate(form.deadline)}</div>
                {form.status === 'pending' && d >= 0 && (
                  <div style={{ fontSize: 10, color: uc, fontWeight: 700, marginTop: 2 }}>{d} days left</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                {form.priority === 'high' && form.status === 'pending' && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, background: '#ef444418', color: '#ef4444',
                    border: '1px solid #ef444435', borderRadius: 6, padding: '2px 7px',
                  }}>URGENT</span>
                )}
                {form.status === 'submitted' && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: '#10b981',
                    background: '#10b98118', border: '1px solid #10b98130',
                    borderRadius: 8, padding: '3px 8px',
                  }}>✓ Done</span>
                )}
              </div>
            </div>
            {form.status !== 'submitted' && (
              <button onClick={() => submitForm(i)} style={{
                width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer',
                background: accSurf, border: `1px solid ${accBord}`, color: acc,
                fontSize: 11, fontWeight: 700,
              }}>
                Mark Submitted ✓
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION: HEALTH
  // ─────────────────────────────────────────────────────────────────────────
  const HealthTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* Body stats + paperdoll */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {editStats ? (
            <div style={{ ...crd() }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: text, marginBottom: 10 }}>Edit Body Stats</div>
              {([
                { label: 'Weight (kg)', val: wDraft, set: setWDraft },
                { label: 'Height (cm)', val: hDraft, set: setHDraft },
              ] as { label: string; val: string; set: (v: string) => void }[]).map(f => (
                <div key={f.label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: sub, marginBottom: 4 }}>{f.label}</div>
                  <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder="0"
                    style={{
                      width: '100%', padding: '7px 10px', borderRadius: 8,
                      background: inp, border: `1px solid ${inpB}`,
                      color: isLight ? '#1f2937' : 'rgba(255,255,255,0.9)',
                      fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                <button onClick={saveStats} style={{
                  flex: 1, padding: '7px 0', borderRadius: 8, background: acc,
                  border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>Save</button>
                <button onClick={() => setEditStats(false)} style={{
                  padding: '7px 12px', borderRadius: 8, background: card,
                  border: `1px solid ${cardB}`, color: sub, fontSize: 11, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ ...crd() }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: text }}>Body Stats</span>
                <button onClick={() => setEditStats(true)} style={{ background: 'none', border: 'none', color: sub, cursor: 'pointer', padding: 2 }}>
                  <Edit3 size={12} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7, marginBottom: bmiRaw ? 8 : 0 }}>
                {([
                  { lbl: 'Weight', val: health.weight ? `${health.weight} kg` : '—' },
                  { lbl: 'Height', val: health.height ? `${health.height} cm` : '—' },
                ] as { lbl: string; val: string }[]).map(s => (
                  <div key={s.lbl} style={{
                    background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    borderRadius: 8, padding: '8px 10px',
                  }}>
                    <div style={{ fontSize: 8, color: sub, marginBottom: 3 }}>{s.lbl}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: text }}>{s.val}</div>
                  </div>
                ))}
              </div>
              {bmiRaw && (
                <div style={{
                  background: `${bmiClr}14`, border: `1px solid ${bmiClr}30`,
                  borderRadius: 9, padding: '8px 10px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 8, color: sub, marginBottom: 2 }}>BMI</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: bmiClr, lineHeight: 1 }}>{bmiRaw.toFixed(1)}</div>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: bmiClr,
                    background: `${bmiClr}20`, borderRadius: 7, padding: '3px 9px',
                  }}>{bmiLbl}</span>
                </div>
              )}
              {!health.weight && !health.height && (
                <button onClick={() => setEditStats(true)} style={{
                  width: '100%', padding: '7px 0', borderRadius: 8, cursor: 'pointer',
                  background: accSurf, border: `1px dashed ${accBord}`,
                  color: acc, fontSize: 11, fontWeight: 600,
                }}>+ Set height & weight</button>
              )}
            </div>
          )}

        </div>

        {/* Paperdoll */}
        <Paperdoll bmiRaw={bmiRaw} weight={health.weight} height={health.height} acc={acc} isLight={isLight} />
      </div>

      {/* Meal log — read-only, synced from Health Pulse */}
      <div style={{ ...crd() }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: text }}>Meals logged today</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {health.meals.length > 0 && (
              <button
                onClick={() => setHealth(p => ({ ...p, meals: [], totalCalories: 0 }))}
                title="Reset meals"
                style={{ background: 'none', border: 'none', color: sub, cursor: 'pointer', padding: '2px 4px' }}>
                <RotateCcw size={12} />
              </button>
            )}
            <span style={{ fontSize: 9, color: sub, padding: '4px 8px', borderRadius: 7, background: accSurf, border: `1px solid ${accBord}` }}>
              🥗 via Health Pulse
            </span>
          </div>
        </div>

        {/* refs kept alive — meal logging moved to Health Pulse */}
        {false && <input ref={inputRef} value={foodInput} onChange={e=>setFoodInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addMeal()} style={{display:'none'}}/>}

        {/* Meal list */}
        {health.meals.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {health.meals.map((meal, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                  background: isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.04)',
                  borderRadius: 8, border: `1px solid ${cardB}`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600, color: text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{meal.meal}</div>
                    <div style={{ fontSize: 9, color: sub, marginTop: 1 }}>
                      {meal.time}
                      {meal.confidence === 'high'   && <span style={{ color: '#10b981', marginLeft: 4 }}>✓ exact</span>}
                      {meal.confidence === 'medium' && <span style={{ color: '#eab308', marginLeft: 4 }}>~ approx</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color: acc, flexShrink: 0 }}>{meal.calories}</span>
                  <span style={{ fontSize: 9, color: sub, flexShrink: 0 }}>cal</span>
                  <button onClick={() => removeMeal(i)} style={{
                    background: 'none', border: 'none', color: sub, cursor: 'pointer', padding: 2, opacity: 0.55,
                  }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', marginTop: 7, borderTop: `1px solid ${div}`,
            }}>
              <span style={{ fontSize: 11, color: sub }}>Total today</span>
              <span style={{ fontSize: 19, fontWeight: 900, color: acc }}>{health.totalCalories} cal</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0', color: sub, fontSize: 11 }}>
            No meals logged yet — use the 🥗 Health Pulse button to log food
          </div>
        )}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Tabs config
  // ─────────────────────────────────────────────────────────────────────────
  const tabs: { id: typeof tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Zap size={11} /> },
    { id: 'exams',    label: 'Exams',    icon: <BookOpen size={11} />, badge: upExams.length },
    { id: 'forms',    label: 'Forms',    icon: <FileText size={11} />, badge: pendForms.length },
    { id: 'health',   label: 'Health',   icon: <Activity size={11} /> },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', paddingBottom: 28, paddingTop: 4 }}>

      {/* Header — Tessa's records aesthetic */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: acc, letterSpacing: '-0.02em' }}>
            Tessa's Records
          </span>
          <span style={{ fontSize: 8, color: subSoft, fontWeight: 600, letterSpacing: '0.05em' }}>
            v7.0
          </span>
        </div>
        <div style={{ fontSize: 9, color: sub }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 3, marginBottom: 14,
        background: card, border: `1px solid ${cardB}`, borderRadius: 13, padding: 3,
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '7px 3px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t.id ? acc : 'transparent',
              color: tab === t.id ? tabActiveText : tabIdleText,
              fontSize: 9, fontWeight: 700,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all 0.15s', position: 'relative',
            }}>
            <span style={{ opacity: tab === t.id ? 1 : 0.65 }}>{t.icon}</span>
            <span style={{ lineHeight: 1 }}>{t.label}</span>
            {t.badge !== undefined && t.badge > 0 && (
              <span style={{
                position: 'absolute', top: 2, right: 3, fontSize: 7, fontWeight: 900,
                background: tab === t.id ? 'rgba(255,255,255,0.30)' : acc,
                color: '#fff', borderRadius: 8, padding: '1px 4px', lineHeight: '14px',
              }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'exams'    && <ExamsTab />}
      {tab === 'forms'    && <FormsTab />}
      {tab === 'health'   && <HealthTab />}
    </div>
  );
}
