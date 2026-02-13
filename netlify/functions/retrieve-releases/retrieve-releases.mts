import { Context } from '@netlify/functions'

interface Release {
  year: number;
  country: string;
  mediaFormat: string;
  artistCredit: string;
}

const corsHeaders = (origin: string | null) => {
  // Only allow same-origin requests
  const allowedOrigin = origin ?? '';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
};

export default async (request: Request, context: Context) => {

  const origin = request.headers.get('Origin');
  const requestHost = new URL(request.url).origin;

  // For CORS: only allow requests from the same domain
  if (origin && origin !== requestHost) {
    console.error(`Returning 403 Forbidden. Origin: ${origin}; requestHost: ${requestHost}`);
    return new Response('Forbidden', { status: 403, headers: corsHeaders(null) });
  }

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    const url = new URL(request.url);
    const title = url.searchParams.get('title');
    const artist = url.searchParams.get('artist');

    if (!title || !artist) {
      const errMsg = 'Missing title or artist parameter';
      console.error(errMsg);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const errMsg = 'OpenAI API key not configured';
      console.error(errMsg);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 500,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              `You are a music encyclopedia. Return a JSON array of known releases for a given song.
              Each element must have exactly these fields: "year" (number), "country" (string, 2-letter ISO code),
              "mediaFormat" (string, e.g. "Vinyl", "CD", "Digital Media", "Cassette"), "artistCredit" (string).
              Return only the JSON array, no other text.`,
          },
          {
            role: 'user',
            content: `List all known releases for the song "${title}" by ${artist}. If the title contains text
            implying this is derivative content, return releases for the _original_ title. Examples of such text
            are, "Remaster", "Remastered", "Live", "Radio Edit", "Radio Version".`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errMsg = `OpenAI API error: ${response.status} ${response.statusText}`;
      console.error(errMsg);
      return new Response(JSON.stringify({ error: errMsg }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content ?? '[]';

    // Strip markdown fences if present
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

    const parsed: any[] = JSON.parse(content);
    const releases: Release[] = parsed
      .filter(
        (r) =>
          typeof r.year === 'number' &&
          typeof r.country === 'string' &&
          typeof r.mediaFormat === 'string' &&
          typeof r.artistCredit === 'string'
      )
      .sort((a, b) => a.year - b.year);

    return new Response(JSON.stringify(releases), {
      status: 200,
      headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(`ERROR from OpenAI: ${error}`);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders(origin ?? null), 'Content-Type': 'application/json' },
    });
  }
};
