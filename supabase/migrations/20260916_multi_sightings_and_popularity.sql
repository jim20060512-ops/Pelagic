-- A dive log is one dive; every image in it is a separately named sighting.
create table if not exists public.dive_log_photos (
  id uuid primary key default gen_random_uuid(),
  dive_log_id uuid not null references public.dive_logs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_path text not null,
  species text not null,
  created_at timestamptz not null default now()
);

create index if not exists dive_log_photos_dive_log_idx on public.dive_log_photos(dive_log_id, created_at);
alter table public.dive_log_photos enable row level security;

create policy "users view permitted dive log photos" on public.dive_log_photos
  for select to authenticated using (
    auth.uid() = user_id
    or exists (select 1 from public.dive_logs where id = dive_log_id and visibility = 'public')
  );
create policy "users add own dive log photos" on public.dive_log_photos
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (select 1 from public.dive_logs where id = dive_log_id and user_id = auth.uid())
  );

-- Preserve every existing log as a one-photo dive.
insert into public.dive_log_photos (dive_log_id, user_id, photo_path, species)
select id, user_id, photo_path, species
from public.dive_logs
where not exists (select 1 from public.dive_log_photos where dive_log_id = dive_logs.id);

alter table public.dive_logs add column if not exists view_count integer not null default 0 check (view_count >= 0);
create index if not exists dive_logs_public_popular_idx on public.dive_logs(view_count desc, dive_date desc) where visibility = 'public';

create or replace function public.increment_dive_log_views(log_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.dive_logs
  set view_count = view_count + 1
  where id = log_id and visibility = 'public';
$$;

grant execute on function public.increment_dive_log_views(uuid) to authenticated;

-- Extra images are private until their parent journal is public.
create policy "signed-in users view permitted sighting photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'dive-photos'
    and exists (
      select 1
      from public.dive_log_photos photo
      join public.dive_logs log on log.id = photo.dive_log_id
      where photo.photo_path = name and log.visibility = 'public'
    )
  );
