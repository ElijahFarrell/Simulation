import { sectorName } from "@/engine/constants";
import { describeCall, destinationSide } from "@/engine/feedback";
import { pointsLost } from "@/engine/scoring";
import { aliveCount, playerOf } from "@/engine/teams";
import { nearestPlace, type Place } from "@/lib/island/project";
import type { GameState, PhaseResult, ScoreBreakdown } from "@/engine/types";
import type { CoachContext, CoachZoneCall } from "./schema";

export function buildCoachContext(
  game: GameState,
  focusZone: number | null,
  places: readonly Place[] = [],
): CoachContext {
  const player = playerOf(game.teams);
  return {
    seed: game.seed,
    mode: game.settings.mode,
    status: game.status,
    placement: game.placement,
    lobbySize: game.teams.length,
    teamsAlive: aliveCount(game.teams),
    player: {
      alive: player.alive,
      hp: Math.round(player.hp),
      mats: Math.round(player.mats),
      heals: Math.round(player.heals),
    },
    focusZone,
    zones: game.history.map((phase) => describeZoneCall(phase, places)),
  };
}

export function coachStarters(context: CoachContext): string[] {
  const focus = context.zones.find((zone) => zone.zone === context.focusZone);
  if (!focus) {
    return [
      "What habit cost me the most this game?",
      "Which zone should I replay, and what should I call?",
      "How do pros handle surge in trios right now?",
    ];
  }
  return [
    `What cost me the most on zone ${focus.zone}?`,
    "What should I do next time?",
    "How do pros play a zone like this?",
  ];
}

function describeZoneCall(phase: PhaseResult, places: readonly Place[]): CoachZoneCall {
  const side = destinationSide(phase.decision.destination, phase.zone.to, phase.sectors);
  const { sector } = side;
  return {
    zone: phase.zone.index,
    moving: phase.zone.isMoving,
    pull: phase.zone.pull,
    surgeActive: phase.zone.surgeActive,
    stormDps: phase.zone.stormDps,
    call: describeCall(phase.decision, side),
    place: nearestPlace(places, phase.decision.destination),
    timing: phase.decision.timing,
    engagement: phase.decision.engagement,
    side: sector ? { name: sectorName(sector.index), label: sector.label, teams: sector.teamCount } : null,
    score: roundScore(phase.score),
    pointsLost: pointsLost(phase.score),
    feedback: phase.feedback.map(({ tone, text }) => ({ tone, text })),
    events: phase.events,
  };
}

function roundScore(score: ScoreBreakdown): ScoreBreakdown {
  return {
    storm: Math.round(score.storm),
    contact: Math.round(score.contact),
    exposure: Math.round(score.exposure),
    surge: Math.round(score.surge),
    positioning: Math.round(score.positioning),
    total: Math.round(score.total),
  };
}
