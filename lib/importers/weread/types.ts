export type WereadErrorCode =
  | "WEREAD_NOT_CONFIGURED"
  | "WEREAD_UNAUTHORIZED"
  | "WEREAD_RATE_LIMITED"
  | "WEREAD_UPGRADE_REQUIRED"
  | "WEREAD_NETWORK_ERROR"
  | "WEREAD_TIMEOUT"
  | "WEREAD_INVALID_RESPONSE"
  | "WEREAD_SERVICE_ERROR"
  | "WEREAD_STORAGE_ERROR"
  | "WEREAD_INVALID_INPUT"
  | "WEREAD_UNAUTHENTICATED";

export type WereadBookSummary = {
  bookId: string;
  title: string;
  author: string | null;
  coverUrl: string | null;
  category: string | null;
  readUpdateTime: number | null;
  finishReading: boolean;
  secret: boolean;
  sourceUrl: string | null;
};

export type WereadShelf = {
  books: WereadBookSummary[];
  albumCount: number;
  hasArticleCollection: boolean;
  totalEntries: number;
};

export type WereadSearchResults = {
  keyword: string;
  books: WereadBookSummary[];
};

export type WereadReadingMode =
  | "weekly"
  | "monthly"
  | "annually"
  | "overall";

export type WereadStatsBook = {
  title: string;
  author: string | null;
  readTimeSeconds: number;
  isAlbum: boolean;
};

export type WereadStatsCategory = {
  title: string;
  readingTimeSeconds: number;
};

export type WereadReadingStats = {
  mode: WereadReadingMode;
  baseTime: number;
  totalReadTimeSeconds: number;
  readDays: number;
  dayAverageReadTimeSeconds: number | null;
  comparison: number | null;
  topBooks: WereadStatsBook[];
  categories: WereadStatsCategory[];
  readStats: Array<{ label: string; value: string }>;
  importedAt: string;
};

export type WereadChapter = {
  chapterUid: number;
  title: string | null;
};

export type WereadHighlight = {
  bookmarkId: string | null;
  chapterUid: number | null;
  markText: string;
  range: string | null;
  createTime: number | null;
};

export type WereadReview = {
  reviewId: string | null;
  content: string;
  abstract: string | null;
  range: string | null;
  chapterUid: number | null;
  chapterName: string | null;
  createTime: number | null;
  star: number | null;
};

export type WereadBookBundle = {
  book: {
    bookId: string;
    title: string;
    author: string | null;
    coverUrl: string | null;
    description: string | null;
    category: string | null;
    isbn: string | null;
    sourceUrl: string | null;
  };
  progress: {
    progressPercent: number;
    finishTime: number | null;
    readingTimeSeconds: number | null;
    isStartReading: boolean;
  };
  chapters: WereadChapter[];
  highlights: WereadHighlight[];
  reviews: WereadReview[];
  reviewsTruncated: boolean;
};

export type WereadImportResult<T> = {
  success: boolean;
  message: string;
  code?: WereadErrorCode;
  data?: T;
};

export type WereadBookImportResult = WereadImportResult<{
  noteId: string;
  bookId: string;
  title: string;
  quoteCount: number;
  reviewCount: number;
  reviewsTruncated: boolean;
  updated: boolean;
}>;

export type WereadStatsImportResult = WereadImportResult<{
  noteId: string;
  stats: WereadReadingStats;
}>;
