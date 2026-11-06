import type { GAME_MODES, ScorePart } from "./constants";

export type Vec = { x: number; y: number };

export type Circle = { center: Vec; radius: number };

export const PULL_TYPES = ["normal", "deep", "half"] as const;
export type PullType = (typeof PULL_TYPES)[number];

export type ZonePhase = {
  index: number;
  from: Circle;
  to: Circle;
  pull: PullType;
  waitSec: number;
  shrinkSec: number;
  isMoving: boolean;
  surgeActive: boolean;
  stormDps: number;
};

export type Archetype = "edge" | "deep" | "fighter" | "passive";

export type Team = {
  id: string;
  isPlayer: boolean;
  archetype: Archetype;
  pos: Vec;
  alive: number;
  hp: number;
  mats: number;
  heals: number;
  damageThisPhase: number;
  eliminated: boolean;
  squadSize: number;
};

export const TIMINGS = ["early", "standard", "late"] as const;
export type Timing = (typeof TIMINGS)[number];

export const ENGAGEMENTS = ["avoid", "tag", "fight"] as const;
export type Engagement = (typeof ENGAGEMENTS)[number];

export type Decision = {
  destination: Vec;
  timing: Timing;
  engagement: Engagement;
};

export const SECTOR_LABELS = ["dead", "normal", "stacked"] as const;
export type SectorLabel = (typeof SECTOR_LABELS)[number];

export type SectorInfo = {
  index: number;
  teamCount: number;
  label: SectorLabel;
};

export type ScoreBreakdown = Record<ScorePart | "total", number>;

export const FEEDBACK_TONES = ["good", "warn", "bad"] as const;
export type FeedbackTone = (typeof FEEDBACK_TONES)[number];

export type FeedbackLine = {
  tone: FeedbackTone;
  ruleId: string;
  text: string;
};

export type FightOutcome =
  | "none"
  | "win"
  | "loss"
  | "tag"
  | "escaped"
  | "forced"
  | "whiff";

export type PhaseResult = {
  zone: ZonePhase;
  decision: Decision;
  score: ScoreBreakdown;
  feedback: FeedbackLine[];
  events: string[];
  sectors: SectorInfo[];
};

export const GAME_STATUSES = ["deciding", "resolved", "dead", "won"] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

/** Coarse land/water sample. 1 means land. Rows run from the top of the image. */
export type LandMask = {
  grid: number;
  cells: Uint8Array;
};

export type GameMode = keyof typeof GAME_MODES;

/** Opens scatter teams. Stacked piles most of them onto a few drops. */
export type DropStyle = "opens" | "stacked";

export type GameSettings = {
  mode: GameMode;
  teamCount: number;
  fighterWeight: number;
  dropStyle: DropStyle;
};

export type GameState = {
  seed: number;
  phaseIndex: number;
  zones: ZonePhase[];
  teams: Team[];
  history: PhaseResult[];
  status: GameStatus;
  rngState: number;
  placement: number | null;
  settings: GameSettings;
  landMask: LandMask | null;
};

export type PhaseName = "Early" | "Mid" | "Endgame";

export type PhaseView = {
  zone: ZonePhase;
  phaseName: PhaseName;
  sectors: SectorInfo[];
  pull: Circle | null;
  following: ZonePhase | null;
  teamsAlive: number;
  player: Team;
  heatmapSeed: number;
};
