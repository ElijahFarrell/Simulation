import { describe, expect, it } from "vitest";
import { initialLabState, labReducer } from "./lab-state";

describe("drop plan", () => {
  it("starts the zone from the end of the loot route", () => {
    const started = labReducer(initialLabState, {
      type: "start",
      seed: 7,
      scenarioId: null,
    });
    const drop = { x: 400, y: 600 };
    const loot = { x: 460, y: 640 };
    const planned = labReducer(labReducer(started, { type: "pick", point: drop }), {
      type: "pick",
      point: loot,
    });
    const locked = labReducer(planned, { type: "drop-lock" });
    const player = locked.game?.teams.find((team) => team.isPlayer);
    expect(locked.planning).toBe(false);
    expect(player?.pos).toEqual(loot);
  });

  it("leaves the random drop alone when the plan is skipped", () => {
    const started = labReducer(initialLabState, {
      type: "start",
      seed: 7,
      scenarioId: null,
    });
    const before = started.game?.teams.find((team) => team.isPlayer)?.pos;
    const skipped = labReducer(started, { type: "drop-skip" });
    expect(skipped.planning).toBe(false);
    expect(skipped.game?.teams.find((team) => team.isPlayer)?.pos).toEqual(before);
  });
});

describe("locked calls", () => {
  it("ignores timing and engagement while the zone plays out", () => {
    const started = labReducer(initialLabState, { type: "start", seed: 7, scenarioId: null });
    const deciding = labReducer(labReducer(started, { type: "drop-skip" }), { type: "pick", point: { x: 500, y: 500 } });
    const locked = labReducer(deciding, { type: "lock" });
    expect(locked.animating).toBe(true);
    expect(labReducer(locked, { type: "timing", timing: "late" }).timing).toBe(locked.timing);
    expect(labReducer(locked, { type: "engagement", engagement: "fight" }).engagement).toBe(locked.engagement);
  });

  it("still takes them while deciding", () => {
    const started = labReducer(initialLabState, { type: "start", seed: 7, scenarioId: null });
    const deciding = labReducer(started, { type: "drop-skip" });
    expect(labReducer(deciding, { type: "timing", timing: "late" }).timing).toBe("late");
  });
});
