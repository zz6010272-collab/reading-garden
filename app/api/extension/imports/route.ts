import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  EXTENSION_TOKEN_PATTERN,
  hashExtensionToken,
} from "@/lib/extension/token";
import { createAnonClient } from "@/lib/supabase/anon";

const MAX_REQUEST_BYTES = 256 * 1024;

const clipSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "标题不能为空")
      .max(200, "标题不能超过 200 个字符"),
    url: z
      .string()
      .trim()
      .max(2048, "页面 URL 过长")
      .refine((value) => {
        try {
          const url = new URL(value);
          return url.protocol === "http:" || url.protocol === "https:";
        } catch {
          return false;
        }
      }, "页面 URL 必须是有效的 http(s) 地址"),
    content: z
      .string()
      .trim()
      .min(1, "选中的文字不能为空")
      .max(100000, "选中的文字不能超过 100000 个字符"),
    reflection: z
      .string()
      .trim()
      .max(20000, "个人感想不能超过 20000 个字符")
      .optional()
      .default(""),
  })
  .strict();

function configuredOrigins(): Set<string> {
  return new Set(
    (process.env.EXTENSION_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    origin.startsWith("chrome-extension://")
  ) {
    return origin;
  }

  return configuredOrigins().has(origin) ? origin : null;
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = allowedOrigin(request);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };

  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(
  request: Request,
  body: unknown,
  status: number,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(request),
  });
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  const token = match?.[1];

  return token && EXTENSION_TOKEN_PATTERN.test(token) ? token : null;
}

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "请求内容不合法。";
}

function rpcFailureMessage(error: { code?: string; message?: string }): {
  status: number;
  message: string;
} {
  if (
    error.code === "P0001" ||
    /invalid or revoked pairing token|invalid pairing token/i.test(
      error.message ?? "",
    )
  ) {
    return {
      status: 401,
      message: "扩展配对码无效或已撤销，请在设置页重新生成。",
    };
  }

  if (error.code === "22023") {
    return {
      status: 400,
      message: "摘录内容不符合服务端校验要求。",
    };
  }

  return {
    status: 500,
    message: "保存网页摘录失败，请稍后重试。",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigin(request)) {
    return jsonResponse(
      request,
      { success: false, message: "该扩展来源未被允许。" },
      403,
    );
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigin(request)) {
    return jsonResponse(
      request,
      { success: false, message: "该扩展来源未被允许。" },
      403,
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (contentLength > MAX_REQUEST_BYTES) {
    return jsonResponse(
      request,
      { success: false, message: "请求内容过大。" },
      413,
    );
  }

  const token = readBearerToken(request);

  if (!token) {
    return jsonResponse(
      request,
      { success: false, message: "缺少有效的扩展配对码。" },
      401,
    );
  }

  let payload: unknown;

  try {
    const rawBody = await request.text();

    if (Buffer.byteLength(rawBody, "utf8") > MAX_REQUEST_BYTES) {
      return jsonResponse(
        request,
        { success: false, message: "请求内容过大。" },
        413,
      );
    }

    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse(
      request,
      { success: false, message: "请求体必须是有效 JSON。" },
      400,
    );
  }

  const parsed = clipSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonResponse(
      request,
      { success: false, message: firstIssueMessage(parsed.error) },
      400,
    );
  }

  const tokenHash = hashExtensionToken(token);
  const supabase = createAnonClient();
  const { data: noteId, error } = await supabase.rpc(
    "verify_and_create_clip",
    {
      p_token_hash: tokenHash,
      p_title: parsed.data.title,
      p_url: parsed.data.url,
      p_content: parsed.data.content,
      p_reflection: parsed.data.reflection,
    },
  );

  if (error) {
    const failure = rpcFailureMessage(error);
    console.error("[extension] clip RPC failed", {
      code: error.code,
      status: failure.status,
    });

    return jsonResponse(
      request,
      { success: false, message: failure.message },
      failure.status,
    );
  }

  if (typeof noteId !== "string" || !noteId) {
    console.error("[extension] clip RPC returned an invalid note id");
    return jsonResponse(
      request,
      { success: false, message: "摘录已提交，但服务端未返回笔记标识。" },
      500,
    );
  }

  revalidatePath("/");
  revalidatePath("/library");
  revalidatePath("/community");
  revalidatePath(`/notes/${noteId}`);

  return jsonResponse(
    request,
    {
      success: true,
      message: "网页摘录已保存为私密笔记。",
      data: { noteId },
    },
    201,
  );
}
