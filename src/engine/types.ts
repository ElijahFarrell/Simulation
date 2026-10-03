export type Vec = { x: number; y: number };

export type Circle = { center: Vec; radius: number };

export type PullType = "normal" | "deep" | "half";

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

export type Timing = "early" | "standard" | "late";

export type Engagement = "avoid" | "tag" | "fight";

export type Decision = {
  destination: Vec;
  timing: Timing;
  engagement: Engagement;
};

export type SectorLabel = "dead" | "normal" | "stacked";

export type SectorInfo = {
  index: number;
  teamCount: number;
  label: SectorLabel;
};

export type ScoreBreakdown = {
  storm: number;
  contact: number;
  exposure: number;
  surge: number;
  positioning: number;
  total: number;
};

export type FeedbackTone = "good" | "warn" | "bad";

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

export type GameStatus = "deciding" | "resolved" | "dead" | "won";

/** Coarse land/water sample. 1 means land. Rows run from the top of the image. */
export type LandMask = {
  grid: number;
  cells: Uint8Array;
};

export type GameMode = "trios" | "solos";

export type GameSettings = {
  mode: GameMode;
  squadSize: number;
  teamCount: number;
  fighterWeight: number;
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
