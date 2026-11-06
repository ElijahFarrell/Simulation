import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

type Reader = QueryCtx | MutationCtx;

export async function currentUser(ctx: Reader) {
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

/** Saves the Epic account chosen from a display-name lookup. Unverified: anyone can claim a public name. */
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
      epicPreferredLanguage: undefined,
      epicVerified: undefined,
    });
    return null;
  },
});

/** Saves the Epic account proven by OAuth. Only another verified owner blocks it, never a name-lookup claim. */
export const applyEpicLink = internalMutation({
  args: {
    accountId: v.string(),
    displayName: v.string(),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "unauthorized" });
    const epicAccountId = args.accountId.toLowerCase();
    const claims = await ctx.db
      .query("users")
      .withIndex("by_epic", (q) => q.eq("epicAccountId", epicAccountId))
      .collect();
    const existing = await currentUser(ctx);
    if (claims.some((claim) => claim.epicVerified && claim._id !== existing?._id)) {
      throw new ConvexError({ code: "taken" });
    }

    const link = {
      epicAccountId,
      epicDisplayName: args.displayName,
      epicPreferredLanguage: args.preferredLanguage,
      epicVerified: true,
    };
    if (existing) {
      await ctx.db.patch(existing._id, link);
      return existing._id;
    }
    return await ctx.db.insert("users", {
      tokenIdentifier: identity.tokenIdentifier,
      name: identity.name ?? identity.nickname ?? identity.email,
      ...link,
    });
  },
});

export const unlinkEpic = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error("Not signed in");
    await ctx.db.patch(user._id, {
      epicAccountId: undefined,
      epicDisplayName: undefined,
      epicPreferredLanguage: undefined,
      epicVerified: undefined,
    });
  },
});
