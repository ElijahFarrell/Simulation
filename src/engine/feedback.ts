import { SECTOR_COUNT, sectorName } from "./constants";
import { angleDiff, angleFromNorthCW, dist, sectorIndex } from "./geometry";
import type {
  Circle,
  Decision,
  FeedbackLine,
  FightOutcome,
  SectorInfo,
  Vec,
  ZonePhase,
} from "./types";

export type FeedbackContext = {
  zone: ZonePhase;
  decision: Decision;
  stormDamage: number;
  exposure: number;
  surgeHit: boolean;
  side: DestinationSide;
  endPos: Vec;
  nextCenter: Vec | null;
  mats: number;
  thirdPartied: boolean;
  outcome: FightOutcome;
};

type Rule = (ctx: FeedbackContext) => FeedbackLine | null;

const PULL_AWAY_RADIANS = 2.1;
const TONE_RANK = { bad: 0, warn: 1, good: 2 } as const;

export const RULE_LESSONS: Record<string, string> = {
  "storm-heavy": "You keep getting caught in the storm. Leave sooner, or walk on the side closest to the new circle.",
  "moving-late": "When the zone moves, don't wait. Leave while it's still calm.",
  "half-late": "On a half and half zone, half the new circle starts in the storm. Leave early or you walk through storm.",
  "fight-loss": "You lost the fight. Before you fight, check: do you have more players and more mats?",
  "surge-miss": "Surge hit you. When lots of teams are alive, hit someone before you hide.",
  "third-party": "Fights near lots of teams never stay 1 vs 1. Another team jumps in and finishes the winner.",
  "exposure-high": "Too many teams could shoot you. Stand near an edge so enemies can only come from one side.",
  "dead-side-lost": "A quiet side is a bet. If the next zone moves away from you, leave right away.",
  "stacked-avoid": "You walked into the crowded side but didn't want to fight. That's all risk and no reward.",
  "low-mats": "Big fights use lots of mats. When you're low, hit someone and leave instead.",
  "surge-passive": "Hiding from everyone during surge only works when few teams are left.",
  "center-exposed": "The middle is close to every next zone, but every team can see you there.",
  "pull-came": "The next zone came to your side. That's when holding a quiet side pays off.",
  "storm-clean": "No storm damage. Keep treating the storm like lava you never touch.",
  "pre-rotate": "Leaving early on a moving zone keeps you ahead of the storm.",
  "deep-early": "When the zone pulls far away, leave right away. Being first beats being fast.",
  "surge-tag": "Your hit-and-leave did the job. You don't need a full fight to beat surge.",
  "exposure-low": "Only a few teams could reach you. That's a safe spot.",
  "fight-win": "You won a fight you picked. Take those when no other team is close.",
  "late-paid": "Leaving late works when the path is empty and you need mats.",
  "dead-side-quiet": "Quiet side, and you didn't start a fight. That's the whole point of it.",
  steady: "Nothing big went wrong. Keep paying attention to the zones that matter.",
};

export function buildFeedback(ctx: FeedbackContext): FeedbackLine[] {
  const lines = RULES.map((rule) => rule(ctx)).filter((line): line is FeedbackLine => line !== null);
  lines.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
  if (lines.length === 0) {
    return [{ tone: "good", ruleId: "steady", text: "Quiet zone. Nothing big went wrong." }];
  }
  return lines.slice(0, 4);
}

const RULES: Rule[] = [
  stormHeavy,
  movingLate,
  halfLate,
  fightLoss,
  surgeMiss,
  thirdParty,
  exposureHigh,
  deadSideLost,
  stackedAvoid,
  lowMats,
  surgePassive,
  centerExposed,
  pullCame,
  stormClean,
  preRotate,
  deepEarly,
  surgeTag,
  exposureLow,
  fightWin,
  latePaid,
  deadSideQuiet,
];

function stormHeavy(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.stormDamage < 70) return null;
  const rounded = Math.round(ctx.stormDamage);
  return {
    tone: "bad",
    ruleId: "storm-heavy",
    text: `The storm hit you for ${rounded}. Only leave late if the path is clear and you really need mats.`,
  };
}

function movingLate(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.zone.isMoving || ctx.decision.timing !== "late" || ctx.stormDamage < 40) return null;
  return {
    tone: "bad",
    ruleId: "moving-late",
    text: "This zone moves. If you leave late, it runs away from you and the storm catches you.",
  };
}

function halfLate(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.zone.pull !== "half" || ctx.decision.timing !== "late" || ctx.stormDamage < 25) return null;
  return {
    tone: "bad",
    ruleId: "half-late",
    text: "Half and half zone: half the new circle started in the storm. Leaving late made you walk through it.",
  };
}

function fightLoss(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.outcome !== "loss") return null;
  return {
    tone: "bad",
    ruleId: "fight-loss",
    text: "You lost the fight. If it's an even fight, hitting them and leaving is safer.",
  };
}

function surgeMiss(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.surgeHit) return null;
  return {
    tone: "bad",
    ruleId: "surge-miss",
    text: "Surge was on and your team did too little damage. You needed to hit someone, not hide.",
  };
}

function thirdParty(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.thirdPartied) return null;
  return {
    tone: "bad",
    ruleId: "third-party",
    text: "Another team jumped into your fight. On a crowded side, fights never stay 1 vs 1.",
  };
}

function exposureHigh(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.exposure < 5) return null;
  return {
    tone: "bad",
    ruleId: "exposure-high",
    text: `Teams could shoot you from ${ctx.exposure} directions. Spots deep in the middle get surrounded.`,
  };
}

function deadSideLost(ctx: FeedbackContext): FeedbackLine | null {
  const delta = edgePullDelta(ctx);
  if (delta === null || delta < PULL_AWAY_RADIANS) return null;
  if (ctx.side.sector?.label === "stacked") return null;
  const side = ctx.side.sector ? sectorName(ctx.side.sector.index) : "edge";
  return {
    tone: "warn",
    ruleId: "dead-side-lost",
    text: `You sat on the ${side} side and the next zone moved away. Now everyone on that side has to run at the same time.`,
  };
}

function stackedAvoid(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.side.sector?.label !== "stacked" || ctx.decision.engagement !== "avoid") return null;
  return {
    tone: "warn",
    ruleId: "stacked-avoid",
    text: "That side was crowded. Walking in without wanting a fight is all risk and no reward.",
  };
}

function lowMats(ctx: FeedbackContext): FeedbackLine | null {
  const fighting = ctx.decision.engagement === "fight" || ctx.outcome === "forced";
  if (!fighting || ctx.mats >= 220) return null;
  return {
    tone: "warn",
    ruleId: "low-mats",
    text: "You fought with low mats. Hitting someone and leaving costs less and still counts for surge.",
  };
}

function surgePassive(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.zone.surgeActive || ctx.surgeHit || ctx.decision.engagement !== "avoid") return null;
  return {
    tone: "warn",
    ruleId: "surge-passive",
    text: "Surge was on and you stayed away from everyone. That only works when few teams are left.",
  };
}

function centerExposed(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.side.heldCenter || ctx.exposure < 4) return null;
  return {
    tone: "warn",
    ruleId: "center-exposed",
    text: "The middle keeps your next walk short, but teams could see you from lots of sides. Only take it when teams are spread out.",
  };
}

function pullCame(ctx: FeedbackContext): FeedbackLine | null {
  const delta = edgePullDelta(ctx);
  if (delta === null || delta > 0.7) return null;
  return {
    tone: "good",
    ruleId: "pull-came",
    text: "The next zone came toward your side, so your next walk is short.",
  };
}

function stormClean(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.stormDamage > 0 || ctx.outcome === "loss") return null;
  return {
    tone: "good",
    ruleId: "storm-clean",
    text: "No storm damage. You got in on your own time.",
  };
}

function preRotate(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.zone.isMoving || ctx.decision.timing !== "early" || ctx.stormDamage >= 25) return null;
  return {
    tone: "good",
    ruleId: "pre-rotate",
    text: "You left early on a moving zone, while the old circle was still safe.",
  };
}

function deepEarly(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.zone.pull === "normal" || ctx.decision.timing !== "early" || ctx.stormDamage >= 25) return null;
  return {
    tone: "good",
    ruleId: "deep-early",
    text: "The zone pulled far and you left right away. That's how you beat a deep pull.",
  };
}

function surgeTag(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.zone.surgeActive || ctx.surgeHit || ctx.outcome !== "tag") return null;
  return {
    tone: "good",
    ruleId: "surge-tag",
    text: "Hitting that team kept you safe from surge. That's exactly what a tag is for.",
  };
}

function exposureLow(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.exposure > 2) return null;
  if (ctx.exposure === 0) {
    return {
      tone: "good",
      ruleId: "exposure-low",
      text: "No team could reach that spot. Nice and quiet.",
    };
  }
  const noun = ctx.exposure === 1 ? "direction" : "directions";
  return {
    tone: "good",
    ruleId: "exposure-low",
    text: `Teams could only hit you from ${ctx.exposure} ${noun}. Safe spot.`,
  };
}

function fightWin(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.outcome !== "win" || ctx.thirdPartied) return null;
  return {
    tone: "good",
    ruleId: "fight-win",
    text: "You won the fight and got damage for surge. Take fights like this when no other team is close.",
  };
}

function latePaid(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.decision.timing !== "late" || ctx.stormDamage >= 25) return null;
  return {
    tone: "good",
    ruleId: "late-paid",
    text: "Leaving late worked. You got mats and still beat the storm.",
  };
}

function deadSideQuiet(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.side.sector?.label !== "dead") return null;
  if (ctx.decision.engagement !== "avoid") return null;
  if (ctx.outcome !== "none" && ctx.outcome !== "escaped") return null;
  const delta = edgePullDelta(ctx);
  if (delta !== null && delta >= PULL_AWAY_RADIANS) return null;
  return {
    tone: "good",
    ruleId: "dead-side-quiet",
    text: "You took the quiet side and didn't start a fight. Use the calm to heal up, then watch where the next zone goes.",
  };
}

function edgePullDelta(ctx: FeedbackContext): number | null {
  if (!ctx.nextCenter) return null;
  if (dist(ctx.nextCenter, ctx.zone.to.center) < 12) return null;
  if (dist(ctx.endPos, ctx.zone.to.center) < ctx.zone.to.radius * 0.55) return null;
  const held = angleFromNorthCW(ctx.zone.to.center, ctx.endPos);
  const pull = angleFromNorthCW(ctx.zone.to.center, ctx.nextCenter);
  return angleDiff(held, pull);
}

export type DestinationSide = { heldCenter: boolean; sector: SectorInfo | null };

export function destinationSide(destination: Vec, zone: Circle, sectors: readonly SectorInfo[]): DestinationSide {
  if (dist(destination, zone.center) < zone.radius * 0.32) return { heldCenter: true, sector: null };
  return { heldCenter: false, sector: sectors[sectorIndex(zone.center, destination, SECTOR_COUNT)] ?? null };
}

export function describeCall(call: Pick<Decision, "timing" | "engagement">, side: DestinationSide): string {
  const when = { early: "Go right away", standard: "Wait a bit, then go", late: "Loot first, then go" }[call.timing];
  const how = { avoid: "stay away from teams", tag: "hit a team and leave", fight: "go all in on a fight" }[call.engagement];
  const where = side.heldCenter ? "to the middle" : side.sector ? `to the ${sectorName(side.sector.index)} side` : "to your pin";
  return `${when} ${where}, ${how}.`;
}
