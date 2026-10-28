import { z } from "zod";

import {
  bookmarkListResponseSchema,
  bookInfoResponseSchema,
  bookProgressResponseSchema,
  inspectGatewayResponse,
  readingStatsResponseSchema,
  reviewListResponseSchema,
  searchResponseSchema,
  shelfResponseSchema,
  WEREAD_GATEWAY_URL,
  WEREAD_MAX_RESPONSE_BYTES,
  WEREAD_SKILL_VERSION,
  WereadGatewayError,
} from "./protocol";
import {
  mapBookBundle,
  mapReadingStats,
  mapSearchResponse,
  mapShelfResponse,
} from "./mapper";
import type {
  WereadBookBundle,
  WereadReadingMode,
  WereadReadingStats,
  WereadShelf,
  WereadSearchResults,
} from "./types";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REVIEW_PAGES = 10;
const PLACEHOLDER_KEYS = new Set([
  "your-weread-api-key",
  "your-api-key",
  "wrk-xxxxxxxx",
]);

function getApiKey(): string {
  const key = process.env.WEREAD_API_KEY?.trim();

  if (!key || PLACEHOLDER_KEYS.has(key)) {
    throw new WereadGatewayError({
      code: "WEREAD_NOT_CONFIGURED",
      message:
        "微信读书尚未配置。请由管理员在服务端设置 WEREAD_API_KEY 后重试。",
      retryable: false,
    });
  }

  return key;
}

export function isWereadConfigured(): boolean {
  const key = process.env.WEREAD_API_KEY?.trim();
  return Boolean(key && !PLACEHOLDER_KEYS.has(key));
}

function errorByName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name;
}

async function gatewayRequest<T>(
  apiName: string,
  params: Record<string, unknown>,
  schema: z.ZodType<T>,
): Promise<T> {
  const key = getApiKey();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  let responseText: string;

  try {
    response = await fetch(WEREAD_GATEWAY_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        api_name: apiName,
        ...params,
        skill_version: WEREAD_SKILL_VERSION,
      }),
      signal: controller.signal,
    });

    const contentLength = Number(
      response.headers.get("content-length") ?? "0",
    );

    if (contentLength > WEREAD_MAX_RESPONSE_BYTES) {
      console.error("[weread] gateway response exceeded size limit", {
        apiName,
      });
      throw new WereadGatewayError({
        code: "WEREAD_INVALID_RESPONSE",
        message: "微信读书返回的数据过大，已停止处理。",
        retryable: false,
      });
    }

    responseText = await response.text();
  } catch (error) {
    if (error instanceof WereadGatewayError) {
      throw error;
    }

    if (errorByName(error, "AbortError")) {
      console.error("[weread] gateway request timed out", { apiName });
      throw new WereadGatewayError({
        code: "WEREAD_TIMEOUT",
        message: "微信读书响应超时，请稍后重试。",
        retryable: true,
      });
    }

    console.error("[weread] gateway network request failed", {
      apiName,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    throw new WereadGatewayError({
      code: "WEREAD_NETWORK_ERROR",
      message: "无法连接微信读书服务，请检查网络后重试。",
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
  }

  if (Buffer.byteLength(responseText, "utf8") > WEREAD_MAX_RESPONSE_BYTES) {
    console.error("[weread] gateway response body exceeded size limit", {
      apiName,
    });
    throw new WereadGatewayError({
      code: "WEREAD_INVALID_RESPONSE",
      message: "微信读书返回的数据过大，已停止处理。",
      retryable: false,
    });
  }

  let payload: unknown;

  try {
    payload = JSON.parse(responseText);
  } catch {
    console.error("[weread] gateway returned invalid JSON", {
      apiName,
      httpStatus: response.status,
    });
    throw new WereadGatewayError({
      code: "WEREAD_INVALID_RESPONSE",
      message: "微信读书返回了无法识别的数据，请稍后重试。",
      retryable: true,
    });
  }

  const issue = inspectGatewayResponse(payload);

  if (issue) {
    const record =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};
    console.error("[weread] gateway returned an error", {
      apiName,
      httpStatus: response.status,
      errcode: record.errcode ?? null,
      errorCode: issue.code,
    });
    throw new WereadGatewayError(issue);
  }

  if (!response.ok) {
    console.error("[weread] gateway HTTP request failed", {
      apiName,
      httpStatus: response.status,
    });
    throw new WereadGatewayError({
      code:
        response.status === 401 || response.status === 403
          ? "WEREAD_UNAUTHORIZED"
          : response.status === 429
            ? "WEREAD_RATE_LIMITED"
            : "WEREAD_SERVICE_ERROR",
      message:
        response.status === 401 || response.status === 403
          ? "微信读书 API Key 无效或已失效，请重新获取并更新服务端配置。"
          : response.status === 429
            ? "微信读书请求过于频繁，请稍后再试。"
            : "微信读书服务暂时不可用，请稍后重试。",
      retryable: response.status === 429 || response.status >= 500,
    });
  }

  try {
    return schema.parse(payload);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[weread] gateway response schema mismatch", {
        apiName,
        issueCount: error.issues.length,
      });
    } else {
      console.error("[weread] gateway response parsing failed", {
        apiName,
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
    }

    throw new WereadGatewayError({
      code: "WEREAD_INVALID_RESPONSE",
      message: "微信读书返回的数据结构与官方协议不一致，请稍后重试。",
      retryable: true,
    });
  }
}
export async function getWereadShelf(): Promise<WereadShelf> {
  const data = await gatewayRequest("/shelf/sync", {}, shelfResponseSchema);
  return mapShelfResponse(data);
}

export async function searchWereadBooks(
  keyword: string,
): Promise<WereadSearchResults> {
  const data = await gatewayRequest(
    "/store/search",
    { keyword, scope: 10 },
    searchResponseSchema,
  );
  return mapSearchResponse(keyword, data);
}

async function getWereadReviews(bookId: string): Promise<{
  reviews: z.infer<typeof reviewListResponseSchema>["reviews"];
  truncated: boolean;
}> {
  const reviews: z.infer<typeof reviewListResponseSchema>["reviews"] = [];
  let synckey = 0;

  for (let page = 0; page < MAX_REVIEW_PAGES; page += 1) {
    const data = await gatewayRequest(
      "/review/list/mine",
      {
        bookid: bookId,
        count: 20,
        ...(synckey > 0 ? { synckey } : {}),
      },
      reviewListResponseSchema,
    );

    reviews.push(...data.reviews);

    const hasMore = Number(data.hasMore ?? 0) === 1;
    const nextSynckey = Number(data.synckey ?? 0);

    if (!hasMore) {
      return { reviews, truncated: false };
    }

    if (
      !Number.isFinite(nextSynckey) ||
      nextSynckey <= 0 ||
      nextSynckey === synckey
    ) {
      return { reviews, truncated: true };
    }

    synckey = nextSynckey;
  }

  return { reviews, truncated: true };
}

export async function getWereadBookBundle(
  bookId: string,
): Promise<WereadBookBundle> {
  const info = await gatewayRequest(
    "/book/info",
    { bookId },
    bookInfoResponseSchema,
  );
  const progress = await gatewayRequest(
    "/book/getprogress",
    { bookId },
    bookProgressResponseSchema,
  );
  const bookmarks = await gatewayRequest(
    "/book/bookmarklist",
    { bookId },
    bookmarkListResponseSchema,
  );
  const reviewResult = await getWereadReviews(bookId);

  return mapBookBundle(
    info,
    progress,
    bookmarks,
    { reviews: reviewResult.reviews },
    reviewResult.truncated,
  );
}

export async function getWereadReadingStats(
  mode: WereadReadingMode,
): Promise<WereadReadingStats> {
  const data = await gatewayRequest(
    "/readdata/detail",
    { mode, baseTime: 0 },
    readingStatsResponseSchema,
  );

  return mapReadingStats(mode, data);
}
