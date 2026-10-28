"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Save, Star } from "lucide-react";

import { updateReadingRecord } from "@/app/library/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  readingStatusLabels,
  readingStatusOptions,
  type ReadingRecord,
  type ReadingStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const initialState = {
  success: false,
  message: null,
};

type ReadingRecordEditorProps = {
  bookId: string;
  record: ReadingRecord | null;
};

export function ReadingRecordEditor({ bookId, record }: ReadingRecordEditorProps) {
  const [status, setStatus] = useState<ReadingStatus>(
    record?.status ?? "want_to_read",
  );
  const [rating, setRating] = useState<number | null>(record?.rating ?? null);
  const [state, formAction, isPending] = useActionState(
    updateReadingRecord,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="bookId" value={bookId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="rating" value={rating ?? ""} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="text-xs text-[#7b7e73]">阅读状态</span>
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

        <div className="space-y-2">
          <span className="text-xs text-[#7b7e73]">个人评分</span>
          <div className="flex min-h-8 flex-wrap items-center gap-1">
            {[1, 2, 3, 4, 5].map((value) => {
              const selected = rating !== null && value <= rating;

              return (
                <button
                  key={value}
                  type="button"
                  className="rounded-md p-1 text-[#a28d6c] outline-none hover:bg-[#eee9dd] focus-visible:ring-2 focus-visible:ring-[#87967b]"
                  aria-label={`${value} 星`}
                  aria-pressed={rating === value}
                  onClick={() => setRating(value)}
                >
                  <Star
                    className={cn(
                      "size-5",
                      selected ? "fill-current" : "fill-transparent",
                    )}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
            {rating !== null ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="ml-1 text-[#888a80]"
                onClick={() => setRating(null)}
              >
                清除
              </Button>
            ) : null}
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-xs text-[#7b7e73]">开始阅读</span>
          <Input
            type="date"
            name="started_at"
            defaultValue={record?.started_at ?? ""}
            className="border-[#d8d2c4] bg-[#fdfbf6]"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs text-[#7b7e73]">完成阅读</span>
          <Input
            type="date"
            name="finished_at"
            defaultValue={record?.finished_at ?? ""}
            className="border-[#d8d2c4] bg-[#fdfbf6]"
          />
        </label>
      </div>

      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={cn(
            "rounded-lg border px-3 py-2 text-sm leading-6",
            state.success
              ? "border-[#d2ddcb] bg-[#edf3e8] text-[#52664b]"
              : "border-[#e3cfc8] bg-[#f8eeea] text-[#8a574b]",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
      >
        {isPending ? (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <Save aria-hidden="true" />
        )}
        {isPending ? "保存中…" : "保存阅读记录"}
      </Button>
    </form>
  );
}