import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routeSource = readFileSync(
  new URL("../app/api/extension/imports/route.ts", import.meta.url),
  "utf8",
);

test("clip API uses hashed token RPC without service role credentials", () => {
  assert.match(routeSource, /hashExtensionToken\(token\)/);
  assert.match(routeSource, /verify_and_create_clip/);
  assert.match(routeSource, /createAnonClient/);
  assert.doesNotMatch(routeSource, /SERVICE_ROLE_KEY/);
});

test("clip API keeps CORS and bearer authentication boundaries", () => {
  assert.match(routeSource, /Access-Control-Allow-Headers/);
  assert.match(routeSource, /Authorization, Content-Type/);
  assert.match(routeSource, /export async function OPTIONS/);
  assert.match(routeSource, /export async function POST/);
  assert.doesNotMatch(routeSource, /console\.log\([^)]*token/i);
});
