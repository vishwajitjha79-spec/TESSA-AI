'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Edit2, StickyNote } from 'lucide-react';

interface Note {
  id: string;
  text: string;
  completed: boolean;
  category: 'study' | 'personal' | 'reminder';
  createdAt: Date;
  pinned: boolean;
}

export default function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('tessa-notes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotes(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt)
        })));
      } catch (e) {
        console.error('Failed to load notes');
      }
    }
  }, []);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('tessa-notes', JSON.stringify(updatedNotes));
  };

  const addNote = () => {
    if (!newNoteText.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      text: newNoteText,
      completed: false,
      category: 'personal',
      createdAt: new Date(),
      pinned: false,
    };

    saveNotes([newNote, ...notes]);
    setNewNoteText('');
    setShowInput(false);
  };

  const toggleComplete = (id: string) => {
    saveNotes(notes.map(note => 
      note.id === id ? { ...note, completed: !note.completed } : note
    ));
  };

  const deleteNote = (id: string) => {
    saveNotes(notes.filter(note => note.id !== id));
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    
    saveNotes(notes.map(note =>
      note.id === editingId ? { ...note, text: editText } : note
    ));
    setEditingId(null);
    setEditText('');
  };

  const togglePin = (id: string) => {
    const updated = notes.map(note =>
      note.id === id ? { ...note, pinned: !note.pinned } : note
    );
    // Sort: pinned first
    updated.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    saveNotes(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="p-4 border-b border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-primary flex items-center gap-2">
          <StickyNote size={16} />
          Quick Notes
        </h3>
        <button
          onClick={() => setShowInput(!showInput)}
          className="p-1 hover:bg-white/10 rounded transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Add Note Input */}
      {showInput && (
        <div className="mb-3 space-y-2">
          <input
            type="text"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addNote)}
            placeholder="Write a note..."
            className="w-full px-3 py-2 bg-white/5 border border-primary/30 rounded text-sm focus:outline-none focus:border-primary"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={addNote}
              className="flex-1 px-3 py-1 bg-primary/20 hover:bg-primary/30 rounded text-xs font-bold"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowInput(false);
                setNewNoteText('');
              }}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {notes.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            No notes yet. Click + to add one!
          </p>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className={`p-2 rounded border transition-all ${
                note.completed
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-white/5 border-white/10'
              } ${note.pinned ? 'ring-1 ring-primary/30' : ''}`}
            >
              {editingId === note.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, saveEdit)}
                    className="w-full px-2 py-1 bg-white/10 border border-primary/30 rounded text-xs focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 px-2 py-1 bg-primary/20 rounded text-xs"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditText('');
                      }}
                      className="px-2 py-1 bg-white/10 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => toggleComplete(note.id)}
                    className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      note.completed
                        ? 'bg-green-500 border-green-500'
                        : 'border-gray-400 hover:border-primary'
                    }`}
                  >
                    {note.completed && <Check size={12} className="text-white" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs break-words ${
                        note.completed ? 'line-through text-gray-500' : 'text-white'
                      }`}
                    >
                      {note.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {note.createdAt.toLocaleDateString()}
                      {note.pinned && ' • 📌'}
                    </p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(note)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <Edit2 size={12} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 hover:bg-red-500/20 rounded"
                    >
                      <Trash2 size={12} className="text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {notes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-primary/10">
          <p className="text-xs text-gray-400 text-center">
            {notes.filter(n => !n.completed).length} active • {notes.filter(n => n.completed).length} done
          </p>
        </div>
      )}
    </div>
  );
}
