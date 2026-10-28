"use client";

import { useState } from "react";
import { FilePenLine, Save } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { NoteVisibility } from "@/lib/mock-data";

export default function WritePage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [chapter, setChapter] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [savedOpen, setSavedOpen] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="写一篇笔记"
        description="先把阅读时想到的东西留下来。当前为编辑器占位，不会写入真实数据。"
        action={
          <Button
            type="submit"
            form="note-editor"
            size="lg"
            className="h-10 rounded-full bg-[#68785d] px-5 text-white hover:bg-[#5a6a50]"
          >
            <Save data-icon="inline-start" />
            保存笔记
          </Button>
        }
      />

      <form
        id="note-editor"
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start"
        onSubmit={handleSubmit}
      >
        <div className="space-y-5 rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5 sm:p-7">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[#4f554a]">标题</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="给这篇笔记一个清楚的标题"
              className="h-11 rounded-xl border-[#d8d2c4] bg-[#fdfbf6] text-base"
            />
          </label>

          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-medium text-[#4f554a]">
              <FilePenLine className="size-4 text-[#7d8b72]" aria-hidden="true" />
              正文
              <Badge
                variant="outline"
                className="ml-auto border-[#d8d2c4] text-[10px] font-normal text-[#7c7e74]"
              >
                编辑器占位
              </Badge>
            </span>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={"可以在这里写 Markdown：\n\n## 一个小标题\n\n写下这段阅读留给你的问题。"}
              className="min-h-[420px] resize-y rounded-xl border-[#d8d2c4] bg-[#fdfbf6] font-mono text-sm leading-7"
              spellCheck={false}
            />
          </label>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-5">
            <h2 className="font-serif text-lg font-semibold text-[#34382f]">
              笔记信息
            </h2>

            <div className="mt-5 space-y-5">
              <label className="block space-y-2">
                <span className="text-xs text-[#7c7f74]">章节</span>
                <Input
                  value={chapter}
                  onChange={(event) => setChapter(event.target.value)}
                  placeholder="例如：第三章"
                  className="border-[#d8d2c4] bg-[#fdfbf6]"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs text-[#7c7f74]">可见范围</span>
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
                    <SelectItem value="private">私密 · 仅自己</SelectItem>
                    <SelectItem value="unlisted">仅链接 · 不进入列表</SelectItem>
                    <SelectItem value="public">公开 · 可被访客看到</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="mt-5 border-t border-[#ebe5d9] pt-4 text-xs leading-6 text-[#888a80]">
              阶段 2 仅演示编辑界面。保存按钮不会写入数据库，也不会调用外部接口。
            </p>
          </div>

          <div className="rounded-2xl border border-dashed border-[#d8d2c4] bg-[#f7f3ea]/70 p-5 text-xs leading-6 text-[#7f8177]">
            建议先写“为什么这段话对我重要”，再补充摘录和章节。长笔记会自动保持舒适行宽。
          </div>
        </aside>
      </form>

      <Dialog open={savedOpen} onOpenChange={setSavedOpen}>
        <DialogContent className="border border-[#ded8ca] bg-[#fffdf8]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#30342c]">
              已保存（演示）
            </DialogTitle>
            <DialogDescription>
              当前只是交互演示，笔记没有写入数据库。阶段 4 接入真实笔记服务后会显示真实保存结果。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              onClick={() => setSavedOpen(false)}
            >
              知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}