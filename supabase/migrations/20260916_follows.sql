create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self_follow check (follower_id != following_id)
);

alter table public.follows enable row level security;

create policy "users see own follows" on public.follows
  for select to authenticated using (follower_id = auth.uid());
create policy "users follow from own account" on public.follows
  for insert to authenticated with check (follower_id = auth.uid());
create policy "users unfollow from own account" on public.follows
  for delete to authenticated using (follower_id = auth.uid());
