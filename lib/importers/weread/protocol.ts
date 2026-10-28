import { z } from "zod";

import type { WereadErrorCode } from "./types";

export const WEREAD_GATEWAY_URL =
  "https://i.weread.qq.com/api/agent/gateway";
export const WEREAD_SKILL_VERSION = "1.0.5";
export const WEREAD_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

const optionalText = z.string().nullable().optional();
const optionalNumber = z
  .union([z.number(), z.string()])
  .nullable()
  .optional();
const envelopeSchema = z
  .object({
    errcode: z.union([z.number(), z.string()]).nullable().optional(),
    errmsg: z.string().nullable().optional(),
    upgrade_info: z.unknown().optional(),
  })
  .passthrough();

export const shelfResponseSchema = envelopeSchema.extend({
  books: z
    .array(
      z
        .object({
          bookId: z.string().min(1),
          title: z.string().min(1),
          author: optionalText,
          cover: optionalText,
          category: optionalText,
          readUpdateTime: optionalNumber,
          finishReading: optionalNumber,
          secret: optionalNumber,
          readerLink: optionalText,
          deepLink: optionalText,
        })
        .passthrough(),
    )
    .optional()
    .default([]),
  albums: z
    .array(
      z
        .object({
          albumInfo: z
            .object({
              albumId: optionalText,
              name: optionalText,
              authorName: optionalText,
              cover: optionalText,
            })
            .passthrough()
            .optional(),
          albumInfoExtra: z
            .object({
              secret: optionalNumber,
            })
            .passthrough()
            .optional(),
        })
        .passthrough(),
    )
    .optional()
    .default([]),
  mp: z.unknown().optional().nullable(),
});

export const searchResponseSchema = envelopeSchema.extend({
  results: z
    .array(
      z
        .object({
          title: optionalText,
          scope: optionalNumber,
          books: z
            .array(
              z
                .object({
                  searchIdx: optionalNumber,
                  bookInfo: z
                    .object({
                      bookId: z.string().min(1),
                      title: z.string().min(1),
                      author: optionalText,
                      cover: optionalText,
                      category: optionalText,
                      intro: optionalText,
                      readerLink: optionalText,
                      deepLink: optionalText,
                    })
                    .passthrough()
                    .optional(),
                  readingCount: optionalNumber,
                  newRating: optionalNumber,
                })
                .passthrough(),
            )
            .optional()
            .default([]),
        })
        .passthrough(),
    )
    .optional()
    .default([]),
});

export const bookInfoResponseSchema = envelopeSchema.extend({
  bookId: z.string().min(1),
  title: z.string().min(1),
  author: optionalText,
  cover: optionalText,
  intro: optionalText,
  category: optionalText,
  isbn: optionalText,
  readerLink: optionalText,
  deepLink: optionalText,
});

export const bookProgressResponseSchema = envelopeSchema.extend({
  book: z
    .object({
      progress: optionalNumber,
      finishTime: optionalNumber,
      recordReadingTime: optionalNumber,
      isStartReading: z
        .union([z.boolean(), z.number(), z.string()])
        .nullable()
        .optional(),
    })
    .passthrough()
    .optional(),
  timestamp: optionalNumber,
});

export const bookmarkListResponseSchema = envelopeSchema.extend({
  updated: z
    .array(
      z
        .object({
          bookmarkId: optionalText,
          bookId: optionalText,
          chapterUid: optionalNumber,
          markText: optionalText,
          createTime: optionalNumber,
          range: optionalText,
        })
        .passthrough(),
    )
    .optional()
    .default([]),
  chapters: z
    .array(
      z
        .object({
          chapterUid: optionalNumber,
          title: optionalText,
        })
        .passthrough(),
    )
    .optional()
    .default([]),
});

export const reviewListResponseSchema = envelopeSchema.extend({
  reviews: z
    .array(
      z
        .object({
          review: z
            .object({
              reviewId: optionalText,
              content: optionalText,
              abstract: optionalText,
              range: optionalText,
              chapterUid: optionalNumber,
              chapterName: optionalText,
              createTime: optionalNumber,
              star: optionalNumber,
            })
            .passthrough()
            .optional(),
        })
        .passthrough(),
    )
    .optional()
    .default([]),
  totalCount: optionalNumber,
  hasMore: optionalNumber,
  synckey: optionalNumber,
});

export const readingStatsResponseSchema = envelopeSchema.extend({
  baseTime: optionalNumber,
  readDays: optionalNumber,
  totalReadTime: optionalNumber,
  dayAverageReadTime: optionalNumber,
  compare: optionalNumber,
  readLongest: z
    .array(
      z
        .object({
          book: z
            .object({
              bookId: optionalText,
              title: optionalText,
              author: optionalText,
            })
            .passthrough()
            .optional(),
          albumInfo: z
            .object({
              albumId: optionalText,
              name: optionalText,
              authorName: optionalText,
            })
            .passthrough()
            .optional(),
          readTime: optionalNumber,
        })
        .passthrough(),
    )
    .optional()
    .default([]),
  readStat: z
    .array(
      z
        .object({
          stat: optionalText,
          counts: optionalText,
        })
        .passthrough(),
    )
    .optional()
    .default([]),
  preferCategory: z
    .array(
      z
        .object({
          categoryTitle: optionalText,
          readingTime: optionalNumber,
        })
        .passthrough(),
    )
    .optional()
    .default([]),
});

export type WereadGatewayIssue = {
  code: WereadErrorCode;
  message: string;
  retryable: boolean;
};

export class WereadGatewayError extends Error {
  readonly code: WereadErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(issue: WereadGatewayIssue) {
    super(issue.message);
    this.name = "WereadGatewayError";
    this.code = issue.code;
    this.userMessage = issue.message;
    this.retryable = issue.retryable;
  }
}

function getUpgradeMessage(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value.trim().slice(0, 500) || null;
  }

  if (typeof value === "object" && "message" in value) {
    const message = value.message;
    return typeof message === "string"
      ? message.trim().slice(0, 500) || null
      : null;
  }

  return null;
}

function normalizeErrcode(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function inspectGatewayResponse(
  payload: unknown,
): WereadGatewayIssue | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      code: "WEREAD_INVALID_RESPONSE",
      message: "微信读书返回了无法识别的数据，请稍后重试。",
      retryable: true,
    };
  }

  const record = payload as Record<string, unknown>;
  const upgradeMessage = getUpgradeMessage(record.upgrade_info);

  if (upgradeMessage) {
    return {
      code: "WEREAD_UPGRADE_REQUIRED",
      message: `微信读书 Agent Skill 需要升级：${upgradeMessage}`,
      retryable: false,
    };
  }

  const errcode = normalizeErrcode(record.errcode);

  if (errcode === 0) {
    return null;
  }

  const rawMessage =
    typeof record.errmsg === "string" ? record.errmsg : "";

  if (
    errcode === -2010 ||
    errcode === 401 ||
    errcode === 403 ||
    /鉴权|登录|用户不存在|key|token/i.test(rawMessage)
  ) {
    return {
      code: "WEREAD_UNAUTHORIZED",
      message: "微信读书 API Key 无效或已失效，请重新获取并更新服务端配置。",
      retryable: false,
    };
  }

  if (
    errcode === 429 ||
    /频繁|限流|请求过多|rate.?limit/i.test(rawMessage)
  ) {
    return {
      code: "WEREAD_RATE_LIMITED",
      message: "微信读书请求过于频繁，请稍后再试。",
      retryable: true,
    };
  }

  return {
    code: "WEREAD_SERVICE_ERROR",
    message: "微信读书服务暂时不可用，请稍后重试。",
    retryable: true,
  };
}
