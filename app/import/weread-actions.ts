"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { NormalizedImport } from "@/lib/importers/types";
import {
  getWereadBookBundle,
  getWereadReadingStats,
  getWereadShelf,
  searchWereadBooks,
} from "@/lib/importers/weread/gateway";
import {
  normalizeWereadBundle,
  readingStatsMarkdown,
} from "@/lib/importers/weread/mapper";
import { WereadGatewayError } from "@/lib/importers/weread/protocol";
import type {
  WereadBookImportResult,
  WereadImportResult,
  WereadReadingMode,
  WereadReadingStats,
  WereadShelf,
  WereadSearchResults,
  WereadStatsImportResult,
} from "@/lib/importers/weread/types";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type AuthenticatedContext = {
  supabase: SupabaseClient;
  userId: string;
};

class ImportPersistenceError extends Error {
  readonly userMessage: string;

  constructor(userMessage: string) {
    super(userMessage);
    this.name = "ImportPersistenceError";
    this.userMessage = userMessage;
  }
}

const bookIdSchema = z
  .string()
  .trim()
  .min(1, "请选择要导入的微信读书书籍。")
  .max(128, "微信读书书籍 ID 不合法。");

const keywordSchema = z
  .string()
  .trim()
  .min(1, "请输入要搜索的书名或关键词。")
  .max(100, "搜索关键词不能超过 100 个字符。");

const readingModeSchema = z.enum([
  "weekly",
  "monthly",
  "annually",
  "overall",
]);

function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "输入内容不合法。";
}

function failureResult<T>(
  error: unknown,
  operation: string,
): WereadImportResult<T> {
  if (error instanceof WereadGatewayError) {
    return {
      success: false,
      message: error.userMessage,
      code: error.code,
    };
  }

  if (error instanceof ImportPersistenceError) {
    return {
      success: false,
      message: error.userMessage,
      code: "WEREAD_STORAGE_ERROR",
    };
  }

  console.error(`[weread] ${operation} failed`, {
    errorName: error instanceof Error ? error.name : "UnknownError",
  });

  return {
    success: false,
    message: "微信读书导入失败，请稍后重试。",
    code: "WEREAD_SERVICE_ERROR",
  };
}

async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return { supabase, userId: user.id };
}

function databaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return typeof error.code === "string" ? error.code : null;
}

function storageError(operation: string, error: unknown): ImportPersistenceError {
  const code = databaseErrorCode(error);
  console.error(`[weread] ${operation} failed`, { databaseCode: code });

  if (code === "42703") {
    return new ImportPersistenceError(
      "数据库尚未应用阶段 6 迁移，请先执行最新 Supabase migration。",
    );
  }

  if (code === "23505") {
    return new ImportPersistenceError(
      "检测到同一来源数据正在被重复写入，请刷新后重试。",
    );
  }

  return new ImportPersistenceError(
    "微信读书数据已获取，但保存到私人书房失败，请稍后重试。",
  );
}

async function ensureWereadSchema(
  supabase: SupabaseClient,
): Promise<ImportPersistenceError | null> {
  const { error } = await supabase
    .from("books")
    .select("book_identifier, source_type, source_url")
    .limit(1);

  return error ? storageError("checking stage 6 schema", error) : null;
}

async function createImportJob(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("import_jobs")
    .insert({
      user_id: userId,
      source: "weread",
      status: "running",
      error: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw storageError("creating WeRead import job", error);
  }

  return data.id;
}

async function finishImportJob(
  supabase: SupabaseClient,
  jobId: string,
  status: "completed" | "failed",
  errorMessage: string | null,
) {
  const { error } = await supabase
    .from("import_jobs")
    .update({ status, error: errorMessage })
    .eq("id", jobId);

  if (error) {
    console.error("[weread] updating import job failed", {
      databaseCode: databaseErrorCode(error),
      status,
    });
  }
}
async function persistWereadBookImport(
  supabase: SupabaseClient,
  userId: string,
  normalized: NormalizedImport,
): Promise<{ bookId: string; noteId: string; updated: boolean }> {
  if (!normalized.note || !normalized.readingRecord) {
    throw new ImportPersistenceError(
      "微信读书数据缺少可保存的书籍或笔记内容。",
    );
  }

  let createdBook = false;
  let importedBookId: string | null = null;

  try {
    const { data: existingBook, error: bookLookupError } = await supabase
      .from("books")
      .select("id")
      .eq("owner_id", userId)
      .eq("source_type", "weread")
      .eq("book_identifier", normalized.bookIdentifier)
      .maybeSingle();

    if (bookLookupError) {
      throw storageError("looking up imported WeRead book", bookLookupError);
    }

    const bookPayload = {
      title: normalized.title,
      author: normalized.author,
      cover_url: normalized.coverUrl,
      description: normalized.description,
      book_identifier: normalized.bookIdentifier,
      source_type: normalized.sourceType,
      source_url: normalized.sourceUrl,
    };

    if (existingBook) {
      const { data: updatedBook, error: updateBookError } = await supabase
        .from("books")
        .update(bookPayload)
        .eq("id", existingBook.id)
        .eq("owner_id", userId)
        .select("id")
        .maybeSingle();

      if (updateBookError || !updatedBook) {
        throw storageError("updating imported WeRead book", updateBookError);
      }

      importedBookId = updatedBook.id;
    } else {
      const { data: createdBookRow, error: createBookError } = await supabase
        .from("books")
        .insert({
          owner_id: userId,
          ...bookPayload,
        })
        .select("id")
        .single();

      if (createBookError || !createdBookRow) {
        throw storageError("creating imported WeRead book", createBookError);
      }

      importedBookId = createdBookRow.id;
      createdBook = true;
    }

    const readingRecordPayload: Record<string, unknown> = {
      user_id: userId,
      book_id: importedBookId,
      status: normalized.readingRecord.status,
      progress_percent: normalized.readingRecord.progressPercent,
    };

    if (normalized.readingRecord.rating !== null) {
      readingRecordPayload.rating = normalized.readingRecord.rating;
    }

    if (normalized.readingRecord.finishedAt) {
      readingRecordPayload.finished_at = normalized.readingRecord.finishedAt;
    }

    const { error: readingRecordError } = await supabase
      .from("reading_records")
      .upsert(readingRecordPayload, { onConflict: "user_id,book_id" });

    if (readingRecordError) {
      throw storageError(
        "upserting imported WeRead reading record",
        readingRecordError,
      );
    }

    const { data: existingNote, error: noteLookupError } = await supabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .eq("source_type", normalized.sourceType)
      .eq("source_id", normalized.note.sourceId)
      .maybeSingle();

    if (noteLookupError) {
      throw storageError("looking up imported WeRead note", noteLookupError);
    }

    const notePayload = {
      book_id: importedBookId,
      title: normalized.note.title,
      summary: normalized.note.summary,
      reflection: null,
      content: normalized.note.content,
      source_type: normalized.sourceType,
      source_id: normalized.note.sourceId,
      source_url: normalized.note.sourceUrl,
    };
    let noteId: string;

    if (existingNote) {
      const { data: updatedNote, error: updateNoteError } = await supabase
        .from("notes")
        .update(notePayload)
        .eq("id", existingNote.id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();

      if (updateNoteError || !updatedNote) {
        throw storageError("updating imported WeRead note", updateNoteError);
      }

      noteId = updatedNote.id;
    } else {
      const { data: createdNote, error: createNoteError } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          ...notePayload,
          visibility: "private",
        })
        .select("id")
        .single();

      if (createNoteError || !createdNote) {
        throw storageError("creating imported WeRead note", createNoteError);
      }

      noteId = createdNote.id;
    }

    const { error: deleteQuotesError } = await supabase
      .from("note_quotes")
      .delete()
      .eq("note_id", noteId);

    if (deleteQuotesError) {
      throw storageError(
        "replacing imported WeRead highlights",
        deleteQuotesError,
      );
    }

    if (normalized.note.quotes.length > 0) {
      const { error: insertQuotesError } = await supabase
        .from("note_quotes")
        .insert(
          normalized.note.quotes.map((quote) => ({
            note_id: noteId,
            quote_text: quote.quoteText,
            chapter: quote.chapter,
            location: quote.location,
          })),
        );

      if (insertQuotesError) {
        throw storageError(
          "inserting imported WeRead highlights",
          insertQuotesError,
        );
      }
    }

    if (!importedBookId) {
      throw new ImportPersistenceError(
        "微信读书书籍保存后缺少可追踪的本地记录。",
      );
    }

    return {
      bookId: importedBookId,
      noteId,
      updated: Boolean(existingBook),
    };
  } catch (error) {
    if (createdBook && importedBookId) {
      const { error: cleanupError } = await supabase
        .from("books")
        .delete()
        .eq("id", importedBookId)
        .eq("owner_id", userId);

      if (cleanupError) {
        console.error("[weread] cleaning incomplete import failed", {
          databaseCode: databaseErrorCode(cleanupError),
        });
      }
    }

    if (error instanceof ImportPersistenceError) {
      throw error;
    }

    throw storageError("persisting WeRead import", error);
  }
}
async function persistWereadStatsNote(
  supabase: SupabaseClient,
  userId: string,
  mode: WereadReadingMode,
  stats: WereadReadingStats,
): Promise<{ noteId: string; updated: boolean }> {
  const modeLabels: Record<WereadReadingMode, string> = {
    weekly: "本周",
    monthly: "本月",
    annually: "本年",
    overall: "全部时间",
  };
  const sourceId = `stats:${mode}:${stats.baseTime}`;
  const title = `微信读书 · ${modeLabels[mode]}阅读统计`;
  const content = readingStatsMarkdown(stats);
  const summary = `微信读书官方统计快照：有效阅读 ${stats.readDays} 天`;

  const { data: existingNote, error: lookupError } = await supabase
    .from("notes")
    .select("id")
    .eq("user_id", userId)
    .eq("source_type", "weread")
    .eq("source_id", sourceId)
    .maybeSingle();

  if (lookupError) {
    throw storageError("looking up imported WeRead stats note", lookupError);
  }

  const notePayload = {
    book_id: null,
    title,
    summary,
    reflection: null,
    content,
    source_type: "weread",
    source_id: sourceId,
    source_url: null,
  };

  if (existingNote) {
    const { data: updatedNote, error: updateError } = await supabase
      .from("notes")
      .update(notePayload)
      .eq("id", existingNote.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedNote) {
      throw storageError("updating imported WeRead stats note", updateError);
    }

    return { noteId: updatedNote.id, updated: true };
  }

  const { data: createdNote, error: createError } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      ...notePayload,
      visibility: "private",
    })
    .select("id")
    .single();

  if (createError || !createdNote) {
    throw storageError("creating imported WeRead stats note", createError);
  }

  return { noteId: createdNote.id, updated: false };
}

function revalidateWereadImport(noteId: string, bookId?: string) {
  revalidatePath("/");
  revalidatePath("/import");
  revalidatePath("/library");
  revalidatePath("/community");
  revalidatePath(`/notes/${noteId}`);

  if (bookId) {
    revalidatePath(`/books/${bookId}`);
  }
}

export async function loadWereadShelfAction(): Promise<
  WereadImportResult<WereadShelf>
> {
  const context = await getAuthenticatedContext();

  if (!context) {
    return {
      success: false,
      message: "登录状态已失效，请重新登录。",
      code: "WEREAD_UNAUTHENTICATED",
    };
  }

  try {
    const data = await getWereadShelf();
    return { success: true, message: "书架已读取。", data };
  } catch (error) {
    return failureResult(error, "loading shelf");
  }
}

export async function searchWereadBooksAction(
  keyword: string,
): Promise<WereadImportResult<WereadSearchResults>> {
  const parsed = keywordSchema.safeParse(keyword);

  if (!parsed.success) {
    return {
      success: false,
      message: firstIssueMessage(parsed.error),
      code: "WEREAD_INVALID_INPUT",
    };
  }

  const context = await getAuthenticatedContext();

  if (!context) {
    return {
      success: false,
      message: "登录状态已失效，请重新登录。",
      code: "WEREAD_UNAUTHENTICATED",
    };
  }

  try {
    const data = await searchWereadBooks(parsed.data);
    return {
      success: true,
      message: data.books.length > 0 ? "搜索完成。" : "没有找到匹配的书籍。",
      data,
    };
  } catch (error) {
    return failureResult(error, "searching books");
  }
}
export async function importWereadBookAction(
  bookId: string,
): Promise<WereadBookImportResult> {
  const parsed = bookIdSchema.safeParse(bookId);

  if (!parsed.success) {
    return {
      success: false,
      message: firstIssueMessage(parsed.error),
      code: "WEREAD_INVALID_INPUT",
    };
  }

  const context = await getAuthenticatedContext();

  if (!context) {
    return {
      success: false,
      message: "登录状态已失效，请重新登录。",
      code: "WEREAD_UNAUTHENTICATED",
    };
  }

  let jobId: string | null = null;

  try {
    const schemaError = await ensureWereadSchema(context.supabase);

    if (schemaError) {
      throw schemaError;
    }

    jobId = await createImportJob(context.supabase, context.userId);
    const bundle = await getWereadBookBundle(parsed.data);
    const normalized = normalizeWereadBundle(bundle);
    const persisted = await persistWereadBookImport(
      context.supabase,
      context.userId,
      normalized,
    );

    await finishImportJob(context.supabase, jobId, "completed", null);
    revalidateWereadImport(persisted.noteId, persisted.bookId);

    const quoteCount = normalized.note?.quotes.length ?? 0;
    const reviewCount = bundle.reviews.length;
    const partial = bundle.reviewsTruncated
      ? " 想法/点评达到单次同步上限，可稍后再次同步以获取后续内容。"
      : "";

    return {
      success: true,
      message: `${persisted.updated ? "已更新" : "已导入"}《${bundle.book.title}》，包含 ${quoteCount} 条划线与 ${reviewCount} 条想法/点评。${partial}`,
      data: {
        noteId: persisted.noteId,
        bookId: persisted.bookId,
        title: bundle.book.title,
        quoteCount,
        reviewCount,
        reviewsTruncated: bundle.reviewsTruncated,
        updated: persisted.updated,
      },
    };
  } catch (error) {
    const result = failureResult<{
      noteId: string;
      bookId: string;
      title: string;
      quoteCount: number;
      reviewCount: number;
      reviewsTruncated: boolean;
      updated: boolean;
    }>(error, "importing book");

    if (jobId) {
      await finishImportJob(
        context.supabase,
        jobId,
        "failed",
        result.message,
      );
    }

    return result;
  }
}

export async function importWereadStatsAction(
  mode: WereadReadingMode,
): Promise<WereadStatsImportResult> {
  const parsed = readingModeSchema.safeParse(mode);

  if (!parsed.success) {
    return {
      success: false,
      message: "阅读统计周期不合法。",
      code: "WEREAD_INVALID_INPUT",
    };
  }

  const context = await getAuthenticatedContext();

  if (!context) {
    return {
      success: false,
      message: "登录状态已失效，请重新登录。",
      code: "WEREAD_UNAUTHENTICATED",
    };
  }

  let jobId: string | null = null;

  try {
    const schemaError = await ensureWereadSchema(context.supabase);

    if (schemaError) {
      throw schemaError;
    }

    jobId = await createImportJob(context.supabase, context.userId);
    const stats = await getWereadReadingStats(parsed.data);
    const persisted = await persistWereadStatsNote(
      context.supabase,
      context.userId,
      parsed.data,
      stats,
    );

    await finishImportJob(context.supabase, jobId, "completed", null);
    revalidateWereadImport(persisted.noteId);

    return {
      success: true,
      message: `${persisted.updated ? "已更新" : "已导入"}微信读书阅读统计笔记。`,
      data: {
        noteId: persisted.noteId,
        stats,
      },
    };
  } catch (error) {
    const result = failureResult<{
      noteId: string;
      stats: WereadReadingStats;
    }>(error, "importing reading stats");

    if (jobId) {
      await finishImportJob(
        context.supabase,
        jobId,
        "failed",
        result.message,
      );
    }

    return result;
  }
}
