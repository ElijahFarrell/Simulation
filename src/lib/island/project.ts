import { MAP_SIZE } from "@/engine/constants";
import type { Vec } from "@/engine/types";

/** The public map image is a square covering ±128000 Unreal units. */
export const WORLD_HALF = 128_000;

export type Place = {
  name: string;
  x: number;
  y: number;
};

export function worldToSim(worldX: number, worldY: number): Vec {
  const span = WORLD_HALF * 2;
  const across = (worldX + WORLD_HALF) / span;
  const fromTop = (worldY + WORLD_HALF) / span;
  return {
    x: across * MAP_SIZE,
    y: (1 - fromTop) * MAP_SIZE,
  };
}

export function nearestPlace(places: readonly Place[], point: Vec): string | null {
  let best: { name: string; distance: number } | null = null;
  for (const place of places) {
    const dx = place.x - point.x;
    const dy = place.y - point.y;
    const distance = dx * dx + dy * dy;
    if (!best || distance < best.distance) best = { name: place.name, distance };
  }
  return best?.name ?? null;
}
