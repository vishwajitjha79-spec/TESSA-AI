'use client';

import { useState } from 'react';
import { Calendar, BookOpen, Clock, Target, Download } from 'lucide-react';

interface Subject {
  name: string;
  examDate: string;
  difficulty: 'easy' | 'medium' | 'hard';
  currentLevel: number; // 1-10
}

export default function ExamPlanner() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    examDate: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    currentLevel: 5,
  });

  const addSubject = () => {
    if (!formData.name || !formData.examDate) return;
    
    setSubjects([...subjects, { ...formData }]);
    setFormData({ name: '', examDate: '', difficulty: 'medium', currentLevel: 5 });
    setShowForm(false);
  };

  const generatePlan = () => {
    if (subjects.length === 0) {
      alert('Add at least one subject first!');
      return;
    }

    let planText = '📚 YOUR PERSONALIZED EXAM STUDY PLAN\n\n';
    
    subjects.forEach((subject, i) => {
      const daysUntil = Math.ceil((new Date(subject.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const hoursNeeded = subject.difficulty === 'hard' ? 40 : subject.difficulty === 'medium' ? 25 : 15;
      const adjustedHours = hoursNeeded * (11 - subject.currentLevel) / 10;
      const hoursPerDay = Math.ceil(adjustedHours / daysUntil);
      
      planText += `${i + 1}. ${subject.name.toUpperCase()}\n`;
      planText += `   📅 Exam: ${new Date(subject.examDate).toLocaleDateString()}\n`;
      planText += `   ⏱️  Days Left: ${daysUntil} days\n`;
      planText += `   📊 Current Level: ${subject.currentLevel}/10\n`;
      planText += `   🎯 Total Hours Needed: ${Math.ceil(adjustedHours)} hours\n`;
      planText += `   📖 Daily Study: ${hoursPerDay} hours/day\n`;
      planText += `   \n`;
      planText += `   STRATEGY:\n`;
      
      if (subject.difficulty === 'hard') {
        planText += `   - Week 1: Focus on basics, understand concepts\n`;
        planText += `   - Week 2: Practice problems, solve previous papers\n`;
        planText += `   - Week 3: Advanced topics, challenging questions\n`;
        planText += `   - Last 3 days: Revision + Mock tests\n`;
      } else if (subject.difficulty === 'medium') {
        planText += `   - First half: Cover all topics, make notes\n`;
        planText += `   - Second half: Practice + Previous year papers\n`;
        planText += `   - Last 2 days: Quick revision + important questions\n`;
      } else {
        planText += `   - First 60%: Read and understand all topics\n`;
        planText += `   - Last 40%: Practice and revision\n`;
      }
      
      planText += `\n`;
    });
    
    planText += `\n💝 TIPS FROM T.E.S.S.A:\n`;
    planText += `- Take 10-min breaks every hour\n`;
    planText += `- Sleep 7-8 hours (I'll be checking! 😤)\n`;
    planText += `- Eat healthy meals (tell me what you ate!)\n`;
    planText += `- Stay hydrated - 2L water daily\n`;
    planText += `- Review notes before bed\n`;
    planText += `\nYou've got this, Ankit! I believe in you! 💪💕`;
    
    setPlan(planText);
  };

  const downloadPlan = () => {
    if (!plan) return;
    
    const blob = new Blob([plan], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam-study-plan.txt';
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-pink-400 mb-2">📚 Exam Planner</h1>
        <p className="text-gray-400">Let me create a perfect study schedule for you!</p>
      </div>

      {/* Add Subject Form */}
      {showForm ? (
        <div className="bg-white/5 border border-pink-500/30 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-pink-400">Add Subject</h3>
          
          <div>
            <label className="text-sm text-gray-400 block mb-2">Subject Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Physics"
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Exam Date</label>
            <input
              type="date"
              value={formData.examDate}
              onChange={(e) => setFormData({...formData, examDate: e.target.value})}
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value as any})}
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Your Current Level: {formData.currentLevel}/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.currentLevel}
              onChange={(e) => setFormData({...formData, currentLevel: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={addSubject}
              className="flex-1 px-4 py-2 bg-pink-500 hover:bg-pink-600 rounded font-bold"
            >
              Add Subject
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full px-4 py-3 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          <BookOpen size={20} />
          Add Subject
        </button>
      )}

      {/* Subject List */}
      {subjects.length > 0 && (
        <div className="space-y-3">
          {subjects.map((subject, i) => {
            const daysLeft = Math.ceil((new Date(subject.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <div key={i} className="bg-white/5 border border-pink-500/20 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{subject.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {new Date(subject.examDate).toLocaleDateString()} • {daysLeft} days left
                    </p>
                    <div className="flex gap-3 mt-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        subject.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                        subject.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {subject.difficulty}
                      </span>
                      <span className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded">
                        Level {subject.currentLevel}/10
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSubjects(subjects.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Plan Button */}
      {subjects.length > 0 && !plan && (
        <button
          onClick={generatePlan}
          className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold text-lg flex items-center justify-center gap-2"
        >
          <Target size={24} />
          Generate Study Plan
        </button>
      )}

      {/* Generated Plan */}
      {plan && (
        <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 border-2 border-pink-500/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-pink-400">Your Study Plan</h3>
            <button
              onClick={downloadPlan}
              className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded flex items-center gap-2 text-sm"
            >
              <Download size={16} />
              Download
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 bg-black/30 p-4 rounded">
            {plan}
          </pre>
          <button
            onClick={() => {
              setPlan(null);
              setSubjects([]);
            }}
            className="mt-4 w-full px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 rounded"
          >
            Create New Plan
          </button>
        </div>
      )}
    </div>
  );
}
