"use client";

import {
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus } from "lucide-react";

import { createBook, updateBook } from "@/app/library/actions";
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
import {
  readingStatusLabels,
  readingStatusOptions,
  type BookRecord,
  type ReadingStatus,
} from "@/lib/supabase/types";

type BookFormDialogProps = {
  mode: "create" | "edit";
  book?: BookRecord;
  triggerLabel: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerClassName?: string;
};

type FormState = {
  success: boolean;
  message: string | null;
  bookId?: string;
};

const initialState: FormState = {
  success: false,
  message: null,
};

export function BookFormDialog({
  mode,
  book,
  triggerLabel,
  triggerVariant = "default",
  triggerClassName,
}: BookFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ReadingStatus>("want_to_read");
  const action = mode === "create" ? createBook : updateBook;
  const [state, setState] = useState<FormState>(initialState);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await action(initialState, formData);
        setState(result);

        if (result.success) {
          setOpen(false);
          router.refresh();
        }
      } catch {
        setState({ success: false, message: "保存失败，请稍后重试。" });
      }
    });
  }

  if (mode === "edit" && !book) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {mode === "create" ? (
          <Plus data-icon="inline-start" />
        ) : (
          <Pencil data-icon="inline-start" />
        )}
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border border-[#ded8ca] bg-[#fffdf8] sm:max-w-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-[#30342c]">
                {mode === "create" ? "添加一本书" : "编辑书籍信息"}
              </DialogTitle>
              <DialogDescription>
                {mode === "create"
                  ? "书籍会保存到你的私人书房，并同时创建阅读记录。"
                  : "修改书名、作者、封面和简介。阅读状态请在详情页调整。"}
              </DialogDescription>
            </DialogHeader>

            {mode === "edit" && book ? (
              <input type="hidden" name="id" value={book.id} />
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">书名</span>
              <Input
                name="title"
                required
                maxLength={200}
                defaultValue={book?.title ?? ""}
                placeholder="例如：额尔古纳河右岸"
                className="border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">作者</span>
              <Input
                name="author"
                maxLength={200}
                defaultValue={book?.author ?? ""}
                placeholder="例如：迟子建"
                className="border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">封面 URL</span>
              <Input
                name="cover_url"
                type="url"
                maxLength={2048}
                defaultValue={book?.cover_url ?? ""}
                placeholder="https://..."
                className="border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-[#5d6258]">简介</span>
              <Textarea
                name="description"
                maxLength={5000}
                defaultValue={book?.description ?? ""}
                placeholder="写一句关于这本书的简介"
                className="min-h-24 border-[#d8d2c4] bg-[#fdfbf6]"
              />
            </label>

            {mode === "create" ? (
              <div className="space-y-2">
                <span className="text-sm text-[#5d6258]">阅读状态</span>
                <input type="hidden" name="status" value={status} />
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (value) {
                      setStatus(value as ReadingStatus);
                    }
                  }}
                >
                  <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {readingStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {readingStatusLabels[option.value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {state.message && !state.success ? (
              <p
                role="alert"
                className="rounded-lg border border-[#e3cfc8] bg-[#f8eeea] px-3 py-2 text-sm leading-6 text-[#8a574b]"
              >
                {state.message}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
              >
                {isPending ? (
                  <LoaderCircle className="animate-spin" aria-hidden="true" />
                ) : null}
                {isPending ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}