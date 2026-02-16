'use client';

import { useState } from 'react';
import { Clock, Coffee, Moon, Sun, Download } from 'lucide-react';

interface TimeBlock {
  time: string;
  activity: string;
  duration: number;
}

export default function DayPlanner() {
  const [schedule, setSchedule] = useState<TimeBlock[]>([]);
  const [showForm, setShowForm] = useState(true);
  
  const [formData, setFormData] = useState({
    wakeTime: '06:00',
    sleepTime: '23:00',
    studyHours: 6,
    breakMinutes: 15,
    mealTimes: ['08:00', '13:00', '20:00'],
    fixedCommitments: [] as { time: string; activity: string; duration: number }[],
  });

  const [newCommitment, setNewCommitment] = useState({ time: '', activity: '', duration: 30 });

  const addCommitment = () => {
    if (newCommitment.activity && newCommitment.time) {
      setFormData({
        ...formData,
        fixedCommitments: [...formData.fixedCommitments, { ...newCommitment }]
      });
      setNewCommitment({ time: '', activity: '', duration: 30 });
    }
  };

  const generateSchedule = () => {
    const blocks: TimeBlock[] = [];
    const wakeHour = parseInt(formData.wakeTime.split(':')[0]);
    const wakeMin = parseInt(formData.wakeTime.split(':')[1]);
    const sleepHour = parseInt(formData.sleepTime.split(':')[0]);
    
    let currentTime = wakeHour * 60 + wakeMin;
    const endTime = sleepHour * 60;
    
    // Morning routine
    blocks.push({
      time: formatTime(currentTime),
      activity: '🌅 Wake up & Morning routine',
      duration: 30
    });
    currentTime += 30;
    
    // Breakfast
    blocks.push({
      time: formatTime(currentTime),
      activity: '🍳 Breakfast',
      duration: 30
    });
    currentTime += 30;
    
    // Calculate study blocks
    const studyMinutes = formData.studyHours * 60;
    const studyBlockSize = 90; // 1.5 hours
    const numberOfStudyBlocks = Math.ceil(studyMinutes / studyBlockSize);
    
    // Add fixed commitments
    const sortedCommitments = [...formData.fixedCommitments].sort((a, b) => {
      const timeA = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const timeB = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      return timeA - timeB;
    });
    
    let studyBlocksAdded = 0;
    
    while (currentTime < endTime - 60) {
      // Check for fixed commitments
      const upcomingCommitment = sortedCommitments.find(c => {
        const commitmentTime = parseInt(c.time.split(':')[0]) * 60 + parseInt(c.time.split(':')[1]);
        return commitmentTime >= currentTime && commitmentTime < currentTime + studyBlockSize;
      });
      
      if (upcomingCommitment) {
        const commitmentTime = parseInt(upcomingCommitment.time.split(':')[0]) * 60 + parseInt(upcomingCommitment.time.split(':')[1]);
        
        // Add study block before commitment if there's time
        if (commitmentTime - currentTime >= 60 && studyBlocksAdded < numberOfStudyBlocks) {
          blocks.push({
            time: formatTime(currentTime),
            activity: `📚 Study Session ${studyBlocksAdded + 1}`,
            duration: Math.min(studyBlockSize, commitmentTime - currentTime)
          });
          currentTime = commitmentTime;
          studyBlocksAdded++;
        } else {
          currentTime = commitmentTime;
        }
        
        // Add commitment
        blocks.push({
          time: formatTime(currentTime),
          activity: upcomingCommitment.activity,
          duration: upcomingCommitment.duration
        });
        currentTime += upcomingCommitment.duration;
        
        // Remove from list
        const index = sortedCommitments.indexOf(upcomingCommitment);
        sortedCommitments.splice(index, 1);
        
      } else if (studyBlocksAdded < numberOfStudyBlocks) {
        // Add study block
        blocks.push({
          time: formatTime(currentTime),
          activity: `📚 Study Session ${studyBlocksAdded + 1}`,
          duration: studyBlockSize
        });
        currentTime += studyBlockSize;
        studyBlocksAdded++;
        
        // Add break after study
        if (currentTime < endTime - 60) {
          blocks.push({
            time: formatTime(currentTime),
            activity: '☕ Break',
            duration: formData.breakMinutes
          });
          currentTime += formData.breakMinutes;
        }
      } else {
        // Free time
        const freeTime = Math.min(60, endTime - currentTime - 60);
        if (freeTime > 0) {
          blocks.push({
            time: formatTime(currentTime),
            activity: '🎮 Free time',
            duration: freeTime
          });
          currentTime += freeTime;
        }
      }
      
      // Check for meal times
      formData.mealTimes.forEach(mealTime => {
        const mealMinutes = parseInt(mealTime.split(':')[0]) * 60 + parseInt(mealTime.split(':')[1]);
        if (Math.abs(mealMinutes - currentTime) < 30 && !blocks.find(b => b.time === formatTime(mealMinutes))) {
          blocks.push({
            time: formatTime(mealMinutes),
            activity: mealMinutes < 600 ? '🍳 Breakfast' : mealMinutes < 840 ? '🍱 Lunch' : '🍽️ Dinner',
            duration: 30
          });
        }
      });
    }
    
    // Evening routine
    blocks.push({
      time: formatTime(currentTime),
      activity: '🌙 Evening routine',
      duration: 30
    });
    currentTime += 30;
    
    blocks.push({
      time: formatTime(currentTime),
      activity: '😴 Sleep',
      duration: 0
    });
    
    // Sort by time
    blocks.sort((a, b) => {
      const timeA = parseInt(a.time.split(':')[0]) * 60 + parseInt(a.time.split(':')[1]);
      const timeB = parseInt(b.time.split(':')[0]) * 60 + parseInt(b.time.split(':')[1]);
      return timeA - timeB;
    });
    
    setSchedule(blocks);
    setShowForm(false);
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const downloadSchedule = () => {
    let text = '📅 YOUR DAILY SCHEDULE\n\n';
    schedule.forEach(block => {
      text += `${block.time} - ${block.activity}`;
      if (block.duration > 0) {
        text += ` (${block.duration} min)`;
      }
      text += '\n';
    });
    text += '\n💝 Made with love by T.E.S.S.A.\n';
    text += 'Stay consistent, Ankit! You got this! 💪';
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'daily-schedule.txt';
    a.click();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-pink-400 mb-2">📅 Day Planner</h1>
        <p className="text-gray-400">Let me organize your perfect day!</p>
      </div>

      {showForm ? (
        <div className="space-y-6">
          <div className="bg-white/5 border border-pink-500/30 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-pink-400">Basic Info</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Wake Up Time</label>
                <input
                  type="time"
                  value={formData.wakeTime}
                  onChange={(e) => setFormData({...formData, wakeTime: e.target.value})}
                  className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-400 block mb-2">Sleep Time</label>
                <input
                  type="time"
                  value={formData.sleepTime}
                  onChange={(e) => setFormData({...formData, sleepTime: e.target.value})}
                  className="w-full px-4 py-2 bg-black/30 border border-pink-500/30 rounded text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Study Hours: {formData.studyHours} hours</label>
              <input
                type="range"
                min="1"
                max="12"
                value={formData.studyHours}
                onChange={(e) => setFormData({...formData, studyHours: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-2">Break Duration: {formData.breakMinutes} minutes</label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={formData.breakMinutes}
                onChange={(e) => setFormData({...formData, breakMinutes: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
          </div>

          <div className="bg-white/5 border border-pink-500/30 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-bold text-pink-400">Fixed Commitments</h3>
            
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="time"
                  value={newCommitment.time}
                  onChange={(e) => setNewCommitment({...newCommitment, time: e.target.value})}
                  placeholder="Time"
                  className="px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white text-sm"
                />
                <input
                  type="text"
                  value={newCommitment.activity}
                  onChange={(e) => setNewCommitment({...newCommitment, activity: e.target.value})}
                  placeholder="Activity"
                  className="px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white text-sm"
                />
                <input
                  type="number"
                  value={newCommitment.duration}
                  onChange={(e) => setNewCommitment({...newCommitment, duration: parseInt(e.target.value)})}
                  placeholder="Minutes"
                  className="px-3 py-2 bg-black/30 border border-pink-500/30 rounded text-white text-sm"
                />
              </div>
              <button
                onClick={addCommitment}
                className="w-full px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded text-sm"
              >
                Add Commitment
              </button>
            </div>

            {formData.fixedCommitments.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-black/30 rounded">
                <span className="text-sm">{c.time} - {c.activity} ({c.duration} min)</span>
                <button
                  onClick={() => setFormData({
                    ...formData,
                    fixedCommitments: formData.fixedCommitments.filter((_, idx) => idx !== i)
                  })}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={generateSchedule}
            className="w-full px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 rounded-lg font-bold text-lg flex items-center justify-center gap-2"
          >
            <Clock size={24} />
            Generate Schedule
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-pink-400">Your Perfect Day</h3>
            <div className="flex gap-2">
              <button
                onClick={downloadSchedule}
                className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500 rounded flex items-center gap-2 text-sm"
              >
                <Download size={16} />
                Download
              </button>
              <button
                onClick={() => {
                  setSchedule([]);
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm"
              >
                New Schedule
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {schedule.map((block, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  block.activity.includes('Study') ? 'bg-pink-500/10 border-pink-500/30' :
                  block.activity.includes('Break') || block.activity.includes('Free') ? 'bg-green-500/10 border-green-500/30' :
                  block.activity.includes('Sleep') ? 'bg-purple-500/10 border-purple-500/30' :
                  'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-pink-400">{block.time}</span>
                    <span className="text-white">{block.activity}</span>
                  </div>
                  {block.duration > 0 && (
                    <span className="text-sm text-gray-400">{block.duration} min</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/30 rounded-lg p-4 text-center">
            <p className="text-sm text-pink-300">
              💝 Stick to this schedule and you'll crush it! I'm proud of you! 💪
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
