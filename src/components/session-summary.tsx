"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GameState } from "@/engine/types";
import { averageScore, worstHabit } from "@/lib/review";

export function SessionSummary({
  game,
  open,
  onOpenChange,
  onReplay,
  onNewGame,
  onMenu,
}: {
  game: GameState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplay: () => void;
  onNewGame: () => void;
  onMenu: () => void;
}) {
  const average = Math.round(averageScore(game.history));
  const habit = worstHabit(game.history);
  const won = game.status === "won" && game.placement === 1;
  const place = game.placement ?? game.teams.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{won ? "You won the lobby" : `You placed ${ordinal(place)}`}</DialogTitle>
          <DialogDescription>
            Average call score {average} across {game.history.length} zones. Seed {game.seed}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="flex h-16 items-end gap-1" aria-hidden>
            {game.history.map((phase) => (
              <div key={phase.zone.index} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-sm bg-primary"
                  style={{ height: `${Math.max(8, phase.score.total * 0.5)}px` }}
                />
                <span className="text-[10px] text-muted-foreground">{phase.zone.index}</span>
              </div>
            ))}
          </div>
          {habit ? (
            <p className="text-sm">
              <span className="font-medium">Repeated miss: </span>
              {habit.lesson}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No repeated miss this game. Look at the warns anyway.</p>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onMenu}>
            Menu
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onReplay}>
              Same seed
            </Button>
            <Button type="button" onClick={onNewGame}>
              New game
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ordinal(place: number): string {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
  const mod10 = place % 10;
  if (mod10 === 1) return `${place}st`;
  if (mod10 === 2) return `${place}nd`;
  if (mod10 === 3) return `${place}rd`;
  return `${place}th`;
}
