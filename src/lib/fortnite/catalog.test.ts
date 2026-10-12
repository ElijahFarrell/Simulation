import { describe, expect, it } from "vitest";
import { buildCatalog, relativeTime, type CatalogFilter } from "./catalog";
import { eventDisplay, stripRegionPrefix } from "./event-display";
import type { TournamentSummary, TournamentWindow } from "./parse";

const NOW = Date.parse("2026-10-12T20:00:00Z");

function window(beginTime: string, endTime: string): TournamentWindow {
  return {
    windowId: beginTime,
    beginTime,
    endTime,
    matchCap: 10,
    qualSpots: null,
    leaderboardEventId: "lb",
    leaderboardEventWindowId: beginTime,
  };
}

function event(eventId: string, title: string, regions: string[], playlists: string[], windows: TournamentWindow[]) {
  const display = eventDisplay({ eventId, title, display: null, regions, playlists });
  return { eventId, title: display.name, windows, display } satisfies TournamentSummary;
}

const ALL: CatalogFilter = { region: "NAC", query: "", hideRanked: false, mode: "all" };

describe("eventDisplay", () => {
  it("reads team size, zero build, and ranked from ids", () => {
    const display = eventDisplay({
      eventId: "epicgames_S42_RankedCupSoloReload_ZB_NAC",
      title: "[NAC] Solo Reload Ranked Cup (Zero Build)",
      display: null,
      regions: ["NAC"],
      playlists: ["Playlist_ShowdownTournament_RE_DashBerryNoBuildSolo_RC"],
    });
    expect(display.name).toBe("Solo Reload Ranked Cup (Zero Build)");
    expect(display.tags).toEqual(["Solo", "Zero Build", "Reload"]);
    expect(display.ranked).toBe(true);
  });

  it("only strips a leading region tag", () => {
    expect(stripRegionPrefix("[NAW] Street Fighter Cup")).toBe("Street Fighter Cup");
    expect(stripRegionPrefix("Cup [NAW]")).toBe("Cup [NAW]");
  });
});

describe("buildCatalog", () => {
  const live = event("live_NAC", "Live Cup", ["NAC"], ["Solo"], [window("2026-10-12T19:00:00Z", "2026-10-12T21:00:00Z")]);
  const soon = event("soon_NAC", "Soon Cup", ["NAC"], ["Duos"], [window("2026-10-13T19:00:00Z", "2026-10-13T21:00:00Z")]);
  const later = event("later_NAC", "Later Cup", ["NAC"], ["Duos"], [window("2026-10-15T19:00:00Z", "2026-10-15T21:00:00Z")]);
  const done = event("done_ZB_NAC", "Done Cup", ["NAC"], ["NoBuildBR_Solo"], [window("2026-10-10T19:00:00Z", "2026-10-10T21:00:00Z")]);
  const west = event("west_NAW", "[NAW] West Cup", ["NAW"], ["Solo"], [window("2026-10-12T19:00:00Z", "2026-10-12T21:00:00Z")]);
  const ranked = event("RankedCupSolo_NAC", "Solo Ranked Cup", ["NAC"], ["Solo"], [window("2026-10-12T19:00:00Z", "2026-10-12T21:00:00Z")]);

  it("splits live, upcoming soonest first, and past", () => {
    const groups = buildCatalog([later, done, soon, live], ALL, NOW);
    expect(groups.live.map((item) => item.event.eventId)).toEqual(["live_NAC"]);
    expect(groups.upcoming.map((item) => item.event.eventId)).toEqual(["soon_NAC", "later_NAC"]);
    expect(groups.past.map((item) => item.event.eventId)).toEqual(["done_ZB_NAC"]);
  });

  it("drops other regions, ranked cups, and the other mode", () => {
    expect(buildCatalog([live, west], ALL, NOW).live).toHaveLength(1);
    expect(buildCatalog([live, ranked], { ...ALL, hideRanked: true }, NOW).live).toHaveLength(1);
    expect(buildCatalog([live, done], { ...ALL, mode: "zero-build" }, NOW).past).toHaveLength(1);
    expect(buildCatalog([live, done], { ...ALL, mode: "zero-build" }, NOW).live).toHaveLength(0);
  });

  it("searches titles and tags", () => {
    expect(buildCatalog([soon, later], { ...ALL, query: "soon duos" }, NOW).upcoming).toHaveLength(1);
  });
});

describe("relativeTime", () => {
  it("reads like a countdown", () => {
    expect(relativeTime(NOW + 7 * 3_600_000, NOW)).toBe("in 7 hrs");
    expect(relativeTime(NOW + 3 * 86_400_000, NOW)).toBe("in 3 days");
    expect(relativeTime(NOW - 20 * 60_000, NOW)).toBe("20 min ago");
  });
});
