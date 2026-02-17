'use client';

import { useState } from 'react';
import { X, RotateCcw, Check, ChevronLeft, ChevronRight, Loader2, BookOpen } from 'lucide-react';

interface Flashcard {
  id      : number;
  front   : string;
  back    : string;
  known   : boolean | null;
}

interface FlashcardGeneratorProps {
  isCreatorMode: boolean;
  onClose      : () => void;
}

export default function FlashcardGenerator({ isCreatorMode, onClose }: FlashcardGeneratorProps) {
  const [step,       setStep]       = useState<'input' | 'study'>('input');
  const [topic,      setTopic]      = useState('');
  const [notes,      setNotes]      = useState('');
  const [count,      setCount]      = useState(10);
  const [cards,      setCards]      = useState<Flashcard[]>([]);
  const [current,    setCurrent]    = useState(0);
  const [flipped,    setFlipped]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState('');

  const accent    = isCreatorMode ? 'text-pink-400'                                 : 'text-cyan-400';
  const accentBg  = isCreatorMode ? 'bg-pink-500'                                   : 'bg-cyan-500';
  const accentSoft= isCreatorMode ? 'bg-pink-500/10 border-pink-500/30 text-pink-300' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
  const accentBtn = isCreatorMode ? 'bg-pink-500 hover:bg-pink-400'                 : 'bg-cyan-500 hover:bg-cyan-400';

  const generateCards = async () => {
    if (!topic.trim() && !notes.trim()) {
      setError('Enter a topic or paste some notes!');
      return;
    }
    setGenerating(true);
    setError('');

    try {
      const prompt = notes.trim()
        ? `Generate exactly ${count} flashcards from these notes:\n\n${notes}\n\nReturn ONLY a JSON array, no markdown:\n[{"front":"question","back":"answer"}]`
        : `Generate exactly ${count} flashcards about "${topic}" suitable for a JEE/NEET level student.\nReturn ONLY a JSON array, no markdown:\n[{"front":"question","back":"answer"}]`;

      const res  = await fetch('/api/chat', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          messages    : [{ role: 'user', content: prompt }],
          isCreatorMode: false,
          maxTokens   : 1200,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Strip markdown fences if present
      const clean = data.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(clean) as { front: string; back: string }[];

      setCards(
        parsed.map((c, i) => ({ id: i, front: c.front, back: c.back, known: null }))
      );
      setCurrent(0);
      setFlipped(false);
      setStep('study');
    } catch (err: any) {
      setError('Could not generate cards — try again or simplify the topic.');
    } finally {
      setGenerating(false);
    }
  };

  const markCard = (known: boolean) => {
    setCards(prev => prev.map(c => c.id === cards[current].id ? { ...c, known } : c));
    setFlipped(false);
    setTimeout(() => setCurrent(i => Math.min(i + 1, cards.length - 1)), 200);
  };

  const restart = () => {
    setCards(prev => prev.map(c => ({ ...c, known: null })));
    setCurrent(0);
    setFlipped(false);
  };

  const knownCount   = cards.filter(c => c.known === true).length;
  const unknownCount = cards.filter(c => c.known === false).length;
  const doneCount    = knownCount + unknownCount;
  const progress     = cards.length ? doneCount / cards.length : 0;
  const card         = cards[current];
  const isDone       = current === cards.length - 1 && card?.known !== null;

  // ── Input screen ──────────────────────────────────────────────────────────
  if (step === 'input') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-[#0d1020] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">

          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className={accent} />
              <h2 className={`font-bold ${accent}`}>Flashcard Generator</h2>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Topic <span className="text-gray-600">(or paste notes below)</span></label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Thermodynamics, Organic Chemistry, Laws of Motion"
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Or paste your notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Paste chapter notes, text, or any content here..."
                rows={5}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/30 resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1.5">Number of cards: {count}</label>
              <input
                type="range"
                min={5} max={20} value={count}
                onChange={e => setCount(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: isCreatorMode ? '#ec4899' : '#22d3ee' }}
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                <span>5</span><span>20</span>
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={generateCards}
              disabled={generating}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${accentBtn} text-white`}
            >
              {generating ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : '⚡ Generate Flashcards'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Study screen ──────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0d1020] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('input')} className="text-gray-500 hover:text-white"><ChevronLeft size={18} /></button>
            <span className={`text-sm font-bold ${accent}`}>{topic || 'Flashcards'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{current + 1} / {cards.length}</span>
            <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className={`h-full ${accentBg} transition-all duration-500`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="p-6">
          {!isDone ? (
            <>
              {/* Flip card */}
              <div
                onClick={() => setFlipped(f => !f)}
                className="cursor-pointer select-none"
                style={{ perspective: '1000px' }}
              >
                <div
                  className="relative w-full transition-transform duration-500"
                  style={{
                    transformStyle  : 'preserve-3d',
                    transform       : flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    minHeight       : '200px',
                  }}
                >
                  {/* Front */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-xl text-center"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Question</p>
                    <p className="text-base font-medium text-white leading-relaxed">{card?.front}</p>
                    <p className="text-[10px] text-gray-600 mt-4">tap to reveal answer</p>
                  </div>

                  {/* Back */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center p-6 border rounded-xl text-center ${isCreatorMode ? 'bg-pink-500/10 border-pink-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  >
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-3">Answer</p>
                    <p className={`text-base font-medium leading-relaxed ${accent}`}>{card?.back}</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-3 mt-5">
                {flipped ? (
                  <>
                    <button
                      onClick={() => markCard(false)}
                      className="flex-1 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-sm font-medium transition-all"
                    >
                      ✗ Still learning
                    </button>
                    <button
                      onClick={() => markCard(true)}
                      className="flex-1 py-2.5 rounded-xl bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 text-sm font-medium transition-all"
                    >
                      ✓ Got it!
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setFlipped(true)}
                    className={`w-full py-2.5 rounded-xl ${accentSoft} border text-sm font-medium transition-all`}
                  >
                    Reveal Answer
                  </button>
                )}
              </div>

              {/* Skip */}
              <div className="flex justify-between mt-3">
                <button
                  onClick={() => { setFlipped(false); setCurrent(i => Math.max(i - 1, 0)); }}
                  disabled={current === 0}
                  className="text-xs text-gray-600 hover:text-gray-400 disabled:opacity-30 flex items-center gap-1"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <button
                  onClick={() => { setFlipped(false); setCurrent(i => Math.min(i + 1, cards.length - 1)); }}
                  disabled={current === cards.length - 1}
                  className="text-xs text-gray-600 hover:text-gray-400 disabled:opacity-30 flex items-center gap-1"
                >
                  Skip <ChevronRight size={12} />
                </button>
              </div>
            </>
          ) : (
            // ── Results ──────────────────────────────────────────────────────
            <div className="text-center py-4">
              <div className="text-5xl mb-4">{knownCount === cards.length ? '🏆' : knownCount > cards.length * 0.7 ? '🔥' : '💪'}</div>
              <h3 className={`text-xl font-bold mb-2 ${accent}`}>Session Complete!</h3>
              <p className="text-gray-400 text-sm mb-6">
                {knownCount} / {cards.length} cards mastered
                {isCreatorMode && knownCount === cards.length ? ' — I knew you could do it! 💕' : ''}
              </p>

              <div className="flex gap-3 mb-4">
                <div className="flex-1 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <p className="text-xl font-bold text-green-400">{knownCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Known</p>
                </div>
                <div className="flex-1 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-xl font-bold text-red-400">{unknownCount}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Review</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={restart}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> Restart
                </button>
                <button
                  onClick={() => setStep('input')}
                  className={`flex-1 py-2.5 rounded-xl ${accentBtn} text-white text-sm font-medium`}
                >
                  New Cards
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
