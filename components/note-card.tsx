import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TagBadge } from "@/components/tag-badge";
import {
  formatMockDate,
  visibilityLabels,
  type NoteVisibility,
  type NoteWithRelations,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const visibilityClassNames: Record<NoteVisibility, string> = {
  private: "border-[#ddd4cc] bg-[#eee9e5] text-[#78655d]",
  public: "border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]",
  unlisted: "border-[#e4d8bd] bg-[#f3ead5] text-[#7c6841]",
};

type VisibilityBadgeProps = {
  visibility: NoteVisibility;
  className?: string;
};

export function VisibilityBadge({
  visibility,
  className,
}: VisibilityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[11px] font-normal",
        visibilityClassNames[visibility],
        className,
      )}
      title={`笔记可见范围：${visibilityLabels[visibility]}`}
    >
      {visibilityLabels[visibility]}
    </Badge>
  );
}

function createSummary(content: string) {
  const plainText = content
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.length > 112 ? `${plainText.slice(0, 112)}…` : plainText;
}

type NoteCardProps = {
  note: NoteWithRelations;
  className?: string;
  compact?: boolean;
};

export function NoteCard({ note, className, compact = false }: NoteCardProps) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3]"
    >
      <Card
        className={cn(
          "h-full gap-0 border-[#e1dbcd] bg-[#fffdf8] p-0 transition-colors group-hover:border-[#aeb9a4]",
          compact ? "p-4" : "p-5 sm:p-6",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <VisibilityBadge visibility={note.visibility} />
            {note.book ? (
              <span className="text-[11px] text-[#8a877b]">
                《{note.book.title}》
              </span>
            ) : null}
          </div>
          <ArrowUpRight
            className="mt-0.5 size-4 shrink-0 text-[#aaa698] transition-colors group-hover:text-[#66745c]"
            aria-hidden="true"
          />
        </div>

        <h2
          className={cn(
            "mt-4 font-serif font-semibold leading-snug text-[#30332c]",
            compact ? "text-lg" : "text-xl sm:text-2xl",
          )}
        >
          {note.title}
        </h2>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#74776d]">
          {createSummary(note.content)}
        </p>

        {note.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} name={tag.name} />
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#ebe5d9] pt-3 text-xs text-[#87887e]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e5e9dd] text-[10px] font-medium text-[#5b6a53]">
              {note.author.display_name.slice(0, 1)}
            </span>
            <span className="truncate">{note.author.display_name}</span>
          </div>
          <time dateTime={note.updated_at}>{formatMockDate(note.updated_at)}</time>
        </div>
      </Card>
    </Link>
  );
}