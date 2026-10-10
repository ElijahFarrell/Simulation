"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { REGIONS, type Region, type TournamentSummary } from "@/lib/fortnite/parse";
import type { QualRead } from "@/lib/fortnite/qualify";
import { qualificationHeadline } from "@/lib/fortnite/qualify";
import { pickDefaultSession, type BoardRow, type SessionView } from "@/lib/fortnite/session";

const fieldClass = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm";

function ratioText(ratio: number | null): string {
  return ratio === null ? "—" : ratio.toFixed(2);
}

function gapTone(read: QualRead): string {
  if (read.status === "in" || (read.pointsOff !== null && read.pointsOff < 0)) return "text-emerald-400";
  if (read.status === "out" && read.pointsOff !== null && read.pointsOff > 0) return "text-destructive";
  return "text-foreground";
}

function gapFigure(read: QualRead): string {
  if (read.status === "no-line") return "—";
  if (read.pointsOff === null) return read.status === "in" ? "In" : "—";
  if (read.pointsOff > 0) return read.pointsOff.toLocaleString();
  if (read.pointsOff < 0) return `+${Math.abs(read.pointsOff).toLocaleString()}`;
  return read.status === "in" ? "In" : "Tied";
}

function ScoreTable({ rows }: { rows: BoardRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className="px-3 py-2 font-medium">Rank</th>
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-3 py-2 font-medium">Pts</th>
            <th className="px-3 py-2 font-medium">Games</th>
            <th className="px-3 py-2 font-medium">Elims</th>
            <th className="px-3 py-2 font-medium">Dealt</th>
            <th className="px-3 py-2 font-medium">Taken</th>
            <th className="px-3 py-2 font-medium">Ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.rank}-${row.names}`}
              className={row.you ? "bg-emerald-400/10" : "border-b border-border/70"}
            >
              <td className="px-3 py-2 tabular-nums">{row.rank.toLocaleString()}</td>
              <td className="px-3 py-2">{row.names}</td>
              <td className="px-3 py-2 tabular-nums">{row.points.toLocaleString()}</td>
              <td className="px-3 py-2 tabular-nums">{row.games}</td>
              <td className="px-3 py-2 tabular-nums">{row.elims.toLocaleString()}</td>
              <td className="px-3 py-2 tabular-nums">{row.damageDealt.toLocaleString()}</td>
              <td className="px-3 py-2 tabular-nums">{row.damageTaken.toLocaleString()}</td>
              <td className="px-3 py-2 tabular-nums">{ratioText(row.damageRatio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SessionBoard({ accountId }: { accountId: string | null }) {
  const [region, setRegion] = useState<Region>("EU");
  const [events, setEvents] = useState<TournamentSummary[] | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [windowId, setWindowId] = useState<string>("");
  const [points, setPoints] = useState("");
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
        setPoints("");
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

  const read = view?.read;

  return (
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="region">Region</Label>
          <select
            id="region"
            className={fieldClass}
            value={region}
            onChange={(event) => setRegion(event.target.value as Region)}
          >
            {REGIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="event">Tournament</Label>
          <select
            id="event"
            className={fieldClass}
            value={eventId}
            disabled={!events || events.length === 0}
            onChange={(change) => {
              const next = events?.find((item) => item.eventId === change.target.value);
              const picked = next ? pickDefaultSession([next], Date.now()) : null;
              setEventId(change.target.value);
              setWindowId(picked?.windowId ?? "");
              setPoints("");
              setAppliedPoints("");
            }}
          >
            {(events ?? []).map((item) => (
              <option key={item.eventId} value={item.eventId}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="window">Session</Label>
          <select
            id="window"
            className={fieldClass}
            value={windowId}
            disabled={!event}
            onChange={(change) => {
              setWindowId(change.target.value);
              setPoints("");
              setAppliedPoints("");
            }}
          >
            {(event?.windows ?? []).map((item) => (
              <option key={item.windowId} value={item.windowId}>
                {item.windowId}
                {item.qualSpots ? ` · top ${item.qualSpots.toLocaleString()}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingList ? <p className="text-sm text-muted-foreground">Loading tournaments…</p> : null}
      {loadingSession ? <p className="text-sm text-muted-foreground">Loading the leaderboard…</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {read && view ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="grid gap-1">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Session</p>
              <h2 className="text-lg font-semibold tracking-tight">{view.title}</h2>
              <p className="text-sm text-muted-foreground">{qualificationHeadline(read)}</p>
            </div>
            <Badge variant="outline">{view.windowOpen ? "Live" : "Final"}</Badge>
          </div>
          <div className="grid sm:grid-cols-3">
            <div className="grid gap-1 border-b border-border px-4 py-4 sm:border-r sm:border-b-0">
              <p className="text-xs text-muted-foreground">{read.pointsOff !== null && read.pointsOff > 0 ? "Points off" : "Qual"}</p>
              <p className={`text-4xl font-semibold tabular-nums tracking-tight ${gapTone(read)}`}>{gapFigure(read)}</p>
            </div>
            <div className="grid gap-1 border-b border-border px-4 py-4 sm:border-r sm:border-b-0">
              <p className="text-xs text-muted-foreground">Series estimate</p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {read.seriesEstimate === null ? "—" : read.seriesEstimate.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {read.seriesSampleSize > 0
                  ? `Average cutoff from ${read.seriesSampleSize} earlier window${read.seriesSampleSize === 1 ? "" : "s"} with the same spots.`
                  : "No earlier window with this cutoff yet."}
              </p>
            </div>
            <div className="grid gap-1 px-4 py-4">
              <p className="text-xs text-muted-foreground">Pace</p>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {read.pace?.projectedYou == null ? "—" : read.pace.projectedYou.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {read.pace
                  ? `If this points-per-game holds, the line finishes near ${read.pace.projectedLine.toLocaleString()} with ${read.pace.gamesLeft} games left. A pace guess, not Fortnite Tracker's number.`
                  : "Pace shows while the window is open and the match cap isn't used up."}
              </p>
            </div>
          </div>
          {view.you ? (
            <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
              {view.you.names} · rank {view.you.rank.toLocaleString()} · damage ratio {ratioText(view.you.damageRatio)} (
              {view.you.damageDealt.toLocaleString()} dealt / {view.you.damageTaken.toLocaleString()} taken). Ratio is
              dealt divided by taken across scored games.
            </p>
          ) : null}
          <form
            className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-end"
            onSubmit={(submit) => {
              submit.preventDefault();
              setAppliedPoints(points.trim());
            }}
          >
            <div className="grid flex-1 gap-2">
              <Label htmlFor="points">Your points</Label>
              <Input
                id="points"
                inputMode="numeric"
                value={points}
                placeholder={view.you ? `${view.you.points.toLocaleString()} on the board` : "From the in-game scoreboard"}
                onChange={(change) => setPoints(change.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button type="submit">Check the gap</Button>
          </form>
          {!view.you && accountId ? (
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              Not in the top {view.searchedThroughRank.toLocaleString()} checked
              {view.read.spots && view.searchedThroughRank < view.read.spots
                ? ". The cutoff row is loaded, but ranks between those pages are not."
                : "."}{" "}
              Enter your points for the exact gap.
            </p>
          ) : null}
          <ScoreTable rows={view.leaders} />
          {view.bubble.length > 0 ? (
            <>
              <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Around the cutoff</p>
              <ScoreTable rows={view.bubble} />
            </>
          ) : null}
          {view.you && view.you.matches.length > 0 ? (
            <div className="border-t border-border">
              <p className="px-4 py-2 text-xs text-muted-foreground">Your games</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="px-3 py-2 font-medium">Game</th>
                      <th className="px-3 py-2 font-medium">Place</th>
                      <th className="px-3 py-2 font-medium">Elims</th>
                      <th className="px-3 py-2 font-medium">Dealt</th>
                      <th className="px-3 py-2 font-medium">Taken</th>
                      <th className="px-3 py-2 font-medium">Ratio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.you.matches.map((game, index) => (
                      <tr key={`${view.windowId}-${index}`} className="border-b border-border/70">
                        <td className="px-3 py-2 tabular-nums">{index + 1}</td>
                        <td className="px-3 py-2 tabular-nums">{game.placement}</td>
                        <td className="px-3 py-2 tabular-nums">{game.elims}</td>
                        <td className="px-3 py-2 tabular-nums">{game.damageDealt.toLocaleString()}</td>
                        <td className="px-3 py-2 tabular-nums">{game.damageTaken.toLocaleString()}</td>
                        <td className="px-3 py-2 tabular-nums">{ratioText(game.damageRatio)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-muted-foreground">
            <p>
              Leaderboard from the Osirion public API. Not affiliated with Epic or Osirion.
              {view.updatedAt ? ` Updated ${new Date(view.updatedAt).toLocaleTimeString()}.` : ""}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRefresh((value) => value + 1)}>
              Refresh
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
