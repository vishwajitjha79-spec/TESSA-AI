'use client';

import { useState, useEffect } from 'react';
import { Calendar, Apple, Weight, Ruler, TrendingUp, AlertCircle, CheckCircle, Clock, BookOpen, FileText } from 'lucide-react';

interface ExamSchedule {
  subject: string;
  date: string;
  time?: string;
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
}

interface HealthData {
  weight: number; // kg
  height: number; // cm
  targetWeight?: number;
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
    { name: 'IISER Aptitude Test', deadline: '2026-03-15', status: 'pending', priority: 'high' },
  ]);

  const [healthData, setHealthData] = useState<HealthData>({
    weight: 0,
    height: 0,
    meals: [],
    totalCalories: 0,
    date: new Date().toISOString().split('T')[0],
  });

  const [showMealInput, setShowMealInput] = useState(false);
  const [newMeal, setNewMeal] = useState({ meal: '', calories: '' });

  // Load data from localStorage
  useEffect(() => {
    const savedExams = localStorage.getItem('tessa-exams');
    const savedForms = localStorage.getItem('tessa-forms');
    const savedHealth = localStorage.getItem('tessa-health');

    if (savedExams) setExams(JSON.parse(savedExams));
    if (savedForms) setForms(JSON.parse(savedForms));
    if (savedHealth) setHealthData(JSON.parse(savedHealth));
  }, []);

  // Save data to localStorage
  const saveData = () => {
    localStorage.setItem('tessa-exams', JSON.stringify(exams));
    localStorage.setItem('tessa-forms', JSON.stringify(forms));
    localStorage.setItem('tessa-health', JSON.stringify(healthData));
  };

  useEffect(() => {
    saveData();
  }, [exams, forms, healthData]);

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

  const addMeal = () => {
    if (!newMeal.meal || !newMeal.calories) return;

    const meal: MealEntry = {
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      meal: newMeal.meal,
      calories: parseInt(newMeal.calories),
    };

    setHealthData(prev => ({
      ...prev,
      meals: [...prev.meals, meal],
      totalCalories: prev.totalCalories + meal.calories,
    }));

    setNewMeal({ meal: '', calories: '' });
    setShowMealInput(false);
  };

  const updateHealth = (field: 'weight' | 'height' | 'targetWeight', value: number) => {
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

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-pink-400 mb-2">💝 Personal Dashboard</h2>
        <p className="text-sm text-gray-400">Your life, organized by me 😊</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-pink-400" />
            <span className="text-sm text-gray-400">Exams Left</span>
          </div>
          <p className="text-3xl font-bold text-pink-400">{exams.filter(e => !e.completed).length}</p>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={20} className="text-purple-400" />
            <span className="text-sm text-gray-400">Forms Due</span>
          </div>
          <p className="text-3xl font-bold text-purple-400">{pendingForms.length}</p>
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="bg-white/5 rounded-lg p-4 border border-pink-500/20">
        <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
          <Calendar size={20} />
          Board Exams Schedule
        </h3>
        
        {upcomingExams.length > 0 ? (
          <div className="space-y-3">
            {upcomingExams.map((exam, i) => {
              const daysLeft = getDaysUntil(exam.date);
              return (
                <div
                  key={i}
                  className={`p-3 rounded-lg border transition-all ${
                    exam.completed
                      ? 'bg-green-500/10 border-green-500/30'
                      : daysLeft <= 3
                      ? 'bg-red-500/10 border-red-500/30'
                      : daysLeft <= 7
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-pink-500/10 border-pink-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className={`font-bold ${exam.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                        {exam.subject}
                      </p>
                      <p className="text-sm text-gray-400">
                        {new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {!exam.completed && (
                        <p className={`text-xs mt-1 ${daysLeft <= 3 ? 'text-red-400' : 'text-pink-400'}`}>
                          {daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow!' : `${daysLeft} days left`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleExamComplete(i)}
                      className={`p-2 rounded ${
                        exam.completed ? 'bg-green-500/20' : 'bg-pink-500/20 hover:bg-pink-500/30'
                      }`}
                    >
                      {exam.completed ? <CheckCircle size={20} className="text-green-400" /> : <Clock size={20} className="text-pink-400" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-4">All exams completed! 🎉</p>
        )}

        {exams.filter(e => !e.completed).length > 3 && (
          <p className="text-xs text-gray-500 mt-3 text-center">+ {exams.filter(e => !e.completed).length - 3} more exams</p>
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
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  form.status === 'submitted'
                    ? 'bg-green-500/10 border-green-500/30'
                    : form.status === 'missed'
                    ? 'bg-gray-500/10 border-gray-500/30'
                    : daysLeft <= 3
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-purple-500/10 border-purple-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-white">{form.name}</p>
                  {form.priority === 'high' && form.status === 'pending' && (
                    <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">HIGH</span>
                  )}
                </div>
                <p className="text-sm text-gray-400 mb-2">
                  Due: {new Date(form.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {form.status === 'pending' && daysLeft >= 0 && (
                  <p className={`text-xs mb-2 ${daysLeft <= 3 ? 'text-red-400' : 'text-purple-400'}`}>
                    {daysLeft === 0 ? 'Due Today!' : `${daysLeft} days left`}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => updateFormStatus(i, 'submitted')}
                    disabled={form.status === 'submitted'}
                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded disabled:opacity-50"
                  >
                    Submitted
                  </button>
                  <button
                    onClick={() => updateFormStatus(i, 'pending')}
                    disabled={form.status === 'pending'}
                    className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs rounded disabled:opacity-50"
                  >
                    Pending
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health Tracking */}
      <div className="bg-white/5 rounded-lg p-4 border border-pink-500/20">
        <h3 className="text-lg font-bold text-pink-400 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Health & Fitness
        </h3>

        {/* Body Stats */}
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

        {/* BMI Display */}
        {healthData.weight > 0 && healthData.height > 0 && (
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-400 mb-1">Your BMI</p>
            <p className="text-2xl font-bold text-pink-400">{getBMI()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {parseFloat(getBMI()) < 18.5 ? 'Underweight' : parseFloat(getBMI()) < 25 ? 'Normal' : parseFloat(getBMI()) < 30 ? 'Overweight' : 'Obese'}
            </p>
          </div>
        )}

        {/* Simple Body Outline */}
        {healthData.weight > 0 && healthData.height > 0 && (
          <div className="bg-black/30 rounded-lg p-4 mb-4 flex justify-center">
            <svg width="100" height="200" viewBox="0 0 100 200" className="text-pink-400">
              {/* Head */}
              <circle cx="50" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
              {/* Body */}
              <line x1="50" y1="35" x2="50" y2="100" stroke="currentColor" strokeWidth="2" />
              {/* Arms */}
              <line x1="50" y1="50" x2="25" y2="75" stroke="currentColor" strokeWidth="2" />
              <line x1="50" y1="50" x2="75" y2="75" stroke="currentColor" strokeWidth="2" />
              {/* Legs */}
              <line x1="50" y1="100" x2="35" y2="150" stroke="currentColor" strokeWidth="2" />
              <line x1="50" y1="100" x2="65" y2="150" stroke="currentColor" strokeWidth="2" />
              {/* Labels */}
              <text x="50" y="170" textAnchor="middle" fill="currentColor" fontSize="10">
                {healthData.weight}kg
              </text>
              <text x="50" y="185" textAnchor="middle" fill="currentColor" fontSize="10">
                {healthData.height}cm
              </text>
            </svg>
          </div>
        )}

        {/* Meal Tracking */}
        <div className="border-t border-pink-500/20 pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-pink-400">Today's Meals</p>
            <button
              onClick={() => setShowMealInput(!showMealInput)}
              className="px-3 py-1 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 text-xs rounded"
            >
              + Add Meal
            </button>
          </div>

          {showMealInput && (
            <div className="bg-black/30 rounded-lg p-3 mb-3 space-y-2">
              <input
                type="text"
                value={newMeal.meal}
                onChange={(e) => setNewMeal(prev => ({ ...prev, meal: e.target.value }))}
                placeholder="What did you eat?"
                className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white text-sm"
              />
              <input
                type="number"
                value={newMeal.calories}
                onChange={(e) => setNewMeal(prev => ({ ...prev, calories: e.target.value }))}
                placeholder="Calories"
                className="w-full px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white text-sm"
              />
              <button
                onClick={addMeal}
                className="w-full px-3 py-2 bg-pink-500 hover:bg-pink-600 rounded text-sm font-bold"
              >
                Add
              </button>
            </div>
          )}

          {healthData.meals.length > 0 ? (
            <div className="space-y-2">
              {healthData.meals.map((meal, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-pink-500/10 rounded">
                  <div>
                    <p className="text-sm text-white">{meal.meal}</p>
                    <p className="text-xs text-gray-400">{meal.time}</p>
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

      {/* Motivational Message */}
      <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-4 text-center">
        <p className="text-sm text-pink-300">
          💝 You're doing amazing, Ankit! Keep pushing forward!
        </p>
      </div>
    </div>
  );
}
