"use client";

import { CloudLightningIcon, HeartPulseIcon, LayersIcon, ShieldIcon, UsersIcon, ZapIcon } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GAME_MODES, PULL_COPY, ZONE_TABLE } from "@/engine/constants";
import type { GameMode, PhaseView } from "@/engine/types";

export function StatePanel({
  view,
  mode,
  revealPull,
}: {
  view: PhaseView;
  mode: GameMode;
  revealPull: boolean;
}) {
  const { player, zone } = view;
  const pull = PULL_COPY[zone.pull];
  const { countLabel, squadLabel } = GAME_MODES[mode];
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-baseline gap-1 text-lg font-semibold">
            Zone <span className="stat-figure">{zone.index}</span>
            <span className="stat-figure text-sm text-muted-foreground">/ {ZONE_TABLE.length}</span>
          </CardTitle>
          <Badge variant="outline">{view.phaseName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <dl className="grid grid-cols-2 gap-2">
          <Stat icon={UsersIcon} label={countLabel} value={view.teamsAlive} />
          <Stat
            icon={ShieldIcon}
            label={squadLabel}
            value={<AlivePips alive={player.alive} squadSize={player.squadSize} />}
          />
          <Stat icon={LayersIcon} label="Mats" value={player.mats} />
          <Stat icon={HeartPulseIcon} label="Heals" value={player.heals} />
        </dl>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary">
            <CloudLightningIcon data-icon="inline-start" />
            Storm {zone.stormDps}/s
          </Badge>
          {zone.surgeActive ? (
            <Badge variant="destructive">
              <ZapIcon data-icon="inline-start" />
              Surge on
            </Badge>
          ) : (
            <Badge variant="secondary">No surge</Badge>
          )}
        </div>
        {zone.surgeActive ? (
          <p className="text-xs text-muted-foreground">Teams with the least damage get hurt.</p>
        ) : null}
        {revealPull ? (
          <p className="rounded-lg bg-zone/10 px-3 py-2 text-sm leading-5">
            <span className="font-semibold text-zone">{pull.name}.</span> {pull.line}
          </p>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            Name the pull before you go.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/60 px-2.5 py-2">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="stat-figure text-sm">{value}</dd>
    </div>
  );
}

function AlivePips({ alive, squadSize }: { alive: number; squadSize: number }) {
  return (
    <span className="flex gap-1" role="img" aria-label={`${alive} of ${squadSize} alive`}>
      {Array.from({ length: squadSize }, (_, index) => (
        <span
          key={index}
          className={index < alive ? "size-2.5 rounded-full bg-success" : "size-2.5 rounded-full bg-muted-foreground/30"}
        />
      ))}
    </span>
  );
}
