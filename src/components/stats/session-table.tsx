import type { BoardRow, YourGame } from "@/lib/fortnite/session";
import { cn } from "@/lib/utils";

const TH = "px-3 py-2.5 font-medium";
const NUM = "px-3 py-2.5 text-right font-mono tabular-nums";

export function ratioText(ratio: number | null): string {
  return ratio === null ? "—" : ratio.toFixed(2);
}

function ratioTone(ratio: number | null): string {
  if (ratio === null) return "text-muted-foreground";
  if (ratio >= 1.5) return "text-success";
  if (ratio < 1) return "text-destructive/90";
  return "";
}

function RankCell({ rank, qualifies }: { rank: number; qualifies: boolean }) {
  const podium = rank <= 3;
  return (
    <td className="px-3 py-2.5">
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 min-w-8 items-center justify-center rounded-md px-1.5 font-mono text-xs font-semibold tabular-nums",
            podium ? "bg-brand/20 text-brand" : "text-muted-foreground",
          )}
        >
          {rank.toLocaleString()}
        </span>
        {qualifies ? <span className="size-1.5 rounded-full bg-success" title="Inside the qual line" /> : null}
      </span>
    </td>
  );
}

export function ScoreTable({
  rows,
  spots,
  caption,
}: {
  rows: BoardRow[];
  spots: number | null;
  caption?: string;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className={TH}>Rank</th>
            <th className={TH}>Player</th>
            <th className={cn(TH, "text-right")}>Pts</th>
            <th className={cn(TH, "text-right")}>Games</th>
            <th className={cn(TH, "text-right")}>Elims</th>
            <th className={cn(TH, "text-right")}>Dealt</th>
            <th className={cn(TH, "text-right")}>Taken</th>
            <th className={cn(TH, "text-right")}>Ratio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.rank}-${row.names}`}
              className={cn(
                "border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/40",
                row.you && "bg-you/10 shadow-[inset_3px_0_0_var(--you)] hover:bg-you/15",
              )}
            >
              <RankCell rank={row.rank} qualifies={spots !== null && row.rank <= spots} />
              <td className="max-w-72 truncate px-3 py-2.5 font-medium" title={row.names}>
                {row.names}
                {row.you ? <span className="ml-2 text-xs font-semibold text-you">You</span> : null}
              </td>
              <td className={cn(NUM, "font-semibold text-foreground")}>{row.points.toLocaleString()}</td>
              <td className={cn(NUM, "text-muted-foreground")}>{row.games}</td>
              <td className={NUM}>{row.elims.toLocaleString()}</td>
              <td className={NUM}>{row.damageDealt.toLocaleString()}</td>
              <td className={cn(NUM, "text-muted-foreground")}>{row.damageTaken.toLocaleString()}</td>
              <td className={cn(NUM, ratioTone(row.damageRatio))}>{ratioText(row.damageRatio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YourGames({ games, windowId }: { games: YourGame[]; windowId: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <caption className="sr-only">Your games this session</caption>
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th className={TH}>Game</th>
            <th className={cn(TH, "text-right")}>Place</th>
            <th className={cn(TH, "text-right")}>Elims</th>
            <th className={cn(TH, "text-right")}>Dealt</th>
            <th className={cn(TH, "text-right")}>Taken</th>
            <th className={cn(TH, "text-right")}>Ratio</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game, index) => (
            <tr key={`${windowId}-${index}`} className="border-b border-border/60 last:border-b-0 hover:bg-muted/40">
              <td className="px-3 py-2.5 font-mono text-muted-foreground tabular-nums">{index + 1}</td>
              <td className={cn(NUM, game.placement === 1 && "font-semibold text-you")}>
                {game.placement === 1 ? "#1" : game.placement}
              </td>
              <td className={NUM}>{game.elims}</td>
              <td className={NUM}>{game.damageDealt.toLocaleString()}</td>
              <td className={cn(NUM, "text-muted-foreground")}>{game.damageTaken.toLocaleString()}</td>
              <td className={cn(NUM, ratioTone(game.damageRatio))}>{ratioText(game.damageRatio)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
