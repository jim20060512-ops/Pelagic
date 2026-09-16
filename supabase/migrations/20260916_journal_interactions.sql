alter table public.dive_logs add column if not exists like_count integer not null default 0 check (like_count >= 0);
alter table public.dive_logs add column if not exists favorite_count integer not null default 0 check (favorite_count >= 0);
alter table public.dive_logs add column if not exists comment_count integer not null default 0 check (comment_count >= 0);

create table if not exists public.dive_log_likes (
  dive_log_id uuid not null references public.dive_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (dive_log_id, user_id)
);
create table if not exists public.dive_log_favorites (
  dive_log_id uuid not null references public.dive_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (dive_log_id, user_id)
);
create table if not exists public.dive_log_comments (
  id uuid primary key default gen_random_uuid(),
  dive_log_id uuid not null references public.dive_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.dive_log_likes enable row level security;
alter table public.dive_log_favorites enable row level security;
alter table public.dive_log_comments enable row level security;

create policy "signed-in users view public likes" on public.dive_log_likes for select to authenticated using (exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public'));
create policy "users add own likes" on public.dive_log_likes for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public'));
create policy "users remove own likes" on public.dive_log_likes for delete to authenticated using (auth.uid() = user_id);
create policy "users view own or public favorites" on public.dive_log_favorites for select to authenticated using (auth.uid() = user_id or exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public'));
create policy "users add own favorites" on public.dive_log_favorites for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public'));
create policy "users remove own favorites" on public.dive_log_favorites for delete to authenticated using (auth.uid() = user_id);
create policy "signed-in users view public comments" on public.dive_log_comments for select to authenticated using (exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public'));
create policy "users add own public comments" on public.dive_log_comments for insert to authenticated with check (auth.uid() = user_id and exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public'));
create policy "users remove own comments" on public.dive_log_comments for delete to authenticated using (auth.uid() = user_id);

create or replace function public.refresh_dive_log_interaction_counts() returns trigger language plpgsql security definer set search_path = public as $$
declare target uuid := coalesce(new.dive_log_id, old.dive_log_id);
begin
  update public.dive_logs set
    like_count = (select count(*) from public.dive_log_likes where dive_log_id = target),
    favorite_count = (select count(*) from public.dive_log_favorites where dive_log_id = target),
    comment_count = (select count(*) from public.dive_log_comments where dive_log_id = target)
  where id = target;
  return coalesce(new, old);
end; $$;
create trigger refresh_like_counts after insert or delete on public.dive_log_likes for each row execute function public.refresh_dive_log_interaction_counts();
create trigger refresh_favorite_counts after insert or delete on public.dive_log_favorites for each row execute function public.refresh_dive_log_interaction_counts();
create trigger refresh_comment_counts after insert or delete on public.dive_log_comments for each row execute function public.refresh_dive_log_interaction_counts();
