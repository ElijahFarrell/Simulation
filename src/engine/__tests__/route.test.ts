import { describe, expect, it } from "vitest";
import { LOOT_STOP_SEC, ROTATE_SPEED } from "../constants";
import { formatClock, routeSeconds, routeVerdict } from "../route";

describe("loot route", () => {
  it("treats a lone drop as time to loot in place", () => {
    expect(routeSeconds([{ x: 100, y: 100 }])).toBe(0);
    expect(routeVerdict(0, 55)).toContain("0:55");
  });

  it("adds travel and a loot pause for each stop", () => {
    const leg = ROTATE_SPEED * 10;
    const seconds = routeSeconds([
      { x: 0, y: 0 },
      { x: leg, y: 0 },
      { x: leg * 2, y: 0 },
    ]);
    expect(seconds).toBeCloseTo(20 + LOOT_STOP_SEC * 2);
  });

  it("says when the route runs past the zone wait", () => {
    expect(routeVerdict(40, 55)).toContain("0:15 left");
    expect(routeVerdict(70, 55)).toContain("still looting 0:15");
    expect(formatClock(65)).toBe("1:05");
  });
});
