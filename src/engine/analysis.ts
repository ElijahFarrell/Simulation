import {
  DEAD_MAX,
  EXPOSURE_RADIUS,
  MC_SAMPLES,
  SECTOR_COUNT,
  STACKED_MIN,
} from "./constants";
import { dist, pointInCircle, sampleDisc, sectorIndex } from "./geometry";
import { createRng } from "./rng";
import type { Circle, SectorInfo, Team, Vec, ZonePhase } from "./types";

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
  const radius = current.to.radius - following.to.radius;
  if (radius <= 0) return null;
  return { center: current.to.center, radius };
}

export function exposureRadiusFor(zoneRadius: number): number {
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

export function sampleFutureCenters(
  nextZone: Circle,
  afterRadius: number,
  seed: number,
): Vec[] {
  const rng = createRng(seed >>> 0);
  const maxShift = Math.max(0, nextZone.radius - afterRadius);
  return Array.from({ length: MC_SAMPLES }, () =>
    sampleDisc(rng, nextZone.center, maxShift),
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

export function positioningGrid(
  nextZone: Circle,
  afterRadius: number,
  seed: number,
): HeatCell[] {
  const centers = sampleFutureCenters(nextZone, afterRadius, seed);
  const cells: HeatCell[] = [];
  const steps = 16;
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
  afterRadius: number,
  seed: number,
): { score: number; expected: number; best: number } {
  const centers = sampleFutureCenters(nextZone, afterRadius, seed);
  const mine = expectedDistance(point, centers, afterRadius);
  const candidates = [nextZone.center];
  for (let i = 0; i < SECTOR_COUNT; i += 1) {
    const angle = ((i + 0.5) / SECTOR_COUNT) * Math.PI * 2;
    candidates.push({
      x: nextZone.center.x + Math.sin(angle) * nextZone.radius * 0.92,
      y: nextZone.center.y + Math.cos(angle) * nextZone.radius * 0.92,
    });
  }
  let best = Number.POSITIVE_INFINITY;
  let worst = 0;
  for (const candidate of candidates) {
    const value = expectedDistance(candidate, centers, afterRadius);
    best = Math.min(best, value);
    worst = Math.max(worst, value);
  }
  const span = Math.max(80, worst - best);
  const score = clampScore(100 - ((mine - best) / span) * 100);
  return { score, expected: mine, best };
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

export function teamsInBand(teams: readonly Team[], nextZone: Circle): number {
  return sectorDensity(teams, nextZone).reduce((sum, sector) => sum + sector.teamCount, 0);
}
