"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { DecisionPanel } from "@/components/decision-panel";
import { FeedbackCard } from "@/components/feedback-card";
import { initialLabState, labReducer, type Overlays } from "@/components/lab-state";
import { MapCanvas } from "@/components/map-canvas";
import { MapErrorBoundary } from "@/components/map-error-boundary";
import { OverlayToggles } from "@/components/overlay-toggles";
import { SessionSummary } from "@/components/session-summary";
import { StartScreen } from "@/components/start-screen";
import { StatePanel } from "@/components/state-panel";
import { Button } from "@/components/ui/button";
import { SECTOR_COUNT } from "@/engine/constants";
import { coachHint } from "@/engine/coach";
import { describeCall, heldCenter } from "@/engine/feedback";
import { getPhaseView } from "@/engine/game";
import { sectorIndex } from "@/engine/geometry";
import { positioningGrid } from "@/engine/analysis";
import { scenarioById } from "@/engine/scenarios";
import type { Engagement, Timing } from "@/engine/types";
import { EMPTY_STATS, mergeStats, readStats, subscribeStats, writeStats } from "@/lib/review";

export function RotationLab() {
  const [state, dispatch] = useReducer(labReducer, initialLabState);
  const stats = useSyncExternalStore(subscribeStats, readStats, () => EMPTY_STATS);
  const [dismissedSummary, setDismissedSummary] = useState<string | null>(null);
  const recorded = useRef<string | null>(null);

  const game = state.game;
  useEffect(() => {
    if (!game || state.animating) return;
    if (game.status !== "dead" && game.status !== "won") return;
    const key = `${game.seed}:${game.history.length}:${game.status}`;
    if (recorded.current === key) return;
    recorded.current = key;
    writeStats(mergeStats(readStats(), game));
  }, [game, state.animating]);

  const finishAnimation = useCallback(() => dispatch({ type: "anim-done" }), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || state.screen !== "play" || !state.game) return;
      const timing = timingKey(event.key);
      if (timing) {
        dispatch({ type: "timing", timing });
        return;
      }
      const engagement = engagementKey(event.key);
      if (engagement) {
        dispatch({ type: "engagement", engagement });
        return;
      }
      if (event.key === "Enter") dispatch({ type: "lock" });
      if (event.key === "n" || event.key === "N") dispatch({ type: "next" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.game, state.screen]);

  const view = useMemo(() => (game ? getPhaseView(game) : null), [game]);
  const heatmap = useMemo(() => {
    if (!view || !state.overlays.heatmap || view.followingRadius === null) return null;
    return positioningGrid(view.zone.to, view.followingRadius, view.heatmapSeed);
  }, [state.overlays.heatmap, view]);

  if (state.screen === "menu" || !game || !view) {
    return (
      <StartScreen
        settings={state.settings}
        stats={stats}
        onSettings={(settings) => dispatch({ type: "settings", settings })}
        onStart={(seed, scenarioId) => dispatch({ type: "start", seed, scenarioId })}
      />
    );
  }

  const last = game.history[game.history.length - 1] ?? null;
  const sectors = game.status === "deciding" || !last ? view.sectors : last.sectors;
  const centerHold = state.destination ? heldCenter(draft(state), view.zone.to) : false;
  const sector =
    state.destination && !centerHold
      ? (sectors[sectorIndex(view.zone.to.center, state.destination, SECTOR_COUNT)] ?? null)
      : null;
  const call = state.destination
    ? describeCall(draft(state), sector, centerHold)
    : "Click the map to pin the rotate.";
  const showFeedback = !state.animating && last && game.status !== "deciding";
  const scenario = scenarioById(state.scenarioId);
  const summaryKey =
    !state.animating && (game.status === "dead" || game.status === "won")
      ? `${game.seed}:${game.history.length}:${game.status}`
      : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col gap-4 px-3 py-3 sm:px-5 sm:py-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Rotation Lab</p>
          <h1 className="text-lg font-semibold">Seed {game.seed}</h1>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "menu" })}>
          Menu
        </Button>
      </header>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-3">
          <div className="relative aspect-square overflow-hidden rounded-xl border bg-[#10141c]">
            <MapErrorBoundary onRestart={() => dispatch({ type: "restart" })}>
              <MapCanvas
                zone={view.zone}
                teams={game.teams}
                destination={state.destination}
                sectors={sectors}
                pull={view.pull}
                heatmap={heatmap}
                showDensity={state.overlays.density}
                showPull={state.overlays.pull}
                disabled={game.status !== "deciding" || state.animating}
                animateFrom={state.animating ? state.animFrom : null}
                onPick={(destination) => dispatch({ type: "destination", destination })}
                onAnimationDone={finishAnimation}
              />
            </MapErrorBoundary>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <OverlayToggles
              overlays={state.overlays}
              onToggle={(key: keyof Overlays) => dispatch({ type: "toggle", key })}
            />
            <p className="text-xs text-muted-foreground">You are yellow. Other trios are gray.</p>
          </div>
        </div>
        <div className="grid gap-3">
          {scenario ? <p className="text-sm text-muted-foreground">{scenario.lesson}</p> : null}
          <StatePanel view={view} teamsAlive={view.teamsAlive} />
          {showFeedback && last ? (
            <FeedbackCard
              result={last}
              canAdvance={game.status === "resolved"}
              onNext={() => dispatch({ type: "next" })}
            />
          ) : (
            <DecisionPanel
              timing={state.timing}
              engagement={state.engagement}
              call={call}
              hint={state.settings.hints && game.status === "deciding" ? coachHint(view) : null}
              canLock={state.destination !== null && game.status === "deciding"}
              busy={state.animating}
              onTiming={(timing) => dispatch({ type: "timing", timing })}
              onEngagement={(engagement) => dispatch({ type: "engagement", engagement })}
              onLock={() => dispatch({ type: "lock" })}
            />
          )}
          {game.status === "dead" || game.status === "won" ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => dispatch({ type: "restart" })}>
                Same seed
              </Button>
              <Button
                type="button"
                onClick={() =>
                  dispatch({
                    type: "start",
                    seed: Math.floor(Math.random() * 1_000_000_000),
                    scenarioId: null,
                  })
                }
              >
                New game
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <SessionSummary
        game={game}
        open={summaryKey !== null && summaryKey !== dismissedSummary}
        onOpenChange={(open) => {
          if (!open && summaryKey) setDismissedSummary(summaryKey);
        }}
        onReplay={() => {
          if (summaryKey) setDismissedSummary(summaryKey);
          dispatch({ type: "restart" });
        }}
        onNewGame={() => {
          if (summaryKey) setDismissedSummary(summaryKey);
          dispatch({ type: "start", seed: Math.floor(Math.random() * 1_000_000_000), scenarioId: null });
        }}
        onMenu={() => {
          if (summaryKey) setDismissedSummary(summaryKey);
          dispatch({ type: "menu" });
        }}
      />
    </div>
  );
}

function draft(state: { destination: { x: number; y: number } | null; timing: Timing; engagement: Engagement }) {
  return {
    destination: state.destination ?? { x: 0, y: 0 },
    timing: state.timing,
    engagement: state.engagement,
  };
}

function timingKey(key: string): Timing | null {
  if (key === "1") return "early";
  if (key === "2") return "standard";
  if (key === "3") return "late";
  return null;
}

function engagementKey(key: string): Engagement | null {
  if (key === "q" || key === "Q") return "avoid";
  if (key === "w" || key === "W") return "tag";
  if (key === "e" || key === "E") return "fight";
  return null;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
