import Link from "next/link";
import { ArrowUpRight, BookOpen } from "lucide-react";

import { TagBadge } from "@/components/tag-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatReadingDate,
  type NoteWithRelations,
} from "@/lib/supabase/types";

type PublicNoteCardProps = {
  note: NoteWithRelations;
};

function notePreview(note: NoteWithRelations) {
  const source = note.summary || note.content || note.reflection || "";
  const plainText = source
    .replace(/^#+\s*/gm, "")
    .replace(/[*_`>-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return plainText.length > 140 ? `${plainText.slice(0, 140)}…` : plainText;
}

export function PublicNoteCard({ note }: PublicNoteCardProps) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3]"
    >
      <Card className="h-full gap-0 border-[#e1dbcd] bg-[#fffdf8] p-5 transition-colors group-hover:border-[#aeb9a4] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]"
            >
              公开
            </Badge>
            {note.book ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#85877c]">
                <BookOpen className="size-3" aria-hidden="true" />
                {note.book.title}
              </span>
            ) : null}
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-[#aaa698] group-hover:text-[#66745c]"
            aria-hidden="true"
          />
        </div>

        <h2 className="mt-4 font-serif text-xl font-semibold leading-snug text-[#30332c] sm:text-2xl">
          {note.title}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#74776d]">
          {notePreview(note) || "这篇笔记暂时没有正文。"}
        </p>

        {note.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {note.tags.slice(0, 4).map((tag) => (
              <TagBadge key={tag.id} name={tag.name} />
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#ebe5d9] pt-3 text-xs text-[#87887e]">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#e5e9dd] text-[10px] font-medium text-[#5b6a53]">
              {(note.author.display_name || "读").slice(0, 1)}
            </span>
            <span className="truncate">{note.author.display_name || "读者"}</span>
          </div>
          <time dateTime={note.updated_at}>
            {formatReadingDate(note.updated_at)}
          </time>
        </div>
      </Card>
    </Link>
  );
}