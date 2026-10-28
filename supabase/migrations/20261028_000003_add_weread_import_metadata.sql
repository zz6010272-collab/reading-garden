-- Stage 6: source metadata for official WeRead Agent Skill imports.
-- RLS remains enabled; existing owner policies cover these new columns.

alter table public.books
add column if not exists book_identifier text,
add column if not exists source_type text,
add column if not exists source_url text;

create unique index if not exists books_owner_source_identifier_uidx
on public.books (owner_id, source_type, book_identifier)
where source_type is not null and book_identifier is not null;

alter table public.notes
add column if not exists source_url text;

create unique index if not exists notes_user_source_uidx
on public.notes (user_id, source_type, source_id)
where source_type is not null and source_id is not null;

alter table public.reading_records
add column if not exists progress_percent smallint;

do $$
begin
  alter table public.reading_records
  add constraint reading_records_progress_percent_check
  check (progress_percent is null or progress_percent between 0 and 100);
exception
  when duplicate_object then null;
end;
$$;
