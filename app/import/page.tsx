import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { ImportHub } from "@/components/import-hub";
import { LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { isWereadConfigured } from "@/lib/importers/weread/gateway";
import { createClient } from "@/lib/supabase/server";
import type { NoteEditorBook } from "@/components/note-editor-form";

export default function ImportPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <LoadingState cards={2} label="正在准备导入中心…" />
        </div>
      }
    >
      <ImportContent />
    </Suspense>
  );
}

async function ImportContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: bookRows, error: booksError } = await supabase
    .from("books")
    .select("id, title, author")
    .eq("owner_id", user.id)
    .order("title", { ascending: true });

  if (booksError) {
    console.error("Failed to load books for import center", booksError);
    throw new Error("加载书架失败，请稍后重试。");
  }

  const books = (bookRows ?? []) as NoteEditorBook[];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <PageHeader
        title="导入中心"
        description="手动导入 PDF、TXT 或 Markdown，或通过官方 Agent Skill 读取微信读书的书籍、划线与阅读统计。"
        showDemoBadge={false}
        action={
          <span className="text-sm text-[#85877d]">
            {books.length} 本书可选
          </span>
        }
      />
      <ImportHub books={books} wereadConfigured={isWereadConfigured()} />
    </div>
  );
}