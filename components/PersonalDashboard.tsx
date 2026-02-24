'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, TrendingUp, AlertCircle, Clock, BookOpen, FileText, 
  Plus, X, Apple, Flame, Target, CheckCircle2, Award, Zap 
} from 'lucide-react';
import { estimateCalories, getFoodSuggestions } from '@/lib/food-database';

interface ExamSchedule {
  subject: string;
  date: string;
  completed: boolean;
}

interface FormDeadline {
  name: string;
  deadline: string;
  status: 'pending' | 'submitted' | 'missed';
  priority: 'high' | 'medium' | 'low';
}

interface MealEntry {
  time: string;
  meal: string;
  calories: number;
  confidence: string;
}

interface HealthData {
  weight: number;
  height: number;
  meals: MealEntry[];
  totalCalories: number;
  date: string;
}

export default function PersonalDashboard() {
  const [exams, setExams] = useState<ExamSchedule[]>([
    { subject: 'Physics', date: '2026-02-27', completed: false },
    { subject: 'Painting', date: '2026-02-27', completed: false },
    { subject: 'Chemistry', date: '2026-02-28', completed: false },
    { subject: 'Mathematics', date: '2026-03-09', completed: false },
    { subject: 'English', date: '2026-03-12', completed: false },
    { subject: 'Computer Science', date: '2026-03-25', completed: false },
  ]);

  const [forms, setForms] = useState<FormDeadline[]>([
    { name: 'JEE Mains Session 2', deadline: '2026-02-25', status: 'pending', priority: 'high' },
    { name: 'IISER Aptitude Test', deadline: '2026-04-13', status: 'pending', priority: 'high' },
  ]);

  const [healthData, setHealthData] = useState<HealthData>({
    weight: 0,
    height: 0,
    meals: [],
    totalCalories: 0,
    date: new Date().toISOString().split('T')[0],
  });

  const [showMealInput, setShowMealInput] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [calorieGoal] = useState(2200);

  useEffect(() => {
    const savedExams = localStorage.getItem('tessa-exams');
    const savedForms = localStorage.getItem('tessa-forms');
    const savedHealth = localStorage.getItem('tessa-health');

    if (savedExams) setExams(JSON.parse(savedExams));
    if (savedForms) setForms(JSON.parse(savedForms));
    if (savedHealth) {
      const health = JSON.parse(savedHealth);
      // Reset calories if it's a new day
      const today = new Date().toISOString().split('T')[0];
      if (health.date !== today) {
        health.meals = [];
        health.totalCalories = 0;
        health.date = today;
      }
      setHealthData(health);
    }
  }, []);

  const saveData = () => {
    localStorage.setItem('tessa-exams', JSON.stringify(exams));
    localStorage.setItem('tessa-forms', JSON.stringify(forms));
    localStorage.setItem('tessa-health', JSON.stringify(healthData));
  };

  useEffect(() => {
    saveData();
  }, [exams, forms, healthData]);

  useEffect(() => {
    if (foodInput.length >= 2) {
      const results = getFoodSuggestions(foodInput);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  }, [foodInput]);

  const toggleExamComplete = (index: number) => {
    const updated = [...exams];
    updated[index].completed = !updated[index].completed;
    setExams(updated);
  };

  const updateFormStatus = (index: number, status: 'pending' | 'submitted' | 'missed') => {
    const updated = [...forms];
    updated[index].status = status;
    setForms(updated);
  };

  const addMeal = (foodName?: string) => {
    const food = foodName || foodInput;
    if (!food.trim()) return;

    const result = estimateCalories(food);
    
    const meal: MealEntry = {
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      meal: result.food,
      calories: result.calories,
      confidence: result.confidence,
    };

    setHealthData(prev => ({
      ...prev,
      meals: [...prev.meals, meal],
      totalCalories: prev.totalCalories + meal.calories,
    }));

    setFoodInput('');
    setSuggestions([]);
    setShowMealInput(false);
  };

  const removeMeal = (index: number) => {
    const meal = healthData.meals[index];
    setHealthData(prev => ({
      ...prev,
      meals: prev.meals.filter((_, i) => i !== index),
      totalCalories: prev.totalCalories - meal.calories,
    }));
  };

  const updateHealth = (field: 'weight' | 'height', value: number) => {
    setHealthData(prev => ({ ...prev, [field]: value }));
  };

  const getDaysUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getBMI = () => {
    if (healthData.height && healthData.weight) {
      const heightM = healthData.height / 100;
      return (healthData.weight / (heightM * heightM)).toFixed(1);
    }
    return 'N/A';
  };

  const upcomingExams = exams.filter(e => !e.completed && getDaysUntil(e.date) >= 0).slice(0, 3);
  const pendingForms = forms.filter(f => f.status === 'pending');
  const calorieProgress = (healthData.totalCalories / calorieGoal) * 100;

  return (
    <div className="space-y-5 pb-20">
      
      {/* Header */}
      <div className="text-center mb-5">
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
          📊 Personal Dashboard
        </h2>
        <p className="text-sm text-gray-400 mt-1">Your daily overview at a glance</p>
      </div>

      {/* Live Calorie Counter - PROMINENT */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-orange-500/10 rounded-2xl blur-xl" />
        <div className="relative bg-gradient-to-br from-pink-500/10 via-orange-500/10 to-red-500/10 border-2 border-pink-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                <Flame size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Today's Calories</p>
                <p className="text-xs text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
            <button
              onClick={() => setShowMealInput(!showMealInput)}
              className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-xs rounded-xl flex items-center gap-1.5 transition-all font-bold"
            >
              <Plus size={14} />
              Log Food
            </button>
          </div>

          <div className="flex items-end gap-4 mb-3">
            <div>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                {healthData.totalCalories}
              </p>
              <p className="text-sm text-gray-400">of {calorieGoal} cal goal</p>
            </div>
            <div className="flex-1 mb-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{Math.round(calorieProgress)}%</span>
                <span>{calorieGoal - healthData.totalCalories} cal left</span>
              </div>
              <div className="h-3 bg-black/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-pink-500 to-orange-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Meal Input */}
          {showMealInput && (
            <div className="bg-black/30 rounded-xl p-3 space-y-2 animate-fadeIn">
              <div className="relative">
                <input
                  type="text"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMeal()}
                  placeholder="Type food (e.g., 2 rotis, samosa, chicken biryani)"
                  className="w-full px-3 py-2.5 bg-white/5 border border-pink-500/30 rounded-xl text-white text-sm focus:border-pink-500 focus:outline-none"
                  autoFocus
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-pink-500/30 rounded-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFoodInput(suggestion);
                          setSuggestions([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-pink-500/20 transition-colors text-white"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => addMeal()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 rounded-xl text-sm font-bold transition-all"
                >
                  Add Meal
                </button>
                <button
                  onClick={() => {
                    setShowMealInput(false);
                    setFoodInput('');
                    setSuggestions([]);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Today's Meals */}
          {healthData.meals.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
              {healthData.meals.map((meal, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-pink-500/10 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{meal.meal}</p>
                    <p className="text-xs text-gray-400">
                      {meal.time} • {meal.confidence === 'high' ? '✓' : meal.confidence === 'medium' ? '~' : '?'} confidence
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-pink-400">{meal.calories} cal</p>
                    <button
                      onClick={() => removeMeal(i)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    >
                      <X size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={18} className="text-pink-400" />
            <span className="text-xs text-gray-400">Exams</span>
          </div>
          <p className="text-3xl font-black text-pink-400">{exams.filter(e => !e.completed).length}</p>
          <p className="text-xs text-gray-500 mt-1">upcoming</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-purple-400" />
            <span className="text-xs text-gray-400">Forms</span>
          </div>
          <p className="text-3xl font-black text-purple-400">{pendingForms.length}</p>
          <p className="text-xs text-gray-500 mt-1">pending</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Apple size={18} className="text-blue-400" />
            <span className="text-xs text-gray-400">Meals</span>
          </div>
          <p className="text-3xl font-black text-blue-400">{healthData.meals.length}</p>
          <p className="text-xs text-gray-500 mt-1">logged today</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-400" />
            <span className="text-xs text-gray-400">BMI</span>
          </div>
          <p className="text-3xl font-black text-green-400">{getBMI()}</p>
          <p className="text-xs text-gray-500 mt-1">index</p>
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-pink-400" />
          <h3 className="text-base font-bold text-pink-400">Board Exams</h3>
        </div>
        
        {upcomingExams.length > 0 ? (
          <div className="space-y-2.5">
            {upcomingExams.map((exam, i) => {
              const daysLeft = getDaysUntil(exam.date);
              const isUrgent = daysLeft <= 3;
              const isWarning = daysLeft <= 7 && daysLeft > 3;
              
              return (
                <div key={i} className={`p-3 rounded-xl border transition-all ${
                  isUrgent ? 'bg-red-500/10 border-red-500/30' :
                  isWarning ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-white">{exam.subject}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-black ${isUrgent ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-pink-400'}`}>
                        {daysLeft}
                      </p>
                      <p className="text-xs text-gray-400">days left</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleExamComplete(exams.indexOf(exam))}
                      className="flex-1 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-all"
                    >
                      ✓ Mark Complete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Award size={32} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-400">All exams completed! 🎉</p>
          </div>
        )}
      </div>

      {/* Health Stats */}
      {(healthData.weight > 0 || healthData.height > 0) && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-green-400" />
            <h3 className="text-base font-bold text-green-400">Health Stats</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Weight</p>
              <p className="text-2xl font-black text-white">{healthData.weight}<span className="text-sm text-gray-400">kg</span></p>
            </div>
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-gray-400 mb-1">Height</p>
              <p className="text-2xl font-black text-white">{healthData.height}<span className="text-sm text-gray-400">cm</span></p>
            </div>
          </div>

          {healthData.weight > 0 && healthData.height > 0 && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Your BMI</p>
                  <p className="text-3xl font-black text-green-400">{getBMI()}</p>
                </div>
                <Zap size={24} className="text-green-400" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {parseFloat(getBMI()) < 18.5 ? 'Underweight' : 
                 parseFloat(getBMI()) < 25 ? 'Normal range' : 
                 parseFloat(getBMI()) < 30 ? 'Overweight' : 'Obese'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Form Deadlines */}
      {pendingForms.length > 0 && (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={18} className="text-purple-400" />
            <h3 className="text-base font-bold text-purple-400">Form Deadlines</h3>
          </div>
          
          <div className="space-y-2.5">
            {forms.map((form, i) => {
              const daysLeft = getDaysUntil(form.deadline);
              const isUrgent = daysLeft <= 3;
              
              return (
                <div key={i} className={`p-3 rounded-xl border ${
                  form.status === 'submitted' ? 'bg-green-500/10 border-green-500/30' :
                  isUrgent ? 'bg-red-500/10 border-red-500/30' :
                  'bg-white/5 border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-white text-sm">{form.name}</p>
                    {form.priority === 'high' && form.status === 'pending' && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded font-bold">HIGH</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    Due: {new Date(form.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {form.status === 'pending' && daysLeft >= 0 && ` • ${daysLeft} days left`}
                  </p>
                  {form.status === 'pending' && (
                    <button
                      onClick={() => updateFormStatus(i, 'submitted')}
                      className="w-full px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-bold transition-all"
                    >
                      ✓ Mark Submitted
                    </button>
                  )}
                  {form.status === 'submitted' && (
                    <div className="flex items-center gap-1 text-green-400 text-xs">
                      <CheckCircle2 size={14} />
                      <span>Submitted</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
}
