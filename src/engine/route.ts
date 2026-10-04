import { LOOT_STOP_SEC, ROTATE_SPEED } from "./constants";
import { dist } from "./geometry";
import type { Vec } from "./types";

/** Travel time plus a loot pause at every stop after the drop. A lone drop takes no travel. */
export function routeSeconds(points: readonly Vec[]): number {
  if (points.length < 2) return 0;
  let travel = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (!previous || !next) continue;
    travel += dist(previous, next);
  }
  return travel / ROTATE_SPEED + (points.length - 1) * LOOT_STOP_SEC;
}

export function formatClock(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function routeVerdict(routeSec: number, waitSec: number): string {
  const wait = formatClock(waitSec);
  if (routeSec <= 0) {
    return `Zone 1 waits ${wait} before the storm moves. Loot on the drop, then rotate.`;
  }
  const taken = formatClock(routeSec);
  const gap = formatClock(Math.abs(waitSec - routeSec));
  if (routeSec <= waitSec) {
    return `This route takes ${taken}. Zone 1 waits ${wait}, so you finish with ${gap} left.`;
  }
  return `This route takes ${taken}. Zone 1 waits ${wait}, so you are still looting ${gap} after the storm starts moving.`;
}
