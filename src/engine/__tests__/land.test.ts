import { describe, expect, it } from "vitest";
import { MAP_SIZE } from "../constants";
import { createLobby } from "../lobby";
import { createRng } from "../rng";
import { generateZones } from "../zones";
import { isLandColor, isLandPoint, stayOnLand, type LandMask } from "../land";

describe("island land", () => {
  it("treats ocean blue as water and sand, snow, and rock as land", () => {
    expect(isLandColor(8, 70, 135)).toBe(false);
    expect(isLandColor(5, 94, 186)).toBe(false);
    expect(isLandColor(74, 215, 255)).toBe(false);
    expect(isLandColor(222, 182, 148)).toBe(true);
    expect(isLandColor(255, 223, 189)).toBe(true);
    expect(isLandColor(255, 255, 255)).toBe(true);
    expect(isLandColor(151, 120, 104)).toBe(true);
    expect(isLandColor(0, 0, 0)).toBe(true);
  });

  it("pulls a water drop onto the island and keeps the lobby there", () => {
    const mask = discMask(180);
    const water = { x: 900, y: 500 };
    expect(isLandPoint(mask, water)).toBe(false);
    const landed = stayOnLand(mask, water);
    expect(isLandPoint(mask, landed)).toBe(true);

    const zone = generateZones(createRng(3))[0];
    if (!zone) throw new Error("missing zone");
    const teams = createLobby(createRng(4), zone, { teamCount: 33, fighterWeight: 0.2 }, mask);
    expect(teams.every((team) => isLandPoint(mask, team.pos))).toBe(true);
    const player = teams.find((team) => team.isPlayer);
    expect(player).toBeTruthy();
  });
});

function discMask(radius: number): LandMask {
  const grid = 48;
  const cells = new Uint8Array(grid * grid);
  for (let row = 0; row < grid; row += 1) {
    for (let col = 0; col < grid; col += 1) {
      const x = ((col + 0.5) / grid) * MAP_SIZE;
      const y = MAP_SIZE - ((row + 0.5) / grid) * MAP_SIZE;
      const dx = x - MAP_SIZE / 2;
      const dy = y - MAP_SIZE / 2;
      if (dx * dx + dy * dy <= radius * radius) cells[row * grid + col] = 1;
    }
  }
  return { grid, cells };
}
