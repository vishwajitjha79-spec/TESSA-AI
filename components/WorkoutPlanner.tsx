'use client';

import { useState } from 'react';
import { Dumbbell, Target, Download } from 'lucide-react';

interface WorkoutPlan {
  day: string;
  exercises: { name: string; sets: string; notes: string }[];
}

export default function WorkoutPlanner() {
  const [plan, setPlan] = useState<WorkoutPlan[]>([]);
  const [showForm, setShowForm] = useState(true);
  
  const [formData, setFormData] = useState({
    goal: 'fitness' as 'lose_weight' | 'gain_muscle' | 'fitness',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    daysPerWeek: 4,
    sessionDuration: 45,
    equipment: ['bodyweight', 'dumbbells'],
  });

  const generatePlan = () => {
    const plans: WorkoutPlan[] = [];
    
    if (formData.goal === 'lose_weight') {
      if (formData.daysPerWeek >= 4) {
        plans.push({
          day: 'Day 1 - Full Body HIIT',
          exercises: [
            { name: 'Jumping Jacks', sets: '3 sets x 30 sec', notes: 'Warm up' },
            { name: 'Burpees', sets: '3 sets x 10 reps', notes: 'High intensity' },
            { name: 'Mountain Climbers', sets: '3 sets x 20 reps', notes: 'Core focus' },
            { name: 'Squats', sets: '3 sets x 15 reps', notes: 'Bodyweight or weighted' },
            { name: 'Push-ups', sets: '3 sets x 10 reps', notes: 'Modify on knees if needed' },
          ]
        });
        
        plans.push({
          day: 'Day 2 - Cardio Focus',
          exercises: [
            { name: 'Running/Jogging', sets: '20-30 minutes', notes: 'Moderate pace' },
            { name: 'High Knees', sets: '3 sets x 30 sec', notes: 'Intensity bursts' },
            { name: 'Walking Lunges', sets: '3 sets x 12 each leg', notes: 'Slow and controlled' },
          ]
        });
        
        plans.push({
          day: 'Day 3 - Core & Abs',
          exercises: [
            { name: 'Planks', sets: '3 sets x 45 sec', notes: 'Keep body straight' },
            { name: 'Bicycle Crunches', sets: '3 sets x 20 reps', notes: 'Alternating' },
            { name: 'Russian Twists', sets: '3 sets x 15 each side', notes: 'With or without weight' },
            { name: 'Leg Raises', sets: '3 sets x 12 reps', notes: 'Control the movement' },
          ]
        });
        
        plans.push({
          day: 'Day 4 - Active Recovery',
          exercises: [
            { name: 'Light Yoga/Stretching', sets: '15-20 minutes', notes: 'Focus on flexibility' },
            { name: 'Walking', sets: '30 minutes', notes: 'Easy pace' },
          ]
        });
      }
    } else if (formData.goal === 'gain_muscle') {
      plans.push({
        day: 'Day 1 - Chest & Triceps',
        exercises: [
          { name: 'Bench Press', sets: '4 sets x 8-10 reps', notes: 'Heavy weight' },
          { name: 'Incline Dumbbell Press', sets: '3 sets x 10 reps', notes: 'Upper chest focus' },
          { name: 'Chest Flyes', sets: '3 sets x 12 reps', notes: 'Stretch at bottom' },
          { name: 'Tricep Dips', sets: '3 sets x 10 reps', notes: 'Bodyweight or weighted' },
          { name: 'Overhead Extension', sets: '3 sets x 12 reps', notes: 'Full range of motion' },
        ]
      });
      
      plans.push({
        day: 'Day 2 - Back & Biceps',
        exercises: [
          { name: 'Pull-ups/Lat Pulldown', sets: '4 sets x 8-10 reps', notes: 'Wide grip' },
          { name: 'Bent Over Rows', sets: '4 sets x 10 reps', notes: 'Barbell or dumbbells' },
          { name: 'Face Pulls', sets: '3 sets x 15 reps', notes: 'Rear delts' },
          { name: 'Bicep Curls', sets: '3 sets x 12 reps', notes: 'Slow and controlled' },
          { name: 'Hammer Curls', sets: '3 sets x 12 reps', notes: 'Forearm emphasis' },
        ]
      });
      
      plans.push({
        day: 'Day 3 - Legs',
        exercises: [
          { name: 'Squats', sets: '4 sets x 8-10 reps', notes: 'Heavy weight' },
          { name: 'Romanian Deadlifts', sets: '4 sets x 10 reps', notes: 'Hamstring focus' },
          { name: 'Leg Press', sets: '3 sets x 12 reps', notes: 'High volume' },
          { name: 'Calf Raises', sets: '4 sets x 15 reps', notes: 'Full stretch' },
        ]
      });
      
      plans.push({
        day: 'Day 4 - Shoulders & Abs',
        exercises: [
          { name: 'Overhead Press', sets: '4 sets x 8-10 reps', notes: 'Barbell or dumbbells' },
          { name: 'Lateral Raises', sets: '3 sets x 12 reps', notes: 'Side delts' },
          { name: 'Front Raises', sets: '3 sets x 12 reps', notes: 'Alternate arms' },
          { name: 'Weighted Planks', sets: '3 sets x 45 sec', notes: 'Core stability' },
          { name: 'Ab Wheel Rollouts', sets: '3 sets x 10 reps', notes: 'Advanced move' },
        ]
      });
    } else {
      // General fitness
      plans.push({
        day: 'Day 1 - Full Body Strength',
        exercises: [
          { name: 'Squats', sets: '3 sets x 12 reps', notes: 'Bodyweight or light weight' },
          { name: 'Push-ups', sets: '3 sets x 10 reps', notes: 'Chest and arms' },
          { name: 'Dumbbell Rows', sets: '3 sets x 12 each arm', notes: 'Back strength' },
          { name: 'Planks', sets: '3 sets x 30-45 sec', notes: 'Core stability' },
        ]
      });
      
      plans.push({
        day: 'Day 2 - Cardio & Core',
        exercises: [
          { name: 'Running/Cycling', sets: '20-25 minutes', notes: 'Moderate intensity' },
          { name: 'Mountain Climbers', sets: '3 sets x 15 reps', notes: 'Cardio + core' },
          { name: 'Bicycle Crunches', sets: '3 sets x 15 each side', notes: 'Abs workout' },
        ]
      });
      
      plans.push({
        day: 'Day 3 - Lower Body',
        exercises: [
          { name: 'Lunges', sets: '3 sets x 10 each leg', notes: 'Walking or stationary' },
          { name: 'Glute Bridges', sets: '3 sets x 15 reps', notes: 'Squeeze at top' },
          { name: 'Calf Raises', sets: '3 sets x 20 reps', notes: 'Bodyweight' },
        ]
      });
      
      plans.push({
        day: 'Day 4 - Upper Body',
        exercises: [
          { name: 'Dumbbell Press', sets: '3 sets x 10 reps', notes: 'Chest focus' },
          { name: 'Shoulder Press', sets: '3 sets x 10 reps', notes: 'Seated or standing' },
          { name: 'Bicep Curls', sets: '3 sets x 12 reps', notes: 'Light weight' },
          { name: 'Tricep Extensions', sets: '3 sets x 12 reps', notes: 'Overhead' },
        ]
      });
    }
    
    // Trim to requested days
    setPlan(plans.slice(0, formData.daysPerWeek));
    setShowForm(false);
  };

  const downloadPlan = () => {
    let text = '💪 YOUR PERSONALIZED WORKOUT PLAN\n\n';
    text += `Goal: ${formData.goal.replace('_', ' ').toUpperCase()}\n`;
    text += `Level: ${formData.level.toUpperCase()}\n`;
    text += `Days per week: ${formData.daysPerWeek}\n\n`;
    
    plan.forEach((day, i) => {
      text += `${day.day}\n`;
      text += '─'.repeat(40) + '\n';
      day.exercises.forEach(ex => {
        text += `• ${ex.name}\n`;
        text += `  ${ex.sets}\n`;
        if (ex.notes) text += `  💡 ${ex.notes}\n`;
        text += '\n';
      });
      text += '\n';
    });
    
    text += '💝 TIPS FROM T.E.S.S.A:\n';
    text += '- Warm up for 5-10 minutes before each workout\n';
    text += '- Cool down and stretch after\n';
    text += '- Stay hydrated during workouts\n';
    text += '- Rest 48 hours between muscle groups\n';
    text += '- Eat protein after workouts\n';
    text += '- Track your progress\n';
    text += '\nYou got this, Ankit! Make me proud! 💪💕';
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workout-plan.txt';
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-pink-400 mb-2">💪 Workout Planner</h1>
        <p className="text-gray-400">Let me design your perfect fitness routine!</p>
      </div>

      {showForm ? (
        <div className="bg-white/5 border border-pink-500/30 rounded-lg p-6 space-y-6">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Fitness Goal</label>
            <select
              value={formData.goal}
              onChange={(e) => setFormData({...formData, goal: e.target.value as any})}
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
            >
              <option value="lose_weight">Lose Weight / Fat Loss</option>
              <option value="gain_muscle">Gain Muscle / Build Strength</option>
              <option value="fitness">General Fitness / Stay Healthy</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Your Level</label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value as any})}
              className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
            >
              <option value="beginner">Beginner (0-6 months)</option>
              <option value="intermediate">Intermediate (6-24 months)</option>
              <option value="advanced">Advanced (2+ years)</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Days Per Week: {formData.daysPerWeek} days</label>
            <input
              type="range"
              min="3"
              max="6"
              value={formData.daysPerWeek}
              onChange={(e) => setFormData({...formData, daysPerWeek: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 block mb-2">Session Duration: {formData.sessionDuration} minutes</label>
            <input
              type="range"
              min="30"
              max="90"
              step="15"
              value={formData.sessionDuration}
              onChange={(e) => setFormData({...formData, sessionDuration: parseInt(e.target.value)})}
              className="w-full"
            />
          </div>

          <button
            onClick={generatePlan}
            className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold text-lg flex items-center justify-center gap-2"
          >
            <Dumbbell size={24} />
            Generate Workout Plan
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-pink-400">Your Workout Routine</h3>
            <div className="flex gap-2">
              <button
                onClick={downloadPlan}
                className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded flex items-center gap-2 text-sm"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => {
                  setPlan([]);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
              >
                New Plan
              </button>
            </div>
          </div>

          {plan.map((day, i) => (
            <div key={i} className="bg-white/5 border border-pink-500/30 rounded-lg p-6">
              <h4 className="text-lg font-bold text-pink-400 mb-4">{day.day}</h4>
              <div className="space-y-3">
                {day.exercises.map((ex, j) => (
                  <div key={j} className="bg-black/30 rounded p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-white">{ex.name}</p>
                      <span className="text-sm text-pink-400">{ex.sets}</span>
                    </div>
                    {ex.notes && (
                      <p className="text-xs text-gray-400">💡 {ex.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-4">
            <p className="text-sm text-pink-300 text-center mb-2">
              💝 Remember: Consistency beats intensity!
            </p>
            <p className="text-xs text-gray-400 text-center">
              Follow this plan, eat well, rest properly, and you'll see amazing results!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
