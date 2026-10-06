import { query } from "./_generated/server";
import { currentUser } from "./users";

export const recent = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query("matches")
      .withIndex("by_user_played", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
  },
});
