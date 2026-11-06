import { asRecord, finiteNumber, nonEmptyString } from "@/lib/json";
import { eventDisplay, type EventDisplay } from "./event-display";
import { advancementSpots, summarizeGames, type GameLine, type GameSummary } from "./qualify";

export const REGIONS = ["EU", "NAE", "NAC", "NAW", "BR", "ASIA", "ME", "OCE"] as const;
export type Region = (typeof REGIONS)[number];

export const DEFAULT_REGION: Region = "EU";

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

export type TournamentWindow = {
  windowId: string;
  beginTime: string;
  endTime: string;
  matchCap: number;
  qualSpots: number | null;
  leaderboardEventId: string;
  leaderboardEventWindowId: string;
};

export type TournamentSummary = {
  eventId: string;
  title: string;
  windows: TournamentWindow[];
  display?: EventDisplay;
};

export type ParsedEntry = {
  teamId: string;
  rank: number;
  points: number;
  names: string;
  accountIds: string[];
  summary: GameSummary;
  games: GameLine[];
};

function stat(stats: Record<string, unknown>, key: string): number {
  return finiteNumber(stats[key]) ?? 0;
}

function gameFromSession(value: unknown): GameLine | null {
  const session = asRecord(value);
  const stats = session ? asRecord(session.trackedStats) : null;
  if (!stats) return null;
  return {
    damageDealt: stat(stats, "DamageDealt"),
    damageTaken: stat(stats, "DamageReceived"),
    elims: stat(stats, "TEAM_ELIMS_STAT_INDEX"),
    placement: stat(stats, "PLACEMENT_STAT_INDEX"),
  };
}

export function parseTournaments(payload: unknown): TournamentSummary[] {
  const body = asRecord(payload);
  const list = body?.tournaments;
  if (!Array.isArray(list)) return [];
  const tournaments: TournamentSummary[] = [];
  for (const item of list) {
    const event = asRecord(item);
    const eventId = event ? nonEmptyString(event.eventId) : null;
    const display = event ? asRecord(event.displayData) : null;
    const title = (display && (nonEmptyString(display.longFormatTitle) || nonEmptyString(display.titleLine1))) || eventId;
    if (!event || !eventId || !title || !Array.isArray(event.eventWindows)) continue;
    const windows: TournamentWindow[] = [];
    for (const rawWindow of event.eventWindows) {
      const window = asRecord(rawWindow);
      if (!window) continue;
      const locations = Array.isArray(window.scoreLocations) ? window.scoreLocations : [];
      const main =
        locations.map(asRecord).find((location) => location?.isMain === true) ??
        locations.map(asRecord).find((location) => location !== null);
      const leaderboardEventId = main ? nonEmptyString(main.leaderboardEventId) : null;
      const leaderboardEventWindowId = main ? nonEmptyString(main.leaderboardEventWindowId) : null;
      const windowId = nonEmptyString(window.eventWindowId);
      const beginTime = nonEmptyString(window.beginTime);
      const endTime = nonEmptyString(window.endTime);
      if (!windowId || !beginTime || !endTime || !leaderboardEventId || !leaderboardEventWindowId) continue;
      const tables = (Array.isArray(main?.payoutTables) ? main.payoutTables : []).flatMap((table) => {
        const parsed = asRecord(table);
        if (!parsed || typeof parsed.scoringType !== "string" || !Array.isArray(parsed.ranks)) return [];
        return [
          {
            scoringType: parsed.scoringType,
            ranks: parsed.ranks.flatMap((rank) => {
              const row = asRecord(rank);
              const threshold = row ? finiteNumber(row.threshold) : null;
              if (!row || threshold === null || !Array.isArray(row.payouts)) return [];
              return [
                {
                  threshold,
                  payouts: row.payouts.flatMap((payout) => {
                    const reward = asRecord(payout);
                    const rewardType = reward ? nonEmptyString(reward.rewardType) : null;
                    return rewardType ? [{ rewardType }] : [];
                  }),
                },
              ];
            }),
          },
        ];
      });
      windows.push({
        windowId,
        beginTime,
        endTime,
        matchCap: finiteNumber(window.matchCap) ?? 0,
        qualSpots: advancementSpots(tables),
        leaderboardEventId,
        leaderboardEventWindowId,
      });
    }
    windows.sort((a, b) => Date.parse(b.beginTime) - Date.parse(a.beginTime));
    const playlists = event.eventWindows.flatMap((raw) => {
      const playlistId = nonEmptyString(asRecord(raw)?.playlistId);
      return playlistId ? [playlistId] : [];
    });
    const shown = eventDisplay({ eventId, title, display, regions: event.regions, playlists });
    if (windows.length > 0) tournaments.push({ eventId, title: shown.name, windows, display: shown });
  }
  tournaments.sort((a, b) => Date.parse(b.windows[0]?.beginTime ?? "") - Date.parse(a.windows[0]?.beginTime ?? ""));
  return tournaments;
}

export function parseLeaderboardPage(payload: unknown): {
  entries: ParsedEntry[];
  updatedAt: string | null;
} {
  const body = asRecord(payload);
  const board = body ? asRecord(body.leaderboard) : null;
  if (!board || !Array.isArray(board.entries)) {
    throw new Error("Leaderboard format changed.");
  }
  const entries: ParsedEntry[] = [];
  for (const item of board.entries) {
    const entry = asRecord(item);
    if (!entry) continue;
    const rank = finiteNumber(entry.rank);
    const points = finiteNumber(entry.pointsEarned);
    const teamId = nonEmptyString(entry.teamId);
    if (rank === null || points === null || !teamId || !Array.isArray(entry.players)) continue;
    const players = entry.players.flatMap((player) => {
      const row = asRecord(player);
      const accountId = row ? nonEmptyString(row.accountId) : null;
      const username = row ? nonEmptyString(row.username) : null;
      return accountId && username ? [{ accountId: accountId.toLowerCase(), username }] : [];
    });
    if (players.length === 0) continue;
    const games = (Array.isArray(entry.sessionHistory) ? entry.sessionHistory : []).flatMap((session) => {
      const game = gameFromSession(session);
      return game ? [game] : [];
    });
    entries.push({
      teamId,
      rank,
      points,
      names: players.map((player) => player.username).join(" / "),
      accountIds: players.map((player) => player.accountId),
      summary: summarizeGames(games),
      games,
    });
  }
  return {
    entries,
    updatedAt: nonEmptyString(board.updatedAt),
  };
}

export function parseAccountLookup(payload: unknown): { accountId: string; displayName: string }[] {
  const body = asRecord(payload);
  if (!body || body.success !== true) return [];
  const matches: { accountId: string; displayName: string }[] = [];
  const rows = Array.isArray(body.accounts) ? body.accounts : [];
  for (const item of rows) {
    const row = asRecord(item);
    const details = row ? asRecord(row.accountDetails) : null;
    const accountId = row ? nonEmptyString(row.accountId) : null;
    const displayName = details ? nonEmptyString(details.epic) : null;
    if (!accountId || !displayName) continue;
    matches.push({ accountId: accountId.toLowerCase(), displayName });
  }
  if (matches.length > 0) return matches;
  const accountId = nonEmptyString(body.accountId);
  const details = asRecord(body.accountDetails);
  const displayName = details ? nonEmptyString(details.epic) : null;
  return accountId && displayName ? [{ accountId: accountId.toLowerCase(), displayName }] : [];
}
