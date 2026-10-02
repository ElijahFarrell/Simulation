import {
  DEFAULT_SETTINGS,
  START_HEALS,
  START_HP,
  START_MATS,
} from "./constants";
import { clampToMap, sampleDisc } from "./geometry";
import type { Rng } from "./rng";
import type { Archetype, GameSettings, Team, ZonePhase } from "./types";

const ARCHETYPE_SPREAD = { edge: 0.35, deep: 0.25, passive: 0.2 } as const;

export function normalizeSettings(settings?: Partial<GameSettings>): GameSettings {
  const teamCount = Math.round(settings?.teamCount ?? DEFAULT_SETTINGS.teamCount);
  const fighterWeight = settings?.fighterWeight ?? DEFAULT_SETTINGS.fighterWeight;
  return {
    teamCount: Math.min(45, Math.max(12, teamCount)),
    fighterWeight: Math.min(0.6, Math.max(0, fighterWeight)),
  };
}

export function createLobby(
  rng: Rng,
  firstZone: ZonePhase,
  settings: GameSettings,
): Team[] {
  const anchors = Array.from({ length: 8 }, () =>
    sampleDisc(rng, firstZone.to.center, firstZone.to.radius * 0.8),
  );

  const teams = Array.from({ length: settings.teamCount }, (_, index) => {
    const anchor = rng.pick(anchors);
    const pos = clampToMap({
      x: anchor.x + rng.range(-70, 70),
      y: anchor.y + rng.range(-70, 70),
    });
    return makeTeam(index, pos, rollArchetype(rng, settings.fighterWeight));
  });

  const player = teams[0];
  if (!player) throw new Error("Lobby was empty");
  const angle = rng.range(0, Math.PI * 2);
  player.isPlayer = true;
  player.id = "you";
  player.pos = {
    x: firstZone.to.center.x + Math.cos(angle) * firstZone.to.radius * 0.78,
    y: firstZone.to.center.y + Math.sin(angle) * firstZone.to.radius * 0.78,
  };
  return teams;
}

function makeTeam(index: number, pos: Team["pos"], archetype: Archetype): Team {
  return {
    id: `t${index}`,
    isPlayer: false,
    archetype,
    pos,
    alive: 3,
    hp: START_HP,
    mats: START_MATS,
    heals: START_HEALS,
    damageThisPhase: 0,
    eliminated: false,
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
