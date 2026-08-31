import { corsHeaders, json, options } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options();
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);
  try {
    const content = String((await request.json()).content ?? '').slice(0, 6000);
    if (!content.trim()) return json({ error: 'Content is required' }, 400);
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'Moderation service is not configured' }, 503);
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: content }),
    });
    if (!response.ok) throw new Error(`Moderation failed: ${response.status}`);
    const payload = await response.json() as { results?: { flagged: boolean; categories: Record<string, boolean> }[] };
    const result = payload.results?.[0];
    return json({ allowed: !result?.flagged, flagged: Boolean(result?.flagged), categories: result?.categories ?? {} });
  } catch (error) {
    console.error(error);
    return json({ error: 'Unable to moderate content' }, 500);
  }
});
