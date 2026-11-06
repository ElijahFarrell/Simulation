import type { Team } from "./types";

export function playerOf(teams: readonly Team[]): Team {
  const player = teams.find((team) => team.isPlayer);
  if (!player) throw new Error("Player team is missing");
  return player;
}

export function aliveCount(teams: readonly Team[]): number {
  return teams.filter((team) => !team.eliminated).length;
}
