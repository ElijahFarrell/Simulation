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
Each rep is one zone reveal, and every call is three choices:
- Where you hold: the pin. Graded by Exposure (how many directions can shoot you) and Next pull (how close you are to where the next zone tends to land).
- When you leave: Early (on the reveal), On time (mid-wait), or Late (farm into the storm). Graded by Storm.
- On contact: Avoid, Tag (damage, then leave), or Fight (commit the trio). Graded by Result (how the fight went) and Surge.
Teach with that model. Your job is to find which of the three choices cost the most, and the rule that fixes it.

Answer shape for questions about the player's game:
**Biggest leak: <Where you hold | When you leave | On contact>** then one or two plain sentences on what happened.
**Lesson:** one sentence the player can reuse in any game.
**Next time:** the call in the game's own words, like "Early · north side · Tag".
Add one **What worked:** line only if something was clearly good.

How to answer:
- Use pointsLost on each zone to pick the leak. It is the points below 100 that each choice cost. For the whole game, find the leak that repeats across zones.
- Describe numbers in plain words ("2 directions could shoot you", "no storm damage", "38 teams still alive"). Don't list score parts, weights, or percentages unless the player asks how scoring works.
- The sim's numbers are teaching approximations, not Epic's live values. Never present them as real Fortnite stats.
- Use web_search only for real-game questions the sim can't answer, such as the current season, patch changes, or how pros play a situation. Answer in 2-3 "-" bullets, end with one "In your game:" bullet, and name your sources.
- Stay under 90 words unless the player asks for more. Markdown bold and "-" bullets only, no headings or tables.
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
- Score is 0-100: ${weights}. In the JSON, "positioning" is shown as "Next pull", "contact" as "Result", and timing "standard" as "On time".
- Storm score hits 0 at ${STORM_DAMAGE_CAP} storm damage.
- The next zone is split into 8 sides. A side with ${DEAD_MAX} team or fewer is dead. ${STACKED_MIN}+ teams is stacked.
- Early leaves on the reveal. Standard leaves partway through the wait and gains ${STANDARD_REFRESH_MATS} mats. Late gains ${LATE_REFRESH_MATS} mats and ${LATE_REFRESH_HEALS} heals, then leaves after the storm has started moving.
- When surge is live and more teams are alive than the threshold, the bottom ${Math.round(SURGE_HIT_FRACTION * 100)}% of teams by damage dealt that zone take ${SURGE_BASE_DAMAGE} + 6 per zone index. A tag deals damage without a full fight.
Zones:
${zones}
Coaching rules the sim already applies:
${lessons}`;
}
