import { INITIAL_RADIUS, MAP_SIZE, ZONE_TABLE } from "./constants";
import { clamp, sampleDisc } from "./geometry";
import type { Rng } from "./rng";
import type { Circle, PhaseName, Vec, ZonePhase } from "./types";

function clampCenter(center: Vec, radius: number, parent: Circle): Vec {
  const maxShift = Math.max(0, parent.radius - radius);
  let dx = center.x - parent.center.x;
  let dy = center.y - parent.center.y;
  const distance = Math.hypot(dx, dy);
  if (distance > maxShift && distance > 0) {
    dx *= maxShift / distance;
    dy *= maxShift / distance;
  }

  let x = parent.center.x + dx;
  let y = parent.center.y + dy;
  x = clamp(x, radius, MAP_SIZE - radius);
  y = clamp(y, radius, MAP_SIZE - radius);

  dx = x - parent.center.x;
  dy = y - parent.center.y;
  const pulled = Math.hypot(dx, dy);
  if (pulled > maxShift && pulled > 0) {
    dx *= maxShift / pulled;
    dy *= maxShift / pulled;
  }

  return { x: parent.center.x + dx, y: parent.center.y + dy };
}

export function generateZones(rng: Rng): ZonePhase[] {
  let previous: Circle = {
    center: { x: MAP_SIZE / 2, y: MAP_SIZE / 2 },
    radius: INITIAL_RADIUS,
  };

  return ZONE_TABLE.map((row, index) => {
    const maxShift = Math.max(0, previous.radius - row.radius);
    const nextCenter = row.isMoving
      ? movingCenter(rng, previous.center, maxShift)
      : sampleDisc(rng, previous.center, maxShift);
    const to: Circle = {
      center: clampCenter(nextCenter, row.radius, previous),
      radius: row.radius,
    };
    const phase: ZonePhase = {
      index: index + 1,
      from: previous,
      to,
      waitSec: row.waitSec,
      shrinkSec: row.shrinkSec,
      isMoving: row.isMoving,
      surgeActive: row.surgeActive,
      stormDps: row.stormDps,
    };
    previous = to;
    return phase;
  });
}

function movingCenter(rng: Rng, origin: Vec, maxShift: number): Vec {
  const shift = maxShift * rng.range(0.75, 1);
  const theta = rng.range(0, Math.PI * 2);
  return {
    x: origin.x + Math.cos(theta) * shift,
    y: origin.y + Math.sin(theta) * shift,
  };
}

export function phaseLabel(zone: ZonePhase): PhaseName {
  if (zone.isMoving) return "Endgame";
  if (zone.index <= 2) return "Early";
  return "Mid";
}

export function zoneAt(zones: readonly ZonePhase[], index: number): ZonePhase {
  const zone = zones[index];
  if (!zone) throw new Error(`Zone ${index + 1} does not exist`);
  return zone;
}
