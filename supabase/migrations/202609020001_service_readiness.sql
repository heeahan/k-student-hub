create table public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_key text not null check (document_key in ('terms', 'privacy', 'community')),
  document_version text not null,
  agreed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, document_key, document_version)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  task_reminders boolean not null default true,
  community_replies boolean not null default true,
  service_notices boolean not null default true,
  marketing boolean not null default false,
  default_anonymous boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('account', 'community', 'official_info', 'privacy', 'other')),
  subject text not null check (char_length(subject) between 2 and 120),
  body text not null check (char_length(body) between 10 and 3000),
  status text not null default 'received' check (status in ('received', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index support_requests_user_idx on public.support_requests (user_id, created_at desc);
create index support_requests_status_idx on public.support_requests (status, created_at);

create trigger support_requests_set_updated_at
before update on public.support_requests
for each row execute function public.set_updated_at();

alter table public.legal_consents enable row level security;
alter table public.user_preferences enable row level security;
alter table public.support_requests enable row level security;

create policy legal_consents_self_read on public.legal_consents for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy legal_consents_self_insert on public.legal_consents for insert to authenticated with check (user_id = auth.uid());
create policy preferences_self_manage on public.user_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy support_requests_self_insert on public.support_requests for insert to authenticated with check (user_id = auth.uid());
create policy support_requests_self_read on public.support_requests for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy support_requests_admin_update on public.support_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
