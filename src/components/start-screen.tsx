"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { LabSettings } from "@/components/lab-state";
import { SCENARIOS } from "@/engine/scenarios";
import type { SavedStats } from "@/lib/review";
import { lifetimeHabit } from "@/lib/review";

export function StartScreen({
  settings,
  stats,
  onSettings,
  onStart,
}: {
  settings: LabSettings;
  stats: SavedStats;
  onSettings: (settings: LabSettings) => void;
  onStart: (seed: number, scenarioId: string | null) => void;
}) {
  const [seedText, setSeedText] = useState("");
  const habit = lifetimeHabit(stats);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="grid gap-2">
        <p className="text-sm font-medium text-muted-foreground">Trios IGL practice</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Rotation Lab</h1>
        <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          Make the call before the zone does. Each rep is one reveal: where you hold, when you leave, and
          whether you fight. The grade is dead side, the next pull, surge, and storm.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Start a lobby</CardTitle>
          <CardDescription>
            White ring is the storm now. Blue ring is where you have to end. Dashed ring is where the next
            zone can spawn. Green is a dead side, red is stacked.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="seed">Seed</Label>
            <Input
              id="seed"
              inputMode="numeric"
              placeholder="Leave blank for a random lobby"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="teams">Teams</Label>
              <span className="tabular-nums text-muted-foreground">{settings.teamCount}</span>
            </div>
            <Slider
              id="teams"
              min={16}
              max={40}
              step={1}
              value={[settings.teamCount]}
              onValueChange={(value) => {
                const next = value[0];
                if (next === undefined) return;
                onSettings({ ...settings, teamCount: next });
              }}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="fighters">Fighters in the lobby</Label>
              <span className="tabular-nums text-muted-foreground">{Math.round(settings.fighterWeight * 100)}%</span>
            </div>
            <Slider
              id="fighters"
              min={0}
              max={50}
              step={5}
              value={[Math.round(settings.fighterWeight * 100)]}
              onValueChange={(value) => {
                const next = value[0];
                if (next === undefined) return;
                onSettings({ ...settings, fighterWeight: next / 100 });
              }}
            />
          </div>
          <Button
            type="button"
            variant={settings.hints ? "secondary" : "outline"}
            aria-pressed={settings.hints}
            onClick={() => onSettings({ ...settings, hints: !settings.hints })}
          >
            {settings.hints ? "Hints on" : "Hints off"}
          </Button>
          <Button type="button" onClick={() => onStart(parseSeed(seedText), null)}>
            Start game
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-3">
        <h2 className="text-sm font-medium">Lessons</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted"
              onClick={() => onStart(scenario.seed, scenario.id)}
            >
              <span className="block text-sm font-medium">{scenario.title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{scenario.lesson}</span>
            </button>
          ))}
        </div>
      </section>

      {stats.games > 0 ? (
        <p className="text-sm text-muted-foreground">
          {stats.games} games · {stats.wins} wins · best average {Math.round(stats.bestAverage)}
          {habit ? ` · most common miss: ${habit.lesson}` : ""}
        </p>
      ) : null}
    </div>
  );
}

function parseSeed(seedText: string): number {
  if (seedText.trim() === "") return Math.floor(Math.random() * 1_000_000_000);
  const parsed = Number(seedText);
  if (!Number.isFinite(parsed)) return 1;
  return Math.floor(parsed);
}
