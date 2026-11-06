import {
  DEEP_PULL_REACH,
  HALF_PULL_REACH,
  INITIAL_RADIUS,
  MAP_SIZE,
  NORMAL_PULL_REACH,
  PULL_ODDS,
  ZONE_TABLE,
} from "./constants";
import { clamp, polar, sampleDisc } from "./geometry";
import type { Rng } from "./rng";
import type { Circle, PhaseName, PullType, Vec, ZonePhase } from "./types";

type PlacedZone = { center: Vec; pull: PullType };

export function placeNextZone(rng: Rng, parent: Circle, radius: number, isMoving: boolean): PlacedZone {
  const pull = rollPull(rng, isMoving);
  const center = pullCenter(rng, parent, radius, pull);
  return {
    center: {
      x: clamp(center.x, radius, MAP_SIZE - radius),
      y: clamp(center.y, radius, MAP_SIZE - radius),
    },
    pull,
  };
}

function rollPull(rng: Rng, isMoving: boolean): PullType {
  const odds = isMoving ? PULL_ODDS.moving : PULL_ODDS.still;
  const roll = rng.next();
  if (roll < odds.normal) return "normal";
  if (roll < odds.normal + odds.deep) return "deep";
  return "half";
}

function pullCenter(rng: Rng, parent: Circle, radius: number, pull: PullType): Vec {
  const inside = Math.max(0, parent.radius - radius);
  if (pull === "normal") return sampleDisc(rng, parent.center, inside * NORMAL_PULL_REACH);
  const distance =
    pull === "deep" ? inside * rng.range(...DEEP_PULL_REACH) : parent.radius * rng.range(...HALF_PULL_REACH);
  const theta = rng.range(0, Math.PI * 2);
  return polar(parent.center, theta, distance);
}

export function generateZones(rng: Rng): ZonePhase[] {
  let previous: Circle = {
    center: { x: MAP_SIZE / 2, y: MAP_SIZE / 2 },
    radius: INITIAL_RADIUS,
  };

  return ZONE_TABLE.map((row, index) => {
    const placed = placeNextZone(rng, previous, row.radius, row.isMoving);
    const phase: ZonePhase = {
      index: index + 1,
      from: previous,
      to: { center: placed.center, radius: row.radius },
      pull: placed.pull,
      waitSec: row.waitSec,
      shrinkSec: row.shrinkSec,
      isMoving: row.isMoving,
      surgeActive: row.surgeActive,
      stormDps: row.stormDps,
    };
    previous = phase.to;
    return phase;
  });
}

const ENDGAME_FROM = ZONE_TABLE.findIndex((row) => row.isMoving) + 1;

export function phaseLabel(zone: ZonePhase): PhaseName {
  if (zone.index >= ENDGAME_FROM) return "Endgame";
  if (zone.index <= 2) return "Early";
  return "Mid";
}

export function phaseSeed(gameSeed: number, phaseIndex: number): number {
  return gameSeed + phaseIndex * 997;
}

export function zoneAt(zones: readonly ZonePhase[], index: number): ZonePhase {
  const zone = zones[index];
  if (!zone) throw new Error(`Zone ${index + 1} does not exist`);
  return zone;
}
