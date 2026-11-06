import { SURGE_BASE_DAMAGE, SURGE_DAMAGE_PER_ZONE, SURGE_HIT_FRACTION, surgeThreshold } from "./constants";
import { applyChip } from "./damage";
import type { Team, ZonePhase } from "./types";

type SurgeResult = {
  events: string[];
  playerHit: boolean;
};

export function applySurge(teams: Team[], zone: ZonePhase): SurgeResult {
  if (!zone.surgeActive) return { events: [], playerHit: false };
  const alive = teams.filter((team) => !team.eliminated);
  if (alive.length <= surgeThreshold(zone.index)) {
    return { events: [], playerHit: false };
  }

  const ranked = [...alive].sort((a, b) => {
    if (a.damageThisPhase !== b.damageThisPhase) {
      return a.damageThisPhase - b.damageThisPhase;
    }
    return a.id.localeCompare(b.id);
  });
  const hitCount = Math.max(1, Math.round(alive.length * SURGE_HIT_FRACTION));
  const hits = ranked.slice(0, hitCount);
  const amount = SURGE_BASE_DAMAGE + zone.index * SURGE_DAMAGE_PER_ZONE;
  const events: string[] = [];
  let playerHit = false;

  for (const team of hits) {
    applyChip(team, amount);
    if (!team.isPlayer) continue;
    playerHit = true;
    events.push(
      team.eliminated
        ? "Surge damage knocked out your team"
        : `Surge hit you for ${amount}. Your team did too little damage`,
    );
  }

  return { events, playerHit };
}
