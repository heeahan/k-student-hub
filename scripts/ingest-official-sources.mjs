import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const registryPath = fileURLToPath(new URL('../config/official-sources.json', import.meta.url));
const dryRun = process.argv.includes('--dry-run');
const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const allowedHosts = new Set([
  'hikorea.go.kr',
  'www.hikorea.go.kr',
  'studyinkorea.go.kr',
  'www.studyinkorea.go.kr',
  'moj.go.kr',
  'www.moj.go.kr',
  'mojhome.moj.go.kr',
  'law.go.kr',
  'www.law.go.kr',
]);

validateRegistry(registry.sources);
const approvedSources = registry.sources.filter((source) => source.reviewStatus === 'approved' && source.active);

if (dryRun) {
  console.log(`Registry: ${registry.sources.length} source(s)`);
  for (const source of registry.sources) {
    console.log(`${source.reviewStatus.padEnd(12)} ${source.active ? 'active  ' : 'inactive'} ${source.issuer} · ${source.title}`);
  }
  console.log(`Ready to ingest: ${approvedSources.length} source(s)`);
  process.exit(0);
}

if (!approvedSources.length) {
  throw new Error('No approved active sources. A human editor must verify freshness and reuse rights before changing reviewStatus to approved.');
}

const openAiApiKey = requireEnv('OPENAI_API_KEY');
const vectorStoreId = requireEnv('OPENAI_VECTOR_STORE_ID');
const supabaseUrl = requireEnv('SUPABASE_URL').replace(/\/$/, '');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

let completed = 0;
for (const source of approvedSources) {
  console.log(`Ingesting ${source.id}...`);
  const downloaded = await downloadSource(source);
  const checksum = createHash('sha256').update(downloaded.bytes).digest('hex');
  const uploadedFile = await uploadOpenAiFile(source, downloaded);
  await attachToVectorStore(source, uploadedFile.id);
  await waitForIndexing(uploadedFile.id);
  await upsertSourceMetadata(source, uploadedFile.id, checksum);
  completed += 1;
  console.log(`Completed ${source.id} (${uploadedFile.id})`);
}

console.log(`Finished: ${completed}/${approvedSources.length} source(s)`);

function validateRegistry(sources) {
  const ids = new Set();
  for (const source of sources) {
    if (ids.has(source.id)) throw new Error(`Duplicate source id: ${source.id}`);
    ids.add(source.id);
    for (const field of ['id', 'issuer', 'title', 'canonicalUrl', 'downloadUrl', 'documentType', 'sourceFormat', 'language', 'version', 'reviewStatus']) {
      if (!source[field]) throw new Error(`Missing ${field} in ${source.id ?? 'unknown source'}`);
    }
    validateOfficialUrl(source.canonicalUrl);
    validateOfficialUrl(source.downloadUrl);
    if (!['html', 'pdf'].includes(source.sourceFormat)) throw new Error(`Unsupported sourceFormat in ${source.id}`);
    if (source.reviewStatus === 'approved' && !source.reuseBasis) throw new Error(`Approved source is missing reuseBasis: ${source.id}`);
  }
}

function validateOfficialUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname.toLowerCase())) {
    throw new Error(`Blocked non-official URL: ${rawUrl}`);
  }
  return url;
}

async function downloadSource(source) {
  const response = await fetch(source.downloadUrl, {
    redirect: 'follow',
    signal: AbortSignal.timeout(60_000),
    headers: { 'User-Agent': 'KStudentHub-SourceIndexer/1.0 (+official source review)' },
  });
  if (!response.ok) throw new Error(`Download failed for ${source.id}: HTTP ${response.status}`);
  validateOfficialUrl(response.url);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`Downloaded an empty source: ${source.id}`);
  if (bytes.length > 25 * 1024 * 1024) throw new Error(`Source exceeds 25 MB limit: ${source.id}`);

  if (source.sourceFormat === 'pdf') {
    if (bytes.subarray(0, 4).toString('ascii') !== '%PDF') throw new Error(`Expected a PDF but received another format: ${source.id}`);
    return { bytes, filename: `${safeFilename(source.id)}-${safeFilename(source.version)}.pdf`, type: 'application/pdf' };
  }

  const charset = response.headers.get('content-type')?.match(/charset=([^;]+)/i)?.[1]?.trim() ?? 'utf-8';
  let html;
  try { html = new TextDecoder(charset).decode(bytes); }
  catch { html = new TextDecoder('utf-8').decode(bytes); }
  const text = cleanHtml(html);
  if (text.length < 200) throw new Error(`HTML extraction produced too little text: ${source.id}`);
  const document = [
    `Issuer: ${source.issuer}`,
    `Title: ${source.title}`,
    `Canonical URL: ${source.canonicalUrl}`,
    `Reviewed at: ${source.reviewedAt}`,
    '',
    text,
  ].join('\n');
  return {
    bytes: Buffer.from(document, 'utf8'),
    filename: `${safeFilename(source.id)}-${safeFilename(source.version)}.txt`,
    type: 'text/plain',
  };
}

function cleanHtml(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

async function uploadOpenAiFile(source, downloaded) {
  const form = new FormData();
  form.append('purpose', 'assistants');
  form.append('file', new Blob([downloaded.bytes], { type: downloaded.type }), downloaded.filename);
  return openAiRequest('/files', { method: 'POST', body: form, json: false }, `file upload for ${source.id}`);
}

async function attachToVectorStore(source, fileId) {
  return openAiRequest(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files`, {
    method: 'POST',
    body: JSON.stringify({
      file_id: fileId,
      attributes: {
        source_id: source.id,
        issuer: source.issuer,
        document_type: source.documentType,
        version: source.version,
        language: source.language,
        reviewed_at: source.reviewedAt,
      },
    }),
  }, `vector-store attachment for ${source.id}`);
}

async function waitForIndexing(fileId) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const state = await openAiRequest(`/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(fileId)}`, { method: 'GET' }, `index status for ${fileId}`);
    if (state.status === 'completed') return;
    if (state.status === 'failed' || state.status === 'cancelled') throw new Error(`Vector indexing ${state.status}: ${fileId}`);
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Vector indexing timed out: ${fileId}`);
}

async function openAiRequest(path, init, label) {
  const headers = { Authorization: `Bearer ${openAiApiKey}` };
  if (init.json !== false) headers['Content-Type'] = 'application/json';
  const response = await fetch(`https://api.openai.com/v1${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) }, signal: AbortSignal.timeout(60_000) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status} ${payload.error?.message ?? ''}`.trim());
  return payload;
}

async function upsertSourceMetadata(source, fileId, checksum) {
  const sourceRows = await supabaseRequest('/rest/v1/official_sources?on_conflict=url,version', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      issuer: source.issuer,
      title: source.title,
      url: source.canonicalUrl,
      document_type: source.documentType,
      source_format: source.sourceFormat,
      visa_codes: source.visaCodes,
      language: source.language,
      published_on: source.publishedOn,
      checked_at: source.reviewedAt,
      active: source.active,
      license_type: source.reuseBasis,
      review_status: source.reviewStatus,
      openai_file_id: fileId,
      version: source.version,
      content_checksum: checksum,
      last_ingested_at: new Date().toISOString(),
    }),
  }, `metadata upsert for ${source.id}`);
  const sourceId = sourceRows[0]?.id;
  if (!sourceId) throw new Error(`Supabase did not return a source id for ${source.id}`);

  await supabaseRequest('/rest/v1/source_versions?on_conflict=source_id,version', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      source_id: sourceId,
      version: source.version,
      checksum,
      object_path: `openai://${vectorStoreId}/${fileId}`,
      captured_at: new Date().toISOString(),
    }),
  }, `version upsert for ${source.id}`);
}

async function supabaseRequest(path, init, label) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${label} failed: HTTP ${response.status} ${text}`.trim());
  return text ? JSON.parse(text) : null;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function safeFilename(value) {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
