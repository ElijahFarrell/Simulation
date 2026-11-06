import { randomBytes, timingSafeEqual } from "node:crypto";

export const EPIC_STATE_COOKIE = "epic_oauth_state";
export const EPIC_STATE_MAX_AGE_SECONDS = 600;

export function createOauthState(): string {
  return randomBytes(32).toString("base64url");
}

export function oauthStatesMatch(expected: string | undefined, received: string | null): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
