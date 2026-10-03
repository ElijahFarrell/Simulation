import { MAP_SIZE } from "./constants";
import { clampToMap, pointInCircle } from "./geometry";
import type { Circle, LandMask, Vec } from "./types";

export type { LandMask };

export function isLandColor(red: number, green: number, blue: number): boolean {
  const water = blue > red + 25 && blue >= green - 8 && blue > 90;
  return !water;
}

export function isLandPoint(mask: LandMask, point: Vec): boolean {
  const col = clampIndex((point.x / MAP_SIZE) * mask.grid, mask.grid);
  const row = clampIndex(((MAP_SIZE - point.y) / MAP_SIZE) * mask.grid, mask.grid);
  return mask.cells[row * mask.grid + col] === 1;
}

/** Move a point onto land. When a circle is given, stay inside it if any land is there. */
export function stayOnLand(mask: LandMask | null | undefined, point: Vec, circle?: Circle): Vec {
  if (!mask) return point;
  if (isLandPoint(mask, point) && (!circle || pointInCircle(point, circle))) return point;
  return searchLand(mask, point, circle) ?? (circle ? searchLand(mask, point) : null) ?? point;
}

function searchLand(mask: LandMask, point: Vec, circle?: Circle): Vec | null {
  const step = MAP_SIZE / mask.grid;
  const maxRadius = circle ? circle.radius * 2 + step : MAP_SIZE;
  for (let radius = step; radius <= maxRadius; radius += step) {
    const steps = Math.max(8, Math.round((Math.PI * 2 * radius) / step));
    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      const candidate = clampToMap({
        x: point.x + Math.cos(angle) * radius,
        y: point.y + Math.sin(angle) * radius,
      });
      if (circle && !pointInCircle(candidate, circle)) continue;
      if (isLandPoint(mask, candidate)) return candidate;
    }
  }
  return null;
}

function clampIndex(value: number, grid: number): number {
  return Math.min(grid - 1, Math.max(0, Math.floor(value)));
}
