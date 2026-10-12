export type ScoreTone = "good" | "warn" | "bad";

export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

export const TONE_TEXT: Record<ScoreTone, string> = {
  good: "text-success",
  warn: "text-warning",
  bad: "text-destructive",
};

export const TONE_FILL: Record<ScoreTone, string> = {
  good: "bg-success",
  warn: "bg-warning",
  bad: "bg-destructive",
};
