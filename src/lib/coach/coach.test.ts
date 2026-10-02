import { describe, expect, it } from "vitest";
import { STORM_DAMAGE_CAP } from "@/engine/constants";
import { createGame } from "@/engine/game";
import { pointsLost } from "@/engine/scoring";
import { resolveDecision } from "@/engine/step";
import type { GameState } from "@/engine/types";
import { checkPasscode } from "./access";
import { buildCoachContext, coachStarters } from "./context";
import { buildInstructions } from "./instructions";
import { coachContextSchema } from "./schema";

function playedZone(seed: number): GameState {
  const game = createGame(seed);
  const zone = game.zones[0];
  if (!zone) throw new Error("missing zone");
  return resolveDecision(game, { destination: zone.to.center, timing: "late", engagement: "tag" });
}

describe("checkPasscode", () => {
  it("fails closed when no passcode is configured", () => {
    expect(checkPasscode("anything", undefined)).toBe("not-configured");
    expect(checkPasscode("anything", "")).toBe("not-configured");
  });

  it("only accepts the exact passcode", () => {
    expect(checkPasscode("rotate-early", "rotate-early")).toBe("ok");
    expect(checkPasscode("rotate-late", "rotate-early")).toBe("denied");
    expect(checkPasscode(null, "rotate-early")).toBe("denied");
  });
});

describe("buildCoachContext", () => {
  it("summarizes each played zone in a shape the route accepts", () => {
    const game = playedZone(7);
    const context = buildCoachContext(game, 1);

    expect(coachContextSchema.safeParse(context).success).toBe(true);
    expect(context.focusZone).toBe(1);
    expect(context.zones).toHaveLength(1);
    const [zone] = context.zones;
    expect(zone?.timing).toBe("late");
    expect(zone?.engagement).toBe("tag");
    expect(zone?.call).toContain("Loot first, then go");
    expect(Number.isInteger(zone?.score.storm)).toBe(true);
    expect(zone?.pointsLost).toEqual(pointsLost(game.history[0]!.score));
  });

  it("asks about the focused zone, or the whole game without one", () => {
    const game = playedZone(7);
    expect(coachStarters(buildCoachContext(game, 1))[0]).toBe("What cost me the most on zone 1?");
    expect(coachStarters(buildCoachContext(game, null))[0]).toBe("What habit cost me the most this game?");
  });
});

describe("buildInstructions", () => {
  it("grounds the coach in the sim's own rules and the current game", () => {
    const context = buildCoachContext(playedZone(7), 1);
    const instructions = buildInstructions(context);

    expect(instructions).toContain(`at ${STORM_DAMAGE_CAP} storm damage`);
    expect(instructions).toContain("storm-heavy:");
    expect(instructions).toContain("**Biggest leak:");
    expect(instructions).toContain(JSON.stringify(context));
  });
});
