import { describe, expect, it } from "vitest";
import type { ParsedEntry, TournamentWindow } from "./parse";
import { buildSessionView, pickDefaultSession } from "./session";

function entry(rank: number, points: number, accountId: string): ParsedEntry {
  return {
    teamId: accountId,
    rank,
    points,
    names: accountId,
    accountIds: [accountId],
    summary: {
      games: 4,
      elims: rank === 1000 ? 20 : 8,
      damageDealt: 1000,
      damageTaken: 800,
      damageRatio: 1.25,
      avgPlacement: 12,
    },
    games: [{ damageDealt: 1000, damageTaken: 800, elims: 8, placement: 12 }],
  };
}

const window: TournamentWindow = {
  windowId: "round-2",
  beginTime: "2026-10-10T17:00:00Z",
  endTime: "2026-10-10T20:00:00Z",
  matchCap: 11,
  qualSpots: 1000,
  leaderboardEventId: "event",
  leaderboardEventWindowId: "round-2",
};

describe("pickDefaultSession", () => {
  it("opens the session that started most recently, skipping ones that have not begun", () => {
    const picked = pickDefaultSession(
      [
        {
          eventId: "finals",
          title: "Finals",
          windows: [{ ...window, windowId: "finals-day", beginTime: "2026-10-12T17:00:00Z", endTime: "2026-10-12T21:00:00Z" }],
        },
        {
          eventId: "quals",
          title: "Quals",
          windows: [{ ...window, windowId: "round-2", beginTime: "2026-10-10T17:00:00Z" }],
        },
      ],
      Date.parse("2026-10-10T22:00:00Z"),
    );
    expect(picked).toEqual({ eventId: "quals", windowId: "round-2" });
  });
});

describe("buildSessionView", () => {
  it("pins you and the cutoff without dumping the whole field", () => {
    const view = buildSessionView({
      title: "FNCS",
      window,
      status: "past",
      entries: [entry(1, 500, "a".repeat(32)), entry(1000, 189, "b".repeat(32)), entry(16, 400, "c".repeat(32))],
      accountId: "c".repeat(32),
      typedPoints: null,
      seriesLinePoints: [275],
      updatedAt: null,
      searchedThroughRank: 1000,
      linePoints: 189,
      lineGames: 8,
    });
    expect(view.you?.rank).toBe(16);
    expect(view.you?.matches).toHaveLength(1);
    expect(view.leaders.map((row) => row.rank)).toEqual([1]);
    expect(view.bubble.map((row) => row.rank)).toEqual([1000]);
    expect(view.read.pointsOff).toBe(189 - 400);
    expect(view.read.status).toBe("in");
    expect(view.read.seriesEstimate).toBe(275);
    expect(view.read.pace).toBeNull();
  });
});
