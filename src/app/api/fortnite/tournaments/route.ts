import { NextResponse } from "next/server";
import { signedInOrResponse } from "@/lib/fortnite/access";
import { FortniteDataError, listTournaments } from "@/lib/fortnite/osirion";
import { isRegion } from "@/lib/fortnite/parse";

export async function GET(request: Request): Promise<Response> {
  const denied = await signedInOrResponse();
  if (denied) return denied;
  const region = new URL(request.url).searchParams.get("region") ?? "EU";
  if (!isRegion(region)) return new Response("Unknown region.", { status: 400 });
  try {
    const tournaments = await listTournaments(region);
    return NextResponse.json({ tournaments });
  } catch (error) {
    const message = error instanceof FortniteDataError ? error.message : "Tournament data didn't load.";
    return new Response(message, { status: 502 });
  }
}
