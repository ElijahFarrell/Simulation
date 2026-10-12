import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  note,
  tone,
  size = "md",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  tone?: "good" | "bad" | "you" | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("grid content-start gap-1", className)}>
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "stat-figure leading-none",
          size === "sm" && "text-lg",
          size === "md" && "text-2xl",
          size === "lg" && "text-4xl sm:text-5xl",
          tone === "good" && "text-success",
          tone === "bad" && "text-destructive",
          tone === "you" && "text-you",
        )}
      >
        {value}
      </p>
      {note ? <p className="text-xs leading-5 text-muted-foreground">{note}</p> : null}
    </div>
  );
}
