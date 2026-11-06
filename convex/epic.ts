import { ConvexError, v } from "convex/values";
import { epicProfileFrom, accessTokenFrom } from "../src/lib/epic/profile";
import { EPIC_BASIC_PROFILE_SCOPE, EPIC_TOKEN_URL, EPIC_USERINFO_URL } from "../src/lib/epic/authorize";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export const linkWithCode = action({
  args: {
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "unauthorized" });
    const profile = await exchangeAuthorizationCode(args.code, args.redirectUri);
    await ctx.runMutation(internal.users.applyEpicLink, profile);
  },
});

async function exchangeAuthorizationCode(code: string, redirectUri: string) {
  const clientId = process.env.EPIC_CLIENT_ID;
  const clientSecret = process.env.EPIC_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new ConvexError({ code: "not-configured" });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: EPIC_BASIC_PROFILE_SCOPE,
  });
  const deploymentId = process.env.EPIC_DEPLOYMENT_ID;
  if (deploymentId) body.set("deployment_id", deploymentId);

  const tokenResponse = await fetch(EPIC_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!tokenResponse.ok) throw new ConvexError({ code: "failed" });

  const token: unknown = await tokenResponse.json();
  const accessToken = accessTokenFrom(token);
  if (!accessToken) throw new ConvexError({ code: "failed" });

  const userInfoResponse = await fetch(EPIC_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const userInfo: unknown = userInfoResponse.ok ? await userInfoResponse.json() : null;
  const profile = epicProfileFrom(token, userInfo);
  if (!profile) throw new ConvexError({ code: "failed" });
  return profile;
}
