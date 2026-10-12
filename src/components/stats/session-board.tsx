"use client";

import { RefreshCwIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { SessionPanel } from "@/components/stats/session-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { REGIONS, type Region, type TournamentSummary, type TournamentWindow } from "@/lib/fortnite/parse";
import { pickDefaultSession, type SessionView } from "@/lib/fortnite/session";
import { cn } from "@/lib/utils";

function windowLabel(item: TournamentWindow): string {
  const day = new Date(item.beginTime).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${item.windowId}${item.qualSpots ? ` · top ${item.qualSpots.toLocaleString()}` : ""}`;
}

export function SessionBoard({ accountId }: { accountId: string | null }) {
  const [region, setRegion] = useState<Region>("EU");
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
        const picked = pickDefaultSession(body.tournaments, Date.now());
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

  return (
    <section className="grid gap-4" aria-labelledby="sessions-heading" aria-busy={busy}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 id="sessions-heading" className="text-xl font-semibold tracking-tight">
            Tournaments
          </h2>
          <p className="text-sm text-muted-foreground">Live qual line, cutoff history, and the board around you.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={busy || !windowId}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCwIcon data-icon="inline-start" className={cn(busy && "motion-safe:animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[8rem_minmax(0,2fr)_minmax(0,1.4fr)]">
        <div className="grid gap-2">
          <Label htmlFor="region">Region</Label>
          <NativeSelect id="region" value={region} onChange={(change) => setRegion(change.target.value as Region)}>
            {REGIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="event">Tournament</Label>
          <NativeSelect
            id="event"
            value={eventId}
            disabled={!events || events.length === 0}
            onChange={(change) => {
              const next = events?.find((item) => item.eventId === change.target.value);
              const picked = next ? pickDefaultSession([next], Date.now()) : null;
              setEventId(change.target.value);
              setWindowId(picked?.windowId ?? "");
              setAppliedPoints("");
            }}
          >
            {(events ?? []).map((item) => (
              <option key={item.eventId} value={item.eventId}>
                {item.title}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-0 gap-2">
          <Label htmlFor="window">Session</Label>
          <NativeSelect
            id="window"
            value={windowId}
            disabled={!event}
            onChange={(change) => {
              setWindowId(change.target.value);
              setAppliedPoints("");
            }}
          >
            {(event?.windows ?? []).map((item) => (
              <option key={item.windowId} value={item.windowId}>
                {windowLabel(item)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {empty ? (
        <p className="rounded-2xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
          No tournaments listed for {region} right now.
        </p>
      ) : view ? (
        <div className={cn("transition-opacity", loadingSession && "opacity-60")}>
          <SessionPanel
            key={`${view.title}:${view.windowId}`}
            view={view}
            accountLinked={accountId !== null}
            onPoints={setAppliedPoints}
          />
        </div>
      ) : busy ? (
        <SessionSkeleton />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Leaderboard from the Osirion public API. Not affiliated with Epic or Osirion.
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
