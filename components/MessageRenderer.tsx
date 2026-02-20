'use client';

import { useEffect, useRef, useState } from 'react';

interface MessageRendererProps {
  content      : string;
  className   ?: string;
  animate     ?: boolean;
  isCreatorMode?: boolean;
}

// ── KaTeX lazy loader ─────────────────────────────────────────────────────────
let katexLoaded = false;
let katexPromise: Promise<void> | null = null;

function loadKaTeX(): Promise<void> {
  if (katexLoaded) return Promise.resolve();
  if (katexPromise) return katexPromise;

  katexPromise = new Promise<void>((resolve, reject) => {
    if (!document.getElementById('katex-css')) {
      const link   = document.createElement('link');
      link.id      = 'katex-css';
      link.rel     = 'stylesheet';
      link.href    = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }

    if (!(window as any).katex) {
      const script  = document.createElement('script');
      script.src    = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
      script.async  = true;
      script.onload = () => { katexLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    } else {
      katexLoaded = true;
      resolve();
    }
  });

  return katexPromise;
}

// ── Typing animation ──────────────────────────────────────────────────────────
function useTyping(text: string, enabled: boolean) {
  const [displayed, setDisplayed] = useState(enabled ? '' : text);
  const [done, setDone]           = useState(!enabled);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) { setDisplayed(text); setDone(true); return; }
    setDisplayed(''); setDone(false);
    const words = text.split(' ');
    let idx     = 0;
    timerRef.current = setInterval(() => {
      if (idx >= words.length) {
        clearInterval(timerRef.current!); setDone(true); return;
      }
      setDisplayed(words.slice(0, idx + 1).join(' '));
      idx++;
    }, 32);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [text, enabled]);

  return { displayed, done };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MessageRenderer({
  content,
  className     = '',
  animate       = false,
  isCreatorMode = false,
}: MessageRendererProps) {
  const ref                 = useRef<HTMLDivElement>(null);
  const { displayed, done } = useTyping(content, animate);
  const renderText          = animate ? displayed : content;
  const cursorColor         = isCreatorMode ? '#ec4899' : '#22d3ee';

  useEffect(() => {
    loadKaTeX().then(() => {
      const win = window as any;
      if (!win.katex || !ref.current) return;
      ref.current.querySelectorAll('[data-formula]').forEach(el => {
        const formula     = el.getAttribute('data-formula') ?? '';
        const displayMode = el.getAttribute('data-display') === 'true';
        try {
          win.katex.render(formula, el as HTMLElement, {
            throwOnError: false,
            displayMode,
            output: 'html',
          });
        } catch { /* keep raw formula text */ }
      });
    }).catch(() => {});
  }, [renderText]);

  const segments = parseFormulas(renderText);

  return (
    <div ref={ref} className={`leading-relaxed ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === 'text') {
          return (
            <span key={i} className="whitespace-pre-wrap">
              {formatText(seg.value)}
            </span>
          );
        }
        if (seg.type === 'block') {
          return (
            <span
              key={i}
              data-formula={seg.value}
              data-display="true"
              className="block text-center my-3 overflow-x-auto text-lg"
            >
              {seg.value}
            </span>
          );
        }
        return (
          <span
            key={i}
            data-formula={seg.value}
            data-display="false"
            className="inline-block mx-0.5"
          >
            {seg.value}
          </span>
        );
      })}

      {animate && !done && (
        <span
          className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full animate-pulse"
          style={{ background: cursorColor }}
        />
      )}
    </div>
  );
}

// ── Formula parser ────────────────────────────────────────────────────────────
interface Segment {
  type : 'text' | 'inline' | 'block';
  value: string;
}

function parseFormulas(text: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'block',  value: match[1].trim() });
    } else if (match[2] !== undefined) {
      segments.push({ type: 'inline', value: match[2].trim() });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENHANCED: Text formatter with bold, italic, underline, and headings
// ══════════════════════════════════════════════════════════════════════════════
function formatText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let processedText = text;
  const elements: Array<{ start: number; end: number; element: React.ReactNode }> = [];
  let keyCounter = 0;

  // Pattern 1: Headings (###, ##, #)
  const headingPattern = /^(#{1,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(text)) !== null) {
    const level = match[1].length;
    const content = match[2];
    const sizeClass = level === 1 ? 'text-xl' : level === 2 ? 'text-lg' : 'text-base';
    elements.push({
      start: match.index,
      end: match.index + match[0].length,
      element: (
        <div key={keyCounter++} className={`${sizeClass} font-bold mt-3 mb-1.5`}>
          {content}
        </div>
      ),
    });
  }

  // Pattern 2: Bold (**text** or __text__)
  const boldPattern = /(\*\*|__)(.+?)\1/g;
  while ((match = boldPattern.exec(text)) !== null) {
    // Check if this position is already covered by a heading
    const isInHeading = elements.some(el => match!.index >= el.start && match!.index < el.end);
    if (!isInHeading) {
      elements.push({
        start: match.index,
        end: match.index + match[0].length,
        element: (
          <strong key={keyCounter++} className="font-bold text-white">
            {match[2]}
          </strong>
        ),
      });
    }
  }

  // Pattern 3: Italic (*text*)
  const italicPattern = /\*([^*\n]+?)\*/g;
  while ((match = italicPattern.exec(text)) !== null) {
    const isInOtherFormat = elements.some(
      el => match!.index >= el.start && match!.index < el.end
    );
    if (!isInOtherFormat) {
      elements.push({
        start: match.index,
        end: match.index + match[0].length,
        element: (
          <em key={keyCounter++} className="italic opacity-90">
            {match[1]}
          </em>
        ),
      });
    }
  }

  // Sort elements by start position
  elements.sort((a, b) => a.start - b.start);

  // Build final output
  let currentIndex = 0;
  elements.forEach(elem => {
    if (elem.start > currentIndex) {
      parts.push(text.slice(currentIndex, elem.start));
    }
    parts.push(elem.element);
    currentIndex = elem.end;
  });

  if (currentIndex < text.length) {
    parts.push(text.slice(currentIndex));
  }

  return parts.length > 0 ? parts : [text];
}
