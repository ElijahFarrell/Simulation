const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/**
 * The token exchange must use this app's callback, not an arbitrary URL from the caller.
 * https is allowed for any host because Epic still rejects origins that are not registered
 * on the client. Cleartext is only allowed on loopback, for `next dev`.
 */
export function isEpicCallbackUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash) return false;
  if (url.pathname !== "/api/epic/callback") return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
}
