-- Track imported file fingerprints so repeated uploads can be rejected.
alter table public.private_files
add column if not exists content_hash text;

create unique index if not exists private_files_user_content_hash_uidx
on public.private_files (user_id, content_hash)
where content_hash is not null;