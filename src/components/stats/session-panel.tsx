"use client";

import { useState } from "react";
import { StatTile } from "@/components/stat-tile";
import { ScoreTable, YourGames, ratioText } from "@/components/stats/session-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QualRead } from "@/lib/fortnite/qualify";
import { qualificationHeadline } from "@/lib/fortnite/qualify";
import type { SessionView } from "@/lib/fortnite/session";

function gapTone(read: QualRead): "good" | "bad" | null {
  if (read.status === "in" || (read.pointsOff !== null && read.pointsOff < 0)) return "good";
  if (read.status === "out" && read.pointsOff !== null && read.pointsOff > 0) return "bad";
  return null;
}

function gapFigure(read: QualRead): string {
  if (read.status === "no-line") return "—";
  if (read.pointsOff === null) return read.status === "in" ? "In" : "—";
  if (read.pointsOff > 0) return read.pointsOff.toLocaleString();
  if (read.pointsOff < 0) return `+${Math.abs(read.pointsOff).toLocaleString()}`;
  return read.status === "in" ? "In" : "Tied";
}

function windowRange(begin: string, end: string): string {
  const start = new Date(begin);
  const finish = new Date(end);
  const day = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = (date: Date) => date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} · ${time(start)} – ${time(finish)}`;
}

export function SessionPanel({
  view,
  accountLinked,
  onPoints,
}: {
  view: SessionView;
  accountLinked: boolean;
  onPoints: (points: string) => void;
}) {
  const { read, you } = view;
  const [points, setPoints] = useState("");
  const hasLine = read.status !== "no-line";
  return (
    <div className="grid gap-4">
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
          <div className="grid gap-1.5">
            <p className="eyebrow">{windowRange(view.beginTime, view.endTime)}</p>
            <h2 className="text-lg font-semibold tracking-tight text-balance">{qualificationHeadline(read)}</h2>
          </div>
          {view.status === "live" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
              <span className="size-1.5 rounded-full bg-destructive motion-safe:animate-pulse" />
              Live
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              {view.status === "upcoming" ? "Upcoming" : "Final"}
            </span>
          )}
        </div>
        {hasLine ? (
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatTile
              className="p-5"
              size="lg"
              label={read.pointsOff !== null && read.pointsOff > 0 ? "Points off qual" : "Qual"}
              value={gapFigure(read)}
              tone={gapTone(read)}
              note={read.linePoints !== null ? `Line is ${read.linePoints.toLocaleString()} pts` : undefined}
            />
            <StatTile
              className="p-5"
              size="lg"
              label="Series estimate"
              value={read.seriesEstimate === null ? "—" : read.seriesEstimate.toLocaleString()}
              note={
                read.seriesSampleSize > 0
                  ? `Average cutoff from ${read.seriesSampleSize} earlier window${read.seriesSampleSize === 1 ? "" : "s"} with the same spots.`
                  : "No earlier window with this cutoff yet."
              }
            />
            <StatTile
              className="p-5"
              size="lg"
              label="Your pace"
              value={read.pace?.projectedYou == null ? "—" : read.pace.projectedYou.toLocaleString()}
              note={
                read.pace
                  ? `The line finishes near ${read.pace.projectedLine.toLocaleString()} with ${read.pace.gamesLeft} games left, if points per game hold. A guess, not Fortnite Tracker's number.`
                  : "Shows while the window is open and games are left."
              }
            />
          </div>
        ) : null}
        {hasLine ? (
          <form
            className="flex flex-col gap-2 border-t border-border bg-muted/30 px-5 py-4 sm:flex-row sm:items-end"
            onSubmit={(submit) => {
              submit.preventDefault();
              onPoints(points.trim());
            }}
          >
            <div className="grid flex-1 gap-2">
              <Label htmlFor="points">Your points</Label>
              <Input
                id="points"
                inputMode="numeric"
                className="font-mono"
                value={points}
                placeholder={you ? `${you.points.toLocaleString()} on the board` : "From the in-game scoreboard"}
                onChange={(change) => setPoints(change.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button type="submit" size="lg">
              Check the gap
            </Button>
          </form>
        ) : null}
        {!you && accountLinked && hasLine ? (
          <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
            Not in the top {view.searchedThroughRank.toLocaleString()} checked
            {read.spots && view.searchedThroughRank < read.spots
              ? ". The cutoff row is loaded, but ranks between those pages are not."
              : "."}{" "}
            Enter your points for the exact gap.
          </p>
        ) : null}
      </section>

      {you ? (
        <section className="grid overflow-hidden rounded-2xl border border-you/30 bg-card lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="grid content-start gap-5 border-b border-border bg-you/5 p-5 lg:border-r lg:border-b-0">
            <div className="grid gap-1">
              <p className="eyebrow text-you">Your session</p>
              <p className="truncate text-lg font-semibold" title={you.names}>
                {you.names}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatTile label="Rank" value={`#${you.rank.toLocaleString()}`} tone="you" />
              <StatTile label="Points" value={you.points.toLocaleString()} />
              <StatTile label="Elims" value={you.elims.toLocaleString()} />
              <StatTile
                label="Dmg ratio"
                value={ratioText(you.damageRatio)}
                note={`${you.damageDealt.toLocaleString()} dealt / ${you.damageTaken.toLocaleString()} taken`}
              />
            </div>
          </div>
          {you.matches.length > 0 ? (
            <YourGames games={you.matches} windowId={view.windowId} />
          ) : (
            <p className="p-5 text-sm text-muted-foreground">No scored games yet this session.</p>
          )}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-baseline justify-between gap-3 border-b border-border px-5 py-4">
          <h3 className="font-semibold">Leaderboard</h3>
          <p className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success align-middle" />
            Inside the qual line
          </p>
        </div>
        <ScoreTable rows={view.leaders} spots={read.spots} caption="Top of the leaderboard" />
        {view.bubble.length > 0 ? (
          <>
            <div className="flex items-center gap-3 border-y border-border bg-muted/30 px-5 py-2">
              <span className="eyebrow">Around the cutoff</span>
              {read.spots ? (
                <span className="font-mono text-xs text-muted-foreground">top {read.spots.toLocaleString()}</span>
              ) : null}
            </div>
            <ScoreTable rows={view.bubble} spots={read.spots} caption="Teams around the qual line" />
          </>
        ) : null}
      </section>
    </div>
  );
}
