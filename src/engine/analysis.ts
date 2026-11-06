import {
  DEAD_MAX,
  EXPOSURE_RADIUS,
  HALF_PULL_REACH,
  HEAT_STEPS,
  MC_SAMPLES,
  SECTOR_COUNT,
  STACKED_MIN,
} from "./constants";
import { clamp, dist, pointFromNorth, pointInCircle, sectorIndex } from "./geometry";
import { createRng } from "./rng";
import type { Circle, SectorInfo, Team, Vec, ZonePhase } from "./types";
import { placeNextZone } from "./zones";

export function sectorDensity(teams: readonly Team[], nextZone: Circle): SectorInfo[] {
  const counts = Array.from({ length: SECTOR_COUNT }, () => 0);
  const inner = nextZone.radius * 0.55;
  const outer = nextZone.radius * 1.35;

  for (const team of teams) {
    if (team.eliminated || team.isPlayer) continue;
    const distance = dist(team.pos, nextZone.center);
    if (distance < inner || distance > outer) continue;
    const index = sectorIndex(nextZone.center, team.pos, SECTOR_COUNT);
    counts[index] = (counts[index] ?? 0) + 1;
  }

  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const spread = max - min >= 2;

  return counts.map((teamCount, index) => ({
    index,
    teamCount,
    label: labelFor(teamCount, min, max, spread),
  }));
}

function labelFor(
  count: number,
  min: number,
  max: number,
  spread: boolean,
): SectorInfo["label"] {
  if (count <= DEAD_MAX || (spread && count === min)) return "dead";
  if (count >= STACKED_MIN || (spread && count === max)) return "stacked";
  return "normal";
}

export function pullRegion(
  current: ZonePhase,
  following: ZonePhase | undefined,
): Circle | null {
  if (!following) return null;
  const radius = following.isMoving
    ? current.to.radius * HALF_PULL_REACH[1]
    : current.to.radius - following.to.radius;
  if (radius <= 0) return null;
  return { center: current.to.center, radius };
}

function exposureRadiusFor(zoneRadius: number): number {
  return Math.min(EXPOSURE_RADIUS, Math.max(48, zoneRadius * 0.85));
}

export function exposureDirections(
  point: Vec,
  teams: readonly Team[],
  zoneRadius: number,
): number {
  const radius = exposureRadiusFor(zoneRadius);
  const seen = new Set<number>();
  for (const team of teams) {
    if (team.eliminated || team.isPlayer) continue;
    if (dist(point, team.pos) > radius) continue;
    seen.add(sectorIndex(point, team.pos, SECTOR_COUNT));
  }
  return seen.size;
}

export function sampleFutureCenters(nextZone: Circle, following: ZonePhase, seed: number): Vec[] {
  const rng = createRng(seed >>> 0);
  return Array.from(
    { length: MC_SAMPLES },
    () => placeNextZone(rng, nextZone, following.to.radius, following.isMoving).center,
  );
}

export function expectedDistance(
  point: Vec,
  centers: readonly Vec[],
  afterRadius: number,
): number {
  if (centers.length === 0) return 0;
  let total = 0;
  for (const center of centers) {
    const distance = dist(point, center);
    total += distance <= afterRadius ? 0 : distance - afterRadius;
  }
  return total / centers.length;
}

export type HeatCell = { x: number; y: number; distance: number };

export function positioningGrid(nextZone: Circle, following: ZonePhase, seed: number): HeatCell[] {
  const centers = sampleFutureCenters(nextZone, following, seed);
  const afterRadius = following.to.radius;
  const cells: HeatCell[] = [];
  const steps = HEAT_STEPS;
  const minX = nextZone.center.x - nextZone.radius;
  const minY = nextZone.center.y - nextZone.radius;
  const span = nextZone.radius * 2;

  for (let y = 0; y < steps; y += 1) {
    for (let x = 0; x < steps; x += 1) {
      const point = {
        x: minX + ((x + 0.5) / steps) * span,
        y: minY + ((y + 0.5) / steps) * span,
      };
      if (!pointInCircle(point, nextZone)) continue;
      cells.push({
        ...point,
        distance: expectedDistance(point, centers, afterRadius),
      });
    }
  }
  return cells;
}

export function positioningScore(
  point: Vec,
  nextZone: Circle,
  following: ZonePhase,
  seed: number,
): number {
  const centers = sampleFutureCenters(nextZone, following, seed);
  const afterRadius = following.to.radius;
  const mine = expectedDistance(point, centers, afterRadius);
  const candidates = [nextZone.center];
  for (let i = 0; i < SECTOR_COUNT; i += 1) {
    candidates.push(pointFromNorth(nextZone.center, ((i + 0.5) / SECTOR_COUNT) * Math.PI * 2, nextZone.radius * 0.92));
  }
  let best = Number.POSITIVE_INFINITY;
  let worst = 0;
  for (const candidate of candidates) {
    const value = expectedDistance(candidate, centers, afterRadius);
    best = Math.min(best, value);
    worst = Math.max(worst, value);
  }
  const span = Math.max(80, worst - best);
  return clamp(100 - ((mine - best) / span) * 100, 0, 100);
}

