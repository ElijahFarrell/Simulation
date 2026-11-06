import { z } from "zod";
import { GAME_MODES, ZONE_TABLE } from "@/engine/constants";
import {
  ENGAGEMENTS,
  FEEDBACK_TONES,
  GAME_STATUSES,
  PULL_TYPES,
  SECTOR_LABELS,
  TIMINGS,
  type GameMode,
  type ScoreBreakdown,
} from "@/engine/types";

const scoreSchema = z.object({
  storm: z.number(),
  contact: z.number(),
  exposure: z.number(),
  surge: z.number(),
  positioning: z.number(),
  total: z.number(),
}) satisfies z.ZodType<ScoreBreakdown>;

const zoneCallSchema = z.object({
  zone: z.number().int(),
  moving: z.boolean(),
  pull: z.enum(PULL_TYPES),
  surgeActive: z.boolean(),
  stormDps: z.number(),
  call: z.string().max(200),
  place: z.string().max(80).nullable(),
  timing: z.enum(TIMINGS),
  engagement: z.enum(ENGAGEMENTS),
  side: z
    .object({
      name: z.string().max(40),
      label: z.enum(SECTOR_LABELS),
      teams: z.number().int(),
    })
    .nullable(),
  score: scoreSchema,
  pointsLost: z.object({ where: z.number(), when: z.number(), contact: z.number() }),
  feedback: z
    .array(z.object({ tone: z.enum(FEEDBACK_TONES), text: z.string().max(300) }))
    .max(8),
  events: z.array(z.string().max(300)).max(12),
});

export const coachContextSchema = z.object({
  seed: z.number().int(),
  mode: z.enum(Object.keys(GAME_MODES) as [GameMode, ...GameMode[]]),
  status: z.enum(GAME_STATUSES),
  placement: z.number().int().nullable(),
  lobbySize: z.number().int(),
  teamsAlive: z.number().int(),
  player: z.object({
    alive: z.number().int(),
    hp: z.number(),
    mats: z.number(),
    heals: z.number(),
  }),
  focusZone: z.number().int().nullable(),
  zones: z.array(zoneCallSchema).max(ZONE_TABLE.length),
});

export type CoachContext = z.infer<typeof coachContextSchema>;
export type CoachZoneCall = z.infer<typeof zoneCallSchema>;
