import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const replayStatus = v.union(
  v.literal("uploaded"),
  v.literal("parsing"),
  v.literal("parsed"),
  v.literal("failed"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    epicAccountId: v.optional(v.string()),
    epicDisplayName: v.optional(v.string()),
    epicPreferredLanguage: v.optional(v.string()),
    epicVerified: v.optional(v.boolean()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_epic", ["epicAccountId"]),

  // One row per uploaded .replay file. Folder sync skips files whose name and size already exist.
  replays: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    sizeBytes: v.number(),
    recordedAt: v.optional(v.number()),
    status: replayStatus,
    error: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_file", ["userId", "fileName", "sizeBytes"]),

  // Filled in by the parser. Fields stay optional until we confirm what real replays expose.
  matches: defineTable({
    userId: v.id("users"),
    replayId: v.id("replays"),
    playedAt: v.number(),
    placement: v.optional(v.number()),
    eliminations: v.optional(v.number()),
    damageDealt: v.optional(v.number()),
    damageTaken: v.optional(v.number()),
    stormDamage: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    tournamentId: v.optional(v.id("tournaments")),
  })
    .index("by_user_played", ["userId", "playedAt"])
    .index("by_replay", ["replayId"])
    .index("by_tournament", ["tournamentId"]),

  tournaments: defineTable({
    userId: v.id("users"),
    name: v.string(),
    startsAt: v.number(),
    endsAt: v.optional(v.number()),
    epicEventId: v.optional(v.string()),
  }).index("by_user_starts", ["userId", "startsAt"]),
});
