import { SECTOR_COUNT, sectorName } from "@/engine/constants";
import { describeCall, heldCenter } from "@/engine/feedback";
import { sectorIndex } from "@/engine/geometry";
import type { GameState, PhaseResult, ScoreBreakdown } from "@/engine/types";
import type { CoachContext, CoachZoneCall } from "./schema";

export function buildCoachContext(game: GameState, focusZone: number | null): CoachContext {
  const player = game.teams.find((team) => team.isPlayer);
  return {
    seed: game.seed,
    status: game.status,
    placement: game.placement,
    lobbySize: game.teams.length,
    teamsAlive: game.teams.filter((team) => !team.eliminated).length,
    player: {
      alive: player?.alive ?? 0,
      hp: Math.round(player?.hp ?? 0),
      mats: Math.round(player?.mats ?? 0),
      heals: Math.round(player?.heals ?? 0),
    },
    focusZone,
    zones: game.history.map(describeZoneCall),
  };
}

export function coachStarters(context: CoachContext): string[] {
  const focus = context.zones.find((zone) => zone.zone === context.focusZone);
  if (!focus) {
    return [
      "What was my biggest mistake this game?",
      "Which zone should I replay, and what should I call?",
      "How do pros handle surge in trios right now?",
    ];
  }
  return [
    `Why did zone ${focus.zone} score ${focus.score.total}?`,
    "What should I have called instead?",
    "How do pros play this kind of zone right now?",
  ];
}

function describeZoneCall(phase: PhaseResult): CoachZoneCall {
  const center = heldCenter(phase.decision, phase.zone.to);
  const sector = center
    ? null
    : (phase.sectors[sectorIndex(phase.zone.to.center, phase.decision.destination, SECTOR_COUNT)] ?? null);
  return {
    zone: phase.zone.index,
    moving: phase.zone.isMoving,
    surgeActive: phase.zone.surgeActive,
    stormDps: phase.zone.stormDps,
    call: describeCall(phase.decision, sector, center),
    timing: phase.decision.timing,
    engagement: phase.decision.engagement,
    side: sector ? { name: sectorName(sector.index), label: sector.label, teams: sector.teamCount } : null,
    score: roundScore(phase.score),
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
