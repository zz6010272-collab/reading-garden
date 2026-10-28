import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_TIMEOUT_MESSAGE,
  AuthTimeoutError,
  withAuthTimeout,
} from "../lib/auth/timeout";

test("returns the auth result before the timeout", async () => {
  const result = await withAuthTimeout(Promise.resolve("ok"), 50);
  assert.equal(result, "ok");
});

test("rejects a hanging auth request after the timeout", async () => {
  await assert.rejects(
    withAuthTimeout(new Promise<string>(() => undefined), 10),
    (error: unknown) => {
      assert.ok(error instanceof AuthTimeoutError);
      assert.equal(error.message, AUTH_TIMEOUT_MESSAGE);
      return true;
    },
  );
});
