'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, Edit2, X } from 'lucide-react';

interface Note {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

interface NotesPanelProps {
  isLight?: boolean;
  accentColor?: string;
}

export default function NotesPanel({ isLight = false, accentColor = '#06b6d4' }: NotesPanelProps) {
  const [notes,    setNotes]    = useState<Note[]>([]);
  const [input,    setInput]    = useState('');
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Colours — fully theme-aware, zero white in light mode
  const textColor    = isLight ? '#1e293b'           : 'rgba(255,255,255,0.88)';
  const subColor     = isLight ? '#64748b'           : 'rgba(255,255,255,0.38)';
  const doneColor    = isLight ? '#94a3b8'           : 'rgba(255,255,255,0.28)';
  const inputBg      = isLight ? 'rgba(0,0,0,0.04)'  : 'rgba(255,255,255,0.05)';
  const inputBorder  = isLight ? 'rgba(0,0,0,0.14)'  : 'rgba(255,255,255,0.10)';
  const rowBg        = isLight ? 'rgba(0,0,0,0.02)'  : 'rgba(255,255,255,0.02)';
  const rowBorder    = isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.05)';
  const doneBg       = isLight ? 'rgba(0,0,0,0.03)'  : 'rgba(255,255,255,0.03)';
  const checkBg      = `${accentColor}22`;
  const checkBorder  = `${accentColor}50`;

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tessa_notes');
      if (saved) setNotes(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (next: Note[]) => {
    setNotes(next);
    try { localStorage.setItem('tessa_notes', JSON.stringify(next)); } catch {}
  };

  const addNote = () => {
    const text = input.trim();
    if (!text) return;
    save([{ id: Date.now().toString(), text, done: false, createdAt: new Date().toLocaleDateString() }, ...notes]);
    setInput('');
  };

  const toggleDone = (id: string) =>
    save(notes.map(n => n.id === id ? { ...n, done: !n.done } : n));

  const deleteNote = (id: string) =>
    save(notes.filter(n => n.id !== id));

  const startEdit = (n: Note) => { setEditId(n.id); setEditText(n.text); };

  const saveEdit = () => {
    if (!editText.trim()) return;
    save(notes.map(n => n.id === editId ? { ...n, text: editText.trim() } : n));
    setEditId(null); setEditText('');
  };

  return (
    <div style={{ padding: '6px 8px 8px' }}>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addNote()}
          placeholder="Add a note…"
          style={{
            flex: 1, padding: '5px 9px', borderRadius: 8, fontSize: 10,
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            color: textColor,
            outline: 'none',
          }}
        />
        <button
          onClick={addNote}
          style={{
            width: 24, height: 24, borderRadius: 7, flexShrink: 0,
            background: `${accentColor}22`,
            border: `1px solid ${accentColor}45`,
            color: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Notes list */}
      {notes.length === 0 && (
        <p style={{ fontSize: 9, color: subColor, textAlign: 'center', padding: '6px 0' }}>
          No notes yet
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {notes.map(n => (
          <div key={n.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 6,
            padding: '5px 7px', borderRadius: 8,
            background: n.done ? doneBg : rowBg,
            border: `1px solid ${rowBorder}`,
          }}>
            {/* Checkbox */}
            <button
              onClick={() => toggleDone(n.id)}
              style={{
                flexShrink: 0, width: 14, height: 14, borderRadius: 4, marginTop: 1,
                background: n.done ? checkBg : 'transparent',
                border: `1.5px solid ${n.done ? accentColor : inputBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              {n.done && <Check size={8} color={accentColor} />}
            </button>

            {/* Text / edit */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {editId === n.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    autoFocus
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditId(null); }}
                    style={{
                      flex: 1, fontSize: 10, padding: '2px 5px', borderRadius: 5,
                      background: inputBg, border: `1px solid ${accentColor}50`,
                      color: textColor, outline: 'none',
                    }}
                  />
                  <button onClick={saveEdit} style={{ color: accentColor, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                    <Check size={10} />
                  </button>
                  <button onClick={() => setEditId(null)} style={{ color: subColor, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <>
                  <p style={{
                    fontSize: 10, lineHeight: 1.4, margin: 0,
                    color: n.done ? doneColor : textColor,
                    textDecoration: n.done ? 'line-through' : 'none',
                    wordBreak: 'break-word',
                  }}>
                    {n.text}
                  </p>
                  <span style={{ fontSize: 8, color: subColor }}>{n.createdAt}</span>
                </>
              )}
            </div>

            {/* Actions */}
            {editId !== n.id && (
              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                <button onClick={() => startEdit(n)}
                  style={{ color: subColor, cursor: 'pointer', background: 'none', border: 'none', padding: 2 }}>
                  <Edit2 size={9} />
                </button>
                <button onClick={() => deleteNote(n.id)}
                  style={{ color: 'rgba(239,68,68,0.55)', cursor: 'pointer', background: 'none', border: 'none', padding: 2 }}>
                  <Trash2 size={9} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
