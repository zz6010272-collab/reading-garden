import assert from "node:assert/strict";
import test from "node:test";

import {
  getWereadShelf,
  isWereadConfigured,
} from "../lib/importers/weread/gateway";
import {
  WEREAD_GATEWAY_URL,
  WEREAD_SKILL_VERSION,
  WereadGatewayError,
} from "../lib/importers/weread/protocol";

test("reports missing API key without making a request", async () => {
  const originalKey = process.env.WEREAD_API_KEY;
  const originalFetch = globalThis.fetch;
  let called = false;

  process.env.WEREAD_API_KEY = "";
  globalThis.fetch = (async () => {
    called = true;
    return new Response("{}");
  }) as typeof fetch;

  try {
    assert.equal(isWereadConfigured(), false);
    await assert.rejects(getWereadShelf, (error: unknown) => {
      return error instanceof WereadGatewayError
        ? error.code === "WEREAD_NOT_CONFIGURED"
        : false;
    });
    assert.equal(called, false);
  } finally {
    process.env.WEREAD_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});

test("sends the verified flat gateway request and bearer key", async () => {
  const originalKey = process.env.WEREAD_API_KEY;
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;

  process.env.WEREAD_API_KEY = "wrk-test-only";
  globalThis.fetch = (async (input, init) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ errcode: 0, books: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const shelf = await getWereadShelf();
    const body = JSON.parse(String(capturedInit?.body)) as Record<
      string,
      unknown
    >;
    const headers = new Headers(capturedInit?.headers);

    assert.equal(shelf.books.length, 0);
    assert.equal(capturedUrl, WEREAD_GATEWAY_URL);
    assert.equal(capturedInit?.method, "POST");
    assert.equal(headers.get("Authorization"), "Bearer wrk-test-only");
    assert.equal(body.api_name, "/shelf/sync");
    assert.equal(body.skill_version, WEREAD_SKILL_VERSION);
    assert.equal("params" in body, false);
  } finally {
    process.env.WEREAD_API_KEY = originalKey;
    globalThis.fetch = originalFetch;
  }
});
