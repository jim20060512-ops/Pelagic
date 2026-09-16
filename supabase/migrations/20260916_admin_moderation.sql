-- Server-side permission check used by every moderation policy.
create or replace function public.is_pelagic_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

grant execute on function public.is_pelagic_admin() to authenticated;

create policy "administrators view all dive logs"
  on public.dive_logs for select to authenticated
  using (public.is_pelagic_admin());
create policy "administrators delete any dive log"
  on public.dive_logs for delete to authenticated
  using (public.is_pelagic_admin());
create policy "administrators view all dive log photos"
  on public.dive_log_photos for select to authenticated
  using (public.is_pelagic_admin());
create policy "administrators view all dive photo objects"
  on storage.objects for select to authenticated
  using (bucket_id = 'dive-photos' and public.is_pelagic_admin());
create policy "administrators delete dive photo objects"
  on storage.objects for delete to authenticated
  using (bucket_id = 'dive-photos' and public.is_pelagic_admin());
