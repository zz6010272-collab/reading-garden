import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { LoadingState } from "@/components/loading-state";
import { NoteEditorForm, type NoteEditorBook } from "@/components/note-editor-form";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { NOTE_RELATION_SELECT } from "@/lib/supabase/notes";
import { createClient } from "@/lib/supabase/server";
import type {
  NoteRelationRow,
  NoteVisibility,
} from "@/lib/supabase/types";

type WriteSearchParams = Promise<{ id?: string | string[] }>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function WritePage({
  searchParams,
}: {
  searchParams: WriteSearchParams;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={2} label="正在准备笔记编辑器…" />
        </div>
      }
    >
      <WriteContent searchParams={searchParams} />
    </Suspense>
  );
}

async function WriteContent({ searchParams }: { searchParams: WriteSearchParams }) {
  const params = await searchParams;
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const noteId = rawId?.trim() || null;

  if (noteId && !UUID_PATTERN.test(noteId)) {
    notFound();
  }

  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: bookRows, error: booksError } = await supabase
    .from("books")
    .select("id, title, author")
    .eq("owner_id", user.id)
    .order("title", { ascending: true });

  if (booksError) {
    console.error("Failed to load books for note editor", booksError);
    throw new Error("加载书架失败，请稍后重试。");
  }

  const books = (bookRows ?? []) as NoteEditorBook[];
  let initialNote:
    | {
        id: string;
        book_id: string | null;
        title: string;
        summary: string;
        reflection: string;
        content: string;
        visibility: NoteVisibility;
        tags: string;
        quotes: string;
      }
    | undefined;

  if (noteId) {
    const { data: noteRow, error: noteError } = await supabase
      .from("notes")
      .select(NOTE_RELATION_SELECT)
      .eq("id", noteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (noteError) {
      console.error("Failed to load note for editing", noteError);
      throw new Error("加载笔记失败，请稍后重试。");
    }

    if (!noteRow) {
      notFound();
    }

    const row = noteRow as unknown as NoteRelationRow;
    const tags = (row.note_tags ?? [])
      .map((entry) => entry.tags?.name)
      .filter((tag): tag is string => Boolean(tag))
      .join(", ");
    const quotes = (row.note_quotes ?? [])
      .map((quote) => quote.quote_text)
      .filter((quote): quote is string => Boolean(quote))
      .join("\n");

    initialNote = {
      id: row.id,
      book_id: row.book_id,
      title: row.title,
      summary: row.summary ?? "",
      reflection: row.reflection ?? "",
      content: row.content ?? "",
      visibility: row.visibility,
      tags,
      quotes,
    };
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title={noteId ? "编辑笔记" : "写一篇笔记"}
        description={
          noteId
            ? "修改正文、摘要、标签和摘录。保存后会刷新公开页面。"
            : "把阅读时想到的东西留下来。内容支持 Markdown。"
        }
        showDemoBadge={false}
        action={
          <Button
            variant="outline"
            className="rounded-full"
            nativeButton={false}
            render={
              <Link href={noteId ? `/notes/${noteId}` : "/library"} />
            }
          >
            {noteId ? "返回笔记" : "返回书房"}
          </Button>
        }
      />

      <NoteEditorForm books={books} note={initialNote} />
    </div>
  );
}