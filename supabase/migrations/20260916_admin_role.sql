-- Administrator accounts are assigned here, not in browser code. Only the
-- account itself can read its role; changes require a trusted database migration.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "users read their own administrator role"
  on public.admin_users for select to authenticated
  using (auth.uid() = user_id);

insert into public.admin_users (user_id)
select id from auth.users
where lower(email) = lower('jim20060512@gmail.com')
on conflict (user_id) do nothing;
