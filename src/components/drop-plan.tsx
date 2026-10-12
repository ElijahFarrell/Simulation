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
    <Card size="sm">
      <CardHeader>
        <p className="eyebrow">Before zone 1</p>
        <CardTitle className="text-lg font-semibold">Drop and loot</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="leading-5 text-muted-foreground">
          First tap is your drop. More taps are the loot route, in order. Every stop stays on land.
        </p>
        <p className="rounded-lg bg-muted/60 px-3 py-2 leading-5">{routeVerdict(routeSeconds(route), waitSec)}</p>
        {route.length > 0 ? (
          <ol className="grid gap-1.5">
            {route.map((point, index) => {
              const name = nearestPlace(places, point);
              return (
                <li key={`${index}:${point.x}:${point.y}`} className="flex items-center gap-2.5">
                  <span
                    className={
                      index === 0
                        ? "flex size-5 items-center justify-center rounded-full bg-you font-mono text-[0.65rem] font-bold text-black"
                        : "flex size-5 items-center justify-center rounded-full bg-you/25 font-mono text-[0.65rem] font-bold text-you"
                    }
                  >
                    {index === 0 ? "D" : index}
                  </span>
                  <span className="font-medium">{index === 0 ? "Drop" : `Loot ${index}`}</span>
                  {name ? <span className="truncate text-muted-foreground">{name}</span> : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-lg border border-dashed border-border px-3 py-2 text-muted-foreground">
            Tap the island to set the drop.
          </p>
        )}
        {full ? <p className="text-muted-foreground">That&apos;s the whole route.</p> : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button type="button" size="lg" className="h-10 text-base" disabled={route.length === 0} onClick={onLock}>
          Use this drop
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" disabled={route.length === 0} onClick={onUndo}>
            Undo
          </Button>
          <Button type="button" variant="outline" disabled={route.length === 0} onClick={onClear}>
            Clear
          </Button>
          <Button type="button" variant="ghost" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
