alter table public.dive_logs add column if not exists photo_path text;
update public.dive_logs
set photo_path = regexp_replace(photo_url, '^.*/dive-photos/', '')
where photo_path is null;
alter table public.dive_logs alter column photo_path set not null;

update storage.buckets set public = false where id = 'dive-photos';
drop policy if exists "public dive photos are readable" on storage.objects;
create policy "signed-in users view permitted dive photos" on storage.objects
  for select to authenticated using (
    bucket_id = 'dive-photos' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.dive_logs where photo_path = name and visibility = 'public')
    )
  );
