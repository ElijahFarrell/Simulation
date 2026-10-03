"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { CoachPanel } from "@/components/coach-dialog";
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
import { COACH_API } from "@/lib/coach/constants";
import { buildCoachContext } from "@/lib/coach/context";
import type { Place } from "@/lib/island/project";
import { EMPTY_STATS, mergeStats, readStats, subscribeStats, writeStats } from "@/lib/review";

type IslandView = { imageUrl: string | null; places: Place[] };

export function RotationLab() {
  const [state, dispatch] = useReducer(labReducer, initialLabState);
  const stats = useSyncExternalStore(subscribeStats, readStats, () => EMPTY_STATS);
  const [dismissedSummary, setDismissedSummary] = useState<string | null>(null);
  const [wholeGame, setWholeGame] = useState(false);
  const [island, setIsland] = useState<IslandView>({ imageUrl: null, places: [] });
  const coachChat = useMemo(
    () =>
      new Chat<UIMessage>({
        id: `coach-${state.runId}`,
        transport: new DefaultChatTransport({ api: COACH_API }),
      }),
    [state.runId],
  );
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
    let cancelled = false;
    void fetch("/api/island")
      .then((response) => response.json())
      .then((payload: unknown) => {
        const next = readIsland(payload);
        if (cancelled || !next) return;
        setIsland(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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
    if (!view || !state.overlays.heatmap || !view.following) return null;
    return positioningGrid(view.zone.to, view.following, view.heatmapSeed);
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
    : "Tap the map to pick where you go.";
  const showFeedback = !state.animating && last && game.status !== "deciding";
  const scenario = scenarioById(state.scenarioId);
  const summaryKey =
    !state.animating && (game.status === "dead" || game.status === "won")
      ? `${game.seed}:${game.history.length}:${game.status}`
      : null;

  const focusZone = wholeGame ? null : view.zone.index;
  const others = game.settings.squadSize === 1 ? "players" : "trios";

  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col gap-3 px-3 py-3 sm:px-4 lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:px-5 lg:py-4">
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">Rotation Lab</p>
          <h1 className="text-lg font-semibold sm:text-xl">Seed {game.seed}</h1>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "menu" })}>
          Menu
        </Button>
      </header>
      <div className="grid items-start gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)_minmax(18rem,24rem)] lg:items-stretch lg:gap-4">
        <div className="flex min-h-0 flex-col gap-2">
          <div className="relative mx-auto aspect-square w-full max-w-[min(100%,62svh)] overflow-hidden rounded-xl border bg-[#10141c] lg:mx-0 lg:aspect-auto lg:h-auto lg:max-w-none lg:min-h-0 lg:flex-1 lg:[container-type:size]">
            <div className="absolute inset-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:h-[min(100cqw,100cqh)] lg:w-[min(100cqw,100cqh)] lg:-translate-x-1/2 lg:-translate-y-1/2">
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
                playerTiming={state.timing}
                imageUrl={island.imageUrl}
                onPick={(destination) => dispatch({ type: "destination", destination })}
                onAnimationDone={finishAnimation}
              />
            </MapErrorBoundary>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <OverlayToggles
              overlays={state.overlays}
              onToggle={(key: keyof Overlays) => dispatch({ type: "toggle", key })}
            />
            <p className="text-xs text-muted-foreground sm:text-sm">You are yellow. Other {others} are the white dots.</p>
          </div>
        </div>
        <div className="grid content-start gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {scenario ? <p className="text-sm text-muted-foreground">{scenario.lesson}</p> : null}
          <StatePanel
            view={view}
            teamsAlive={view.teamsAlive}
            revealPull={!state.settings.hints || state.pullGuess !== null}
          />
          {showFeedback && last ? (
            <FeedbackCard
              result={last}
              canAdvance={game.status === "resolved"}
              onNext={() => dispatch({ type: "next" })}
              onAsk={scrollToCoach}
            />
          ) : (
            <DecisionPanel
              timing={state.timing}
              engagement={state.engagement}
              call={call}
              hint={
                state.settings.hints && game.status === "deciding" && state.pullGuess
                  ? coachHint(view)
                  : null
              }
              pull={view.zone.pull}
              pullGuess={state.pullGuess}
              showQuiz={state.settings.hints && game.status === "deciding"}
              canLock={state.destination !== null && game.status === "deciding"}
              busy={state.animating}
              onTiming={(timing) => dispatch({ type: "timing", timing })}
              onEngagement={(engagement) => dispatch({ type: "engagement", engagement })}
              onGuess={(pull) => dispatch({ type: "guess", pull })}
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
        <CoachPanel
          chat={coachChat}
          context={buildCoachContext(game, focusZone, island.places)}
          wholeGame={wholeGame}
          onWholeGame={setWholeGame}
        />
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
        onAsk={() => {
          if (summaryKey) setDismissedSummary(summaryKey);
          setWholeGame(true);
          scrollToCoach();
        }}
      />
    </div>
  );
}

function scrollToCoach() {
  document.getElementById("coach")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function readIsland(value: unknown): IslandView | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { imageUrl?: unknown; places?: unknown };
  if (record.imageUrl !== null && typeof record.imageUrl !== "string") return null;
  if (!Array.isArray(record.places)) return null;
  const places: Place[] = [];
  for (const entry of record.places) {
    if (!entry || typeof entry !== "object") return null;
    const place = entry as { name?: unknown; x?: unknown; y?: unknown };
    if (typeof place.name !== "string" || typeof place.x !== "number" || typeof place.y !== "number") {
      return null;
    }
    places.push({ name: place.name, x: place.x, y: place.y });
  }
  return { imageUrl: record.imageUrl ?? null, places };
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
