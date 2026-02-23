'use client';

import { useEffect, useRef, useState } from 'react';

interface MessageRendererProps {
  content      : string;
  className   ?: string;
  animate     ?: boolean;
  isCreatorMode?: boolean;
}

// ── KaTeX lazy loader ─────────────────────────────────────────────────────────
let katexLoaded  = false;
let katexPromise : Promise<void> | null = null;

function loadKaTeX(): Promise<void> {
  if (katexLoaded) return Promise.resolve();
  if (katexPromise) return katexPromise;
  katexPromise = new Promise<void>((resolve, reject) => {
    if (!document.getElementById('katex-css')) {
      const link = document.createElement('link');
      link.id = 'katex-css'; link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
      document.head.appendChild(link);
    }
    if (!(window as any).katex) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
      script.async = true;
      script.onload = () => { katexLoaded = true; resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    } else { katexLoaded = true; resolve(); }
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
    let idx = 0;
    timerRef.current = setInterval(() => {
      if (idx >= words.length) { clearInterval(timerRef.current!); setDone(true); return; }
      setDisplayed(words.slice(0, idx + 1).join(' '));
      idx++;
    }, 32);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [text, enabled]);

  return { displayed, done };
}

// ── Detect light theme from className ────────────────────────────────────────
function isLightTheme(className: string): boolean {
  return (
    className.includes('text-slate') ||
    className.includes('text-gray')  ||
    className.includes('text-zinc')
  );
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
  const isLight             = isLightTheme(className);
  const accentColor         = isCreatorMode ? '#ec4899' : (isLight ? '#0891b2' : '#06b6d4');

  useEffect(() => {
    loadKaTeX().then(() => {
      const win = window as any;
      if (!win.katex || !ref.current) return;
      ref.current.querySelectorAll('[data-formula]').forEach(el => {
        const formula     = el.getAttribute('data-formula') ?? '';
        const displayMode = el.getAttribute('data-display') === 'true';
        try {
          win.katex.render(formula, el as HTMLElement, { throwOnError: false, displayMode, output: 'html' });
        } catch {}
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
              {formatText(seg.value, isLight, accentColor)}
            </span>
          );
        }
        if (seg.type === 'block') {
          return (
            <span key={i} data-formula={seg.value} data-display="true"
              className="block text-center my-3 overflow-x-auto text-lg">
              {seg.value}
            </span>
          );
        }
        return (
          <span key={i} data-formula={seg.value} data-display="false"
            className="inline-block mx-0.5">
            {seg.value}
          </span>
        );
      })}

      {animate && !done && (
        <span className="inline-block w-0.5 h-4 ml-0.5 align-middle rounded-full animate-pulse"
          style={{ background: cursorColor }}/>
      )}
    </div>
  );
}

// ── Formula parser ────────────────────────────────────────────────────────────
interface Segment { type: 'text' | 'inline' | 'block'; value: string; }

function parseFormulas(text: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;
  let lastIndex = 0, match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push({ type:'text', value:text.slice(lastIndex, match.index) });
    if (match[1] !== undefined)  segments.push({ type:'block',  value:match[1].trim() });
    else if (match[2] !== undefined) segments.push({ type:'inline', value:match[2].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) segments.push({ type:'text', value:text.slice(lastIndex) });
  return segments;
}

// ══════════════════════════════════════════════════════════════════════════════
// TEXT FORMATTER — headings, bold, italic, code, lists, blockquote, hr
// All colours are theme-aware: dark on light themes, white on dark themes.
// ══════════════════════════════════════════════════════════════════════════════
function formatText(text: string, isLight: boolean, accentColor: string): React.ReactNode[] {
  // ── Colour tokens ─────────────────────────────────────────────────────────
  const boldColor   = isLight ? '#0f172a' : '#ffffff';          // always visible
  const italicColor = isLight ? '#1e293b' : 'rgba(255,255,255,0.88)';
  const codeColor   = isLight ? '#7c3aed' : '#67e8f9';
  const codeBg      = isLight ? 'rgba(124,58,237,0.09)' : 'rgba(103,232,249,0.10)';
  const subColor    = isLight ? '#64748b' : 'rgba(255,255,255,0.45)';
  const hrColor     = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)';
  const blockBg     = isLight ? 'rgba(0,0,0,0.04)'  : 'rgba(255,255,255,0.04)';
  const blockBorder = isLight ? 'rgba(0,0,0,0.1)'   : 'rgba(255,255,255,0.09)';
  const quoteBar    = `${accentColor}55`;
  const textColor   = isLight ? '#1e293b' : 'rgba(255,255,255,0.88)';

  const parts : React.ReactNode[] = [];
  const lines  = text.split('\n');
  let   key    = 0;
  let   i      = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Code block ──────────────────────────────────────────────────────────
    if (line.startsWith('```')) {
      const lang   = line.slice(3).trim();
      const block : string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { block.push(lines[i]); i++; }
      parts.push(
        <div key={key++} style={{
          background:blockBg, border:`1px solid ${blockBorder}`,
          borderRadius:12, padding:'10px 14px', margin:'8px 0', overflowX:'auto',
        }}>
          {lang && (
            <div style={{fontSize:9,fontWeight:800,letterSpacing:'0.14em',textTransform:'uppercase',
              color:subColor, marginBottom:6}}>{lang}</div>
          )}
          <pre style={{fontFamily:'ui-monospace,monospace',fontSize:12,lineHeight:1.6,
            color:codeColor,margin:0,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
            {block.join('\n')}
          </pre>
        </div>
      );
      i++; continue;
    }

    // ── H1 ──────────────────────────────────────────────────────────────────
    if (/^# (.+)/.test(line)) {
      const t = line.replace(/^# /, '');
      parts.push(
        <div key={key++} style={{margin:'14px 0 5px'}}>
          <div style={{
            fontSize:20, fontWeight:900, color:boldColor,
            letterSpacing:'-0.02em', lineHeight:1.25,
            borderBottom:`2px solid ${accentColor}35`, paddingBottom:5,
          }}>
            {inlineFormat(t, boldColor, italicColor, codeColor, codeBg, accentColor)}
          </div>
        </div>
      );
      i++; continue;
    }

    // ── H2 ──────────────────────────────────────────────────────────────────
    if (/^## (.+)/.test(line)) {
      const t = line.replace(/^## /, '');
      parts.push(
        <div key={key++} style={{margin:'11px 0 4px', display:'flex', alignItems:'center', gap:7}}>
          <span style={{color:accentColor, fontSize:11, flexShrink:0}}>◆</span>
          <div style={{fontSize:16, fontWeight:800, color:boldColor, letterSpacing:'-0.01em', lineHeight:1.3}}>
            {inlineFormat(t, boldColor, italicColor, codeColor, codeBg, accentColor)}
          </div>
        </div>
      );
      i++; continue;
    }

    // ── H3 ──────────────────────────────────────────────────────────────────
    if (/^### (.+)/.test(line)) {
      const t = line.replace(/^### /, '');
      parts.push(
        <div key={key++} style={{margin:'9px 0 3px', display:'flex', alignItems:'center', gap:6}}>
          <span style={{color:accentColor, fontSize:9, opacity:0.7, flexShrink:0}}>▸</span>
          <div style={{fontSize:14, fontWeight:700, color:boldColor, lineHeight:1.35}}>
            {inlineFormat(t, boldColor, italicColor, codeColor, codeBg, accentColor)}
          </div>
        </div>
      );
      i++; continue;
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      parts.push(
        <div key={key++} style={{
          borderLeft:`3px solid ${quoteBar}`, paddingLeft:12,
          margin:'6px 0', color:subColor, fontStyle:'italic', fontSize:13,
        }}>
          {inlineFormat(line.slice(2), boldColor, italicColor, codeColor, codeBg, accentColor)}
        </div>
      );
      i++; continue;
    }

    // ── HR ──────────────────────────────────────────────────────────────────
    if (/^[-*_]{3,}$/.test(line.trim())) {
      parts.push(<hr key={key++} style={{border:'none',borderTop:`1px solid ${hrColor}`,margin:'10px 0'}}/>);
      i++; continue;
    }

    // ── Unordered list ──────────────────────────────────────────────────────
    if (/^\s*[-*+] /.test(line)) {
      const items: {text:string; depth:number}[] = [];
      while (i < lines.length && /^\s*[-*+] /.test(lines[i])) {
        const depth = Math.floor((lines[i].match(/^(\s*)/)?.[1].length ?? 0) / 2);
        items.push({ text:lines[i].replace(/^\s*[-*+] /,''), depth });
        i++;
      }
      parts.push(
        <ul key={key++} style={{margin:'5px 0',paddingLeft:0,listStyle:'none'}}>
          {items.map((it, j) => (
            <li key={j} style={{display:'flex',alignItems:'flex-start',gap:8,
              paddingLeft:it.depth*14, marginBottom:3}}>
              <span style={{color:accentColor,fontSize:9,marginTop:5,flexShrink:0,
                opacity:it.depth>0?0.55:1}}>
                {it.depth===0?'●':'○'}
              </span>
              <span style={{fontSize:13,lineHeight:1.6,color:textColor}}>
                {inlineFormat(it.text, boldColor, italicColor, codeColor, codeBg, accentColor)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /,'')); i++;
      }
      parts.push(
        <ol key={key++} style={{margin:'5px 0',paddingLeft:0,listStyle:'none'}}>
          {items.map((t,j) => (
            <li key={j} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:4}}>
              <span style={{
                flexShrink:0,width:20,height:20,borderRadius:6,
                background:`${accentColor}18`,border:`1px solid ${accentColor}30`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:9,fontWeight:800,color:accentColor,marginTop:2,
              }}>{j+1}</span>
              <span style={{fontSize:13,lineHeight:1.6,color:textColor}}>
                {inlineFormat(t, boldColor, italicColor, codeColor, codeBg, accentColor)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Blank line ──────────────────────────────────────────────────────────
    if (line.trim() === '') {
      parts.push(<div key={key++} style={{height:5}}/>);
      i++; continue;
    }

    // ── Regular paragraph ───────────────────────────────────────────────────
    parts.push(
      <p key={key++} style={{margin:'2px 0',fontSize:13,lineHeight:1.65,color:textColor}}>
        {inlineFormat(line, boldColor, italicColor, codeColor, codeBg, accentColor)}
      </p>
    );
    i++;
  }

  return parts.length > 0 ? parts : [text];
}

// ── Inline formatter — bold, italic, inline-code, links ──────────────────────
function inlineFormat(
  text       : string,
  boldColor  : string,
  italicColor: string,
  codeColor  : string,
  codeBg     : string,
  accentColor: string,
): React.ReactNode {
  const parts : React.ReactNode[] = [];
  const re     = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let   last   = 0, m: RegExpExecArray | null, k = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);

    if (m[0].startsWith('**')) {
      // BOLD — always uses boldColor (dark on light, white on dark)
      parts.push(
        <strong key={k++} style={{fontWeight:800, color:boldColor}}>
          {m[2]}
        </strong>
      );
    } else if (m[0].startsWith('*')) {
      parts.push(
        <em key={k++} style={{fontStyle:'italic', color:italicColor}}>
          {m[3]}
        </em>
      );
    } else if (m[0].startsWith('`')) {
      parts.push(
        <code key={k++} style={{
          fontFamily:'ui-monospace,monospace', fontSize:'0.88em',
          color:codeColor, background:codeBg, padding:'1px 5px', borderRadius:5,
        }}>
          {m[4]}
        </code>
      );
    } else if (m[5]) {
      parts.push(
        <a key={k++} href={m[6]} target="_blank" rel="noopener noreferrer"
          style={{color:accentColor,textDecoration:'underline',
            textDecorationColor:`${accentColor}50`}}>
          {m[5]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return parts.length === 0 ? text : <>{parts}</>;
}
