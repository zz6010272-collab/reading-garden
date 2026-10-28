import assert from "node:assert/strict";
import test from "node:test";

import {
  createExtensionTokenSecret,
  EXTENSION_TOKEN_PATTERN,
  hashExtensionToken,
} from "../lib/extension/token";

test("creates a 32-byte hexadecimal pairing token", () => {
  const token = createExtensionTokenSecret();

  assert.equal(token.length, 64);
  assert.match(token, EXTENSION_TOKEN_PATTERN);
  assert.notEqual(token, createExtensionTokenSecret());
});

test("hashes pairing tokens with SHA-256", () => {
  assert.equal(
    hashExtensionToken("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.equal(
    hashExtensionToken("abc"),
    hashExtensionToken("abc"),
  );
});
