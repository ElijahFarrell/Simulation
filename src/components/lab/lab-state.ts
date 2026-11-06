import { DEFAULT_SETTINGS, MAX_ROUTE_STOPS } from "@/engine/constants";
import { advancePhase, createGame } from "@/engine/game";
import { dist } from "@/engine/geometry";
import { stayOnLand } from "@/engine/land";
import { resolveDecision } from "@/engine/step";
import type { Place } from "@/lib/island/project";
import type { Engagement, GameSettings, GameState, LandMask, PullType, Team, Timing, Vec } from "@/engine/types";

export type Overlays = {
  density: boolean;
  pull: boolean;
  heatmap: boolean;
};

export type LabSettings = GameSettings & { hints: boolean };

export type LabState = {
  screen: "menu" | "play";
  game: GameState | null;
  destination: Vec | null;
  timing: Timing;
  engagement: Engagement;
  overlays: Overlays;
  animating: boolean;
  animFrom: Team[] | null;
  settings: LabSettings;
  scenarioId: string | null;
  runId: number;
  pullGuess: PullType | null;
  land: LandMask | null;
  places: Place[];
  planning: boolean;
  route: Vec[];
};

export type LabAction =
  | { type: "start"; seed: number; scenarioId: string | null }
  | { type: "places"; places: Place[] }
  | { type: "land"; land: LandMask }
  | { type: "pick"; point: Vec }
  | { type: "drop-undo" }
  | { type: "drop-clear" }
  | { type: "drop-skip" }
  | { type: "drop-lock" }
  | { type: "restart" }
  | { type: "menu" }
  | { type: "timing"; timing: Timing }
  | { type: "engagement"; engagement: Engagement }
  | { type: "lock" }
  | { type: "anim-done" }
  | { type: "next" }
  | { type: "toggle"; key: keyof Overlays }
  | { type: "settings"; settings: LabSettings }
  | { type: "guess"; pull: PullType };

export const initialLabState: LabState = {
  screen: "menu",
  game: null,
  destination: null,
  timing: "standard",
  engagement: "avoid",
  overlays: { density: true, pull: true, heatmap: false },
  animating: false,
  animFrom: null,
  settings: { ...DEFAULT_SETTINGS, hints: true },
  scenarioId: null,
  runId: 0,
  pullGuess: null,
  land: null,
  places: [],
  planning: false,
  route: [],
};

export function labReducer(state: LabState, action: LabAction): LabState {
  switch (action.type) {
    case "settings":
      return { ...state, settings: action.settings };
    case "toggle":
      return {
        ...state,
        overlays: { ...state.overlays, [action.key]: !state.overlays[action.key] },
      };
    case "start":
      return begin(state, action.seed, action.scenarioId);
    case "places":
      return { ...state, places: action.places };
    case "land":
      return applyLand(state, action.land);
    case "pick":
      return state.planning ? addStop(state, action.point) : pickDestination(state, action.point);
    case "drop-undo":
      return state.planning ? { ...state, route: state.route.slice(0, -1) } : state;
    case "drop-clear":
      return state.planning ? { ...state, route: [] } : state;
    case "drop-skip":
      return state.planning ? { ...state, planning: false, route: [] } : state;
    case "drop-lock":
      return lockDrop(state);
    case "restart":
      return state.game ? begin(state, state.game.seed, state.scenarioId) : state;
    case "menu":
      return {
        ...state,
        screen: "menu",
        game: null,
        animating: false,
        animFrom: null,
        scenarioId: null,
        planning: false,
        route: [],
      };
    case "timing":
      return { ...state, timing: action.timing };
    case "engagement":
      return { ...state, engagement: action.engagement };
    case "lock":
      return lockCall(state);
    case "anim-done":
      return { ...state, animating: false, animFrom: null };
    case "guess":
      if (state.pullGuess || state.screen !== "play") return state;
      return { ...state, pullGuess: action.pull };
    case "next":
      return advance(state);
  }
}

function begin(state: LabState, seed: number, scenarioId: string | null): LabState {
  return {
    ...state,
    screen: "play",
    scenarioId,
    runId: state.runId + 1,
    game: createGame(seed, state.settings, state.land, state.places),
    destination: null,
    timing: "standard",
    engagement: "avoid",
    animating: false,
    animFrom: null,
    pullGuess: null,
    planning: true,
    route: [],
  };
}

function addStop(state: LabState, picked: Vec): LabState {
  const game = state.game;
  const zone = game?.zones[game.phaseIndex];
  if (!game || !zone || state.animating || state.route.length >= MAX_ROUTE_STOPS) return state;
  const point = stayOnLand(game.landMask, picked, zone.from);
  const last = state.route[state.route.length - 1];
  if (last && dist(last, point) < 12) return state;
  return { ...state, route: [...state.route, point] };
}

function pickDestination(state: LabState, point: Vec): LabState {
  if (!state.game || state.game.status !== "deciding" || state.animating) return state;
  return { ...state, destination: stayOnLand(state.game.landMask, point) };
}

function lockDrop(state: LabState): LabState {
  const game = state.game;
  const end = state.route[state.route.length - 1];
  if (!state.planning || !game || !end) return state;
  return {
    ...state,
    planning: false,
    game: {
      ...game,
      teams: game.teams.map((team) => (team.isPlayer ? { ...team, pos: end } : team)),
    },
  };
}

function applyLand(state: LabState, land: LandMask): LabState {
  const game = state.game;
  if (!game) return { ...state, land };
  if (game.landMask || state.animating || game.history.length > 0 || game.status !== "deciding") {
    return { ...state, land, game: { ...game, landMask: game.landMask ?? land } };
  }
  const zone = game.zones[game.phaseIndex];
  const route = zone ? state.route.map((point) => stayOnLand(land, point, zone.from)) : state.route;
  return {
    ...state,
    land,
    route,
    destination: state.destination ? stayOnLand(land, state.destination) : null,
    game: {
      ...game,
      landMask: land,
      teams: game.teams.map((team) => ({
        ...team,
        pos: zone ? stayOnLand(land, team.pos, zone.from) : team.pos,
      })),
    },
  };
}

function lockCall(state: LabState): LabState {
  if (!state.game || state.planning || state.game.status !== "deciding" || !state.destination || state.animating) {
    return state;
  }
  const animFrom = state.game.teams.map((team) => ({ ...team }));
  const game = resolveDecision(state.game, {
    destination: state.destination,
    timing: state.timing,
    engagement: state.engagement,
  });
  return { ...state, game, animating: true, animFrom };
}

function advance(state: LabState): LabState {
  if (!state.game || state.animating || state.game.status !== "resolved") return state;
  return {
    ...state,
    game: advancePhase(state.game),
    destination: null,
    animFrom: null,
    pullGuess: null,
  };
}
