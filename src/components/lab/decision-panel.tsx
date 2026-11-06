"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { Segmented, SegmentedItem } from "@/components/ui/segmented";
import { CALL_PARTS, PULL_COPY } from "@/engine/constants";
import { PULL_TYPES, type Engagement, type PullType, type Timing } from "@/engine/types";
import { ENGAGEMENT_CHOICES, TIMING_CHOICES, type Choice } from "@/components/lab/choices";

export function DecisionPanel({
  timing,
  engagement,
  call,
  hint,
  pull,
  pullGuess,
  showQuiz,
  canLock,
  busy,
  onTiming,
  onEngagement,
  onGuess,
  onLock,
}: {
  timing: Timing;
  engagement: Engagement;
  call: string;
  hint: string | null;
  pull: PullType;
  pullGuess: PullType | null;
  showQuiz: boolean;
  canLock: boolean;
  busy: boolean;
  onTiming: (timing: Timing) => void;
  onEngagement: (engagement: Engagement) => void;
  onGuess: (pull: PullType) => void;
  onLock: () => void;
}) {
  return (
    <Card size="sm" className="overflow-visible">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Your call</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {showQuiz ? <PullQuiz pull={pull} guess={pullGuess} onGuess={onGuess} /> : null}
        <ChoiceGroup
          legend={CALL_PARTS.when.label}
          value={timing}
          options={TIMING_CHOICES}
          onChange={onTiming}
          disabled={busy}
        />
        <ChoiceGroup
          legend={CALL_PARTS.contact.label}
          value={engagement}
          options={ENGAGEMENT_CHOICES}
          onChange={onEngagement}
          disabled={busy}
        />
        <p
          className={
            canLock
              ? "rounded-lg border-l-2 border-you bg-you/5 px-3 py-2 text-sm leading-5"
              : "rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
          }
        >
          {call}
        </p>
        {hint ? <p className="text-sm leading-5 text-muted-foreground">{hint}</p> : null}
      </CardContent>
      <CardFooter className="sticky bottom-0 z-10 bg-card shadow-[0_-8px_16px_-8px_rgb(0_0_0/0.5)]">
        <Button type="button" size="lg" className="h-10 w-full text-base" disabled={!canLock || busy} onClick={onLock}>
          {busy ? "Moving…" : "Go"}
          {busy ? null : <Kbd className="ml-1 border-white/25 bg-white/15 text-primary-foreground">Enter</Kbd>}
        </Button>
      </CardFooter>
    </Card>
  );
}

function PullQuiz({
  pull,
  guess,
  onGuess,
}: {
  pull: PullType;
  guess: PullType | null;
  onGuess: (pull: PullType) => void;
}) {
  if (guess === null) {
    return (
      <div className="grid gap-2 rounded-lg bg-zone/10 p-3">
        <p className="text-sm font-medium">Look at the blue ring. What kind of pull is this?</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PULL_TYPES.map((option) => (
            <Button key={option} type="button" size="sm" variant="outline" onClick={() => onGuess(option)}>
              {PULL_COPY[option].name}
            </Button>
          ))}
        </div>
      </div>
    );
  }
  const answer = PULL_COPY[pull];
  const right = guess === pull;
  return (
    <p
      className={
        right
          ? "rounded-lg bg-success/10 px-3 py-2 text-sm leading-5 text-success"
          : "rounded-lg bg-warning/10 px-3 py-2 text-sm leading-5 text-warning"
      }
    >
      {right ? "Yes. " : `Not quite. This is a ${answer.name.toLowerCase()}. `}
      {answer.line}
    </p>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  value,
  options,
  onChange,
  disabled,
}: {
  legend: string;
  value: T;
  options: Choice<T>[];
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  const active = options.find((option) => option.value === value);
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="eyebrow mb-2">{legend}</legend>
      <Segmented
        aria-label={legend}
        value={value}
        disabled={disabled}
        onValueChange={(next) => onChange(next as T)}
        className="grid grid-cols-3"
      >
        {options.map((option) => (
          <SegmentedItem
            key={option.value}
            value={option.value}
            className="min-h-12 flex-col gap-1 px-1.5 py-1.5 text-center text-[0.8rem] leading-tight"
          >
            {option.label}
            <Kbd className="hidden h-4 min-w-4 text-[0.6rem] sm:inline-flex">{option.key}</Kbd>
          </SegmentedItem>
        ))}
      </Segmented>
      {active ? <p className="text-xs text-muted-foreground">{active.hint}</p> : null}
    </fieldset>
  );
}
