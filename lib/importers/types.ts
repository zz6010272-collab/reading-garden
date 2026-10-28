export const importSourceTypes = [
  "pdf",
  "txt",
  "markdown",
  "weread",
  "browser_extension",
] as const;

export type ImportSourceType = (typeof importSourceTypes)[number];

export type NormalizedQuote = {
  quoteText: string;
  chapter: string | null;
  location: string | null;
};

export type NormalizedReadingRecord = {
  status: "want_to_read" | "reading" | "finished";
  progressPercent: number | null;
  rating: number | null;
  finishedAt: string | null;
};

export type NormalizedNote = {
  title: string;
  summary: string | null;
  content: string | null;
  sourceId: string;
  sourceUrl: string | null;
  quotes: NormalizedQuote[];
};

export type NormalizedImport = {
  sourceType: ImportSourceType;
  sourceId: string;
  sourceUrl: string | null;
  importedAt: string;
  title: string;
  author: string | null;
  bookIdentifier: string | null;
  description: string | null;
  coverUrl: string | null;
  readingRecord: NormalizedReadingRecord | null;
  note: NormalizedNote | null;
};
