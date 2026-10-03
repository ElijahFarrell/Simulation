import { describe, expect, it } from "vitest";
import { exposureDirections, expectedDistance, sampleFutureCenters, sectorDensity } from "../analysis";
import { START_HEALS } from "../constants";
import { buildFeedback, type FeedbackContext } from "../feedback";
import { createGame, advancePhase } from "../game";
import { positionAt, simulatePath } from "../movement";
import { resolveDecision } from "../step";
import { applySurge } from "../surge";
import type { Decision, GameState, Team, ZonePhase } from "../types";

function finishGame(seed: number, choose: (state: GameState) => Decision): GameState {
  let state = createGame(seed);
  for (let guard = 0; guard < 20; guard += 1) {
    if (state.status === "resolved") state = advancePhase(state);
    if (state.status !== "deciding") return state;
    state = resolveDecision(state, choose(state));
  }
  throw new Error("game did not finish");
}

function play(seed: number, engagement: Decision["engagement"] = "avoid"): GameState {
  return finishGame(seed, (state) => {
    const zone = state.zones[state.phaseIndex];
    if (!zone) throw new Error("missing zone");
    return { destination: zone.to.center, timing: "standard", engagement };
  });
}

function edgeCall(state: GameState, timing: Decision["timing"]): Decision {
  const zone = state.zones[state.phaseIndex];
  const player = state.teams.find((team) => team.isPlayer);
  if (!zone || !player) throw new Error("missing");
  const dx = player.pos.x - zone.to.center.x;
  const dy = player.pos.y - zone.to.center.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    destination: {
      x: zone.to.center.x + (dx / length) * zone.to.radius * 0.9,
      y: zone.to.center.y + (dy / length) * zone.to.radius * 0.9,
    },
    timing,
    engagement: "avoid",
  };
}

describe("full games", () => {
  it("finishes for many seeds without throwing", () => {
    let zonesLived = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const end = play(seed);
      expect(["dead", "won"]).toContain(end.status);
      expect(end.history.length).toBeGreaterThan(0);
      zonesLived += end.history.length;
    }
    expect(zonesLived / 40).toBeGreaterThan(3);
  });

  it("scores an early edge rotate above a late one", () => {
    const average = (timing: Decision["timing"]) => {
      let total = 0;
      let count = 0;
      for (let seed = 1; seed <= 16; seed += 1) {
        const end = finishGame(seed, (state) => edgeCall(state, timing));
        for (const phase of end.history) {
          total += phase.score.total;
          count += 1;
        }
      }
      return total / count;
    };
    expect(average("early")).toBeGreaterThan(average("late"));
  });

  it("replays the same seed the same way", () => {
    const a = play(18);
    const b = play(18);
    expect(a.status).toBe(b.status);
    expect(a.history.map((phase) => phase.score.total)).toEqual(
      b.history.map((phase) => phase.score.total),
    );
    expect(a.teams.map((team) => team.pos)).toEqual(b.teams.map((team) => team.pos));
  });
});

describe("movement timing", () => {
  it("takes less storm when leaving early on a moving zone", () => {
    const zone: ZonePhase = {
      index: 6,
      from: { center: { x: 500, y: 500 }, radius: 100 },
      to: { center: { x: 560, y: 500 }, radius: 40 },
      pull: "half",
      waitSec: 24,
      shrinkSec: 16,
      isMoving: true,
      surgeActive: false,
      stormDps: 10,
    };
    const start = { x: 408, y: 500 };
    const dest = { x: 560, y: 500 };
    const early = simulatePath({ start, dest, departSec: 0, zone });
    const late = simulatePath({ start, dest, departSec: zone.waitSec, zone });
    expect(early.stormDamage).toBeLessThan(late.stormDamage);
  });

  it("keeps a late rotate still until the storm has started closing", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 0 };
    expect(positionAt(start, end, 10, 9)).toEqual(start);
    expect(positionAt(start, end, 10, 10).x).toBeCloseTo(0);
    expect(positionAt(start, end, 10, 12).x).toBeCloseTo(11);
  });

  it("plays back the same path the storm score used", () => {
    const zone: ZonePhase = {
      index: 6,
      from: { center: { x: 500, y: 500 }, radius: 100 },
      to: { center: { x: 560, y: 500 }, radius: 40 },
      pull: "half",
      waitSec: 24,
      shrinkSec: 16,
      isMoving: true,
      surgeActive: false,
      stormDps: 10,
    };
    const start = { x: 408, y: 500 };
    const dest = { x: 560, y: 500 };
    const departSec = zone.waitSec + zone.shrinkSec * 0.42;
    const sim = simulatePath({ start, dest, departSec, zone });
    sim.samples.forEach((sample, step) => {
      const time = Math.min(zone.waitSec + zone.shrinkSec, step);
      const played = positionAt(start, sim.end, departSec, time);
      expect(played.x).toBeCloseTo(sample.x);
      expect(played.y).toBeCloseTo(sample.y);
    });
  });
});

describe("surge", () => {
  const zone: ZonePhase = {
    index: 3,
    from: { center: { x: 0, y: 0 }, radius: 10 },
    to: { center: { x: 0, y: 0 }, radius: 8 },
    pull: "normal",
    waitSec: 1,
    shrinkSec: 1,
    isMoving: false,
    surgeActive: true,
    stormDps: 1,
  };

  function squad(count: number, playerDamage: number): Team[] {
    return Array.from({ length: count }, (_, index) => ({
      id: index === 0 ? "you" : `t${index}`,
      isPlayer: index === 0,
      archetype: "passive" as const,
      pos: { x: 0, y: 0 },
      alive: 3,
      hp: 300,
      mats: 400,
      heals: START_HEALS,
      damageThisPhase: index === 0 ? playerDamage : 400,
      eliminated: false,
      squadSize: 3,
    }));
  }

  it("damages the lowest-damage teams only when active and above the threshold", () => {
    const crowded = squad(20, 0);
    const player = crowded[0];
    if (!player) throw new Error("missing player");
    const hit = applySurge(crowded, zone);
    expect(hit.playerHit).toBe(true);
    expect(player.heals).toBeLessThan(START_HEALS);

    const quiet = squad(20, 0);
    const quietPlayer = quiet[0];
    applySurge(quiet, { ...zone, surgeActive: false });
    expect(quietPlayer?.heals).toBe(START_HEALS);

    const small = squad(5, 0);
    const smallPlayer = small[0];
    const skipped = applySurge(small, zone);
    expect(skipped.playerHit).toBe(false);
    expect(smallPlayer?.heals).toBe(START_HEALS);
  });
});

describe("analysis", () => {
  it("sector counts only include teams in the edge band", () => {
    const next = { center: { x: 500, y: 500 }, radius: 100 };
    const base: Omit<Team, "id" | "pos"> = {
      isPlayer: false,
      archetype: "edge",
      alive: 3,
      hp: 300,
      mats: 100,
      heals: 0,
      damageThisPhase: 0,
      eliminated: false,
      squadSize: 3,
    };
    const teams: Team[] = [
      { ...base, id: "you", isPlayer: true, pos: { x: 500, y: 600 } },
      { ...base, id: "t1", pos: { x: 500, y: 600 } },
      { ...base, id: "t2", pos: { x: 500, y: 610 } },
      { ...base, id: "t3", pos: { x: 610, y: 500 } },
      { ...base, id: "t4", pos: { x: 500, y: 500 } },
    ];
    const sectors = sectorDensity(teams, next);
    const counted = sectors.reduce((sum, sector) => sum + sector.teamCount, 0);
    expect(counted).toBe(3);
  });

  it("scores the next-zone center as a shorter future rotate than the edge", () => {
    let centerTotal = 0;
    let edgeTotal = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const game = createGame(seed);
      const zone = game.zones[3];
      const following = game.zones[4];
      if (!zone || !following) throw new Error("missing zones");
      const centers = sampleFutureCenters(zone.to, following, seed + 50);
      const edge = {
        x: zone.to.center.x + zone.to.radius * 0.95,
        y: zone.to.center.y,
      };
      centerTotal += expectedDistance(zone.to.center, centers, following.to.radius);
      edgeTotal += expectedDistance(edge, centers, following.to.radius);
    }
    expect(centerTotal).toBeLessThan(edgeTotal);
  });

  it("reports no exposure when nobody is nearby", () => {
    const alone: Team = {
      id: "t9",
      isPlayer: false,
      archetype: "deep",
      pos: { x: 10, y: 10 },
      alive: 3,
      hp: 300,
      mats: 100,
      heals: 0,
      damageThisPhase: 0,
      eliminated: false,
      squadSize: 3,
    };
    expect(exposureDirections({ x: 900, y: 900 }, [alone], 200)).toBe(0);
  });
});

describe("feedback", () => {
  it("calls out surge and stays within four lines", () => {
    const ctx: FeedbackContext = {
      zone: {
        index: 4,
        from: { center: { x: 0, y: 0 }, radius: 10 },
        to: { center: { x: 0, y: 0 }, radius: 8 },
        pull: "normal",
        waitSec: 10,
        shrinkSec: 10,
        isMoving: false,
        surgeActive: true,
        stormDps: 2,
      },
      decision: { destination: { x: 1, y: 0 }, timing: "late", engagement: "avoid" },
      stormDamage: 0,
      exposure: 1,
      surgeActive: true,
      surgeHit: true,
      destinationSector: { index: 1, teamCount: 0, label: "dead" },
      heldCenter: false,
      endPos: { x: 1, y: 0 },
      nextCenter: null,
      mats: 400,
      thirdPartied: false,
      outcome: "escaped",
    };
    const lines = buildFeedback(ctx);
    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.some((line) => line.ruleId === "surge-miss")).toBe(true);
  });
});
