import { z } from "zod";

const scoreSchema = z.object({
  storm: z.number(),
  contact: z.number(),
  exposure: z.number(),
  surge: z.number(),
  positioning: z.number(),
  total: z.number(),
});

const zoneCallSchema = z.object({
  zone: z.number().int(),
  moving: z.boolean(),
  surgeActive: z.boolean(),
  stormDps: z.number(),
  call: z.string().max(200),
  timing: z.enum(["early", "standard", "late"]),
  engagement: z.enum(["avoid", "tag", "fight"]),
  side: z
    .object({
      name: z.string().max(40),
      label: z.enum(["dead", "normal", "stacked"]),
      teams: z.number().int(),
    })
    .nullable(),
  score: scoreSchema,
  pointsLost: z.object({ where: z.number(), when: z.number(), contact: z.number() }),
  feedback: z
    .array(z.object({ tone: z.enum(["good", "warn", "bad"]), text: z.string().max(300) }))
    .max(8),
  events: z.array(z.string().max(300)).max(12),
});

export const coachContextSchema = z.object({
  seed: z.number().int(),
  status: z.enum(["deciding", "resolved", "dead", "won"]),
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
  zones: z.array(zoneCallSchema).max(12),
});

export type CoachContext = z.infer<typeof coachContextSchema>;
export type CoachZoneCall = z.infer<typeof zoneCallSchema>;
