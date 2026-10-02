import { createHash, timingSafeEqual } from "node:crypto";

export type AccessResult = "ok" | "not-configured" | "denied";

export function checkPasscode(provided: string | null, expected: string | undefined): AccessResult {
  if (!expected) return "not-configured";
  if (!provided) return "denied";
  return timingSafeEqual(digest(provided), digest(expected)) ? "ok" : "denied";
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
