import { sectorName } from "./constants";
import type { PhaseView } from "./types";

export function coachHint(view: PhaseView): string {
  if (view.zone.surgeActive && view.player.damageThisPhase === 0) {
    return "Surge is live and you have no damage this zone. Tag someone on the way in if a full fight would drain your mats.";
  }
  if (view.zone.isMoving) {
    return "Moving zone. If you are on the side it is leaving, rotate early — the old circle is still safe during the wait.";
  }
  const quietest = [...view.sectors].sort((a, b) => a.teamCount - b.teamCount)[0];
  if (quietest && quietest.label === "dead") {
    const side = sectorName(quietest.index);
    return `The ${side} side is the quietest right now. It stays quiet only until the next pull. If you finish outside the dashed circle, that whole side has to run together.`;
  }
  return "Pin a spot, then choose when you leave and whether you want a fight. Early moves during the wait. Late farms mats and risks storm.";
}
