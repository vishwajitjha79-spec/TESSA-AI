import { NextRequest, NextResponse } from 'next/server';

export interface SpotifyTrack {
  id        : string;
  name      : string;
  artists   : string[];
  album     : string;
  albumArt  : string;
  previewUrl: string | null;
  durationMs: number;
  spotifyUrl: string;
  popularity: number;
}

async function getSpotifyToken(): Promise<string> {
  const clientId     = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // Detailed env check
  if (!clientId)     throw new Error('SPOTIFY_CLIENT_ID is not set in environment variables');
  if (!clientSecret) throw new Error('SPOTIFY_CLIENT_SECRET is not set in environment variables');
  if (clientId.length < 10)     throw new Error(`SPOTIFY_CLIENT_ID looks wrong (too short: ${clientId.length} chars)`);
  if (clientSecret.length < 10) throw new Error(`SPOTIFY_CLIENT_SECRET looks wrong (too short: ${clientSecret.length} chars)`);

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method : 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type' : 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  const body = await res.json();

  if (!res.ok) {
    throw new Error(
      `Spotify token error (${res.status}): ${body.error ?? 'unknown'} — ${body.error_description ?? ''}`
    );
  }

  if (!body.access_token) {
    throw new Error('Spotify returned no access_token: ' + JSON.stringify(body));
  }

  return body.access_token as string;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();

  // Debug mode — hit /api/spotify/search?debug=1 to check env vars
  if (req.nextUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({
      SPOTIFY_CLIENT_ID_SET    : !!process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_ID_LENGTH : process.env.SPOTIFY_CLIENT_ID?.length ?? 0,
      SPOTIFY_SECRET_SET       : !!process.env.SPOTIFY_CLIENT_SECRET,
      SPOTIFY_SECRET_LENGTH    : process.env.SPOTIFY_CLIENT_SECRET?.length ?? 0,
    });
  }

  if (!query) {
    return NextResponse.json({ error: 'Missing query parameter ?q=' }, { status: 400 });
  }

  try {
    // ── Step 1: get token ──────────────────────────────────────────────────
    const token = await getSpotifyToken();

    // ── Step 2: search tracks ──────────────────────────────────────────────
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8&market=IN`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache  : 'no-store',
      }
    );

    const searchBody = await searchRes.json();

    if (!searchRes.ok) {
      throw new Error(
        `Spotify search error (${searchRes.status}): ${JSON.stringify(searchBody)}`
      );
    }

    const items: any[] = searchBody.tracks?.items ?? [];

    const tracks: SpotifyTrack[] = items.map(item => ({
      id        : item.id        ?? '',
      name      : item.name      ?? 'Unknown',
      artists   : (item.artists  ?? []).map((a: any) => a.name as string),
      album     : item.album?.name ?? '',
      albumArt  : item.album?.images?.[1]?.url ?? item.album?.images?.[0]?.url ?? '',
      previewUrl: item.preview_url ?? null,
      durationMs: item.duration_ms ?? 0,
      spotifyUrl: item.external_urls?.spotify ?? '',
      popularity: item.popularity ?? 0,
    }));

    // Tracks with previews first
    tracks.sort((a, b) => (b.previewUrl ? 1 : 0) - (a.previewUrl ? 1 : 0));

    return NextResponse.json({ tracks, total: tracks.length });

  } catch (err: any) {
    console.error('[Spotify Search]', err.message);
    return NextResponse.json(
      { error: err.message ?? 'Unknown error', tracks: [] },
      { status: 502 }
    );
  }
}
