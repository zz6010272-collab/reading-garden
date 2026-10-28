import { createHash, randomBytes } from "node:crypto";

export const EXTENSION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function createExtensionTokenSecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashExtensionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
