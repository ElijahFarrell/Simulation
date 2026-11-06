"use client";

import { MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CALL_PARTS, type CallPart, type ScorePart } from "@/engine/constants";
import { pointsLost } from "@/engine/scoring";
import type { FeedbackTone, PhaseResult, ScoreBreakdown } from "@/engine/types";
import { scoreTone, TONE_FILL, TONE_TEXT } from "@/components/lab/score-tone";

const CALL_ORDER: CallPart[] = ["where", "when", "contact"];

const SCORE_LABELS: Record<ScorePart, string> = {
  exposure: "Who can see you",
  positioning: "Next zone",
  storm: "Storm",
  contact: "The fight",
  surge: "Surge",
};

const TONE_CLASS: Record<FeedbackTone, string> = {
  bad: "border-destructive",
  warn: "border-warning",
  good: "border-success",
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
  const lost = pointsLost(result.score);
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-end justify-between">
          <div className="grid gap-1">
            <p className="eyebrow">Zone {result.zone.index} result</p>
            <CardTitle className="text-lg font-semibold">{verdict(result.score.total)}</CardTitle>
          </div>
          <p className={`stat-figure text-4xl leading-none ${TONE_TEXT[scoreTone(result.score.total)]}`}>
            {result.score.total}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {CALL_ORDER.map((part) => (
          <CallPartScores key={part} part={part} score={result.score} lost={lost[part]} />
        ))}
        <ul className="grid gap-2 pt-1">
          {result.feedback.map((line) => (
            <li key={line.ruleId} className={`border-l-2 pl-3 text-sm leading-5 ${TONE_CLASS[line.tone]}`}>
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

function CallPartScores({ part, score, lost }: { part: CallPart; score: ScoreBreakdown; lost: number }) {
  return (
    <section className="grid gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <h3 className="font-medium">{CALL_PARTS[part].label}</h3>
        <span className={lost > 0 ? "tabular-nums text-muted-foreground" : "text-success"}>
          {lost > 0 ? `−${lost}` : "clean"}
        </span>
      </div>
      {CALL_PARTS[part].scores.map((key) => (
        <ScoreBar key={key} label={SCORE_LABELS[key]} value={score[key]} />
      ))}
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="grid grid-cols-[7.25rem_1fr_2rem] items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={`h-full rounded-full ${TONE_FILL[scoreTone(width)]}`} style={{ width: `${width}%` }} />
      </div>
      <span className="stat-figure text-right">{width}</span>
    </div>
  );
}

function verdict(total: number): string {
  const tone = scoreTone(total);
  if (tone === "good") return "Good call";
  if (tone === "warn") return "Playable";
  return "Costly call";
}
