export type Vec = { x: number; y: number };

export type Circle = { center: Vec; radius: number };

export type ZonePhase = {
  index: number;
  from: Circle;
  to: Circle;
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

export type GameSettings = {
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
};

export type PhaseName = "Early" | "Mid" | "Endgame";

export type PhaseView = {
  zone: ZonePhase;
  phaseName: PhaseName;
  sectors: SectorInfo[];
  pull: Circle | null;
  followingRadius: number | null;
  teamsAlive: number;
  player: Team;
  heatmapSeed: number;
};
