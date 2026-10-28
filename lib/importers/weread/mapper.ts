import type { NormalizedImport } from "../types";
import type {
  WereadBookBundle,
  WereadBookSummary,
  WereadReadingMode,
  WereadReadingStats,
  WereadShelf,
  WereadSearchResults,
} from "./types";

type ShelfBookRow = {
  bookId: string;
  title: string;
  author?: string | null;
  cover?: string | null;
  category?: string | null;
  readUpdateTime?: number | string | null;
  finishReading?: number | string | null;
  secret?: number | string | null;
  readerLink?: string | null;
  deepLink?: string | null;
};

type ShelfAlbumRow = {
  albumInfo?: {
    albumId?: string | null;
    name?: string | null;
    authorName?: string | null;
    cover?: string | null;
  } | null;
  albumInfoExtra?: { secret?: number | string | null } | null;
};

export type ShelfResponseData = {
  books?: ShelfBookRow[];
  albums?: ShelfAlbumRow[];
  mp?: unknown;
};

type SearchBookRow = {
  bookInfo?: {
    bookId: string;
    title: string;
    author?: string | null;
    cover?: string | null;
    category?: string | null;
    intro?: string | null;
    readerLink?: string | null;
    deepLink?: string | null;
  } | null;
};

export type SearchResponseData = {
  results?: Array<{ books?: SearchBookRow[] }>;
};

type BookInfoResponseData = {
  bookId: string;
  title: string;
  author?: string | null;
  cover?: string | null;
  intro?: string | null;
  category?: string | null;
  isbn?: string | null;
  readerLink?: string | null;
  deepLink?: string | null;
};

type BookProgressResponseData = {
  book?: {
    progress?: number | string | null;
    finishTime?: number | string | null;
    recordReadingTime?: number | string | null;
    isStartReading?: boolean | number | string | null;
  } | null;
};

type BookmarkResponseData = {
  updated?: Array<{
    bookmarkId?: string | null;
    chapterUid?: number | string | null;
    markText?: string | null;
    createTime?: number | string | null;
    range?: string | null;
  }>;
  chapters?: Array<{
    chapterUid?: number | string | null;
    title?: string | null;
  }>;
};

type ReviewResponseData = {
  reviews?: Array<{
    review?: {
      reviewId?: string | null;
      content?: string | null;
      abstract?: string | null;
      range?: string | null;
      chapterUid?: number | string | null;
      chapterName?: string | null;
      createTime?: number | string | null;
      star?: number | string | null;
    } | null;
  }>;
};

type ReadingStatsResponseData = {
  baseTime?: number | string | null;
  readDays?: number | string | null;
  totalReadTime?: number | string | null;
  dayAverageReadTime?: number | string | null;
  compare?: number | string | null;
  readLongest?: Array<{
    book?: {
      bookId?: string | null;
      title?: string | null;
      author?: string | null;
    } | null;
    albumInfo?: {
      albumId?: string | null;
      name?: string | null;
      authorName?: string | null;
    } | null;
    readTime?: number | string | null;
  }>;
  readStat?: Array<{
    stat?: string | null;
    counts?: string | null;
  }>;
  preferCategory?: Array<{
    categoryTitle?: string | null;
    readingTime?: number | string | null;
  }>;
};

function stringOrNull(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function integerOrNull(value: unknown): number | null {
  const parsed = finiteNumber(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function booleanish(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function validHttpUrl(value: unknown): string | null {
  const normalized = stringOrNull(value);

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function preferredLink(readerLink: unknown, deepLink: unknown): string | null {
  return validHttpUrl(readerLink) ?? validHttpUrl(deepLink);
}

function hasArticleCollection(mp: unknown): boolean {
  if (!mp) {
    return false;
  }

  if (Array.isArray(mp)) {
    return mp.length > 0;
  }

  return typeof mp !== "object" || Object.keys(mp).length > 0;
}
function toBookSummary(row: ShelfBookRow): WereadBookSummary {
  return {
    bookId: row.bookId,
    title: row.title,
    author: stringOrNull(row.author),
    coverUrl: validHttpUrl(row.cover),
    category: stringOrNull(row.category),
    readUpdateTime: integerOrNull(row.readUpdateTime),
    finishReading: booleanish(row.finishReading),
    secret: booleanish(row.secret),
    sourceUrl: preferredLink(row.readerLink, row.deepLink),
  };
}

export function mapShelfResponse(data: ShelfResponseData): WereadShelf {
  const books = (data.books ?? []).map(toBookSummary);
  const albumCount = data.albums?.length ?? 0;
  const articleCollection = hasArticleCollection(data.mp);

  return {
    books,
    albumCount,
    hasArticleCollection: articleCollection,
    totalEntries: books.length + albumCount + (articleCollection ? 1 : 0),
  };
}

export function mapSearchResponse(
  keyword: string,
  data: SearchResponseData,
): WereadSearchResults {
  const books: WereadBookSummary[] = [];
  const seen = new Set<string>();

  for (const group of data.results ?? []) {
    for (const item of group.books ?? []) {
      const info = item.bookInfo;

      if (!info || seen.has(info.bookId)) {
        continue;
      }

      seen.add(info.bookId);
      books.push({
        bookId: info.bookId,
        title: info.title,
        author: stringOrNull(info.author),
        coverUrl: validHttpUrl(info.cover),
        category: stringOrNull(info.category),
        readUpdateTime: null,
        finishReading: false,
        secret: false,
        sourceUrl: preferredLink(info.readerLink, info.deepLink),
      });
    }
  }

  return { keyword, books };
}

function unixSecondsToDate(value: unknown): string | null {
  const timestamp = finiteNumber(value);

  if (timestamp === null || timestamp <= 0) {
    return null;
  }

  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function chapterTitleMap(data: BookmarkResponseData): Map<number, string> {
  const result = new Map<number, string>();

  for (const chapter of data.chapters ?? []) {
    const chapterUid = integerOrNull(chapter.chapterUid);
    const title = stringOrNull(chapter.title);

    if (chapterUid !== null && title) {
      result.set(chapterUid, title);
    }
  }

  return result;
}
export function mapBookBundle(
  info: BookInfoResponseData,
  progressData: BookProgressResponseData,
  bookmarks: BookmarkResponseData,
  reviewsData: ReviewResponseData,
  reviewsTruncated: boolean,
): WereadBookBundle {
  const progress = finiteNumber(progressData.book?.progress) ?? 0;
  const normalizedProgress = Math.min(100, Math.max(0, Math.trunc(progress)));
  const chapters = (bookmarks.chapters ?? [])
    .map((chapter) => ({
      chapterUid: integerOrNull(chapter.chapterUid),
      title: stringOrNull(chapter.title),
    }))
    .filter(
      (chapter): chapter is { chapterUid: number; title: string | null } =>
        chapter.chapterUid !== null,
    );

  const highlights = (bookmarks.updated ?? [])
    .map((highlight) => ({
      bookmarkId: stringOrNull(highlight.bookmarkId),
      chapterUid: integerOrNull(highlight.chapterUid),
      markText: stringOrNull(highlight.markText),
      range: stringOrNull(highlight.range),
      createTime: integerOrNull(highlight.createTime),
    }))
    .filter(
      (highlight): highlight is typeof highlight & { markText: string } =>
        Boolean(highlight.markText),
    );

  const reviews = (reviewsData.reviews ?? [])
    .map((item) => item.review)
    .filter((review): review is NonNullable<typeof review> => Boolean(review))
    .map((review) => ({
      reviewId: stringOrNull(review.reviewId),
      content: stringOrNull(review.content) ?? "",
      abstract: stringOrNull(review.abstract),
      range: stringOrNull(review.range),
      chapterUid: integerOrNull(review.chapterUid),
      chapterName: stringOrNull(review.chapterName),
      createTime: integerOrNull(review.createTime),
      star: integerOrNull(review.star),
    }))
    .filter((review) => Boolean(review.content || review.abstract));

  return {
    book: {
      bookId: info.bookId,
      title: info.title,
      author: stringOrNull(info.author),
      coverUrl: validHttpUrl(info.cover),
      description: stringOrNull(info.intro),
      category: stringOrNull(info.category),
      isbn: stringOrNull(info.isbn),
      sourceUrl: preferredLink(info.readerLink, info.deepLink),
    },
    progress: {
      progressPercent: normalizedProgress,
      finishTime: integerOrNull(progressData.book?.finishTime),
      readingTimeSeconds: integerOrNull(progressData.book?.recordReadingTime),
      isStartReading: booleanish(progressData.book?.isStartReading),
    },
    chapters,
    highlights,
    reviews,
    reviewsTruncated,
  };
}
function readingStatus(
  bundle: WereadBookBundle,
): "want_to_read" | "reading" | "finished" {
  if (bundle.progress.progressPercent >= 100 || bundle.progress.finishTime) {
    return "finished";
  }

  if (
    bundle.progress.progressPercent > 0 ||
    bundle.progress.isStartReading ||
    bundle.highlights.length > 0 ||
    bundle.reviews.length > 0
  ) {
    return "reading";
  }

  return "want_to_read";
}

function reviewRating(bundle: WereadBookBundle): number | null {
  for (const review of bundle.reviews) {
    if (review.star !== null && review.star >= 1 && review.star <= 5) {
      return review.star;
    }
  }

  return null;
}

function buildReviewMarkdown(bundle: WereadBookBundle): string | null {
  const sections = bundle.reviews
    .filter((review) => review.content)
    .map((review, index) => {
      const heading = review.chapterName
        ? `### ${review.chapterName}`
        : `### 想法 ${index + 1}`;
      return `${heading}\n\n${review.content}`;
    });

  return sections.length > 0 ? sections.join("\n\n") : null;
}

export function normalizeWereadBundle(
  bundle: WereadBookBundle,
  now = new Date(),
): NormalizedImport {
  const chapterTitles = chapterTitleMap({
    chapters: bundle.chapters,
  });
  const seenQuotes = new Set<string>();
  const quotes = bundle.highlights
    .filter((highlight) => {
      const key = `${highlight.chapterUid ?? ""}|${highlight.range ?? ""}|${highlight.markText}`;
      if (seenQuotes.has(key)) {
        return false;
      }
      seenQuotes.add(key);
      return true;
    })
    .map((highlight) => ({
      quoteText: highlight.markText,
      chapter:
        highlight.chapterUid === null
          ? null
          : (chapterTitles.get(highlight.chapterUid) ?? null),
      location: highlight.range,
    }));

  const noteContent = buildReviewMarkdown(bundle);
  const quoteCount = quotes.length;
  const reviewCount = bundle.reviews.length;
  const summaryParts = [
    `微信读书同步：${quoteCount} 条划线`,
    `${reviewCount} 条想法/点评`,
  ];

  if (bundle.reviewsTruncated) {
    summaryParts.push("想法/点评达到单次同步上限，可稍后再次同步");
  }

  return {
    sourceType: "weread",
    sourceId: bundle.book.bookId,
    sourceUrl: bundle.book.sourceUrl,
    importedAt: now.toISOString(),
    title: bundle.book.title,
    author: bundle.book.author,
    bookIdentifier: bundle.book.bookId,
    description: bundle.book.description,
    coverUrl: bundle.book.coverUrl,
    readingRecord: {
      status: readingStatus(bundle),
      progressPercent: bundle.progress.progressPercent,
      rating: reviewRating(bundle),
      finishedAt: unixSecondsToDate(bundle.progress.finishTime),
    },
    note: {
      title: `${bundle.book.title} · 微信读书笔记`,
      summary: summaryParts.join(" · "),
      content: noteContent,
      sourceId: `book:${bundle.book.bookId}`,
      sourceUrl: bundle.book.sourceUrl,
      quotes,
    },
  };
}
export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`;
  }

  return `${minutes} 分钟`;
}

export function mapReadingStats(
  mode: WereadReadingMode,
  data: ReadingStatsResponseData,
  now = new Date(),
): WereadReadingStats {
  const topBooks = (data.readLongest ?? [])
    .map((item) => {
      const title =
        stringOrNull(item.book?.title) ?? stringOrNull(item.albumInfo?.name);
      const author =
        stringOrNull(item.book?.author) ??
        stringOrNull(item.albumInfo?.authorName);

      return {
        title,
        author,
        readTimeSeconds: integerOrNull(item.readTime) ?? 0,
        isAlbum: Boolean(item.albumInfo),
      };
    })
    .filter(
      (item): item is typeof item & { title: string } => Boolean(item.title),
    );

  const categories = (data.preferCategory ?? [])
    .map((category) => ({
      title: stringOrNull(category.categoryTitle),
      readingTimeSeconds: integerOrNull(category.readingTime) ?? 0,
    }))
    .filter(
      (category): category is typeof category & { title: string } =>
        Boolean(category.title),
    );

  const readStats = (data.readStat ?? [])
    .map((item) => ({
      label: stringOrNull(item.stat),
      value: stringOrNull(item.counts),
    }))
    .filter(
      (item): item is { label: string; value: string } =>
        Boolean(item.label && item.value),
    );

  return {
    mode,
    baseTime: integerOrNull(data.baseTime) ?? 0,
    totalReadTimeSeconds: integerOrNull(data.totalReadTime) ?? 0,
    readDays: integerOrNull(data.readDays) ?? 0,
    dayAverageReadTimeSeconds: integerOrNull(data.dayAverageReadTime),
    comparison: finiteNumber(data.compare),
    topBooks,
    categories,
    readStats,
    importedAt: now.toISOString(),
  };
}

export function readingStatsMarkdown(stats: WereadReadingStats): string {
  const modeLabels: Record<WereadReadingMode, string> = {
    weekly: "本周",
    monthly: "本月",
    annually: "本年",
    overall: "全部时间",
  };
  const lines = [
    `## ${modeLabels[stats.mode]}阅读统计`,
    "",
    `- 阅读时长：${formatDuration(stats.totalReadTimeSeconds)}`,
    `- 有效阅读天数：${stats.readDays} 天`,
  ];

  if (stats.dayAverageReadTimeSeconds !== null) {
    lines.push(
      `- 自然日均时长：${formatDuration(stats.dayAverageReadTimeSeconds)}`,
    );
  }

  if (stats.comparison !== null) {
    const percentage = Math.round(stats.comparison * 100);
    lines.push(
      `- 与上一周期日均对比：${percentage >= 0 ? "增长" : "下降"} ${Math.abs(percentage)}%`,
    );
  }

  if (stats.readStats.length > 0) {
    lines.push("", "### 统计摘要");
    for (const item of stats.readStats) {
      lines.push(`- ${item.label}：${item.value}`);
    }
  }

  if (stats.topBooks.length > 0) {
    lines.push("", "### 阅读排行");
    stats.topBooks.forEach((book, index) => {
      const author = book.author ? ` · ${book.author}` : "";
      const album = book.isAlbum ? "（有声内容）" : "";
      lines.push(
        `${index + 1}. ${book.title}${author}${album} · ${formatDuration(book.readTimeSeconds)}`,
      );
    });
  }

  if (stats.categories.length > 0) {
    lines.push("", "### 偏好分类");
    for (const category of stats.categories) {
      lines.push(
        `- ${category.title}：${formatDuration(category.readingTimeSeconds)}`,
      );
    }
  }

  lines.push(
    "",
    "> 数据来自微信读书官方 Agent Skill，仅导入当前账号可见的只读统计。",
  );

  return lines.join("\n");
}
