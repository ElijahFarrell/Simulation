/** Last rank that still receives an advancement token. Tighter token ranks are prizes inside that field. */
export function advancementSpots(
  tables: { scoringType: string; ranks: { threshold: number; payouts: { rewardType: string }[] }[] }[],
): number | null {
  let spots: number | null = null;
  for (const table of tables) {
    if (table.scoringType !== "rank") continue;
    for (const rank of table.ranks) {
      if (!rank.payouts.some((payout) => payout.rewardType === "token")) continue;
      if (spots === null || rank.threshold > spots) spots = rank.threshold;
    }
  }
  return spots === null ? null : Math.round(spots);
}

export type GameLine = {
  damageDealt: number;
  damageTaken: number;
  elims: number;
  placement: number;
};

export type GameSummary = {
  games: number;
  elims: number;
  damageDealt: number;
  damageTaken: number;
  damageRatio: number | null;
  avgPlacement: number | null;
};

export function summarizeGames(games: GameLine[]): GameSummary {
  const totals = games.reduce(
    (sum, game) => ({
      elims: sum.elims + game.elims,
      damageDealt: sum.damageDealt + game.damageDealt,
      damageTaken: sum.damageTaken + game.damageTaken,
      placement: sum.placement + game.placement,
    }),
    { elims: 0, damageDealt: 0, damageTaken: 0, placement: 0 },
  );
  return {
    games: games.length,
    elims: totals.elims,
    damageDealt: totals.damageDealt,
    damageTaken: totals.damageTaken,
    damageRatio: totals.damageTaken > 0 ? totals.damageDealt / totals.damageTaken : null,
    avgPlacement: games.length > 0 ? totals.placement / games.length : null,
  };
}

type QualStatus = "in" | "out" | "tied" | "unknown" | "no-line";

type Pace = {
  projectedYou: number | null;
  projectedLine: number;
  gamesLeft: number;
};

export type QualRead = {
  spots: number | null;
  status: QualStatus;
  /** Positive means points still short of the line. Negative means points above it. */
  pointsOff: number | null;
  linePoints: number | null;
  seriesEstimate: number | null;
  seriesSampleSize: number;
  pace: Pace | null;
  confirmedOutside: boolean;
};

export function seriesEstimate(previousLinePoints: number[]): number | null {
  if (previousLinePoints.length === 0) return null;
  const total = previousLinePoints.reduce((sum, points) => sum + points, 0);
  return Math.round(total / previousLinePoints.length);
}

export function paceProjection(input: {
  yourPoints: number | null;
  yourGames: number;
  linePoints: number;
  lineGames: number;
  matchCap: number;
  windowOpen: boolean;
}): Pace | null {
  if (!input.windowOpen || input.matchCap <= 0) return null;
  if (input.lineGames <= 0 || input.lineGames >= input.matchCap) return null;
  const projectedYou =
    input.yourPoints !== null && input.yourGames > 0
      ? Math.round((input.yourPoints / input.yourGames) * input.matchCap)
      : null;
  return {
    projectedYou,
    projectedLine: Math.round((input.linePoints / input.lineGames) * input.matchCap),
    gamesLeft: input.matchCap - input.lineGames,
  };
}

export function readQualification(input: {
  spots: number | null;
  linePoints: number | null;
  yourPoints: number | null;
  yourRank: number | null;
  seriesLinePoints: number[];
  yourGames: number;
  lineGames: number;
  matchCap: number;
  windowOpen: boolean;
  confirmedOutside: boolean;
}): QualRead {
  const estimate = seriesEstimate(input.seriesLinePoints);
  const base = {
    spots: input.spots,
    linePoints: input.linePoints,
    seriesEstimate: estimate,
    seriesSampleSize: estimate === null ? 0 : input.seriesLinePoints.length,
    confirmedOutside: input.confirmedOutside,
    pace:
      input.linePoints === null
        ? null
        : paceProjection({
            yourPoints: input.yourPoints,
            yourGames: input.yourGames,
            linePoints: input.linePoints,
            lineGames: input.lineGames,
            matchCap: input.matchCap,
            windowOpen: input.windowOpen,
          }),
  };

  if (input.spots === null) {
    return { ...base, status: "no-line", pointsOff: null };
  }
  if (input.linePoints === null) {
    return { ...base, status: "unknown", pointsOff: null };
  }

  const pointsOff = input.yourPoints === null ? null : input.linePoints - input.yourPoints;
  if (input.yourRank !== null) {
    return { ...base, status: input.yourRank <= input.spots ? "in" : "out", pointsOff };
  }
  if (input.yourPoints === null) {
    return { ...base, status: input.confirmedOutside ? "out" : "unknown", pointsOff: null };
  }
  if (input.yourPoints > input.linePoints) return { ...base, status: "in", pointsOff };
  if (input.yourPoints < input.linePoints) return { ...base, status: "out", pointsOff };
  return { ...base, status: "tied", pointsOff: 0 };
}

export function qualificationHeadline(read: QualRead): string {
  if (read.status === "no-line") return "This window pays placement. It doesn't advance a cutoff.";
  if (read.spots === null || read.linePoints === null) return "The qual line isn't posted yet.";
  const line = `Top ${read.spots.toLocaleString()} is ${read.linePoints.toLocaleString()} pts.`;
  if (read.pointsOff === null) {
    if (read.status === "out") return `Outside the top ${read.spots.toLocaleString()}. ${line}`;
    return `Enter your points to see the gap. ${line}`;
  }
  if (read.pointsOff > 0) return `${read.pointsOff.toLocaleString()} off qual. ${line}`;
  if (read.pointsOff < 0) return `${Math.abs(read.pointsOff).toLocaleString()} above the line. ${line}`;
  if (read.status === "in") return `On the line, inside the top ${read.spots.toLocaleString()}.`;
  if (read.status === "out") return `Tied on points, outside the top ${read.spots.toLocaleString()}.`;
  return `Tied on ${read.linePoints.toLocaleString()} points. Wins, then elims, then placement break it.`;
}
