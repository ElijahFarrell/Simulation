import { asRecord, nonEmptyString } from "../json";

export type EpicProfile = {
  accountId: string;
  displayName: string;
  preferredLanguage?: string;
};

export const EPIC_NAME_MAX = 32;

const ACCOUNT_ID = /^[0-9a-f]{32}$/i;
const DISPLAY_NAME = new RegExp(`^.{1,${EPIC_NAME_MAX}}$`, "u");
const LANGUAGE = /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{2,8})?$/;

export function isEpicAccountId(value: string): boolean {
  return ACCOUNT_ID.test(value);
}

export function epicProfileFrom(token: unknown, userInfo: unknown): EpicProfile | null {
  const tokenRecord = asRecord(token);
  const info = asRecord(userInfo);
  const claims = jwtPayload(stringField(tokenRecord, "access_token"));
  const fromToken = stringField(tokenRecord, "account_id") ?? stringField(claims, "sub");
  const fromInfo = stringField(info, "sub");
  if (fromToken && fromInfo && fromToken !== fromInfo) return null;

  const accountId = normalizeAccountId(fromToken ?? fromInfo);
  const displayName = normalizeDisplayName(
    stringField(info, "preferred_username") ??
      stringField(info, "name") ??
      stringField(claims, "dn") ??
      stringField(tokenRecord, "displayName"),
  );
  if (!accountId || !displayName) return null;

  const preferredLanguage = normalizeLanguage(
    stringField(info, "preferred_language") ?? stringField(info, "preferredLanguage") ?? stringField(info, "locale"),
  );
  return preferredLanguage ? { accountId, displayName, preferredLanguage } : { accountId, displayName };
}

export function accessTokenFrom(token: unknown): string | null {
  return stringField(asRecord(token), "access_token");
}

function normalizeAccountId(value: string | null): string | null {
  if (!value || !isEpicAccountId(value)) return null;
  return value.toLowerCase();
}

function normalizeDisplayName(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return DISPLAY_NAME.test(trimmed) ? trimmed : null;
}

function normalizeLanguage(value: string | null): string | undefined {
  const trimmed = value?.trim() ?? "";
  return LANGUAGE.test(trimmed) ? trimmed : undefined;
}

function jwtPayload(token: string | null): Record<string, unknown> | null {
  const part = token?.split(".")[1];
  if (!part) return null;
  try {
    const parsed: unknown = JSON.parse(decodeBase64Url(part));
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function stringField(record: Record<string, unknown> | null, key: string): string | null {
  return nonEmptyString(record?.[key]);
}
