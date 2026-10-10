import { describe, expect, it } from "vitest";
import {
  advancementSpots,
  paceProjection,
  qualificationHeadline,
  readQualification,
  seriesEstimate,
  summarizeGames,
} from "./qualify";

const token = (threshold: number) => ({
  threshold,
  payouts: [{ rewardType: "token" }],
});

describe("advancementSpots", () => {
  it("uses the last rank that still gets an advancement token", () => {
    expect(
      advancementSpots([
        { scoringType: "rank", ranks: [token(7), token(20)] },
        { scoringType: "rank", ranks: [{ threshold: 3, payouts: [{ rewardType: "ecomm" }] }] },
      ]),
    ).toBe(20);
  });

  it("returns null when the window only pays prizes", () => {
    expect(
      advancementSpots([{ scoringType: "rank", ranks: [{ threshold: 8, payouts: [{ rewardType: "ecomm" }] }] }]),
    ).toBeNull();
  });
});

describe("summarizeGames", () => {
  it("sums damage and divides dealt by taken", () => {
    const summary = summarizeGames([
      { damageDealt: 200, damageTaken: 100, elims: 2, placement: 10 },
      { damageDealt: 100, damageTaken: 100, elims: 1, placement: 4 },
    ]);
    expect(summary.damageRatio).toBe(1.5);
    expect(summary.elims).toBe(3);
    expect(summary.avgPlacement).toBe(7);
  });

  it("leaves the ratio empty when no damage was taken", () => {
    expect(summarizeGames([{ damageDealt: 40, damageTaken: 0, elims: 1, placement: 1 }]).damageRatio).toBeNull();
  });
});

describe("readQualification", () => {
  const shared = {
    spots: 1000,
    linePoints: 189,
    seriesLinePoints: [275, 260],
    yourGames: 6,
    lineGames: 8,
    matchCap: 11,
    windowOpen: true,
    confirmedOutside: false,
  };

  it("counts points still short of the live line", () => {
    const read = readQualification({ ...shared, yourPoints: 140, yourRank: 1400 });
    expect(read.status).toBe("out");
    expect(read.pointsOff).toBe(49);
    expect(read.seriesEstimate).toBe(268);
    expect(qualificationHeadline(read)).toBe("49 off qual. Top 1,000 is 189 pts.");
  });

  it("trusts rank over a points tie", () => {
    const inside = readQualification({ ...shared, yourPoints: 189, yourRank: 1000 });
    const outside = readQualification({ ...shared, yourPoints: 189, yourRank: 1001 });
    expect(inside.status).toBe("in");
    expect(outside.status).toBe("out");
  });

  it("calls an equal score a tie when rank is unknown", () => {
    const read = readQualification({ ...shared, yourPoints: 189, yourRank: null });
    expect(read.status).toBe("tied");
    expect(qualificationHeadline(read)).toContain("Tied");
  });

  it("marks a scanned player outside even before they type points", () => {
    const read = readQualification({
      ...shared,
      yourPoints: null,
      yourRank: null,
      confirmedOutside: true,
    });
    expect(read.status).toBe("out");
    expect(read.pointsOff).toBeNull();
    expect(qualificationHeadline(read)).toContain("Outside the top 1,000");
  });

  it("does not invent a pace once the match cap is used", () => {
    expect(
      paceProjection({
        yourPoints: 140,
        yourGames: 11,
        linePoints: 189,
        lineGames: 11,
        matchCap: 11,
        windowOpen: true,
      }),
    ).toBeNull();
  });

  it("projects both paces from points per game while the window is open", () => {
    const pace = paceProjection({
      yourPoints: 60,
      yourGames: 3,
      linePoints: 80,
      lineGames: 4,
      matchCap: 10,
      windowOpen: true,
    });
    expect(pace).toEqual({ projectedYou: 200, projectedLine: 200, gamesLeft: 6 });
  });

  it("averages nothing when there is no earlier window", () => {
    expect(seriesEstimate([])).toBeNull();
  });
});
