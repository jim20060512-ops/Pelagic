create table public.notifications (
  id uuid primary key default gen_random_uuid(), recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('like','favorite','comment','follow')),
  dive_log_id uuid references public.dive_logs(id) on delete cascade,
  read_at timestamptz, created_at timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
alter table public.notifications enable row level security;
create policy "users view own notifications" on public.notifications for select to authenticated using (auth.uid() = recipient_id);
create policy "users read own notifications" on public.notifications for update to authenticated using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create or replace function public.notify_dive_owner() returns trigger language plpgsql security definer set search_path = public as $$
declare owner_id uuid; log_id uuid := new.dive_log_id;
begin select user_id into owner_id from public.dive_logs where id = log_id;
if owner_id is not null and owner_id <> new.user_id then insert into public.notifications(recipient_id, actor_id, kind, dive_log_id) values(owner_id, new.user_id, TG_ARGV[0], log_id); end if; return new; end; $$;
create trigger notify_like after insert on public.dive_log_likes for each row execute function public.notify_dive_owner('like');
create trigger notify_favorite after insert on public.dive_log_favorites for each row execute function public.notify_dive_owner('favorite');
create trigger notify_comment after insert on public.dive_log_comments for each row execute function public.notify_dive_owner('comment');
create or replace function public.notify_followed_diver() returns trigger language plpgsql security definer set search_path = public as $$ begin if new.follower_id <> new.following_id then insert into public.notifications(recipient_id, actor_id, kind) values(new.following_id, new.follower_id, 'follow'); end if; return new; end; $$;
create trigger notify_follow after insert on public.follows for each row execute function public.notify_followed_diver();
