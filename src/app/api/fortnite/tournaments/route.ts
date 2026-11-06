import { NextResponse } from "next/server";
import { fortniteRoute } from "@/lib/fortnite/access";
import { listTournaments } from "@/lib/fortnite/osirion";
import { DEFAULT_REGION, isRegion } from "@/lib/fortnite/parse";

export const GET = fortniteRoute("Tournament data didn't load.", async (request) => {
  const region = new URL(request.url).searchParams.get("region") ?? DEFAULT_REGION;
  if (!isRegion(region)) return new Response("Unknown region.", { status: 400 });
  return NextResponse.json({ tournaments: await listTournaments(region) });
});
