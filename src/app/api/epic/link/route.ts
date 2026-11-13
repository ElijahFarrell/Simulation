import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { epicAuthorizeUrl, epicCallbackUrl, epicResultPath } from "@/lib/epic/authorize";
import { isEpicCallbackUri } from "@/lib/epic/redirect";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { createOauthState, EPIC_STATE_COOKIE, EPIC_STATE_MAX_AGE_SECONDS } from "@/lib/epic/state";

export async function GET(request: Request) {
  if (!clerkEnabled) return NextResponse.redirect(new URL(epicResultPath("not-configured"), request.url));
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", request.url));

  const clientId = process.env.EPIC_CLIENT_ID;
  const redirectUri = epicCallbackUrl(request.url);
  if (!clientId || !isEpicCallbackUri(redirectUri)) {
    return NextResponse.redirect(new URL(epicResultPath("not-configured"), request.url));
  }

  const state = createOauthState();
  const response = NextResponse.redirect(epicAuthorizeUrl({ clientId, redirectUri, state }));
  response.cookies.set(EPIC_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/api/epic",
    maxAge: EPIC_STATE_MAX_AGE_SECONDS,
  });
  return response;
}
