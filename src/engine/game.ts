import { sectorDensity, pullRegion } from "./analysis";
import { normalizeSettings, createLobby } from "./lobby";
import { createRng } from "./rng";
import { aliveCount, playerOf } from "./teams";
import type { GameSettings, GameState, LandMask, PhaseView, Vec } from "./types";
import { generateZones, phaseLabel, phaseSeed, zoneAt } from "./zones";

export function createGame(
  seed: number,
  settings?: Partial<GameSettings>,
  land?: LandMask | null,
  places?: readonly Vec[],
): GameState {
  const resolved = normalizeSettings(settings);
  const rng = createRng(seed);
  const zones = generateZones(rng);
  const first = zoneAt(zones, 0);
  const teams = createLobby(rng, first, resolved, land, places);
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
    teamsAlive: aliveCount(state.teams),
    player: playerOf(state.teams),
    heatmapSeed: phaseSeed(state.seed, state.phaseIndex) >>> 0,
  };
}

export function advancePhase(state: GameState): GameState {
  if (state.status !== "resolved") return state;
  return { ...state, phaseIndex: state.phaseIndex + 1, status: "deciding" };
}

export function isGameOver(state: GameState): boolean {
  return state.status === "dead" || state.status === "won";
}

export function finishKey(state: GameState): string {
  return `${state.seed}:${state.history.length}:${state.status}`;
}
