import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation"
import { connection } from "next/server";
import { ArrowLeft, CalendarDays, FileText, Star } from "lucide-react";

import { BookFormDialog } from "@/components/book-form-dialog";
import { DeleteBookButton } from "@/components/delete-book-button";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { ReadingRecordEditor } from "@/components/reading-record-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  formatReadingDate,
  readingStatusLabels,
  type BookRecord,
  type ReadingRecord,
} from "@/lib/supabase/types";

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
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: bookData, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (bookError) {
    console.error("Failed to load book detail", bookError);
    throw new Error("加载书籍详情失败，请稍后重试。");
  }

  if (!bookData) {
    notFound();
  }

  const book = bookData as BookRecord;
  const { data: recordData, error: recordError } = await supabase
    .from("reading_records")
    .select("*")
    .eq("book_id", book.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (recordError) {
    console.error("Failed to load reading record", recordError);
    throw new Error("加载阅读记录失败，请稍后重试。");
  }

  const record = (recordData as ReadingRecord | null) ?? null;
  const { count: noteCount, error: notesError } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("book_id", book.id)
    .eq("user_id", user.id);

  if (notesError) {
    console.error("Failed to count related notes", notesError);
    throw new Error("加载关联笔记数量失败，请稍后重试。");
  }

  const hasCover = Boolean(book.cover_url);
  const emailPrefix = user.email?.split("@")[0] ?? "当前用户";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Button
        variant="ghost"
        className="mb-6 rounded-full text-[#62695e] hover:bg-[#eee9dd]"
        nativeButton={false}
        render={<Link href="/library" />}
      >
        <ArrowLeft data-icon="inline-start" />
        返回书房
      </Button>

      <PageHeader
        title={book.title}
        description={`${book.author ?? "未填写作者"} · ${emailPrefix} 的私人藏书`}
        showDemoBadge={false}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]"
            >
              {record ? readingStatusLabels[record.status] : "未记录状态"}
            </Badge>
            <BookFormDialog
              mode="edit"
              book={book}
              triggerLabel="编辑书籍"
              triggerVariant="outline"
              triggerClassName="rounded-full"
            />
          </div>
        }
      />

      <section className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl border border-[#d8d1c2] bg-[#e9e3d5] shadow-[0_18px_45px_-30px_rgba(68,64,52,0.55)]">
          <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden border-l border-[#c5bcaa] p-7">
            {book.cover_url ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${JSON.stringify(book.cover_url)})` }}
                aria-hidden="true"
              />
            ) : null}
            {hasCover ? (
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#20231e]/55" aria-hidden="true" />
            ) : null}
            <span
              className={`relative text-[10px] tracking-[0.24em] ${
                hasCover ? "text-white/80" : "text-[#7f8074]"
              }`}
            >
              READING GARDEN
            </span>
            <div className={`relative ${hasCover ? "text-white" : "text-[#31352d]"}`}>
              <p className="font-serif text-3xl font-semibold leading-tight">
                {book.title}
              </p>
              <p className="mt-3 text-sm tracking-[0.12em] opacity-80">
                {book.author ?? "未填写作者"}
              </p>
            </div>
            <span
              className={`relative text-xs ${
                hasCover ? "text-white/80" : "text-[#8b887b]"
              }`}
            >
              私人藏书
            </span>
          </div>
        </div>

        <div className="space-y-7">
          <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#ded8ca] text-[#6f7167]"
              >
                私人书籍
              </Badge>
              {book.isbn ? (
                <span className="text-xs text-[#898b80]">ISBN {book.isbn}</span>
              ) : null}
            </div>
            <p className="mt-5 text-sm leading-8 text-[#62675d] sm:text-base">
              {book.description || "还没有填写书籍简介。"}
            </p>

            <dl className="mt-7 grid gap-4 border-t border-[#ebe5d9] pt-6 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <dt className="text-xs text-[#8a8c82]">阅读状态</dt>
                <dd className="mt-1.5 text-sm font-medium text-[#444a40]">
                  {record ? readingStatusLabels[record.status] : "——"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">个人评分</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-[#444a40]">
                  <Star className="size-3.5 text-[#a28d6c]" aria-hidden="true" />
                  {record?.rating ? `${record.rating} / 5` : "——"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">开始阅读</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-[#444a40]">
                  <CalendarDays className="size-3.5 text-[#8d9685]" aria-hidden="true" />
                  {formatReadingDate(record?.started_at ?? null)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">完成阅读</dt>
                <dd className="mt-1.5 flex items-center gap-1.5 text-sm text-[#444a40]">
                  <CalendarDays className="size-3.5 text-[#8d9685]" aria-hidden="true" />
                  {formatReadingDate(record?.finished_at ?? null)}
                </dd>
              </div>
            </dl>
          </div>

          <section className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6 sm:p-7">
            <div className="mb-5">
              <p className="text-[10px] tracking-[0.2em] text-[#8a8c81]">
                READING RECORD
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[#30342c]">
                更新阅读状态
              </h2>
            </div>
            <ReadingRecordEditor bookId={book.id} record={record} />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6">
              <FileText className="size-5 text-[#7b8b70]" aria-hidden="true" />
              <p className="mt-4 font-serif text-3xl font-semibold text-[#30342c]">
                {noteCount ?? 0}
              </p>
              <p className="mt-1 text-sm text-[#7a7d72]">关联笔记</p>
              <p className="mt-3 text-xs leading-6 text-[#909187]">
                笔记创建与编辑将在下一阶段接入。
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5d6d0] bg-[#fbf6f3] p-6">
              <h2 className="font-serif text-lg font-semibold text-[#634a43]">
                删除书籍
              </h2>
              <p className="mt-2 text-xs leading-6 text-[#8b746d]">
                删除后，阅读记录及关联笔记会按数据库级联规则一起删除。
              </p>
              <div className="mt-4">
                <DeleteBookButton bookId={book.id} bookTitle={book.title} />
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}