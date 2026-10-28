"use client";

import { BookMarked, Files } from "lucide-react";

import { ImportCenter } from "@/components/import-center";
import type { NoteEditorBook } from "@/components/note-editor-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WereadImportPanel } from "@/components/weread-import-panel";

type ImportHubProps = {
  books: NoteEditorBook[];
  wereadConfigured: boolean;
};

export function ImportHub({ books, wereadConfigured }: ImportHubProps) {
  return (
    <Tabs defaultValue="files" className="mt-8">
      <TabsList className="h-auto w-full justify-start gap-1 rounded-xl border border-[#e1dbcd] bg-[#f5f1e7] p-1 sm:w-fit">
        <TabsTrigger value="files" className="h-9 rounded-lg px-4">
          <Files className="size-4" aria-hidden="true" />
          文件导入
        </TabsTrigger>
        <TabsTrigger value="weread" className="h-9 rounded-lg px-4">
          <BookMarked className="size-4" aria-hidden="true" />
          微信读书
        </TabsTrigger>
      </TabsList>

      <TabsContent value="files" className="pt-1">
        <ImportCenter books={books} />
      </TabsContent>

      <TabsContent value="weread" className="pt-1">
        <WereadImportPanel configured={wereadConfigured} />
      </TabsContent>
    </Tabs>
  );
}
