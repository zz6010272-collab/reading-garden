"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";

import { BookCard } from "@/components/book-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  booksWithReading,
  currentDemoUserId,
  type ReadingStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type LibraryFilter = "all" | Extract<ReadingStatus, "want_to_read" | "reading" | "finished">;

const filters: { value: LibraryFilter; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "want_to_read", label: "想读" },
  { value: "reading", label: "在读" },
  { value: "finished", label: "已读" },
];

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<LibraryFilter>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const myBooks = useMemo(
    () =>
      booksWithReading.filter((book) => book.owner_id === currentDemoUserId),
    [],
  );

  const filteredBooks = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");

    return myBooks.filter((book) => {
      const matchesStatus =
        status === "all" || book.reading_record?.status === status;
      const matchesQuery =
        keyword.length === 0 ||
        book.title.toLocaleLowerCase("zh-CN").includes(keyword) ||
        book.author.toLocaleLowerCase("zh-CN").includes(keyword);

      return matchesStatus && matchesQuery;
    });
  }, [myBooks, query, status]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="我的书房"
        description="按阅读状态整理自己的书，也把每一本书留下的笔记放回它身边。"
        action={
          <Button
            type="button"
            size="lg"
            className="h-10 rounded-full bg-[#68785d] px-5 text-white hover:bg-[#5a6a50]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus data-icon="inline-start" />
            添加书籍
          </Button>
        }
      />

      <div className="mt-8 flex flex-col gap-4 border-b border-[#e5dfd3] pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" aria-label="阅读状态筛选">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={status === filter.value ? "default" : "ghost"}
              className={cn(
                "rounded-full",
                status === filter.value
                  ? "bg-[#68785d] text-white hover:bg-[#5a6a50]"
                  : "text-[#666b60] hover:bg-[#eee9dd]",
              )}
              onClick={() => setStatus(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">搜索书名或作者</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8d82]"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索书名或作者"
            className="h-10 rounded-full border-[#d8d2c4] bg-[#fffdf8] pl-9 text-[#454a40] placeholder:text-[#9a9b91]"
          />
        </label>
      </div>

      {/* TODO(stage 3): 使用真实数据源后补充加载失败与重试状态。 */}
      {filteredBooks.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              readingRecord={book.reading_record}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="没有找到符合条件的书"
          description="换一个关键词，或切换到其他阅读状态看看。也可以先把想读的书放进书房。"
          action={
            <Button
              type="button"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              onClick={() => setDialogOpen(true)}
            >
              <Plus data-icon="inline-start" />
              添加书籍
            </Button>
          }
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border border-[#ded8ca] bg-[#fffdf8] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#30342c]">
              添加一本书
            </DialogTitle>
            <DialogDescription>
              这是界面占位表单，不会提交或保存真实数据。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="block space-y-2 text-sm text-[#5f6459]">
              <span>书名</span>
              <Input placeholder="例如：额尔古纳河右岸" />
            </label>
            <label className="block space-y-2 text-sm text-[#5f6459]">
              <span>作者</span>
              <Input placeholder="例如：迟子建" />
            </label>
            <label className="block space-y-2 text-sm text-[#5f6459]">
              <span>简介</span>
              <Textarea placeholder="写一句为什么想读它" className="min-h-24" />
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setDialogOpen(false)}
            >
              关闭
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              onClick={() => setDialogOpen(false)}
            >
              保存占位
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}