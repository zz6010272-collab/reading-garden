import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Search } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { PublicNoteCard } from "@/components/public-note-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildNoteWithRelations,
  createFallbackProfile,
  NOTE_RELATION_SELECT,
} from "@/lib/supabase/notes";
import { createClient } from "@/lib/supabase/server";
import type {
  NoteRelationRow,
  NoteWithRelations,
  ProfileRecord,
} from "@/lib/supabase/types";

type CommunitySearchParams = Promise<{
  q?: string | string[];
  book?: string | string[];
}>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default function CommunityPage({
  searchParams,
}: {
  searchParams: CommunitySearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={6} label="正在整理公开笔记…" />
        </div>
      }
    >
      <CommunityContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CommunityContent({
  searchParams,
}: {
  searchParams: CommunitySearchParams;
}) {
  await connection();
  const params = await searchParams;
  const query = readParam(params.q).trim().slice(0, 200);
  const rawBookFilter = readParam(params.book);
  const bookFilter = UUID_PATTERN.test(rawBookFilter) ? rawBookFilter : undefined;
  const hasFilters = Boolean(query) || Boolean(bookFilter);

  const supabase = await createClient();
  const { data: optionRows } = await supabase
    .from("notes")
    .select("book_id, books (id, title)")
    .eq("visibility", "public")
    .not("book_id", "is", null)
    .limit(200);

  const bookOptions = new Map<string, string>();
  ((optionRows ?? []) as unknown as Array<{
    book_id: string | null;
    books: Array<{ id: string; title: string }> | { id: string; title: string } | null;
  }>).forEach((row) => {
    if (row.book_id) {
      const book = Array.isArray(row.books) ? row.books[0] : row.books;
      bookOptions.set(
        row.book_id,
        book?.title ?? `书籍 ${row.book_id.slice(0, 8)}`,
      );
    }
  });

  let notesQuery = supabase
    .from("notes")
    .select(NOTE_RELATION_SELECT)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (query) {
    notesQuery = notesQuery.ilike("title", `%${query}%`);
  }

  if (bookFilter) {
    notesQuery = notesQuery.eq("book_id", bookFilter);
  }

  const { data, error } = await notesQuery;

  if (error) {
    console.error("Failed to load public notes", error);
    throw new Error("加载社区笔记失败，请稍后重试。");
  }

  const rows = (data ?? []) as unknown as NoteRelationRow[];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const profiles = new Map<string, ProfileRecord>();

  if (userIds.length > 0) {
    const { data: profileRows, error: profilesError } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, bio, created_at, updated_at")
      .in("id", userIds);

    if (profilesError) {
      console.error("Failed to load community authors", profilesError);
    } else {
      ((profileRows ?? []) as ProfileRecord[]).forEach((profile) => {
        profiles.set(profile.id, profile);
      });
    }
  }

  const notes: NoteWithRelations[] = rows.map((row) =>
    buildNoteWithRelations(
      row,
      profiles.get(row.user_id) ?? createFallbackProfile(row.user_id),
    ),
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="社区"
        description="只展示读者明确设为公开的笔记。私密与仅链接内容不会出现在这里。"
        showDemoBadge={false}
        action={
          <span className="text-sm text-[#85877d]">
            共 {notes.length} 篇公开笔记
          </span>
        }
      />

      <form
        method="get"
        className="mt-8 flex flex-col gap-3 rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-4 sm:flex-row sm:items-center"
      >
        <label className="relative block flex-1">
          <span className="sr-only">搜索公开笔记</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8d82]"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={query}
            maxLength={200}
            placeholder="搜索公开笔记标题"
            className="h-10 rounded-full border-[#d8d2c4] bg-[#fdfbf6] pl-9"
          />
        </label>

        <label className="block sm:w-48">
          <span className="sr-only">按书籍筛选</span>
          <select
            name="book"
            defaultValue={bookFilter ?? "all"}
            className="h-10 w-full rounded-full border border-[#d8d2c4] bg-[#fdfbf6] px-3 text-sm text-[#4f554a] outline-none focus-visible:border-[#87967b] focus-visible:ring-3 focus-visible:ring-[#87967b]/30"
          >
            <option value="all">全部书籍</option>
            {Array.from(bookOptions, ([id, title]) => (
              <option key={id} value={id}>
                {title}
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
              render={<Link href="/community" />}
            >
              清除
            </Button>
          ) : null}
        </div>
      </form>

      {notes.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {notes.map((note) => (
            <PublicNoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title={hasFilters ? "没有找到公开笔记" : "社区还没有公开笔记"}
          description={
            hasFilters
              ? "试试更换标题关键词或选择其他书籍。"
              : "当读者把笔记设为公开后，它们会出现在这里。"
          }
        />
      )}
    </div>
  );
}