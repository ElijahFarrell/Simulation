"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Engagement, Timing } from "@/engine/types";

const TIMINGS: { value: Timing; label: string; hint: string }[] = [
  { value: "early", label: "Early", hint: "Leave on the reveal" },
  { value: "standard", label: "On time", hint: "Leave mid-wait" },
  { value: "late", label: "Late", hint: "Farm into the storm" },
];

const ENGAGEMENTS: { value: Engagement; label: string; hint: string }[] = [
  { value: "avoid", label: "Avoid", hint: "Give up the fight" },
  { value: "tag", label: "Tag", hint: "Damage, then leave" },
  { value: "fight", label: "Fight", hint: "Commit the trio" },
];

export function DecisionPanel({
  timing,
  engagement,
  call,
  hint,
  canLock,
  busy,
  onTiming,
  onEngagement,
  onLock,
}: {
  timing: Timing;
  engagement: Engagement;
  call: string;
  hint: string | null;
  canLock: boolean;
  busy: boolean;
  onTiming: (timing: Timing) => void;
  onEngagement: (engagement: Engagement) => void;
  onLock: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">The call</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ChoiceGroup
          legend="When you leave"
          name="timing"
          value={timing}
          options={TIMINGS}
          onChange={onTiming}
          disabled={busy}
        />
        <ChoiceGroup
          legend="What you do on contact"
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
          {busy ? "Rotating…" : "Lock call"}
        </Button>
        <p className="text-xs text-muted-foreground">Keys: 1 2 3 timing · Q W E engage · Enter locks</p>
      </CardFooter>
    </Card>
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
