const MAP_IMAGE_HOST = "fortnite-api.com";

/** The map route only proxies images the Fortnite map API hosts itself. */
export function isFortniteMapImageUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === "https:" &&
    url.hostname === MAP_IMAGE_HOST &&
    url.pathname.startsWith("/images/") &&
    url.username === "" &&
    url.password === "" &&
    url.hash === ""
  );
}
