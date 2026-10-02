import { MAP_SIZE } from "./constants";
import type { Rng } from "./rng";
import type { Circle, Vec } from "./types";

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function len(v: Vec): number {
  return Math.hypot(v.x, v.y);
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec, factor: number): Vec {
  return { x: v.x * factor, y: v.y * factor };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec(a: Vec, b: Vec, t: number): Vec {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function moveToward(from: Vec, to: Vec, maxDistance: number): Vec {
  const offset = sub(to, from);
  const distance = len(offset);
  if (distance <= maxDistance || distance === 0) return { ...to };
  return add(from, scale(offset, maxDistance / distance));
}

export function pointInCircle(point: Vec, circle: Circle): boolean {
  return dist(point, circle.center) <= circle.radius + 1e-6;
}

export function circleContainsCircle(outer: Circle, inner: Circle): boolean {
  return dist(outer.center, inner.center) + inner.radius <= outer.radius + 1e-4;
}

export function circleOnMap(circle: Circle): boolean {
  const { x, y } = circle.center;
  return (
    x - circle.radius >= -1e-4 &&
    y - circle.radius >= -1e-4 &&
    x + circle.radius <= MAP_SIZE + 1e-4 &&
    y + circle.radius <= MAP_SIZE + 1e-4
  );
}

/** 0 is north (+y), increasing clockwise. */
export function angleFromNorthCW(origin: Vec, point: Vec): number {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const angle = Math.atan2(dx, dy);
  return angle < 0 ? angle + Math.PI * 2 : angle;
}

export function angleDiff(a: number, b: number): number {
  const raw = Math.abs(a - b) % (Math.PI * 2);
  return raw > Math.PI ? Math.PI * 2 - raw : raw;
}

export function sectorIndex(origin: Vec, point: Vec, count: number): number {
  const slice = (Math.PI * 2) / count;
  return Math.min(count - 1, Math.floor(angleFromNorthCW(origin, point) / slice));
}

export function pointFromNorth(origin: Vec, angle: number, distance: number): Vec {
  return {
    x: origin.x + Math.sin(angle) * distance,
    y: origin.y + Math.cos(angle) * distance,
  };
}

/** Area-uniform sample of a disc. */
export function sampleDisc(rng: Rng, center: Vec, radius: number): Vec {
  if (radius <= 0) return { ...center };
  const r = radius * Math.sqrt(rng.next());
  const theta = Math.PI * 2 * rng.next();
  return {
    x: center.x + r * Math.cos(theta),
    y: center.y + r * Math.sin(theta),
  };
}

export function clampToCircle(point: Vec, circle: Circle, radiusScale = 1): Vec {
  const offset = sub(point, circle.center);
  const distance = len(offset);
  const max = circle.radius * radiusScale;
  if (distance <= max || distance === 0) return { ...point };
  return add(circle.center, scale(offset, max / distance));
}

export function clampToMap(point: Vec): Vec {
  return {
    x: clamp(point.x, 0, MAP_SIZE),
    y: clamp(point.y, 0, MAP_SIZE),
  };
}
