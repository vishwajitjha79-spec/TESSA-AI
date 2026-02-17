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

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim();

  // ── Debug endpoint ───────────────────────────────────────────────────────
  if (req.nextUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({
      SPOTIFY_CLIENT_ID_SET    : !!process.env.SPOTIFY_CLIENT_ID,
      SPOTIFY_CLIENT_ID_LENGTH : process.env.SPOTIFY_CLIENT_ID?.length ?? 0,
      SPOTIFY_SECRET_SET       : !!process.env.SPOTIFY_CLIENT_SECRET,
      SPOTIFY_SECRET_LENGTH    : process.env.SPOTIFY_CLIENT_SECRET?.length ?? 0,
    });
  }

  // ── Token test endpoint ──────────────────────────────────────────────────
  if (req.nextUrl.searchParams.get('tokentest') === '1') {
    const clientId     = process.env.SPOTIFY_CLIENT_ID ?? '';
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? '';
    const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res  = await fetch('https://accounts.spotify.com/api/token', {
      method : 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type' : 'application/x-www-form-urlencoded',
      },
      body : 'grant_type=client_credentials',
      cache: 'no-store',
    });
    const body = await res.json();
    return NextResponse.json({ status: res.status, body });
  }

  if (!query) {
    return NextResponse.json({ error: 'Missing ?q= parameter', tracks: [] }, { status: 400 });
  }

  // ── Step 1: get access token ─────────────────────────────────────────────
  const clientId     = process.env.SPOTIFY_CLIENT_ID ?? '';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? '';

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Spotify credentials missing from environment', tracks: [] },
      { status: 500 }
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  let accessToken = '';
  try {
    const tokenRes  = await fetch('https://accounts.spotify.com/api/token', {
      method : 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type' : 'application/x-www-form-urlencoded',
      },
      body : 'grant_type=client_credentials',
      cache: 'no-store',
    });

    const tokenBody = await tokenRes.json();

    if (!tokenRes.ok || !tokenBody.access_token) {
      return NextResponse.json(
        {
          error : `Token failed (${tokenRes.status}): ${tokenBody.error ?? 'unknown'} — ${tokenBody.error_description ?? ''}`,
          tracks: [],
        },
        { status: 502 }
      );
    }

    accessToken = tokenBody.access_token as string;
  } catch (err: any) {
    return NextResponse.json(
      { error: `Token fetch threw: ${err.message}`, tracks: [] },
      { status: 502 }
    );
  }

  // ── Step 2: search ───────────────────────────────────────────────────────
  try {
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=8&market=IN`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache  : 'no-store',
      }
    );

    const searchBody = await searchRes.json();

    if (!searchRes.ok) {
      return NextResponse.json(
        { error: `Search failed (${searchRes.status}): ${JSON.stringify(searchBody)}`, tracks: [] },
        { status: 502 }
      );
    }

    const items: any[] = searchBody.tracks?.items ?? [];

    const tracks: SpotifyTrack[] = items.map((item: any) => ({
      id        : item.id                                                     ?? '',
      name      : item.name                                                   ?? 'Unknown',
      artists   : (item.artists ?? []).map((a: any) => a.name as string),
      album     : item.album?.name                                            ?? '',
      albumArt  : item.album?.images?.[1]?.url ?? item.album?.images?.[0]?.url ?? '',
      previewUrl: item.preview_url                                            ?? null,
      durationMs: item.duration_ms                                            ?? 0,
      spotifyUrl: item.external_urls?.spotify                                 ?? '',
      popularity: item.popularity                                             ?? 0,
    }));

    // Tracks with previews sort to top
    tracks.sort((a, b) => (b.previewUrl ? 1 : 0) - (a.previewUrl ? 1 : 0));

    return NextResponse.json({ tracks, total: tracks.length });

  } catch (err: any) {
    return NextResponse.json(
      { error: `Search threw: ${err.message}`, tracks: [] },
      { status: 502 }
    );
  }
}
