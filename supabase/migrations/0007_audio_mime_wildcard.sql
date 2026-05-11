-- Browsery (Safari, Chrome) posílají MediaRecorder MIME types s codec parametry
-- (např. "audio/mp4;codecs=opus", "audio/webm;codecs=opus"). Supabase Storage
-- exact-match allowlist je neakceptuje. Wildcard "audio/*" pokryje všechno.

update storage.buckets
   set allowed_mime_types = array['audio/*']
 where id = 'audio';
