"use server";

import {
  createExtensionTokenSecret,
  hashExtensionToken,
} from "@/lib/extension/token";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  ExtensionTokenRecord,
  GenerateExtensionTokenResult,
  RevokeExtensionTokenResult,
} from "@/lib/extension/types";
import { createClient } from "@/lib/supabase/server";

const tokenIdSchema = z.string().uuid("配对记录 ID 无效");


function databaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  return typeof error.code === "string" ? error.code : null;
}

async function getAuthenticatedContext() {
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

export async function generateExtensionTokenAction(): Promise<GenerateExtensionTokenResult> {
  const context = await getAuthenticatedContext();

  if (!context) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = createExtensionTokenSecret();
    const tokenHash = hashExtensionToken(token);
    const { data, error } = await context.supabase
      .from("extension_tokens")
      .insert({
        user_id: context.userId,
        token_hash: tokenHash,
      })
      .select("id, created_at, revoked_at")
      .single();

    if (!error && data) {
      revalidatePath("/settings");

      return {
        success: true,
        message: "配对码已生成。明文只显示这一次。",
        token,
        record: data as ExtensionTokenRecord,
      };
    }

    if (databaseErrorCode(error) !== "23505") {
      console.error("[extension] failed to create pairing token", {
        databaseCode: databaseErrorCode(error),
      });
      return {
        success: false,
        message: "生成配对码失败，请稍后重试。",
      };
    }
  }

  return {
    success: false,
    message: "生成配对码失败，请稍后重试。",
  };
}

export async function revokeExtensionTokenAction(
  tokenId: string,
): Promise<RevokeExtensionTokenResult> {
  const parsed = tokenIdSchema.safeParse(tokenId);

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "配对记录 ID 无效。",
    };
  }

  const context = await getAuthenticatedContext();

  if (!context) {
    return { success: false, message: "登录状态已失效，请重新登录。" };
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await context.supabase
    .from("extension_tokens")
    .update({ revoked_at: revokedAt })
    .eq("id", parsed.data)
    .eq("user_id", context.userId)
    .is("revoked_at", null)
    .select("id, created_at, revoked_at")
    .maybeSingle();

  if (error) {
    console.error("[extension] failed to revoke pairing token", {
      databaseCode: databaseErrorCode(error),
    });
    return {
      success: false,
      message: "撤销配对码失败，请稍后重试。",
    };
  }

  if (!data) {
    return {
      success: false,
      message: "配对码不存在、已撤销或无权操作。",
    };
  }

  revalidatePath("/settings");

  return {
    success: true,
    message: "配对码已撤销。",
    record: data as ExtensionTokenRecord,
  };
}
