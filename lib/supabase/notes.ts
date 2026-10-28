import type {
  NoteRelationRow,
  NoteWithRelations,
  ProfileRecord,
} from "@/lib/supabase/types";

export const NOTE_RELATION_SELECT = `
  id,
  user_id,
  book_id,
  title,
  summary,
  reflection,
  content,
  visibility,
  source_type,
  source_id,
  created_at,
  updated_at,
  books (
    id,
    owner_id,
    title,
    author,
    isbn,
    cover_url,
    description,
    created_at,
    updated_at
  ),
  note_tags (
    tags (
      id,
      user_id,
      name,
      created_at
    )
  ),
  note_quotes (
    id,
    note_id,
    quote_text,
    location,
    chapter,
    created_at
  )
`;

export function buildNoteWithRelations(
  row: NoteRelationRow,
  author: ProfileRecord,
): NoteWithRelations {
  const { books, note_tags, note_quotes, ...note } = row;
  const book = Array.isArray(books) ? (books[0] ?? null) : books;
  const tags = (note_tags ?? [])
    .map((entry) => entry.tags)
    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));

  return {
    ...note,
    author,
    book,
    tags,
    quotes: note_quotes ?? [],
  };
}

export function createFallbackProfile(id: string): ProfileRecord {
  return {
    id,
    display_name: "读者",
    avatar_url: null,
    bio: null,
    created_at: "",
    updated_at: "",
  };
}