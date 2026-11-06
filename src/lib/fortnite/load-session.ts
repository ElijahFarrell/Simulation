import { FortniteDataError, leaderboardPage, listTournaments, pagesInParallel } from "./osirion";
import type { Region } from "./parse";
import { buildSessionView, type SessionView } from "./session";

const MAX_SCAN_PAGES = 12;

function pageForRank(rank: number, pageSize: number): number {
  return Math.floor((rank - 1) / pageSize);
}

export async function loadSession(input: {
  region: Region;
  eventId: string;
  windowId: string;
  accountId: string | null;
  typedPoints: number | null;
  now: number;
}): Promise<SessionView> {
  const tournaments = await listTournaments(input.region);
  const event = tournaments.find((item) => item.eventId === input.eventId);
  const window = event?.windows.find((item) => item.windowId === input.windowId);
  if (!event || !window) throw new FortniteDataError("That session isn't listed for this region.");

  const spots = window.qualSpots;
  const first = await leaderboardPage(window.leaderboardEventId, window.leaderboardEventWindowId, 0);
  const pageSize = first.entries.length > 0 ? first.entries.length : 100;
  const cutoffPage = spots ? pageForRank(spots, pageSize) : 0;
  const scanLast = Math.min(MAX_SCAN_PAGES - 1, cutoffPage);
  const pageNumbers = new Set<number>([0]);
  for (let page = 1; page <= scanLast; page += 1) pageNumbers.add(page);
  if (cutoffPage > 0) pageNumbers.add(cutoffPage);

  const rest = [...pageNumbers].filter((page) => page !== 0).sort((a, b) => a - b);
  const more = await pagesInParallel(rest, (page) =>
    leaderboardPage(window.leaderboardEventId, window.leaderboardEventWindowId, page),
  );
  const pages = [first, ...more];
  const seen = new Set<string>();
  const entries = pages.flatMap((page) => page.entries).filter((entry) => {
    if (seen.has(entry.teamId)) return false;
    seen.add(entry.teamId);
    return true;
  });

  const line = spots === null ? null : entries.find((entry) => entry.rank === spots) ?? null;
  const covered = spots !== null && cutoffPage <= scanLast;
  const prefixMax = entries
    .filter((entry) => entry.rank <= (scanLast + 1) * pageSize)
    .reduce((max, entry) => Math.max(max, entry.rank), 0);
  const searchedThroughRank = covered && spots !== null ? spots : prefixMax;

  const earlier = event.windows
    .filter(
      (item) =>
        item.windowId !== window.windowId &&
        item.qualSpots === window.qualSpots &&
        window.qualSpots !== null &&
        Date.parse(item.endTime) <= Date.parse(window.beginTime),
    )
    .slice(0, 3);
  const seriesLinePoints: number[] = [];
  for (const previous of earlier) {
    try {
      const previousPage = await leaderboardPage(
        previous.leaderboardEventId,
        previous.leaderboardEventWindowId,
        pageForRank(previous.qualSpots ?? 1, pageSize),
      );
      const previousLine = previousPage.entries.find((entry) => entry.rank === previous.qualSpots);
      if (previousLine) seriesLinePoints.push(previousLine.points);
    } catch {
      // An older window can be missing without blocking the live line.
    }
  }

  const updatedAt = pages.reduce<string | null>((latest, page) => {
    if (!page.updatedAt) return latest;
    if (!latest || Date.parse(page.updatedAt) > Date.parse(latest)) return page.updatedAt;
    return latest;
  }, null);

  return buildSessionView({
    title: event.title,
    window,
    windowOpen: input.now < Date.parse(window.endTime),
    entries,
    accountId: input.accountId,
    typedPoints: input.typedPoints,
    seriesLinePoints,
    updatedAt,
    searchedThroughRank,
    linePoints: line?.points ?? null,
    lineGames: line?.summary.games ?? 0,
  });
}
