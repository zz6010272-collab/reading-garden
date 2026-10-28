import Link from "next/link";
import { BookOpen, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  readingStatusLabels,
  type BookRecord,
  type ReadingRecord,
  type ReadingStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

const statusClassNames: Record<ReadingStatus, string> = {
  want_to_read: "bg-[#eee8dc] text-[#746650]",
  reading: "bg-[#e4ebdf] text-[#52644a]",
  finished: "bg-[#e8e6df] text-[#66645c]",
};

type BookCardProps = {
  book: BookRecord;
  readingRecord?: ReadingRecord | null;
  className?: string;
};

export function BookCard({ book, readingRecord, className }: BookCardProps) {
  const status = readingRecord?.status;
  const hasCover = Boolean(book.cover_url);

  return (
    <Link
      href={`/books/${book.id}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3]"
    >
      <Card
        className={cn(
          "h-full gap-0 overflow-hidden border-[#e1dbcd] bg-[#fffdf8] p-0 transition-colors group-hover:border-[#aeb9a4]",
          className,
        )}
      >
        <div className="relative flex aspect-[4/5] flex-col justify-between overflow-hidden border-b border-[#ddd6c7] bg-[#e9e3d5] p-5">
          {book.cover_url ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${JSON.stringify(book.cover_url)})` }}
              aria-hidden="true"
            />
          ) : null}
          {hasCover ? (
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-[#20231e]/55" aria-hidden="true" />
          ) : null}
          <div
            className="absolute inset-y-0 left-4 w-px bg-[#c8c0ae]/80"
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-3">
            <span
              className={cn(
                "text-[10px] tracking-[0.22em]",
                hasCover ? "text-white/80" : "text-[#77786d]",
              )}
            >
              READING GARDEN
            </span>
            {status ? (
              <Badge
                className={cn(
                  "border-0 text-[11px] font-normal",
                  statusClassNames[status],
                )}
              >
                {readingStatusLabels[status]}
              </Badge>
            ) : null}
          </div>
          <div className={cn("relative", hasCover && "text-white")}>
            <p className="font-serif text-2xl font-semibold leading-tight">
              {book.title}
            </p>
            <p
              className={cn(
                "mt-2 text-xs tracking-[0.12em]",
                hasCover ? "text-white/80" : "text-[#747769]",
              )}
            >
              {book.author ?? "未填写作者"}
            </p>
          </div>
          <div
            className={cn(
              "absolute bottom-5 right-5",
              hasCover ? "text-white/70" : "text-[#a29c8d]",
            )}
            aria-hidden="true"
          >
            <BookOpen className="size-5" />
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm text-[#666b60]">
              {book.author ?? "未填写作者"}
            </p>
            <span className="shrink-0 text-[11px] text-[#8d8476]">我的藏书</span>
          </div>

          {readingRecord?.rating ? (
            <p className="flex items-center gap-1 text-xs text-[#8f7654]">
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              个人评分 {readingRecord.rating} / 5
            </p>
          ) : (
            <p className="line-clamp-2 text-xs leading-5 text-[#85877d]">
              {book.description || "还没有填写书籍简介。"}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}