create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.universities (
  id uuid primary key default gen_random_uuid(),
  name_ko text not null,
  name_en text not null,
  region text not null,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.university_email_domains (
  id uuid primary key default gen_random_uuid(),
  university_id uuid not null references public.universities(id) on delete cascade,
  domain text not null unique check (domain = lower(domain)),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ko', 'zh', 'vi', 'ja')),
  university_id uuid references public.universities(id) on delete set null,
  visa_type text check (visa_type in ('D-2', 'D-4', 'D-10', 'E-7') or visa_type is null),
  visa_expires_on date,
  region text,
  onboarding_completed boolean not null default false,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator', 'source_editor', 'admin')),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_roles where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table public.student_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  email_domain text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, university_id)
);

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_display_name text not null check (char_length(author_display_name) between 2 and 30),
  is_anonymous boolean not null default false,
  university_id uuid references public.universities(id) on delete set null,
  category text not null check (category in ('campus', 'visa', 'housing', 'work', 'life', 'friends')),
  title text not null check (char_length(title) between 2 and 120),
  content text not null check (char_length(content) between 2 and 5000),
  language text not null default 'en',
  visibility text not null default 'public' check (visibility in ('public', 'university')),
  status text not null default 'published' check (status in ('pending', 'published', 'hidden', 'deleted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index posts_feed_idx on public.posts (status, created_at desc);
create index posts_university_idx on public.posts (university_id, created_at desc);
create trigger posts_set_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  language text not null default 'en',
  status text not null default 'published' check (status in ('pending', 'published', 'hidden', 'deleted')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index comments_post_idx on public.comments (post_id, created_at);
create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create table public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null default 'like' check (reaction = 'like'),
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table public.bookmarks (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (post_id, user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reported_user_id uuid references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'hate', 'sexual', 'scam', 'privacy', 'misinformation', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz,
  check (num_nonnulls(post_id, comment_id, reported_user_id) = 1)
);

create index reports_status_idx on public.reports (status, created_at);

create table public.content_translations (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  target_language text not null,
  translated_title text,
  translated_content text not null,
  model text,
  created_at timestamptz not null default timezone('utc', now()),
  unique nulls not distinct (post_id, comment_id, target_language),
  check (num_nonnulls(post_id, comment_id) = 1)
);

create table public.official_sources (
  id uuid primary key default gen_random_uuid(),
  issuer text not null,
  title text not null,
  url text not null,
  document_type text not null check (document_type in ('law', 'decree', 'rule', 'notice', 'manual', 'faq')),
  visa_codes text[] not null default '{}',
  language text not null default 'ko',
  effective_from date,
  effective_to date,
  published_on date,
  checked_at timestamptz not null default timezone('utc', now()),
  active boolean not null default true,
  license_type text,
  openai_file_id text unique,
  version text not null default '1',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger official_sources_set_updated_at
before update on public.official_sources
for each row execute function public.set_updated_at();

create table public.source_versions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.official_sources(id) on delete cascade,
  version text not null,
  checksum text,
  object_path text,
  captured_at timestamptz not null default timezone('utc', now()),
  unique (source_id, version)
);

create table public.timeline_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_en text not null,
  title_ko text not null,
  description_en text not null,
  description_ko text not null,
  visa_codes text[] not null default '{}',
  offset_days integer not null default 0,
  anchor text not null check (anchor in ('visa_expiry', 'arrival', 'graduation', 'manual')),
  source_id uuid references public.official_sources(id) on delete set null,
  conditions jsonb not null default '{}',
  active boolean not null default true,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger timeline_rules_set_updated_at
before update on public.timeline_rules
for each row execute function public.set_updated_at();

create table public.user_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid references public.timeline_rules(id) on delete set null,
  title text not null,
  description text not null,
  due_on date,
  status text not null default 'todo' check (status in ('todo', 'done', 'snoozed')),
  remind_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index user_tasks_due_idx on public.user_tasks (user_id, status, due_on);
create trigger user_tasks_set_updated_at
before update on public.user_tasks
for each row execute function public.set_updated_at();

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger push_tokens_set_updated_at
before update on public.push_tokens
for each row execute function public.set_updated_at();

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  language text not null default 'en',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger chat_sessions_set_updated_at
before update on public.chat_sessions
for each row execute function public.set_updated_at();

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  structured_answer jsonb,
  source_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create table public.chat_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating text not null check (rating in ('helpful', 'incorrect', 'outdated', 'unsafe')),
  details text check (char_length(details) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  unique (message_id, user_id)
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete restrict,
  report_id uuid references public.reports(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id uuid not null,
  action text not null check (action in ('hide', 'restore', 'warn', 'restrict', 'ban', 'dismiss')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.universities enable row level security;
alter table public.university_email_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.student_verifications enable row level security;
alter table public.user_blocks enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.reports enable row level security;
alter table public.content_translations enable row level security;
alter table public.official_sources enable row level security;
alter table public.source_versions enable row level security;
alter table public.timeline_rules enable row level security;
alter table public.user_tasks enable row level security;
alter table public.push_tokens enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_feedback enable row level security;
alter table public.moderation_actions enable row level security;

create policy universities_public_read on public.universities for select using (active or public.is_admin());
create policy university_domains_read on public.university_email_domains for select to authenticated using (active or public.is_admin());
create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy admin_roles_self_read on public.admin_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy verifications_self_read on public.student_verifications for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy verifications_self_insert on public.student_verifications for insert to authenticated with check (user_id = auth.uid());
create policy blocks_self_manage on public.user_blocks for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create policy posts_visible_read on public.posts for select using (
  (status = 'published' or author_id = auth.uid() or public.is_admin())
  and (
    auth.uid() is null
    or not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = posts.author_id
    )
  )
);
create policy posts_author_insert on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy posts_author_update on public.posts for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy posts_author_delete on public.posts for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy comments_visible_read on public.comments for select using (
  (status = 'published' or author_id = auth.uid() or public.is_admin())
  and (
    auth.uid() is null
    or not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = comments.author_id
    )
  )
);
create policy comments_author_insert on public.comments for insert to authenticated with check (author_id = auth.uid());
create policy comments_author_update on public.comments for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());
create policy comments_author_delete on public.comments for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create policy reactions_public_read on public.post_reactions for select using (true);
create policy reactions_self_manage on public.post_reactions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy bookmarks_self_manage on public.bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reports_self_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_owner_or_admin_read on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
create policy reports_admin_update on public.reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy translations_visible_read on public.content_translations for select using (true);
create policy translations_admin_write on public.content_translations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy official_sources_public_read on public.official_sources for select using (active or public.is_admin());
create policy official_sources_admin_write on public.official_sources for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy source_versions_admin_read on public.source_versions for select to authenticated using (public.is_admin());
create policy source_versions_admin_write on public.source_versions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy timeline_rules_public_read on public.timeline_rules for select using (active or public.is_admin());
create policy timeline_rules_admin_write on public.timeline_rules for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy user_tasks_self_manage on public.user_tasks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_self_manage on public.push_tokens for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_sessions_self_manage on public.chat_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_messages_self_manage on public.chat_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy chat_feedback_self_manage on public.chat_feedback for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy moderation_actions_admin on public.moderation_actions for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'New student'))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
