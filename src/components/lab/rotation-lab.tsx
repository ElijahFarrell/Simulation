"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowLeftIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { choiceForKey, ENGAGEMENT_CHOICES, TIMING_CHOICES } from "@/components/lab/choices";
import { useIsland } from "@/components/lab/use-island";
import { CoachPanel } from "@/components/lab/coach-panel";
import { DecisionPanel } from "@/components/lab/decision-panel";
import { DropPlan } from "@/components/lab/drop-plan";
import { FeedbackCard } from "@/components/lab/feedback-card";
import { initialLabState, labReducer, type Overlays } from "@/components/lab/lab-state";
import { MapCanvas } from "@/components/lab/map-canvas";
import { MapErrorBoundary } from "@/components/lab/map-error-boundary";
import { OverlayToggles } from "@/components/lab/overlay-toggles";
import { SessionSummary } from "@/components/lab/session-summary";
import { StartScreen } from "@/components/lab/start-screen";
import { StatePanel } from "@/components/lab/state-panel";
import { BrandMark } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ZoneTrack } from "@/components/lab/zone-track";
import { GAME_MODES, ZONE_TABLE } from "@/engine/constants";
import { coachHint } from "@/engine/coach";
import { describeCall, destinationSide } from "@/engine/feedback";
import { getPhaseView, isGameOver } from "@/engine/game";
import { positioningGrid } from "@/engine/analysis";
import { randomSeed } from "@/engine/rng";
import { scenarioById } from "@/engine/scenarios";
import type { LandMask } from "@/engine/types";
import { COACH_API } from "@/lib/coach/constants";
import { buildCoachContext } from "@/lib/coach/context";
import type { Place } from "@/lib/island/project";
import { EMPTY_STATS, mergeStats, readStats, subscribeStats, writeStats } from "@/lib/review";

export function RotationLab() {
  const [state, dispatch] = useReducer(labReducer, initialLabState);
  const stats = useSyncExternalStore(subscribeStats, readStats, () => EMPTY_STATS);
  const [dismissedRun, setDismissedRun] = useState<number | null>(null);
  const [wholeGame, setWholeGame] = useState(false);
  const onPlaces = useCallback((places: Place[]) => dispatch({ type: "places", places }), []);
  const onLand = useCallback((land: LandMask) => dispatch({ type: "land", land }), []);
  const { island, ready } = useIsland(onPlaces, onLand);
  const coachChat = useMemo(
    () =>
      new Chat<UIMessage>({
        id: `coach-${state.runId}`,
        transport: new DefaultChatTransport({ api: COACH_API }),
      }),
    [state.runId],
  );
  const recordedRun = useRef<number | null>(null);

  const game = state.game;
  useEffect(() => {
    if (!game || state.animating || !isGameOver(game) || recordedRun.current === state.runId) return;
    recordedRun.current = state.runId;
    writeStats(mergeStats(readStats(), game));
  }, [game, state.animating, state.runId]);

  const finishAnimation = useCallback(() => dispatch({ type: "anim-done" }), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isTyping(event.target) || state.screen !== "play" || !state.game) return;
      if (event.key === "Enter" && onPlainControl(event.target)) return;
      if (state.planning) {
        if (event.key === "Enter") dispatch({ type: "drop-lock" });
        if (event.key === "Backspace") dispatch({ type: "drop-undo" });
        return;
      }
      const timing = choiceForKey(TIMING_CHOICES, event.key);
      if (timing) {
        dispatch({ type: "timing", timing });
        return;
      }
      const engagement = choiceForKey(ENGAGEMENT_CHOICES, event.key);
      if (engagement) {
        dispatch({ type: "engagement", engagement });
        return;
      }
      if (event.key === "Enter") dispatch({ type: "lock" });
      if (event.key === "n" || event.key === "N") dispatch({ type: "next" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state.game, state.planning, state.screen]);

  const view = useMemo(() => (game ? getPhaseView(game) : null), [game]);
  const heatmap = useMemo(() => {
    if (!view || !state.overlays.heatmap || !view.following) return null;
    return positioningGrid(view.zone.to, view.following, view.heatmapSeed);
  }, [state.overlays.heatmap, view]);

  if (state.screen === "menu" || !game || !view) {
    return (
      <StartScreen
        ready={ready}
        settings={state.settings}
        stats={stats}
        onSettings={(settings) => dispatch({ type: "settings", settings })}
        onStart={(seed, scenarioId) => dispatch({ type: "start", seed, scenarioId })}
      />
    );
  }

  const last = game.history[game.history.length - 1] ?? null;
  const sectors = game.status === "deciding" || !last ? view.sectors : last.sectors;
  const call = state.destination
    ? describeCall(state, destinationSide(state.destination, view.zone.to, sectors))
    : "Tap the map to pick where you go.";
  const showFeedback = !state.animating && last && game.status !== "deciding";
  const scenario = scenarioById(state.scenarioId);
  const closeSummary = () => setDismissedRun(state.runId);
  const newGame = () => dispatch({ type: "start", seed: randomSeed(), scenarioId: null });

  const focusZone = wholeGame ? null : view.zone.index;
  const { others } = GAME_MODES[game.settings.mode];

  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col gap-3 px-3 py-3 sm:px-4 lg:h-dvh lg:max-h-dvh lg:overflow-hidden lg:px-5 lg:py-4">
      <header className="flex shrink-0 items-center gap-3 sm:gap-5">
        <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: "menu" })}>
          <ArrowLeftIcon data-icon="inline-start" />
          Menu
        </Button>
        <h1 className="flex items-center gap-2 text-sm font-semibold">
          <BrandMark className="size-6" />
          <span className="hidden sm:inline">Rotation Lab</span>
        </h1>
        <ZoneTrack
          className="max-w-md flex-1"
          current={view.zone.index}
          total={ZONE_TABLE.length}
          history={game.history}
        />
        <p className="ml-auto font-mono text-xs text-muted-foreground">
          <span className="hidden sm:inline">Seed </span>
          {game.seed}
        </p>
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
                island={island}
                route={state.planning ? state.route : null}
                hidePlayer={state.planning}
                onPick={(point) => dispatch({ type: "pick", point })}
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
            <p className="text-xs text-muted-foreground sm:text-sm">
              {state.planning
                ? `Yellow marks are your drop and loot route. Other ${others} are the white dots.`
                : `You are yellow. Other ${others} are the white dots.`}
            </p>
          </div>
        </div>
        <div className="grid auto-rows-max content-start gap-3 lg:min-h-0 lg:overflow-y-auto lg:pr-1">
          {scenario ? (
            <div className="grid gap-1 rounded-xl border border-brand/25 bg-brand/5 p-3">
              <p className="eyebrow text-brand">Lesson · {scenario.title}</p>
              <p className="text-sm leading-6 text-muted-foreground">{scenario.lesson}</p>
            </div>
          ) : null}
          <StatePanel
            view={view}
            mode={game.settings.mode}
            revealPull={!state.settings.hints || state.pullGuess !== null || game.status !== "deciding"}
          />
          {state.planning ? (
            <DropPlan
              route={state.route}
              places={state.places}
              waitSec={view.zone.waitSec}
              onUndo={() => dispatch({ type: "drop-undo" })}
              onClear={() => dispatch({ type: "drop-clear" })}
              onSkip={() => dispatch({ type: "drop-skip" })}
              onLock={() => dispatch({ type: "drop-lock" })}
            />
          ) : showFeedback && last ? (
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
          {isGameOver(game) ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => dispatch({ type: "restart" })}>
                Same seed
              </Button>
              <Button type="button" onClick={newGame}>
                New game
              </Button>
            </div>
          ) : null}
        </div>
        <CoachPanel
          chat={coachChat}
          context={buildCoachContext(game, focusZone, state.places)}
          wholeGame={wholeGame}
          onWholeGame={setWholeGame}
        />
      </div>
      <SessionSummary
        game={game}
        open={!state.animating && isGameOver(game) && dismissedRun !== state.runId}
        onOpenChange={(open) => {
          if (!open) closeSummary();
        }}
        onReplay={() => {
          closeSummary();
          dispatch({ type: "restart" });
        }}
        onNewGame={() => {
          closeSummary();
          newGame();
        }}
        onMenu={() => {
          closeSummary();
          dispatch({ type: "menu" });
        }}
        onAsk={() => {
          closeSummary();
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

/** The call's radio choices don't use Enter, so it still means Go while one has focus. */
function onPlainControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('button:not([role="radio"]), a') !== null;
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
