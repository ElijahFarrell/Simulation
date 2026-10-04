import {
  DEFAULT_SETTINGS,
  GAME_MODES,
  HOT_DROPS,
  HP_PER_ALIVE,
  MAP_SIZE,
  STACKED_JITTER,
  STACKED_SHARE,
  START_HEALS,
  START_MATS,
} from "./constants";
import { clampToMap, pointInCircle, sampleDisc } from "./geometry";
import { isLandPoint, stayOnLand } from "./land";
import type { Rng } from "./rng";
import type { Archetype, Circle, GameSettings, LandMask, Team, Vec, ZonePhase } from "./types";

const ARCHETYPE_SPREAD = { edge: 0.35, deep: 0.25, passive: 0.2 } as const;

export function normalizeSettings(settings?: Partial<GameSettings>): GameSettings {
  const mode = settings?.mode === "solos" ? "solos" : "trios";
  const rules = GAME_MODES[mode];
  const teamCount = Math.round(settings?.teamCount ?? rules.teamCount);
  const fighterWeight = settings?.fighterWeight ?? DEFAULT_SETTINGS.fighterWeight;
  return {
    mode,
    squadSize: rules.squadSize,
    teamCount: Math.min(rules.maxTeams, Math.max(rules.minTeams, teamCount)),
    fighterWeight: Math.min(0.6, Math.max(0, fighterWeight)),
    dropStyle: settings?.dropStyle === "stacked" ? "stacked" : "opens",
  };
}

export function createLobby(
  rng: Rng,
  firstZone: ZonePhase,
  settings?: Partial<GameSettings>,
  land?: LandMask | null,
  places?: readonly Vec[],
): Team[] {
  const resolved = normalizeSettings(settings);
  const anchors = Array.from({ length: 8 }, () =>
    sampleDisc(rng, firstZone.to.center, firstZone.to.radius * 0.8),
  );
  const hot = resolved.dropStyle === "stacked" ? hotDrops(rng, firstZone, land, places ?? []) : [];

  const teams = Array.from({ length: resolved.teamCount }, (_, index) => {
    const anchor = rng.pick(anchors);
    const pos = land
      ? placeOnLand(rng, firstZone.from, land, hot)
      : placeInCircle(rng, anchor, hot);
    return makeTeam(index, pos, rollArchetype(rng, resolved.fighterWeight), resolved.squadSize);
  });

  const player = teams[0];
  if (!player) throw new Error("Lobby was empty");
  player.isPlayer = true;
  player.id = "you";
  if (!land) {
    const angle = rng.range(0, Math.PI * 2);
    player.pos = {
      x: firstZone.to.center.x + Math.cos(angle) * firstZone.to.radius * 0.78,
      y: firstZone.to.center.y + Math.sin(angle) * firstZone.to.radius * 0.78,
    };
  }
  return teams;
}

function hotDrops(
  rng: Rng,
  zone: ZonePhase,
  land: LandMask | null | undefined,
  places: readonly Vec[],
): Vec[] {
  const picked: Vec[] = [];
  const bag = places.filter(
    (place) => (!land || isLandPoint(land, place)) && pointInCircle(place, zone.from),
  );
  while (picked.length < HOT_DROPS && bag.length > 0) {
    const index = Math.floor(rng.next() * bag.length);
    const spot = bag.splice(index, 1)[0];
    if (spot) picked.push(spot);
  }
  while (picked.length < HOT_DROPS) {
    picked.push(
      land
        ? dropOnLand(rng, zone.from, land)
        : sampleDisc(rng, zone.to.center, zone.to.radius * 0.75),
    );
  }
  return picked;
}

function placeOnLand(rng: Rng, circle: Circle, land: LandMask, hot: readonly Vec[]): Vec {
  if (hot.length > 0 && rng.chance(STACKED_SHARE)) {
    return jitterAround(rng, rng.pick(hot), land, circle);
  }
  return dropOnLand(rng, circle, land);
}

function placeInCircle(rng: Rng, anchor: Vec, hot: readonly Vec[]): Vec {
  if (hot.length > 0 && rng.chance(STACKED_SHARE)) {
    return jitterAround(rng, rng.pick(hot));
  }
  return clampToMap({
    x: anchor.x + rng.range(-70, 70),
    y: anchor.y + rng.range(-70, 70),
  });
}

function jitterAround(rng: Rng, spot: Vec, land?: LandMask, circle?: Circle): Vec {
  const angle = rng.range(0, Math.PI * 2);
  const reach = rng.range(0, STACKED_JITTER);
  const point = clampToMap({
    x: spot.x + Math.cos(angle) * reach,
    y: spot.y + Math.sin(angle) * reach,
  });
  return land && circle ? stayOnLand(land, point, circle) : point;
}

function dropOnLand(rng: Rng, circle: Circle, land: LandMask): Vec {
  const step = MAP_SIZE / land.grid;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const angle = rng.range(0, Math.PI * 2);
    let coast = -1;
    for (let radius = circle.radius; radius >= 0; radius -= step) {
      const probe = {
        x: circle.center.x + Math.cos(angle) * radius,
        y: circle.center.y + Math.sin(angle) * radius,
      };
      if (isLandPoint(land, probe)) {
        coast = radius;
        break;
      }
    }
    if (coast < 0) continue;
    const reach = coast * rng.range(0.45, 0.92);
    const point = clampToMap({
      x: circle.center.x + Math.cos(angle) * reach,
      y: circle.center.y + Math.sin(angle) * reach,
    });
    if (isLandPoint(land, point)) return point;
    const fixed = stayOnLand(land, point, circle);
    if (isLandPoint(land, fixed)) return fixed;
  }
  return stayOnLand(land, circle.center, circle);
}

function makeTeam(index: number, pos: Team["pos"], archetype: Archetype, squadSize: number): Team {
  return {
    id: `t${index}`,
    isPlayer: false,
    archetype,
    pos,
    alive: squadSize,
    hp: squadSize * HP_PER_ALIVE,
    mats: START_MATS,
    heals: START_HEALS,
    damageThisPhase: 0,
    eliminated: false,
    squadSize,
  };
}

export function rollArchetype(rng: Rng, fighterWeight: number): Archetype {
  const rest = 1 - fighterWeight;
  const edge = rest * (ARCHETYPE_SPREAD.edge / 0.8);
  const deep = rest * (ARCHETYPE_SPREAD.deep / 0.8);
  const roll = rng.next();
  if (roll < edge) return "edge";
  if (roll < edge + deep) return "deep";
  if (roll < edge + deep + fighterWeight) return "fighter";
  return "passive";
}
