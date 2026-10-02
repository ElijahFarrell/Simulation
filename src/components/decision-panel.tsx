"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PULL_COPY } from "@/engine/constants";
import type { Engagement, PullType, Timing } from "@/engine/types";

const PULLS: PullType[] = ["normal", "deep", "half"];

const TIMINGS: { value: Timing; label: string; hint: string }[] = [
  { value: "early", label: "Right away", hint: "Leave as soon as it shows" },
  { value: "standard", label: "Wait a bit", hint: "Leave in the middle" },
  { value: "late", label: "Loot first", hint: "Grab mats, then go" },
];

const ENGAGEMENTS: { value: Engagement; label: string; hint: string }[] = [
  { value: "avoid", label: "Stay away", hint: "Don't fight" },
  { value: "tag", label: "Hit and leave", hint: "Shoot once, then go" },
  { value: "fight", label: "Full fight", hint: "Stay until someone loses" },
];

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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Your move</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {showQuiz ? <PullQuiz pull={pull} guess={pullGuess} onGuess={onGuess} /> : null}
        <ChoiceGroup
          legend="When you leave"
          name="timing"
          value={timing}
          options={TIMINGS}
          onChange={onTiming}
          disabled={busy}
        />
        <ChoiceGroup
          legend="If you meet a team"
          name="engagement"
          value={engagement}
          options={ENGAGEMENTS}
          onChange={onEngagement}
          disabled={busy}
        />
        <p className="text-sm text-foreground">{call}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button type="button" disabled={!canLock || busy} onClick={onLock}>
          {busy ? "Moving…" : "Go"}
        </Button>
        <p className="text-xs text-muted-foreground">Keys: 1 2 3 when · Q W E fight · Enter goes</p>
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
      <div className="grid gap-2">
        <p className="text-sm font-medium">Look at the blue ring. What kind of pull is this?</p>
        <div className="flex flex-wrap gap-2">
          {PULLS.map((option) => (
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
    <p className={right ? "text-sm text-emerald-300" : "text-sm text-amber-200"}>
      {right ? "Yes. " : `Not quite. This is a ${answer.name.toLowerCase()}. `}
      {answer.line}
    </p>
  );
}

function ChoiceGroup<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  disabled,
}: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; hint: string }[];
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="grid gap-2" disabled={disabled}>
      <legend className="text-sm font-medium">{legend}</legend>
      <RadioGroup value={value} onValueChange={(next) => onChange(next as T)} className="grid gap-1.5">
        {options.map((option) => {
          const id = `${name}-${option.value}`;
          return (
            <div key={option.value} className="flex items-center gap-2">
              <RadioGroupItem value={option.value} id={id} />
              <Label htmlFor={id} className="font-normal">
                {option.label}
                <span className="text-muted-foreground"> · {option.hint}</span>
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </fieldset>
  );
}
