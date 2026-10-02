import { RULE_LESSONS } from "@/engine/feedback";
import type { GameState, PhaseResult } from "@/engine/types";

export type SavedStats = {
  games: number;
  wins: number;
  bestAverage: number;
  badRules: Record<string, number>;
};

export const EMPTY_STATS: SavedStats = {
  games: 0,
  wins: 0,
  bestAverage: 0,
  badRules: {},
};

export const STATS_KEY = "rotation-lab-v1";

export function averageScore(history: readonly PhaseResult[]): number {
  if (history.length === 0) return 0;
  const total = history.reduce((sum, phase) => sum + phase.score.total, 0);
  return total / history.length;
}

export function worstHabit(
  history: readonly PhaseResult[],
): { ruleId: string; count: number; lesson: string } | null {
  const counts = new Map<string, number>();
  for (const phase of history) {
    for (const line of phase.feedback) {
      if (line.tone !== "bad") continue;
      counts.set(line.ruleId, (counts.get(line.ruleId) ?? 0) + 1);
    }
  }

  let top: { ruleId: string; count: number } | null = null;
  for (const [ruleId, count] of counts) {
    if (!top || count > top.count) top = { ruleId, count };
  }
  if (!top) return null;
  return {
    ...top,
    lesson: RULE_LESSONS[top.ruleId] ?? "Review the zones where this showed up.",
  };
}

export function mergeStats(stats: SavedStats, game: GameState): SavedStats {
  const badRules = { ...stats.badRules };
  for (const phase of game.history) {
    for (const line of phase.feedback) {
      if (line.tone !== "bad") continue;
      badRules[line.ruleId] = (badRules[line.ruleId] ?? 0) + 1;
    }
  }
  return {
    games: stats.games + 1,
    wins: stats.wins + (game.status === "won" ? 1 : 0),
    bestAverage: Math.max(stats.bestAverage, averageScore(game.history)),
    badRules,
  };
}

export function lifetimeHabit(stats: SavedStats): { ruleId: string; count: number; lesson: string } | null {
  let top: { ruleId: string; count: number } | null = null;
  for (const [ruleId, count] of Object.entries(stats.badRules)) {
    if (!top || count > top.count) top = { ruleId, count };
  }
  if (!top) return null;
  return {
    ...top,
    lesson: RULE_LESSONS[top.ruleId] ?? "Review the zones where this showed up.",
  };
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedStats: SavedStats = EMPTY_STATS;

export function subscribeStats(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readStats(): SavedStats {
  if (typeof window === "undefined") return EMPTY_STATS;
  const raw = localStorage.getItem(STATS_KEY);
  if (raw === cachedRaw) return cachedStats;
  cachedRaw = raw;
  if (!raw) {
    cachedStats = EMPTY_STATS;
    return cachedStats;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedStats = isSavedStats(parsed) ? parsed : EMPTY_STATS;
  } catch {
    cachedStats = EMPTY_STATS;
  }
  return cachedStats;
}

export function writeStats(stats: SavedStats): void {
  const raw = JSON.stringify(stats);
  cachedRaw = raw;
  cachedStats = stats;
  localStorage.setItem(STATS_KEY, raw);
  for (const listener of listeners) listener();
}

export function isSavedStats(value: unknown): value is SavedStats {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.games === "number" &&
    typeof record.wins === "number" &&
    typeof record.bestAverage === "number" &&
    typeof record.badRules === "object" &&
    record.badRules !== null
  );
}
