import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";

export async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
}

export const me = query({
  args: {},
  handler: async (ctx) => currentUser(ctx),
});

/** Creates the Convex user for the signed-in Clerk user, or refreshes their name. */
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const name = identity.name ?? identity.nickname ?? identity.email;
    const existing = await currentUser(ctx);
    if (existing) {
      if (existing.name !== name) await ctx.db.patch(existing._id, { name });
      return existing._id;
    }
    return await ctx.db.insert("users", { tokenIdentifier: identity.tokenIdentifier, name });
  },
});

const EPIC_ID = /^[0-9a-f]{32}$/i;

/** Saves the Epic account chosen from a display-name lookup. Public leaderboard data only. */
export const linkEpic = mutation({
  args: {
    epicAccountId: v.string(),
    epicDisplayName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not signed in");
    if (!EPIC_ID.test(args.epicAccountId)) throw new Error("Epic account id looks wrong");
    const epicDisplayName = args.epicDisplayName.trim();
    if (epicDisplayName.length < 1 || epicDisplayName.length > 32) {
      throw new Error("Epic name must be 1–32 characters");
    }
    await ctx.db.patch(user._id, {
      epicAccountId: args.epicAccountId.toLowerCase(),
      epicDisplayName,
    });
    return null;
  },
});
