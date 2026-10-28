"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type ImportActionResult = {
  success: boolean;
  message: string | null;
  noteId?: string;
  rawOnly?: boolean;
};

const PDF_MAX_BYTES = 20 * 1024 * 1024;
const TEXT_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TEXT_EXTENSIONS = new Set(["txt", "md", "markdown"]);
const ALLOWED_TEXT_MIME_TYPES = new Set([
  "",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/octet-stream",
]);

const optionalUuid = z
  .union([z.literal(""), z.string().uuid("关联 ID 无效")])
  .optional()
  .transform((value) => value || null);

const importSchema = z.object({
  sourceType: z.enum(["pdf", "text"]),
  rawOnly: z.enum(["true", "false"]).transform((value) => value === "true"),
  title: z.string().trim().max(200, "笔记标题不能超过 200 个字符").optional(),
  bookId: optionalUuid,
  visibility: z
    .enum(["private", "public", "unlisted"])
    .default("private"),
  text: z.string().max(2_000_000, "提取文本过长").default(""),
});

function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "导入参数不合法，请检查后重试。";
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLocaleLowerCase() ?? "";
}

function validateFile(
  file: File,
  sourceType: "pdf" | "text",
): string | null {
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

  if (
    !ALLOWED_TEXT_EXTENSIONS.has(extension) ||
    !ALLOWED_TEXT_MIME_TYPES.has(file.type)
  ) {
    return "请选择 TXT、MD 或 Markdown 文件。";
  }

  if (file.size > TEXT_MAX_BYTES) {
    return "TXT/Markdown 文件不能超过 5MB。";
  }

  return null;
}
async function cleanupImportArtifacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
  privateFileId?: string,
  noteId?: string,
) {
  if (noteId) {
    await supabase.from("notes").delete().eq("id", noteId);
  }

  if (privateFileId) {
    await supabase.from("private_files").delete().eq("id", privateFileId);
  }

  await supabase.storage.from("private_files").remove([storagePath]);
}

export async function importFileAction(
  _previousState: ImportActionResult,
  formData: FormData,
): Promise<ImportActionResult> {
  const rawFile = formData.get("file");

  if (!(rawFile instanceof File)) {
    return { success: false, message: "请选择要导入的文件。" };
  }

  const parsed = importSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) };
  }

  const fileError = validateFile(rawFile, parsed.data.sourceType);

  if (fileError) {
    return { success: false, message: fileError };
  }

  const text = parsed.data.text.trim();
  const title =
    parsed.data.title?.trim() ||
    rawFile.name.replace(/\.[^.]+$/, "").trim();

  if (!parsed.data.rawOnly && !title) {
    return { success: false, message: "请填写笔记标题。" };
  }

  if (!parsed.data.rawOnly && !text) {
    return {
      success: false,
      message: "没有可保存的文字内容，不能生成空笔记。",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  if (parsed.data.bookId) {
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", parsed.data.bookId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      return { success: false, message: "关联书籍不存在或无权访问。" };
    }
  }

  const bytes = Buffer.from(await rawFile.arrayBuffer());
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  const { data: existingFile, error: duplicateError } = await supabase
    .from("private_files")
    .select("id")
    .eq("user_id", user.id)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (duplicateError) {
    console.error("Failed to check duplicate import", duplicateError);
    return { success: false, message: "检查重复文件失败，请稍后重试。" };
  }

  if (existingFile) {
    return {
      success: false,
      message: "这份文件已经导入过，请勿重复上传。",
    };
  }

  const extension = getExtension(rawFile.name);
  const objectPath = `${user.id}/${randomUUID()}.${extension}`;
  const contentType =
    rawFile.type ||
    (parsed.data.sourceType === "pdf"
      ? "application/pdf"
      : extension === "txt"
        ? "text/plain"
        : "text/markdown");

  const { error: uploadError } = await supabase.storage
    .from("private_files")
    .upload(objectPath, bytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload private import file", uploadError);
    return { success: false, message: "文件上传失败，请稍后重试。" };
  }

  const { data: privateFile, error: privateFileError } = await supabase
    .from("private_files")
    .insert({
      user_id: user.id,
      storage_path: objectPath,
      mime_type: contentType,
      size: rawFile.size,
      content_hash: contentHash,
    })
    .select("id")
    .single();

  if (privateFileError || !privateFile) {
    console.error("Failed to create private file record", privateFileError);
    await supabase.storage.from("private_files").remove([objectPath]);

    if (privateFileError?.code === "23505") {
      return {
        success: false,
        message: "这份文件已经导入过，请勿重复上传。",
      };
    }

    return { success: false, message: "保存文件记录失败，请稍后重试。" };
  }

  let noteId: string | undefined;

  if (!parsed.data.rawOnly) {
    const { data: note, error: noteError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        book_id: parsed.data.bookId,
        title,
        summary: null,
        reflection: null,
        content: text,
        visibility: parsed.data.visibility,
        source_type: parsed.data.sourceType,
        source_id: contentHash,
      })
      .select("id")
      .single();

    if (noteError || !note) {
      console.error("Failed to create note from import", noteError);
      await cleanupImportArtifacts(supabase, objectPath, privateFile.id);
      return { success: false, message: "创建导入笔记失败，请稍后重试。" };
    }

    noteId = note.id;
  }

  const { error: jobError } = await supabase.from("import_jobs").insert({
    user_id: user.id,
    source: parsed.data.sourceType,
    status: "completed",
    error: null,
  });

  if (jobError) {
    console.error("Failed to create import job", jobError);
    await cleanupImportArtifacts(
      supabase,
      objectPath,
      privateFile.id,
      noteId,
    );
    return { success: false, message: "保存导入任务失败，请稍后重试。" };
  }

  revalidatePath("/import");
  revalidatePath("/library");

  if (noteId) {
    revalidatePath("/");
    revalidatePath("/community");
    revalidatePath(`/profile/${user.id}`);
    revalidatePath(`/notes/${noteId}`);
  }

  if (parsed.data.bookId && noteId) {
    revalidatePath(`/books/${parsed.data.bookId}`);
  }

  return {
    success: true,
    message: parsed.data.rawOnly
      ? "原始文件已保存到私有存储。"
      : "文件与笔记已保存。",
    noteId,
    rawOnly: parsed.data.rawOnly,
  };
}