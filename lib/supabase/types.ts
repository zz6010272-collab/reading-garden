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