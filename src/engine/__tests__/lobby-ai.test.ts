import { describe, expect, it } from "vitest";
import { chooseAiDestination } from "../ai-behavior";
import { dist } from "../geometry";
import { createLobby, normalizeSettings } from "../lobby";
import { createRng } from "../rng";
import type { LandMask, Team, ZonePhase } from "../types";
import { generateZones } from "../zones";

function fullLand(): LandMask {
  const grid = 32;
  return { grid, cells: new Uint8Array(grid * grid).fill(1) };
}

function zone(): ZonePhase {
  const generated = generateZones(createRng(3));
  const first = generated[0];
  if (!first) throw new Error("missing zone");
  return first;
}

function team(partial: Partial<Team> & Pick<Team, "archetype" | "pos">): Team {
  return {
    id: "t1",
    isPlayer: false,
    alive: 3,
    hp: 300,
    mats: 500,
    heals: 100,
    damageThisPhase: 0,
    eliminated: false,
    squadSize: 3,
    ...partial,
  };
}

describe("lobby", () => {
  it("creates one player and the requested number of teams", () => {
    const rng = createRng(4);
    const teams = createLobby(rng, zone(), normalizeSettings({ teamCount: 25, fighterWeight: 0.2 }));
    expect(teams).toHaveLength(25);
    expect(teams.filter((entry) => entry.isPlayer)).toHaveLength(1);
    expect(teams[0]?.id).toBe("you");
    expect(teams[0]?.squadSize).toBe(3);
    expect(teams[0]?.alive).toBe(3);
  });

  it("piles a stacked lobby onto the named drops", () => {
    const mask = fullLand();
    const places = [
      { x: 200, y: 700 },
      { x: 800, y: 700 },
      { x: 200, y: 300 },
      { x: 800, y: 300 },
      { x: 500, y: 500 },
    ];
    const teams = createLobby(
      createRng(4),
      zone(),
      normalizeSettings({ teamCount: 33, fighterWeight: 0.2, dropStyle: "stacked" }),
      mask,
      places,
    );
    const others = teams.filter((entry) => !entry.isPlayer);
    const near = others.filter((entry) => places.some((place) => dist(entry.pos, place) <= 40));
    expect(near.length).toBeGreaterThan(others.length * 0.6);
  });

  it("builds a solos lobby as 80 players of 1", () => {
    const teams = createLobby(createRng(8), zone(), normalizeSettings({ mode: "solos" }));
    expect(teams).toHaveLength(80);
    expect(teams.every((entry) => entry.squadSize === 1 && entry.alive === 1 && entry.hp === 100)).toBe(true);
  });
});

describe("ai destinations", () => {
  const next = { center: { x: 500, y: 500 }, radius: 200 };
  const self = team({ archetype: "edge", pos: { x: 680, y: 520 } });

  it("puts deep teams inside 0.4 radii", () => {
    const rng = createRng(11);
    const deep = team({ archetype: "deep", pos: { x: 100, y: 100 } });
    for (let i = 0; i < 40; i += 1) {
      const dest = chooseAiDestination(deep, [deep], next, rng);
      expect(dist(dest, next.center)).toBeLessThanOrEqual(next.radius * 0.4 + 1e-6);
    }
  });

  it("puts edge teams on the outer ring", () => {
    const rng = createRng(12);
    for (let i = 0; i < 40; i += 1) {
      const dest = chooseAiDestination(self, [self], next, rng);
      const distance = dist(dest, next.center);
      expect(distance).toBeGreaterThanOrEqual(next.radius * 0.85 - 1e-6);
      expect(distance).toBeLessThanOrEqual(next.radius * 0.95 + 1e-6);
    }
  });
});
