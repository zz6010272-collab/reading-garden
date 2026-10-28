import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen, CalendarDays, Quote } from "lucide-react";

import { DeleteNoteButton } from "@/components/delete-note-button";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildNoteWithRelations,
  createFallbackProfile,
  NOTE_RELATION_SELECT,
} from "@/lib/supabase/notes";
import { createClient } from "@/lib/supabase/server";
import {
  formatReadingDate,
  noteVisibilityClassName,
  noteVisibilityLabels,
  type NoteRelationRow,
  type ProfileRecord,
} from "@/lib/supabase/types";

type NotePageProps = {
  params: Promise<{ id: string }>;
};

export default function NoteDetailPage({ params }: NotePageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={2} label="正在展开这页笔记…" />
        </div>
      }
    >
      <NoteDetailContent params={params} />
    </Suspense>
  );
}

async function NoteDetailContent({ params }: NotePageProps) {
  const { id } = await params;
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: noteRow, error: noteError } = await supabase
    .from("notes")
    .select(NOTE_RELATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (noteError) {
    console.error("Failed to load note detail", noteError);
    throw new Error("加载笔记失败，请稍后重试。");
  }

  if (!noteRow) {
    notFound();
  }

  const row = noteRow as unknown as NoteRelationRow;

  if (row.visibility === "private" && row.user_id !== user?.id) {
    notFound();
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at, updated_at")
    .eq("id", row.user_id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load note author profile", profileError);
  }

  const author = profileData
    ? (profileData as ProfileRecord)
    : createFallbackProfile(row.user_id);
  const note = buildNoteWithRelations(row, author);
  const isOwner = user?.id === note.user_id;
  const reflection = note.reflection?.trim() ?? "";
  const content = note.content?.trim() ?? "";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title={note.title}
        description={`${author.display_name || "读者"} · 更新于 ${formatReadingDate(note.updated_at)}`}
        showDemoBadge={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={noteVisibilityClassName(note.visibility)}
            >
              {noteVisibilityLabels[note.visibility]}
            </Badge>
            {isOwner ? (
              <>
                <Button
                  variant="outline"
                  className="rounded-full"
                  nativeButton={false}
                  render={<Link href={`/write?id=${note.id}`} />}
                >
                  编辑
                </Button>
                <DeleteNoteButton noteId={note.id} noteTitle={note.title} />
              </>
            ) : null}
          </div>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <article className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          {note.summary ? (
            <section className="border-b border-[#ebe5d9] pb-8">
              <Badge
                variant="outline"
                className="border-[#d8d2c4] bg-[#f5f1e7] text-[#747668]"
              >
                摘要
              </Badge>
              <p className="mt-4 max-w-[65ch] font-serif text-lg leading-8 text-[#5d6257]">
                {note.summary}
              </p>
            </section>
          ) : null}

          {reflection ? (
            <section className="border-b border-[#ebe5d9] py-8">
              <h2 className="mb-5 font-serif text-2xl font-semibold text-[#30342c]">
                个人感想
              </h2>
              <div className="note-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {reflection}
                </ReactMarkdown>
              </div>
            </section>
          ) : null}

          <section className="py-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
                正文
              </h2>
              <Badge
                variant="outline"
                className="border-[#ded8ca] text-[#77796f]"
              >
                Markdown
              </Badge>
            </div>
            {content ? (
              <div className="note-prose">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-[#898b80]">这篇笔记暂时没有正文内容。</p>
            )}
          </section>

          <section className="border-t border-[#ebe5d9] pt-8">
            <div className="mb-5 flex items-center gap-2">
              <Quote className="size-4 text-[#7e8c73]" aria-hidden="true" />
              <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
                摘录
              </h2>
            </div>

            {note.quotes.length > 0 ? (
              <div className="space-y-4">
                {note.quotes.map((quote) =>
                  quote.quote_text ? (
                    <blockquote
                      key={quote.id}
                      className="rounded-xl border border-[#e4ddce] bg-[#f8f4eb] p-5"
                    >
                      <p className="font-serif text-base leading-8 text-[#4b5046]">
                        “{quote.quote_text}”
                      </p>
                      {quote.chapter || quote.location ? (
                        <footer className="mt-3 flex flex-wrap gap-x-3 text-xs text-[#8a8b80]">
                          {quote.chapter ? <span>{quote.chapter}</span> : null}
                          {quote.location ? <span>{quote.location}</span> : null}
                        </footer>
                      ) : null}
                    </blockquote>
                  ) : null,
                )}
              </div>
            ) : (
              <p className="text-sm text-[#898b80]">这篇笔记还没有摘录。</p>
            )}
          </section>
        </article>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5">
            <p className="text-[10px] tracking-[0.2em] text-[#8b8d82]">
              NOTE INFO
            </p>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-[#8a8c82]">作者</dt>
                <dd className="mt-1">
                  <Link
                    href={`/profile/${note.user_id}`}
                    className="text-[#52644a] underline-offset-4 hover:underline"
                  >
                    {author.display_name || "读者"}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">可见范围</dt>
                <dd className="mt-1 text-[#474c42]">
                  {noteVisibilityLabels[note.visibility]}
                </dd>
              </div>
              {note.book ? (
                <div>
                  <dt className="text-xs text-[#8a8c82]">关联书籍</dt>
                  <dd className="mt-1 text-[#474c42]">
                    {isOwner ? (
                      <Link
                        href={`/books/${note.book.id}`}
                        className="inline-flex items-center gap-1.5 text-[#52644a] underline-offset-4 hover:underline"
                      >
                        <BookOpen className="size-3.5" aria-hidden="true" />
                        {note.book.title}
                      </Link>
                    ) : (
                      note.book.title
                    )}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-[#8a8c82]">更新时间</dt>
                <dd className="mt-1 flex items-center gap-1.5 text-[#474c42]">
                  <CalendarDays className="size-3.5 text-[#8d9685]" aria-hidden="true" />
                  {formatReadingDate(note.updated_at)}
                </dd>
              </div>
            </dl>
          </div>

          {note.tags.length > 0 ? (
            <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5">
              <h2 className="text-[10px] tracking-[0.2em] text-[#8b8d82]">
                TAGS
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {note.tags.map((tag) => (
                  <TagBadge key={tag.id} name={tag.name} />
                ))}
              </div>
            </div>
          ) : null}

          {note.book || note.tags.length > 0 ? (
            <p className="px-1 text-xs leading-6 text-[#8c8e84]">
              评论与点赞将在后续阶段接入。
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}