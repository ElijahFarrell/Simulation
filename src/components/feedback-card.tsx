"use client";

import { MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { FeedbackTone, PhaseResult } from "@/engine/types";

const TONE_CLASS: Record<FeedbackTone, string> = {
  bad: "text-red-300",
  warn: "text-amber-200",
  good: "text-emerald-300",
};

export function FeedbackCard({
  result,
  canAdvance,
  onNext,
  onAsk,
}: {
  result: PhaseResult;
  canAdvance: boolean;
  onNext: () => void;
  onAsk: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-end justify-between">
          <CardTitle className="text-base">Zone {result.zone.index}</CardTitle>
          <p className="text-3xl font-semibold tabular-nums leading-none">{result.score.total}</p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ScoreBar label="Storm" value={result.score.storm} />
        <ScoreBar label="Contact" value={result.score.contact} />
        <ScoreBar label="Exposure" value={result.score.exposure} />
        <ScoreBar label="Surge" value={result.score.surge} />
        <ScoreBar label="Next pull" value={result.score.positioning} />
        <ul className="grid gap-2 pt-1">
          {result.feedback.map((line) => (
            <li key={line.ruleId} className={`text-sm ${TONE_CLASS[line.tone]}`}>
              {line.text}
            </li>
          ))}
        </ul>
        {result.events.length > 0 ? (
          <ul className="grid gap-1 text-xs text-muted-foreground">
            {result.events.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="gap-2">
        <Button type="button" variant="outline" className={canAdvance ? "" : "w-full"} onClick={onAsk}>
          <MessageCircleIcon data-icon="inline-start" />
          Ask coach
        </Button>
        {canAdvance ? (
          <Button type="button" className="flex-1" onClick={onNext}>
            Next zone
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="grid grid-cols-[4.5rem_1fr_2rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      <span className="text-right tabular-nums">{width}</span>
    </div>
  );
}
