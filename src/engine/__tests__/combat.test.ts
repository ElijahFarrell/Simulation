import { describe, expect, it } from "vitest";
import { resolveCombat } from "../combat";
import type { Rng } from "../rng";
import type { Team } from "../types";

function team(id: string, isPlayer: boolean, alive: number): Team {
  return {
    id,
    isPlayer,
    archetype: "edge",
    pos: { x: 100, y: 100 },
    alive,
    hp: alive * 100,
    mats: 500,
    heals: 0,
    damageThisPhase: 0,
    eliminated: false,
    squadSize: 3,
  };
}

const neverEscapes: Rng = {
  next: () => 0.5,
  range: () => 0,
  pick: (items) => items[0]!,
  chance: () => false,
  getState: () => 0,
};

function avoidAgainst(playerAlive: number, enemyAlive: number) {
  const teams = [team("you", true, playerAlive), team("t1", false, enemyAlive)];
  const decision = { destination: { x: 100, y: 100 }, timing: "standard", engagement: "avoid" } as const;
  return resolveCombat(teams, new Map(), decision, neverEscapes).outcome;
}

describe("getting caught while avoiding", () => {
  it("grades a fight you won as forced, not lost", () => {
    expect(avoidAgainst(3, 1)).toBe("forced");
  });

  it("grades a fight you lost as lost", () => {
    expect(avoidAgainst(1, 3)).toBe("loss");
  });
});
