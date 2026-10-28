"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  message: string | null;
  noteId?: string;
};

const optionalUuid = z
  .union([z.literal(""), z.string().uuid("关联 ID 无效")])
  .optional()
  .transform((value) => value || null);

function splitTags(value: string) {
  const unique = new Map<string, string>();

  value
    .replaceAll("，", ",")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const key = tag.toLocaleLowerCase("zh-CN");

      if (!unique.has(key)) {
        unique.set(key, tag);
      }
    });

  return Array.from(unique.values());
}

const tagsSchema = z
  .string()
  .max(2000, "标签内容过长")
  .optional()
  .transform((value) => splitTags(value ?? ""))
  .pipe(
    z
      .array(z.string().min(1).max(30, "单个标签不能超过 30 个字符"))
      .max(20, "最多添加 20 个标签"),
  );

const quotesSchema = z
  .string()
  .max(50_000, "摘录内容过长")
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(/\r?\n/)
      .map((quote) => quote.trim())
      .filter(Boolean),
  )
  .pipe(
    z
      .array(z.string().min(1).max(2000, "单条摘录不能超过 2000 个字符"))
      .max(100, "最多添加 100 条摘录"),
  );

const saveNoteSchema = z.object({
  id: optionalUuid,
  bookId: optionalUuid,
  title: z
    .string()
    .trim()
    .min(1, "笔记标题不能为空")
    .max(200, "笔记标题不能超过 200 个字符"),
  summary: z
    .string()
    .trim()
    .max(5000, "摘要不能超过 5000 个字符")
    .optional()
    .transform((value) => value || null),
  reflection: z
    .string()
    .trim()
    .max(100_000, "个人感想过长")
    .optional()
    .transform((value) => value || null),
  content: z
    .string()
    .trim()
    .max(100_000, "正文内容过长")
    .optional()
    .transform((value) => value || null),
  visibility: z.enum(["private", "public", "unlisted"]),
  tags: tagsSchema,
  quotes: quotesSchema,
});

function firstIssueMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "提交内容不合法，请检查后重试。";
}
export async function saveNote(
  _previousState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = saveNoteSchema.safeParse(Object.fromEntries(formData));

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

  if (parsed.data.bookId) {
    const { data: book, error: bookError } = await supabase
      .from("books")
      .select("id")
      .eq("id", parsed.data.bookId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (bookError || !book) {
      console.error("saveNote failed to validate book", bookError);
      return { success: false, message: "关联书籍不存在或无权访问。" };
    }
  }

  let noteId = parsed.data.id;
  let isNewNote = false;

  if (noteId) {
    const { data: existingNote, error: existingError } = await supabase
      .from("notes")
      .select("id")
      .eq("id", noteId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError || !existingNote) {
      console.error("saveNote failed to load existing note", existingError);
      return { success: false, message: "笔记不存在或无权编辑。" };
    }

    const { error: updateError } = await supabase
      .from("notes")
      .update({
        book_id: parsed.data.bookId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        reflection: parsed.data.reflection,
        content: parsed.data.content,
        visibility: parsed.data.visibility,
      })
      .eq("id", noteId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("saveNote failed to update note", updateError);
      return { success: false, message: "保存笔记失败，请稍后重试。" };
    }
  } else {
    const { data: createdNote, error: createError } = await supabase
      .from("notes")
      .insert({
        user_id: user.id,
        book_id: parsed.data.bookId,
        title: parsed.data.title,
        summary: parsed.data.summary,
        reflection: parsed.data.reflection,
        content: parsed.data.content,
        visibility: parsed.data.visibility,
        source_type: "manual",
      })
      .select("id")
      .single();

    if (createError || !createdNote) {
      console.error("saveNote failed to create note", createError);
      return { success: false, message: "创建笔记失败，请稍后重试。" };
    }

    noteId = createdNote.id;
    isNewNote = true;
  }

  if (!noteId) {
    return { success: false, message: "保存笔记失败，请稍后重试。" };
  }

  const tagIds: string[] = [];

  for (const tagName of parsed.data.tags) {
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .upsert(
        { user_id: user.id, name: tagName },
        { onConflict: "user_id,name" },
      )
      .select("id")
      .single();

    if (tagError || !tag) {
      console.error("saveNote failed to upsert tag", tagError);

      if (isNewNote) {
        await supabase
          .from("notes")
          .delete()
          .eq("id", noteId)
          .eq("user_id", user.id);
      }

      return { success: false, message: "保存标签失败，请稍后重试。" };
    }

    tagIds.push(tag.id);
  }
  const { error: deleteTagsError } = await supabase
    .from("note_tags")
    .delete()
    .eq("note_id", noteId);

  if (deleteTagsError) {
    console.error("saveNote failed to clear note tags", deleteTagsError);
    return {
      success: false,
      message: "笔记内容已保存，但更新标签失败，请重试。",
    };
  }

  if (tagIds.length > 0) {
    const { error: insertTagsError } = await supabase.from("note_tags").insert(
      tagIds.map((tagId) => ({
        note_id: noteId,
        tag_id: tagId,
      })),
    );

    if (insertTagsError) {
      console.error("saveNote failed to insert note tags", insertTagsError);
      return {
        success: false,
        message: "笔记内容已保存，但更新标签失败，请重试。",
      };
    }
  }

  const { error: deleteQuotesError } = await supabase
    .from("note_quotes")
    .delete()
    .eq("note_id", noteId);

  if (deleteQuotesError) {
    console.error("saveNote failed to clear quotes", deleteQuotesError);
    return {
      success: false,
      message: "笔记内容已保存，但更新摘录失败，请重试。",
    };
  }

  if (parsed.data.quotes.length > 0) {
    const { error: insertQuotesError } = await supabase
      .from("note_quotes")
      .insert(
        parsed.data.quotes.map((quoteText) => ({
          note_id: noteId,
          quote_text: quoteText,
        })),
      );

    if (insertQuotesError) {
      console.error("saveNote failed to insert quotes", insertQuotesError);
      return {
        success: false,
        message: "笔记内容已保存，但更新摘录失败，请重试。",
      };
    }
  }

  revalidatePath("/");
  revalidatePath("/write");
  revalidatePath(`/notes/${noteId}`);
  revalidatePath("/");
  revalidatePath("/community");
  revalidatePath(`/profile/${user.id}`);

  if (parsed.data.bookId) {
    revalidatePath(`/books/${parsed.data.bookId}`);
  }

  return { success: true, message: "笔记已保存。", noteId };
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const parsedNoteId = z.string().uuid("笔记 ID 无效").safeParse(noteId);

  if (!parsedNoteId.success) {
    return { success: false, message: firstIssueMessage(parsedNoteId.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  const { data: deletedNote, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", parsedNoteId.data)
    .eq("user_id", user.id)
    .select("id, book_id")
    .maybeSingle();

  if (error || !deletedNote) {
    console.error("deleteNote failed", error);
    return { success: false, message: "删除笔记失败，请稍后重试。" };
  }

  revalidatePath("/");
  revalidatePath("/community");
  revalidatePath(`/profile/${user.id}`);

  if (deletedNote.book_id) {
    revalidatePath(`/books/${deletedNote.book_id}`);
  }

  return { success: true, message: "笔记已删除。" };
}