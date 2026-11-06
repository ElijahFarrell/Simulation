import { ROTATE_SPEED, SIM_TICK_SEC } from "./constants";
import { clamp, lerp, lerpVec, moveToward, pointInCircle } from "./geometry";
import type { Circle, Timing, Vec, ZonePhase } from "./types";

export type PathSim = {
  end: Vec;
  stormDamage: number;
  samples: Vec[];
};

export function departDelay(timing: Timing, zone: ZonePhase): number {
  if (timing === "early") return 0;
  if (timing === "standard") return zone.waitSec * 0.45;
  return zone.waitSec + zone.shrinkSec * 0.42;
}

export function positionAt(start: Vec, end: Vec, departSec: number, timeSec: number): Vec {
  const traveled = Math.max(0, timeSec - departSec) * ROTATE_SPEED;
  return moveToward(start, end, traveled);
}

export function circleAt(zone: ZonePhase, timeSec: number): Circle {
  if (timeSec <= zone.waitSec || zone.shrinkSec <= 0) return zone.from;
  const progress = clamp((timeSec - zone.waitSec) / zone.shrinkSec, 0, 1);
  return {
    center: lerpVec(zone.from.center, zone.to.center, progress),
    radius: lerp(zone.from.radius, zone.to.radius, progress),
  };
}

export function simulatePath(input: {
  start: Vec;
  dest: Vec;
  departSec: number;
  zone: ZonePhase;
}): PathSim {
  const total = input.zone.waitSec + input.zone.shrinkSec;
  const steps = Math.max(1, Math.ceil(total / SIM_TICK_SEC));
  const samples: Vec[] = [];
  let stormDamage = 0;

  for (let step = 0; step <= steps; step += 1) {
    const time = Math.min(total, step * SIM_TICK_SEC);
    const traveled = Math.max(0, time - input.departSec) * ROTATE_SPEED;
    const pos = moveToward(input.start, input.dest, traveled);
    samples.push(pos);
    if (step === steps) break;
    const dt = Math.min(SIM_TICK_SEC, total - time);
    const circle = circleAt(input.zone, time + dt / 2);
    if (!pointInCircle(pos, circle)) {
      stormDamage += input.zone.stormDps * dt;
    }
  }

  return {
    end: samples[samples.length - 1] ?? input.start,
    stormDamage,
    samples,
  };
}
