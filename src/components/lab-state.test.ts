import { describe, expect, it } from "vitest";
import { initialLabState, labReducer } from "./lab-state";

describe("drop plan", () => {
  it("starts the zone from the end of the loot route", () => {
    const started = labReducer(initialLabState, {
      type: "start",
      seed: 7,
      scenarioId: null,
      land: null,
      places: [],
    });
    const drop = { x: 400, y: 600 };
    const loot = { x: 460, y: 640 };
    const planned = labReducer(labReducer(started, { type: "drop-add", point: drop }), {
      type: "drop-add",
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
      land: null,
      places: [],
    });
    const before = started.game?.teams.find((team) => team.isPlayer)?.pos;
    const skipped = labReducer(started, { type: "drop-skip" });
    expect(skipped.planning).toBe(false);
    expect(skipped.game?.teams.find((team) => team.isPlayer)?.pos).toEqual(before);
  });
});
