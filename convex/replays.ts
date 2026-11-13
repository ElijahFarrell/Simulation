import { v } from "convex/values";
import { replayFileName, replayUploadIssue } from "../src/lib/replays/limits";
import { mutation, query } from "./_generated/server";
import { replayStatus } from "./schema";
import { currentUser, requireUser } from "./users";

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
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Rejections return instead of throw, because a throw would roll back deleting the upload. */
export const register = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  returns: v.union(v.object({ replayId: v.id("replays") }), v.object({ rejected: v.string() })),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const metadata = await ctx.db.system.get("_storage", args.storageId);
    if (!metadata) throw new Error("Upload did not finish");
    const issue = replayUploadIssue(args.fileName, metadata.size);
    if (issue) {
      await ctx.storage.delete(args.storageId);
      return { rejected: issue };
    }
    const fileName = replayFileName(args.fileName);
    const existing = await ctx.db
      .query("replays")
      .withIndex("by_user_file", (q) => q.eq("userId", user._id).eq("fileName", fileName).eq("sizeBytes", metadata.size))
      .first();
    if (existing) {
      if (existing.storageId !== args.storageId) await ctx.storage.delete(args.storageId);
      return { replayId: existing._id };
    }
    const replayId = await ctx.db.insert("replays", {
      userId: user._id,
      storageId: args.storageId,
      fileName,
      sizeBytes: metadata.size,
      status: "uploaded",
    });
    return { replayId };
  },
});
