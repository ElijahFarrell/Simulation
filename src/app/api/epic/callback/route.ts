import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { api } from "@convex/_generated/api";
import { epicCallbackUrl } from "@/lib/epic/authorize";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { EPIC_STATE_COOKIE, oauthStatesMatch } from "@/lib/epic/state";

type EpicResult = "linked" | "denied" | "failed" | "taken" | "not-configured";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();
  const expected = jar.get(EPIC_STATE_COOKIE)?.value;
  const received = url.searchParams.get("state");
  if (!oauthStatesMatch(expected, received)) return redirectEpic(url, "failed");

  if (url.searchParams.get("error")) return redirectEpic(url, "denied");
  const code = url.searchParams.get("code");
  if (!code || !clerkEnabled) return redirectEpic(url, "failed");

  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", url));
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const token = await getToken({ template: "convex" });
  if (!convexUrl || !token) return redirectEpic(url, "failed");

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  try {
    await client.action(api.epic.linkWithCode, { code, redirectUri: epicCallbackUrl(request.url) });
    return redirectEpic(url, "linked");
  } catch (error) {
    return redirectEpic(url, resultCode(error));
  }
}

function resultCode(error: unknown): EpicResult {
  const data =
    typeof error === "object" && error !== null && "data" in error
      ? (error as { data?: { code?: string } }).data
      : undefined;
  if (data?.code === "taken" || data?.code === "not-configured") return data.code;
  return "failed";
}

function redirectEpic(url: URL, result: EpicResult) {
  const response = NextResponse.redirect(new URL(`/stats?epic=${result}`, url));
  response.cookies.set(EPIC_STATE_COOKIE, "", { path: "/api/epic", maxAge: 0 });
  return response;
}
