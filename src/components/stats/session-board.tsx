"use client";

import { RefreshCwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { SessionPanel } from "@/components/stats/session-panel";
import { Button } from "@/components/ui/button";
import { EventDetail } from "@/components/stats/event-detail";
import { EventsCatalog } from "@/components/stats/events-catalog";
import { NativeSelect } from "@/components/ui/native-select";
import { inRegion } from "@/lib/fortnite/catalog";
import { DEFAULT_REGION, REGIONS, isRegion, type Region, type TournamentSummary } from "@/lib/fortnite/parse";
import { pickDefaultSession, type SessionView } from "@/lib/fortnite/session";
import { useJson } from "@/lib/use-json";
import { cn } from "@/lib/utils";

const REGION_KEY = "hub-region";

function savedRegion(): Region {
  const saved = typeof window === "undefined" ? null : window.localStorage.getItem(REGION_KEY);
  return saved && isRegion(saved) ? saved : DEFAULT_REGION;
}

type Pick = { eventId: string; windowId: string };

export function SessionBoard({ accountId }: { accountId: string | null }) {
  // Only mounts after Convex auth resolves in the browser, so reading localStorage here can't mismatch SSR.
  const [region, setRegion] = useState<Region>(savedRegion);
  const [now, setNow] = useState(() => Date.now());
  const [pick, setPick] = useState<Pick | null>(null);
  const [appliedPoints, setAppliedPoints] = useState("");
  const [refresh, setRefresh] = useState(0);

  const list = useJson<{ tournaments: TournamentSummary[] }>(
    `/api/fortnite/tournaments?region=${region}`,
    "Couldn't load tournaments.",
  );
  const events = list.loading || list.error ? null : (list.data?.tournaments ?? null);
  const defaultPick = useMemo(
    () => (events ? pickDefaultSession(events.filter((item) => inRegion(item, region)), now) : null),
    [events, region, now],
  );
  const selection = pick ?? defaultPick;
  const eventId = selection?.eventId ?? "";
  const windowId = selection?.windowId ?? "";
  const event = events?.find((item) => item.eventId === eventId) ?? null;

  const params = new URLSearchParams({ region, eventId, windowId });
  if (accountId) params.set("accountId", accountId);
  if (appliedPoints) params.set("points", appliedPoints);
  const sessionUrl = eventId && windowId ? `/api/fortnite/session?${params.toString()}` : null;
  const session = useJson<SessionView>(sessionUrl, "Couldn't load that session.", refresh);
  const view = sessionUrl ? session.data : null;
  const error = list.error ?? session.error;

  const busy = list.loading || session.loading;
  const empty = events !== null && events.length === 0;

  function pickEvent(next: string) {
    const picked = events?.find((item) => item.eventId === next);
    const choice = picked ? pickDefaultSession([picked], Date.now()) : null;
    setPick({ eventId: next, windowId: choice?.windowId ?? "" });
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
              setPick(null);
              setAppliedPoints("");
              setNow(Date.now());
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
              setPick(selection);
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
      ) : list.loading ? (
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
            setPick({ eventId, windowId: next });
            setAppliedPoints("");
          }}
        />
      ) : null}

      {view ? (
        <div className={cn("transition-opacity", session.loading && "opacity-60")}>
          <SessionPanel
            key={`${view.title}:${view.windowId}`}
            view={view}
            accountLinked={accountId !== null}
            onPoints={setAppliedPoints}
          />
        </div>
      ) : session.loading ? (
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
