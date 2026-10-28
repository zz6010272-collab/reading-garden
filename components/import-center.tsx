"use client";

import { useRef, useState, useTransition, type DragEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FileCode2,
  FileText,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";

import { importFileAction } from "@/app/import/actions";
import type { NoteEditorBook } from "@/components/note-editor-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  noteVisibilityLabels,
  type NoteVisibility,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type SourceType = "pdf" | "text";

type ImportCenterProps = {
  books: NoteEditorBook[];
};

const PDF_MAX_BYTES = 20 * 1024 * 1024;
const TEXT_MAX_BYTES = 5 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(["txt", "md", "markdown"]);
const TEXT_MIME_TYPES = new Set([
  "",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream",
]);

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLocaleLowerCase() ?? "";
}

function validateClientFile(file: File, sourceType: SourceType) {
  const extension = getExtension(file.name);

  if (sourceType === "pdf") {
    if (extension !== "pdf" || (file.type && file.type !== "application/pdf")) {
      return "请选择有效的 PDF 文件。";
    }

    if (file.size > PDF_MAX_BYTES) {
      return "PDF 文件不能超过 20MB。";
    }

    return null;
  }

  if (!TEXT_EXTENSIONS.has(extension) || !TEXT_MIME_TYPES.has(file.type)) {
    return "请选择 TXT、MD 或 Markdown 文件。";
  }

  if (file.size > TEXT_MAX_BYTES) {
    return "TXT/Markdown 文件不能超过 5MB。";
  }

  return null;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => {
          if (!("str" in item)) {
            return "";
          }

          return `${item.str}${item.hasEOL ? "\n" : " "}`;
        })
        .join("");

      pages.push(pageText.replace(/[ \t]+\n/g, "\n").trim());
    }

    return pages.filter(Boolean).join("\n\n");
  } finally {
    await loadingTask.destroy();
  }
}

export function ImportCenter({ books }: ImportCenterProps) {
  const router = useRouter();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<SourceType>("pdf");
  const [extractedText, setExtractedText] = useState("");
  const [title, setTitle] = useState("");
  const [bookId, setBookId] = useState("none");
  const [visibility, setVisibility] = useState<NoteVisibility>("private");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<SourceType | null>(null);
  const [isSaving, startSaving] = useTransition();

  async function handleSelectedFile(selectedFile: File, nextSource: SourceType) {
    setErrorMessage(null);
    setNotice(null);
    setExtractionFailed(false);
    setExtractedText("");
    setSourceType(nextSource);
    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.[^.]+$/, ""));
    setBookId("none");
    setVisibility("private");

    const validationError = validateClientFile(selectedFile, nextSource);

    if (validationError) {
      setErrorMessage(validationError);
      setPreviewOpen(false);
      return;
    }

    setIsReading(true);
    setStatus(nextSource === "pdf" ? "正在提取 PDF 文字…" : "正在读取文本…");

    try {
      const text =
        nextSource === "pdf"
          ? await extractPdfText(selectedFile)
          : await selectedFile.text();

      if (!text.trim()) {
        setExtractedText("");
        setExtractionFailed(true);
        setErrorMessage(
          "提取失败：PDF 可能是扫描版、已加密或没有可复制文字。你可以只保存原始文件，但不会生成空笔记。",
        );
        setPreviewOpen(true);
        setStatus("文字提取失败");
        return;
      }

      setExtractedText(text);
      setPreviewOpen(true);
      setStatus("文字提取完成，请预览并确认。");
    } catch (error) {
      console.error("File text extraction failed", error);
      setExtractedText("");
      setExtractionFailed(true);
      setErrorMessage(
        "提取失败：PDF 可能已加密、损坏或为扫描版。你可以只保存原始文件，但不会生成空笔记。",
      );
      setPreviewOpen(true);
      setStatus("文字提取失败");
    } finally {
      setIsReading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>, nextSource: SourceType) {
    event.preventDefault();
    setDropTarget(null);
    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      void handleSelectedFile(droppedFile, nextSource);
    }
  }

  function submitImport(rawOnly: boolean) {
    if (!file) {
      setErrorMessage("文件已失效，请重新选择。");
      return;
    }

    const formData = new FormData();
    formData.set("file", file, file.name);
    formData.set("sourceType", sourceType);
    formData.set("rawOnly", rawOnly ? "true" : "false");
    formData.set("title", title);
    formData.set("bookId", bookId === "none" ? "" : bookId);
    formData.set("visibility", visibility);
    formData.set("text", rawOnly ? "" : extractedText);
    setErrorMessage(null);
    setStatus("正在上传并保存…");

    startSaving(async () => {
      try {
        const result = await importFileAction(
          { success: false, message: null },
          formData,
        );

        if (!result.success) {
          setErrorMessage(result.message ?? "导入失败，请稍后重试。");
          setStatus("导入失败");
          return;
        }

        setPreviewOpen(false);

        if (result.noteId) {
          router.push(`/notes/${result.noteId}`);
          router.refresh();
          return;
        }

        setNotice(result.message ?? "原始文件已保存。");
        setStatus(null);
        setFile(null);
        setExtractedText("");
      } catch {
        setErrorMessage("导入失败，请稍后重试。");
        setStatus("导入失败");
      }
    });
  }

  function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitImport(extractionFailed);
  }

  return (
    <div className="mt-8 space-y-6">
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          if (selected) void handleSelectedFile(selected, "pdf");
        }}
      />
      <input
        ref={textInputRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown,text/x-markdown"
        className="sr-only"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          event.target.value = "";
          if (selected) void handleSelectedFile(selected, "text");
        }}
      />

      <div className="grid gap-5 md:grid-cols-2">
        <button
          type="button"
          disabled={isReading || isSaving}
          className="text-left outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3] disabled:cursor-wait"
          onClick={() => pdfInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDropTarget("pdf");
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(event) => handleDrop(event, "pdf")}
        >
          <Card
            className={cn(
              "h-full min-h-64 gap-0 border-2 border-dashed border-[#ddcfbd] bg-[#f3ede2] p-7 transition-colors",
              dropTarget === "pdf" && "border-[#8a9a7c] bg-[#eef2e9]",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e9ddcd] text-[#7b664e]">
              <FileText className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-6 font-serif text-2xl font-semibold text-[#34382f]">导入 PDF</h2>
            <p className="mt-3 text-sm leading-7 text-[#656a60]">
              点击选择或拖拽 PDF。文件会存入私有 Storage，并在浏览器内提取文字。
            </p>
            <p className="mt-5 text-xs font-medium text-[#7b664e]">
              PDF ≤ 20MB · 不支持扫描件文字提取
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-[#68775e]">
              <UploadCloud className="size-4" aria-hidden="true" />选择 PDF 文件
            </div>
          </Card>
        </button>

        <button
          type="button"
          disabled={isReading || isSaving}
          className="text-left outline-none focus-visible:ring-2 focus-visible:ring-[#7b8b70] focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f3] disabled:cursor-wait"
          onClick={() => textInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDropTarget("text");
          }}
          onDragLeave={() => setDropTarget(null)}
          onDrop={(event) => handleDrop(event, "text")}
        >
          <Card
            className={cn(
              "h-full min-h-64 gap-0 border-2 border-dashed border-[#d4ddce] bg-[#eef2e9] p-7 transition-colors",
              dropTarget === "text" && "border-[#8a9a7c] bg-[#e8eee3]",
            )}
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#dfe8d8] text-[#5b7052]">
              <FileCode2 className="size-6" aria-hidden="true" />
            </span>
            <h2 className="mt-6 font-serif text-2xl font-semibold text-[#34382f]">
              导入 TXT / Markdown
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#656a60]">
              点击选择或拖拽文本文件。内容会直接读取并进入预览确认。
            </p>
            <p className="mt-5 text-xs font-medium text-[#5b7052]">
              TXT / MD / Markdown ≤ 5MB
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-[#68775e]">
              <UploadCloud className="size-4" aria-hidden="true" />选择文本文件
            </div>
          </Card>
        </button>
      </div>

      {isReading || isSaving || status ? (
        <div className="rounded-xl border border-[#d8d2c4] bg-[#f8f4eb] px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-[#596650]">
            {isReading || isSaving ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            {status ?? (isSaving ? "正在上传并保存…" : "处理中…")}
          </div>
          {isReading || isSaving ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e4ddce]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-[#7c8d70]" />
            </div>
          ) : null}
        </div>
      ) : null}

      {errorMessage && !previewOpen ? (
        <p role="alert" className="rounded-xl border border-[#e3cfc8] bg-[#f8eeea] px-4 py-3 text-sm leading-6 text-[#8a574b]">
          {errorMessage}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl border border-[#d2ddcb] bg-[#edf3e8] px-4 py-3 text-sm leading-6 text-[#52664b]">
          {notice}
        </p>
      ) : null}
      <p className="rounded-xl border border-dashed border-[#d8d2c4] bg-[#f7f3ea]/70 px-5 py-4 text-xs leading-6 text-[#7f8177]">
        文件只保存在私有 bucket，不会公开。导入成功后会创建一条笔记；扫描版或加密 PDF 可以选择仅保存原始文件。
      </p>
      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setErrorMessage(null);
            setStatus(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto border border-[#ded8ca] bg-[#fffdf8] sm:max-w-3xl">
          <form onSubmit={handleConfirm} className="space-y-5">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl text-[#30342c]">
                预览与确认
              </DialogTitle>
              <DialogDescription>
                {extractionFailed
                  ? "文字提取失败。你可以只保存原始文件，不会生成空笔记。"
                  : "检查提取的文字和导入信息，确认后保存到私有 Storage 和笔记库。"}
              </DialogDescription>
            </DialogHeader>

            {file ? (
              <div className="rounded-xl border border-[#e4ddce] bg-[#f8f4eb] px-4 py-3 text-xs text-[#74776d]">
                {file.name} · {formatFileSize(file.size)}
              </div>
            ) : null}

            {!extractionFailed ? (
              <>
                <label className="block space-y-2">
                  <span className="text-sm text-[#5d6258]">笔记标题</span>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={200}
                    required
                    className="border-[#d8d2c4] bg-[#fdfbf6]"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <span className="text-sm text-[#5d6258]">关联书籍</span>
                    <Select
                      value={bookId}
                      onValueChange={(value) => {
                        if (value) setBookId(value);
                      }}
                    >
                      <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">不关联书籍</SelectItem>
                        {books.map((book) => (
                          <SelectItem key={book.id} value={book.id}>
                            {book.title}{book.author ? ` · ${book.author}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <span className="text-sm text-[#5d6258]">可见范围</span>
                    <Select
                      value={visibility}
                      onValueChange={(value) => {
                        if (value) setVisibility(value as NoteVisibility);
                      }}
                    >
                      <SelectTrigger className="w-full border-[#d8d2c4] bg-[#fdfbf6]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(["private", "unlisted", "public"] as const).map((value) => (
                          <SelectItem key={value} value={value}>
                            {noteVisibilityLabels[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <label className="block space-y-2">
                  <span className="text-sm text-[#5d6258]">提取文字（可编辑）</span>
                  <Textarea
                    value={extractedText}
                    onChange={(event) => setExtractedText(event.target.value)}
                    className="min-h-72 border-[#d8d2c4] bg-[#fdfbf6] font-mono text-sm leading-7"
                  />
                </label>
              </>
            ) : null}

            {errorMessage ? (
              <p role="alert" className="rounded-lg border border-[#e3cfc8] bg-[#f8eeea] px-3 py-2 text-sm leading-6 text-[#8a574b]">
                {errorMessage}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={isSaving}
                onClick={() => setPreviewOpen(false)}
              >
                取消
              </Button>
              {extractionFailed ? (
                <Button
                  type="button"
                  disabled={isSaving}
                  className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
                  onClick={() => submitImport(true)}
                >
                  {isSaving ? "保存中…" : "只保存原始文件"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-[#68785d] text-white hover:bg-[#5a6a50]"
                >
                  {isSaving ? "保存中…" : "保存文件与笔记"}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}