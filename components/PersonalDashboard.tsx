'use client';

import { useState, useEffect } from 'react';
import { Calendar, Apple, TrendingUp, AlertCircle, CheckCircle, Clock, BookOpen, FileText, Plus, X } from 'lucide-react';
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
    { subject: 'Physics', date: '2026-02-20', completed: false },
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

  useEffect(() => {
    const savedExams = localStorage.getItem('tessa-exams');
    const savedForms = localStorage.getItem('tessa-forms');
    const savedHealth = localStorage.getItem('tessa-health');

    if (savedExams) setExams(JSON.parse(savedExams));
    if (savedForms) setForms(JSON.parse(savedForms));
    if (savedHealth) setHealthData(JSON.parse(savedHealth));
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

  const getProgressBar = (daysLeft: number, totalDays: number = 30) => {
    const progress = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));
    return (
      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
        <div 
          className={`h-2 rounded-full transition-all ${
            daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  const upcomingExams = exams.filter(e => !e.completed && getDaysUntil(e.date) >= 0).slice(0, 3);
  const pendingForms = forms.filter(f => f.status === 'pending');

  return (
    <div className="space-y-6 pb-20">
      
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-pink-400 mb-2">💝 Personal Dashboard</h2>
        <p className="text-sm text-gray-400">Your life, organized by me 😊</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-pink-400" />
            <span className="text-sm text-gray-400">Exams</span>
          </div>
          <p className="text-3xl font-bold text-pink-400">{exams.filter(e => !e.completed).length}</p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} className="text-purple-400" />
            <span className="text-sm text-gray-400">Forms</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">{pendingForms.length}</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Apple size={20} className="text-blue-400" />
            <span className="text-sm text-gray-400">Calories</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{healthData.totalCalories}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={20} className="text-green-400" />
            <span className="text-sm text-gray-400">BMI</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{getBMI()}</p>
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="bg-white/5 rounded-lg p-4 border border-pink-500/20">
        <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Board Exams Countdown
        </h3>
        
        {upcomingExams.length > 0 ? (
          <div className="space-y-3">
            {upcomingExams.map((exam, i) => {
              const daysLeft = getDaysUntil(exam.date);
              return (
                <div key={i} className={`p-3 rounded-lg border transition-all ${
                  daysLeft <= 3 ? 'bg-red-500/10 border-red-500/30' :
                  daysLeft <= 7 ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-pink-500/10 border-pink-500/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-white">{exam.subject}</p>
                      <p className="text-sm text-gray-400">
                        {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${daysLeft <= 3 ? 'text-red-400' : 'text-pink-400'}`}>
                        {daysLeft}
                      </p>
                      <p className="text-xs text-gray-400">days left</p>
                    </div>
                  </div>
                  {getProgressBar(daysLeft, 30)}
                  <button
                    onClick={() => toggleExamComplete(exams.indexOf(exam))}
                    className="mt-2 w-full py-1 bg-pink-500/20 hover:bg-pink-500/30 rounded text-xs"
                  >
                    Mark Complete
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-4">All exams completed! 🎉</p>
        )}
      </div>

      {/* Form Deadlines */}
      <div className="bg-white/5 rounded-lg p-4 border border-purple-500/20">
        <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
          <FileText size={20} />
          Form Deadlines
        </h3>
        
        <div className="space-y-3">
          {forms.map((form, i) => {
            const daysLeft = getDaysUntil(form.deadline);
            return (
              <div key={i} className={`p-3 rounded-lg border ${
                form.status === 'submitted' ? 'bg-green-500/10 border-green-500/30' :
                daysLeft <= 3 ? 'bg-red-500/10 border-red-500/30' :
                'bg-purple-500/10 border-purple-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-white">{form.name}</p>
                  {form.priority === 'high' && form.status === 'pending' && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">HIGH</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  Due: {new Date(form.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {form.status === 'pending' && daysLeft >= 0 && ` • ${daysLeft} days left`}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFormStatus(i, 'submitted')}
                    className={`flex-1 px-3 py-1 rounded text-xs ${
                      form.status === 'submitted' 
                        ? 'bg-green-500/30 text-green-400' 
                        : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                    }`}
                  >
                    {form.status === 'submitted' ? '✓ Submitted' : 'Mark Submitted'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health & Fitness */}
      <div className="bg-white/5 rounded-lg p-4 border border-pink-500/20">
        <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Health & Fitness
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Weight (kg)</label>
            <input
              type="number"
              value={healthData.weight || ''}
              onChange={(e) => updateHealth('weight', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Height (cm)</label>
            <input
              type="number"
              value={healthData.height || ''}
              onChange={(e) => updateHealth('height', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
              placeholder="0"
            />
          </div>
        </div>

        {healthData.weight > 0 && healthData.height > 0 && (
          <>
            <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-400 mb-1">Your BMI</p>
              <p className="text-2xl font-bold text-pink-400">{getBMI()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {parseFloat(getBMI()) < 18.5 ? 'Underweight' : parseFloat(getBMI()) < 25 ? 'Normal' : parseFloat(getBMI()) < 30 ? 'Overweight' : 'Obese'}
              </p>
            </div>

            <div className="bg-black/30 rounded-lg p-4 mb-4 flex justify-center">
              <svg width="100" height="200" viewBox="0 0 100 200" className="text-pink-400">
                <circle cx="50" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="35" x2="50" y2="100" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="50" x2="25" y2="75" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="50" x2="75" y2="75" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="100" x2="35" y2="150" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="100" x2="65" y2="150" stroke="currentColor" strokeWidth="2" />
                <text x="50" y="170" textAnchor="middle" fill="currentColor" fontSize="10">{healthData.weight}kg</text>
                <text x="50" y="185" textAnchor="middle" fill="currentColor" fontSize="10">{healthData.height}cm</text>
              </svg>
            </div>
          </>
        )}

        {/* Smart Meal Logger */}
        <div className="border-t border-pink-500/20 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-pink-400">Today's Meals 🍽️</p>
            <button
              onClick={() => setShowMealInput(!showMealInput)}
              className="px-3 py-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-xs rounded flex items-center gap-1"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {showMealInput && (
            <div className="bg-black/30 rounded-lg p-3 mb-3 space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={foodInput}
                  onChange={(e) => setFoodInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addMeal()}
                  placeholder="Type food (e.g., 2 rotis, biryani, samosa)"
                  className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white text-sm"
                  autoFocus
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-pink-500/30 rounded-lg overflow-hidden z-10">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setFoodInput(suggestion);
                          setSuggestions([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-pink-500/20 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">
                💡 Just type the food name, I'll calculate calories automatically!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => addMeal()}
                  className="flex-1 px-3 py-2 bg-pink-500 hover:bg-pink-600 rounded text-sm font-bold"
                >
                  Add Meal
                </button>
                <button
                  onClick={() => {
                    setShowMealInput(false);
                    setFoodInput('');
                    setSuggestions([]);
                  }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          {healthData.meals.length > 0 ? (
            <div className="space-y-2">
              {healthData.meals.map((meal, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-pink-500/10 rounded border border-pink-500/20">
                  <div className="flex-1">
                    <p className="text-sm text-white">{meal.meal}</p>
                    <p className="text-xs text-gray-400">
                      {meal.time} • {meal.confidence === 'high' ? '✓' : meal.confidence === 'medium' ? '~' : '?'} confidence
                    </p>
                  </div>
                  <p className="text-sm font-bold text-pink-400">{meal.calories} cal</p>
                </div>
              ))}
              <div className="border-t border-pink-500/20 pt-2 mt-2">
                <p className="text-right text-sm">
                  <span className="text-gray-400">Total: </span>
                  <span className="font-bold text-pink-400">{healthData.totalCalories} cal</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No meals logged today</p>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-4 text-center">
        <p className="text-sm text-pink-300">
          💝 You're doing amazing, Ankit! Keep pushing forward!
        </p>
      </div>
    </div>
  );
}
