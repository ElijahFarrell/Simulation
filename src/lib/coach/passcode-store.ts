import { PASSCODE_STORAGE_KEY } from "./constants";

const listeners = new Set<() => void>();

export function subscribePasscode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readPasscode(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PASSCODE_STORAGE_KEY) ?? "";
}

export function writePasscode(passcode: string): void {
  if (passcode) localStorage.setItem(PASSCODE_STORAGE_KEY, passcode);
  else localStorage.removeItem(PASSCODE_STORAGE_KEY);
  for (const listener of listeners) listener();
}
