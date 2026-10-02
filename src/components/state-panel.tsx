"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PULL_COPY, ZONE_TABLE } from "@/engine/constants";
import type { PhaseView } from "@/engine/types";

export function StatePanel({
  view,
  teamsAlive,
  revealPull,
}: {
  view: PhaseView;
  teamsAlive: number;
  revealPull: boolean;
}) {
  const { player, zone } = view;
  const pull = PULL_COPY[zone.pull];
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            Zone {zone.index}
            <span className="text-muted-foreground"> / {ZONE_TABLE.length}</span>
          </CardTitle>
          <Badge variant="outline">{view.phaseName}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Teams alive</span>
          <span className="tabular-nums">{teamsAlive}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Your trio</span>
          <AlivePips alive={player.alive} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Mats</span>
          <span className="tabular-nums">{player.mats}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Heals</span>
          <span className="tabular-nums">{player.heals}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Storm</span>
          <span className="tabular-nums">{zone.stormDps}/s</span>
        </div>
        {revealPull ? (
          <p className="text-sm">
            <span className="font-medium">{pull.name}.</span> {pull.line}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Name the pull before you go.</p>
        )}
        {zone.surgeActive ? (
          <Badge variant="destructive">Surge is on. Teams with the least damage get hurt.</Badge>
        ) : (
          <Badge variant="secondary">No surge this zone</Badge>
        )}
      </CardContent>
    </Card>
  );
}

function AlivePips({ alive }: { alive: number }) {
  return (
    <span className="flex gap-1" aria-label={`${alive} of 3 alive`}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={index < alive ? "size-2.5 rounded-full bg-emerald-400" : "size-2.5 rounded-full bg-muted"}
        />
      ))}
    </span>
  );
}
