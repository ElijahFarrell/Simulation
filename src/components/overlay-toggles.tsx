"use client";

import { Button } from "@/components/ui/button";
import type { Overlays } from "@/components/lab-state";

const TOGGLES: { key: keyof Overlays; label: string }[] = [
  { key: "density", label: "Sides" },
  { key: "pull", label: "Dashed ring" },
  { key: "heatmap", label: "Heat" },
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
            onClick={() => onToggle(toggle.key)}
          >
            {toggle.label}
          </Button>
        );
      })}
    </div>
  );
}
