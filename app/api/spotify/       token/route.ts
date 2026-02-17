import { NextResponse } from 'next/server';

// Client Credentials Flow — works without user login, gives search access
// No Premium needed for this flow

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function GET() {
  try {
    // Return cached token if still valid (with 60s buffer)
    if (cachedToken && Date.now() < tokenExpiry - 60_000) {
      return NextResponse.json({ access_token: cachedToken });
    }

    const clientId     = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Spotify credentials not configured' },
        { status: 500 }
      );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method : 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type' : 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `Spotify auth failed: ${err}` }, { status: 401 });
    }

    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;

    return NextResponse.json({ access_token: cachedToken });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
