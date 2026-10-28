"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { NoteCard } from "@/components/note-card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { publicNotes } from "@/lib/mock-data";

export default function CommunityPage() {
  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState("all");

  const bookOptions = useMemo(() => {
    const books = new Map<string, string>();
    publicNotes.forEach((note) => {
      if (note.book) {
        books.set(note.book.id, note.book.title);
      }
    });

    return Array.from(books, ([id, title]) => ({ id, title }));
  }, []);

  const filteredNotes = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("zh-CN");

    return publicNotes.filter((note) => {
      const matchesBook = bookFilter === "all" || note.book?.id === bookFilter;
      const searchableText = [
        note.title,
        note.content,
        note.author.display_name,
        note.book?.title ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN");

      return matchesBook && (keyword.length === 0 || searchableText.includes(keyword));
    });
  }, [bookFilter, query]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="社区"
        description="只浏览读者明确选择公开的笔记。私密与仅链接内容不会出现在这里。"
        action={
          <span className="text-sm text-[#85877d]">
            共 {filteredNotes.length} 篇公开笔记 · 演示
          </span>
        }
      />

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block flex-1">
          <span className="sr-only">搜索公开笔记</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8a8d82]"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、作者或摘录"
            className="h-10 rounded-full border-[#d8d2c4] bg-[#fdfbf6] pl-9"
          />
        </label>

        <div className="flex items-center gap-2">
          <SlidersHorizontal
            className="size-4 shrink-0 text-[#7d8075]"
            aria-hidden="true"
          />
          <Select
            value={bookFilter}
            onValueChange={(value) => {
              if (value) {
                setBookFilter(value);
              }
            }}
          >
            <SelectTrigger className="w-full min-w-44 border-[#d8d2c4] bg-[#fdfbf6] sm:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部书籍</SelectItem>
              {bookOptions.map((book) => (
                <SelectItem key={book.id} value={book.id}>
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TODO(stage 3): 接入真实数据后补充错误与重试状态。 */}
      {filteredNotes.length > 0 ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          title="没有找到公开笔记"
          description="试试更换关键词或选择其他书籍。只有用户明确公开的笔记会出现在社区。"
        />
      )}
    </div>
  );
}