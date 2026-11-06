import { parseAccountLookup, parseLeaderboardPage, parseTournaments, type Region } from "./parse";
import type { ParsedEntry, TournamentSummary } from "./parse";

const BASE = "https://fnapi.osirion.gg";
const TOURNAMENT_TTL_MS = 5 * 60 * 1000;
const BOARD_TTL_MS = 45 * 1000;
const MAX_CALLS_PER_MINUTE = 40;

const cache = new Map<string, { at: number; body: unknown }>();
const calls: number[] = [];

export class FortniteDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FortniteDataError";
  }
}

function takeSlot() {
  const now = Date.now();
  while (calls.length > 0 && calls[0]! < now - 60_000) calls.shift();
  if (calls.length >= MAX_CALLS_PER_MINUTE) {
    throw new FortniteDataError("Tournament data is refreshing. Try again in a minute.");
  }
  calls.push(now);
}

async function cachedJson(url: string, ttlMs: number): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.body;
  takeSlot();
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: { accept: "application/json" },
    });
  } catch {
    throw new FortniteDataError("Tournament data didn't load.");
  }
  if (!response.ok) throw new FortniteDataError("Tournament data didn't load.");
  const body: unknown = await response.json();
  cache.set(url, { at: Date.now(), body });
  return body;
}

export async function listTournaments(region: Region): Promise<TournamentSummary[]> {
  const url = `${BASE}/v1/tournaments?region=${region}&lang=en`;
  return parseTournaments(await cachedJson(url, TOURNAMENT_TTL_MS));
}

export async function leaderboardPage(
  leaderboardEventId: string,
  leaderboardEventWindowId: string,
  page: number,
): Promise<{ entries: ParsedEntry[]; updatedAt: string | null }> {
  const url =
    `${BASE}/v1/tournaments/leaderboard` +
    `?leaderboardEventId=${encodeURIComponent(leaderboardEventId)}` +
    `&leaderboardEventWindowId=${encodeURIComponent(leaderboardEventWindowId)}` +
    `&page=${page}`;
  try {
    return parseLeaderboardPage(await cachedJson(url, BOARD_TTL_MS));
  } catch (error) {
    if (error instanceof FortniteDataError) throw error;
    throw new FortniteDataError("Leaderboard format changed.");
  }
}

export async function lookupAccount(displayName: string): Promise<{ accountId: string; displayName: string }[]> {
  const url = `${BASE}/v1/accounts/lookup-by-display-name?displayName=${encodeURIComponent(displayName)}`;
  return parseAccountLookup(await cachedJson(url, TOURNAMENT_TTL_MS));
}

export async function pagesInParallel<T>(pages: number[], load: (page: number) => Promise<T>): Promise<T[]> {
  const results: T[] = new Array(pages.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(4, pages.length) }, async () => {
    while (next < pages.length) {
      const index = next;
      next += 1;
      const page = pages[index];
      if (page === undefined) continue;
      results[index] = await load(page);
    }
  });
  await Promise.all(workers);
  return results;
}
