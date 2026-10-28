-- 拾页 / Reading Garden
-- Stage 3b: core tables, constraints, indexes, and triggers.
-- RLS policies are intentionally deferred to the next stage.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid()
    references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  author text,
  isbn text,
  cover_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reading_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  status text not null default 'want_to_read'
    check (status in ('want_to_read', 'reading', 'finished')),
  rating smallint check (rating is null or rating between 1 and 5),
  started_at date,
  finished_at date,
  created_at timestamptz not null default now(),
  constraint reading_records_user_book_unique unique (user_id, book_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  book_id uuid references public.books (id) on delete cascade,
  title text not null,
  summary text,
  reflection text,
  content text,
  visibility text not null default 'private'
    check (visibility in ('private', 'public', 'unlisted')),
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.note_quotes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  quote_text text,
  location text,
  chapter text,
  created_at timestamptz not null default now()
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint tags_user_name_unique unique (user_id, name)
);

create table public.note_tags (
  note_id uuid not null references public.notes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, tag_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.likes (
  note_id uuid not null references public.notes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (note_id, user_id)
);

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text,
  status text,
  error text,
  created_at timestamptz not null default now()
);

create table public.private_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  mime_type text,
  size bigint,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index books_owner_id_idx on public.books (owner_id);
create index reading_records_book_id_idx on public.reading_records (book_id);
create index notes_user_id_idx on public.notes (user_id);
create index notes_book_id_idx on public.notes (book_id);
create index notes_visibility_idx on public.notes (visibility);
create index note_quotes_note_id_idx on public.note_quotes (note_id);
create index note_tags_tag_id_idx on public.note_tags (tag_id);
create index comments_note_id_created_at_idx on public.comments (note_id, created_at);
create index comments_user_id_idx on public.comments (user_id);
create index likes_user_id_idx on public.likes (user_id);
create index import_jobs_user_id_created_at_idx on public.import_jobs (user_id, created_at);
create index private_files_user_id_idx on public.private_files (user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

create trigger books_set_updated_at
before update on public.books
for each row
execute function public.update_updated_at_column();

create trigger notes_set_updated_at
before update on public.notes
for each row
execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- Create a profile after a new auth user is created
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '新读者'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();