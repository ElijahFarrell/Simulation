import Image from "next/image";
import type { CatalogEvent } from "@/lib/fortnite/catalog";
import { relativeTime } from "@/lib/fortnite/catalog";
import { cn } from "@/lib/utils";

function StatusBadge({ item, now }: { item: CatalogEvent; now: number }) {
  if (item.status === "live") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive px-1.5 py-0.5 text-[0.7rem] font-bold tracking-wide text-white uppercase shadow">
        <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />
        Live
      </span>
    );
  }
  if (item.status === "upcoming") {
    return (
      <span className="rounded-md bg-primary px-1.5 py-0.5 text-[0.7rem] font-bold tracking-wide text-primary-foreground uppercase shadow">
        {relativeTime(item.at, now)}
      </span>
    );
  }
  return (
    <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[0.7rem] font-semibold text-white/85 shadow backdrop-blur">
      {new Date(item.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
    </span>
  );
}

export function EventCard({
  item,
  now,
  selected,
  onSelect,
}: {
  item: CatalogEvent;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { event } = item;
  const display = event.display;
  const regions = (display?.regions ?? []).filter((region) => region !== "ONSITE");
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition outline-none hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-xl hover:shadow-black/30 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected && "border-brand ring-2 ring-brand/60 hover:border-brand",
      )}
    >
      <div
        className="relative aspect-square w-full overflow-hidden"
        style={{ backgroundColor: display?.color ?? undefined }}
      >
        {display?.poster ? (
          <Image
            src={display.poster}
            alt=""
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-[1.04]",
              item.status === "past" && "saturate-[0.6]",
            )}
          />
        ) : null}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
          <StatusBadge item={item} now={now} />
          {regions.length > 0 ? (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-white/90 backdrop-blur">
              {regions.length > 2 ? "MULTI" : regions.join(", ")}
            </span>
          ) : display?.regions.includes("ONSITE") ? (
            <span className="rounded-md bg-black/70 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white/90 backdrop-blur">
              LAN
            </span>
          ) : null}
        </div>
      </div>
      <div className="grid flex-1 content-start gap-1.5 p-3">
        <p className="line-clamp-2 text-sm leading-snug font-semibold">{event.title}</p>
        {display && display.tags.length > 0 ? (
          <p className="text-xs text-muted-foreground">{display.tags.join(" · ")}</p>
        ) : null}
      </div>
    </button>
  );
}
