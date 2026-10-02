import {
  DEAD_MAX,
  LATE_REFRESH_HEALS,
  LATE_REFRESH_MATS,
  SCORE_WEIGHTS,
  STACKED_MIN,
  STANDARD_REFRESH_MATS,
  STORM_DAMAGE_CAP,
  SURGE_BASE_DAMAGE,
  SURGE_HIT_FRACTION,
  ZONE_TABLE,
  surgeThreshold,
} from "@/engine/constants";
import { RULE_LESSONS } from "@/engine/feedback";
import type { CoachContext } from "./schema";

const ROLE = `You are the IGL coach inside Rotation Lab, a trainer for Fortnite trios rotations.
Each rep is one zone reveal. The player pins a destination, picks timing (early, standard, late) and engagement (avoid, tag, fight). The sim grades the call.

How to answer:
- Explain the player's calls with the sim state below. Quote the actual numbers (score parts, storm damage, side labels, team counts).
- Say what to do differently and why, as a concrete call they can make next rep.
- The sim's numbers are teaching approximations, not Epic's live values. Never present them as real Fortnite stats.
- Use web_search only for real-game questions the sim can't answer, such as the current season, patch changes, or how pros play a situation. Name your sources.
- Keep it short: a few plain sentences or "-" bullets. No headings or tables.
- If the question is unrelated to Fortnite or improving at it, say so in one line.`;

export function buildInstructions(context: CoachContext): string {
  return [ROLE, simRules(), `Current game state (JSON):\n${JSON.stringify(context)}`].join("\n\n");
}

function simRules(): string {
  const weights = Object.entries(SCORE_WEIGHTS)
    .map(([part, weight]) => `${part} ${Math.round(weight * 100)}%`)
    .join(", ");
  const zones = ZONE_TABLE.map((row, index) => {
    const tags = [row.isMoving ? "moving" : null, row.surgeActive ? `surge above ${surgeThreshold(index + 1)} teams` : null]
      .filter(Boolean)
      .join(", ");
    return `zone ${index + 1}: radius ${row.radius}, wait ${row.waitSec}s, shrink ${row.shrinkSec}s, storm ${row.stormDps}/s${tags ? `, ${tags}` : ""}`;
  }).join("\n");
  const lessons = Object.entries(RULE_LESSONS)
    .map(([id, lesson]) => `- ${id}: ${lesson}`)
    .join("\n");

  return `Sim rules:
- Score is 0-100: ${weights}. "positioning" is shown to the player as "Next pull".
- Storm score hits 0 at ${STORM_DAMAGE_CAP} storm damage.
- The next zone is split into 8 sides. A side with ${DEAD_MAX} team or fewer is dead. ${STACKED_MIN}+ teams is stacked.
- Early leaves on the reveal. Standard leaves partway through the wait and gains ${STANDARD_REFRESH_MATS} mats. Late gains ${LATE_REFRESH_MATS} mats and ${LATE_REFRESH_HEALS} heals, then leaves after the storm has started moving.
- When surge is live and more teams are alive than the threshold, the bottom ${Math.round(SURGE_HIT_FRACTION * 100)}% of teams by damage dealt that zone take ${SURGE_BASE_DAMAGE} + 6 per zone index. A tag deals damage without a full fight.
Zones:
${zones}
Coaching rules the sim already applies:
${lessons}`;
}
