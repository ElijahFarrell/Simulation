"use client";

import { RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SessionPanel } from "@/components/stats/session-panel";
import { Button } from "@/components/ui/button";
import { EventDetail } from "@/components/stats/event-detail";
import { EventsCatalog } from "@/components/stats/events-catalog";
import { NativeSelect } from "@/components/ui/native-select";
import { inRegion } from "@/lib/fortnite/catalog";
import { REGIONS, isRegion, type Region, type TournamentSummary } from "@/lib/fortnite/parse";
import { pickDefaultSession, type SessionView } from "@/lib/fortnite/session";
import { cn } from "@/lib/utils";

const REGION_KEY = "hub-region";

function savedRegion(): Region {
  const saved = typeof window === "undefined" ? null : window.localStorage.getItem(REGION_KEY);
  return saved && isRegion(saved) ? saved : "EU";
}

export function SessionBoard({ accountId }: { accountId: string | null }) {
  // Only mounts after Convex auth resolves in the browser, so reading localStorage here can't mismatch SSR.
  const [region, setRegion] = useState<Region>(savedRegion);
  const [now, setNow] = useState(() => Date.now());
  const [events, setEvents] = useState<TournamentSummary[] | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [windowId, setWindowId] = useState<string>("");
  const [appliedPoints, setAppliedPoints] = useState("");
  const [view, setView] = useState<SessionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const event = events?.find((item) => item.eventId === eventId) ?? null;

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError(null);
    void fetch(`/api/fortnite/tournaments?region=${region}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<{ tournaments: TournamentSummary[] }>;
      })
      .then((body) => {
        if (cancelled) return;
        setEvents(body.tournaments);
        setNow(Date.now());
        const picked = pickDefaultSession(
          body.tournaments.filter((item) => inRegion(item, region)),
          Date.now(),
        );
        setEventId(picked?.eventId ?? "");
        setWindowId(picked?.windowId ?? "");
        setAppliedPoints("");
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Couldn't load tournaments.");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region]);

  useEffect(() => {
    if (!eventId || !windowId) return;
    let cancelled = false;
    const params = new URLSearchParams({ region, eventId, windowId });
    if (accountId) params.set("accountId", accountId);
    if (appliedPoints) params.set("points", appliedPoints);
    setLoadingSession(true);
    setError(null);
    void fetch(`/api/fortnite/session?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<SessionView>;
      })
      .then((body) => {
        if (!cancelled) setView(body);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Couldn't load that session.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });
    return () => {
      cancelled = true;
    };
  }, [region, eventId, windowId, accountId, appliedPoints, refresh]);

  const busy = loadingList || loadingSession;
  const empty = events !== null && events.length === 0;

  function pickEvent(next: string) {
    const picked = events?.find((item) => item.eventId === next);
    const choice = picked ? pickDefaultSession([picked], Date.now()) : null;
    setEventId(next);
    setWindowId(choice?.windowId ?? "");
    setAppliedPoints("");
    requestAnimationFrame(() =>
      document.getElementById("event-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  return (
    <section className="grid gap-5" aria-labelledby="sessions-heading" aria-busy={busy}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="sessions-heading" className="text-xl font-semibold tracking-tight">
            Tournaments
          </h2>
          <p className="text-sm text-muted-foreground">Pick a cup to see the qual line and the board around you.</p>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            aria-label="Region"
            className="w-28"
            value={region}
            onChange={(change) => {
              const next = change.target.value as Region;
              window.localStorage.setItem(REGION_KEY, next);
              setRegion(next);
            }}
          >
            {REGIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy || !windowId}
            onClick={() => {
              setNow(Date.now());
              setRefresh((value) => value + 1);
            }}
          >
            <RefreshCwIcon data-icon="inline-start" className={cn(busy && "motion-safe:animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {events && !empty ? (
        <EventsCatalog
          key={region}
          events={events}
          region={region}
          now={now}
          selectedEventId={eventId}
          onSelect={pickEvent}
        />
      ) : loadingList ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-hidden>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : empty ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          No tournaments listed for {region} right now.
        </p>
      ) : null}

      {event ? (
        <EventDetail
          event={event}
          windowId={windowId}
          now={now}
          onWindow={(next) => {
            setWindowId(next);
            setAppliedPoints("");
          }}
        />
      ) : null}

      {view ? (
        <div className={cn("transition-opacity", loadingSession && "opacity-60")}>
          <SessionPanel
            key={`${view.title}:${view.windowId}`}
            view={view}
            accountLinked={accountId !== null}
            onPoints={setAppliedPoints}
          />
        </div>
      ) : loadingSession ? (
        <SessionSkeleton />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Tournaments and leaderboards from the Osirion public API. Not affiliated with Epic or Osirion.
        {view?.updatedAt ? ` Updated ${new Date(view.updatedAt).toLocaleTimeString()}.` : ""}
      </p>
    </section>
  );
}

function SessionSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <div className="h-64 animate-pulse rounded-2xl bg-card" />
      <div className="h-96 animate-pulse rounded-2xl bg-card" />
    </div>
  );
}
