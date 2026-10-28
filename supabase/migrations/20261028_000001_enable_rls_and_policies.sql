-- 拾页 / Reading Garden
-- Stage 3c: row-level security and private storage policies.

-- ---------------------------------------------------------------------------
-- Enable RLS on all application tables
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.books enable row level security;
alter table public.reading_records enable row level security;
alter table public.notes enable row level security;
alter table public.note_quotes enable row level security;
alter table public.tags enable row level security;
alter table public.note_tags enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.import_jobs enable row level security;
alter table public.private_files enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_all"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Books
-- ---------------------------------------------------------------------------

create policy "books_owner_all"
on public.books
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Reading records
-- ---------------------------------------------------------------------------

create policy "reading_records_owner_all"
on public.reading_records
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Notes
-- ---------------------------------------------------------------------------

create policy "notes_select_visible"
on public.notes
for select
to anon, authenticated
using (
  user_id = auth.uid()
  or visibility in ('public', 'unlisted')
);

create policy "notes_insert_own"
on public.notes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "notes_update_own"
on public.notes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notes_delete_own"
on public.notes
for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Note quotes
-- ---------------------------------------------------------------------------

create policy "note_quotes_owner_all"
on public.note_quotes
for all
to authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = note_quotes.note_id
      and n.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.notes n
    where n.id = note_quotes.note_id
      and n.user_id = auth.uid()
  )
);

create policy "note_quotes_select_visible"
on public.note_quotes
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = note_quotes.note_id
      and n.visibility in ('public', 'unlisted')
  )
);

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------

create policy "tags_owner_all"
on public.tags
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "tags_select_visible"
on public.tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.note_tags nt
    join public.notes n on n.id = nt.note_id
    where nt.tag_id = tags.id
      and n.visibility in ('public', 'unlisted')
  )
);

-- ---------------------------------------------------------------------------
-- Note tags
-- ---------------------------------------------------------------------------

create policy "note_tags_select_visible"
on public.note_tags
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = note_tags.note_id
      and (
        n.user_id = auth.uid()
        or n.visibility in ('public', 'unlisted')
      )
  )
);

create policy "note_tags_insert_own"
on public.note_tags
for insert
to authenticated
with check (
  exists (
    select 1
    from public.notes n
    join public.tags t on t.id = note_tags.tag_id
    where n.id = note_tags.note_id
      and n.user_id = auth.uid()
      and t.user_id = auth.uid()
  )
);

create policy "note_tags_update_own"
on public.note_tags
for update
to authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = note_tags.note_id
      and n.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.notes n
    join public.tags t on t.id = note_tags.tag_id
    where n.id = note_tags.note_id
      and n.user_id = auth.uid()
      and t.user_id = auth.uid()
  )
);

create policy "note_tags_delete_own"
on public.note_tags
for delete
to authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = note_tags.note_id
      and n.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

create policy "comments_select_visible"
on public.comments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.notes n
    where n.id = comments.note_id
      and (
        n.user_id = auth.uid()
        or n.visibility = 'public'
      )
  )
);

create policy "comments_insert_on_readable_note"
on public.comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.notes n
    where n.id = comments.note_id
      and (
        n.user_id = auth.uid()
        or n.visibility in ('public', 'unlisted')
      )
  )
);

create policy "comments_delete_author_or_note_owner"
on public.comments
for delete
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.notes n
    where n.id = comments.note_id
      and n.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Likes
-- ---------------------------------------------------------------------------

create policy "likes_select_all"
on public.likes
for select
to anon, authenticated
using (true);

create policy "likes_insert_own"
on public.likes
for insert
to authenticated
with check (user_id = auth.uid());

create policy "likes_delete_own"
on public.likes
for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Import jobs and private file metadata
-- ---------------------------------------------------------------------------

create policy "import_jobs_owner_all"
on public.import_jobs
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "private_files_owner_all"
on public.private_files
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Private Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('private_files', 'private_files', false, 20971520)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "private_files_storage_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private_files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "private_files_storage_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private_files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "private_files_storage_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private_files'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'private_files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "private_files_storage_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private_files'
  and (storage.foldername(name))[1] = auth.uid()::text
);