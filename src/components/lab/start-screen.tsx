"use client";

import { ArrowRightIcon, MapPinIcon, SwordsIcon, TimerIcon } from "lucide-react";
import { LobbySetup } from "@/components/lab/lobby-setup";
import { MapLegend } from "@/components/lab/map-legend";
import { SiteHeader } from "@/components/site-header";
import { StatTile } from "@/components/stat-tile";
import type { LabSettings } from "@/components/lab/lab-state";
import { ZONE_TABLE } from "@/engine/constants";
import { SCENARIOS } from "@/engine/scenarios";
import type { SavedStats } from "@/lib/review";
import { lifetimeHabit } from "@/lib/review";

const CALLS = [
  { icon: MapPinIcon, title: "Where", line: "Pin the spot you rotate to." },
  { icon: TimerIcon, title: "When", line: "Leave now, mid, or after loot." },
  { icon: SwordsIcon, title: "Contact", line: "Avoid, tag, or take the fight." },
];

export function StartScreen({
  ready,
  settings,
  stats,
  onSettings,
  onStart,
}: {
  ready: boolean;
  settings: LabSettings;
  stats: SavedStats;
  onSettings: (settings: LabSettings) => void;
  onStart: (seed: number, scenarioId: string | null) => void;
}) {
  return (
    <div className="page-glow min-h-dvh">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-14 px-4 py-10 sm:py-14">
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-x-14">
          <div className="grid gap-4">
              <p className="eyebrow text-brand">Solos and trios IGL practice</p>
              <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Make the call before the zone does.
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {ZONE_TABLE.length} zones, like a real game. Each reveal you name the pull, then make three calls. The
                sim plays it out and grades the decision.
              </p>
          </div>
          <LobbySetup
            className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
            ready={ready}
            settings={settings}
            onSettings={onSettings}
            onStart={(seed) => onStart(seed, null)}
          />
          <div className="grid gap-8">
            <ol className="grid gap-3 sm:grid-cols-3">
              {CALLS.map((call, index) => (
                <li key={call.title} className="grid gap-2 rounded-xl border border-border bg-card/60 p-4">
                  <div className="flex items-center justify-between">
                    <call.icon className="size-4 text-brand" aria-hidden />
                    <span className="font-mono text-xs text-muted-foreground">0{index + 1}</span>
                  </div>
                  <p className="text-sm font-semibold">{call.title}</p>
                  <p className="text-sm text-muted-foreground">{call.line}</p>
                </li>
              ))}
            </ol>
            <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4">
              <p className="eyebrow">Reading the map</p>
              <MapLegend />
            </div>
            {stats.games > 0 ? <Record stats={stats} /> : null}
          </div>
        </section>

        <section className="grid gap-4" aria-labelledby="lessons-heading">
          <div className="flex items-end justify-between gap-4">
            <div className="grid gap-1">
              <h2 id="lessons-heading" className="text-xl font-semibold tracking-tight">
                Lessons
              </h2>
              <p className="text-sm text-muted-foreground">Fixed seeds, so you can run the same lobby until it clicks.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCENARIOS.map((scenario, index) => (
              <button
                key={scenario.id}
                type="button"
                disabled={!ready}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors outline-none disabled:pointer-events-none disabled:opacity-60 hover:border-brand/40 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => onStart(scenario.seed, scenario.id)}
              >
                <span className="font-mono text-xs text-brand">Lesson {index + 1}</span>
                <span className="text-base font-semibold leading-snug">{scenario.title}</span>
                <span className="text-sm leading-6 text-muted-foreground">{scenario.lesson}</span>
                <span className="mt-auto flex items-center gap-1 pt-1 text-sm font-medium text-foreground/80 group-hover:text-brand">
                  Play seed {scenario.seed}
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Record({ stats }: { stats: SavedStats }) {
  const habit = lifetimeHabit(stats);
  return (
    <div className="grid gap-4 rounded-xl border border-border bg-card/40 p-4">
      <p className="eyebrow">Your record on this device</p>
      <div className="grid grid-cols-3 gap-4">
        <StatTile label="Games" value={stats.games} />
        <StatTile label="Wins" value={stats.wins} />
        <StatTile label="Best avg" value={Math.round(stats.bestAverage)} />
      </div>
      {habit ? (
        <p className="border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Most common miss: </span>
          {habit.lesson}
        </p>
      ) : null}
    </div>
  );
}
