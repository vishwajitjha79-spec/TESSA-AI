// Detects music commands from natural language chat messages

export interface MusicCommand {
  type    : 'play' | 'search' | 'close' | 'next' | 'prev' | 'pause' | 'volume';
  query  ?: string;   // song/artist name
  value  ?: number;   // for volume commands
}

// Patterns T.E.S.S.A. will detect
const PLAY_PATTERNS = [
  /(?:play|put on|play me|start|queue)\s+(.+)/i,
  /(?:i want to|can you|wanna)\s+(?:listen to|hear)\s+(.+)/i,
  /(.+)\s+(?:song|track|music)$/i,
];

const SEARCH_PATTERNS = [
  /(?:search|find|look up|show me)\s+(?:songs? by|music by|tracks? by)?\s*(.+)/i,
  /(?:songs? by|music by|anything by)\s+(.+)/i,
];

const SKIP_PATTERNS    = /(?:next|skip|next song|next track)/i;
const PREV_PATTERNS    = /(?:previous|prev|go back|last song)/i;
const PAUSE_PATTERNS   = /(?:pause|stop|stop music|pause music|mute)/i;
const CLOSE_PATTERNS   = /(?:close (?:the )?(?:player|music|spotify)|stop player)/i;
const VOLUME_PATTERNS  = /(?:volume)\s+(?:up|down|to\s+(\d+))/i;

// Mood → search query mapping
const MOOD_MUSIC_MAP: Record<string, string> = {
  sad       : 'sad songs hindi',
  happy     : 'happy upbeat songs',
  chill     : 'lofi chill beats',
  stressed  : 'calm relaxing music',
  focus     : 'study music concentration',
  workout   : 'workout pump up songs',
  romantic  : 'romantic hindi songs',
  party     : 'party songs hits',
  sleep     : 'sleep music calm',
  motivate  : 'motivational songs',
};

export function parseMusicCommand(message: string): MusicCommand | null {
  const msg = message.trim();

  // Close
  if (CLOSE_PATTERNS.test(msg)) return { type: 'close' };

  // Skip / next
  if (SKIP_PATTERNS.test(msg)) return { type: 'next' };

  // Previous
  if (PREV_PATTERNS.test(msg)) return { type: 'prev' };

  // Pause / stop
  if (PAUSE_PATTERNS.test(msg)) return { type: 'pause' };

  // Volume
  const volMatch = msg.match(VOLUME_PATTERNS);
  if (volMatch) {
    const value = volMatch[1] ? parseInt(volMatch[1], 10) / 100 : undefined;
    return { type: 'volume', value };
  }

  // Mood-based music
  for (const [mood, query] of Object.entries(MOOD_MUSIC_MAP)) {
    const moodRe = new RegExp(
      `(?:play|put on|i(?:'m| am) feeling|something)\s+${mood}|${mood}\s+(?:music|songs|vibes)`,
      'i'
    );
    if (moodRe.test(msg)) return { type: 'play', query };
  }

  // Explicit play
  for (const pattern of PLAY_PATTERNS) {
    const match = msg.match(pattern);
    if (match?.[1]) {
      const query = match[1]
        .replace(/^(?:for me|please|now|right now)\s*/i, '')
        .replace(/\s+(?:please|now|right now)$/i, '')
        .trim();
      if (query.length > 1) return { type: 'play', query };
    }
  }

  // Search
  for (const pattern of SEARCH_PATTERNS) {
    const match = msg.match(pattern);
    if (match?.[1]) return { type: 'search', query: match[1].trim() };
  }

  return null;
}

// T.E.S.S.A.'s response when she gets a music command
export function getMusicResponse(cmd: MusicCommand): string {
  switch (cmd.type) {
    case 'play':
      return `On it! 🎵 Let me find "${cmd.query}" for you...`;
    case 'search':
      return `Searching for "${cmd.query}" 🔍`;
    case 'next':
      return 'Skipping to next track! ⏭️';
    case 'prev':
      return 'Going back! ⏮️';
    case 'pause':
      return 'Pausing the music 🎵';
    case 'close':
      return 'Closing the player 🎵';
    case 'volume':
      return cmd.value !== undefined
        ? `Setting volume to ${Math.round(cmd.value * 100)}% 🔊`
        : 'Adjusting volume! 🔊';
    default:
      return '';
  }
}
