import assert from "node:assert/strict";
import test from "node:test";

import {
  formatDuration,
  mapBookBundle,
  mapReadingStats,
  mapSearchResponse,
  mapShelfResponse,
  normalizeWereadBundle,
  readingStatsMarkdown,
} from "../lib/importers/weread/mapper";

test("maps shelf counts including albums and article collection", () => {
  const shelf = mapShelfResponse({
    books: [
      {
        bookId: "book-1",
        title: "第一本",
        author: "作者甲",
        secret: 0,
        finishReading: 1,
        readerLink: "https://weread.qq.com/web/reader/book-1",
      },
      {
        bookId: "book-2",
        title: "第二本",
        secret: 1,
      },
    ],
    albums: [{ albumInfo: { albumId: "album-1", name: "专辑" } }],
    mp: { title: "文章收藏" },
  });

  assert.equal(shelf.totalEntries, 4);
  assert.equal(shelf.books.length, 2);
  assert.equal(shelf.albumCount, 1);
  assert.equal(shelf.hasArticleCollection, true);
  assert.equal(shelf.books[0]?.finishReading, true);
  assert.equal(shelf.books[1]?.secret, true);
});

test("deduplicates search results across response groups", () => {
  const result = mapSearchResponse("三体", {
    results: [
      {
        books: [
          {
            bookInfo: {
              bookId: "same-book",
              title: "三体",
              author: "刘慈欣",
            },
          },
        ],
      },
      {
        books: [
          {
            bookInfo: {
              bookId: "same-book",
              title: "三体",
              author: "刘慈欣",
            },
          },
          {
            bookInfo: {
              bookId: "other-book",
              title: "球状闪电",
            },
          },
        ],
      },
    ],
  });

  assert.equal(result.books.length, 2);
  assert.deepEqual(
    result.books.map((book) => book.bookId),
    ["same-book", "other-book"],
  );
});
test("normalizes official book, progress, highlight, and review fields", () => {
  const bundle = mapBookBundle(
    {
      bookId: "book-1",
      title: "测试书",
      author: "作者",
      readerLink: "https://weread.qq.com/web/reader/book-1",
      intro: "简介",
    },
    {
      book: {
        progress: 100,
        finishTime: 1778312777,
      },
    },
    {
      updated: [
        {
          bookmarkId: "mark-1",
          chapterUid: 10,
          markText: "划线一",
          range: "100-110",
        },
        {
          bookmarkId: "mark-2",
          chapterUid: 10,
          markText: "划线一",
          range: "100-110",
        },
        {
          bookmarkId: "mark-3",
          chapterUid: 11,
          markText: "划线一",
          range: "100-110",
        },
      ],
      chapters: [
        { chapterUid: 10, title: "第一章" },
        { chapterUid: 11, title: "第二章" },
      ],
    },
    {
      reviews: [
        {
          review: {
            reviewId: "review-1",
            content: "我的想法",
            chapterUid: 10,
            chapterName: "第一章",
            star: 4,
          },
        },
      ],
    },
    false,
  );

  const normalized = normalizeWereadBundle(
    bundle,
    new Date("2026-10-28T00:00:00.000Z"),
  );

  assert.equal(normalized.readingRecord?.status, "finished");
  assert.equal(normalized.readingRecord?.progressPercent, 100);
  assert.equal(normalized.readingRecord?.rating, 4);
  assert.equal(normalized.note?.quotes.length, 2);
  assert.equal(normalized.note?.quotes[0]?.chapter, "第一章");
  assert.match(normalized.note?.content ?? "", /我的想法/);
  assert.equal(normalized.sourceType, "weread");
  assert.equal(normalized.bookIdentifier, "book-1");
});

test("maps reading stats using seconds and documented labels", () => {
  const stats = mapReadingStats(
    "monthly",
    {
      baseTime: 1777593600,
      readDays: 12,
      totalReadTime: 7380,
      dayAverageReadTime: 246,
      compare: 0.2,
      readLongest: [
        {
          book: { bookId: "book-1", title: "测试书", author: "作者" },
          readTime: 3600,
        },
      ],
      readStat: [{ stat: "读完", counts: "2本" }],
      preferCategory: [{ categoryTitle: "文学", readingTime: 5400 }],
    },
    new Date("2026-10-28T00:00:00.000Z"),
  );

  assert.equal(stats.totalReadTimeSeconds, 7380);
  assert.equal(formatDuration(stats.totalReadTimeSeconds), "2 小时 3 分钟");
  assert.equal(stats.readDays, 12);
  assert.equal(stats.topBooks[0]?.title, "测试书");
  assert.match(readingStatsMarkdown(stats), /有效阅读天数：12 天/);
  assert.match(readingStatsMarkdown(stats), /增长 20%/);
});
