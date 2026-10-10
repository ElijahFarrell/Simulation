import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { replayStatus } from "./schema";
import { currentUser } from "./users";

const MAX_REPLAY_BYTES = 120 * 1024 * 1024;

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("replays"),
      _creationTime: v.number(),
      fileName: v.string(),
      sizeBytes: v.number(),
      status: replayStatus,
    }),
  ),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const replays = await ctx.db
      .query("replays")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(40);
    return replays.map((replay) => ({
      _id: replay._id,
      _creationTime: replay._creationTime,
      fileName: replay.fileName,
      sizeBytes: replay.sizeBytes,
      status: replay.status,
    }));
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not signed in");
    return await ctx.storage.generateUploadUrl();
  },
});

export const register = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.id("replays"),
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not signed in");
    const fileName = args.fileName.split(/[/\\]/).pop()?.trim() ?? "";
    if (!fileName.toLowerCase().endsWith(".replay") || fileName.length > 180) {
      throw new Error("Choose a .replay file");
    }
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new Error("Upload did not finish");
    if (metadata.size <= 0 || metadata.size > MAX_REPLAY_BYTES) {
      await ctx.storage.delete(args.storageId);
      throw new Error("Replay must be under 120 MB");
    }
    const existing = await ctx.db
      .query("replays")
      .withIndex("by_user_file", (q) => q.eq("userId", user._id).eq("fileName", fileName).eq("sizeBytes", metadata.size))
      .first();
    if (existing) {
      if (existing.storageId !== args.storageId) await ctx.storage.delete(args.storageId);
      return existing._id;
    }
    return await ctx.db.insert("replays", {
      userId: user._id,
      storageId: args.storageId,
      fileName,
      sizeBytes: metadata.size,
      status: "uploaded",
    });
  },
});
