import { notFound } from "next/navigation"
import { Suspense } from "react";

import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state";
import { NoteCard } from "@/components/note-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  getProfileById,
  getPublicNotesForProfile,
} from "@/lib/mock-data";

type ProfilePageProps = {
  params: Promise<{ id: string }>;
};

const statLabels = ["公开笔记", "读过的书", "加入拾页"];

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
  const profile = getProfileById(id);

  if (!profile || profile.visibility !== "public") {
    notFound();
  }

  const publicNotes = getPublicNotesForProfile(profile.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="读者主页"
        description="公开主页只展示用户选择公开的资料与笔记。"
        action={
          <Badge
            variant="outline"
            className="border-[#d3ddcc] bg-[#e8eee3] text-[#52664b]"
          >
            公开资料 · 演示
          </Badge>
        }
      />

      <section className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
        <div className="rounded-2xl border border-[#e1dbcd] bg-[#fffdf8] p-6">
          <div className="flex size-20 items-center justify-center rounded-full border border-[#cbd4c3] bg-[#e7ecdf] font-serif text-3xl text-[#5b6c52]">
            {profile.display_name.slice(0, 1)}
          </div>
          <h1 className="mt-5 font-serif text-3xl font-semibold text-[#30342c]">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-[#8a8c82]">@{profile.username}</p>
          <p className="mt-5 text-sm leading-7 text-[#676c61]">{profile.bio}</p>

          <div className="mt-7 grid grid-cols-3 gap-2 border-t border-[#ebe5d9] pt-5 text-center">
            {statLabels.map((label) => (
              <div key={label}>
                <p className="font-serif text-xl text-[#4f5a49]">——</p>
                <p className="mt-1 text-[10px] text-[#8d8f85]">{label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-[#9a9b91]">
            统计占位 · 阶段 3 后接入
          </p>
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
            <span className="text-xs text-[#8b8d82]">演示数据</span>
          </div>

          {publicNotes.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {publicNotes.map((note) => (
                <NoteCard key={note.id} note={note} compact />
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