import { useEffect, useState } from "react";
import type { LandMask } from "@/engine/types";
import type { Place } from "@/lib/island/project";
import { landMaskFromImage } from "@/lib/island/read-land";

/** A stalled map shouldn't lock the game. Land that arrives later still moves the lobby. */
const MAX_WAIT_MS = 8_000;

type IslandView = { imageUrl: string | null; places: Place[] };

export function useIsland(onPlaces: (places: Place[]) => void, onLand: (land: LandMask) => void) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [island, setIsland] = useState<HTMLImageElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/island")
      .then((response) => response.json() as Promise<IslandView>)
      .then((island) => {
        if (cancelled) return;
        setImageUrl(island.imageUrl);
        onPlaces(island.places);
        if (!island.imageUrl) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [onPlaces]);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setIsland(image);
      onLand(landMaskFromImage(image));
      setReady(true);
    };
    image.onerror = () => {
      if (!cancelled) setReady(true);
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, onLand]);

  return { island, ready };
}
