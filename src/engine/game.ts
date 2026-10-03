import { sectorDensity, pullRegion } from "./analysis";
import { normalizeSettings, createLobby } from "./lobby";
import { createRng } from "./rng";
import { placementFor } from "./step";
import type { GameSettings, GameState, LandMask, PhaseView, Team } from "./types";
import { generateZones, phaseLabel, zoneAt } from "./zones";

export function createGame(
  seed: number,
  settings?: Partial<GameSettings>,
  land?: LandMask | null,
): GameState {
  const resolved = normalizeSettings(settings);
  const rng = createRng(seed);
  const zones = generateZones(rng);
  const first = zoneAt(zones, 0);
  const teams = createLobby(rng, first, resolved, land);
  return {
    seed: seed >>> 0,
    phaseIndex: 0,
    zones,
    teams,
    history: [],
    status: "deciding",
    rngState: rng.getState(),
    placement: null,
    settings: resolved,
    landMask: land ?? null,
  };
}

export function getPhaseView(state: GameState): PhaseView {
  const zone = zoneAt(state.zones, state.phaseIndex);
  const following = state.zones[state.phaseIndex + 1];
  return {
    zone,
    phaseName: phaseLabel(zone),
    sectors: sectorDensity(state.teams, zone.to),
    pull: pullRegion(zone, following),
    following: following ?? null,
    teamsAlive: state.teams.filter((team) => !team.eliminated).length,
    player: playerOf(state),
    heatmapSeed: (state.seed + state.phaseIndex * 997) >>> 0,
  };
}

export function advancePhase(state: GameState): GameState {
  if (state.status !== "resolved") return state;
  const nextIndex = state.phaseIndex + 1;
  if (nextIndex >= state.zones.length) {
    return { ...state, status: "won", placement: placementFor(state.teams) };
  }
  const player = state.teams.find((team) => team.isPlayer);
  if (!player || player.eliminated) {
    return { ...state, status: "dead", placement: placementFor(state.teams) };
  }
  return { ...state, phaseIndex: nextIndex, status: "deciding" };
}

function playerOf(state: GameState): Team {
  const player = state.teams.find((team) => team.isPlayer);
  if (!player) throw new Error("Player team is missing");
  return player;
}
