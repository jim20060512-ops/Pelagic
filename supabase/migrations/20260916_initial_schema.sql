create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.dive_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  photo_url text not null,
  species text not null,
  dive_date date not null,
  max_depth_m numeric(5,1) not null check (max_depth_m >= 0),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  location_name text not null,
  visibility text not null default 'private' check (visibility in ('private', 'followers', 'public')),
  created_at timestamptz not null default now()
);

create index dive_logs_user_date_idx on public.dive_logs(user_id, dive_date desc);
create index dive_logs_public_location_idx on public.dive_logs(latitude, longitude) where visibility = 'public';

alter table public.profiles enable row level security;
alter table public.dive_logs enable row level security;

create policy "profiles are public to signed-in users" on public.profiles for select to authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "users view own and public logs" on public.dive_logs for select to authenticated using (auth.uid() = user_id or visibility = 'public');
create policy "users create own logs" on public.dive_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own logs" on public.dive_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users delete own logs" on public.dive_logs for delete to authenticated using (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values ('dive-photos', 'dive-photos', true) on conflict (id) do nothing;
create policy "users upload own dive photos" on storage.objects for insert to authenticated with check (bucket_id = 'dive-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "public dive photos are readable" on storage.objects for select to public using (bucket_id = 'dive-photos');
create policy "users delete own dive photos" on storage.objects for delete to authenticated using (bucket_id = 'dive-photos' and (storage.foldername(name))[1] = auth.uid()::text);
