import Link from "next/link"
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Star } from "lucide-react";

import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state";
import { NoteCard } from "@/components/note-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMockDate,
  getBookById,
  getNotesForBook,
  getProfileById,
  readingStatusLabels,
} from "@/lib/mock-data";

type BookPageProps = {
  params: Promise<{ id: string }>;
};

export default function BookDetailPage({ params }: BookPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={2} label="正在翻开这本书…" />
        </div>
      }
    >
      <BookDetailContent params={params} />
    </Suspense>
  );
}

async function BookDetailContent({ params }: BookPageProps) {
  const { id } = await params;
  const book = getBookById(id);

  if (!book) {
    notFound();
  }

  const owner = getProfileById(book.owner_id);
  const notes = getNotesForBook(book.id);
  const record = book.reading_record;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Button
        variant="ghost"
        className="mb-6 rounded-full text-[#62695e] hover:bg-[#eee9dd]"
        render={<Link href="/library" />}
      >
        <ArrowLeft data-icon="inline-start" />
        返回书房
      </Button>

      <PageHeader
        title={book.title}
        description={`${book.author} · ${owner?.display_name ?? "未知读者"} 的书架`}
        action={
          <Badge
            variant="outline"
            className="border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]"
          >
            {record ? readingStatusLabels[record.status] : "未记录状态"}
          </Badge>
        }
      />

      <section className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-[#d8d1c2] bg-[#e9e3d5] p-7 shadow-[0_18px_45px_-30px_rgba(68,64,52,0.55)]">
          <div className="flex aspect-[4/5] flex-col justify-between border-l border-[#c5bcaa] pl-5">
            <span className="text-[10px] tracking-[0.24em] text-[#7f8074]">
              READING GARDEN
            </span>
            <div>
              <p className="font-serif text-3xl font-semibold leading-tight text-[#31352d]">
                {book.title}
              </p>
              <p className="mt-3 text-sm tracking-[0.12em] text-[#74776a]">
                {book.author}
              </p>
            </div>
            <span className="text-xs text-[#8b887b]">私人藏书 · 演示数据</span>
          </div>
        </div>

        <div className="space-y-7">
          <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#ded8ca] text-[#6f7167]"
              >
                {book.visibility === "public" ? "公开书籍元数据" : "私密书籍"}
              </Badge>
              {book.book_identifier ? (
                <span className="text-xs text-[#898b80]">
                  ISBN {book.book_identifier}
                </span>
              ) : null}
            </div>
            <p className="mt-5 text-sm leading-8 text-[#62675d] sm:text-base">
              {book.description}
            </p>

            <dl className="mt-7 grid gap-4 border-t border-[#ebe5d9] pt-6 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-xs text-[#8a8c82]">阅读状态</dt>
                <dd className="mt-1.5 text-sm font-medium text-[#444a40]">
                  {record ? readingStatusLabels[record.status] : "——"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">评分</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#444a40]">
                  <Star className="size-3.5 text-[#a28d6c]" aria-hidden="true" />
                  ——
                  <span className="text-[10px] font-normal text-[#93958a]">
                    评分模型待确认
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">开始阅读</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-[#444a40]">
                  <CalendarDays className="size-3.5 text-[#8d9685]" aria-hidden="true" />
                  {formatMockDate(record?.started_at ?? null)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">完成阅读</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-[#444a40]">
                  <CalendarDays className="size-3.5 text-[#8d9685]" aria-hidden="true" />
                  {formatMockDate(record?.finished_at ?? null)}
                </dd>
              </div>
            </dl>
          </div>

          <section>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] tracking-[0.2em] text-[#8a8c81]">
                  RELATED NOTES
                </p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#30342c]">
                  关联笔记
                </h2>
              </div>
              <span className="text-xs text-[#8b8d82]">演示数据</span>
            </div>

            {notes.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} compact />
                ))}
              </div>
            ) : (
              <EmptyState
                title="这本书还没有笔记"
                description="读到这里时想到的一句话，也值得被留下来。"
              />
            )}
          </section>
        </div>
      </section>
    </div>
  );
}