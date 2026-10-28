import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SecurityEnv = Record<string, string>;

function readEnvFile(path: string): SecurityEnv {
  const absolutePath = resolve(process.cwd(), path);

  if (!existsSync(absolutePath)) {
    return {};
  }

  const result: SecurityEnv = {};

  for (const rawLine of readFileSync(absolutePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[name] = value;
  }

  return result;
}

const env: SecurityEnv = {
  ...readEnvFile(".env.local"),
  ...readEnvFile(".env.security.local"),
};

for (const [name, value] of Object.entries(process.env)) {
  if (typeof value === "string") {
    env[name] = value;
  }
}

function requireEnv(name: string): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(
      `缺少 ${name}。请复制 .env.security.example 为 .env.security.local 并填写账号信息。`,
    );
  }

  return value;
}

function createIsolatedClient(
  supabaseUrl: string,
  publishableKey: string,
): SupabaseClient {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

let passed = 0;
const failures: string[] = [];

function assert(condition: unknown, message: string | null | undefined): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Assertion failed");
  }
}

function requireValue<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message ?? "Assertion failed");
  }

  return value;
}

async function securityCheck(
  name: string,
  check: () => Promise<void>,
): Promise<void> {
  try {
    await check();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    failures.push(name);
    console.error(`FAIL ${name}: ${message}`);
  }
}

async function signIn(
  client: SupabaseClient,
  email: string,
  password: string,
  label: string,
) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(`${label} 登录失败：${error?.message ?? "未返回用户"}`);
  }

  return data.user;
}
async function main() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const emailA = requireEnv("SECURITY_TEST_EMAIL_A");
  const passwordA = requireEnv("SECURITY_TEST_PASSWORD_A");
  const emailB = requireEnv("SECURITY_TEST_EMAIL_B");
  const passwordB = requireEnv("SECURITY_TEST_PASSWORD_B");
  const clientA = createIsolatedClient(supabaseUrl, publishableKey);
  const clientB = createIsolatedClient(supabaseUrl, publishableKey);
  const anonymousClient = createIsolatedClient(supabaseUrl, publishableKey);

  const userA = await signIn(clientA, emailA, passwordA, "Account A");
  const userB = await signIn(clientB, emailB, passwordB, "Account B");

  assert(userA.id !== userB.id, "Account A 与 Account B 必须是不同用户");

  const suffix = randomUUID();
  const storagePath = `${userA.id}/security-tests/${suffix}.txt`;
  const fileContent = `security-isolation-${suffix}`;
  const fileBuffer = Buffer.from(fileContent, "utf8");
  const fileHash = createHash("sha256").update(fileBuffer).digest("hex");

  let bookAId: string | null = null;
  let bookBId: string | null = null;
  let tagAId: string | null = null;
  let privateNoteAId: string | null = null;
  let publicNoteAId: string | null = null;
  let unlistedNoteAId: string | null = null;
  let privateNoteBId: string | null = null;
  let privateFileId: string | null = null;

  try {
    const { data: createdBookA, error: bookAError } = await clientA
      .from("books")
      .insert({
        owner_id: userA.id,
        title: `security-book-a-${suffix}`,
        author: "Security Test",
      })
      .select("id")
      .single();

    assert(!bookAError && createdBookA, `Account A 创建测试书籍失败：${bookAError?.message}`);
    bookAId = createdBookA.id;

    const { error: readingRecordError } = await clientA
      .from("reading_records")
      .insert({
        user_id: userA.id,
        book_id: bookAId,
        status: "reading",
        progress_percent: 42,
      });

    assert(
      !readingRecordError,
      `Account A 创建阅读记录失败：${readingRecordError?.message}`,
    );

    const { data: bookB, error: bookBError } = await clientB
      .from("books")
      .insert({
        owner_id: userB.id,
        title: `security-book-b-${suffix}`,
        author: "Security Test",
      })
      .select("id")
      .single();

    assert(!bookBError && bookB, `Account B 创建测试书籍失败：${bookBError?.message}`);
    bookBId = bookB.id;

    const { data: privateNoteA, error: privateNoteAError } = await clientA
      .from("notes")
      .insert({
        user_id: userA.id,
        book_id: bookAId,
        title: `security-private-a-${suffix}`,
        content: "private content",
        visibility: "private",
        source_type: "security_test",
        source_id: `private-a-${suffix}`,
      })
      .select("id")
      .single();

    assert(
      !privateNoteAError && privateNoteA,
      `创建 A 私有测试笔记失败：${privateNoteAError?.message}`,
    );
    privateNoteAId = privateNoteA.id;

    const { data: publicNoteA, error: publicNoteAError } = await clientA
      .from("notes")
      .insert({
        user_id: userA.id,
        book_id: bookAId,
        title: `security-public-a-${suffix}`,
        content: "public content",
        visibility: "public",
        source_type: "security_test",
        source_id: `public-a-${suffix}`,
      })
      .select("id")
      .single();

    assert(
      !publicNoteAError && publicNoteA,
      `创建 A 公开测试笔记失败：${publicNoteAError?.message}`,
    );
    publicNoteAId = publicNoteA.id;

    const { data: unlistedNoteA, error: unlistedNoteAError } = await clientA
      .from("notes")
      .insert({
        user_id: userA.id,
        book_id: bookAId,
        title: `security-unlisted-a-${suffix}`,
        content: "unlisted content",
        visibility: "unlisted",
        source_type: "security_test",
        source_id: `unlisted-a-${suffix}`,
      })
      .select("id")
      .single();

    assert(
      !unlistedNoteAError && unlistedNoteA,
      `创建 A 仅链接测试笔记失败：${unlistedNoteAError?.message}`,
    );
    unlistedNoteAId = unlistedNoteA.id;

    const { data: privateNoteB, error: privateNoteBError } = await clientB
      .from("notes")
      .insert({
        user_id: userB.id,
        book_id: bookBId,
        title: `security-private-b-${suffix}`,
        content: "private b content",
        visibility: "private",
        source_type: "security_test",
        source_id: `private-b-${suffix}`,
      })
      .select("id")
      .single();

    assert(
      !privateNoteBError && privateNoteB,
      `Account B 创建私有测试笔记失败：${privateNoteBError?.message}`,
    );
    privateNoteBId = privateNoteB.id;
    const { error: privateQuoteError } = await clientA
      .from("note_quotes")
      .insert({
        note_id: privateNoteAId,
        quote_text: "private quote",
        chapter: "Security",
      });

    assert(
      !privateQuoteError,
      `创建私有笔记引用失败：${privateQuoteError?.message}`,
    );

    const { error: publicQuoteError } = await clientA
      .from("note_quotes")
      .insert({
        note_id: publicNoteAId,
        quote_text: "public quote",
        chapter: "Security",
      });

    assert(
      !publicQuoteError,
      `创建公开笔记引用失败：${publicQuoteError?.message}`,
    );

    const { data: tagA, error: tagAError } = await clientA
      .from("tags")
      .insert({
        user_id: userA.id,
        name: `security-tag-${suffix}`,
      })
      .select("id")
      .single();

    assert(!tagAError && tagA, `创建测试标签失败：${tagAError?.message}`);
    tagAId = tagA.id;

    const { error: noteTagError } = await clientA.from("note_tags").insert({
      note_id: privateNoteAId,
      tag_id: tagAId,
    });

    assert(!noteTagError, `创建笔记标签关联失败：${noteTagError?.message}`);

    const { error: uploadError } = await clientA.storage
      .from("private_files")
      .upload(storagePath, fileBuffer, {
        contentType: "text/plain",
        upsert: false,
      });

    assert(!uploadError, `Account A 上传私有测试文件失败：${uploadError?.message}`);

    const { data: privateFile, error: privateFileError } = await clientA
      .from("private_files")
      .insert({
        user_id: userA.id,
        storage_path: storagePath,
        mime_type: "text/plain",
        size: fileBuffer.byteLength,
        content_hash: fileHash,
      })
      .select("id")
      .single();

    assert(
      !privateFileError && privateFile,
      `创建私有文件元数据失败：${privateFileError?.message}`,
    );
    privateFileId = privateFile.id;
    const privateNoteId = requireValue(privateNoteAId, "A 私有笔记 ID 缺失");
    const publicNoteId = requireValue(publicNoteAId, "A 公开笔记 ID 缺失");
    const unlistedNoteId = requireValue(
      unlistedNoteAId,
      "A 仅链接笔记 ID 缺失",
    );
    const bookA = requireValue(bookAId, "A 书籍 ID 缺失");
    const privateFileRecordId = requireValue(
      privateFileId,
      "A 私有文件 ID 缺失",
    );
    const privateNoteBValue = requireValue(
      privateNoteBId,
      "B 私有笔记 ID 缺失",
    );


    await securityCheck("Account A 可读取自己的私有笔记", async () => {
      const { data, error } = await clientA
        .from("notes")
        .select("id, visibility")
        .eq("id", privateNoteId)
        .maybeSingle();

      assert(!error, error?.message);
      assert(data?.id === privateNoteId, "私有笔记不可见");
      assert(data.visibility === "private", "私有笔记可见性错误");
    });

    await securityCheck("Account B 不可读取 A 的私有笔记", async () => {
      const { data, error } = await clientB
        .from("notes")
        .select("id")
        .eq("id", privateNoteId)
        .maybeSingle();

      assert(!error, error?.message);
      assert(!data, "Account B 越权读取了 A 的私有笔记");
    });

    await securityCheck("Account B 可读取 A 的 public 与 unlisted 笔记", async () => {
      for (const noteId of [publicNoteId, unlistedNoteId]) {
        const { data, error } = await clientB
          .from("notes")
          .select("id")
          .eq("id", noteId)
          .maybeSingle();

        assert(!error, error?.message);
        assert(data?.id === noteId, "公开或仅链接笔记不可见");
      }
    });

    await securityCheck("Account B 不可读取 A 的书籍与阅读记录", async () => {
      const { data: bookData, error: bookError } = await clientB
        .from("books")
        .select("id")
        .eq("id", bookA)
        .maybeSingle();
      const { data: recordData, error: recordError } = await clientB
        .from("reading_records")
        .select("id")
        .eq("book_id", bookA)
        .maybeSingle();

      assert(!bookError, bookError?.message);
      assert(!recordError, recordError?.message);
      assert(!bookData, "Account B 越权读取了 A 的书籍");
      assert(!recordData, "Account B 越权读取了 A 的阅读记录");
    });

    await securityCheck("Account B 不可读取 A 私有笔记的引用", async () => {
      const { data, error } = await clientB
        .from("note_quotes")
        .select("id")
        .eq("note_id", privateNoteId);

      assert(!error, error?.message);
      assert((data ?? []).length === 0, "Account B 越权读取了私有引用");
    });

    await securityCheck("Account B 可读取 A 公开笔记的引用", async () => {
      const { data, error } = await clientB
        .from("note_quotes")
        .select("id")
        .eq("note_id", publicNoteId);

      assert(!error, error?.message);
      assert((data ?? []).length > 0, "公开笔记引用不可见");
    });

    await securityCheck("Account B 无法更新或删除 A 的私有笔记", async () => {
      const { data: updated, error: updateError } = await clientB
        .from("notes")
        .update({ title: "hijacked" })
        .eq("id", privateNoteId)
        .select("id")
        .maybeSingle();
      const { data: deleted, error: deleteError } = await clientB
        .from("notes")
        .delete()
        .eq("id", privateNoteId)
        .select("id")
        .maybeSingle();

      assert(!updated, "Account B 越权更新了 A 的私有笔记");
      assert(!deleted, "Account B 越权删除了 A 的私有笔记");
      assert(!updateError || !updated, updateError?.message);
      assert(!deleteError || !deleted, deleteError?.message);
    });

    await securityCheck("Account B 不能伪造 user_id 写入 A 的笔记", async () => {
      const { error } = await clientB.from("notes").insert({
        user_id: userA.id,
        title: `security-forged-${suffix}`,
        content: "forged",
        visibility: "private",
        source_type: "security_test",
        source_id: `forged-${suffix}`,
      });

      assert(Boolean(error), "Account B 伪造 user_id 写入未被 RLS 拦截");
    });

    await securityCheck("Account B 不可读取或下载 A 的私有文件", async () => {
      const { data: metadata, error: metadataError } = await clientB
        .from("private_files")
        .select("id")
        .eq("id", privateFileRecordId)
        .maybeSingle();
      const { data: downloaded, error: downloadError } = await clientB.storage
        .from("private_files")
        .download(storagePath);

      assert(!metadataError, metadataError?.message);
      assert(!metadata, "Account B 越权读取了私有文件元数据");
      assert(Boolean(downloadError) || !downloaded, "Account B 越权下载了私有文件");
    });

    await securityCheck("匿名访客不可读取 A 的私有笔记", async () => {
      const { data, error } = await anonymousClient
        .from("notes")
        .select("id")
        .eq("id", privateNoteId)
        .maybeSingle();

      assert(!error, error?.message);
      assert(!data, "匿名访客越权读取了私有笔记");
    });

    await securityCheck("匿名访客可读取 public 与 unlisted 笔记", async () => {
      for (const noteId of [publicNoteId, unlistedNoteId]) {
        const { data, error } = await anonymousClient
          .from("notes")
          .select("id")
          .eq("id", noteId)
          .maybeSingle();

        assert(!error, error?.message);
        assert(data?.id === noteId, "匿名访客无法读取公开或仅链接笔记");
      }
    });
    await securityCheck("匿名访客不可读取或下载 A 的私有文件", async () => {
      const { data: metadata, error: metadataError } = await anonymousClient
        .from("private_files")
        .select("id")
        .eq("id", privateFileRecordId)
        .maybeSingle();
      const { data: downloaded, error: downloadError } =
        await anonymousClient.storage
          .from("private_files")
          .download(storagePath);

      assert(!metadataError, metadataError?.message);
      assert(!metadata, "匿名访客越权读取了私有文件元数据");
      assert(
        Boolean(downloadError) || !downloaded,
        "匿名访客越权下载了私有文件",
      );
    });

    await securityCheck("私有 Storage 公共 URL 不可直接访问", async () => {
      const { data: publicUrlData } = clientA.storage
        .from("private_files")
        .getPublicUrl(storagePath);
      const response = await fetch(publicUrlData.publicUrl);

      assert(
        response.status !== 200,
        `私有文件公共 URL 返回了 ${response.status}`,
      );
    });

    await securityCheck("匿名访客不能创建笔记", async () => {
      const { error } = await anonymousClient.from("notes").insert({
        user_id: userA.id,
        title: `security-anon-${suffix}`,
        content: "anonymous",
        visibility: "private",
        source_type: "security_test",
        source_id: `anon-${suffix}`,
      });

      assert(Boolean(error), "匿名访客写入笔记未被 RLS 拦截");
    });

    await securityCheck("Account A 不可读取 B 的私有笔记", async () => {
      assert(privateNoteBId, "Account B 私有笔记 ID 缺失");

      const { data, error } = await clientA
        .from("notes")
        .select("id")
        .eq("id", privateNoteBValue)
        .maybeSingle();

      assert(!error, error?.message);
      assert(!data, "Account A 越权读取了 B 的私有笔记");
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`SETUP_OR_EXECUTION_FAILED: ${message}`);
    process.exitCode = 1;
  } finally {
    try {
      await clientA.storage.from("private_files").remove([storagePath]);
    } catch {
      // Best-effort cleanup only.
    }

    if (privateFileId) {
      await clientA.from("private_files").delete().eq("id", privateFileId);
    }

    if (privateNoteAId || publicNoteAId || unlistedNoteAId) {
      await clientA
        .from("notes")
        .delete()
        .in(
          "id",
          [privateNoteAId, publicNoteAId, unlistedNoteAId].filter(
            (value): value is string => Boolean(value),
          ),
        );
    }

    if (privateNoteBId) {
      await clientB.from("notes").delete().eq("id", privateNoteBId);
    }

    if (tagAId) {
      await clientA.from("tags").delete().eq("id", tagAId);
    }

    if (bookAId) {
      await clientA.from("books").delete().eq("id", bookAId);
    }

    if (bookBId) {
      await clientB.from("books").delete().eq("id", bookBId);
    }

    await clientA.auth.signOut();
    await clientB.auth.signOut();
  }

  const total = passed + failures.length;
  console.log(`\nRLS/STORAGE SUMMARY: ${passed}/${total} passed`);

  if (failures.length > 0) {
    console.error(`FAILED CHECKS: ${failures.join(", ")}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`SECURITY TEST FAILED: ${message}`);
  process.exitCode = 1;
});
