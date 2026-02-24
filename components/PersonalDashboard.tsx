'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Flame, FileText, Plus, X, Check,
  Trash2, BookOpen, Zap, Scale, Ruler, Edit3, RotateCcw,
} from 'lucide-react';
import { estimateCalories, getFoodSuggestions } from '@/lib/food-database';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface ExamSchedule { subject: string; date: string; completed: boolean }
interface FormDeadline { name: string; deadline: string; status: 'pending'|'submitted'|'missed'; priority: 'high'|'medium'|'low' }
interface MealEntry    { time: string; meal: string; calories: number; confidence: string }
interface HealthData   { weight: number; height: number; meals: MealEntry[]; totalCalories: number; date: string; sleepHours?: number }

interface Props { isLight?: boolean; accentColor?: string }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split('T')[0];
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
const fmtDate   = (d: string) => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'});

const DEFAULT_EXAMS: ExamSchedule[] = [
  { subject:'Physics',          date:'2026-02-20', completed:false },
  { subject:'Painting',         date:'2026-02-27', completed:false },
  { subject:'Chemistry',        date:'2026-02-28', completed:false },
  { subject:'Mathematics',      date:'2026-03-09', completed:false },
  { subject:'English',          date:'2026-03-12', completed:false },
  { subject:'Computer Science', date:'2026-03-25', completed:false },
];
const DEFAULT_FORMS: FormDeadline[] = [
  { name:'JEE Mains Session 2', deadline:'2026-02-25', status:'pending', priority:'high' },
  { name:'IISER Aptitude Test',  deadline:'2026-04-13', status:'pending', priority:'high' },
];
const DEFAULT_HEALTH: HealthData = { weight:0, height:0, meals:[], totalCalories:0, date:todayStr() };

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function PersonalDashboard({ isLight=false, accentColor='#ec4899' }: Props) {
  const [exams,       setExams]       = useState<ExamSchedule[]>(DEFAULT_EXAMS);
  const [forms,       setForms]       = useState<FormDeadline[]>(DEFAULT_FORMS);
  const [health,      setHealth]      = useState<HealthData>(DEFAULT_HEALTH);
  const [tab,         setTab]         = useState<'overview'|'exams'|'forms'|'health'>('overview');
  const [foodInput,   setFoodInput]   = useState('');
  const [qtyInput,    setQtyInput]    = useState('1');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editHealth,  setEditHealth]  = useState(false);
  const [wDraft,      setWDraft]      = useState('');
  const [hDraft,      setHDraft]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    try {
      const e = localStorage.getItem('tessa-exams');
      const f = localStorage.getItem('tessa-forms');
      const h = localStorage.getItem('tessa-health');
      if (e) setExams(JSON.parse(e));
      if (f) setForms(JSON.parse(f));
      if (h) {
        const hd: HealthData = JSON.parse(h);
        if (hd.date !== todayStr()) { hd.meals=[]; hd.totalCalories=0; hd.date=todayStr(); }
        setHealth(hd);
        setWDraft(String(hd.weight||''));
        setHDraft(String(hd.height||''));
      }
    } catch {}
  }, []);

  // Persist
  useEffect(() => { try { localStorage.setItem('tessa-exams',   JSON.stringify(exams));   } catch {} }, [exams]);
  useEffect(() => { try { localStorage.setItem('tessa-forms',   JSON.stringify(forms));   } catch {} }, [forms]);
  useEffect(() => { try { localStorage.setItem('tessa-health',  JSON.stringify(health));  } catch {} }, [health]);

  // Suggestions
  useEffect(() => {
    setSuggestions(foodInput.length >= 2 ? getFoodSuggestions(foodInput).slice(0,6) : []);
  }, [foodInput]);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const acc    = accentColor;
  const text   = isLight ? '#111827'                : 'rgba(255,255,255,0.92)';
  const sub    = isLight ? '#6b7280'                : 'rgba(255,255,255,0.40)';
  const card   = isLight ? 'rgba(0,0,0,0.035)'     : 'rgba(255,255,255,0.045)';
  const cardB  = isLight ? 'rgba(0,0,0,0.09)'      : 'rgba(255,255,255,0.08)';
  const inp    = isLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.25)';
  const inpB   = isLight ? 'rgba(0,0,0,0.14)'      : 'rgba(255,255,255,0.10)';
  const div    = isLight ? 'rgba(0,0,0,0.07)'      : 'rgba(255,255,255,0.06)';
  const drop   = isLight ? '#ffffff'               : '#0f0f1a';

  // ── Derived ───────────────────────────────────────────────────────────────
  const bmiRaw = health.height && health.weight
    ? health.weight / ((health.height/100)**2) : null;
  const bmi    = bmiRaw ? bmiRaw.toFixed(1) : null;
  const bmiLbl = bmiRaw
    ? bmiRaw<18.5?'Underweight':bmiRaw<25?'Healthy':bmiRaw<30?'Overweight':'Obese' : null;
  const bmiClr = bmiRaw
    ? bmiRaw<18.5?'#f59e0b':bmiRaw<25?'#10b981':bmiRaw<30?'#f97316':'#ef4444' : acc;

  const upExams   = exams.filter(e=>!e.completed && daysUntil(e.date)>=0);
  const pendForms = forms.filter(f=>f.status==='pending');
  const CAL_GOAL  = 2200;

  const urgClr = (d: number) => d<=2?'#ef4444':d<=7?'#f97316':d<=14?'#eab308':acc;

  // ── Actions ───────────────────────────────────────────────────────────────
  const addMeal = (name?: string) => {
    const food = (name ?? foodInput).trim(); if (!food) return;
    const qty  = Math.max(0.5, parseFloat(qtyInput)||1);
    const res  = estimateCalories(food, qty);
    setHealth(p => ({
      ...p,
      meals:        [...p.meals, { time:new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}), meal:res.food, calories:res.calories, confidence:res.confidence }],
      totalCalories: p.totalCalories + res.calories,
    }));
    setFoodInput(''); setQtyInput('1'); setSuggestions([]); setShowAdd(false);
  };

  const removeMeal = (i: number) => setHealth(p => {
    const meals = p.meals.filter((_,idx)=>idx!==i);
    return { ...p, meals, totalCalories: meals.reduce((s,m)=>s+m.calories,0) };
  });

  const saveStats = () => {
    setHealth(p=>({...p, weight:parseFloat(wDraft)||0, height:parseFloat(hDraft)||0}));
    setEditHealth(false);
  };

  const toggleExam = (i: number) => {
    const u=[...exams]; u[i].completed=!u[i].completed; setExams(u);
  };
  const submitForm = (i: number) => {
    const u=[...forms]; u[i].status='submitted'; setForms(u);
  };

  // ═════════════════════════════════════════════════════════════════════════
  // TAB: OVERVIEW
  // ═════════════════════════════════════════════════════════════════════════
  const OverviewTab = () => {
    const calPct    = Math.min(100,(health.totalCalories/CAL_GOAL)*100);
    const nextExam  = upExams[0];
    const nextForm  = [...pendForms].sort((a,b)=>daysUntil(a.deadline)-daysUntil(b.deadline))[0];

    return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>

        {/* 4 stat chips */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
            {lbl:'Exams left',  val:upExams.length,            clr:'#818cf8'},
            {lbl:'Forms due',   val:pendForms.length,          clr:'#f472b6'},
            {lbl:'Cal today',   val:health.totalCalories,      clr:'#fb923c'},
            {lbl:'BMI',         val:bmi??'—',                  clr:bmiClr  },
          ].map(s=>(
            <div key={s.lbl} style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:'11px 13px'}}>
              <div style={{fontSize:9,color:sub,fontWeight:600,marginBottom:5,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.lbl}</div>
              <div style={{fontSize:26,fontWeight:900,color:s.clr,lineHeight:1}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Calorie progress */}
        <div style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:'11px 13px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:7}}>
            <span style={{fontSize:11,fontWeight:700,color:text}}>Calories today</span>
            <span style={{fontSize:11,color:acc,fontWeight:700}}>{health.totalCalories} / {CAL_GOAL}</span>
          </div>
          <div style={{height:8,background:cardB,borderRadius:99,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${calPct}%`,borderRadius:99,transition:'width 0.6s',
              background:calPct>110?'#ef4444':calPct>90?'#f97316':`linear-gradient(90deg,${acc},${acc}99)`}}/>
          </div>
          <div style={{fontSize:9,color:sub,marginTop:4}}>
            {CAL_GOAL-health.totalCalories>0 ? `${CAL_GOAL-health.totalCalories} cal remaining` : `${health.totalCalories-CAL_GOAL} cal over`}
          </div>
        </div>

        {/* Next exam card */}
        {nextExam && (
          <div style={{background:card,border:`1px solid ${urgClr(daysUntil(nextExam.date))}30`,borderRadius:12,padding:'11px 13px'}}>
            <div style={{fontSize:9,color:sub,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>Next Exam</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:14,fontWeight:800,color:text}}>{nextExam.subject}</div>
                <div style={{fontSize:10,color:sub,marginTop:2}}>{fmtDate(nextExam.date)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:34,fontWeight:900,color:urgClr(daysUntil(nextExam.date)),lineHeight:1}}>{daysUntil(nextExam.date)}</div>
                <div style={{fontSize:9,color:sub}}>days</div>
              </div>
            </div>
          </div>
        )}

        {/* Next form card */}
        {nextForm && (
          <div style={{background:card,border:`1px solid ${acc}25`,borderRadius:12,padding:'11px 13px'}}>
            <div style={{fontSize:9,color:sub,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:4}}>Next Deadline</div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontSize:13,fontWeight:800,color:text}}>{nextForm.name}</div>
                <div style={{fontSize:10,color:sub,marginTop:2}}>{fmtDate(nextForm.deadline)}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:30,fontWeight:900,color:urgClr(daysUntil(nextForm.deadline)),lineHeight:1}}>{daysUntil(nextForm.deadline)}</div>
                <div style={{fontSize:9,color:sub}}>days</div>
              </div>
            </div>
          </div>
        )}

        {/* Recent meals */}
        {health.meals.length>0 && (
          <div style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:'11px 13px'}}>
            <div style={{fontSize:11,fontWeight:700,color:text,marginBottom:8}}>Recent meals</div>
            {health.meals.slice(-3).map((m,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'4px 0',borderBottom:i<Math.min(health.meals.length,3)-1?`1px solid ${div}`:'none'}}>
                <span style={{fontSize:11,color:text,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingRight:8}}>{m.meal}</span>
                <span style={{fontSize:11,fontWeight:700,color:acc,flexShrink:0}}>{m.calories} cal</span>
              </div>
            ))}
            {health.meals.length>3 && <div style={{fontSize:9,color:sub,marginTop:4}}>+{health.meals.length-3} more in Health tab</div>}
          </div>
        )}
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // TAB: EXAMS
  // ═════════════════════════════════════════════════════════════════════════
  const ExamsTab = () => (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {exams.map((exam,i)=>{
        const d=daysUntil(exam.date); const uc=urgClr(d);
        return (
          <div key={i} style={{background:card,border:`1px solid ${exam.completed?cardB:uc+'30'}`,
            borderRadius:12,padding:'11px 13px',opacity:exam.completed?0.5:1,transition:'all 0.2s'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:exam.completed?sub:text,
                  textDecoration:exam.completed?'line-through':'none'}}>{exam.subject}</div>
                <div style={{fontSize:10,color:sub,marginTop:2}}>{fmtDate(exam.date)}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {!exam.completed && d>=0 && (
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:26,fontWeight:900,color:uc,lineHeight:1}}>{d}</div>
                    <div style={{fontSize:8,color:sub}}>days</div>
                  </div>
                )}
                <button onClick={()=>toggleExam(i)} style={{width:28,height:28,borderRadius:8,
                  border:`1.5px solid ${exam.completed?'#10b981':cardB}`,
                  background:exam.completed?'#10b98120':'transparent',
                  color:exam.completed?'#10b981':sub,cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Check size={13}/>
                </button>
              </div>
            </div>
            {!exam.completed && d>=0 && d<=30 && (
              <div style={{marginTop:8,height:3,background:cardB,borderRadius:99}}>
                <div style={{height:'100%',borderRadius:99,background:uc,
                  width:`${Math.max(3,((30-d)/30)*100)}%`,transition:'width 0.4s'}}/>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // TAB: FORMS
  // ═════════════════════════════════════════════════════════════════════════
  const FormsTab = () => (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {forms.map((form,i)=>{
        const d=daysUntil(form.deadline);
        const uc=form.status==='submitted'?'#10b981':urgClr(d);
        return (
          <div key={i} style={{background:card,border:`1px solid ${uc}30`,borderRadius:12,padding:'11px 13px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:3}}>{form.name}</div>
                <div style={{fontSize:10,color:sub}}>Due: {fmtDate(form.deadline)}</div>
                {form.status==='pending'&&d>=0&&(
                  <div style={{fontSize:10,color:uc,fontWeight:700,marginTop:2}}>{d} days left</div>
                )}
              </div>
              {form.priority==='high'&&form.status==='pending'&&(
                <span style={{fontSize:8,fontWeight:800,background:'#ef444420',color:'#ef4444',
                  border:'1px solid #ef444440',borderRadius:6,padding:'2px 7px',flexShrink:0}}>URGENT</span>
              )}
              {form.status==='submitted'&&(
                <span style={{fontSize:10,fontWeight:700,color:'#10b981',background:'#10b98120',
                  border:'1px solid #10b98130',borderRadius:8,padding:'3px 8px',flexShrink:0}}>✓ Done</span>
              )}
            </div>
            {form.status!=='submitted'&&(
              <button onClick={()=>submitForm(i)} style={{width:'100%',padding:'7px 0',borderRadius:8,
                background:`${acc}18`,border:`1px solid ${acc}35`,color:acc,
                fontSize:11,fontWeight:700,cursor:'pointer'}}>
                Mark as Submitted ✓
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════════
  // TAB: HEALTH
  // ═════════════════════════════════════════════════════════════════════════
  const HealthTab = () => {
    const calPct = Math.min(100,(health.totalCalories/CAL_GOAL)*100);
    const bmiVal = bmiRaw??22;
    const waist  = bmiVal<18.5?13:bmiVal<22?15:bmiVal<25?17:bmiVal<28?20:23;
    const sh=21, hip=waist+2;

    return (
      <div style={{display:'flex',flexDirection:'column',gap:10}}>

        {/* Body stats + paperdoll */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10,alignItems:'start'}}>

          {/* Stats */}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {editHealth ? (
              <div style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:12}}>
                <div style={{fontSize:11,fontWeight:700,color:text,marginBottom:8}}>Edit Body Stats</div>
                {[
                  {lbl:'Weight (kg)',val:wDraft,set:setWDraft,icon:<Scale size={11}/>},
                  {lbl:'Height (cm)',val:hDraft,set:setHDraft,icon:<Ruler size={11}/>},
                ].map(f=>(
                  <div key={f.lbl} style={{marginBottom:8}}>
                    <div style={{fontSize:9,color:sub,marginBottom:3,display:'flex',alignItems:'center',gap:4}}>
                      <span style={{color:acc}}>{f.icon}</span>{f.lbl}
                    </div>
                    <input type="number" value={f.val} onChange={e=>f.set(e.target.value)} placeholder="0"
                      style={{width:'100%',padding:'7px 10px',borderRadius:8,background:inp,
                        border:`1px solid ${inpB}`,color:text,fontSize:12,outline:'none',boxSizing:'border-box'}}/>
                  </div>
                ))}
                <div style={{display:'flex',gap:6}}>
                  <button onClick={saveStats} style={{flex:1,padding:'7px 0',borderRadius:8,
                    background:acc,border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>Save</button>
                  <button onClick={()=>setEditHealth(false)} style={{padding:'7px 12px',borderRadius:8,
                    background:card,border:`1px solid ${cardB}`,color:sub,fontSize:11,cursor:'pointer'}}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:text}}>Body Stats</span>
                  <button onClick={()=>setEditHealth(true)} style={{background:'none',border:'none',color:sub,cursor:'pointer',padding:2}}>
                    <Edit3 size={12}/>
                  </button>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:bmi?8:0}}>
                  {[
                    {lbl:'Weight',val:health.weight?`${health.weight} kg`:'—'},
                    {lbl:'Height',val:health.height?`${health.height} cm`:'—'},
                  ].map(s=>(
                    <div key={s.lbl} style={{background:inp,borderRadius:8,padding:'7px 9px'}}>
                      <div style={{fontSize:8,color:sub,marginBottom:2}}>{s.lbl}</div>
                      <div style={{fontSize:18,fontWeight:900,color:text}}>{s.val}</div>
                    </div>
                  ))}
                </div>
                {bmi&&(
                  <div style={{background:`${bmiClr}18`,border:`1px solid ${bmiClr}30`,
                    borderRadius:8,padding:'8px 10px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <div style={{fontSize:8,color:sub,marginBottom:1}}>BMI</div>
                      <div style={{fontSize:24,fontWeight:900,color:bmiClr,lineHeight:1}}>{bmi}</div>
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:bmiClr,
                      background:`${bmiClr}20`,borderRadius:7,padding:'3px 8px'}}>{bmiLbl}</span>
                  </div>
                )}
                {!health.weight&&!health.height&&(
                  <button onClick={()=>setEditHealth(true)}
                    style={{width:'100%',padding:'7px 0',borderRadius:8,background:`${acc}15`,
                      border:`1px dashed ${acc}40`,color:acc,fontSize:11,fontWeight:600,cursor:'pointer',marginTop:4}}>
                    + Set height & weight
                  </button>
                )}
              </div>
            )}

            {/* Calorie bar */}
            <div style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:12}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                <span style={{fontSize:11,fontWeight:700,color:text}}>Calories</span>
                <span style={{fontSize:11,color:acc,fontWeight:700}}>{health.totalCalories}/{CAL_GOAL}</span>
              </div>
              <div style={{height:9,background:inp,borderRadius:99,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${calPct}%`,borderRadius:99,transition:'width 0.6s',
                  background:calPct>110?'#ef4444':calPct>90?'#f97316':`linear-gradient(90deg,${acc},${acc}88)`}}/>
              </div>
              <div style={{fontSize:9,color:sub,marginTop:4}}>
                {CAL_GOAL-health.totalCalories>0
                  ?`${CAL_GOAL-health.totalCalories} cal remaining`
                  :`${health.totalCalories-CAL_GOAL} cal over goal`}
              </div>
            </div>
          </div>

          {/* Paperdoll */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,paddingTop:2}}>
            <svg width="66" height="134" viewBox="0 0 66 134">
              {/* Head */}
              <circle cx="33" cy="16" r="11" fill={`${acc}18`} stroke={acc} strokeWidth="1.8"/>
              {/* Neck */}
              <line x1="33" y1="27" x2="33" y2="35" stroke={acc} strokeWidth="1.6"/>
              {/* Shoulders arc */}
              <path d={`M ${33-sh} 44 Q 33 35 ${33+sh} 44`} fill="none" stroke={acc} strokeWidth="1.7"/>
              {/* Torso */}
              <path d={`M ${33-sh} 44 Q ${33-waist} 68 ${33-hip} 80 L ${33+hip} 80 Q ${33+waist} 68 ${33+sh} 44 Z`}
                fill={`${acc}18`} stroke={acc} strokeWidth="1.6"/>
              {/* Left arm */}
              <path d={`M ${33-sh} 44 Q ${33-sh-10} 58 ${33-sh-8} 74`} fill="none" stroke={acc} strokeWidth="1.5"/>
              {/* Right arm */}
              <path d={`M ${33+sh} 44 Q ${33+sh+10} 58 ${33+sh+8} 74`} fill="none" stroke={acc} strokeWidth="1.5"/>
              {/* Legs */}
              <line x1={33-hip/2} y1="80" x2={33-hip/2-3} y2="118" stroke={acc} strokeWidth="1.7"/>
              <line x1={33+hip/2} y1="80" x2={33+hip/2+3} y2="118" stroke={acc} strokeWidth="1.7"/>
              {/* Feet */}
              <line x1={33-hip/2-3} y1="118" x2={33-hip/2-9} y2="126" stroke={acc} strokeWidth="1.5"/>
              <line x1={33+hip/2+3} y1="118" x2={33+hip/2+9} y2="126" stroke={acc} strokeWidth="1.5"/>
              {/* BMI badge */}
              {bmi&&(
                <text x="33" y="134" textAnchor="middle" fill={bmiClr} fontSize="8.5" fontWeight="800">{bmi}</text>
              )}
            </svg>
            {health.weight>0&&(
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:10,fontWeight:700,color:text}}>{health.weight}kg</div>
                <div style={{fontSize:9,color:sub}}>{health.height}cm</div>
              </div>
            )}
          </div>
        </div>

        {/* Meal logger */}
        <div style={{background:card,border:`1px solid ${cardB}`,borderRadius:12,padding:12}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:700,color:text}}>Today's Meals 🍽️</span>
            <div style={{display:'flex',gap:6}}>
              {health.meals.length>0&&(
                <button onClick={()=>setHealth(p=>({...p,meals:[],totalCalories:0}))}
                  title="Reset meals" style={{background:'none',border:'none',color:sub,cursor:'pointer',padding:'2px 4px'}}>
                  <RotateCcw size={12}/>
                </button>
              )}
              <button onClick={()=>{setShowAdd(p=>!p);setTimeout(()=>inputRef.current?.focus(),80)}}
                style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',borderRadius:8,
                  background:`${acc}18`,border:`1px solid ${acc}38`,color:acc,
                  fontSize:10,fontWeight:700,cursor:'pointer'}}>
                <Plus size={11}/> Add
              </button>
            </div>
          </div>

          {showAdd&&(
            <div style={{background:isLight?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)',
              border:`1px solid ${inpB}`,borderRadius:10,padding:10,marginBottom:10}}>

              {/* Food input */}
              <div style={{position:'relative',marginBottom:6}}>
                <input ref={inputRef} type="text" value={foodInput}
                  onChange={e=>setFoodInput(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&addMeal()}
                  placeholder="Food name (e.g. samosa, dal roti, biryani)"
                  style={{width:'100%',padding:'7px 10px',borderRadius:8,background:inp,
                    border:`1px solid ${inpB}`,color:text,fontSize:11,outline:'none',boxSizing:'border-box'}}/>

                {suggestions.length>0&&(
                  <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,marginTop:2,
                    background:drop,border:`1px solid ${acc}30`,borderRadius:8,overflow:'hidden',
                    boxShadow:`0 8px 20px rgba(0,0,0,0.25)`}}>
                    {suggestions.map((s,i)=>{
                      const info=estimateCalories(s);
                      return (
                        <button key={i} onClick={()=>{setFoodInput(s);setSuggestions([]);inputRef.current?.focus()}}
                          style={{width:'100%',padding:'7px 12px',textAlign:'left',background:'none',border:'none',
                            cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',
                            borderBottom:i<suggestions.length-1?`1px solid ${div}`:'none'}}
                          onMouseEnter={e=>(e.currentTarget.style.background=`${acc}12`)}
                          onMouseLeave={e=>(e.currentTarget.style.background='none')}>
                          <span style={{fontSize:11,color:text}}>{s}</span>
                          <span style={{fontSize:10,color:acc,fontWeight:700}}>{info.calories} cal</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quantity + live preview */}
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:10,color:sub,flexShrink:0}}>Qty:</span>
                <input type="number" value={qtyInput} min="0.5" step="0.5"
                  onChange={e=>setQtyInput(e.target.value)}
                  style={{width:56,padding:'5px 8px',borderRadius:7,background:inp,
                    border:`1px solid ${inpB}`,color:text,fontSize:11,outline:'none'}}/>
                {foodInput&&(
                  <div style={{flex:1,background:`${acc}12`,border:`1px solid ${acc}30`,
                    borderRadius:7,padding:'4px 9px',textAlign:'center'}}>
                    <span style={{fontSize:12,fontWeight:800,color:acc}}>
                      {estimateCalories(foodInput,parseFloat(qtyInput)||1).calories} cal
                    </span>
                  </div>
                )}
              </div>

              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>addMeal()} style={{flex:1,padding:'7px 0',borderRadius:8,
                  background:acc,border:'none',color:'#fff',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  Log Meal
                </button>
                <button onClick={()=>{setShowAdd(false);setFoodInput('');setQtyInput('1');setSuggestions([])}}
                  style={{padding:'7px 10px',borderRadius:8,background:card,border:`1px solid ${cardB}`,
                    color:sub,cursor:'pointer',display:'flex',alignItems:'center'}}>
                  <X size={12}/>
                </button>
              </div>
            </div>
          )}

          {/* Meal list */}
          {health.meals.length>0 ? (
            <>
              <div style={{display:'flex',flexDirection:'column',gap:5}}>
                {health.meals.map((meal,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,
                    padding:'7px 10px',background:inp,borderRadius:8,border:`1px solid ${inpB}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:11,fontWeight:600,color:text,
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{meal.meal}</div>
                      <div style={{fontSize:9,color:sub,marginTop:1}}>
                        {meal.time}
                        {meal.confidence==='high'  && <span style={{color:'#10b981',marginLeft:4}}>✓ exact</span>}
                        {meal.confidence==='medium' && <span style={{color:'#eab308',marginLeft:4}}>~ approx</span>}
                        {meal.confidence==='low'    && <span style={{color:sub,marginLeft:4}}>? estimated</span>}
                      </div>
                    </div>
                    <span style={{fontSize:13,fontWeight:800,color:acc,flexShrink:0}}>{meal.calories}</span>
                    <span style={{fontSize:9,color:sub,flexShrink:0}}>cal</span>
                    <button onClick={()=>removeMeal(i)}
                      style={{background:'none',border:'none',color:sub,cursor:'pointer',padding:2,opacity:0.55,flexShrink:0}}>
                      <Trash2 size={11}/>
                    </button>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                padding:'8px 10px',marginTop:6,borderTop:`1px solid ${div}`}}>
                <span style={{fontSize:11,color:sub}}>Total today</span>
                <span style={{fontSize:18,fontWeight:900,color:acc}}>{health.totalCalories} cal</span>
              </div>
            </>
          ) : (
            <div style={{textAlign:'center',padding:'14px 0',color:sub,fontSize:11}}>
              No meals yet — add above or just tell me in chat 💬
            </div>
          )}
        </div>

        {/* Sleep */}
        {!!health.sleepHours&&health.sleepHours>0&&(
          <div style={{background:card,border:`1px solid ${acc}25`,borderRadius:12,padding:12,
            display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <div style={{fontSize:9,color:sub,marginBottom:2}}>Last sleep</div>
              <div style={{fontSize:22,fontWeight:900,color:acc,lineHeight:1}}>{health.sleepHours}h</div>
            </div>
            <span style={{fontSize:26}}>
              {health.sleepHours>=7?'😴':health.sleepHours>=5?'😐':'😩'}
            </span>
          </div>
        )}
      </div>
    );
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  const tabs = [
    {id:'overview' as const, lbl:'Overview', icon:<Zap size={11}/>,      badge:undefined},
    {id:'exams'    as const, lbl:'Exams',    icon:<BookOpen size={11}/>,  badge:upExams.length},
    {id:'forms'    as const, lbl:'Forms',    icon:<FileText size={11}/>,  badge:pendForms.length},
    {id:'health'   as const, lbl:'Health',   icon:<Flame size={11}/>,     badge:undefined},
  ];

  return (
    <div style={{fontFamily:'system-ui,-apple-system,sans-serif',paddingBottom:24,paddingTop:4}}>

      {/* Header */}
      <div style={{textAlign:'center',paddingBottom:14}}>
        <div style={{fontSize:15,fontWeight:900,color:acc,letterSpacing:'-0.02em'}}>Dashboard 💝</div>
        <div style={{fontSize:9,color:sub,marginTop:2}}>
          {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{display:'flex',gap:3,marginBottom:14,background:card,
        border:`1px solid ${cardB}`,borderRadius:12,padding:3}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,padding:'7px 3px',borderRadius:9,border:'none',cursor:'pointer',
              background:tab===t.id?acc:'transparent',
              color:tab===t.id?'#fff':sub,
              fontSize:9,fontWeight:700,display:'flex',flexDirection:'column',
              alignItems:'center',gap:3,transition:'all 0.15s',position:'relative'}}>
            <span style={{opacity:tab===t.id?1:0.65}}>{t.icon}</span>
            <span style={{lineHeight:1}}>{t.lbl}</span>
            {t.badge!==undefined&&t.badge>0&&(
              <span style={{position:'absolute',top:2,right:3,fontSize:7,fontWeight:900,
                background:tab===t.id?'rgba(255,255,255,0.3)':acc,color:'#fff',
                borderRadius:8,padding:'1px 4px',minWidth:11,textAlign:'center',lineHeight:'14px'}}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab==='overview' && <OverviewTab/>}
      {tab==='exams'    && <ExamsTab/>}
      {tab==='forms'    && <FormsTab/>}
      {tab==='health'   && <HealthTab/>}
    </div>
  );
}
