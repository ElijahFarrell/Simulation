import { HP_PER_ALIVE } from "./constants";
import type { Team } from "./types";

export function syncAlive(team: Team): void {
  if (team.hp <= 0) {
    team.hp = 0;
    team.alive = 0;
    team.eliminated = true;
    return;
  }
  team.alive = Math.min(3, Math.ceil(team.hp / HP_PER_ALIVE));
  team.eliminated = false;
}

/** Storm, surge, and chip damage. Heals absorb first. */
export function applyChip(team: Team, amount: number): void {
  if (team.eliminated || amount <= 0) return;
  const healed = Math.min(team.heals, amount);
  team.heals -= healed;
  team.hp = Math.max(0, team.hp - (amount - healed));
  syncAlive(team);
}

/** A knock removes a player outright. Heals do not stop it. */
export function applyKnock(team: Team, knocks: number): void {
  if (team.eliminated || knocks <= 0) return;
  const lost = Math.min(team.alive, knocks);
  team.alive -= lost;
  team.hp = team.alive * HP_PER_ALIVE;
  if (team.alive <= 0) {
    team.eliminated = true;
    team.hp = 0;
  }
}
