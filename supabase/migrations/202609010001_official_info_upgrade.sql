alter table public.official_sources
  add column if not exists review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'approved', 'rejected', 'expired')),
  add column if not exists source_format text
    check (source_format is null or source_format in ('html', 'pdf', 'text')),
  add column if not exists content_checksum text,
  add column if not exists last_ingested_at timestamptz;

create unique index if not exists official_sources_url_version_idx
  on public.official_sources (url, version);

create index if not exists official_sources_answerable_idx
  on public.official_sources (active, review_status, effective_to, checked_at desc);

comment on column public.official_sources.review_status is
  'Human editorial approval state. AI retrieval requires approved and active.';

comment on column public.official_sources.content_checksum is
  'SHA-256 of the exact content sent to the vector store.';
