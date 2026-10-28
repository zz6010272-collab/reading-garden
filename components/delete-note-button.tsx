"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Trash2 } from "lucide-react";

import { deleteNote } from "@/app/write/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DeleteNoteButtonProps = {
  noteId: string;
  noteTitle: string;
};

export function DeleteNoteButton({ noteId, noteTitle }: DeleteNoteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setErrorMessage(null);

    startTransition(async () => {
      const result = await deleteNote(noteId);

      if (!result.success) {
        setErrorMessage(result.message ?? "删除笔记失败，请稍后重试。");
        return;
      }

      setOpen(false);
      router.replace("/library");
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="rounded-full border-[#d9c9c3] text-[#825d53] hover:bg-[#f3e9e5]"
        onClick={() => setOpen(true)}
      >
        <Trash2 data-icon="inline-start" />
        删除笔记
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border border-[#ded8ca] bg-[#fffdf8]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-[#30342c]">
              确认删除这篇笔记？
            </DialogTitle>
            <DialogDescription>
              《{noteTitle}》及其摘录、标签关联、评论和点赞会按数据库级联规则一起删除，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>

          {errorMessage ? (
            <p role="alert" className="rounded-lg border border-[#e3cfc8] bg-[#f8eeea] px-3 py-2 text-sm leading-6 text-[#8a574b]">
              {errorMessage}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#9b5f54] text-white hover:bg-[#884f46]"
              disabled={isPending}
              onClick={handleDelete}
            >
              {isPending ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {isPending ? "删除中…" : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}