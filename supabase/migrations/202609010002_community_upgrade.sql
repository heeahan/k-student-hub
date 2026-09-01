alter table public.comments
  add column if not exists author_display_name text not null default 'Student',
  add column if not exists is_anonymous boolean not null default false;

create index if not exists comments_status_post_idx
  on public.comments (status, post_id, created_at);

drop policy if exists posts_visible_read on public.posts;
create policy posts_visible_read on public.posts for select using (
  (status = 'published' or author_id = auth.uid() or public.is_admin())
  and (
    visibility = 'public'
    or author_id = auth.uid()
    or exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and viewer.university_id = posts.university_id
    )
  )
  and (
    auth.uid() is null
    or not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = posts.author_id
    )
  )
);

drop policy if exists comments_visible_read on public.comments;
create policy comments_visible_read on public.comments for select using (
  (status = 'published' or author_id = auth.uid() or public.is_admin())
  and exists (
    select 1 from public.posts visible_post
    where visible_post.id = comments.post_id
  )
  and (
    auth.uid() is null
    or not exists (
      select 1 from public.user_blocks b
      where b.blocker_id = auth.uid() and b.blocked_id = comments.author_id
    )
  )
);

comment on column public.comments.author_display_name is
  'Public snapshot of the display name at comment creation time; use the anonymous label when is_anonymous is true.';
