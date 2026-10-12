import { eventDisplay, type EventDisplay } from "./event-display";
import { advancementSpots, summarizeGames, type GameLine, type GameSummary } from "./qualify";

export const REGIONS = ["EU", "NAE", "NAC", "NAW", "BR", "ASIA", "ME", "OCE"] as const;
export type Region = (typeof REGIONS)[number];

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

function record(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stat(stats: Record<string, unknown>, key: string): number {
  const value = num(stats[key]);
  return value ?? 0;
}

function gameFromSession(value: unknown): GameLine | null {
  const session = record(value);
  const stats = session ? record(session.trackedStats) : null;
  if (!stats) return null;
  return {
    damageDealt: stat(stats, "DamageDealt"),
    damageTaken: stat(stats, "DamageReceived"),
    elims: stat(stats, "TEAM_ELIMS_STAT_INDEX"),
    placement: stat(stats, "PLACEMENT_STAT_INDEX"),
  };
}

export function parseTournaments(payload: unknown): TournamentSummary[] {
  const body = record(payload);
  const list = body?.tournaments;
  if (!Array.isArray(list)) return [];
  const tournaments: TournamentSummary[] = [];
  for (const item of list) {
    const event = record(item);
    const eventId = event ? text(event.eventId) : null;
    const display = event ? record(event.displayData) : null;
    const title = (display && (text(display.longFormatTitle) || text(display.titleLine1))) || eventId;
    if (!event || !eventId || !title || !Array.isArray(event.eventWindows)) continue;
    const windows: TournamentWindow[] = [];
    for (const rawWindow of event.eventWindows) {
      const window = record(rawWindow);
      if (!window) continue;
      const locations = Array.isArray(window.scoreLocations) ? window.scoreLocations : [];
      const main =
        locations.map(record).find((location) => location?.isMain === true) ??
        locations.map(record).find((location) => location !== null);
      const leaderboardEventId = main ? text(main.leaderboardEventId) : null;
      const leaderboardEventWindowId = main ? text(main.leaderboardEventWindowId) : null;
      const windowId = text(window.eventWindowId);
      const beginTime = text(window.beginTime);
      const endTime = text(window.endTime);
      if (!windowId || !beginTime || !endTime || !leaderboardEventId || !leaderboardEventWindowId) continue;
      const tables = (Array.isArray(main?.payoutTables) ? main.payoutTables : []).flatMap((table) => {
        const parsed = record(table);
        if (!parsed || typeof parsed.scoringType !== "string" || !Array.isArray(parsed.ranks)) return [];
        return [
          {
            scoringType: parsed.scoringType,
            ranks: parsed.ranks.flatMap((rank) => {
              const row = record(rank);
              const threshold = row ? num(row.threshold) : null;
              if (!row || threshold === null || !Array.isArray(row.payouts)) return [];
              return [
                {
                  threshold,
                  payouts: row.payouts.flatMap((payout) => {
                    const reward = record(payout);
                    const rewardType = reward ? text(reward.rewardType) : null;
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
        matchCap: num(window.matchCap) ?? 0,
        qualSpots: advancementSpots(tables),
        leaderboardEventId,
        leaderboardEventWindowId,
      });
    }
    windows.sort((a, b) => Date.parse(b.beginTime) - Date.parse(a.beginTime));
    const playlists = event.eventWindows.flatMap((raw) => {
      const playlistId = text(record(raw)?.playlistId);
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
  totalPages: number;
  updatedAt: string | null;
} {
  const body = record(payload);
  const board = body ? record(body.leaderboard) : null;
  if (!board || !Array.isArray(board.entries)) {
    throw new Error("Leaderboard format changed.");
  }
  const entries: ParsedEntry[] = [];
  for (const item of board.entries) {
    const entry = record(item);
    if (!entry) continue;
    const rank = num(entry.rank);
    const points = num(entry.pointsEarned);
    const teamId = text(entry.teamId);
    if (rank === null || points === null || !teamId || !Array.isArray(entry.players)) continue;
    const players = entry.players.flatMap((player) => {
      const row = record(player);
      const accountId = row ? text(row.accountId) : null;
      const username = row ? text(row.username) : null;
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
    totalPages: num(board.totalPages) ?? 1,
    updatedAt: text(board.updatedAt),
  };
}

export function parseAccountLookup(payload: unknown): { accountId: string; displayName: string }[] {
  const body = record(payload);
  if (!body || body.success !== true) return [];
  const matches: { accountId: string; displayName: string }[] = [];
  const rows = Array.isArray(body.accounts) ? body.accounts : [];
  for (const item of rows) {
    const row = record(item);
    const details = row ? record(row.accountDetails) : null;
    const accountId = row ? text(row.accountId) : null;
    const displayName = details ? text(details.epic) : null;
    if (!accountId || !displayName) continue;
    matches.push({ accountId: accountId.toLowerCase(), displayName });
  }
  if (matches.length > 0) return matches;
  const accountId = text(body.accountId);
  const details = record(body.accountDetails);
  const displayName = details ? text(details.epic) : null;
  return accountId && displayName ? [{ accountId: accountId.toLowerCase(), displayName }] : [];
}
