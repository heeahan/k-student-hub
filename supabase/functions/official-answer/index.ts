import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, options } from '../_shared/http.ts';

type SearchHit = { file_id: string; filename?: string; score: number; content?: { type: string; text: string }[] };

function responseText(payload: Record<string, unknown>) {
  const output = payload.output as { content?: { type: string; text?: string }[] }[] | undefined;
  return output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text ?? '';
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const question = String(body.question ?? '').trim().slice(0, 800);
    const visaType = String(body.visaType ?? 'D-2').slice(0, 10);
    const language = String(body.language ?? 'en').slice(0, 5);
    if (question.length < 4) return json({ error: 'Question is too short' }, 400);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const vectorStoreId = Deno.env.get('OPENAI_VECTOR_STORE_ID');
    if (!apiKey || !vectorStoreId) return json({ error: 'AI service is not configured' }, 503);
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const searchResponse = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/search`, {
      method: 'POST', headers, body: JSON.stringify({ query: `${visaType} ${question}`, max_num_results: 6, rewrite_query: true }),
    });
    if (!searchResponse.ok) throw new Error(`Vector search failed: ${searchResponse.status}`);
    const search = await searchResponse.json() as { data?: SearchHit[] };
    const hits = (search.data ?? []).filter((hit) => hit.score >= 0.42 && hit.content?.some((item) => item.text));
    if (!hits.length) return json({ status: 'no_official_source', answer: '', checklist: [], citations: [] });

    const fileIds = [...new Set(hits.map((hit) => hit.file_id))];
    const { data: sourceRows } = await supabase.from('official_sources').select('id, issuer, title, url, checked_at, openai_file_id').in('openai_file_id', fileIds).eq('active', true);
    if (!sourceRows?.length) return json({ status: 'no_official_source', answer: '', checklist: [], citations: [] });
    const allowedFiles = new Set(sourceRows.map((row) => row.openai_file_id));
    const context = hits.filter((hit) => allowedFiles.has(hit.file_id)).map((hit, index) => `[SOURCE ${index + 1} | file_id=${hit.file_id}]\n${hit.content?.map((part) => part.text).join('\n')}`).join('\n\n');
    if (!context) return json({ status: 'no_official_source', answer: '', checklist: [], citations: [] });

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers, body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') ?? 'gpt-5-mini',
        instructions: `You are a Korea immigration information assistant for international students. Answer only from the supplied official-source excerpts. Never infer missing rules. State that this is informational, not legal advice. Respond in language code ${language}. Do not include URLs you were not given.`,
        input: `Visa: ${visaType}\nQuestion: ${question}\n\nOfficial excerpts:\n${context}`,
        text: { format: { type: 'json_schema', name: 'official_answer', strict: true, schema: { type: 'object', additionalProperties: false, properties: { answer: { type: 'string' }, checklist: { type: 'array', items: { type: 'string' }, maxItems: 6 }, used_file_ids: { type: 'array', items: { type: 'string' } } }, required: ['answer', 'checklist', 'used_file_ids'] } } },
      }),
    });
    if (!aiResponse.ok) throw new Error(`Response generation failed: ${aiResponse.status}`);
    const payload = await aiResponse.json() as Record<string, unknown>;
    const parsed = JSON.parse(responseText(payload)) as { answer: string; checklist: string[]; used_file_ids: string[] };
    const used = new Set(parsed.used_file_ids.filter((fileId) => allowedFiles.has(fileId)));
    const citations = sourceRows.filter((row) => used.has(row.openai_file_id)).map((row) => ({ title: `${row.issuer} · ${row.title}`, url: row.url, updatedAt: row.checked_at }));
    if (!citations.length) return json({ status: 'no_official_source', answer: '', checklist: [], citations: [] });
    return json({ status: 'answered', answer: parsed.answer, checklist: parsed.checklist, citations });
  } catch (error) {
    console.error(error);
    return json({ error: 'Unable to answer safely' }, 500);
  }
});
