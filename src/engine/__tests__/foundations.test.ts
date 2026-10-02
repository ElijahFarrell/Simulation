import { describe, expect, it } from "vitest";
import { MAP_SIZE } from "../constants";
import {
  circleContainsCircle,
  circleOnMap,
  dist,
  sampleDisc,
} from "../geometry";
import { createRng } from "../rng";
import { generateZones } from "../zones";

describe("rng", () => {
  it("resumes from getState", () => {
    const original = createRng(42);
    original.next();
    original.next();
    const checkpoint = original.getState();
    const expectedA = original.next();
    const expectedB = original.next();

    const resumed = createRng(checkpoint);
    expect(resumed.next()).toBe(expectedA);
    expect(resumed.next()).toBe(expectedB);
  });
});

describe("sampleDisc", () => {
  it("stays inside the radius", () => {
    const rng = createRng(7);
    const center = { x: 100, y: -40 };
    const radius = 25;
    for (let i = 0; i < 10000; i += 1) {
      const point = sampleDisc(rng, center, radius);
      expect(dist(point, center)).toBeLessThanOrEqual(radius + 1e-6);
    }
  });
});

describe("generateZones", () => {
  it("is identical for the same seed", () => {
    const a = generateZones(createRng(99));
    const b = generateZones(createRng(99));
    expect(a).toEqual(b);
  });

  it("keeps every next circle inside the previous one and on the map", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const zones = generateZones(createRng(seed));
      for (const zone of zones) {
        expect(circleContainsCircle(zone.from, zone.to)).toBe(true);
        expect(circleOnMap(zone.to)).toBe(true);
        expect(zone.to.center.x).toBeGreaterThanOrEqual(0);
        expect(zone.to.center.x).toBeLessThanOrEqual(MAP_SIZE);
      }
      expect(zones.some((zone) => zone.isMoving)).toBe(true);
    }
  });
});
