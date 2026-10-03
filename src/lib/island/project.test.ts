import { describe, expect, it } from "vitest";
import { MAP_SIZE } from "@/engine/constants";
import { nearestPlace, worldToSim, WORLD_HALF } from "./project";

describe("island projection", () => {
  it("puts the world origin at the middle of the sim map", () => {
    const center = worldToSim(0, 0);
    expect(center.x).toBeCloseTo(MAP_SIZE / 2);
    expect(center.y).toBeCloseTo(MAP_SIZE / 2);
  });

  it("puts the northwest corner at the top-left of the sim map", () => {
    const corner = worldToSim(-WORLD_HALF, -WORLD_HALF);
    expect(corner.x).toBeCloseTo(0);
    expect(corner.y).toBeCloseTo(MAP_SIZE);
  });

  it("names the closest place to a pin", () => {
    const places = [
      { name: "Far", x: 0, y: 0 },
      { name: "Near", x: 10, y: 10 },
    ];
    expect(nearestPlace(places, { x: 12, y: 11 })).toBe("Near");
    expect(nearestPlace([], { x: 0, y: 0 })).toBeNull();
  });
});
