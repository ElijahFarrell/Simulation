import type { UserIdentity } from "convex/server";
import { ConvexError, v } from "convex/values";
import { EPIC_NAME_MAX, isEpicAccountId } from "../src/lib/epic/profile";
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

const NO_EPIC_LINK = {
  epicAccountId: undefined,
  epicDisplayName: undefined,
  epicPreferredLanguage: undefined,
  epicVerified: undefined,
};

export async function requireUser(ctx: Reader) {
  const user = await currentUser(ctx);
  if (!user) throw new Error("Not signed in");
  return user;
}

function identityName(identity: UserIdentity) {
  return identity.name ?? identity.nickname ?? identity.email;
}

export const me = query({
  args: {},
  handler: async (ctx) => currentUser(ctx),
});

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const name = identityName(identity);
    const existing = await currentUser(ctx);
    if (existing) {
      if (existing.name !== name) await ctx.db.patch(existing._id, { name });
      return existing._id;
    }
    return await ctx.db.insert("users", { tokenIdentifier: identity.tokenIdentifier, name });
  },
});

/** Saves the Epic account chosen from a display-name lookup. Unverified: anyone can claim a public name. */
export const linkEpic = mutation({
  args: {
    epicAccountId: v.string(),
    epicDisplayName: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!isEpicAccountId(args.epicAccountId)) throw new Error("Epic account id looks wrong");
    const epicDisplayName = args.epicDisplayName.trim();
    if (epicDisplayName.length < 1 || epicDisplayName.length > EPIC_NAME_MAX) {
      throw new Error(`Epic name must be 1–${EPIC_NAME_MAX} characters`);
    }
    const epicAccountId = args.epicAccountId.toLowerCase();
    if (user.epicVerified && user.epicAccountId === epicAccountId) return null;
    await ctx.db.patch(user._id, { ...NO_EPIC_LINK, epicAccountId, epicDisplayName });
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
      name: identityName(identity),
      ...link,
    });
  },
});

export const unlinkEpic = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    await ctx.db.patch(user._id, NO_EPIC_LINK);
  },
});
