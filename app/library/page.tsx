import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation"
import { connection } from "next/server";
import { Search } from "lucide-react";

import { BookCard } from "@/components/book-card";
import { BookFormDialog } from "@/components/book-form-dialog";
import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import {
  readingStatusLabels,
  readingStatusOptions,
  readingStatusValues,
  type BookRecord,
  type BookWithReading,
  type ReadingRecord,
  type ReadingStatus,
} from "@/lib/supabase/types";

type LibrarySearchParams = Promise<{
  q?: string | string[];
  status?: string | string[];
}>;

type LibraryBookRow = BookRecord & {
  reading_records: ReadingRecord[] | ReadingRecord | null;
};

const BOOK_SELECT = `
  id,
  owner_id,
  title,
  author,
  isbn,
  cover_url,
  description,
  created_at,
  updated_at,
  reading_records!inner (
    id,
    user_id,
    book_id,
    status,
    rating,
    started_at,
    finished_at,
    created_at
  )
`;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function normalizeReadingRecord(
  value: LibraryBookRow["reading_records"],
): ReadingRecord | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export default function LibraryPage({
  searchParams,
}: {
  searchParams: LibrarySearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={8} label="正在整理你的书房…" />
        </div>
      }
    >
      <LibraryContent searchParams={searchParams} />
    </Suspense>
  );
}

async function LibraryContent({
  searchParams,
}: {
  searchParams: LibrarySearchParams;
}) {
  await connection();
  const params = await searchParams;
  const query = readParam(params.q).trim().slice(0, 200);
  const rawStatus = readParam(params.status);
  const status = readingStatusValues.includes(rawStatus as ReadingStatus)
    ? (rawStatus as ReadingStatus)
    : undefined;
  const hasFilters = Boolean(query) || Boolean(status);

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  let booksQuery = supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (query) {
    booksQuery = booksQuery.ilike("title", `%${query}%`);
  }

  if (status) {
    booksQuery = booksQuery.eq("reading_records.status", status);
  }

  const { data, error } = await booksQuery;

  if (error) {
    console.error("Failed to load library books", error);
    throw new Error("加载书房失败，请稍后重试。");
  }

  const rows = (data ?? []) as unknown as LibraryBookRow[];
  const books: BookWithReading[] = rows.map((row) => {
    const { reading_records, ...book } = row;

    return {
      ...book,
      reading_record: normalizeReadingRecord(reading_records),
    };
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="我的书房"
        description="按阅读状态整理自己的书，也把每一本书留下的笔记放回它身边。"
        showDemoBadge={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-full"
              nativeButton={false}
              render={<Link href="/write" />}
            >
              写笔记
            </Button>
            <BookFormDialog
              mode="create"
              triggerLabel="添加书籍"
              triggerClassName="h-10 rounded-full bg-[#68785d] px-5 text-white hover:bg-[#5a6a50]"
            />
          </div>
        }
      />

      <form
        method="get"
        className="mt-8 flex flex-col gap-3 border-b border-[#e5dfd3] pb-6 md:flex-row md:items-center"
      >
        <label className="relative block flex-1">
          <span className="sr-only">搜索书名</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8d82]"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={query}
            maxLength={200}
            placeholder="搜索书名"
            className="h-10 rounded-full border-[#d8d2c4] bg-[#fffdf8] pl-9 text-[#454a40] placeholder:text-[#9a9b91]"
          />
        </label>

        <label className="block md:w-44">
          <span className="sr-only">阅读状态</span>
          <select
            name="status"
            defaultValue={status ?? "all"}
            className="h-10 w-full rounded-full border border-[#d8d2c4] bg-[#fffdf8] px-4 text-sm text-[#4f554a] outline-none focus-visible:border-[#87967b] focus-visible:ring-3 focus-visible:ring-[#87967b]/30"
          >
            <option value="all">全部状态</option>
            {readingStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {readingStatusLabels[option.value]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
          >
            筛选
          </Button>
          {hasFilters ? (
            <Button
              variant="outline"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/library" />}
            >
              清除
            </Button>
          ) : null}
        </div>
      </form>

      {books.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              readingRecord={book.reading_record}
            />
          ))}
        </div>
      ) : hasFilters ? (
        <EmptyState
          className="mt-8"
          title="没有找到符合条件的书"
          description="换一个书名关键词，或切换到其他阅读状态看看。"
          action={
            <Button
              variant="outline"
              className="rounded-full"
              nativeButton={false}
              render={<Link href="/library" />}
            >
              清除筛选
            </Button>
          }
        />
      ) : (
        <EmptyState
          className="mt-8"
          title="书房还是空的"
          description="从你正在读或想读的第一本书开始，建立自己的阅读花园。"
          action={
            <BookFormDialog
              mode="create"
              triggerLabel="添加第一本书"
              triggerClassName="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
            />
          }
        />
      )}
    </div>
  );
}