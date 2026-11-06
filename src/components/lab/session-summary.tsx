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
import { isWin } from "@/engine/game";
import type { GameState } from "@/engine/types";
import { averageScore, worstHabit } from "@/lib/review";
import { scoreTone, TONE_FILL, TONE_TEXT } from "@/components/lab/score-tone";

export function SessionSummary({
  game,
  open,
  onOpenChange,
  onReplay,
  onNewGame,
  onMenu,
  onAsk,
}: {
  game: GameState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplay: () => void;
  onNewGame: () => void;
  onMenu: () => void;
  onAsk: () => void;
}) {
  const average = Math.round(averageScore(game.history));
  const habit = worstHabit(game.history);
  const won = isWin(game);
  const place = game.placement ?? game.teams.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <p className={won ? "eyebrow text-you" : "eyebrow"}>{won ? "Victory royale" : "Game over"}</p>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            {won ? "You won the lobby" : `You placed ${ordinal(place)}`}
          </DialogTitle>
          <DialogDescription>
            {game.history.length} zones played on seed <span className="font-mono">{game.seed}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex items-end gap-4">
            <div className="grid gap-1">
              <p className="eyebrow">Avg score</p>
              <p className={`stat-figure text-4xl leading-none ${TONE_TEXT[scoreTone(average)]}`}>{average}</p>
            </div>
            <div className="flex h-16 flex-1 items-end gap-1" aria-hidden>
              {game.history.map((phase) => (
                <div key={phase.zone.index} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm ${TONE_FILL[scoreTone(phase.score.total)]}`}
                    style={{ height: `${Math.max(4, phase.score.total * 0.48)}px` }}
                  />
                  <span className="font-mono text-[10px] text-muted-foreground">{phase.zone.index}</span>
                </div>
              ))}
            </div>
          </div>
          {habit ? (
            <p className="rounded-lg border-l-2 border-warning bg-warning/5 px-3 py-2 text-sm leading-5">
              <span className="font-medium">You keep doing this: </span>
              {habit.lesson}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing big went wrong more than once. Still read the notes.</p>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onMenu}>
              Menu
            </Button>
            <Button type="button" variant="outline" onClick={onAsk}>
              Ask coach
            </Button>
          </div>
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
