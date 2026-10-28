import Link from "next/link"
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BookOpen, Quote } from "lucide-react";

import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { VisibilityBadge } from "@/components/note-card";
import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMockDate,
  getNoteById,
  visibilityLabels,
} from "@/lib/mock-data";

type NotePageProps = {
  params: Promise<{ id: string }>;
};

function getSummary(content: string) {
  const paragraph = content
    .split("\n\n")
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith("#"));

  if (!paragraph) {
    return "这篇笔记暂时没有摘要。";
  }

  const plainText = paragraph.replace(/[*_`>-]/g, "").replace(/\s+/g, " ");
  return plainText.length > 180 ? `${plainText.slice(0, 180)}…` : plainText;
}

function NoteBody({ content }: { content: string }) {
  const blocks = content.split(/\n\n+/).filter(Boolean);

  return (
    <div className="note-prose">
      {blocks.map((block, index) => {
        if (block.startsWith("## ")) {
          return <h2 key={`${index}-${block.slice(0, 12)}`}>{block.slice(3)}</h2>;
        }

        const lines = block.split("\n");
        if (lines.every((line) => line.startsWith("- "))) {
          return (
            <ul key={`${index}-list`}>
              {lines.map((line) => (
                <li key={line}>{line.slice(2)}</li>
              ))}
            </ul>
          );
        }

        return <p key={`${index}-${block.slice(0, 12)}`}>{block}</p>;
      })}
    </div>
  );
}

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
  const note = getNoteById(id);

  if (!note) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title={note.title}
        description={`${note.author.display_name} · 更新于 ${formatMockDate(note.updated_at)}`}
        action={<VisibilityBadge visibility={note.visibility} />}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <article className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <section className="border-b border-[#ebe5d9] pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[#d8d2c4] bg-[#f5f1e7] text-[#747668]"
              >
                内容摘要 · 演示
              </Badge>
              {note.book ? (
                <Link
                  href={`/books/${note.book.id}`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#68775e] hover:text-[#4c5e43]"
                >
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  《{note.book.title}》
                </Link>
              ) : null}
            </div>
            <p className="mt-4 max-w-[65ch] font-serif text-lg leading-8 text-[#5d6257]">
              {getSummary(note.content)}
            </p>
          </section>

          <section className="pt-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
                个人感想
              </h2>
              <Badge
                variant="outline"
                className="border-[#ded8ca] text-[#77796f]"
              >
                Markdown 渲染占位
              </Badge>
            </div>
            {/* TODO(stage 4): 接入受控 Markdown 渲染器与安全过滤。 */}
            <NoteBody content={note.content} />
          </section>

          <section className="mt-10 border-t border-[#ebe5d9] pt-8">
            <div className="mb-5 flex items-center gap-2">
              <Quote className="size-4 text-[#7e8c73]" aria-hidden="true" />
              <h2 className="font-serif text-2xl font-semibold text-[#30342c]">
                摘录
              </h2>
            </div>

            {note.quotes.length > 0 ? (
              <div className="space-y-4">
                {note.quotes.map((quote) => (
                  <blockquote
                    key={quote.id}
                    className="rounded-xl border border-[#e4ddce] bg-[#f8f4eb] p-5"
                  >
                    <p className="font-serif text-base leading-8 text-[#4b5046]">
                      “{quote.quote_text}”
                    </p>
                    <footer className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#8a8b80]">
                      {quote.chapter ? <span>{quote.chapter}</span> : null}
                      {quote.page ? <span>第 {quote.page} 页</span> : null}
                      {quote.position ? <span>{quote.position}</span> : null}
                    </footer>
                  </blockquote>
                ))}
              </div>
            ) : (
              <EmptyState
                className="min-h-48"
                title="还没有摘录"
                description="这篇笔记目前以个人感想为主，后续可以继续补充原文摘录。"
              />
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
                <dd className="mt-1 text-[#474c42]">{note.author.display_name}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">可见范围</dt>
                <dd className="mt-1 text-[#474c42]">
                  {visibilityLabels[note.visibility]}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">来源</dt>
                <dd className="mt-1 text-[#474c42]">{note.source_type}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#8a8c82]">创建时间</dt>
                <dd className="mt-1 text-[#474c42]">
                  {formatMockDate(note.created_at)}
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

          <p className="px-1 text-xs leading-6 text-[#8c8e84]">
            当前为演示数据。阶段 3 接入会话与 RLS 后，private、public、unlisted
            将执行真实访问控制。
          </p>

          <Button
            variant="outline"
            className="w-full rounded-full"
            render={<Link href="/community" />}
          >
            浏览更多公开笔记
          </Button>
        </aside>
      </div>
    </div>
  );
}