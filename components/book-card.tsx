import Link from "next/link";
import { BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  readingStatusLabels,
  type Book,
  type ReadingRecord,
  type ReadingStatus,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusClassNames: Record<ReadingStatus, string> = {
  want_to_read: "bg-[#eee8dc] text-[#746650]",
  reading: "bg-[#e4ebdf] text-[#52644a]",
  finished: "bg-[#e8e6df] text-[#66645c]",
  paused: "bg-[#f0e4d8] text-[#856b50]",
  abandoned: "bg-[#ece4e2] text-[#83615b]",
};

type BookCardProps = {
  book: Book;
  readingRecord?: ReadingRecord | null;
  className?: string;
};

export function BookCard({ book, readingRecord, className }: BookCardProps) {
  const status = readingRecord?.status;

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
          <div
            className="absolute inset-y-0 left-4 w-px bg-[#c8c0ae]/80"
            aria-hidden="true"
          />
          <div className="relative flex items-start justify-between gap-3">
            <span className="text-[10px] tracking-[0.22em] text-[#77786d]">
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
          <div className="relative">
            <p className="font-serif text-2xl font-semibold leading-tight text-[#33362e]">
              {book.title}
            </p>
            <p className="mt-2 text-xs tracking-[0.12em] text-[#747769]">
              {book.author}
            </p>
          </div>
          <div
            className="absolute bottom-5 right-5 text-[#a29c8d]"
            aria-hidden="true"
          >
            <BookOpen className="size-5" />
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-[#666b60]">{book.author}</p>
            {book.visibility === "private" ? (
              <span className="text-[11px] text-[#8d8476]">私密书架</span>
            ) : null}
          </div>
          {readingRecord?.status === "reading" ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-[#7a7d72]">
                <span>阅读进度</span>
                <span>{readingRecord.progress_percent}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#e8e3d8]">
                <div
                  className="h-full rounded-full bg-[#7c8d70]"
                  style={{ width: `${readingRecord.progress_percent}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="line-clamp-2 text-xs leading-5 text-[#85877d]">
              {book.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}