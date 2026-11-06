import { ENGAGEMENT_LABELS, TIMING_LABELS } from "@/engine/constants";
import type { Engagement, Timing } from "@/engine/types";

export type Choice<T> = { value: T; label: string; hint: string; key: string };

export const TIMING_CHOICES: Choice<Timing>[] = [
  { value: "early", label: TIMING_LABELS.early, hint: "Leave as soon as it shows", key: "1" },
  { value: "standard", label: TIMING_LABELS.standard, hint: "Leave in the middle", key: "2" },
  { value: "late", label: TIMING_LABELS.late, hint: "Grab mats, then go", key: "3" },
];

export const ENGAGEMENT_CHOICES: Choice<Engagement>[] = [
  { value: "avoid", label: ENGAGEMENT_LABELS.avoid, hint: "Don't fight", key: "Q" },
  { value: "tag", label: ENGAGEMENT_LABELS.tag, hint: "Shoot once, then go", key: "W" },
  { value: "fight", label: ENGAGEMENT_LABELS.fight, hint: "Stay until someone loses", key: "E" },
];

export function choiceForKey<T>(choices: Choice<T>[], key: string): T | null {
  return choices.find((choice) => choice.key.toLowerCase() === key.toLowerCase())?.value ?? null;
}
