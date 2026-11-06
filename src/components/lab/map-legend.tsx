import { cn } from "@/lib/utils";

const ITEMS: { swatch: string; label: string; note: string }[] = [
  { swatch: "size-4 rounded-full border-2 border-white/85", label: "Storm", note: "Where the storm is now" },
  { swatch: "size-4 rounded-full border-2 border-[#8eb7ff] bg-[#5a8cff]/15", label: "Next zone", note: "Where you need to end up" },
  { swatch: "size-4 rounded-full border-[1.5px] border-dashed border-[#9bd7ff]", label: "Pull range", note: "Where the zone after can land" },
  { swatch: "size-4 rounded-sm bg-emerald-400/45", label: "Dead side", note: "Few teams" },
  { swatch: "size-4 rounded-sm bg-red-400/55", label: "Stacked", note: "Lots of teams" },
  { swatch: "size-3 rounded-full bg-[#ffe14a] ring-4 ring-yellow-400/30", label: "You", note: "Other teams are white" },
];

export function MapLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3", className)}>
      {ITEMS.map((item) => (
        <li key={item.label} className="flex items-start gap-2.5">
          <span className="flex size-5 shrink-0 items-center justify-center pt-0.5" aria-hidden>
            <span className={item.swatch} />
          </span>
          <span className="grid leading-tight">
            <span className="text-sm font-medium">{item.label}</span>
            <span className="text-xs text-muted-foreground">{item.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
