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
    // Inject KaTeX CSS if not already present
    if (!document.getElementById('katex-css')) {
      const link   = document.createElement('link');
      link.id      = 'katex-css';
      link.rel     = 'stylesheet';
      link.href    = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }

    // Inject KaTeX JS if not already present
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

// ── Text formatter for bold/italic ────────────────────────────────────────────
function formatText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match **bold** or __bold__
  const boldPattern = /(\*\*|__)(.+?)\1/g;
  let match: RegExpExecArray | null;
  
  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Add bold text
    parts.push(<strong key={match.index} className="font-semibold">{match[2]}</strong>);
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}
