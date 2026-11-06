"use client";

import { PlayIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { LabSettings } from "@/components/lab/lab-state";
import { GAME_MODES } from "@/engine/constants";
import { randomSeed } from "@/engine/rng";
import type { DropStyle, GameMode } from "@/engine/types";
import { cn } from "@/lib/utils";

export function LobbySetup({
  className,
  ready,
  settings,
  onSettings,
  onStart,
}: {
  className?: string;
  ready: boolean;
  settings: LabSettings;
  onSettings: (settings: LabSettings) => void;
  onStart: (seed: number) => void;
}) {
  const [seedText, setSeedText] = useState("");
  const rules = GAME_MODES[settings.mode];

  return (
    <Card className={cn("shadow-2xl shadow-black/30 lg:sticky lg:top-20", className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Start a lobby</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label id="mode-label">Game mode</Label>
            <Segmented
              aria-labelledby="mode-label"
              value={settings.mode}
              onValueChange={(value) => {
                const mode = value as GameMode;
                onSettings({ ...settings, mode, teamCount: GAME_MODES[mode].teamCount });
              }}
            >
              <SegmentedItem value="trios">Trios</SegmentedItem>
              <SegmentedItem value="solos">Solos</SegmentedItem>
            </Segmented>
          </div>
          <div className="grid gap-2">
            <Label id="lobby-label">Lobby</Label>
            <Segmented
              aria-labelledby="lobby-label"
              value={settings.dropStyle}
              onValueChange={(value) => onSettings({ ...settings, dropStyle: value as DropStyle })}
            >
              <SegmentedItem value="opens">Opens</SegmentedItem>
              <SegmentedItem value="stacked">Stacked</SegmentedItem>
            </Segmented>
          </div>
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">{lobbyCopy(settings.dropStyle)}</p>

        <SliderRow
          id="teams"
          label={settings.mode === "solos" ? "Players" : "Teams"}
          note={`${rules.squadSize === 1 ? "Solo" : `${rules.squadSize} players each`} · ${rules.maxTeams} max`}
          display={String(settings.teamCount)}
          min={rules.minTeams}
          max={rules.maxTeams}
          step={1}
          value={settings.teamCount}
          onValue={(teamCount) => onSettings({ ...settings, teamCount })}
        />
        <SliderRow
          id="fighters"
          label="Fighters"
          note="Teams that look for fights"
          display={`${Math.round(settings.fighterWeight * 100)}%`}
          min={0}
          max={50}
          step={5}
          value={Math.round(settings.fighterWeight * 100)}
          onValue={(value) => onSettings({ ...settings, fighterWeight: value / 100 })}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="seed">Seed</Label>
            <Input
              id="seed"
              inputMode="numeric"
              className="font-mono"
              placeholder="Random"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 sm:self-end">
            <Label htmlFor="hints" className="grid gap-0.5">
              <span>Hints</span>
              <span className="text-xs font-normal text-muted-foreground">Pull quiz and coach tips</span>
            </Label>
            <Switch
              id="hints"
              checked={settings.hints}
              onCheckedChange={(hints) => onSettings({ ...settings, hints })}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          size="lg"
          className="h-11 w-full text-base"
          disabled={!ready}
          onClick={() => onStart(parseSeed(seedText))}
        >
          <PlayIcon data-icon="inline-start" className="fill-current" />
          {ready ? "Start game" : "Loading map…"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function SliderRow({
  id,
  label,
  note,
  display,
  min,
  max,
  step,
  value,
  onValue,
}: {
  id: string;
  label: string;
  note: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onValue: (value: number) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <Label id={`${id}-label`}>
          {label}
          <span className="font-normal text-muted-foreground">{note}</span>
        </Label>
        <span className="stat-figure text-sm">{display}</span>
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => {
          const first = next[0];
          if (first !== undefined) onValue(first);
        }}
      />
    </div>
  );
}

function lobbyCopy(style: DropStyle): string {
  if (style === "stacked") return "Most teams pile onto a few drops. Dead sides are rare.";
  return "Teams spread across the island, so quiet sides show up.";
}

function parseSeed(seedText: string): number {
  if (seedText.trim() === "") return randomSeed();
  const parsed = Number(seedText);
  if (!Number.isFinite(parsed)) return 1;
  return Math.floor(parsed);
}
