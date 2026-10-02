import { CALL_PARTS, type CallPart, SCORE_WEIGHTS, STORM_DAMAGE_CAP } from "./constants";
import { clamp } from "./geometry";
import type { FightOutcome, ScoreBreakdown } from "./types";

export type ScoreInput = {
  stormDamage: number;
  exposure: number;
  surgeActive: boolean;
  surgeHit: boolean;
  outcome: FightOutcome;
  thirdPartied: boolean;
  positioning: number;
  sectorCount: number;
};

export function scoreDecision(input: ScoreInput): ScoreBreakdown {
  const storm = clamp(100 - (input.stormDamage / STORM_DAMAGE_CAP) * 100, 0, 100);
  const contact = contactScore(input);
  const exposure = clamp(100 - input.exposure * (100 / input.sectorCount), 0, 100);
  const surge = surgeScore(input);
  const positioning = clamp(input.positioning, 0, 100);
  const total = Math.round(
    SCORE_WEIGHTS.storm * storm +
      SCORE_WEIGHTS.contact * contact +
      SCORE_WEIGHTS.exposure * exposure +
      SCORE_WEIGHTS.surge * surge +
      SCORE_WEIGHTS.positioning * positioning,
  );
  return { storm, contact, exposure, surge, positioning, total };
}

export function pointsLost(score: ScoreBreakdown): Record<CallPart, number> {
  const lost = (part: CallPart) =>
    Math.round(CALL_PARTS[part].scores.reduce((sum, key) => sum + SCORE_WEIGHTS[key] * (100 - score[key]), 0));
  return { where: lost("where"), when: lost("when"), contact: lost("contact") };
}

function contactScore(input: ScoreInput): number {
  switch (input.outcome) {
    case "none":
    case "escaped":
      return 100;
    case "whiff":
      return 48;
    case "tag":
      return input.thirdPartied ? 62 : 86;
    case "win":
      return input.thirdPartied ? 50 : 92;
    case "forced":
      return input.thirdPartied ? 28 : 40;
    case "loss":
      return 12;
    default:
      return 50;
  }
}

function surgeScore(input: ScoreInput): number {
  if (!input.surgeActive) return 100;
  if (input.surgeHit) return 0;
  if (input.outcome === "tag" || input.outcome === "win") return 100;
  if (input.outcome === "none" || input.outcome === "escaped") {
    return 58;
  }
  return 70;
}
