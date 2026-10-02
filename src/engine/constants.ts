import type { GameSettings } from "./types";

/**
 * Teaching approximations, not Epic's live zone table. Every number that
 * changes how a call feels lives here so it can be tuned without hunting.
 */
export const MAP_SIZE = 1000;
export const INITIAL_RADIUS = 500;
export const TEAM_COUNT = 30;
export const ROTATE_SPEED = 5.5;
export const SIM_TICK_SEC = 1;
export const SECTOR_COUNT = 8;
export const CONTACT_RADIUS = 42;
export const THIRD_PARTY_RADIUS = 96;
export const EXPOSURE_RADIUS = 170;
export const MC_SAMPLES = 160;
export const MAX_MATS = 1000;
export const START_MATS = 480;
export const START_HEALS = 140;
export const START_HP = 300;
export const HP_PER_ALIVE = 100;
export const LATE_REFRESH_MATS = 280;
export const STANDARD_REFRESH_MATS = 90;
export const LATE_REFRESH_HEALS = 30;
export const STORM_DAMAGE_CAP = 110;
export const AVOID_ESCAPE_CHANCE = 0.72;
export const AI_FIGHT_CHANCE = 0.55;
export const SURGE_HIT_FRACTION = 0.3;
export const SURGE_BASE_DAMAGE = 100;
export const DEAD_MAX = 1;
export const STACKED_MIN = 3;
export const TAG_DAMAGE = 220;

export const DEFAULT_SETTINGS: GameSettings = {
  teamCount: TEAM_COUNT,
  fighterWeight: 0.2,
};

export const SCORE_WEIGHTS = {
  storm: 0.22,
  contact: 0.24,
  exposure: 0.2,
  surge: 0.16,
  positioning: 0.18,
} as const;

export type ScorePart = keyof typeof SCORE_WEIGHTS;
export type CallPart = "where" | "when" | "contact";

export const CALL_PARTS: Record<CallPart, { label: string; scores: readonly ScorePart[] }> = {
  where: { label: "Where you hold", scores: ["exposure", "positioning"] },
  when: { label: "When you leave", scores: ["storm"] },
  contact: { label: "On contact", scores: ["contact", "surge"] },
};

export type ZoneRow = {
  radius: number;
  waitSec: number;
  shrinkSec: number;
  isMoving: boolean;
  surgeActive: boolean;
  stormDps: number;
};

export const ZONE_TABLE: readonly ZoneRow[] = [
  { radius: 450, waitSec: 55, shrinkSec: 80, isMoving: false, surgeActive: false, stormDps: 1 },
  { radius: 300, waitSec: 50, shrinkSec: 70, isMoving: false, surgeActive: false, stormDps: 1 },
  { radius: 200, waitSec: 45, shrinkSec: 60, isMoving: false, surgeActive: true, stormDps: 2 },
  { radius: 130, waitSec: 40, shrinkSec: 50, isMoving: false, surgeActive: true, stormDps: 5 },
  { radius: 85, waitSec: 35, shrinkSec: 45, isMoving: false, surgeActive: true, stormDps: 8 },
  { radius: 55, waitSec: 28, shrinkSec: 40, isMoving: true, surgeActive: true, stormDps: 10 },
  { radius: 35, waitSec: 20, shrinkSec: 35, isMoving: true, surgeActive: false, stormDps: 10 },
  { radius: 20, waitSec: 15, shrinkSec: 30, isMoving: true, surgeActive: false, stormDps: 10 },
  { radius: 8, waitSec: 10, shrinkSec: 24, isMoving: true, surgeActive: false, stormDps: 10 },
];

/** Alive-team count above which surge damage actually fires, per zone index. */
export const SURGE_TEAM_THRESHOLD: readonly number[] = [
  99, 99, 16, 12, 9, 7, 99, 99, 99,
];

export function surgeThreshold(zoneIndex: number): number {
  return SURGE_TEAM_THRESHOLD[zoneIndex - 1] ?? 99;
}

export const SECTOR_NAMES = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
] as const;

export function sectorName(index: number): string {
  return SECTOR_NAMES[index] ?? "edge";
}
