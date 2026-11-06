"use client";

import { Button } from "@/components/ui/button";
import type { Overlays } from "@/components/lab/lab-state";

const TOGGLES: { key: keyof Overlays; label: string; swatch: string }[] = [
  { key: "density", label: "Sides", swatch: "size-2.5 rounded-sm bg-gradient-to-r from-emerald-400 to-red-400" },
  { key: "pull", label: "Pull range", swatch: "size-2.5 rounded-full border border-dashed border-[#9bd7ff]" },
  { key: "heatmap", label: "Heat", swatch: "size-2.5 rounded-sm bg-gradient-to-r from-emerald-400 via-yellow-300 to-orange-400" },
];

export function OverlayToggles({
  overlays,
  onToggle,
}: {
  overlays: Overlays;
  onToggle: (key: keyof Overlays) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Map overlays">
      {TOGGLES.map((toggle) => {
        const on = overlays[toggle.key];
        return (
          <Button
            key={toggle.key}
            type="button"
            size="sm"
            variant={on ? "secondary" : "outline"}
            aria-pressed={on}
            className={on ? "" : "text-muted-foreground"}
            onClick={() => onToggle(toggle.key)}
          >
            <span aria-hidden className={on ? toggle.swatch : `${toggle.swatch} opacity-40`} />
            {toggle.label}
          </Button>
        );
      })}
    </div>
  );
}
