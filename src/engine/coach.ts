import { sectorName } from "./constants";
import type { PhaseView } from "./types";

export function coachHint(view: PhaseView): string {
  if (view.zone.surgeActive && view.player.damageThisPhase === 0) {
    return "Surge is on and your team has no damage yet. Hit a team on the way, then leave. You don't need a full fight.";
  }
  if (view.zone.isMoving) {
    return "This zone moves. If you are on the side it's leaving, go early while the old circle is still safe.";
  }
  const quietest = [...view.sectors].sort((a, b) => a.teamCount - b.teamCount)[0];
  if (quietest && quietest.label === "dead") {
    const side = sectorName(quietest.index);
    return `The ${side} side has the fewest teams. It stays quiet until the next zone shows up. If that zone goes the other way, everyone there has to run at once.`;
  }
  return "Tap the map to pick where you go. Then pick when you leave and what you do if you meet a team.";
}
