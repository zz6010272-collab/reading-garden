export const readingStatusValues = [
  "want_to_read",
  "reading",
  "finished",
] as const;

export type ReadingStatus = (typeof readingStatusValues)[number];

export type BookRecord = {
  id: string;
  owner_id: string;
  title: string;
  author: string | null;
  isbn: string | null;
  cover_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ReadingRecord = {
  id: string;
  user_id: string;
  book_id: string;
  status: ReadingStatus;
  rating: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

export type BookWithReading = BookRecord & {
  reading_record: ReadingRecord | null;
};

export const readingStatusLabels: Record<ReadingStatus, string> = {
  want_to_read: "想读",
  reading: "在读",
  finished: "已读",
};

export const readingStatusOptions: Array<{
  value: ReadingStatus;
  label: string;
}> = readingStatusValues.map((value) => ({
  value,
  label: readingStatusLabels[value],
}));

export function formatReadingDate(value: string | null): string {
  if (!value) {
    return "——";
  }

  const [year, month, day] = value.slice(0, 10).split("-");

  return year && month && day ? `${year}.${month}.${day}` : value;
}
export type NoteVisibility = "private" | "public" | "unlisted";

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteRecord = {
  id: string;
  user_id: string;
  book_id: string | null;
  title: string;
  summary: string | null;
  reflection: string | null;
  content: string | null;
  visibility: NoteVisibility;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
};

export type TagRecord = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type NoteQuoteRecord = {
  id: string;
  note_id: string;
  quote_text: string | null;
  location: string | null;
  chapter: string | null;
  created_at: string;
};

export type NoteWithRelations = NoteRecord & {
  author: ProfileRecord;
  book: BookRecord | null;
  tags: TagRecord[];
  quotes: NoteQuoteRecord[];
};

export type NoteRelationRow = NoteRecord & {
  books: BookRecord[] | BookRecord | null;
  note_tags: Array<{ tags: TagRecord | null }> | null;
  note_quotes: NoteQuoteRecord[] | null;
};

export const noteVisibilityLabels: Record<NoteVisibility, string> = {
  private: "私密",
  public: "公开",
  unlisted: "仅链接",
};

export function noteVisibilityClassName(visibility: NoteVisibility) {
  if (visibility === "public") {
    return "border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]";
  }

  if (visibility === "unlisted") {
    return "border-[#e4d8bd] bg-[#f3ead5] text-[#7c6841]";
  }

  return "border-[#ddd4cc] bg-[#eee9e5] text-[#78655d]";
}