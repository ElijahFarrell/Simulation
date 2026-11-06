import { useEffect, useState } from "react";

type Loaded<T> = { key: string | null; data: T | null; error: string | null };

/** Keeps the last good data while a new request loads, so the screen doesn't blank. */
export function useJson<T>(url: string | null, fallbackError: string, refresh = 0) {
  const key = url === null ? null : `${refresh}:${url}`;
  const [loaded, setLoaded] = useState<Loaded<T>>({ key: null, data: null, error: null });

  useEffect(() => {
    if (key === null || url === null) return;
    let cancelled = false;
    void fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<T>;
      })
      .then((data) => {
        if (!cancelled) setLoaded({ key, data, error: null });
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        const error = (reason instanceof Error && reason.message) || fallbackError;
        setLoaded((previous) => ({ key, data: previous.data, error }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, url, fallbackError]);

  return {
    data: loaded.data,
    error: loaded.key === key ? loaded.error : null,
    loading: key !== null && loaded.key !== key,
  };
}
