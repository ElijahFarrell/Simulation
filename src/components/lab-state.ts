import { DEFAULT_SETTINGS } from "@/engine/constants";
import { advancePhase, createGame } from "@/engine/game";
import { resolveDecision } from "@/engine/step";
import type { Engagement, GameState, PullType, Team, Timing, Vec } from "@/engine/types";

export type Overlays = {
  density: boolean;
  pull: boolean;
  heatmap: boolean;
};

export type LabSettings = {
  teamCount: number;
  fighterWeight: number;
  hints: boolean;
};

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
};

export type LabAction =
  | { type: "start"; seed: number; scenarioId: string | null }
  | { type: "restart" }
  | { type: "menu" }
  | { type: "destination"; destination: Vec }
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
    case "restart":
      return state.game ? begin(state, state.game.seed, state.scenarioId) : state;
    case "menu":
      return { ...state, screen: "menu", game: null, animating: false, animFrom: null, scenarioId: null };
    case "destination":
      if (!state.game || state.game.status !== "deciding" || state.animating) return state;
      return { ...state, destination: action.destination };
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
    default:
      return state;
  }
}

function begin(state: LabState, seed: number, scenarioId: string | null): LabState {
  return {
    ...state,
    screen: "play",
    scenarioId,
    runId: state.runId + 1,
    game: createGame(seed, state.settings),
    destination: null,
    timing: "standard",
    engagement: "avoid",
    animating: false,
    animFrom: null,
    pullGuess: null,
  };
}

function lockCall(state: LabState): LabState {
  if (!state.game || state.game.status !== "deciding" || !state.destination || state.animating) {
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
