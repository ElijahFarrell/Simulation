import { describe, expect, it } from "vitest";
import type { PhaseResult } from "@/engine/types";
import { EMPTY_STATS, averageScore, mergeStats, worstHabit } from "./review";

function phase(ruleId: string, total: number): PhaseResult {
  return {
    zone: {
      index: 1,
      from: { center: { x: 0, y: 0 }, radius: 1 },
      to: { center: { x: 0, y: 0 }, radius: 1 },
      pull: "normal",
      waitSec: 1,
      shrinkSec: 1,
      isMoving: false,
      surgeActive: false,
      stormDps: 1,
    },
    decision: { destination: { x: 0, y: 0 }, timing: "early", engagement: "avoid" },
    score: { storm: total, contact: total, exposure: total, surge: total, positioning: total, total },
    feedback: [{ tone: "bad", ruleId, text: ruleId }],
    events: [],
    sectors: [],
  };
}

describe("review", () => {
  it("finds the bad call that shows up most", () => {
    const habit = worstHabit([phase("surge-miss", 40), phase("surge-miss", 40), phase("storm-heavy", 20)]);
    expect(habit?.ruleId).toBe("surge-miss");
    expect(habit?.count).toBe(2);
  });

  it("tracks wins and best average", () => {
    const history = [phase("storm-heavy", 80), phase("storm-heavy", 60)];
    const next = mergeStats(EMPTY_STATS, {
      seed: 1,
      phaseIndex: 1,
      zones: [],
      teams: [],
      history,
      status: "won",
      rngState: 1,
      placement: 1,
      settings: { teamCount: 30, fighterWeight: 0.2 },
    });
    expect(next.wins).toBe(1);
    expect(next.games).toBe(1);
    expect(next.bestAverage).toBe(averageScore(history));
    expect(next.badRules["storm-heavy"]).toBe(2);
  });
});
