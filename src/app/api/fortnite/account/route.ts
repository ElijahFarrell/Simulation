import { NextResponse } from "next/server";
import { signedInOrResponse } from "@/lib/fortnite/access";
import { FortniteDataError, lookupAccount } from "@/lib/fortnite/osirion";

export async function GET(request: Request): Promise<Response> {
  const denied = await signedInOrResponse();
  if (denied) return denied;
  const name = (new URL(request.url).searchParams.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 32 || /[\u0000-\u001f]/.test(name)) {
    return new Response("Enter the Epic name, up to 32 characters.", { status: 400 });
  }
  try {
    const matches = await lookupAccount(name);
    if (matches.length === 0) return new Response("No Epic account with that name.", { status: 404 });
    return NextResponse.json({ matches });
  } catch (error) {
    const message = error instanceof FortniteDataError ? error.message : "Epic lookup didn't load.";
    return new Response(message, { status: 502 });
  }
}
