import type { PhaseResult } from "@/engine/types";
import { cn } from "@/lib/utils";
import { scoreTone, TONE_FILL } from "@/components/lab/score-tone";

export function ZoneTrack({
  current,
  total,
  history,
  className,
}: {
  current: number;
  total: number;
  history: readonly PhaseResult[];
  className?: string;
}) {
  const scores = new Map(history.map((phase) => [phase.zone.index, phase.score.total]));
  return (
    <ol className={cn("flex items-center gap-1", className)} aria-label={`Zone ${current} of ${total}`}>
      {Array.from({ length: total }, (_, offset) => {
        const index = offset + 1;
        const score = scores.get(index);
        return (
          <li
            key={index}
            title={score === undefined ? `Zone ${index}` : `Zone ${index} · ${score}`}
            className={cn(
              "h-1.5 flex-1 rounded-full bg-muted",
              score !== undefined && TONE_FILL[scoreTone(score)],
              score === undefined && index === current && "bg-brand",
            )}
          />
        );
      })}
    </ol>
  );
}
