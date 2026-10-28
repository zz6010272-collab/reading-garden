import Link from "next/link";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";

import { NoteCard, VisibilityBadge } from "@/components/note-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  featuredNotes,
  formatMockDate,
  recentNotes,
} from "@/lib/mock-data";

export default function Home() {
  return (
    <div>
      <section className="border-b border-[#ded8ca]">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <Badge
              variant="outline"
              className="border-[#cfd8c7] bg-[#eef2e8] text-[#56694e]"
            >
              个人阅读知识库 · 轻量读书社区
            </Badge>
            <h1 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-[1.2] tracking-tight text-[#2d3129] sm:text-5xl lg:text-6xl">
              把读过的页，
              <br className="hidden sm:block" />
              放回生活里。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6f7369] sm:text-lg">
              拾页帮助你整理书籍、摘录和感想，也让你选择把其中一些页分享给朋友。这里先是一座安静的个人书房，再是一处轻量的阅读社区。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="h-11 rounded-full bg-[#68785d] px-6 text-white hover:bg-[#5a6a50]"
                render={<Link href="/library" />}
              >
                进入书房
                <ArrowRight data-icon="inline-end" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-11 rounded-full border-[#cfc8ba] bg-transparent px-6 text-[#4e5549] hover:bg-[#eee9dd]"
                render={<Link href="/community" />}
              >
                浏览社区
              </Button>
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-[2rem] border border-[#d9d2c3] bg-[#f1ede2] p-7 sm:p-9">
            <div
              className="absolute -right-10 -top-10 size-40 rounded-full border border-[#d5cdbb]"
              aria-hidden="true"
            />
            <div className="relative">
              <p className="text-[10px] tracking-[0.24em] text-[#8b887d]">
                今日一页 · 演示数据
              </p>
              <blockquote className="mt-7 font-serif text-2xl leading-[1.75] text-[#3c4237] sm:text-3xl">
                “一个人，出生了，这就不再是一个可以辩论的问题，而只是上帝交给他的一个事实。”
              </blockquote>
              <p className="mt-6 text-sm text-[#77776c]">
                —— 史铁生《我与地坛》
              </p>
              <div className="mt-9 flex items-center gap-3 border-t border-[#d9d1c0] pt-5 text-xs text-[#87877b]">
                <BookOpen className="size-4 text-[#718167]" aria-hidden="true" />
                摘录是阅读留下的第一道折痕。
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <PageHeader
          title="精选公开笔记"
          description="从不同读者的书页里，挑出几段愿意被看见的思考。"
          action={
            <Button
              variant="ghost"
              className="rounded-full text-[#596750] hover:bg-[#e9ede3]"
              render={<Link href="/community" />}
            >
              查看全部
              <ArrowRight data-icon="inline-end" />
            </Button>
          }
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {featuredNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>

        <section className="mt-16 grid gap-8 lg:grid-cols-[0.62fr_1.38fr]">
          <div>
            <p className="text-[10px] tracking-[0.22em] text-[#8b8d82]">
              RECENTLY UPDATED
            </p>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-[#30342c]">
              最近更新
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[#73776d]">
              最近的摘录、读后感和待整理片段。部分内容仅自己可见，部分以链接分享。
            </p>
          </div>

          <div className="divide-y divide-[#e4ded1] border-y border-[#e4ded1]">
            {recentNotes.map((note) => (
              <Link
                key={note.id}
                href={`/notes/${note.id}`}
                className="group flex flex-col gap-3 py-4 outline-none hover:bg-[#f5f1e8]/70 focus-visible:bg-[#f5f1e8] sm:flex-row sm:items-center sm:justify-between sm:px-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <VisibilityBadge visibility={note.visibility} />
                    <span className="text-xs text-[#8a8c81]">
                      {note.author.display_name}
                    </span>
                  </div>
                  <h3 className="mt-2 truncate font-serif text-lg font-medium text-[#363a31] group-hover:text-[#53644b]">
                    {note.title}
                  </h3>
                </div>
                <div className="flex shrink-0 items-center gap-1.5 text-xs text-[#8a8c81]">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  <time dateTime={note.updated_at}>
                    {formatMockDate(note.updated_at)}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}