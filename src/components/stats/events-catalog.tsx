"use client";

import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { EventCard } from "@/components/stats/event-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { buildCatalog, eventStatus, type CatalogFilter, type EventStatus } from "@/lib/fortnite/catalog";
import type { TournamentSummary } from "@/lib/fortnite/parse";
import { cn } from "@/lib/utils";

const TABS: { value: EventStatus; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

const PAGE = 10;

export function EventsCatalog({
  events,
  region,
  now,
  selectedEventId,
  onSelect,
}: {
  events: TournamentSummary[];
  region: string;
  now: number;
  selectedEventId: string;
  onSelect: (eventId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [hideRanked, setHideRanked] = useState(false);
  const [mode, setMode] = useState<CatalogFilter["mode"]>("all");
  const [shown, setShown] = useState(PAGE);
  const groups = useMemo(
    () => buildCatalog(events, { region, query, hideRanked, mode }, now),
    [events, region, query, hideRanked, mode, now],
  );
  const [tab, setTab] = useState<EventStatus>(() => {
    const selected = events.find((event) => event.eventId === selectedEventId);
    if (selected) return eventStatus(selected, now).status;
    return groups.live.length > 0 ? "live" : "upcoming";
  });
  const items = groups[tab];

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Event status" className="flex gap-1 rounded-lg bg-muted/70 p-1">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => {
                setTab(item.value);
                setShown(PAGE);
              }}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                tab === item.value && "bg-background text-foreground shadow-sm ring-1 ring-foreground/10",
              )}
            >
              {item.value === "live" && groups.live.length > 0 ? (
                <span className="size-1.5 rounded-full bg-destructive motion-safe:animate-pulse" />
              ) : null}
              {item.label}
              <span className="font-mono text-xs text-muted-foreground">{groups[item.value].length}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              aria-label="Search tournaments"
              placeholder="Search cups"
              className="h-9 pl-8"
              value={query}
              onChange={(change) => {
                setQuery(change.target.value);
                setShown(PAGE);
              }}
            />
          </div>
          <Segmented
            aria-label="Build mode"
            value={mode}
            onValueChange={(value) => setMode(value as CatalogFilter["mode"])}
            className="w-auto"
          >
            <SegmentedItem value="all" className="min-h-7 px-2.5 text-xs whitespace-nowrap">
              All
            </SegmentedItem>
            <SegmentedItem value="build" className="min-h-7 px-2.5 text-xs whitespace-nowrap">
              Build
            </SegmentedItem>
            <SegmentedItem value="zero-build" className="min-h-7 px-2.5 text-xs whitespace-nowrap">
              Zero Build
            </SegmentedItem>
          </Segmented>
          <div className="flex items-center gap-2">
            <Switch id="hide-ranked" checked={hideRanked} onCheckedChange={setHideRanked} />
            <Label htmlFor="hide-ranked" className="text-xs whitespace-nowrap text-muted-foreground">
              Hide ranked cups
            </Label>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {query || hideRanked || mode !== "all"
              ? "No cups match those filters."
              : `Nothing ${tab === "live" ? "live" : tab === "upcoming" ? "scheduled" : "finished"} in ${region} right now.`}
          </p>
          {tab === "live" && groups.upcoming.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setTab("upcoming")}>
              See upcoming
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.slice(0, shown).map((item) => (
            <EventCard
              key={item.event.eventId}
              item={item}
              now={now}
              selected={item.event.eventId === selectedEventId}
              onSelect={() => onSelect(item.event.eventId)}
            />
          ))}
        </div>
      )}
      {items.length > shown ? (
        <Button type="button" variant="outline" className="justify-self-center" onClick={() => setShown((count) => count + PAGE * 2)}>
          Show more · {items.length - shown} left
        </Button>
      ) : null}
    </div>
  );
}
