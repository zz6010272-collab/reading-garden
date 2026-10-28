"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { saveNote } from "@/app/write/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  noteVisibilityLabels,
  type NoteVisibility,
} from "@/lib/supabase/types";

export type NoteEditorBook = {
  id: string;
  title: string;
  author: string | null;
};

export type NoteEditorInitialData = {
  id: string;
  book_id: string | null;
  title: string;
  summary: string;
  reflection: string;
  content: string;
  visibility: NoteVisibility;
  tags: string;
  quotes: string;
};

type NoteEditorFormProps = {
  books: NoteEditorBook[];
  note?: NoteEditorInitialData;
};

type FormState = {
  success: boolean;
  message: string | null;
  noteId?: string;
};

const initialState: FormState = { success: false, message: null };

export function NoteEditorForm({ books, note }: NoteEditorFormProps) {
  const router = useRouter();
  const [bookId, setBookId] = useState(note?.book_id ?? "none");
  const [visibility, setVisibility] = useState<NoteVisibility>(
    note?.visibility ?? "private",
  );
  const [tags, setTags] = useState(note?.tags ?? "");
  const [quotes, setQuotes] = useState(note?.quotes ?? "");
  const [state, setState] = useState<FormState>(initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("bookId", bookId === "none" ? "" : bookId);
    formData.set("visibility", visibility);
    formData.set("tags", tags);
    formData.set("quotes", quotes);
    setState(initialState);

    startTransition(async () => {
      try {
        const result = await saveNote(initialState, formData);
        setState(result);

        if (result.success && result.noteId) {
          router.push(`/notes/${result.noteId}`);
          router.refresh();
        }
      } catch {
        setState({ success: false, message: "保存笔记失败，请稍后重试。" });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
      {note ? <input type="hidden" name="id" value={note.id} /> : null}

      <div className="space-y-5 rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-7">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#4f554a]">标题</span>
          <Input
            name="title"
            required
            maxLength={200}
            defaultValue={note?.title ?? ""}
            placeholder="给这篇笔记一个清楚的标题"
            className="h-11 rounded-xl border-[#d8d2c4] bg-[#fdfbf6] text-base"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#4f554a]">摘要</span>
          <Textarea
            name="summary"
            maxLength={5000}
            defaultValue={note?.summary ?? ""}
            placeholder="用于列表卡片和预览，1–3 句话即可"
            className="min-h-20 border-[#d8d2c4] bg-[#fdfbf6]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#4f554a]">
            个人感想 · 支持 Markdown
          </span>
          <Textarea
            name="reflection"
            maxLength={100000}
            defaultValue={note?.reflection ?? ""}
            placeholder="写下阅读时真正留给你的问题、联想和判断……"
            className="min-h-48 border-[#d8d2c4] bg-[#fdfbf6] leading-7"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[#4f554a]">
            正文内容 · 支持 Markdown
          </span>
          <Textarea
            name="content"
            maxLength={100000}
            defaultValue={note?.content ?? ""}
            placeholder={"## 小标题\n\n在这里整理完整正文、资料和延伸阅读。"}
            className="min-h-[360px] border-[#d8d2c4] bg-[#fdfbf6] font-mono text-sm leading-7"
            spellCheck={false}
          />
        </label>
      </div>

      <aside className="space-y-5 lg:sticky lg:top-24">
        <div className="space-y-5 rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5">
          <div className="space-y-2">
            <span className="text-xs text-[#7c7f74]">关联书籍</span>
            <input type="hidden" name="bookId" value={bookId === "none" ? "" : bookId} />
            <Select
              value={bookId}
              onValueChange={(value) => {
                if (value) {
                  setBookId(value);
                }
              }}
            >
              <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不关联书籍</SelectItem>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title}{book.author ? ` · ${book.author}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-[#7c7f74]">可见范围</span>
            <input type="hidden" name="visibility" value={visibility} />
            <Select
              value={visibility}
              onValueChange={(value) => {
                if (value) {
                  setVisibility(value as NoteVisibility);
                }
              }}
            >
              <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["private", "unlisted", "public"] as const).map((value) => (
                  <SelectItem key={value} value={value}>
                    {noteVisibilityLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="block space-y-2">
            <span className="text-xs text-[#7c7f74]">标签</span>
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="文学, 阅读方法, 待读"
              className="border-[#d8d2c4] bg-[#fdfbf6]"
            />
            <span className="text-[10px] text-[#93958a]">用逗号分隔，最多 20 个</span>
          </label>

          <label className="block space-y-2">
            <span className="text-xs text-[#7c7f74]">摘录</span>
            <Textarea
              value={quotes}
              onChange={(event) => setQuotes(event.target.value)}
              placeholder={"每行一条摘录\n第二行是另一条摘录"}
              className="min-h-32 border-[#d8d2c4] bg-[#fdfbf6]"
            />
            <span className="text-[10px] text-[#93958a]">每行保存为一条独立摘录</span>
          </label>

          {state.message && !state.success ? (
            <p role="alert" className="rounded-lg border border-[#e3cfc8] bg-[#f8eeea] px-3 py-2 text-sm leading-6 text-[#8a574b]">
              {state.message}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
          >
            {isPending ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <Save aria-hidden="true" />
            )}
            {isPending ? "保存中…" : note ? "更新笔记" : "保存笔记"}
          </Button>
        </div>

        <p className="px-1 text-xs leading-6 text-[#8c8e84]">
          笔记会按可见范围进入社区或个人主页。公开前请确认没有不适合公开的私人内容。
        </p>
      </aside>
    </form>
  );
}