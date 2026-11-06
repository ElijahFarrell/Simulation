import { LAN_REGION } from "./event-display";
import type { TournamentSummary } from "./parse";

export type EventStatus = "live" | "upcoming" | "past";

export type CatalogEvent = {
  event: TournamentSummary;
  status: EventStatus;
  /** Live: when the open window ends. Upcoming: next start. Past: last end. */
  at: number;
};

export type CatalogFilter = {
  region: string;
  query: string;
  hideRanked: boolean;
  mode: "all" | "build" | "zero-build";
};

export function windowStatus(window: { beginTime: string; endTime: string }, now: number): EventStatus {
  if (now < Date.parse(window.beginTime)) return "upcoming";
  return now < Date.parse(window.endTime) ? "live" : "past";
}

export function eventStatus(event: TournamentSummary, now: number): CatalogEvent {
  const windows = (status: EventStatus) => event.windows.filter((window) => windowStatus(window, now) === status);
  const live = windows("live");
  if (live.length > 0) return { event, status: "live", at: Math.min(...live.map((window) => Date.parse(window.endTime))) };
  const next = windows("upcoming");
  if (next.length > 0) return { event, status: "upcoming", at: Math.min(...next.map((window) => Date.parse(window.beginTime))) };
  return { event, status: "past", at: Math.max(...event.windows.map((window) => Date.parse(window.endTime))) };
}

/** A region query also returns neighbours (NAC lists NAW cups). Keep the region's own cups and LAN events. */
export function inRegion(event: TournamentSummary, region: string): boolean {
  const regions = event.display?.regions ?? [];
  return regions.length === 0 || regions.includes(region) || regions.includes(LAN_REGION);
}

function matches(event: TournamentSummary, filter: CatalogFilter): boolean {
  const display = event.display;
  if (!inRegion(event, filter.region)) return false;
  if (filter.hideRanked && display?.ranked) return false;
  if (filter.mode === "build" && display?.zeroBuild) return false;
  if (filter.mode === "zero-build" && !display?.zeroBuild) return false;
  const query = filter.query.trim().toLowerCase();
  if (!query) return true;
  const haystack = `${event.title} ${(display?.tags ?? []).join(" ")}`.toLowerCase();
  return query.split(/\s+/).every((word) => haystack.includes(word));
}

export function buildCatalog(
  events: TournamentSummary[],
  filter: CatalogFilter,
  now: number,
): Record<EventStatus, CatalogEvent[]> {
  const groups: Record<EventStatus, CatalogEvent[]> = { live: [], upcoming: [], past: [] };
  for (const event of events) {
    if (!matches(event, filter)) continue;
    const item = eventStatus(event, now);
    groups[item.status].push(item);
  }
  groups.live.sort((a, b) => a.at - b.at);
  groups.upcoming.sort((a, b) => a.at - b.at);
  groups.past.sort((a, b) => b.at - a.at);
  return groups;
}

export function relativeTime(at: number, now: number): string {
  const minutes = Math.round((at - now) / 60_000);
  const future = minutes >= 0;
  const size = Math.abs(minutes);
  let amount: string;
  if (size < 60) amount = `${Math.max(1, size)} min`;
  else if (size < 48 * 60) amount = `${Math.round(size / 60)} hr${Math.round(size / 60) === 1 ? "" : "s"}`;
  else amount = `${Math.round(size / (24 * 60))} days`;
  return future ? `in ${amount}` : `${amount} ago`;
}
