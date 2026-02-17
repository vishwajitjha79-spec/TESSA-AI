import { NextRequest, NextResponse } from 'next/server';

export interface SpotifyTrack {
  id          : string;
  name        : string;
  artists     : string[];
  album       : string;
  albumArt    : string;
  previewUrl  : string | null;
  durationMs  : number;
  spotifyUrl  : string;
  popularity  : number;
}

async function getToken(): Promise<string> {
  const clientId     = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method : 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type' : 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  return data.access_token;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');
  const type  = req.nextUrl.searchParams.get('type') ?? 'track'; // track | playlist

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const token = await getToken();

    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=6&market=IN`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Spotify search failed' }, { status: 502 });
    }

    const data = await searchRes.json();

    if (type === 'track') {
      const tracks: SpotifyTrack[] = (data.tracks?.items ?? []).map((item: any) => ({
        id        : item.id,
        name      : item.name,
        artists   : item.artists.map((a: any) => a.name),
        album     : item.album.name,
        albumArt  : item.album.images?.[1]?.url ?? item.album.images?.[0]?.url ?? '',
        previewUrl: item.preview_url,
        durationMs: item.duration_ms,
        spotifyUrl: item.external_urls.spotify,
        popularity: item.popularity,
      }));

      // Sort: tracks with previews first
      tracks.sort((a, b) => (b.previewUrl ? 1 : 0) - (a.previewUrl ? 1 : 0));

      return NextResponse.json({ tracks });
    }

    // Playlist type
    const playlists = (data.playlists?.items ?? []).map((item: any) => ({
      id        : item.id,
      name      : item.name,
      owner     : item.owner.display_name,
      image     : item.images?.[0]?.url ?? '',
      spotifyUrl: item.external_urls.spotify,
      tracks    : item.tracks.total,
    }));

    return NextResponse.json({ playlists });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
