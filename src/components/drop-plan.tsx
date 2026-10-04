"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_ROUTE_STOPS } from "@/engine/constants";
import { routeSeconds, routeVerdict } from "@/engine/route";
import type { Vec } from "@/engine/types";
import { nearestPlace, type Place } from "@/lib/island/project";

export function DropPlan({
  route,
  places,
  waitSec,
  onUndo,
  onClear,
  onSkip,
  onLock,
}: {
  route: Vec[];
  places: readonly Place[];
  waitSec: number;
  onUndo: () => void;
  onClear: () => void;
  onSkip: () => void;
  onLock: () => void;
}) {
  const full = route.length >= MAX_ROUTE_STOPS;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Drop and loot</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p>First tap is your drop. More taps are the loot route, in order. Every stop stays on land.</p>
        <p>{routeVerdict(routeSeconds(route), waitSec)}</p>
        {route.length > 0 ? (
          <ol className="grid gap-1">
            {route.map((point, index) => {
              const name = nearestPlace(places, point);
              const label = index === 0 ? "Drop" : `Loot ${index}`;
              return (
                <li key={`${index}:${point.x}:${point.y}`}>
                  {name ? `${label} · ${name}` : label}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-muted-foreground">Tap the island to set the drop.</p>
        )}
        {full ? <p className="text-muted-foreground">That's the whole route.</p> : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" disabled={route.length === 0} onClick={onUndo}>
            Undo
          </Button>
          <Button type="button" variant="outline" disabled={route.length === 0} onClick={onClear}>
            Clear
          </Button>
        </div>
        <Button type="button" disabled={route.length === 0} onClick={onLock}>
          Use this drop
        </Button>
        <Button type="button" variant="secondary" onClick={onSkip}>
          Skip, drop wherever
        </Button>
      </CardFooter>
    </Card>
  );
}
