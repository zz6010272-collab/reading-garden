import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { EmptyState } from "@/components/empty-state";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { PublicNoteCard } from "@/components/public-note-card";
import { Badge } from "@/components/ui/badge";
import { NOTE_RELATION_SELECT, buildNoteWithRelations } from "@/lib/supabase/notes";
import { createClient } from "@/lib/supabase/server";
import type {
  NoteRelationRow,
  NoteWithRelations,
  ProfileRecord,
} from "@/lib/supabase/types";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default function ProfilePage({ params }: ProfilePageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={2} label="正在整理读者主页…" />
        </div>
      }
    >
      <ProfileContent params={params} />
    </Suspense>
  );
}

async function ProfileContent({ params }: ProfilePageProps) {
  const { id } = await params;
  await connection();
  const supabase = await createClient();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (profileError) {
    console.error("Failed to load profile", profileError);
    throw new Error("加载读者主页失败，请稍后重试。");
  }

  if (!profileData) {
    notFound();
  }

  const profile = profileData as ProfileRecord;
  const { count: totalPublicNotes, error: countError } = await supabase
    .from("notes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .eq("visibility", "public");

  if (countError) {
    console.error("Failed to count public notes", countError);
  }

  const { data: noteRows, error: notesError } = await supabase
    .from("notes")
    .select(NOTE_RELATION_SELECT)
    .eq("user_id", profile.id)
    .eq("visibility", "public")
    .order("updated_at", { ascending: false })
    .limit(50);

  if (notesError) {
    console.error("Failed to load profile notes", notesError);
    throw new Error("加载公开笔记失败，请稍后重试。");
  }

  const publicNotes: NoteWithRelations[] = (
    (noteRows ?? []) as unknown as NoteRelationRow[]
  ).map((row) => buildNoteWithRelations(row, profile));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="读者主页"
        description="这里只展示公开资料，以及读者明确选择公开的笔记。"
        showDemoBadge={false}
        action={
          <Badge
            variant="outline"
            className="border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]"
          >
            公开资料
          </Badge>
        }
      />

      <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6">
          <div className="flex size-20 items-center justify-center rounded-full border border-[#cbd4c3] bg-[#e7ecdf] font-serif text-3xl text-[#5b6c52]">
            {(profile.display_name || "读").slice(0, 1)}
          </div>
          <h1 className="mt-5 font-serif text-3xl font-semibold text-[#30342c]">
            {profile.display_name || "读者"}
          </h1>
          <p className="mt-5 text-sm leading-7 text-[#676c61]">
            {profile.bio || "这位读者还没有填写个人简介。"}
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2 border-t border-[#ebe5d9] pt-5 text-center">
            <div>
              <p className="font-serif text-xl text-[#4f5a49]">
                {totalPublicNotes ?? publicNotes.length}
              </p>
              <p className="mt-1 text-[10px] text-[#8d8f85]">公开笔记</p>
            </div>
            <div>
              <p className="font-serif text-xl text-[#4f5a49]">——</p>
              <p className="mt-1 text-[10px] text-[#8d8f85]">读过的书</p>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-[#8a8c81]">
                PUBLIC NOTES
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[#30342c]">
                公开笔记
              </h2>
            </div>
            <span className="text-xs text-[#8b8d82]">
              {publicNotes.length} 篇
            </span>
          </div>

          {publicNotes.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {publicNotes.map((note) => (
                <PublicNoteCard key={note.id} note={note} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="还没有公开笔记"
              description="这位读者暂时没有公开内容。私密与仅链接笔记不会在这里显示。"
            />
          )}
        </div>
      </section>
    </div>
  );
}