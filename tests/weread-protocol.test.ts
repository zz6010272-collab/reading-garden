import assert from "node:assert/strict";
import test from "node:test";

import { inspectGatewayResponse } from "../lib/importers/weread/protocol";

test("accepts a successful gateway envelope", () => {
  assert.equal(inspectGatewayResponse({ errcode: 0, data: [] }), null);
  assert.equal(inspectGatewayResponse({ data: [] }), null);
});

test("maps authentication and rate limit failures to stable messages", () => {
  const auth = inspectGatewayResponse({
    errcode: -2010,
    errmsg: "用户不存在",
  });
  const limited = inspectGatewayResponse({
    errcode: 429,
    errmsg: "请求过于频繁",
  });

  assert.equal(auth?.code, "WEREAD_UNAUTHORIZED");
  assert.equal(auth?.retryable, false);
  assert.equal(limited?.code, "WEREAD_RATE_LIMITED");
  assert.equal(limited?.retryable, true);
});

test("stops on upgrade_info before processing business data", () => {
  const issue = inspectGatewayResponse({
    errcode: 0,
    upgrade_info: { message: "请升级到 1.0.6" },
    data: [],
  });

  assert.equal(issue?.code, "WEREAD_UPGRADE_REQUIRED");
  assert.match(issue?.message ?? "", /1\.0\.6/);
});

test("rejects non-object responses", () => {
  const issue = inspectGatewayResponse("not-json-object");
  assert.equal(issue?.code, "WEREAD_INVALID_RESPONSE");
  assert.equal(issue?.retryable, true);
});
