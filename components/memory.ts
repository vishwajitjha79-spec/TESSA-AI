// Persistent Memory — T.E.S.S.A. remembers facts across sessions

export interface MemoryEntry {
  id       : string;
  fact     : string;          // "User said his Physics exam is on Feb 20"
  category : MemoryCategory;
  timestamp: number;
  source   : string;          // snippet of message that created this memory
}

export type MemoryCategory =
  | 'exam'
  | 'health'
  | 'preference'
  | 'event'
  | 'mood'
  | 'study'
  | 'personal'
  | 'goal';

const STORAGE_KEY   = 'tessa-memory';
const MAX_MEMORIES  = 80;

// ── Read / Write ──────────────────────────────────────────────────────────────

export function getAllMemories(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MemoryEntry[];
  } catch {
    return [];
  }
}

export function saveMemory(entry: Omit<MemoryEntry, 'id' | 'timestamp'>): void {
  try {
    const memories = getAllMemories();

    // Avoid exact duplicates
    const isDupe = memories.some(m =>
      m.fact.toLowerCase() === entry.fact.toLowerCase()
    );
    if (isDupe) return;

    const next: MemoryEntry[] = [
      { ...entry, id: crypto.randomUUID(), timestamp: Date.now() },
      ...memories,
    ].slice(0, MAX_MEMORIES);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* storage full or unavailable */ }
}

export function deleteMemory(id: string): void {
  const next = getAllMemories().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearAllMemories(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Context builder for system prompt ────────────────────────────────────────

export function buildMemoryContext(): string {
  const memories = getAllMemories();
  if (memories.length === 0) return '';

  const grouped: Record<MemoryCategory, MemoryEntry[]> = {
    exam: [], health: [], preference: [], event: [],
    mood: [], study: [], personal: [], goal: [],
  };

  for (const m of memories) {
    grouped[m.category].push(m);
  }

  const lines: string[] = ['THINGS YOU REMEMBER ABOUT ANKIT:'];

  for (const [cat, items] of Object.entries(grouped)) {
    if (items.length === 0) continue;
    const label = cat.toUpperCase();
    lines.push(`\n[${label}]`);
    for (const item of items.slice(0, 10)) {
      const date = new Date(item.timestamp).toLocaleDateString('en-IN');
      lines.push(`• ${item.fact} (${date})`);
    }
  }

  lines.push('\nUse these naturally in conversation when relevant — never dump them all at once.');
  return lines.join('\n');
}

// ── Auto-extract memories from conversation ───────────────────────────────────

interface ExtractedMemory {
  fact    : string;
  category: MemoryCategory;
  source  : string;
}

export async function extractMemoriesFromMessage(
  userMessage: string,
  aiResponse : string
): Promise<void> {
  const text    = userMessage.toLowerCase();
  const source  = userMessage.slice(0, 80);
  const toSave  : ExtractedMemory[] = [];

  // ── Exam dates ─────────────────────────────────────────────────────────────
  const examPattern = /(?:my\s+)?(\w+(?:\s+\w+)?)\s+exam\s+(?:is\s+)?(?:on\s+)?(.{3,20})/i;
  const examMatch   = userMessage.match(examPattern);
  if (examMatch) {
    toSave.push({
      fact    : `${examMatch[1]} exam is on ${examMatch[2]}`,
      category: 'exam',
      source,
    });
  }

  // ── Stress / mood ──────────────────────────────────────────────────────────
  if (/i(?:'m| am)\s+(?:really\s+)?(?:stressed|worried|anxious|nervous)\s+(?:about\s+)?(.+)/i.test(userMessage)) {
    const m = userMessage.match(/stressed|worried|anxious|nervous.*?about\s+(.+?)(?:\.|$)/i);
    toSave.push({
      fact    : `Ankit was stressed about ${m?.[1]?.slice(0, 50) ?? 'something'}`,
      category: 'mood',
      source,
    });
  }

  // ── Goals ──────────────────────────────────────────────────────────────────
  if (/i\s+(?:want to|need to|have to|plan to|am going to)\s+(.{5,50})/i.test(userMessage)) {
    const m = userMessage.match(/(?:want|need|plan|going)\s+to\s+(.{5,50}?)(?:\.|,|$)/i);
    if (m?.[1]) {
      toSave.push({
        fact    : `Ankit wants to ${m[1].trim()}`,
        category: 'goal',
        source,
      });
    }
  }

  // ── Preferences ────────────────────────────────────────────────────────────
  if (/i\s+(?:love|hate|like|dislike|prefer|enjoy)\s+(.{3,40})/i.test(userMessage)) {
    const m = userMessage.match(/(?:love|hate|like|dislike|prefer|enjoy)\s+(.{3,40}?)(?:\.|,|$)/i);
    if (m?.[1]) {
      toSave.push({
        fact    : `Ankit ${m[0].split(' ')[0]}s ${m[1].trim()}`,
        category: 'preference',
        source,
      });
    }
  }

  // ── Personal facts ─────────────────────────────────────────────────────────
  if (/my\s+(?:birthday|bday)\s+is\s+(.{3,20})/i.test(userMessage)) {
    const m = userMessage.match(/(?:birthday|bday)\s+is\s+(.{3,20}?)(?:\.|,|$)/i);
    if (m?.[1]) toSave.push({ fact: `Ankit's birthday is ${m[1].trim()}`, category: 'personal', source });
  }

  if (/i\s+(?:live|stay|am)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i.test(userMessage)) {
    const m = userMessage.match(/(?:live|stay|am)\s+in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (m?.[1]) toSave.push({ fact: `Ankit lives in ${m[1]}`, category: 'personal', source });
  }

  // ── Study sessions ─────────────────────────────────────────────────────────
  if (/studied\s+(.{3,30})\s+(?:for\s+)?(\d+)\s*hours?/i.test(userMessage)) {
    const m = userMessage.match(/studied\s+(.{3,30}?)\s+(?:for\s+)?(\d+)\s*hours?/i);
    if (m) toSave.push({ fact: `Studied ${m[1]} for ${m[2]} hours`, category: 'study', source });
  }

  // Save all extracted memories
  for (const entry of toSave) saveMemory(entry);
}
