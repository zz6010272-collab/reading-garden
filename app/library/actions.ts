"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { readingStatusValues } from "@/lib/supabase/types";

type ActionResult = {
  success: boolean;
  message: string | null;
  bookId?: string;
};

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}不能超过 ${max} 个字符`)
    .optional()
    .transform((value) => value || null);

const coverUrlSchema = z
  .string()
  .trim()
  .max(2048, "封面 URL 过长")
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "封面 URL 必须是有效的 http(s) 地址" },
  )
  .transform((value) => value || null);

const bookFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "书名不能为空")
    .max(200, "书名不能超过 200 个字符"),
  author: optionalText(200, "作者"),
  cover_url: coverUrlSchema,
  description: optionalText(5000, "简介"),
});

const createBookSchema = bookFieldsSchema.extend({
  status: z.enum(readingStatusValues).default("want_to_read"),
});

const updateBookSchema = bookFieldsSchema.extend({
  id: z.string().uuid("书籍 ID 无效"),
});

const updateReadingRecordSchema = z.object({
  bookId: z.string().uuid("书籍 ID 无效"),
  status: z.enum(readingStatusValues),
  rating: z
    .union([z.literal(""), z.string().regex(/^[1-5]$/, "评分必须为 1–5")])
    .transform((value) => (value ? Number(value) : null)),
  started_at: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "开始日期格式无效"),
    ])
    .transform((value) => value || null),
  finished_at: z
    .union([
      z.literal(""),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "完成日期格式无效"),
    ])
    .transform((value) => value || null),
});

function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "提交内容不合法，请检查后重试。";
}

export async function createBook(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = createBookSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  const { data: book, error: bookError } = await supabase
    .from("books")
    .insert({
      owner_id: user.id,
      title: parsed.data.title,
      author: parsed.data.author,
      cover_url: parsed.data.cover_url,
      description: parsed.data.description,
    })
    .select("id")
    .single();

  if (bookError || !book) {
    console.error("createBook failed to insert book", bookError);
    return { success: false, message: "添加书籍失败，请稍后重试。" };
  }

  const { error: recordError } = await supabase
    .from("reading_records")
    .insert({
      user_id: user.id,
      book_id: book.id,
      status: parsed.data.status,
    });

  if (recordError) {
    console.error("createBook failed to insert reading record", recordError);

    await supabase
      .from("books")
      .delete()
      .eq("id", book.id)
      .eq("owner_id", user.id);

    return { success: false, message: "创建阅读记录失败，请稍后重试。" };
  }

  revalidatePath("/library");
  revalidatePath(`/books/${book.id}`);

  return {
    success: true,
    message: "书籍已添加。",
    bookId: book.id,
  };
}

export async function updateBook(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateBookSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  const { data: updatedBook, error } = await supabase
    .from("books")
    .update({
      title: parsed.data.title,
      author: parsed.data.author,
      cover_url: parsed.data.cover_url,
      description: parsed.data.description,
    })
    .eq("id", parsed.data.id)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !updatedBook) {
    console.error("updateBook failed", error);
    return { success: false, message: "更新书籍失败，请稍后重试。" };
  }

  revalidatePath("/library");
  revalidatePath(`/books/${parsed.data.id}`);

  return { success: true, message: "书籍信息已更新。" };
}

export async function updateReadingRecord(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = updateReadingRecordSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsed.success) {
    return { success: false, message: firstIssueMessage(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  const { error } = await supabase.from("reading_records").upsert(
    {
      user_id: user.id,
      book_id: parsed.data.bookId,
      status: parsed.data.status,
      rating: parsed.data.rating,
      started_at: parsed.data.started_at,
      finished_at: parsed.data.finished_at,
    },
    { onConflict: "user_id,book_id" },
  );

  if (error) {
    console.error("updateReadingRecord failed", error);
    return { success: false, message: "更新阅读状态失败，请稍后重试。" };
  }

  revalidatePath("/library");
  revalidatePath(`/books/${parsed.data.bookId}`);

  return { success: true, message: "阅读状态已更新。" };
}

export async function deleteBook(bookId: string): Promise<ActionResult> {
  const parsedBookId = z.string().uuid("书籍 ID 无效").safeParse(bookId);

  if (!parsedBookId.success) {
    return { success: false, message: firstIssueMessage(parsedBookId.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  const { data: deletedBook, error } = await supabase
    .from("books")
    .delete()
    .eq("id", parsedBookId.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();

  if (error || !deletedBook) {
    console.error("deleteBook failed", error);
    return { success: false, message: "删除书籍失败，请稍后重试。" };
  }

  revalidatePath("/library");

  return { success: true, message: "书籍已删除。" };
}