-- Storage buckets for naslouchač pipeline
-- audio:  private bucket for raw meeting recordings (advisor → signed URL)
-- offers: public bucket for generated PDF nabídky (getPublicUrl)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'audio',
    'audio',
    false,
    524288000, -- 500 MB
    array['audio/mpeg','audio/mp4','audio/m4a','audio/x-m4a','audio/wav','audio/x-wav','audio/webm','audio/ogg','audio/aac','audio/flac']
  ),
  (
    'offers',
    'offers',
    true,
    20971520, -- 20 MB
    array['application/pdf']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- RLS on storage.objects so advisors only see their own audio.
-- Path convention: <advisor_id>/<meeting_id>/<filename>

drop policy if exists "audio: advisor reads own files" on storage.objects;
drop policy if exists "audio: advisor uploads own files" on storage.objects;
drop policy if exists "audio: advisor updates own files" on storage.objects;
drop policy if exists "audio: advisor deletes own files" on storage.objects;
drop policy if exists "audio: service role full access" on storage.objects;
drop policy if exists "offers: public read" on storage.objects;
drop policy if exists "offers: service role full access" on storage.objects;

create policy "audio: advisor reads own files"
  on storage.objects for select
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio: advisor uploads own files"
  on storage.objects for insert
  with check (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio: advisor updates own files"
  on storage.objects for update
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio: advisor deletes own files"
  on storage.objects for delete
  using (
    bucket_id = 'audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio: service role full access"
  on storage.objects for all
  to service_role
  using (bucket_id = 'audio')
  with check (bucket_id = 'audio');

create policy "offers: public read"
  on storage.objects for select
  using (bucket_id = 'offers');

create policy "offers: service role full access"
  on storage.objects for all
  to service_role
  using (bucket_id = 'offers')
  with check (bucket_id = 'offers');
