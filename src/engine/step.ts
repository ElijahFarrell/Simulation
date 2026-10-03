import { aiTiming, chooseAiDestination } from "./ai-behavior";
import { exposureDirections, positioningScore, sectorDensity } from "./analysis";
import { resolveCombat, type CombatSummary } from "./combat";
import {
  LATE_REFRESH_HEALS,
  LATE_REFRESH_MATS,
  MAX_MATS,
  SECTOR_COUNT,
  STANDARD_REFRESH_MATS,
} from "./constants";
import { applyChip } from "./damage";
import { buildFeedback, heldCenter, type FeedbackContext } from "./feedback";
import { dist, sectorIndex } from "./geometry";
import { stayOnLand } from "./land";
import { departDelay, simulatePath, type PathSim } from "./movement";
import { createRng } from "./rng";
import { scoreDecision } from "./scoring";
import { applySurge } from "./surge";
import type {
  Decision,
  GameState,
  PhaseResult,
  Team,
  Timing,
  Vec,
  ZonePhase,
} from "./types";
import { zoneAt } from "./zones";

export function resolveDecision(state: GameState, decision: Decision): GameState {
  if (state.status !== "deciding") return state;
  const zone = zoneAt(state.zones, state.phaseIndex);
  const rng = createRng(state.rngState);
  const teams = state.teams.map((team) => ({ ...team, damageThisPhase: 0 }));
  const player = teams.find((team) => team.isPlayer);
  if (!player) throw new Error("Player team is missing");

  const refreshEvent = grantRefresh(player, decision.timing);
  const sectors = sectorDensity(state.teams, zone.to);
  const sims = moveTeams(teams, zone, decision, rng, state.landMask);
  const playerSim = sims.get(player.id);
  const stormDamage = playerSim?.stormDamage ?? 0;
  applyChip(player, stormDamage);
  for (const team of teams) {
    if (team.isPlayer || team.eliminated) continue;
    applyChip(team, sims.get(team.id)?.stormDamage ?? 0);
  }

  const samples = new Map<string, Vec[]>();
  for (const [id, sim] of sims) samples.set(id, sim.samples);
  const matsBeforeFight = player.mats;
  const combat = resolveCombat(teams, samples, decision, rng);
  const surge = player.eliminated ? { events: [], playerHit: false } : applySurge(teams, zone);

  const result = gradePhase({
    state,
    zone,
    decision,
    teams,
    player,
    sectors,
    stormDamage,
    combat,
    surgeHit: surge.playerHit,
    surgeEvents: surge.events,
    refreshEvent,
    matsBeforeFight,
  });

  const aliveOthers = teams.filter((team) => !team.isPlayer && !team.eliminated).length;
  const terminal = player.eliminated || aliveOthers === 0 || state.phaseIndex >= state.zones.length - 1;
  const status = player.eliminated ? "dead" : terminal ? "won" : "resolved";

  return {
    ...state,
    teams,
    history: [...state.history, result],
    status,
    rngState: rng.getState(),
    placement: terminal ? placementFor(teams) : null,
  };
}

export function placementFor(teams: readonly Team[]): number {
  const player = teams.find((team) => team.isPlayer);
  if (!player) return teams.length;
  if (player.eliminated) {
    return teams.filter((team) => !team.eliminated).length + 1;
  }
  const better = teams.filter(
    (team) =>
      !team.isPlayer &&
      !team.eliminated &&
      (team.alive > player.alive || (team.alive === player.alive && team.hp > player.hp)),
  );
  return better.length + 1;
}

function grantRefresh(player: Team, timing: Timing): string | null {
  if (player.eliminated) return null;
  if (timing === "late") {
    player.mats = Math.min(MAX_MATS, player.mats + LATE_REFRESH_MATS);
    player.heals += LATE_REFRESH_HEALS;
    return `Farmed ${LATE_REFRESH_MATS} mats before leaving`;
  }
  if (timing === "standard") {
    player.mats = Math.min(MAX_MATS, player.mats + STANDARD_REFRESH_MATS);
  }
  return null;
}

function moveTeams(
  teams: Team[],
  zone: ZonePhase,
  decision: Decision,
  rng: ReturnType<typeof createRng>,
  land: GameState["landMask"],
): Map<string, PathSim> {
  const sims = new Map<string, PathSim>();
  for (const team of teams) {
    if (team.eliminated) continue;
    const raw = team.isPlayer ? decision.destination : chooseAiDestination(team, teams, zone.to, rng);
    const dest = team.isPlayer ? stayOnLand(land, raw) : stayOnLand(land, raw, zone.to);
    const timing = team.isPlayer ? decision.timing : aiTiming(team.archetype);
    const sim = simulatePath({
      start: team.pos,
      dest,
      departSec: departDelay(timing, zone),
      zone,
    });
    team.pos = sim.end;
    sims.set(team.id, sim);
  }
  return sims;
}

function gradePhase(input: {
  state: GameState;
  zone: ZonePhase;
  decision: Decision;
  teams: Team[];
  player: Team;
  sectors: PhaseResult["sectors"];
  stormDamage: number;
  combat: CombatSummary;
  surgeHit: boolean;
  surgeEvents: string[];
  refreshEvent: string | null;
  matsBeforeFight: number;
}): PhaseResult {
  const following = input.state.zones[input.state.phaseIndex + 1];
  const seed = input.state.seed + input.state.phaseIndex * 997 + 13;
  const positioning = following
    ? positioningScore(input.player.pos, input.zone.to, following, seed).score
    : dist(input.player.pos, input.zone.to.center) <= input.zone.to.radius
      ? 100
      : 35;
  const exposure = exposureDirections(input.player.pos, input.teams, input.zone.to.radius);
  const score = scoreDecision({
    stormDamage: input.stormDamage,
    exposure,
    surgeActive: input.zone.surgeActive,
    surgeHit: input.surgeHit,
    outcome: input.combat.outcome,
    thirdPartied: input.combat.thirdPartied,
    positioning,
    sectorCount: SECTOR_COUNT,
  });
  if (input.player.eliminated) score.total = Math.min(score.total, 34);
  const centerHold = heldCenter(input.decision, input.zone.to);
  const sector = sectorAt(input.sectors, input.decision, input.zone, centerHold);
  const ctx: FeedbackContext = {
    zone: input.zone,
    decision: input.decision,
    stormDamage: input.stormDamage,
    exposure,
    surgeActive: input.zone.surgeActive,
    surgeHit: input.surgeHit,
    destinationSector: sector,
    heldCenter: centerHold,
    endPos: input.player.pos,
    nextCenter: following?.to.center ?? null,
    mats: input.matsBeforeFight,
    thirdPartied: input.combat.thirdPartied,
    outcome: input.combat.outcome,
  };
  const events = [
    input.refreshEvent,
    input.stormDamage >= 8 ? `Took ${Math.round(input.stormDamage)} storm damage` : null,
    ...input.combat.events,
    ...input.surgeEvents,
    input.player.eliminated ? "Your team got knocked out" : null,
  ].filter((event): event is string => event !== null);

  return {
    zone: input.zone,
    decision: input.decision,
    score,
    feedback: buildFeedback(ctx),
    events: dedupe(events),
    sectors: input.sectors,
  };
}

function sectorAt(
  sectors: PhaseResult["sectors"],
  decision: Decision,
  zone: ZonePhase,
  centerHold: boolean,
): PhaseResult["sectors"][number] | null {
  if (centerHold) return null;
  const index = sectorIndex(zone.to.center, decision.destination, SECTOR_COUNT);
  return sectors[index] ?? null;
}

function dedupe(events: string[]): string[] {
  return [...new Set(events)];
}
