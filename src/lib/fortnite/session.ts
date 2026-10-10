import { readQualification, type QualRead } from "./qualify";
import type { ParsedEntry, TournamentSummary, TournamentWindow } from "./parse";

export type BoardRow = {
  rank: number;
  points: number;
  names: string;
  games: number;
  elims: number;
  damageDealt: number;
  damageTaken: number;
  damageRatio: number | null;
  avgPlacement: number | null;
  you: boolean;
};

export type YourGame = {
  placement: number;
  elims: number;
  damageDealt: number;
  damageTaken: number;
  damageRatio: number | null;
};

export type SessionView = {
  title: string;
  windowId: string;
  beginTime: string;
  endTime: string;
  matchCap: number;
  windowOpen: boolean;
  updatedAt: string | null;
  searchedThroughRank: number;
  read: QualRead;
  leaders: BoardRow[];
  bubble: BoardRow[];
  you: (BoardRow & { matches: YourGame[] }) | null;
};

const LEADER_COUNT = 15;

/** Prefer the session that most recently started. Future windows wait until nothing has started. */
export function pickDefaultSession(
  tournaments: TournamentSummary[],
  now: number,
): { eventId: string; windowId: string } | null {
  const windows = tournaments.flatMap((event) =>
    event.windows.map((window) => ({ eventId: event.eventId, window })),
  );
  const started = windows.filter((item) => Date.parse(item.window.beginTime) <= now);
  const pool = started.length > 0 ? started : windows;
  pool.sort((a, b) => Date.parse(b.window.beginTime) - Date.parse(a.window.beginTime));
  const best = pool[0];
  return best ? { eventId: best.eventId, windowId: best.window.windowId } : null;
}

function row(entry: ParsedEntry, you: boolean): BoardRow {
  return {
    rank: entry.rank,
    points: entry.points,
    names: entry.names,
    games: entry.summary.games,
    elims: entry.summary.elims,
    damageDealt: entry.summary.damageDealt,
    damageTaken: entry.summary.damageTaken,
    damageRatio: entry.summary.damageRatio,
    avgPlacement: entry.summary.avgPlacement,
    you,
  };
}

export function buildSessionView(input: {
  title: string;
  window: TournamentWindow;
  windowOpen: boolean;
  entries: ParsedEntry[];
  accountId: string | null;
  typedPoints: number | null;
  seriesLinePoints: number[];
  updatedAt: string | null;
  searchedThroughRank: number;
  linePoints: number | null;
  lineGames: number;
}): SessionView {
  const byRank = [...input.entries].sort((a, b) => a.rank - b.rank);
  const accountId = input.accountId?.toLowerCase() ?? null;
  const found = accountId ? byRank.find((entry) => entry.accountIds.includes(accountId)) ?? null : null;
  const scannedTheField =
    input.window.qualSpots !== null && byRank.length > 0 && input.searchedThroughRank >= input.window.qualSpots;
  const typed = input.typedPoints;
  const usingTyped = typed !== null && (found === null || typed !== found.points);
  const yourPoints = typed ?? found?.points ?? null;
  const yourRank = usingTyped ? null : found?.rank ?? null;
  const read = readQualification({
    spots: input.window.qualSpots,
    linePoints: input.linePoints,
    yourPoints,
    yourRank,
    seriesLinePoints: input.seriesLinePoints,
    yourGames: found?.summary.games ?? 0,
    lineGames: input.lineGames,
    matchCap: input.window.matchCap,
    windowOpen: input.windowOpen,
    confirmedOutside: found === null && scannedTheField && !usingTyped && typed === null,
  });

  const youIds = new Set(found ? [found.teamId] : []);
  const leaders = byRank.filter((entry) => entry.rank <= LEADER_COUNT).map((entry) => row(entry, youIds.has(entry.teamId)));
  const spots = input.window.qualSpots;
  const bubble =
    spots === null
      ? []
      : byRank
          .filter((entry) => entry.rank >= spots - 2 && entry.rank <= spots + 2 && entry.rank > LEADER_COUNT)
          .map((entry) => row(entry, youIds.has(entry.teamId)));

  return {
    title: input.title,
    windowId: input.window.windowId,
    beginTime: input.window.beginTime,
    endTime: input.window.endTime,
    matchCap: input.window.matchCap,
    windowOpen: input.windowOpen,
    updatedAt: input.updatedAt,
    searchedThroughRank: input.searchedThroughRank,
    read,
    leaders,
    bubble,
    you: found
      ? {
          ...row(found, true),
          matches: found.games.map((game) => ({
            placement: game.placement,
            elims: game.elims,
            damageDealt: game.damageDealt,
            damageTaken: game.damageTaken,
            damageRatio: game.damageTaken > 0 ? game.damageDealt / game.damageTaken : null,
          })),
        }
      : null,
  };
}
