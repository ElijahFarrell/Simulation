import { useEffect, useState } from "react";
import type { LandMask } from "@/engine/types";
import type { Place } from "@/lib/island/project";
import { landMaskFromImage } from "@/lib/island/read-land";

type IslandView = { imageUrl: string | null; places: Place[] };

export function useIsland(onPlaces: (places: Place[]) => void, onLand: (land: LandMask) => void) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [island, setIsland] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/island")
      .then((response) => response.json() as Promise<IslandView>)
      .then((island) => {
        if (cancelled) return;
        setImageUrl(island.imageUrl);
        onPlaces(island.places);
      })
      .catch(() => {});
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
    };
    image.src = imageUrl;
    return () => {
      cancelled = true;
    };
  }, [imageUrl, onLand]);

  return island;
}
