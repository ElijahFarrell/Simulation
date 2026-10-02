import type { GameSettings, PullType } from "./types";

/**
 * Teaching approximations, not Epic's live zone table. Every number that
 * changes how a call feels lives here so it can be tuned without hunting.
 */
export const MAP_SIZE = 1000;
export const INITIAL_RADIUS = 500;
/** A full trios lobby: 99 players. */
export const MAX_TEAMS = 33;
export const MIN_TEAMS = 16;
export const TEAM_COUNT = MAX_TEAMS;
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
  where: { label: "Where you go", scores: ["exposure", "positioning"] },
  when: { label: "When you leave", scores: ["storm"] },
  contact: { label: "If you meet a team", scores: ["contact", "surge"] },
};

export type ZoneRow = {
  radius: number;
  waitSec: number;
  shrinkSec: number;
  isMoving: boolean;
  surgeActive: boolean;
  stormDps: number;
};

/**
 * Shaped like the live Battle Royale storm: 12 zones, 1-6 shrink in place,
 * 7-11 move and can leave the old circle, 12 closes. Radii and timings are
 * scaled to this map, and the last zones keep a short wait so timing still
 * matters.
 */
export const ZONE_TABLE: readonly ZoneRow[] = [
  { radius: 450, waitSec: 55, shrinkSec: 80, isMoving: false, surgeActive: false, stormDps: 1 },
  { radius: 340, waitSec: 50, shrinkSec: 70, isMoving: false, surgeActive: false, stormDps: 1 },
  { radius: 250, waitSec: 45, shrinkSec: 65, isMoving: false, surgeActive: true, stormDps: 1 },
  { radius: 185, waitSec: 40, shrinkSec: 55, isMoving: false, surgeActive: true, stormDps: 2 },
  { radius: 130, waitSec: 35, shrinkSec: 50, isMoving: false, surgeActive: true, stormDps: 2 },
  { radius: 85, waitSec: 30, shrinkSec: 45, isMoving: false, surgeActive: true, stormDps: 3 },
  { radius: 55, waitSec: 26, shrinkSec: 40, isMoving: true, surgeActive: true, stormDps: 5 },
  { radius: 38, waitSec: 20, shrinkSec: 35, isMoving: true, surgeActive: true, stormDps: 8 },
  { radius: 25, waitSec: 14, shrinkSec: 32, isMoving: true, surgeActive: false, stormDps: 10 },
  { radius: 16, waitSec: 8, shrinkSec: 28, isMoving: true, surgeActive: false, stormDps: 10 },
  { radius: 10, waitSec: 6, shrinkSec: 26, isMoving: true, surgeActive: false, stormDps: 10 },
  { radius: 4, waitSec: 4, shrinkSec: 30, isMoving: false, surgeActive: false, stormDps: 10 },
];

/** Alive-team count above which surge damage actually fires, per zone index. */
export const SURGE_TEAM_THRESHOLD: readonly number[] = [
  99, 99, 18, 15, 12, 10, 8, 6, 99, 99, 99, 99,
];

/**
 * How the next circle lands. Normal stays near the middle of the old one,
 * deep hugs its far edge, and half sits on the old edge so about half of the
 * new circle starts in the storm. Only moving zones can go half and half.
 */
export const PULL_ODDS = {
  still: { normal: 0.6, deep: 0.4, half: 0 },
  moving: { normal: 0, deep: 0.4, half: 0.6 },
} as const;
export const NORMAL_PULL_REACH = 0.7;
export const DEEP_PULL_REACH = [0.85, 1] as const;
export const HALF_PULL_REACH = [0.9, 1.05] as const;

export const PULL_COPY: Record<PullType, { name: string; line: string }> = {
  normal: {
    name: "Normal pull",
    line: "The new circle stays near the middle of the old one.",
  },
  deep: {
    name: "Deep pull",
    line: "The new circle is at the far edge. Leave early so you are not last.",
  },
  half: {
    name: "Half and half",
    line: "Half the new circle starts in the storm. Get to the safe half first.",
  },
};

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
