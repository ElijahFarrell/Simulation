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
