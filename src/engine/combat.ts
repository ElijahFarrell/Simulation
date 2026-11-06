import {
  AI_FIGHT_CHANCE,
  AVOID_ESCAPE_CHANCE,
  CONTACT_RADIUS,
  MAX_MATS,
  TAG_DAMAGE,
  THIRD_PARTY_RADIUS,
} from "./constants";
import { applyChip, applyKnock } from "./damage";
import { dist } from "./geometry";
import { playerOf } from "./teams";
import type { Rng } from "./rng";
import type { Decision, FightOutcome, Team, Vec } from "./types";

export type CombatSummary = {
  events: string[];
  outcome: FightOutcome;
  thirdPartied: boolean;
};

type PathMap = Map<string, Vec[]>;

export function resolveCombat(
  teams: Team[],
  paths: PathMap,
  decision: Decision,
  rng: Rng,
): CombatSummary {
  const player = playerOf(teams);
  const fought = new Set<string>();
  const summary =
    player.eliminated
      ? { events: [], outcome: "none" as const, thirdPartied: false }
      : resolvePlayer(
          player,
          livingOthers(teams, player)
            .filter((team) => touches(player, team, paths))
            .sort((a, b) => dist(player.pos, a.pos) - dist(player.pos, b.pos)),
          decision,
          rng,
          fought,
        );
  resolveAiFights(teams, rng, fought);
  return summary;
}

function resolvePlayer(
  player: Team,
  contacts: Team[],
  decision: Decision,
  rng: Rng,
  fought: Set<string>,
): CombatSummary {
  const target = contacts[0];
  if (!target) {
    const whiff = decision.engagement !== "avoid";
    return {
      events: whiff ? ["Nobody was close enough to hit"] : [],
      outcome: whiff ? "whiff" : "none",
      thirdPartied: false,
    };
  }

  if (decision.engagement === "avoid") {
    return tryAvoid(player, target, contacts.length, rng, fought);
  }
  if (decision.engagement === "tag") {
    return tagTarget(player, target, contacts, rng, fought);
  }
  return commitFight(player, target, contacts, rng, fought, 1, "win", "loss");
}

function tryAvoid(
  player: Team,
  target: Team,
  contactCount: number,
  rng: Rng,
  fought: Set<string>,
): CombatSummary {
  const chance = Math.max(0.22, AVOID_ESCAPE_CHANCE - 0.14 * (contactCount - 1));
  if (rng.chance(chance)) {
    return {
      events: [`You snuck past ${contactCount} team${contactCount === 1 ? "" : "s"}`],
      outcome: "escaped",
      thirdPartied: false,
    };
  }
  const forced = commitFight(player, target, [target], rng, fought, 0.72, "forced", "loss");
  return {
    ...forced,
    outcome: forced.outcome === "win" ? "forced" : "loss",
    events: [`You tried to stay away, but ${label(target)} caught you`, ...forced.events],
  };
}

function tagTarget(
  player: Team,
  target: Team,
  contacts: Team[],
  rng: Rng,
  fought: Set<string>,
): CombatSummary {
  player.damageThisPhase += TAG_DAMAGE;
  target.damageThisPhase += 40;
  applyChip(player, 36);
  applyChip(target, 40);
  player.mats = Math.max(0, player.mats - 60);
  fought.add(player.id);
  fought.add(target.id);
  const extras = contacts.filter(
    (team) => team.id !== target.id && dist(player.pos, team.pos) <= THIRD_PARTY_RADIUS,
  );
  let thirdPartied = false;
  if (extras.length >= 2 && rng.chance(0.5)) {
    thirdPartied = true;
    applyKnock(player, 1);
  } else if (extras.length >= 1) {
    thirdPartied = true;
    applyChip(player, 48);
  }
  const events = [`You hit ${label(target)} and then left`];
  if (thirdPartied) events.push("Other teams were close and shot back");
  return { events, outcome: "tag", thirdPartied };
}

function commitFight(
  player: Team,
  target: Team,
  contacts: Team[],
  rng: Rng,
  fought: Set<string>,
  playerMult: number,
  winOutcome: FightOutcome,
  lossOutcome: FightOutcome,
): CombatSummary {
  const result = duel(player, target, rng, playerMult);
  fought.add(player.id);
  fought.add(target.id);
  const extras = contacts.filter((team) => team.id !== target.id && !team.eliminated);
  const third = extras.find((team) => dist(player.pos, team.pos) <= THIRD_PARTY_RADIUS);
  let thirdPartied = false;
  if (third && rng.chance(0.7)) {
    thirdPartied = true;
    applyChip(player, 55);
    player.damageThisPhase += 40;
    fought.add(third.id);
  }
  const won = result.winner.id === player.id;
  const events = [
    won
      ? `You fought ${label(target)} and won (${result.knocks} knocked)`
      : `You fought ${label(target)} and lost ${result.knocks} of your players`,
  ];
  if (thirdPartied && third) events.push(`${label(third)} jumped into your fight (third party)`);
  return {
    events,
    outcome: won ? winOutcome : lossOutcome,
    thirdPartied,
  };
}

function resolveAiFights(teams: Team[], rng: Rng, fought: Set<string>): void {
  const ai = teams.filter((team) => !team.isPlayer && !team.eliminated);
  for (let i = 0; i < ai.length; i += 1) {
    for (let j = i + 1; j < ai.length; j += 1) {
      const a = ai[i];
      const b = ai[j];
      if (!a || !b || a.eliminated || b.eliminated) continue;
      if (fought.has(a.id) || fought.has(b.id)) continue;
      if (dist(a.pos, b.pos) > CONTACT_RADIUS) continue;
      if (!rng.chance(AI_FIGHT_CHANCE)) continue;
      duel(a, b, rng, 1);
      fought.add(a.id);
      fought.add(b.id);
    }
  }
}

function duel(
  a: Team,
  b: Team,
  rng: Rng,
  aMult: number,
): { winner: Team; loser: Team; knocks: number } {
  const aScore = strength(a, rng) * aMult;
  const bScore = strength(b, rng);
  const aWins = aScore >= bScore;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const gap = Math.abs(aScore - bScore);
  const knocks = gap > 1.6 ? Math.min(3, loser.alive) : gap > 0.8 ? Math.min(2, loser.alive) : 1;
  applyKnock(loser, knocks);
  applyChip(winner, 32);
  winner.mats = Math.max(0, winner.mats - 160);
  loser.mats = Math.max(0, loser.mats - 200);
  winner.damageThisPhase += 150 + 60 * knocks;
  loser.damageThisPhase += 70;
  return { winner, loser, knocks };
}

function strength(team: Team, rng: Rng): number {
  return team.alive + (team.mats / MAX_MATS) * 0.6 + rng.range(-0.28, 0.28);
}

function livingOthers(teams: readonly Team[], player: Team): Team[] {
  return teams.filter((team) => team.id !== player.id && !team.eliminated);
}

function touches(player: Team, other: Team, paths: PathMap): boolean {
  if (dist(player.pos, other.pos) <= CONTACT_RADIUS) return true;
  const a = paths.get(player.id) ?? [];
  const b = paths.get(other.id) ?? [];
  const steps = Math.min(a.length, b.length);
  for (let i = 0; i < steps; i += 2) {
    const pa = a[i];
    const pb = b[i];
    if (pa && pb && dist(pa, pb) <= CONTACT_RADIUS) return true;
  }
  return false;
}

function label(team: Team): string {
  return team.id.startsWith("t") ? `team ${team.id.slice(1)}` : team.id;
}
