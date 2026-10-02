import { sectorName } from "./constants";
import { angleDiff, angleFromNorthCW, dist } from "./geometry";
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
  surgeActive: boolean;
  surgeHit: boolean;
  destinationSector: SectorInfo | null;
  heldCenter: boolean;
  endPos: Vec;
  nextCenter: Vec | null;
  mats: number;
  thirdPartied: boolean;
  outcome: FightOutcome;
};

type Rule = (ctx: FeedbackContext) => FeedbackLine | null;

const TONE_RANK = { bad: 0, warn: 1, good: 2 } as const;

export const RULE_LESSONS: Record<string, string> = {
  "storm-heavy": "You keep taking storm. Leave earlier, or path closer to the safe side.",
  "moving-late": "Moving zones punish a late walk. Start the rotate when the zone is still calm.",
  "fight-loss": "You lost the fight. Check numbers and mats before you commit.",
  "surge-miss": "Surge hit you. Tag someone before you box up when the lobby is still big.",
  "third-party": "Fights in a stack don't stay 1v1. A third team walks in on the winner.",
  "exposure-high": "Too many angles could shoot you. Edge holds cut the map in half.",
  "dead-side-lost": "A dead side is a bet. If the next pull goes the other way, leave immediately.",
  "stacked-avoid": "You walked into the stacked side with no plan to tag or fight.",
  "low-mats": "Full fights spend mats. A tag is the surge play when you're poor.",
  "surge-passive": "Avoiding everyone with surge live only works if the lobby is already thin.",
  "center-exposed": "Center shortens the next rotate and opens every angle.",
  "pull-came": "The pull came to your side. That's when a dead-side hold is free.",
  "storm-clean": "Clean rotates are a habit. Keep treating storm damage as optional.",
  "pre-rotate": "Early on a moving zone is how you stay on the safe side of the shift.",
  "surge-tag": "The tag did its job. You don't need a full fight to clear surge.",
  "exposure-low": "Few angles could touch you. That's a hold, not a coinflip.",
  "fight-win": "You won a fight you chose. Take those when the third-party count is low.",
  "late-paid": "Late works when the path is empty and you actually needed the mats.",
  "dead-side-quiet": "Dead side, and you didn't turn it into a fight. That's the point of the side.",
  steady: "Nothing in the call was extreme. Stay picky about the zones that matter.",
};

export function buildFeedback(ctx: FeedbackContext): FeedbackLine[] {
  const lines = RULES.map((rule) => rule(ctx)).filter((line): line is FeedbackLine => line !== null);
  lines.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
  if (lines.length === 0) {
    return [{ tone: "good", ruleId: "steady", text: "Quiet zone. Nothing in this call was extreme." }];
  }
  return lines.slice(0, 4);
}

const RULES: Rule[] = [
  stormHeavy,
  movingLate,
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
    text: `Storm hit you for ${rounded}. Late only pays when the path is already clear and you need the mats.`,
  };
}

function movingLate(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.zone.isMoving || ctx.decision.timing !== "late" || ctx.stormDamage < 40) return null;
  return {
    tone: "bad",
    ruleId: "moving-late",
    text: "This zone moves. A late rotate lets it run away from you and the storm does the rest.",
  };
}

function fightLoss(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.outcome !== "loss") return null;
  return {
    tone: "bad",
    ruleId: "fight-loss",
    text: "You lost the fight. If mats or numbers are even, tagging and leaving is the higher-percentage call.",
  };
}

function surgeMiss(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.surgeHit) return null;
  return {
    tone: "bad",
    ruleId: "surge-miss",
    text: "Surge was live and your damage was too low. You needed a tag, not a full reset.",
  };
}

function thirdParty(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.thirdPartied) return null;
  return {
    tone: "bad",
    ruleId: "third-party",
    text: "A third team crashed the fight. Stacked-side fights are not isolated.",
  };
}

function exposureHigh(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.exposure < 5) return null;
  return {
    tone: "bad",
    ruleId: "exposure-high",
    text: `${ctx.exposure} directions could shoot you from that spot. Deep center holds get swarmed.`,
  };
}

function deadSideLost(ctx: FeedbackContext): FeedbackLine | null {
  const delta = edgePullDelta(ctx);
  if (delta === null || delta < 2.1) return null;
  if (ctx.destinationSector?.label === "stacked") return null;
  const side = ctx.destinationSector ? sectorName(ctx.destinationSector.index) : "edge";
  return {
    tone: "warn",
    ruleId: "dead-side-lost",
    text: `You held ${side} and the next zone pulled away. Dead sides go quiet, then everyone there has to run at once.`,
  };
}

function stackedAvoid(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.destinationSector?.label !== "stacked" || ctx.decision.engagement !== "avoid") return null;
  return {
    tone: "warn",
    ruleId: "stacked-avoid",
    text: "That side was stacked. Walking in while avoiding fights gives you the risk without the surge tags.",
  };
}

function lowMats(ctx: FeedbackContext): FeedbackLine | null {
  const fighting = ctx.decision.engagement === "fight" || ctx.outcome === "forced";
  if (!fighting || ctx.mats >= 220) return null;
  return {
    tone: "warn",
    ruleId: "low-mats",
    text: "You took a fight on low mats. A tag spends less and still counts for surge.",
  };
}

function surgePassive(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.surgeActive || ctx.surgeHit || ctx.decision.engagement !== "avoid") return null;
  return {
    tone: "warn",
    ruleId: "surge-passive",
    text: "Surge was active and you avoided everyone. That works once the lobby is thin, not while it's still big.",
  };
}

function centerExposed(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.heldCenter || ctx.exposure < 4) return null;
  return {
    tone: "warn",
    ruleId: "center-exposed",
    text: "Center keeps the next rotate short, but you were open from several sides. Take it when the lobby is spread, not stacked.",
  };
}

function pullCame(ctx: FeedbackContext): FeedbackLine | null {
  const delta = edgePullDelta(ctx);
  if (delta === null || delta > 0.7) return null;
  return {
    tone: "good",
    ruleId: "pull-came",
    text: "The next zone pulled toward your side. The dead-side hold turned into a short rotate.",
  };
}

function stormClean(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.stormDamage > 0 || ctx.outcome === "loss") return null;
  return {
    tone: "good",
    ruleId: "storm-clean",
    text: "No storm damage. You made the zone on your own timing.",
  };
}

function preRotate(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.zone.isMoving || ctx.decision.timing !== "early" || ctx.stormDamage >= 25) return null;
  return {
    tone: "good",
    ruleId: "pre-rotate",
    text: "Early rotate on a moving zone. You moved while the old circle was still safe.",
  };
}

function surgeTag(ctx: FeedbackContext): FeedbackLine | null {
  if (!ctx.surgeActive || ctx.surgeHit || ctx.outcome !== "tag") return null;
  return {
    tone: "good",
    ruleId: "surge-tag",
    text: "The tag kept you off the bottom of the damage chart. That's the whole point of a tag.",
  };
}

function exposureLow(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.exposure > 2) return null;
  return {
    tone: "good",
    ruleId: "exposure-low",
    text: `Only ${ctx.exposure} direction${ctx.exposure === 1 ? "" : "s"} could hit you. Strong hold.`,
  };
}

function fightWin(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.outcome !== "win" || ctx.thirdPartied) return null;
  return {
    tone: "good",
    ruleId: "fight-win",
    text: "You won the fight and banked damage. Take those when a third team isn't already in range.",
  };
}

function latePaid(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.decision.timing !== "late" || ctx.stormDamage >= 25) return null;
  return {
    tone: "good",
    ruleId: "late-paid",
    text: "Late rotate paid. You farmed and still crossed before the storm mattered.",
  };
}

function deadSideQuiet(ctx: FeedbackContext): FeedbackLine | null {
  if (ctx.destinationSector?.label !== "dead") return null;
  if (ctx.decision.engagement !== "avoid") return null;
  if (ctx.outcome !== "none" && ctx.outcome !== "escaped") return null;
  if (edgePullDelta(ctx) !== null && (edgePullDelta(ctx) ?? 0) >= 2.1) return null;
  return {
    tone: "good",
    ruleId: "dead-side-quiet",
    text: "You took the dead side and didn't donate a fight. Use the quiet to refresh, then watch the next pull.",
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

export function describeCall(decision: Decision, sector: SectorInfo | null, heldCenter: boolean): string {
  const when = { early: "Rotate early", standard: "Rotate on time", late: "Rotate late" }[decision.timing];
  const how = { avoid: "avoid fights", tag: "look for a tag", fight: "take a fight" }[decision.engagement];
  const where = heldCenter ? "through center" : sector ? `toward the ${sectorName(sector.index)} side` : "to your pin";
  return `${when} ${where}, ${how}.`;
}

export function heldCenter(decision: Decision, zone: Circle): boolean {
  return dist(decision.destination, zone.center) < zone.radius * 0.5;
}
