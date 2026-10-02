import { SECTOR_COUNT } from "./constants";
import {
  clampToCircle,
  pointFromNorth,
  sampleDisc,
  sectorIndex,
} from "./geometry";
import type { Rng } from "./rng";
import type { Archetype, Circle, Team, Timing, Vec } from "./types";

export function aiTiming(archetype: Archetype): Timing {
  if (archetype === "deep" || archetype === "fighter") return "early";
  if (archetype === "passive") return "late";
  return "standard";
}

export function chooseAiDestination(
  team: Team,
  teams: readonly Team[],
  nextZone: Circle,
  rng: Rng,
): Vec {
  switch (team.archetype) {
    case "deep":
      return sampleDisc(rng, nextZone.center, nextZone.radius * 0.4);
    case "edge":
      return edgePoint(nextZone, team.pos, rng);
    case "passive":
      return passivePoint(team, teams, nextZone, rng);
    case "fighter":
      return fighterPoint(team, teams, nextZone, rng);
    default:
      return clampToCircle(team.pos, nextZone, 0.9);
  }
}

function edgePoint(zone: Circle, from: Vec, rng: Rng): Vec {
  const angle = sectorAngle(zone.center, from);
  return pointFromNorth(zone.center, angle, zone.radius * rng.range(0.85, 0.95));
}

function passivePoint(
  team: Team,
  teams: readonly Team[],
  zone: Circle,
  rng: Rng,
): Vec {
  const counts = Array.from({ length: SECTOR_COUNT }, () => 0);
  for (const other of teams) {
    if (other.id === team.id || other.eliminated) continue;
    const index = sectorIndex(zone.center, other.pos, SECTOR_COUNT);
    const current = counts[index] ?? 0;
    counts[index] = current + 1;
  }
  let bestIndex = 0;
  let bestCount = Number.POSITIVE_INFINITY;
  counts.forEach((count, index) => {
    if (count < bestCount) {
      bestCount = count;
      bestIndex = index;
    }
  });
  const slice = (Math.PI * 2) / SECTOR_COUNT;
  const angle = (bestIndex + 0.5) * slice;
  return pointFromNorth(zone.center, angle, zone.radius * rng.range(0.85, 0.95));
}

function fighterPoint(
  team: Team,
  teams: readonly Team[],
  zone: Circle,
  rng: Rng,
): Vec {
  const nearest = nearestOther(team, teams);
  if (!nearest) return sampleDisc(rng, zone.center, zone.radius * 0.4);
  return clampToCircle(nearest.pos, zone, 0.9);
}

function nearestOther(team: Team, teams: readonly Team[]): Team | null {
  let best: Team | null = null;
  let bestDist = Number.POSITIVE_INFINITY;
  for (const other of teams) {
    if (other.id === team.id || other.eliminated) continue;
    const dx = other.pos.x - team.pos.x;
    const dy = other.pos.y - team.pos.y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = other;
    }
  }
  return best;
}

function sectorAngle(origin: Vec, point: Vec): number {
  return Math.atan2(point.x - origin.x, point.y - origin.y);
}
