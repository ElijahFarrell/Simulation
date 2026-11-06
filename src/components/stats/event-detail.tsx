import Image from "next/image";
import { LAN_REGION } from "@/lib/fortnite/event-display";
import type { TournamentSummary } from "@/lib/fortnite/parse";
import { cn } from "@/lib/utils";

function when(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EventDetail({
  event,
  windowId,
  now,
  onWindow,
}: {
  event: TournamentSummary;
  windowId: string;
  now: number;
  onWindow: (windowId: string) => void;
}) {
  const display = event.display;
  const windows = [...event.windows].sort((a, b) => Date.parse(a.beginTime) - Date.parse(b.beginTime));
  return (
    <section
      id="event-detail"
      aria-label={event.title}
      className="relative scroll-mt-20 overflow-hidden rounded-2xl border border-border bg-card"
    >
      {display?.banner ? (
        <Image src={display.banner} alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" className="object-cover opacity-30" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/40" aria-hidden />
      <div className="relative grid gap-5 p-5 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-start">
        {display?.poster ? (
          <div className="relative hidden aspect-square overflow-hidden rounded-xl ring-1 ring-white/10 sm:block">
            <Image src={display.poster} alt="" fill sizes="112px" className="object-cover" />
          </div>
        ) : null}
        <div className="grid min-w-0 gap-3">
          <div className="grid gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              {(display?.regions ?? []).map((region) => (
                <span key={region} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold">
                  {region === LAN_REGION ? "LAN" : region}
                </span>
              ))}
              {(display?.tags ?? []).map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
            <h3 className="text-2xl font-semibold tracking-tight text-balance">{event.title}</h3>
            {display?.description ? (
              <p className="line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">{display.description}</p>
            ) : null}
          </div>
          <div role="radiogroup" aria-label="Session" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {windows.map((window, index) => {
              const open = Date.parse(window.beginTime) <= now && now < Date.parse(window.endTime);
              const upcoming = Date.parse(window.beginTime) > now;
              const active = window.windowId === windowId;
              return (
                <button
                  key={window.windowId}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onWindow(window.windowId)}
                  className={cn(
                    "grid shrink-0 gap-0.5 rounded-lg border border-border bg-background/60 px-3 py-2 text-left transition-colors outline-none hover:border-foreground/25 focus-visible:ring-3 focus-visible:ring-ring/50",
                    active && "border-brand bg-brand/15 hover:border-brand",
                    upcoming && !active && "opacity-60",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-xs font-semibold">
                    {open ? <span className="size-1.5 rounded-full bg-destructive motion-safe:animate-pulse" /> : null}
                    {windows.length > 1 ? `Session ${index + 1}` : "Session"}
                    {window.qualSpots ? (
                      <span className="font-mono font-normal text-muted-foreground">
                        · top {window.qualSpots.toLocaleString()}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">{when(window.beginTime)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
