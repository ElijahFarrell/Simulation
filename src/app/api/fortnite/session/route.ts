import { NextResponse } from "next/server";
import { isEpicAccountId } from "@/lib/epic/profile";
import { fortniteRoute } from "@/lib/fortnite/access";
import { loadSession } from "@/lib/fortnite/load-session";
import { DEFAULT_REGION, isRegion } from "@/lib/fortnite/parse";

export const GET = fortniteRoute("That session didn't load.", async (request) => {
  const params = new URL(request.url).searchParams;
  const region = params.get("region") ?? DEFAULT_REGION;
  const eventId = params.get("eventId") ?? "";
  const windowId = params.get("windowId") ?? "";
  const accountId = params.get("accountId");
  const points = params.get("points");
  if (!isRegion(region)) return new Response("Unknown region.", { status: 400 });
  if (!eventId || !windowId) return new Response("Pick a session.", { status: 400 });
  if (accountId && !isEpicAccountId(accountId)) return new Response("Epic account id looks wrong.", { status: 400 });

  let typedPoints: number | null = null;
  if (points !== null && points !== "") {
    const parsed = Number(points);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100_000) {
      return new Response("Points have to be a whole number.", { status: 400 });
    }
    typedPoints = parsed;
  }

  return NextResponse.json(await loadSession({ region, eventId, windowId, accountId, typedPoints, now: Date.now() }));
});
